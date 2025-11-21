/**
 * CFEx Transfer Service
 *
 * Orchestrates file transfer from CFEx card to dual destinations:
 * - Photos (.jpg, .jpeg) → LucidLink
 * - Raw videos (.mov, .mp4) → Ubuntu
 *
 * Design Philosophy (MIP Compliance):
 * - ESSENTIAL: Dual routing for production workflow (photos vs raw videos)
 * - ESSENTIAL: File enumeration from CFEx card structure
 * - DEFERRED: Streaming progress (Week 1 Days 1-3 scope)
 * - DEFERRED: Integrity validation (Week 1 Days 3.5-5.5 scope)
 * - DEFERRED: Error handling and retry logic (Week 2 scope)
 *
 * System Ripples:
 * - Dual routing → Production workflow coherence (proxies in LucidLink, raw in Ubuntu)
 * - File size tracking → Progress estimation for streaming transfer
 * - Extension detection → Media type classification for AI cataloging
 *
 * Reference: D3 Blueprint 003-CFEX-D3-BLUEPRINT.md lines 226-251
 */

import * as fs from 'fs/promises';
import { createReadStream, createWriteStream } from 'node:fs';
import * as path from 'path';
import { pipeline } from 'node:stream/promises';
import { SecurityValidator } from './securityValidator';

/**
 * File transfer task containing source, destination, and metadata
 */
export interface FileTransferTask {
  source: string;
  destination: string;
  size: number;
  mediaType: 'photo' | 'video';
  enqueued: number; // Timestamp when task was created
}

/**
 * Destination paths for dual routing
 */
export interface TransferDestinations {
  photos: string;       // LucidLink path for photos
  rawVideos: string;    // Ubuntu path for raw videos
}

/**
 * Progress tracking for file transfer operations
 *
 * Emitted during streaming transfer to update UI with real-time progress.
 * Per D3 Blueprint lines 273-284.
 */
export interface TransferProgress {
  currentFile: string;           // Filename being transferred (e.g., 'EA001621.JPG')
  fileIndex: number;             // Current file number (1-based)
  filesTotal: number;            // Total files to transfer
  currentFileBytes: number;      // Bytes transferred for current file
  currentFileSize: number;       // Total bytes for current file
  totalBytesTransferred: number; // Cumulative bytes transferred (all files)
  totalBytesExpected: number;    // Total bytes to transfer (all files)
  percentComplete: number;       // Overall completion percentage (0-100)
  estimatedTimeRemaining: number | null; // ETA in milliseconds (null if unknown)
}

/**
 * Media type classification by file extension
 */
const PHOTO_EXTENSIONS = ['.jpg', '.jpeg'];
const VIDEO_EXTENSIONS = ['.mov', '.mp4'];

/**
 * Get media type from file extension
 *
 * @param extension - File extension (e.g., '.jpg', '.mov')
 * @returns Media type ('photo' | 'video') or null if not supported
 */
function getMediaType(extension: string): 'photo' | 'video' | null {
  const ext = extension.toLowerCase();

  if (PHOTO_EXTENSIONS.includes(ext)) {
    return 'photo';
  }

  if (VIDEO_EXTENSIONS.includes(ext)) {
    return 'video';
  }

  return null; // Ignore non-media files
}

/**
 * Get destination path based on media type
 *
 * @param fileName - Name of the file (e.g., 'EA001621.JPG')
 * @param mediaType - Type of media ('photo' | 'video')
 * @param destinations - Destination paths configuration
 * @returns Full destination path
 */
function getDestinationPath(
  fileName: string,
  mediaType: 'photo' | 'video',
  destinations: TransferDestinations
): string {
  const basePath = mediaType === 'photo' ? destinations.photos : destinations.rawVideos;
  return path.join(basePath, fileName);
}

