/**
 * File IPC Handlers
 *
 * Exposes file operations to renderer process via IPC bridge.
 *
 * Design Philosophy (MIP Compliance):
 * - ESSENTIAL: IPC handlers expose file operations to UI
 * - ESSENTIAL: Security validation for all file operations
 * - ESSENTIAL: Metadata reconciliation for cross-platform compatibility
 * - DEFERRED: N/A (core feature set complete)
 *
 * Architecture Pattern:
 * - Dependency injection for services (securityValidator, fileManager, etc.)
 * - Module-level state for currentFolderPath (shared across handlers)
 * - Follows existing v2.2.0 IPC pattern
 *
 * System Ripples:
 * - Enables File Window UI to invoke file operations
 * - Security validation prevents path traversal attacks
 * - Metadata reconciliation enables cross-platform workflows (macOS ↔ Ubuntu)
 * - Batch queue clearing on folder change prevents stale file ID errors
 *
 * Reference: Issue #137 - Extract IPC handlers from main.ts
 */

import { ipcMain, dialog, BrowserWindow } from 'electron';
import * as path from 'path';
import * as fs from 'fs/promises';
import { z } from 'zod';
import type { SecurityValidator } from '../services/securityValidator';
import { SecurityViolationError } from '../utils/securityViolationError';
import type { FileManager } from '../services/fileManager';
import type { MetadataWriter } from '../services/metadataWriter';
import { MetadataStore } from '../services/metadataStore';
import type { VideoTranscoder } from '../services/videoTranscoder';
import type { BatchQueueManager } from '../services/batchQueueManager';
import { VideoFrameExtractor } from '../services/videoFrameExtractor';
import { sanitizeError } from '../utils/errorSanitization';
import {
  FileRenameSchema,
  FileUpdateMetadataSchema,
  FileStructuredUpdateSchema,
  FileStructuredUpdateInput
} from '../schemas/ipcSchemas';
import type { ShotType } from '../../src/types';
import { reconcileMetadata } from '../services/metadataReconciler';
import {
  formatTimestampForTitle,
  getOrExtractCreationTimestamp,
  generateTitleWithTimestamp
} from '../utils/timestampUtils';

/**
 * Dependencies required by file handlers
 */
export interface FileHandlerDependencies {
  securityValidator: SecurityValidator;
  fileManager: FileManager;
  metadataWriter: MetadataWriter;
  videoTranscoder: VideoTranscoder;
  batchQueueManager: BatchQueueManager;
  MEDIA_SERVER_PORT: number;
  MEDIA_SERVER_TOKEN: string;
  currentFolderPath: string | null;
  getMetadataStoreForFolder: (folderPath: string) => MetadataStore;
}

// Module-level state
let currentFolderPath: string | null = null;

/**
 * Register file IPC handlers
 * Called from main.ts after app.whenReady()
 */
