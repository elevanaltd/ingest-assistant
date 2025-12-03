// Load environment variables from .env file (must be first!)
import * as dotenv from 'dotenv';
dotenv.config();

import { app, BrowserWindow, ipcMain, dialog, screen } from 'electron';
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
import type { AppConfig, LexiconConfig, ShotType, AIAnalysisResult, FileMetadata } from '../src/types';
import { migrateToKeychain } from './services/keychainMigration';
import { BatchQueueManager } from './services/batchQueueManager';
import { registerCfexTransferHandlers } from './ipc/cfexTransferHandlers';
import { registerProxyGenerationHandlers } from './ipc/proxyGenerationHandlers';
import { registerFileHandlers } from './ipc/fileHandlers';
import { FilenameTemplateParser } from './services/filenameTemplate';
import { reconcileMetadata } from './services/metadataReconciler';
import { isAIFailure } from './utils/aiResultValidation';
import { RateLimiter } from './utils/rateLimiter';
import {
  formatTimestampForTitle,
  getOrExtractCreationTimestamp,
  generateTitleWithTimestamp
} from './utils/timestampUtils';

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
      // Cross-platform fix: Normalize path to handle macOS/Linux mount point differences
      const normalizedPath = normalizeFilePath(fileMetadata, currentFolderPath);
      const validatedPath = await securityValidator.validateFilePath(normalizedPath);
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

      // Issue #128: Validate AI result before marking as processed
      // Detect TRUE FAILURE (confidence=0 + all empty) vs valid low-confidence results (PR #131)
      if (isAIFailure(result)) {
        console.error(`[batch] AI analysis failed for ${fileId}: confidence=0, no structured data`);
        // Don't mark as processed - allows user to see and retry failed files
        continue; // Skip to next file without updating metadata
      }

      // Write ALL AI results regardless of confidence for QC analysis workflow
      // Rationale: User workflow requires all results (high + low confidence) written to .ingest-metadata.json
      // QC person reviews/corrects → separate JSON with corrections → analyze AI accuracy
      // Confidence value is preserved in results map for downstream analysis
      // Append timestamp ONLY if shotNumber is not present (same logic as file:update-structured-metadata)
      // When shotNumber exists, it provides uniqueness (e.g., kitchen-fridge-MID-#1)
      // When shotNumber absent, timestamp provides uniqueness (e.g., kitchen-oven-WS-20251103100530)
      // R1.1 Schema: shotName with #N suffix
      fileMetadata.shotName = fileMetadata.shotNumber !== undefined
        ? `${result.shotName}-#${fileMetadata.shotNumber}` // Add #N suffix when shot number present
        : await generateTitleWithTimestamp(
            result.shotName,
            fileMetadata,
            (filePath): Promise<Date | undefined> => metadataWriter.readCreationTimestamp(filePath)
          ); // Timestamp for legacy folders
      fileMetadata.keywords = result.keywords;
      fileMetadata.location = result.location;
      fileMetadata.subject = result.subject;
      fileMetadata.action = result.action;
      fileMetadata.shotType = result.shotType;
      fileMetadata.processedByAI = true;
      MetadataStore.updateAuditTrail(fileMetadata);
      await store.updateFileMetadata(fileId, fileMetadata);
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

    // Capture in const so TypeScript knows it won't be null in the closure
    const folderPath = currentFolderPath;

    // Add files to queue
    const queueId = await batchQueueManager.addToQueue(validated.fileIds);

    const store = getMetadataStoreForFolder(folderPath);

    // Clear cache before batch processing to ensure fresh reads from disk
    // This prevents stale cached data when processing files currently displayed in UI (Issue #26)
    store.clearCache();

    const lexicon = await configManager.getLexicon();
    const toggles = await configManager.getCfexToggles();

    // Define processor function that will be called for each file
    const processor = async (fileId: string) => {
      try {
        const fileMetadata = await store.getFileMetadata(fileId);
        if (!fileMetadata) {
          return { success: false };
        }

        // Note: Removed processedByAI check to allow reprocessing
        // The "Reprocess" button should reprocess ALL files, including those already processed
        // This is useful when prompt updates require re-analyzing existing files

        // CRITICAL-8: Security validation for each file in batch
        // Cross-platform fix: Normalize path to handle macOS/Linux mount point differences
        const normalizedPath = normalizeFilePath(fileMetadata, folderPath);
        const validatedPath = await securityValidator.validateFilePath(normalizedPath);
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

        // Issue #128: Validate AI result before marking as processed
        // Detect TRUE FAILURE (confidence=0 + all empty) vs valid low-confidence results (PR #131)
        if (isAIFailure(result)) {
          console.error(`[batch] AI analysis failed for ${fileId}: confidence=0, no structured data`);
          // Return failure to allow BatchQueueManager to track failed items
          return { success: false };
        }

        // Write ALL AI results regardless of confidence for QC analysis workflow
        // Rationale: User workflow requires all results (high + low confidence) written to .ingest-metadata.json
        // QC person reviews/corrects → separate JSON with corrections → analyze AI accuracy
        // Confidence value is preserved in results for downstream analysis
        // Append timestamp ONLY if shotNumber is not present (same logic as file:update-structured-metadata)
        // When shotNumber exists, it provides uniqueness (e.g., kitchen-fridge-MID-#1)
        // When shotNumber absent, timestamp provides uniqueness (e.g., kitchen-oven-WS-20251103100530)
        // R1.1 Schema: shotName with #N suffix
        fileMetadata.shotName = fileMetadata.shotNumber !== undefined
          ? `${result.shotName}-#${fileMetadata.shotNumber}` // Add #N suffix when shot number present
          : await generateTitleWithTimestamp(
              result.shotName,
              fileMetadata,
              (filePath): Promise<Date | undefined> => metadataWriter.readCreationTimestamp(filePath)
            ); // Timestamp for legacy folders
        fileMetadata.keywords = result.keywords;
        fileMetadata.location = result.location;
        fileMetadata.subject = result.subject;
        fileMetadata.action = result.action;
        fileMetadata.shotType = result.shotType;
        fileMetadata.processedByAI = true;
        MetadataStore.updateAuditTrail(fileMetadata);
        await store.updateFileMetadata(fileId, fileMetadata);

        // Extract and format timestamp for CEP Panel uniqueness (Issue #31)
        const timestamp = await getOrExtractCreationTimestamp(
          fileMetadata,
          (filePath): Promise<Date | undefined> => metadataWriter.readCreationTimestamp(filePath)
        );
        const _formattedDate = timestamp ? formatTimestampForTitle(timestamp) : undefined;

        // Issue #2: Write metadata to actual file (conditionally based on toggle)
        // Only write to file if metadataWrite toggle enabled (Phase 1c Power Features)
        // Use normalizedPath (not fileMetadata.filePath) for cross-platform compatibility
        if (toggles.metadataWrite) {
          await metadataWriter.writeMetadataToFile(
            normalizedPath,
            fileMetadata.shotName,
            fileMetadata.keywords,
            {
              location: fileMetadata.location,
              subject: fileMetadata.subject,
              action: fileMetadata.action,
              shotType: fileMetadata.shotType,
              shotNumber: fileMetadata.shotNumber,
              cameraId: fileMetadata.cameraId
            }
          );
        }

        // Rename file if filenameRewrite toggle enabled (Phase 1c Power Features)
        if (toggles.filenameRewrite) {
          const parser = new FilenameTemplateParser();
          const extension = path.extname(normalizedPath);
          const newBasename = parser.parse(toggles.filenameTemplate, {
            location: fileMetadata.location,
            subject: fileMetadata.subject,
            action: fileMetadata.action || '',
            shotType: fileMetadata.shotType
          });

          // I3 Compliance: Write TapeName BEFORE rename (preserves original filename)
          // FIX: Use cameraId (immutable) instead of path.basename (changes after rename)
          // Prevents double extension bug (.JPG.JPG) when file already renamed
          const originalBasename = fileMetadata.cameraId || path.basename(normalizedPath, extension);
          await metadataWriter.writeMetadataToFile(
            normalizedPath,
            '', // Don't update shotName, just TapeName
            [],
            {
              cameraId: originalBasename // TapeName = original camera filename (immutable)
            }
          );

          // Rename file
          const newPath = path.join(folderPath, newBasename + extension);
          await fs.rename(normalizedPath, newPath);

          // Update metadata store with new filename
          fileMetadata.currentFilename = newBasename + extension;
          fileMetadata.filePath = newPath;
          await store.updateFileMetadata(fileId, fileMetadata);
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
    const completeCallback = async (summary: import('../src/types').BatchCompleteSummary) => {
      // Reload cache after batch completes to ensure UI has fresh data (Issue #26)
      try {
        console.log('[batch:complete] Reloading metadata cache after batch processing');
        await store.loadMetadata();
      } catch (error) {
        console.error('[batch:complete] Failed to reload metadata cache:', error);
        // Non-blocking - still emit completion event even if reload fails
      }

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
    console.log('[ai:update-config] Received config update:', {
      provider: config.provider,
      model: config.model,
      hasApiKey: !!(config.apiKey && config.apiKey.trim() && config.apiKey !== '***')
    });

    // Only test connection if a new API key is provided
    if (config.apiKey && config.apiKey.trim() && config.apiKey !== '***') {
      console.log('[ai:update-config] Testing connection with new API key...');
      const testResult = await configManager.testAIConnection(config.provider, config.model, config.apiKey);
      if (!testResult.success) {
        console.log('[ai:update-config] Connection test failed:', testResult.error);
        return { success: false, error: testResult.error || 'Connection test failed' };
      }
      console.log('[ai:update-config] Connection test passed');
    } else {
      console.log('[ai:update-config] No new API key provided, skipping connection test');
    }

    // Save configuration (to Keychain + electron-store)
    // If apiKey is empty, configManager will keep existing Keychain key
    console.log('[ai:update-config] Saving config...');
    const saveResult = await configManager.saveAIConfig(config);
    if (!saveResult) {
      console.log('[ai:update-config] Save failed');
      return { success: false, error: 'Failed to save configuration' };
    }
    console.log('[ai:update-config] Config saved successfully');

    // Hot-reload aiService with new configuration
    console.log('[ai:update-config] Reloading AI service...');
    const newConfig = await ConfigManager.getAIConfig();
    console.log('[ai:update-config] Loaded new config:', newConfig ? {
      provider: newConfig.provider,
      model: newConfig.model,
      hasApiKey: !!newConfig.apiKey
    } : null);

    if (newConfig) {
      aiService = new AIService(newConfig.provider, newConfig.model, newConfig.apiKey);
      console.log('[ai:update-config] AI service reloaded with model:', newConfig.model);
    } else {
      aiService = null;
      console.log('[ai:update-config] AI service set to null (no config)');
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