/**
 * Scan source directory for media files and create transfer tasks
 *
 * Enumerates files from CFEx card structure:
 * - Photos: /DCIM/*.jpg
 * - Videos: /PRIVATE/M4ROOT/CLIP/*.mov
 *
 * Routes files to appropriate destinations:
 * - Photos → LucidLink (for AI cataloging)
 * - Raw videos → Ubuntu (archival)
 *
 * @param sourcePath - Path to CFEx card root (e.g., '/Volumes/NO NAME/')
 * @param destinations - Destination paths for photos and videos
 * @returns Array of transfer tasks
 *
 * @example
 * ```typescript
 * const tasks = await scanSourceFiles('/Volumes/NO NAME/', {
 *   photos: '/LucidLink/EAV014/images/shoot1/',
 *   rawVideos: '/Ubuntu/EAV014/videos-raw/shoot1/'
 * });
 * // Returns: [
 * //   { source: '/Volumes/NO NAME/DCIM/EA001621.JPG', destination: '/LucidLink/.../EA001621.JPG', ... },
 * //   { source: '/Volumes/NO NAME/PRIVATE/M4ROOT/CLIP/C0001.MOV', destination: '/Ubuntu/.../C0001.MOV', ... }
 * // ]
 * ```
 */
export async function scanSourceFiles(
  sourcePath: string,
  destinations: TransferDestinations
): Promise<FileTransferTask[]> {
  const files = await fs.readdir(sourcePath, { recursive: true });
  const tasks: FileTransferTask[] = [];

  for (const file of files) {
    const fullPath = path.join(sourcePath, file);
    let stat;

    try {
      stat = await fs.stat(fullPath);
    } catch (error) {
      // Skip files that can't be stat'd (e.g., broken symlinks)
      continue;
    }

    // Skip directories
    if (!stat.isFile()) {
      continue;
    }

    const ext = path.extname(file);
    const mediaType = getMediaType(ext);

    // Skip non-media files
    if (!mediaType) {
      continue;
    }

    // Create transfer task
    tasks.push({
      source: fullPath,
      destination: getDestinationPath(path.basename(file), mediaType, destinations),
      size: stat.size,
      mediaType,
      enqueued: Date.now(),
    });
  }

  return tasks;
}

/**
 * Transfer result containing success status, bytes transferred, and metadata
 */
export interface FileTransferResult {
  success: boolean;
  bytesTransferred: number;
  duration: number;
  warnings: string[];
}

/**
 * Transfer single file from source to destination with streaming
 *
 * Features:
 * - 64KB chunk streaming (per D3 Blueprint L265)
 * - Real-time progress tracking (100ms throttle)
 * - Security validation via securityValidator
 * - Automatic destination directory creation
 * - Error propagation
 *
 * @param task - Transfer task with source, destination, size, mediaType
 * @param onProgress - Optional progress callback (throttled to 100ms)
 * @returns Transfer result with success status and bytes transferred
 *
 * @throws SecurityViolationError if path traversal detected
 * @throws Error if file not found or transfer fails
 *
 * @example
 * ```typescript
 * const result = await transferFile(
 *   {
 *     source: '/Volumes/NO NAME/DCIM/EA001621.JPG',
 *     destination: '/LucidLink/EAV014/images/EA001621.JPG',
 *     size: 1024 * 1024,
 *     mediaType: 'photo',
 *     enqueued: Date.now()
 *   },
 *   (progress) => console.log(`${progress.percentComplete}% complete`)
 * );
 * ```
 *
 * Reference: D3 Blueprint lines 253-309
 */
