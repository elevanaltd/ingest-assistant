/**
 * Batch IPC Handlers
 *
 * Handles batch processing operations:
 * - batch:start - Start batch AI processing
 * - batch:cancel - Cancel ongoing batch
 * - batch:get-status - Get current batch status
 *
 * CRITICAL: Uses getAiService() from aiHandlers.ts for single source of truth
 * (prevents stale aiService after ai:update-config)
 */

import { ipcMain, type BrowserWindow } from 'electron';
import * as path from 'path';
import * as fs from 'fs/promises';
import { z } from 'zod';
import type { SecurityValidator } from '../services/securityValidator';
import type { FileManager } from '../services/fileManager';
import type { MetadataWriter } from '../services/metadataWriter';
import type { ConfigManager } from '../services/configManager';
import type { BatchQueueManager } from '../services/batchQueueManager';
import type { RateLimiter } from '../utils/rateLimiter';
import type { MetadataStore } from '../services/metadataStore';
import { BatchStartSchema } from '../schemas/ipcSchemas';
import { sanitizeError } from '../utils/errorSanitization';
import type { AIAnalysisResult, FileMetadata } from '../../src/types';
import { getAiService } from './aiHandlers';
import { MetadataStore as MetadataStoreClass } from '../services/metadataStore';
import { FilenameTemplateParser } from '../services/filenameTemplate';
import { isAIFailure } from '../utils/aiResultValidation';
import {
  formatTimestampForTitle,
  getOrExtractCreationTimestamp,
  generateTitleWithTimestamp
} from '../utils/timestampUtils';

interface BatchHandlerDependencies {
  batchQueueManager: BatchQueueManager;
  batchProcessRateLimiter: RateLimiter;
  securityValidator: SecurityValidator;
  fileManager: FileManager;
  metadataWriter: MetadataWriter;
  configManager: ConfigManager;
  getCurrentFolderPath: () => string | null;
  getMetadataStoreForFolder: (path: string) => MetadataStore;
  normalizeFilePath: (metadata: FileMetadata, basePath: string) => string;
}

export function registerBatchHandlers(
  getMainWindow: () => BrowserWindow | null,
  dependencies: BatchHandlerDependencies
): void {
  const {
    batchQueueManager,
    batchProcessRateLimiter,
    securityValidator,
    fileManager,
    metadataWriter,
    configManager,
    getCurrentFolderPath,
    getMetadataStoreForFolder,
    normalizeFilePath
  } = dependencies;

  // Batch operations (Issue #24)
  ipcMain.removeHandler('batch:start');
  ipcMain.handle('batch:start', async (_event, fileIds: string[]) => {
    try {
      // Security: Validate input schema
      const validated = BatchStartSchema.parse({ fileIds });

      // Note: Rate limiting is applied per-file during processing (not upfront)
      // This allows the rate limiter to properly pace the batch

      // CRITICAL FIX: Use getAiService() for single source of truth
      // Previously used local aiService variable which became stale after ai:update-config
      const currentAiService = getAiService();
      if (!currentAiService) {
        throw new Error('AI service not configured.');
      }

      const currentFolderPath = getCurrentFolderPath();
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
            result = await currentAiService.analyzeVideo(validatedPath, lexicon);
          } else {
            await securityValidator.validateFileSize(validatedPath, 100 * 1024 * 1024);
            console.log('[IPC] Batch analyzing image file:', validatedPath);
            result = await currentAiService.analyzeImage(validatedPath, lexicon);
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
          MetadataStoreClass.updateAuditTrail(fileMetadata);
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
      // CRITICAL FIX: Use dynamic window lookup to prevent stale reference crashes (darwin behavior)
      // When window closes on macOS, app stays alive but webContents is destroyed
      const progressCallback = (progress: import('../../src/types').BatchProgress) => {
        const win = getMainWindow();
        if (win && !win.isDestroyed()) {
          win.webContents.send('batch:progress', progress);
        }
      };

      // Define complete callback that emits completion event
      const completeCallback = async (summary: import('../../src/types').BatchCompleteSummary) => {
        // Reload cache after batch completes to ensure UI has fresh data (Issue #26)
        try {
          console.log('[batch:complete] Reloading metadata cache after batch processing');
          await store.loadMetadata();
        } catch (error) {
          console.error('[batch:complete] Failed to reload metadata cache:', error);
          // Non-blocking - still emit completion event even if reload fails
        }

        // CRITICAL FIX: Use dynamic window lookup to prevent stale reference crashes (darwin behavior)
        const win = getMainWindow();
        if (win && !win.isDestroyed()) {
          win.webContents.send('batch:complete', summary);
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

  ipcMain.removeHandler('batch:cancel');
  ipcMain.handle('batch:cancel', async () => {
    try {
      const result = batchQueueManager.cancel();
      return result;
    } catch (error) {
      console.error('Failed to cancel batch:', error);
      throw sanitizeError(error);
    }
  });

  ipcMain.removeHandler('batch:get-status');
  ipcMain.handle('batch:get-status', async () => {
    try {
      return batchQueueManager.getStatus();
    } catch (error) {
      console.error('Failed to get batch status:', error);
      throw sanitizeError(error);
    }
  });
}
