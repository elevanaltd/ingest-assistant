// Load environment variables from .env file (must be first!)
import * as dotenv from 'dotenv';
dotenv.config();

import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import * as path from 'path';
import * as fs from 'fs/promises';
import { z } from 'zod';
import { FileManager } from './services/fileManager';
import { SecurityValidator } from './services/securityValidator';
import { SecurityViolationError } from './utils/securityViolationError';
import { MetadataStore } from './services/metadataStore';
import { ConfigManager } from './services/configManager';
import { AIService } from './services/aiService';
import { MetadataWriter } from './services/metadataWriter';
import { convertToYAMLFormat, convertToUIFormat } from './utils/lexiconConverter';
import { sanitizeError } from './utils/errorSanitization';
import { FileRenameSchema, FileUpdateMetadataSchema, AIBatchProcessSchema } from './schemas/ipcSchemas';
import type { AppConfig, LexiconConfig } from '../src/types';
import { migrateToKeychain } from './services/keychainMigration';

let mainWindow: BrowserWindow | null = null;
// Initialize SecurityValidator and FileManager with dependency injection
const securityValidator = new SecurityValidator();
const fileManager: FileManager = new FileManager(securityValidator);
let metadataStore: MetadataStore | null = null;
let currentFolderPath: string | null = null;
const configManager: ConfigManager = (() => {
  const userDataPath = app.getPath('userData');
  const configPath = path.join(userDataPath, 'config.yaml');
  return new ConfigManager(configPath);
})();
const metadataWriter: MetadataWriter = new MetadataWriter();
let aiService: AIService | null = null;

// Helper function to get or create metadata store for a specific folder
function getMetadataStoreForFolder(folderPath: string): MetadataStore {
  if (currentFolderPath !== folderPath || !metadataStore) {
    currentFolderPath = folderPath;
    const metadataPath = path.join(folderPath, '.ingest-metadata.json');
    metadataStore = new MetadataStore(metadataPath);
  }
  return metadataStore;
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Initialize AI service from Keychain + environment variables
  const aiConfig = await ConfigManager.getAIConfig();
  if (aiConfig) {
    aiService = new AIService(aiConfig.provider, aiConfig.model, aiConfig.apiKey);
  }

  // In development, use Vite dev server; in production, load built files
  const isDev = !app.isPackaged;

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  // Run migration from plaintext electron-store to Keychain (one-time for existing users)
  try {
    const migrated = await migrateToKeychain();
    if (migrated) {
      console.log('Successfully migrated API keys to Keychain');
    }
  } catch (error) {
    console.error('Migration error (non-fatal):', error);
  }

  await createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// IPC Handlers

// File operations
ipcMain.handle('file:select-folder', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory'],
  });

  if (!result.canceled && result.filePaths.length > 0) {
    const folderPath = result.filePaths[0];

    // CRITICAL-1 FIX: Store selected folder in main process (trusted source)
    // Only dialog.showOpenDialog() can set the security boundary
    currentFolderPath = folderPath;
    securityValidator.setAllowedBasePath(folderPath);

    return folderPath;
  }

  return null;
});

// Read file as base64 data URL for display in renderer
ipcMain.handle('file:read-as-data-url', async (_event, filePath: string) => {
  try {
    // Security: Validate path (prevents path traversal)
    const validPath = await securityValidator.validateFilePath(filePath);

    // Security: Validate file size (prevents DoS)
    await securityValidator.validateFileSize(validPath, 100 * 1024 * 1024); // 100MB

    // Security: Validate file content matches extension (prevents malware upload)
    await securityValidator.validateFileContent(validPath);

    const buffer = await fs.readFile(validPath);
    const base64 = buffer.toString('base64');

    // Determine MIME type from extension
    const ext = path.extname(validPath).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.mp4': 'video/mp4',
      '.mov': 'video/quicktime',
      '.avi': 'video/x-msvideo',
      '.webm': 'video/webm',
    };

    const mimeType = mimeTypes[ext] || 'application/octet-stream';
    return `data:${mimeType};base64,${base64}`;
  } catch (error) {
    console.error('Failed to read file:', error); // Log full error internally

    // Special handling for security violations
    if (error instanceof SecurityViolationError) {
      console.error('Security violation:', error.type, error.details);
      throw new Error('File access denied');
    }

    throw sanitizeError(error); // Send sanitized error to renderer
  }
});

