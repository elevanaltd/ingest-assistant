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
import * as path from 'path';

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
