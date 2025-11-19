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
