// Load environment variables from .env file (must be first!)
import * as dotenv from 'dotenv';
dotenv.config();

import { app, BrowserWindow, ipcMain, screen } from 'electron';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import * as http from 'http';
import * as crypto from 'crypto';
import { FileManager } from './services/fileManager';
import { SecurityValidator } from './services/securityValidator';
import { MetadataStore } from './services/metadataStore';
import { ConfigManager } from './services/configManager';
import { AIService } from './services/aiService';
import { MetadataWriter } from './services/metadataWriter';
import { VideoTranscoder } from './services/videoTranscoder';
import { convertToYAMLFormat, convertToUIFormat } from './utils/lexiconConverter';
import { sanitizeError } from './utils/errorSanitization';
import type { AppConfig, LexiconConfig, FileMetadata } from '../src/types';
import { migrateToKeychain } from './services/keychainMigration';
import { BatchQueueManager } from './services/batchQueueManager';
import { registerCfexTransferHandlers } from './ipc/cfexTransferHandlers';
import { registerProxyGenerationHandlers } from './ipc/proxyGenerationHandlers';
import { registerFileHandlers } from './ipc/fileHandlers';
import { registerAiHandlers } from './ipc/aiHandlers';
import { registerBatchHandlers } from './ipc/batchHandlers';
import { RateLimiter } from './utils/rateLimiter';

let mainWindow: BrowserWindow | null = null;
let mediaServer: http.Server | null = null;
const MEDIA_SERVER_PORT = 8765;

// Security: Media server capability token (per Security Report 007 - BLOCKING #2)
// Prevents cross-origin localhost probing and unauthorized media access
// Generated once per session using cryptographically secure random bytes
let MEDIA_SERVER_TOKEN: string = '';

// Initialize SecurityValidator, MetadataWriter, and FileManager with dependency injection
const securityValidator = new SecurityValidator();
const metadataWriter: MetadataWriter = new MetadataWriter();
const fileManager: FileManager = new FileManager(securityValidator, metadataWriter);

// Rate limiter: 100 files per minute (allows bursts of 100, refills at ~1.67 files/sec)
const batchProcessRateLimiter = new RateLimiter(100, 100 / 60);
let metadataStore: MetadataStore | null = null;
let currentFolderPath: string | null = null;
const configManager: ConfigManager = (() => {
  const userDataPath = app.getPath('userData');
  const configPath = path.join(userDataPath, 'config.yaml');
  return new ConfigManager(configPath);
})();
const videoTranscoder: VideoTranscoder = new VideoTranscoder();
let aiService: AIService | null = null;

// Initialize batch queue manager with persistent storage
const batchQueuePath = path.join(app.getPath('userData'), '.ingest-batch-queue.json');
const batchQueueManager: BatchQueueManager = new BatchQueueManager(batchQueuePath);

/**
 * Normalize file path for cross-platform compatibility.
 * When metadata was created on macOS (/Volumes/...) but we're running on Linux (/mnt/...),
 * reconstruct the path using the current folder path and filename.
 */
function normalizeFilePath(fileMetadata: FileMetadata, baseFolderPath: string): string {
  // Use currentFilename (or originalFilename as fallback) with the current folder path
  const filename = fileMetadata.currentFilename || fileMetadata.originalFilename;
  const normalizedPath = path.join(baseFolderPath, filename);

  // Log if path was normalized (indicates cross-platform usage)
  if (fileMetadata.filePath !== normalizedPath) {
    console.log(`[normalizeFilePath] Cross-platform path normalization:`);
    console.log(`  Stored path: ${fileMetadata.filePath}`);
    console.log(`  Normalized:  ${normalizedPath}`);
  }

  return normalizedPath;
}

// Cache directory registration moved to app.whenReady() to prevent race condition
// See lines 365-368 for the awaited registration before createWindow()

// Helper function to get or create metadata store for a specific folder
function getMetadataStoreForFolder(folderPath: string): MetadataStore {
  console.log('[main.ts] getMetadataStoreForFolder called with folderPath:', folderPath);
  console.log('[main.ts] currentFolderPath is:', currentFolderPath);

  if (currentFolderPath !== folderPath || !metadataStore) {
    // Folder is changing - clear stale batch queue (Issue #24)
    if (currentFolderPath && currentFolderPath !== folderPath) {
      console.log(`[main.ts] Folder changing from ${currentFolderPath} to ${folderPath}`);
      batchQueueManager.clearQueue();
    }

    currentFolderPath = folderPath;
    const metadataPath = path.join(folderPath, '.ingest-metadata.json');
    console.log('[main.ts] Creating MetadataStore with path:', metadataPath);
    metadataStore = new MetadataStore(metadataPath);
  }
  return metadataStore;
}

