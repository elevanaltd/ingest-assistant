import * as fs from 'fs/promises';
import * as path from 'path';
import type { FileMetadata } from '../../src/types';
import { SecurityValidator } from './securityValidator';
import { LRUCache } from '../utils/lruCache';
import { MetadataStore } from './metadataStore';

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];
const VIDEO_EXTENSIONS = ['.mp4', '.mov', '.avi', '.mkv', '.webm'];
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB in bytes

export class FileManager {
  private scanCache: LRUCache<string, FileMetadata[]>;

  constructor(private readonly securityValidator: SecurityValidator) {
    // Cache up to 5 folder scans (meets <50ms cached requirement)
    this.scanCache = new LRUCache(5);
  }

  /**
   * Validate file size to prevent DoS attacks from large files
   * @throws SecurityViolationError if file exceeds 100MB
   * @deprecated Use securityValidator.validateFileSize instead
   */
  async validateFileSize(filePath: string): Promise<void> {
    // Delegate to SecurityValidator for consistency
    await this.securityValidator.validateFileSize(filePath, MAX_FILE_SIZE);
  }
  /**
   * Scan a folder and return all media files as FileMetadata
   */
  async scanFolder(folderPath: string): Promise<FileMetadata[]> {
    // Check cache first
    const cached = this.scanCache.get(folderPath);
    if (cached) {
      return cached;
    }

    // Set allowed base path for security validation
    this.securityValidator.setAllowedBasePath(folderPath);

    const entries = await fs.readdir(folderPath, { withFileTypes: true });
    const files: FileMetadata[] = [];

    // Track seen IDs to detect duplicates
    // Map<baseId, count> - first occurrence gets count=1, duplicates get 2, 3, etc.
    const seenIds = new Map<string, number>();

    for (const entry of entries) {
      if (!entry.isFile()) continue;

      const filename = entry.name;

      // Skip macOS resource fork files (._filename) - they're metadata, not actual media
      if (filename.startsWith('._')) continue;

      if (!this.isMediaFile(filename)) continue;

      const filePath = path.join(folderPath, filename);

      // Validate path before processing (prevents path traversal)
      await this.securityValidator.validateFilePath(filePath);

      const stats = await fs.stat(filePath);
      const baseId = this.extractFileId(filename);

      // Handle duplicate IDs by adding counter suffix
      let finalId = baseId;
      if (seenIds.has(baseId)) {
        const count = seenIds.get(baseId)! + 1;
        seenIds.set(baseId, count);
        // Trim whitespace before adding counter (e.g., "Utility " -> "Utility-2")
        finalId = `${baseId.trim()}-${count}`;
      } else {
        seenIds.set(baseId, 1);
      }

      const extension = path.extname(filename);

      // Check if filename already has a main name (format: ID-name.ext)
      // Use baseId (not finalId) for extraction since filename has original ID
      const namePart = filename
        .slice(0, -extension.length) // Remove extension
        .slice(baseId.length); // Remove ID

      const mainName = namePart.startsWith('-') ? namePart.slice(1) : '';

      // Create FileMetadata with audit trail using helper
      const fileMetadata = MetadataStore.createMetadata({
        id: finalId,
        originalFilename: filename,
        currentFilename: filename,
        filePath,
        extension,
        mainName,
        keywords: [],
        fileType: this.getFileType(filename),
        processedByAI: false,
        creationTimestamp: stats.mtime, // Use file modification time for sorting
        cameraId: baseId // Extract camera ID from original filename
      });

      files.push(fileMetadata);
    }

    // Sort files chronologically by creation timestamp (earliest → latest)
    files.sort((a, b) => {
      const timeA = a.creationTimestamp?.getTime() ?? Infinity;
      const timeB = b.creationTimestamp?.getTime() ?? Infinity;

      // Tie-breaker: Use original filename if timestamps identical
      if (timeA === timeB) {
        return a.originalFilename.localeCompare(b.originalFilename);
      }

      return timeA - timeB;
    });

    // Assign sequential shot numbers (1-based, immutable)
    files.forEach((file, index) => {
      file.shotNumber = index + 1;
    });

    // Cache the result
    this.scanCache.set(folderPath, files);

    return files;
  }

  /**
   * Extract first 8 characters (or less if filename is shorter) as file ID
   */
  extractFileId(filename: string): string {
    // Remove extension and extract first 8 chars
    const nameWithoutExt = path.parse(filename).name;
    return nameWithoutExt.substring(0, Math.min(8, nameWithoutExt.length));
  }

  /**
   * Convert string to kebab-case
   */
  toKebabCase(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with dashes
      .replace(/^-+|-+$/g, '') // Remove leading/trailing dashes
      .replace(/-+/g, '-'); // Replace multiple dashes with single dash
  }

  /**
   * Invalidate scan cache for a specific folder path
   * Call this after file system operations that modify folder contents (rename, delete, etc.)
   */
  invalidateCache(folderPath: string): void {
    this.scanCache.delete(folderPath);
  }

  /**
   * Rename a file with the format: {ID}-{kebab-case-name}.{ext}
   */
  async renameFile(
    currentPath: string,
    fileId: string,
    mainName: string
  ): Promise<string> {
    // Validate path before rename operation (prevents path traversal)
    await this.securityValidator.validateFilePath(currentPath);

    const dir = path.dirname(currentPath);
    const extension = path.extname(currentPath);
    const kebabName = this.toKebabCase(mainName);
    const newFilename = `${fileId}-${kebabName}${extension}`;
    const newPath = path.join(dir, newFilename);

    await fs.rename(currentPath, newPath);

    // Invalidate cache after successful rename - prevents stale filename in UI
    this.invalidateCache(dir);

    return newPath;
  }

  /**
   * Check if file is a supported media file (image or video)
   */
  isMediaFile(filename: string): boolean {
    const ext = path.extname(filename).toLowerCase();
    return IMAGE_EXTENSIONS.includes(ext) || VIDEO_EXTENSIONS.includes(ext);
  }

  /**
   * Get file type (image or video)
   */
  getFileType(filename: string): 'image' | 'video' {
    const ext = path.extname(filename).toLowerCase();
    if (IMAGE_EXTENSIONS.includes(ext)) return 'image';
    if (VIDEO_EXTENSIONS.includes(ext)) return 'video';
    return 'image'; // Default fallback
  }

  /**
   * Scan a folder and return a paginated range of files
   */
  async scanFolderRange(
    folderPath: string,
    startIndex: number,
    pageSize: number
  ): Promise<{
    files: import('../../src/types').FileMetadata[];
    totalCount: number;
    startIndex: number;
    pageSize: number;
    hasMore: boolean;
  }> {
    // Get all files first (reuse existing scanFolder logic)
    const allFiles = await this.scanFolder(folderPath);

    // Calculate pagination
    const totalCount = allFiles.length;
    const endIndex = Math.min(startIndex + pageSize, totalCount);
    const files = allFiles.slice(startIndex, endIndex);
    const hasMore = endIndex < totalCount;

    return {
      files,
      totalCount,
      startIndex,
      pageSize,
      hasMore,
    };
  }
}