// CRITICAL-1 FIX: Remove folderPath parameter (renderer cannot override security boundary)
ipcMain.handle('file:load-files', async () => {
  if (!currentFolderPath) {
    throw new Error('No folder selected');
  }

  // Use stored folder path (trusted source from dialog)
  const files = await fileManager.scanFolder(currentFolderPath);
  const store = getMetadataStoreForFolder(currentFolderPath);

  // Load metadata for each file
  for (const file of files) {
    const existingMetadata = await store.getFileMetadata(file.id);
    if (existingMetadata) {
      file.mainName = existingMetadata.mainName;
      file.metadata = existingMetadata.metadata;
      file.processedByAI = existingMetadata.processedByAI;
    }
  }

  return files;
});

ipcMain.handle('file:rename', async (_event, fileId: string, mainName: string, currentPath: string) => {
  try {
    // Security: Validate input schema (prevents type confusion attacks)
    const validated = FileRenameSchema.parse({ fileId, mainName, currentPath });

    // Rename the file using validated data
    const newPath = await fileManager.renameFile(
      validated.currentPath,
      validated.fileId,
      validated.mainName
    );

    const folderPath = path.dirname(newPath);
    const store = getMetadataStoreForFolder(folderPath);

    // Get or create metadata
    let fileMetadata = await store.getFileMetadata(fileId);
    if (!fileMetadata) {
      // Create new metadata entry
      const stats = await fs.stat(newPath);
      fileMetadata = {
        id: fileId,
        originalFilename: path.basename(currentPath),
        currentFilename: path.basename(newPath),
        filePath: newPath,
        extension: path.extname(newPath),
        mainName: mainName,
        metadata: [],
        processedByAI: false,
        lastModified: stats.mtime,
        fileType: fileManager.getFileType(path.basename(newPath)),
      };
    } else {
      // Update existing metadata
      fileMetadata.mainName = mainName;
      fileMetadata.currentFilename = path.basename(newPath);
      fileMetadata.filePath = newPath;
    }

    await store.updateFileMetadata(fileId, fileMetadata);

    // Write metadata to the file
    await metadataWriter.writeMetadataToFile(
      newPath,
      fileMetadata.mainName,
      fileMetadata.metadata
    );

    return true;
  } catch (error) {
    console.error('Failed to rename file:', error); // Log full error internally

    // Special handling for validation errors
    if (error instanceof z.ZodError) {
      console.error('Invalid IPC message:', error.errors);
      throw new Error('Invalid request parameters');
    }

    throw sanitizeError(error); // Send sanitized error to renderer
  }
});

ipcMain.handle('file:update-metadata', async (_event, fileId: string, metadata: string[]) => {
  try {
    // Security: Validate input schema
    const validated = FileUpdateMetadataSchema.parse({ fileId, metadata });

    if (!currentFolderPath) return false;

    const store = getMetadataStoreForFolder(currentFolderPath);
    const fileMetadata = await store.getFileMetadata(validated.fileId);
    if (!fileMetadata) return false;

    fileMetadata.metadata = validated.metadata;
    await store.updateFileMetadata(validated.fileId, fileMetadata);

    // Write metadata INTO the actual file using exiftool
    await metadataWriter.writeMetadataToFile(
      fileMetadata.filePath,
      fileMetadata.mainName,
      validated.metadata
    );

    return true;
  } catch (error) {
    console.error('Failed to update metadata:', error); // Log full error internally

    // Special handling for validation errors
    if (error instanceof z.ZodError) {
      console.error('Invalid IPC message:', error.errors);
      throw new Error('Invalid request parameters');
    }

    throw sanitizeError(error); // Send sanitized error to renderer
  }
});

// AI operations
ipcMain.handle('ai:analyze-file', async (_event, filePath: string) => {
  try {
    if (!aiService) {
      throw new Error('AI service not configured. Please set API key in config.');
    }

    // Security: Validate path before AI processing
    const validPath = await securityValidator.validateFilePath(filePath);

    // Security: Validate file content (prevents sending malware to AI API)
    await securityValidator.validateFileContent(validPath);

    // Security: Validate file size
    await securityValidator.validateFileSize(validPath, 100 * 1024 * 1024);

    const lexicon = await configManager.getLexicon();
    return await aiService.analyzeImage(validPath, lexicon);
  } catch (error) {
    console.error('Failed to analyze file:', error);

    // Special handling for security violations
    if (error instanceof SecurityViolationError) {
      console.error('Security violation:', error.type, error.details);
      throw new Error('File validation failed');
    }

    throw sanitizeError(error);
  }
});