export async function transferFile(
  task: FileTransferTask,
  onProgress?: (progress: TransferProgress) => void
): Promise<FileTransferResult> {
  const startTime = Date.now();
  const securityValidator = new SecurityValidator();

  // SECURITY: Validate paths before any file I/O (prevents path traversal)
  // Note: securityValidator requires allowedBasePath to be set
  // For now, allow any path (will be constrained in startTransfer orchestration)
  securityValidator.setAllowedBasePath('/');
  await securityValidator.validateFilePath(task.source);
  await securityValidator.validateFilePath(task.destination);

  // Ensure destination directory exists
  await fs.mkdir(path.dirname(task.destination), { recursive: true });

  // Stream with 64KB chunks (per D3 Blueprint L265)
  const readStream = createReadStream(task.source, {
    highWaterMark: 64 * 1024, // 64KB chunks
  });
  const writeStream = createWriteStream(task.destination);

  let bytesTransferred = 0;
  const transferStartTime = Date.now();

  // Progress tracking (throttled to 100ms intervals to prevent UI flooding)
  let lastProgressUpdate = 0;
  const PROGRESS_THROTTLE_MS = 100;

  readStream.on('data', (chunk: string | Buffer) => {
    const chunkLength = typeof chunk === 'string' ? Buffer.byteLength(chunk) : chunk.length;
    bytesTransferred += chunkLength;

    // Throttle progress updates to 100ms intervals
    const now = Date.now();
    if (onProgress && now - lastProgressUpdate >= PROGRESS_THROTTLE_MS) {
      onProgress({
        currentFile: path.basename(task.source),
        fileIndex: 0, // Will be provided by startTransfer() orchestrator
        filesTotal: 0, // Will be provided by startTransfer() orchestrator
        currentFileBytes: bytesTransferred,
        currentFileSize: task.size,
        totalBytesTransferred: bytesTransferred, // Single file context
        totalBytesExpected: task.size, // Single file context
        percentComplete: (bytesTransferred / task.size) * 100,
        estimatedTimeRemaining: calculateETA(
          bytesTransferred,
          task.size,
          Date.now() - transferStartTime
        ),
      });
      lastProgressUpdate = now;
    }
  });

  // Transfer with error handling
  try {
    await pipeline(readStream, writeStream);
  } catch (error) {
    // Clean up partial file on error (per D3 Blueprint L291-296)
    try {
      await fs.unlink(task.destination);
    } catch (unlinkError) {
      // Ignore unlink errors (file may not exist)
    }

    throw error;
  }

  return {
    success: true,
    bytesTransferred,
    duration: Date.now() - startTime,
    warnings: [],
  };
}

/**
 * Calculate estimated time remaining based on transfer rate
 *
 * @param bytesTransferred - Bytes transferred so far
 * @param totalBytes - Total bytes to transfer
 * @param elapsedMs - Elapsed time in milliseconds
 * @returns Estimated time remaining in milliseconds (null if unknown)
 */
function calculateETA(
  bytesTransferred: number,
  totalBytes: number,
  elapsedMs: number
): number | null {
  if (bytesTransferred === 0) return null;

  const bytesPerMs = bytesTransferred / elapsedMs;
  const remainingBytes = totalBytes - bytesTransferred;
  const estimatedRemainingMs = remainingBytes / bytesPerMs;

  return Math.round(estimatedRemainingMs);
}

// ============================================================================
// ORCHESTRATION LAYER - STARTRANSFER
// ============================================================================

import { IntegrityValidator, FileValidationResult, IntegrityError } from './integrityValidator';

/**
 * Transfer configuration for orchestration layer
 */
export interface TransferConfig {
  source: string;
  destinations: TransferDestinations;
  onProgress?: (progress: TransferProgress) => void;
  onFileComplete?: (result: FileTransferResult) => void;
  onValidation?: (result: FileValidationResult) => void;
  onError?: (error: TransferError) => void;
}

/**
 * Overall transfer result with validation warnings and error aggregation
 */
export interface TransferResult {
  success: boolean;
  filesTransferred: number;
  filesTotal: number;
  bytesTransferred: number;
  duration: number;
  validationWarnings: ValidationWarning[];
  errors: TransferError[];
}

/**
 * Validation warning structure
 */
export interface ValidationWarning {
  file: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
}

/**
 * Transfer error structure
 */
export interface TransferError {
  file: string;
  error: Error;
  phase: 'scan' | 'transfer' | 'validation';
}

/**
 * Enhanced file transfer result with EXIF timestamp validation
 */
export interface FileTransferResultEnhanced extends FileTransferResult {
  exifTimestamp: Date | null;
  exifSource: 'EXIF' | 'FILESYSTEM' | null;
}

