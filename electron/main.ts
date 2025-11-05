import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import * as path from 'path';
import { FileManager } from './services/fileManager';
import { MetadataStore } from './services/metadataStore';
import { ConfigManager } from './services/configManager';
import { AIService } from './services/aiService';
import type { AppConfig } from '../src/types';

let mainWindow: BrowserWindow | null = null;
let fileManager: FileManager;
let metadataStore: MetadataStore;
let configManager: ConfigManager;
let aiService: AIService | null = null;

// Initialize services
const userDataPath = app.getPath('userData');
const configPath = path.join(userDataPath, 'config.yaml');
const metadataPath = path.join(userDataPath, 'metadata.json');

fileManager = new FileManager();
metadataStore = new MetadataStore(metadataPath);
configManager = new ConfigManager(configPath);

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

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
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

ipcMain.handle('file:load-files', async (_event, folderPath: string) => {
  const files = await fileManager.scanFolder(folderPath);

  // Load metadata for each file
  for (const file of files) {
    const existingMetadata = await metadataStore.getFileMetadata(file.id);
    if (existingMetadata) {
      file.mainName = existingMetadata.mainName;
      file.metadata = existingMetadata.metadata;
      file.processedByAI = existingMetadata.processedByAI;
    }
  }

  return files;
});

ipcMain.handle('file:rename', async (_event, fileId: string, mainName: string) => {
  try {
    // Get current file metadata
    const fileMetadata = await metadataStore.getFileMetadata(fileId);
    if (!fileMetadata) return false;

    // Rename the file
    const newPath = await fileManager.renameFile(
      fileMetadata.filePath,
      fileId,
      mainName
    );

    // Update metadata
    fileMetadata.mainName = mainName;
    fileMetadata.currentFilename = path.basename(newPath);
    fileMetadata.filePath = newPath;

    await metadataStore.updateFileMetadata(fileId, fileMetadata);
    return true;
  } catch (error) {
    console.error('Failed to rename file:', error);
    return false;
  }
});

ipcMain.handle('file:update-metadata', async (_event, fileId: string, metadata: string[]) => {
  try {
    const fileMetadata = await metadataStore.getFileMetadata(fileId);
    if (!fileMetadata) return false;

    fileMetadata.metadata = metadata;
    await metadataStore.updateFileMetadata(fileId, fileMetadata);
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

  const results = new Map();
  const lexicon = await configManager.getLexicon();

  for (const fileId of fileIds) {
    const fileMetadata = await metadataStore.getFileMetadata(fileId);
    if (!fileMetadata || fileMetadata.processedByAI) continue;

    try {
      const result = await aiService.analyzeImage(fileMetadata.filePath, lexicon);
      results.set(fileId, result);

      // Auto-update if confidence is high
      if (result.confidence > 0.7) {
        fileMetadata.mainName = result.mainName;
        fileMetadata.metadata = result.metadata;
        fileMetadata.processedByAI = true;
        await metadataStore.updateFileMetadata(fileId, fileMetadata);
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

// Check if AI is configured
ipcMain.handle('ai:is-configured', async () => {
  return aiService !== null;
});