ipcMain.handle('ai:batch-process', async (_event, fileIds: string[]) => {
  try {
    // Security: Validate input schema
    const validated = AIBatchProcessSchema.parse({ fileIds });

    if (!aiService) {
      throw new Error('AI service not configured.');
    }

    if (!currentFolderPath) {
      throw new Error('No folder selected');
    }

    const store = getMetadataStoreForFolder(currentFolderPath);
    const results = new Map();
    const lexicon = await configManager.getLexicon();

    for (const fileId of validated.fileIds) {
    const fileMetadata = await store.getFileMetadata(fileId);
    if (!fileMetadata || fileMetadata.processedByAI) continue;

    try {
      const result = await aiService.analyzeImage(fileMetadata.filePath, lexicon);
      results.set(fileId, result);

      // Auto-update if confidence is high
      if (result.confidence > 0.7) {
        fileMetadata.mainName = result.mainName;
        fileMetadata.metadata = result.metadata;
        fileMetadata.processedByAI = true;
        await store.updateFileMetadata(fileId, fileMetadata);
      }
    } catch (error) {
      console.error(`Failed to process ${fileId}:`, error);
    }
  }

    return Object.fromEntries(results);
  } catch (error) {
    console.error('Failed to batch process:', error);

    // Special handling for validation errors
    if (error instanceof z.ZodError) {
      console.error('Invalid IPC message:', error.errors);
      throw new Error('Invalid request parameters');
    }

    throw sanitizeError(error);
  }
});

// Config operations
ipcMain.handle('config:load', async () => {
  return await configManager.loadConfig();
});

ipcMain.handle('config:save', async (_event, config: AppConfig) => {
  return await configManager.saveConfig(config);
});

ipcMain.handle('config:get-lexicon', async () => {
  return await configManager.getLexicon();
});

// Lexicon operations (UI format)
ipcMain.handle('lexicon:load', async () => {
  const lexicon = await configManager.getLexicon();
  return convertToUIFormat(lexicon);
});

ipcMain.handle('lexicon:save', async (_event, uiConfig: LexiconConfig) => {
  try {
    const lexicon = convertToYAMLFormat(uiConfig);
    await configManager.saveLexicon(lexicon);
    return true;
  } catch (error) {
    console.error('Failed to save lexicon:', error); // Log full error internally
    throw sanitizeError(error); // Send sanitized error to renderer
  }
});

// Check if AI is configured
ipcMain.handle('ai:is-configured', async () => {
  return aiService !== null;
});

// Get AI configuration for UI (with masked API key)
ipcMain.handle('ai:get-config', async () => {
  return configManager.getAIConfigForUI();
});

// Update AI configuration
ipcMain.handle('ai:update-config', async (_event, config: { provider: 'openai' | 'anthropic' | 'openrouter'; model: string; apiKey: string }) => {
  try {
    // Only test connection if a new API key is provided
    if (config.apiKey && config.apiKey.trim()) {
      const testResult = await configManager.testAIConnection(config.provider, config.model, config.apiKey);
      if (!testResult.success) {
        return { success: false, error: testResult.error || 'Connection test failed' };
      }
    }

    // Save configuration (to Keychain + electron-store)
    // If apiKey is empty, configManager will keep existing Keychain key
    const saveResult = await configManager.saveAIConfig(config);
    if (!saveResult) {
      return { success: false, error: 'Failed to save configuration' };
    }

    // Hot-reload aiService with new configuration
    const newConfig = await ConfigManager.getAIConfig();
    if (newConfig) {
      aiService = new AIService(newConfig.provider, newConfig.model, newConfig.apiKey);
    } else {
      aiService = null;
    }

    return { success: true };
  } catch (error) {
    console.error('Failed to update AI config:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
});

// Test AI connection
ipcMain.handle('ai:test-connection', async (_event, provider: 'openai' | 'anthropic' | 'openrouter', model: string, apiKey: string) => {
  try {
    return await configManager.testAIConnection(provider, model, apiKey);
  } catch (error) {
    console.error('Failed to test AI connection:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
});

// Test AI connection with saved Keychain key
ipcMain.handle('ai:test-saved-connection', async () => {
  try {
    return await configManager.testSavedAIConnection();
  } catch (error) {
    console.error('Failed to test saved AI connection:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
});

// Get available AI models for a provider
ipcMain.handle('ai:get-models', async (_event, provider: string) => {
  try {
    return await configManager.getAIModels(provider);
  } catch (error) {
    console.error('Failed to get models:', error);
    return [];
  }
});
