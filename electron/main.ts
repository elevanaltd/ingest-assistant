// Load environment variables from .env file (must be first!)
import * as dotenv from 'dotenv';
dotenv.config();

import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import * as http from 'http';
import * as crypto from 'crypto';
import { z } from 'zod';
import { FileManager } from './services/fileManager';
import { SecurityValidator } from './services/securityValidator';
import { SecurityViolationError } from './utils/securityViolationError';
import { MetadataStore } from './services/metadataStore';
import { ConfigManager } from './services/configManager';
import { AIService } from './services/aiService';
import { MetadataWriter } from './services/metadataWriter';
import { VideoFrameExtractor } from './services/videoFrameExtractor';
import { VideoTranscoder } from './services/videoTranscoder';
import { convertToYAMLFormat, convertToUIFormat } from './utils/lexiconConverter';
import { sanitizeError } from './utils/errorSanitization';
import { FileRenameSchema, FileUpdateMetadataSchema, FileStructuredUpdateSchema, AIBatchProcessSchema, BatchStartSchema, FileStructuredUpdateInput } from './schemas/ipcSchemas';
import type { AppConfig, LexiconConfig, ShotType, AIAnalysisResult } from '../src/types';
import { migrateToKeychain } from './services/keychainMigration';
import { BatchQueueManager } from './services/batchQueueManager';

let mainWindow: BrowserWindow | null = null;
let mediaServer: http.Server | null = null;
const MEDIA_SERVER_PORT = 8765;

// Security: Media server capability token (per Security Report 007 - BLOCKING #2)
// Prevents cross-origin localhost probing and unauthorized media access
// Generated once per session using cryptographically secure random bytes
let MEDIA_SERVER_TOKEN: string = '';

// Initialize SecurityValidator and FileManager with dependency injection
const securityValidator = new SecurityValidator();
const fileManager: FileManager = new FileManager(securityValidator);

// Rate limiter for batch operations (token bucket algorithm)
class RateLimiter {
  private tokens: number;
  private lastRefill: number;
  private readonly maxTokens: number;
  private readonly refillRate: number; // tokens per second

  constructor(maxTokens: number, refillRate: number) {
    this.maxTokens = maxTokens;
    this.refillRate = refillRate;
    this.tokens = maxTokens;
    this.lastRefill = Date.now();
  }

  private refill(): void {
    const now = Date.now();
    const timePassed = (now - this.lastRefill) / 1000; // seconds
    const tokensToAdd = timePassed * this.refillRate;

    this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }

  async consume(tokens: number): Promise<void> {
    this.refill();

    if (this.tokens < tokens) {
      // Wait for tokens to be available instead of throwing error
      const waitTime = Math.ceil(((tokens - this.tokens) / this.refillRate) * 1000);
      console.log(`[RateLimiter] Waiting ${waitTime}ms for ${tokens} token(s)...`);

      await new Promise(resolve => setTimeout(resolve, waitTime));

      // Refill after waiting
      this.refill();
    }

    this.tokens -= tokens;
  }
}

// Rate limiter: 100 files per minute (allows bursts of 100, refills at ~1.67 files/sec)
const batchProcessRateLimiter = new RateLimiter(100, 100 / 60);
let metadataStore: MetadataStore | null = null;
let currentFolderPath: string | null = null;
const configManager: ConfigManager = (() => {
  const userDataPath = app.getPath('userData');
  const configPath = path.join(userDataPath, 'config.yaml');
  return new ConfigManager(configPath);
})();
const metadataWriter: MetadataWriter = new MetadataWriter();
const videoTranscoder: VideoTranscoder = new VideoTranscoder();
let aiService: AIService | null = null;

// Initialize batch queue manager with persistent storage
const batchQueuePath = path.join(app.getPath('userData'), '.ingest-batch-queue.json');
const batchQueueManager: BatchQueueManager = new BatchQueueManager(batchQueuePath);