/**
 * CFEx Transfer Service - Orchestration Layer
 *
 * Integrates scanSourceFiles → transferFile → validateFile into complete pipeline.
 *
 * RESPONSIBILITIES:
 * 1. Scan source files and create transfer tasks
 * 2. Transfer files with streaming progress tracking
 * 3. Validate files post-transfer (size match + EXIF extraction)
 * 4. Aggregate progress across all files
 * 5. Collect validation warnings and transfer errors
 * 6. Continue on individual file failures (error resilience)
 *
 * SYSTEM INTEGRATION:
 * - scanSourceFiles() → FileTransferTask[] (dual routing)
 * - transferFile() → streaming I/O with progress
 * - IntegrityValidator.validateFile() → post-transfer verification
 *
 * Reference: D3 Blueprint lines 137-195
 */
export class CfexTransferService {
  private integrityValidator: IntegrityValidator;

  constructor() {
    this.integrityValidator = new IntegrityValidator();
  }

  /**
   * Start complete transfer workflow: scan → transfer → validate
   *
   * PHASES:
   * 1. SCAN: Enumerate files from CFEx card structure
   * 2. TRANSFER: Stream files to dual destinations (photos/videos)
   * 3. VALIDATE: Verify size match + extract EXIF timestamps
   * 4. AGGREGATE: Collect warnings and errors
   *
   * ERROR RESILIENCE:
   * - Individual file failures don't cascade to pipeline abort
   * - Errors collected in TransferResult.errors array
   * - Success flag = true only if ALL files transferred successfully
   *
   * @param config - Transfer configuration with source, destinations, callbacks
   * @returns TransferResult with success status, counts, warnings, errors
   */
  async startTransfer(config: TransferConfig): Promise<TransferResult> {
    const startTime = Date.now();

    // PHASE 1: Scan source files
    const tasks = await scanSourceFiles(config.source, config.destinations);

    const bytesTotal = tasks.reduce((sum, task) => sum + task.size, 0);

    // PHASE 2: Transfer + Validate files
    const errors: TransferError[] = [];
    const warnings: ValidationWarning[] = [];
    let filesTransferred = 0;
    let bytesTransferred = 0;

    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];

      try {
        // Transfer with progress tracking
        const fileResult = await transferFile(task, (fileProgress) => {
          if (config.onProgress) {
            config.onProgress({
              currentFile: path.basename(task.source),
              fileIndex: i + 1,
              filesTotal: tasks.length,
              currentFileBytes: fileProgress.currentFileBytes,
              currentFileSize: task.size,
              totalBytesTransferred: bytesTransferred + fileProgress.currentFileBytes,
              totalBytesExpected: bytesTotal,
              percentComplete: ((bytesTransferred + fileProgress.currentFileBytes) / bytesTotal) * 100,
              estimatedTimeRemaining: this.calculateOverallETA(
                bytesTransferred + fileProgress.currentFileBytes,
                bytesTotal,
                Date.now() - startTime
              ),
            });
          }
        });

        // Post-transfer validation (I1 immutable compliance)
        const validation = await this.integrityValidator.validateFile(
          task.source,
          task.destination
        );

        // Collect validation warnings
        if (validation.warnings.length > 0) {
          validation.warnings.forEach((warning) => {
            warnings.push({
              file: path.basename(task.source),
              message: warning,
              severity: warning.includes('fallback') ? 'medium' : 'low',
            });
          });
        }

        // Notify validation complete
        if (config.onValidation) {
          config.onValidation(validation);
        }

        // Update state
        filesTransferred++;
        bytesTransferred += fileResult.bytesTransferred;

        // Notify file completion
        if (config.onFileComplete) {
          const enhancedResult: FileTransferResultEnhanced = {
            ...fileResult,
            exifTimestamp: validation.timestamp,
            exifSource: validation.timestampSource,
          };
          config.onFileComplete(enhancedResult);
        }
      } catch (error) {
        // Capture error but continue with remaining files
        const transferError: TransferError = {
          file: task.source,
          error: error as Error,
          phase: error instanceof IntegrityError ? 'validation' : 'transfer',
        };
        errors.push(transferError);

        if (config.onError) {
          config.onError(transferError);
        }
      }
    }

    return {
      success: errors.length === 0,
      filesTransferred,
      filesTotal: tasks.length,
      bytesTransferred,
      duration: Date.now() - startTime,
      validationWarnings: warnings,
      errors,
    };
  }

  /**
   * Calculate overall ETA based on cumulative transfer rate
   *
   * @param bytesTransferred - Total bytes transferred across all files
   * @param totalBytes - Total bytes to transfer across all files
   * @param elapsedMs - Elapsed time since transfer start
   * @returns Estimated time remaining in milliseconds (null if unknown)
   */
  private calculateOverallETA(
    bytesTransferred: number,
    totalBytes: number,
    elapsedMs: number
  ): number | null {
    return calculateETA(bytesTransferred, totalBytes, elapsedMs);
  }
}

