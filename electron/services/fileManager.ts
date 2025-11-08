import * as fs from 'fs/promises';
import * as path from 'path';
import type { FileMetadata } from '../../src/types';
import { SecurityValidator } from './securityValidator';

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];
const VIDEO_EXTENSIONS = ['.mp4', '.mov', '.avi', '.mkv', '.webm'];
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB in bytes

export class FileManager {
  constructor(private readonly securityValidator: SecurityValidator) {}

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
    // Set allowed base path for security validation
    this.securityValidator.setAllowedBasePath(folderPath);

    const entries = await fs.readdir(folderPath, { withFileTypes: true });
    const files: FileMetadata[] = [];

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
      const id = this.extractFileId(filename);
      const extension = path.extname(filename);

      // Check if filename already has a main name (format: ID-name.ext)
      const namePart = filename
        .slice(0, -extension.length) // Remove extension
        .slice(id.length); // Remove ID

      const mainName = namePart.startsWith('-') ? namePart.slice(1) : '';

      files.push({
        id,
        originalFilename: filename,
        currentFilename: filename,
        filePath,
        extension,
        mainName,
        metadata: [],
        processedByAI: false,
        lastModified: stats.mtime,
        fileType: this.getFileType(filename),
      });
    }

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
}