// Register transcode cache directory with security validator
// This allows the media server to serve transcoded files
// IMPORTANT: Resolve symlinks (macOS /var -> /private/var) to match validation behavior
(async () => {
  const cacheDir = videoTranscoder.getCacheDirectory();
  const resolvedCacheDir = await fs.realpath(cacheDir);
  await securityValidator.addAllowedPath(resolvedCacheDir);
})();

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

// File operations
ipcMain.handle('file:select-folder', async () => {
  console.log('[main.ts] file:select-folder - Opening folder dialog');
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory'],
  });

  console.log('[main.ts] Dialog result:', { canceled: result.canceled, filePaths: result.filePaths });

  if (!result.canceled && result.filePaths.length > 0) {
    const folderPath = result.filePaths[0];

    console.log('[main.ts] Selected folder path:', folderPath);
    console.log('[main.ts] Setting currentFolderPath to:', folderPath);

    // CRITICAL-1 FIX: Store selected folder in main process (trusted source)
    // Only dialog.showOpenDialog() can set the security boundary
    currentFolderPath = folderPath;
    securityValidator.setAllowedBasePath(folderPath);

    // Issue #24: Clear stale batch queue when folder changes
    // Prevents 99/100 failures from fileIds belonging to previous folder
    batchQueueManager.clearQueue();

    console.log('[main.ts] currentFolderPath is now:', currentFolderPath);
    return folderPath;
  }

  return null;
});