// Get MIME type for video file based on extension
function getVideoMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes: Record<string, string> = {
    '.mp4': 'video/mp4',
    '.mov': 'video/quicktime',
    '.avi': 'video/x-msvideo',
    '.mkv': 'video/x-matroska',
    '.webm': 'video/webm',
    '.m4v': 'video/x-m4v',
    '.wmv': 'video/x-ms-wmv',
    '.flv': 'video/x-flv',
    '.3gp': 'video/3gpp',
    '.mpg': 'video/mpeg',
    '.mpeg': 'video/mpeg',
  };
  return mimeTypes[ext] || 'video/mp4';
}

// Create local HTTP server for streaming video files
// This approach works reliably with Chromium's media element security
function createMediaServer(): http.Server {
  const server = http.createServer(async (req, res) => {
    try {
      console.log('[MediaServer] Request:', req.method, req.url);

      // Extract token and file path from URL query parameters
      const url = new URL(req.url!, `http://localhost:${MEDIA_SERVER_PORT}`);
      const token = url.searchParams.get('token');
      const filePath = url.searchParams.get('path');

      // Security: Validate capability token BEFORE path validation
      // Per Security Report 007 - BLOCKING #2: Prevent cross-origin localhost probing
      // Token check must happen first to avoid leaking file existence via error messages
      if (!token || token !== MEDIA_SERVER_TOKEN) {
        console.warn('[MediaServer] Invalid or missing token');
        res.writeHead(403, { 'Content-Type': 'text/plain' });
        res.end('Forbidden: Invalid authentication token');
        return;
      }

      if (!filePath) {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.end('Missing path parameter');
        return;
      }

      console.log('[MediaServer] File path:', filePath);

      // Security: Validate file path
      try {
        await securityValidator.validateFilePath(filePath);
      } catch (error) {
        console.error('[MediaServer] Security validation failed:', error);
        res.writeHead(403, { 'Content-Type': 'text/plain' });
        res.end('Access denied');
        return;
      }

      // Get file stats and MIME type
      const stat = fsSync.statSync(filePath);
      const fileSize = stat.size;
      const mimeType = getVideoMimeType(filePath);
      const range = req.headers.range;

      console.log('[MediaServer] File info:', { fileSize, mimeType, hasRange: !!range });

      // Handle range requests for video seeking
      if (range) {
        const parts = range.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunkSize = end - start + 1;

        console.log('[MediaServer] Range request:', { start, end, chunkSize, fileSize });

        const fileStream = fsSync.createReadStream(filePath, { start, end });

        res.writeHead(206, {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunkSize,
          'Content-Type': mimeType,
          'Access-Control-Allow-Origin': '*',
        });

        fileStream.pipe(res);
      } else {
        // No range request - send entire file
        console.log('[MediaServer] Full file request, size:', fileSize);

        res.writeHead(200, {
          'Content-Length': fileSize,
          'Content-Type': mimeType,
          'Accept-Ranges': 'bytes',
          'Access-Control-Allow-Origin': '*',
        });

        fsSync.createReadStream(filePath).pipe(res);
      }
    } catch (error) {
      console.error('[MediaServer] Error:', error);
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Internal server error');
    }
  });

  server.listen(MEDIA_SERVER_PORT, 'localhost', () => {
    console.log(`[MediaServer] Listening on http://localhost:${MEDIA_SERVER_PORT}`);
  });

  return server;
}