// ============================================================================
// ERROR HANDLING INTEGRATION - transferFileWithRetry
// ============================================================================

import { RetryStrategy } from './retryStrategy';
import { ErrorHandler, ErrorClassification } from './errorHandler';
import * as fs from 'fs';

/**
 * Retry options for transferFileWithRetry
 */
export interface TransferRetryOptions {
  onRetry?: (attempt: number, delayMs: number) => void;
  cfexCardPath?: string;
  checkCardRemoval?: () => boolean;
}

/**
 * Enhanced transfer result with retry metadata and error classification
 */
export interface FileTransferResultWithRetry extends FileTransferResult {
  attempts: number;
  error?: Error & { code?: string };
  errorClassification?: ErrorClassification;
  cardRemoved?: boolean;
}

/**
 * Transfer file with automatic retry on transient/network errors
 *
 * Features:
 * - Automatic retry with exponential backoff (1s, 2s, 4s... for transient)
 * - Extended retry for network paths (5 attempts vs 3 for local)
 * - Fatal error detection (no retry for ENOSPC, EACCES, EROFS)
 * - Card removal detection (abort on CFEx card removal)
 * - Error classification (user-friendly messages and recovery actions)
 *
 * @param task - Transfer task with source, destination, size, mediaType
 * @param mockTransferFile - Optional mock for testing (defaults to transferFile)
 * @param options - Retry options (onRetry callback, card removal detection)
 * @returns FileTransferResultWithRetry with success, attempts, error classification
 *
 * @example
 * ```typescript
 * const result = await transferFileWithRetry(task, undefined, {
 *   onRetry: (attempt, delay) => console.log(`Retry ${attempt} after ${delay}ms`),
 *   cfexCardPath: '/Volumes/NO NAME',
 *   checkCardRemoval: () => fs.existsSync('/Volumes/NO NAME')
 * });
 * ```
 *
 * Reference: D3 Blueprint lines 859-1044
 */
export async function transferFileWithRetry(
  task: FileTransferTask,
  mockTransferFile?: (task: FileTransferTask) => Promise<FileTransferResult>,
  options?: TransferRetryOptions
): Promise<FileTransferResultWithRetry> {
  const retryStrategy = new RetryStrategy();
  const errorHandler = new ErrorHandler();

  // Use provided mock or real transferFile
  const transferFn = mockTransferFile || ((t: FileTransferTask) => transferFile(t));

  // Execute with retry
  const result = await retryStrategy.executeWithRetry(
    () => transferFn(task),
    {
      destinationPath: task.destination,
      sourcePath: task.source,
      cfexCardPath: options?.cfexCardPath,
      checkCardRemoval: options?.checkCardRemoval,
      onRetry: options?.onRetry,
    }
  );

  // Build enhanced result
  if (result.success && result.value) {
    return {
      ...result.value,
      attempts: result.attempts,
    };
  }

  // Failed with error
  const errorClassification = result.error
    ? errorHandler.classify(result.error)
    : undefined;

  return {
    success: false,
    bytesTransferred: 0,
    duration: 0,
    warnings: [],
    attempts: result.attempts,
    error: result.error,
    errorClassification,
    cardRemoved: result.cardRemoved,
  };
}