// Read file as base64 data URL for display in renderer
// Note: For videos, returns file:// URL to avoid loading large files into memory
ipcMain.handle('file:read-as-data-url', async (_event, filePath: string) => {
  try {
    // Security: Validate path (prevents path traversal)
    const validPath = await securityValidator.validateFilePath(filePath);

    // Determine file type
    const fileType = fileManager.getFileType(validPath);

    // Security: Validate file content matches extension (prevents malware upload)
    await securityValidator.validateFileContent(validPath);

    // For video files, return HTTP URL pointing to local media server
    // This prevents DoS from large video files (can be 5GB+)
    // The HTTP server supports streaming and range requests for seeking
    if (fileType === 'video') {
      console.log('[IPC] Returning HTTP URL for video streaming:', validPath);

      // Check video codec compatibility
      let shouldTranscode = false;
      try {
        const extractor = new VideoFrameExtractor();
        const codecInfo = await extractor.getVideoCodec(validPath);
        console.log('[IPC] Video codec:', codecInfo);

        if (!codecInfo.supported) {
          console.warn('[IPC] ⚠️  Unsupported codec detected - will transcode for preview');
          console.warn('[IPC]     Codec:', codecInfo.codec_name, '-', codecInfo.codec_long_name);
          console.warn('[IPC]     Supported codecs: H.264, VP8, VP9, Theora');
          shouldTranscode = true;
        }
      } catch (error) {
        console.error('[IPC] Failed to check video codec:', error);
      }

      // If codec is unsupported, transcode to H.264 for preview
      if (shouldTranscode) {
        try {
          console.log('[IPC] Starting transcode for preview...');
          const transcodedPath = await videoTranscoder.transcodeForPreview(validPath);
          const encodedPath = encodeURIComponent(transcodedPath);
          const httpUrl = `http://localhost:${MEDIA_SERVER_PORT}/?path=${encodedPath}&token=${MEDIA_SERVER_TOKEN}`;
          console.log('[IPC] Transcode complete, serving:', httpUrl);

          // Return URL with success indicator
          const successMessage = 'H.264 Preview (AI analysis on original)';
          return `data:text/plain;base64,${Buffer.from(successMessage, 'utf8').toString('base64')}|||${httpUrl}`;
        } catch (error) {
          console.error('[IPC] Transcode failed:', error);
          // Fall back to original file URL (may show codec warning in browser)
          const encodedPath = encodeURIComponent(validPath);
          const httpUrl = `http://localhost:${MEDIA_SERVER_PORT}/?path=${encodedPath}&token=${MEDIA_SERVER_TOKEN}`;
          const errorMessage = `⚠️ Transcode failed: ${error instanceof Error ? error.message : 'Unknown error'}. Showing original file (may not play correctly).`;
          return `data:text/plain;base64,${Buffer.from(errorMessage).toString('base64')}|||${httpUrl}`;
        }
      }

      // Codec is supported - return original file URL with token
      const encodedPath = encodeURIComponent(validPath);
      const httpUrl = `http://localhost:${MEDIA_SERVER_PORT}/?path=${encodedPath}&token=${MEDIA_SERVER_TOKEN}`;
      console.log('[IPC] Codec supported, HTTP URL:', httpUrl);
      return httpUrl;
    }

    // For images, validate size and load into memory as base64
    // Security: Validate file size (prevents DoS) - only for images
    await securityValidator.validateFileSize(validPath, 100 * 1024 * 1024); // 100MB

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
      '.bmp': 'image/bmp',
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

  // Load or create metadata for each file (Issue #24)
  for (const file of files) {
    const existingMetadata = await store.getFileMetadata(file.id);

    if (!existingMetadata) {
      // Save the file metadata from scanFolder to the store
      // scanFolder already created a complete FileMetadata object
      await store.updateFileMetadata(file.id, file);
    } else {
      // Use existing metadata (which may have been AI-processed)
      file.mainName = existingMetadata.mainName;
      file.metadata = existingMetadata.metadata;
      file.processedByAI = existingMetadata.processedByAI;
      // Preserve structured naming components
      file.location = existingMetadata.location;
      file.subject = existingMetadata.subject;
      file.action = existingMetadata.action;
      file.shotType = existingMetadata.shotType;
    }
  }

  return files;
});

// Paginated file listing (issue #19)
ipcMain.handle('file:list-range', async (_event, startIndex: number, pageSize: number) => {
  // Validate inputs
  const { FileListRangeSchema } = await import('./schemas/ipcSchemas');
  const validated = FileListRangeSchema.parse({ startIndex, pageSize });

  if (!currentFolderPath) {
    throw new Error('No folder selected');
  }

  // Get paginated files
  const result = await fileManager.scanFolderRange(
    currentFolderPath,
    validated.startIndex,
    validated.pageSize
  );

  // Hydrate metadata for files in this range
  const store = getMetadataStoreForFolder(currentFolderPath);
  for (const file of result.files) {
    const existingMetadata = await store.getFileMetadata(file.id);
    if (existingMetadata) {
      file.mainName = existingMetadata.mainName;
      file.metadata = existingMetadata.metadata;
      file.processedByAI = existingMetadata.processedByAI;
      file.location = existingMetadata.location;
      file.subject = existingMetadata.subject;
      file.shotType = existingMetadata.shotType;
    }
  }

  return result;
});

ipcMain.handle('file:rename', async (_event, fileId: string, mainName: string, currentPath: string, structured?: { location?: string; subject?: string; action?: string; shotType?: string }) => {
  try {
    console.log('[main.ts] file:rename called with:', { fileId, mainName, structured });

    // Security: Validate input schema (prevents type confusion attacks)
    const validated = FileRenameSchema.parse({ fileId, mainName, currentPath, structured });

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
        // Store structured components if provided
        location: structured?.location,
        subject: structured?.subject,
        action: structured?.action,
        shotType: structured?.shotType as ShotType | undefined,
      };
    } else {
      // Update existing metadata
      fileMetadata.mainName = mainName;
      fileMetadata.currentFilename = path.basename(newPath);
      fileMetadata.filePath = newPath;
      // Update structured components if provided (allow clearing action with empty string)
      if (structured && 'location' in structured) fileMetadata.location = structured.location;
      if (structured && 'subject' in structured) fileMetadata.subject = structured.subject;
      if (structured && 'action' in structured) fileMetadata.action = structured.action || undefined;
      if (structured && 'shotType' in structured) fileMetadata.shotType = structured.shotType as ShotType;
    }

    console.log('[main.ts] Saving fileMetadata to store:', JSON.stringify({
      id: fileMetadata.id,
      mainName: fileMetadata.mainName,
      location: fileMetadata.location,
      subject: fileMetadata.subject,
      shotType: fileMetadata.shotType
    }));

    await store.updateFileMetadata(fileId, fileMetadata);

    // Write metadata to the file
    await metadataWriter.writeMetadataToFile(
      newPath,
      fileMetadata.mainName,
      fileMetadata.metadata,
      {
        location: fileMetadata.location,
        subject: fileMetadata.subject,
        action: fileMetadata.action,
        shotType: fileMetadata.shotType
      }
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
    console.log('[main.ts] file:update-metadata called with fileId:', fileId, 'metadata:', metadata);

    // Security: Validate input schema
    const validated = FileUpdateMetadataSchema.parse({ fileId, metadata });

    if (!currentFolderPath) {
      throw new Error('No folder selected');
    }

    const store = getMetadataStoreForFolder(currentFolderPath);

    // Re-fetch metadata to get latest mainName (in case updateStructuredMetadata was called first)
    const fileMetadata = await store.getFileMetadata(validated.fileId);
    if (!fileMetadata) {
      throw new Error(`File metadata not found for ID: ${validated.fileId}`);
    }

    console.log('[main.ts] Updating file metadata - current mainName:', fileMetadata.mainName);
    console.log('[main.ts] Stored filePath:', fileMetadata.filePath);
    console.log('[main.ts] Original filename:', fileMetadata.originalFilename);
    console.log('[main.ts] Current filename:', fileMetadata.currentFilename);

    fileMetadata.metadata = validated.metadata;
    await store.updateFileMetadata(validated.fileId, fileMetadata);

    // BUG FIX: Use path based on what file actually exists on disk
    // The stored filePath might reflect a conceptual rename that never happened
    // For now, use originalFilename which is based on camera ID (never changes)
    const actualFilePath = path.join(currentFolderPath, fileMetadata.originalFilename);
    console.log('[main.ts] Actual file path to write:', actualFilePath);

    // Write metadata INTO the actual file using exiftool
    // Use the current mainName from fileMetadata (which may have been updated by updateStructuredMetadata)
    console.log('[main.ts] Writing to XMP - title:', fileMetadata.mainName, 'tags:', validated.metadata);
    await metadataWriter.writeMetadataToFile(
      actualFilePath,
      fileMetadata.mainName,
      validated.metadata,
      {
        location: fileMetadata.location,
        subject: fileMetadata.subject,
        action: fileMetadata.action,
        shotType: fileMetadata.shotType
      }
    );

    console.log('[main.ts] file:update-metadata - Successfully wrote XMP with title:', fileMetadata.mainName, 'and tags:', validated.metadata);

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

ipcMain.handle('file:update-structured-metadata', async (_event, fileId: string, structured: { location: string; subject: string; action?: string; shotType: string }, filePath?: string, fileType?: 'image' | 'video') => {
  try {
    console.log('[main.ts] file:update-structured-metadata called with:', { fileId, structured, filePath, fileType });

    // Security: Validate input schema (prevents oversized payloads and injection)
    const validated = FileStructuredUpdateSchema.parse({ fileId, structured });

    if (!currentFolderPath) {
      throw new Error('No folder selected');
    }

    const store = getMetadataStoreForFolder(currentFolderPath);
    let fileMetadata = await store.getFileMetadata(fileId);

    // If metadata doesn't exist yet, create it (for new files)
    if (!fileMetadata) {
      console.log('[main.ts] Creating new metadata entry for file ID:', fileId);

      if (!filePath) {
        throw new Error(`File metadata not found and filePath not provided for ID: ${fileId}`);
      }

      fileMetadata = {
        id: fileId,
        originalFilename: path.basename(filePath),
        currentFilename: path.basename(filePath),
        filePath: filePath,
        extension: path.extname(filePath),
        mainName: '',
        metadata: [],
        processedByAI: false,
        lastModified: new Date(),
        fileType: fileType || 'image',
      };
    }

    // Update structured components (allow clearing action with empty string)
    const validatedStructured = validated.structured as FileStructuredUpdateInput['structured'];
    fileMetadata.location = validatedStructured.location;
    fileMetadata.subject = validatedStructured.subject;
    fileMetadata.action = validatedStructured.action || undefined;
    fileMetadata.shotType = validatedStructured.shotType as ShotType;

    // Build generated title from structured components
    const generatedTitle = fileMetadata.fileType === 'video' && structured.action
      ? `${structured.location}-${structured.subject}-${structured.action}-${structured.shotType}`
      : `${structured.location}-${structured.subject}-${structured.shotType}`;

    // Update mainName to match generated title
    fileMetadata.mainName = generatedTitle;

    console.log('[main.ts] Updating structured metadata in store:', {
      location: fileMetadata.location,
      subject: fileMetadata.subject,
      action: fileMetadata.action,
      shotType: fileMetadata.shotType,
      generatedTitle
    });

    // Save to JSON store
    await store.updateFileMetadata(fileId, fileMetadata);

    // NOTE: We do NOT write to file here - let updateMetadata handle the file write
    // This prevents duplicate writes and ensures metadata tags are included

    return true;
  } catch (error) {
    console.error('Failed to update structured metadata:', error);
    throw sanitizeError(error);
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

    const lexicon = await configManager.getLexicon();

    // Detect file type and route to appropriate analysis method
    const fileType = fileManager.getFileType(validPath);

    if (fileType === 'video') {
      // For videos, we extract frames (not load entire file), so no size limit needed
      // Video files can be 5GB+ which is fine since we only extract ~5 JPEG frames
      console.log('[IPC] Analyzing video file (frame extraction):', validPath);
      return await aiService.analyzeVideo(validPath, lexicon);
    } else {
      // For images, validate size before loading into memory for AI analysis
      // Security: Validate file size (prevents DoS)
      await securityValidator.validateFileSize(validPath, 100 * 1024 * 1024); // 100MB

      console.log('[IPC] Analyzing image file:', validPath);
      return await aiService.analyzeImage(validPath, lexicon);
    }
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
    // Security: Rate limiting per file (prevents abuse)
    await batchProcessRateLimiter.consume(1);

    const fileMetadata = await store.getFileMetadata(fileId);
    if (!fileMetadata || fileMetadata.processedByAI) continue;

    try {
      // CRITICAL-8: Security validation for each file in batch
      // Mitigates: Path traversal, content type confusion, resource exhaustion
      // Pattern: Same 3-layer validation as ai:analyze-file handler
      const validatedPath = await securityValidator.validateFilePath(fileMetadata.filePath);
      await securityValidator.validateFileContent(validatedPath);

      // Detect file type and route to appropriate analysis method
      const fileType = fileManager.getFileType(validatedPath);

      let result: AIAnalysisResult;
      if (fileType === 'video') {
        // For videos, we extract frames (not load entire file), so no size limit needed
        console.log('[IPC] Batch analyzing video file (frame extraction):', validatedPath);
        result = await aiService.analyzeVideo(validatedPath, lexicon);
      } else {
        // For images, validate size before loading into memory for AI analysis
        // Security: Validate file size (prevents DoS)
        await securityValidator.validateFileSize(validatedPath, 100 * 1024 * 1024); // 100MB

        console.log('[IPC] Batch analyzing image file:', validatedPath);
        result = await aiService.analyzeImage(validatedPath, lexicon);
      }
      results.set(fileId, result);

      // Auto-update if confidence is high
      if (result.confidence > 0.7) {
        fileMetadata.mainName = result.mainName;
        fileMetadata.metadata = result.metadata;
        fileMetadata.processedByAI = true;
        await store.updateFileMetadata(fileId, fileMetadata);
      }
    } catch (error) {
      // Security validation errors are logged with their type for audit trail
      if (error instanceof SecurityViolationError) {
        console.error(`Security violation for ${fileId}:`, error.type, error.details);
      } else {
        console.error(`Failed to process ${fileId}:`, error);
      }
      // Continue with remaining files (partial batch failure is acceptable)
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

    // Special handling for security violations
    if (error instanceof SecurityViolationError) {
      console.error('Security violation:', error.type, error.details);
      throw new Error('File validation failed');
    }

    throw sanitizeError(error);
  }
});

// Batch operations (Issue #24)
ipcMain.handle('batch:start', async (_event, fileIds: string[]) => {
  try {
    // Security: Validate input schema
    const validated = BatchStartSchema.parse({ fileIds });

    // Note: Rate limiting is applied per-file during processing (not upfront)
    // This allows the rate limiter to properly pace the batch

    if (!aiService) {
      throw new Error('AI service not configured.');
    }

    if (!currentFolderPath) {
      throw new Error('No folder selected');
    }

    // Add files to queue
    const queueId = await batchQueueManager.addToQueue(validated.fileIds);

    const store = getMetadataStoreForFolder(currentFolderPath);
    const lexicon = await configManager.getLexicon();

    // Define processor function that will be called for each file
    const processor = async (fileId: string) => {
      try {
        const fileMetadata = await store.getFileMetadata(fileId);
        if (!fileMetadata || fileMetadata.processedByAI) {
          return { success: false };
        }

        // CRITICAL-8: Security validation for each file in batch
        const validatedPath = await securityValidator.validateFilePath(fileMetadata.filePath);
        await securityValidator.validateFileContent(validatedPath);

        // Detect file type and route to appropriate analysis method
        const fileType = fileManager.getFileType(validatedPath);

        let result: AIAnalysisResult;
        if (fileType === 'video') {
          console.log('[IPC] Batch analyzing video file:', validatedPath);
          result = await aiService!.analyzeVideo(validatedPath, lexicon);
        } else {
          await securityValidator.validateFileSize(validatedPath, 100 * 1024 * 1024);
          console.log('[IPC] Batch analyzing image file:', validatedPath);
          result = await aiService!.analyzeImage(validatedPath, lexicon);
        }

        // Auto-update if confidence is high
        if (result.confidence > 0.7) {
          fileMetadata.mainName = result.mainName;
          fileMetadata.metadata = result.metadata;
          fileMetadata.location = result.location;
          fileMetadata.subject = result.subject;
          fileMetadata.action = result.action;
          fileMetadata.shotType = result.shotType;
          fileMetadata.processedByAI = true;
          await store.updateFileMetadata(fileId, fileMetadata);

          // Issue #2: Write metadata to actual file (not just JSON store)
          // This ensures batch processing updates both the JSON store AND the file's EXIF/XMP metadata
          await metadataWriter.writeMetadataToFile(
            fileMetadata.filePath,
            fileMetadata.mainName,
            fileMetadata.metadata,
            {
              location: fileMetadata.location,
              subject: fileMetadata.subject,
              action: fileMetadata.action,
              shotType: fileMetadata.shotType
            }
          );
        }

        return { success: true, result };
      } catch (error) {
        console.error(`Failed to process ${fileId}:`, error);
        throw error;
      }
    };

    // Define progress callback that emits events to renderer
    const progressCallback = (progress: import('../src/types').BatchProgress) => {
      if (mainWindow) {
        mainWindow.webContents.send('batch:progress', progress);
      }
    };

    // Define complete callback that emits completion event
    const completeCallback = (summary: import('../src/types').BatchCompleteSummary) => {
      if (mainWindow) {
        mainWindow.webContents.send('batch:complete', summary);
      }
    };

    // Start processing in background (don't await - return immediately)
    batchQueueManager.startProcessing(processor, progressCallback, completeCallback, batchProcessRateLimiter)
      .catch(error => {
        console.error('Batch processing failed:', error);
      });

    return queueId;
  } catch (error) {
    console.error('Failed to start batch:', error);

    if (error instanceof z.ZodError) {
      throw new Error('Invalid request parameters');
    }

    throw sanitizeError(error);
  }
});

ipcMain.handle('batch:cancel', async () => {
  try {
    const result = batchQueueManager.cancel();
    return result;
  } catch (error) {
    console.error('Failed to cancel batch:', error);
    throw sanitizeError(error);
  }
});

ipcMain.handle('batch:get-status', async () => {
  try {
    return batchQueueManager.getStatus();
  } catch (error) {
    console.error('Failed to get batch status:', error);
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
