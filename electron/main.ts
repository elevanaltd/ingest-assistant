// Load environment variables from .env file (must be first!)
import * as dotenv from 'dotenv';
dotenv.config();

import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import * as path from 'path';
import * as fs from 'fs/promises';
import { FileManager } from './services/fileManager';
import { MetadataStore } from './services/metadataStore';
import { ConfigManager } from './services/configManager';
import { AIService } from './services/aiService';
import { MetadataWriter } from './services/metadataWriter';
import { convertToYAMLFormat, convertToUIFormat } from './utils/lexiconConverter';
import type { AppConfig, LexiconConfig } from '../src/types';

let mainWindow: BrowserWindow | null = null;
const fileManager: FileManager = new FileManager();
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

  // Initialize AI service from environment variables
  const aiConfig = ConfigManager.getAIConfig();
  if (aiConfig) {
    aiService = new AIService(aiConfig.provider, aiConfig.model, aiConfig.apiKey);
  }

  // In development, use Vite dev server; in production, load built files
  const isDev = !app.isPackaged;

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

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
  return result.canceled ? null : result.filePaths[0];
});

// Read file as base64 data URL for display in renderer
ipcMain.handle('file:read-as-data-url', async (_event, filePath: string) => {
  try {
    // Security: Validate file size before reading into memory
    const stats = await fs.stat(filePath);
    const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

    if (stats.size > MAX_FILE_SIZE) {
      const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
      throw new Error(`File too large: ${sizeMB}MB (max 100MB)`);
    }

    const buffer = await fs.readFile(filePath);
    const base64 = buffer.toString('base64');

    // Determine MIME type from extension
    const ext = path.extname(filePath).toLowerCase();
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
    console.error('Failed to read file:', error);
    throw error;
  }
});

ipcMain.handle('file:load-files', async (_event, folderPath: string) => {
  const files = await fileManager.scanFolder(folderPath);
  const store = getMetadataStoreForFolder(folderPath);

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
    // Rename the file
    const newPath = await fileManager.renameFile(
      currentPath,
      fileId,
      mainName
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
    console.error('Failed to rename file:', error);
    return false;
  }
});

ipcMain.handle('file:update-metadata', async (_event, fileId: string, metadata: string[]) => {
  try {
    if (!currentFolderPath) return false;

    const store = getMetadataStoreForFolder(currentFolderPath);
    const fileMetadata = await store.getFileMetadata(fileId);
    if (!fileMetadata) return false;

    fileMetadata.metadata = metadata;
    await store.updateFileMetadata(fileId, fileMetadata);

    // Write metadata INTO the actual file using exiftool
    await metadataWriter.writeMetadataToFile(
      fileMetadata.filePath,
      fileMetadata.mainName,
      metadata
    );

    return true;
  } catch (error) {
    console.error('Failed to update metadata:', error);
    return false;
  }
});

// AI operations
ipcMain.handle('ai:analyze-file', async (_event, filePath: string) => {
  if (!aiService) {
    throw new Error('AI service not configured. Please set API key in config.');
  }

  const lexicon = await configManager.getLexicon();
  return await aiService.analyzeImage(filePath, lexicon);
});

ipcMain.handle('ai:batch-process', async (_event, fileIds: string[]) => {
  if (!aiService) {
    throw new Error('AI service not configured.');
  }

  if (!currentFolderPath) {
    throw new Error('No folder selected');
  }

  const store = getMetadataStoreForFolder(currentFolderPath);
  const results = new Map();
  const lexicon = await configManager.getLexicon();

  for (const fileId of fileIds) {
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
    console.error('Failed to save lexicon:', error);
    throw error;
  }
});

// Check if AI is configured
ipcMain.handle('ai:is-configured', async () => {
  return aiService !== null;
});