async function createWindow() {
  // Get primary display dimensions for full screen width
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  mainWindow = new BrowserWindow({
    width,
    height,
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

  // Register CFEx transfer IPC handlers
  registerCfexTransferHandlers(mainWindow);

  // Register Proxy Generation IPC handlers
  registerProxyGenerationHandlers(mainWindow);

  // Register File IPC handlers
  registerFileHandlers(mainWindow, {
    securityValidator,
    fileManager,
    metadataWriter,
    videoTranscoder,
    batchQueueManager,
    MEDIA_SERVER_PORT,
    MEDIA_SERVER_TOKEN,
    currentFolderPath,
    getMetadataStoreForFolder
  });

  // Register AI IPC handlers
  // Note: Don't use setAiService return value - use getAiService() instead for single source of truth
  registerAiHandlers(mainWindow, {
    aiService,
    securityValidator,
    fileManager,
    configManager,
    batchProcessRateLimiter,
    getCurrentFolderPath: () => currentFolderPath,
    getMetadataStoreForFolder,
    normalizeFilePath
  });

  // Register Batch IPC handlers
  registerBatchHandlers(mainWindow, {
    batchQueueManager,
    batchProcessRateLimiter,
    securityValidator,
    fileManager,
    metadataWriter,
    configManager,
    getCurrentFolderPath: () => currentFolderPath,
    getMetadataStoreForFolder,
    normalizeFilePath
  });

  // In development, use Vite dev server; in production, load built files
  const isDev = !app.isPackaged;

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    await mainWindow.loadFile(path.join(__dirname, '../../index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  // Generate secure random token for media server authentication
  // Per Security Report 007 - BLOCKING #2: Capability token prevents cross-origin access
  // 32 bytes = 256 bits of entropy (cryptographically secure)
  MEDIA_SERVER_TOKEN = crypto.randomBytes(32).toString('hex');
  console.log('[Security] Media server token generated (length:', MEDIA_SERVER_TOKEN.length, 'chars)');

  // Start local HTTP server for video streaming
  mediaServer = createMediaServer();

  // Run migration from plaintext electron-store to Keychain (one-time for existing users)
  try {
    const migrated = await migrateToKeychain();
    if (migrated) {
      console.log('Successfully migrated API keys to Keychain');
    }
  } catch (error) {
    console.error('Migration error (non-fatal):', error);
  }

  // I7 Human Primacy: Reset filenameRewrite to false on app startup (session-ephemeral)
  // This ensures backend config matches frontend state - user must consciously enable each session
  // Prevents silent destructive renames if config had filenameRewrite: true from previous session
  try {
    const currentToggles = await configManager.getCfexToggles();
    if (currentToggles.filenameRewrite) {
      console.log('[I7] Resetting filenameRewrite to false (session-ephemeral)');
      await configManager.setCfexToggles({
        ...currentToggles,
        filenameRewrite: false
      });
    }
  } catch (error) {
    console.error('[I7] Failed to reset filenameRewrite (non-fatal):', error);
  }

  // Register transcode cache directory with security validator
  // CRITICAL: Must complete BEFORE createWindow() to prevent PATH_TRAVERSAL errors
  // during batch processing. Without this, if user triggers batch processing before
  // registration completes, SecurityValidator rejects cache directory access.
  // Resolves symlinks (macOS /var -> /private/var) to match validation behavior.
  try {
    const cacheDir = videoTranscoder.getCacheDirectory();
    const resolvedCacheDir = await fs.realpath(cacheDir);
    await securityValidator.addAllowedPath(resolvedCacheDir);
    console.log('[Security] Transcode cache directory registered:', resolvedCacheDir);
  } catch (error) {
    console.error('[Security] FATAL: Failed to register transcode cache directory:', error);
    // Cannot proceed safely - cache directory registration is non-negotiable for batch transcoding
    app.quit();
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

app.on('quit', () => {
  // Clean up media server
  if (mediaServer) {
    console.log('[MediaServer] Shutting down');
    mediaServer.close();
  }
});

// IPC Handlers

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

ipcMain.handle('config:get-shot-types', async () => {
  // Load config first to ensure it's cached
  await configManager.loadConfig();
  return configManager.getAllShotTypes();
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

// Folder completion operations (Phase C)
ipcMain.handle('folder:set-completed', async (_event, completed: boolean) => {
  try {
    if (!currentFolderPath || !metadataStore) {
      throw new Error('No folder selected');
    }

    const result = await metadataStore.setCompleted(completed);
    return result;
  } catch (error) {
    console.error('[main.ts] folder:set-completed error:', error);
    throw sanitizeError(error);
  }
});

ipcMain.handle('folder:get-completed', async () => {
  try {
    if (!currentFolderPath || !metadataStore) {
      throw new Error('No folder selected');
    }

    return metadataStore.getCompleted();
  } catch (error) {
    console.error('[main.ts] folder:get-completed error:', error);
    throw sanitizeError(error);
  }
});