export function registerFileHandlers(
  mainWindow: BrowserWindow,
  deps: FileHandlerDependencies
): void {
  const {
    securityValidator,
    fileManager,
    metadataWriter,
    videoTranscoder,
    batchQueueManager,
    MEDIA_SERVER_PORT,
    MEDIA_SERVER_TOKEN,
    getMetadataStoreForFolder
  } = deps;

  // Initialize module-level state
  currentFolderPath = deps.currentFolderPath;

  // ============================================================================
  // file:select-folder - Open folder dialog and set security boundary
  // ============================================================================
  ipcMain.handle('file:select-folder', async (_event, startPath?: string) => {
    console.log('[fileHandlers] file:select-folder - Opening folder dialog', { startPath });
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory', 'createDirectory'], // createDirectory enables "New Folder" button on macOS
      ...(startPath && { defaultPath: startPath }), // Open at current path if provided
    });

    console.log('[fileHandlers] Dialog result:', { canceled: result.canceled, filePaths: result.filePaths });

    if (!result.canceled && result.filePaths.length > 0) {
      const folderPath = result.filePaths[0];

      console.log('[fileHandlers] Selected folder path:', folderPath);
      console.log('[fileHandlers] Setting currentFolderPath to:', folderPath);

      // CRITICAL-1 FIX: Store selected folder in main process (trusted source)
      // Only dialog.showOpenDialog() can set the security boundary
      currentFolderPath = folderPath;
      await securityValidator.setAllowedBasePath(folderPath);

      // Issue #24: Clear stale batch queue when folder changes
      // Prevents 99/100 failures from fileIds belonging to previous folder
      batchQueueManager.clearQueue();

      console.log('[fileHandlers] currentFolderPath is now:', currentFolderPath);
      return folderPath;
    }

    return null;
  });

  // ============================================================================
  // file:read-as-data-url - Read file as base64 data URL for display
  // ============================================================================
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

            // Forward transcode progress to renderer
            const onProgress = (time: string, percentage: number) => {
              if (mainWindow) {
                mainWindow.webContents.send('file:transcode-progress', { time, percentage });
              }
            };

            const transcodedPath = await videoTranscoder.transcodeForPreview(validPath, onProgress);
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

  // ============================================================================
  // file:load-files - Load all files in selected folder with metadata
  // ============================================================================
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
        // Stale Metadata Fix: Reconcile filename differences using shared helper
        const { metadata: reconciledMetadata, updated } = reconcileMetadata(existingMetadata, file);
        if (updated) {
          await store.updateFileMetadata(file.id, reconciledMetadata);
        }

        // Bug #1 Fix: Fallback to mainName for legacy pre-R1.1 records, then to empty string if both missing
        file.shotName = existingMetadata.shotName || existingMetadata.mainName || '';
        file.keywords = existingMetadata.keywords;
        file.processedByAI = existingMetadata.processedByAI;
        // Bug #2 Fix: Propagate lockedFields to renderer
        file.lockedFields = existingMetadata.lockedFields || [];
        // Preserve structured naming components
        file.location = existingMetadata.location;
        file.subject = existingMetadata.subject;
        file.action = existingMetadata.action;
        file.shotType = existingMetadata.shotType;
      }
    }

    return files;
  });

  // ============================================================================
  // file:list-range - Paginated file listing (issue #19)
  // ============================================================================
  ipcMain.handle('file:list-range', async (_event, startIndex: number, pageSize: number) => {
    // Validate inputs
    const { FileListRangeSchema } = await import('../schemas/ipcSchemas');
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
        // Stale Metadata Fix: Reconcile filename differences using shared helper
        const { metadata: reconciledMetadata, updated } = reconcileMetadata(existingMetadata, file);
        if (updated) {
          await store.updateFileMetadata(file.id, reconciledMetadata);
        }

        // Bug #1 Fix: Fallback to mainName for legacy pre-R1.1 records, then to empty string if both missing
        file.shotName = existingMetadata.shotName || existingMetadata.mainName || '';
        file.keywords = existingMetadata.keywords;
        file.processedByAI = existingMetadata.processedByAI;
        // Bug #2 Fix: Propagate lockedFields to renderer
        file.lockedFields = existingMetadata.lockedFields || [];
        file.location = existingMetadata.location;
        file.subject = existingMetadata.subject;
        file.shotType = existingMetadata.shotType;
      }
    }

    return result;
  });

  // ============================================================================
  // file:rename - Rename file and update metadata
  // ============================================================================
  ipcMain.handle('file:rename', async (_event, fileId: string, shotName: string, currentPath: string, structured?: { location?: string; subject?: string; action?: string; shotType?: string }) => {
    try {
      console.log('[fileHandlers] file:rename called with:', { fileId, shotName, structured });

      // Security: Validate input schema (prevents type confusion attacks)
      const validated = FileRenameSchema.parse({ fileId, shotName, currentPath, structured });

      // Rename the file using validated data
      const newPath = await fileManager.renameFile(
        validated.currentPath,
        validated.fileId,
        validated.shotName
      );

      const folderPath = path.dirname(newPath);
      const store = getMetadataStoreForFolder(folderPath);

      // Get or create metadata
      let fileMetadata = await store.getFileMetadata(fileId);
      if (!fileMetadata) {
        // Create new metadata entry
        fileMetadata = {
          id: fileId,
          originalFilename: path.basename(currentPath),
          currentFilename: path.basename(newPath),
          filePath: newPath,
          extension: path.extname(newPath),
          shotName: shotName,
          keywords: [],
          processedByAI: false,
          fileType: fileManager.getFileType(path.basename(newPath)),
          // Audit trail (v2.0)
          createdAt: new Date(),
          createdBy: 'ingest-assistant',
          modifiedAt: new Date(),
          modifiedBy: 'ingest-assistant',
          version: '2.0',
          // Store structured components if provided
          location: structured?.location || '',
          subject: structured?.subject || '',
          action: structured?.action || '',
          shotType: (structured?.shotType as ShotType) || '',
          lockedFields: [],
        };
      } else {
        // Update existing metadata
        fileMetadata.shotName = shotName;
        fileMetadata.currentFilename = path.basename(newPath);
        fileMetadata.filePath = newPath;
        // Update structured components if provided (allow clearing action with empty string)
        if (structured && 'location' in structured) fileMetadata.location = structured.location || '';
        if (structured && 'subject' in structured) fileMetadata.subject = structured.subject || '';
        if (structured && 'action' in structured) fileMetadata.action = structured.action || '';
        if (structured && 'shotType' in structured) fileMetadata.shotType = (structured.shotType as ShotType) || '';
      }

      console.log('[fileHandlers] Saving fileMetadata to store:', JSON.stringify({
        id: fileMetadata!.id,
        shotName: fileMetadata!.shotName,
        location: fileMetadata!.location,
        subject: fileMetadata!.subject,
        shotType: fileMetadata!.shotType
      }));

      await store.updateFileMetadata(fileId, fileMetadata!);

      // Extract and format timestamp for CEP Panel uniqueness (Issue #31)
      const timestamp = await getOrExtractCreationTimestamp(
        fileMetadata!,
        (filePath): Promise<Date | undefined> => metadataWriter.readCreationTimestamp(filePath)
      );
      const _formattedDate = timestamp ? formatTimestampForTitle(timestamp) : undefined;

      // Write metadata to the file
      await metadataWriter.writeMetadataToFile(
        newPath,
        fileMetadata!.shotName,
        fileMetadata!.keywords,
        {
          location: fileMetadata!.location,
          subject: fileMetadata!.subject,
          action: fileMetadata!.action,
          shotType: fileMetadata!.shotType,
          shotNumber: fileMetadata!.shotNumber,
          cameraId: fileMetadata!.cameraId
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

  // ============================================================================
  // file:update-metadata - Update file metadata (keywords)
  // ============================================================================
  ipcMain.handle('file:update-metadata', async (_event, fileId: string, metadata: string[]) => {
    try {
      console.log('[fileHandlers] file:update-metadata called with fileId:', fileId, 'metadata:', metadata);

      // Security: Validate input schema
      const validated = FileUpdateMetadataSchema.parse({ fileId, keywords: metadata });

      if (!currentFolderPath) {
        throw new Error('No folder selected');
      }

      const store = getMetadataStoreForFolder(currentFolderPath);

      // Re-fetch metadata to get latest shotName (in case updateStructuredMetadata was called first)
      const fileMetadata = await store.getFileMetadata(validated.fileId);
      if (!fileMetadata) {
        throw new Error(`File metadata not found for ID: ${validated.fileId}`);
      }

      console.log('[fileHandlers] Updating file metadata - current shotName:', fileMetadata.shotName);
      console.log('[fileHandlers] Stored filePath:', fileMetadata.filePath);
      console.log('[fileHandlers] Original filename:', fileMetadata.originalFilename);
      console.log('[fileHandlers] Current filename:', fileMetadata.currentFilename);

      fileMetadata.keywords = validated.keywords;
      MetadataStore.updateAuditTrail(fileMetadata);
      await store.updateFileMetadata(validated.fileId, fileMetadata);

      // BUG FIX: Use path based on what file actually exists on disk
      // The stored filePath might reflect a conceptual rename that never happened
      // For now, use originalFilename which is based on camera ID (never changes)
      const actualFilePath = path.join(currentFolderPath, fileMetadata.originalFilename);
      console.log('[fileHandlers] Actual file path to write:', actualFilePath);

      // Extract and format timestamp for CEP Panel uniqueness (Issue #31)
      const timestamp = await getOrExtractCreationTimestamp(
        fileMetadata,
        (filePath): Promise<Date | undefined> => metadataWriter.readCreationTimestamp(filePath)
      );
      const _formattedDate = timestamp ? formatTimestampForTitle(timestamp) : undefined;

      // Write metadata INTO the actual file using exiftool
      // Use the current shotName from fileMetadata (which may have been updated by updateStructuredMetadata)
      console.log('[fileHandlers] Writing to XMP - title:', fileMetadata.shotName, 'keywords:', validated.keywords);
      await metadataWriter.writeMetadataToFile(
        actualFilePath,
        fileMetadata.shotName,
        validated.keywords,
        {
          location: fileMetadata.location,
          subject: fileMetadata.subject,
          action: fileMetadata.action,
          shotType: fileMetadata.shotType,
          shotNumber: fileMetadata.shotNumber,
          cameraId: fileMetadata.cameraId
        }
      );

      console.log('[fileHandlers] file:update-metadata - Successfully wrote XMP with title:', fileMetadata.shotName, 'and keywords:', validated.keywords);

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

  // ============================================================================
  // file:update-structured-metadata - Update structured naming components
  // ============================================================================
  ipcMain.handle('file:update-structured-metadata', async (_event, fileId: string, structured: { location: string; subject: string; action?: string; shotType: string }, filePath?: string, fileType?: 'image' | 'video') => {
    try {
      console.log('[fileHandlers] file:update-structured-metadata called with:', { fileId, structured, filePath, fileType });

      // Security: Validate input schema (prevents oversized payloads and injection)
      const validated = FileStructuredUpdateSchema.parse({ fileId, structured });

      if (!currentFolderPath) {
        throw new Error('No folder selected');
      }

      const store = getMetadataStoreForFolder(currentFolderPath);
      let fileMetadata = await store.getFileMetadata(fileId);

      // If metadata doesn't exist yet, create it (for new files)
      if (!fileMetadata) {
        console.log('[fileHandlers] Creating new metadata entry for file ID:', fileId);

        if (!filePath) {
          throw new Error(`File metadata not found and filePath not provided for ID: ${fileId}`);
        }

        fileMetadata = {
          id: fileId,
          originalFilename: path.basename(filePath),
          currentFilename: path.basename(filePath),
          filePath: filePath,
          extension: path.extname(filePath),
          shotName: '',
          keywords: [],
          processedByAI: false,
          fileType: fileType || 'image',
          // Audit trail (v2.0)
          createdAt: new Date(),
          createdBy: 'ingest-assistant',
          modifiedAt: new Date(),
          modifiedBy: 'ingest-assistant',
          version: '2.0',
          // Structured components (required in v2.0)
          location: '',
          subject: '',
          action: '',
          shotType: '',
          lockedFields: [],
        };
      }

      // TypeScript narrowing: fileMetadata is guaranteed non-null after the if block above
      if (!fileMetadata) {
        throw new Error('Unexpected: fileMetadata is null after creation attempt');
      }

      // Update structured components (allow clearing action with empty string)
      const validatedStructured = validated.structured as FileStructuredUpdateInput['structured'];
      fileMetadata.location = validatedStructured.location || '';
      fileMetadata.subject = validatedStructured.subject || '';
      fileMetadata.action = validatedStructured.action || '';
      fileMetadata.shotType = (validatedStructured.shotType as ShotType) || '';

      // Build generated title from structured components
      const baseTitle = fileMetadata.fileType === 'video' && structured.action
        ? `${structured.location}-${structured.subject}-${structured.action}-${structured.shotType}`
        : `${structured.location}-${structured.subject}-${structured.shotType}`;

      // Append timestamp to title for uniqueness ONLY if shotNumber is not present
      // When shotNumber exists, it provides uniqueness (e.g., lounge-media-plate-MID-#1)
      // When shotNumber absent, timestamp provides uniqueness (e.g., kitchen-oven-WS-20251103100530)
      let generatedShotName: string;
      if (fileMetadata.shotNumber !== undefined) {
        // R1.1 Schema: shotName includes #N suffix when shotNumber exists
        generatedShotName = `${baseTitle}-#${fileMetadata.shotNumber}`;
      } else {
        // Legacy folders without shot numbers use timestamp for uniqueness
        generatedShotName = await generateTitleWithTimestamp(
          baseTitle,
          fileMetadata,
          (filePath): Promise<Date | undefined> => metadataWriter.readCreationTimestamp(filePath)
        );
      }

      // Update shotName to match generated title (R1.1 schema alignment)
      fileMetadata.shotName = generatedShotName;

      console.log('[fileHandlers] Updating structured metadata in store:', {
        location: fileMetadata!.location,
        subject: fileMetadata!.subject,
        action: fileMetadata!.action,
        shotType: fileMetadata!.shotType,
        generatedShotName
      });

      // Save to JSON store
      await store.updateFileMetadata(fileId, fileMetadata!);

      // NOTE: We do NOT write to file here - let updateMetadata handle the file write
      // This prevents duplicate writes and ensures metadata tags are included

      return true;
    } catch (error) {
      console.error('Failed to update structured metadata:', error);
      throw sanitizeError(error);
    }
  });
}
