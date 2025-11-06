import * as fs from 'fs/promises';
import * as path from 'path';
import { SecurityViolationError } from '../utils/securityViolationError';

// File magic bytes signatures
const FILE_SIGNATURES: Record<string, number[]> = {
  jpg: [0xFF, 0xD8, 0xFF],
  jpeg: [0xFF, 0xD8, 0xFF],
  png: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A],
  gif: [0x47, 0x49, 0x46, 0x38],
  webp: [0x52, 0x49, 0x46, 0x46], // "RIFF" (need to check bytes 8-11 for "WEBP")
  mp4: [0x00, 0x00, 0x00], // ftyp box (check bytes 4-7)
  mov: [0x00, 0x00, 0x00], // Same as mp4
  avi: [0x52, 0x49, 0x46, 0x46], // "RIFF"
  webm: [0x1A, 0x45, 0xDF, 0xA3], // EBML header
};

/**
 * Security validation service implementing defense-in-depth strategy.
 *
 * Architecture: Dependency injection pattern for testability.
 * Authority: Throws SecurityViolationError for audit trail.
 *
 * Critical-engineer: consulted for DI pattern and exception-based error handling
 * Security-specialist: consulted for validation patterns
 */
export class SecurityValidator {
  private allowedBasePath: string | null = null;

  /**
   * Set the allowed base path (typically from folder selection dialog).
   * All file operations must be within this path.
   */
  setAllowedBasePath(folderPath: string): void {
    this.allowedBasePath = path.resolve(folderPath);
  }

  /**
   * Validates file path against allowed base path (prevents path traversal).
   *
   * Mitigates: CRITICAL-2 (CWE-22 Path Traversal)
   *
   * @throws SecurityViolationError if path is outside allowed base
   * @returns Resolved absolute path if valid
   */
  async validateFilePath(filePath: string): Promise<string> {
    if (!this.allowedBasePath) {
      throw new Error('No folder selected');
    }

    // Resolve path (handles relative paths, symlinks)
    const resolvedPath = await fs.realpath(filePath).catch(() => path.resolve(filePath));

    // Check if resolved path starts with allowed base
    if (!resolvedPath.startsWith(this.allowedBasePath)) {
      throw new SecurityViolationError(
        'PATH_TRAVERSAL',
        filePath,
        `Access denied: Path outside allowed folder (${this.allowedBasePath})`
      );
    }

    return resolvedPath;
  }

  /**
   * Validates file content matches extension via magic number checking.
   *
   * Mitigates: CRITICAL-3 (CWE-434 Unrestricted File Upload)
   *
   * @throws SecurityViolationError if content doesn't match extension
   * @returns true if valid
   */
  async validateFileContent(filePath: string): Promise<boolean> {
    const ext = path.extname(filePath).toLowerCase().slice(1); // Remove leading dot
    const signature = FILE_SIGNATURES[ext];

    if (!signature) {
      throw new SecurityViolationError(
        'INVALID_EXTENSION',
        filePath,
        `Unsupported file extension: ${ext}`
      );
    }

    // Read first 16 bytes (sufficient for all signatures)
    const buffer = await fs.readFile(filePath);
    const header = buffer.slice(0, 16);

    // Check magic bytes
    for (let i = 0; i < signature.length; i++) {
      if (header[i] !== signature[i]) {
        throw new SecurityViolationError(
          'INVALID_CONTENT',
          filePath,
          `File content doesn't match ${ext} format (magic bytes mismatch)`
        );
      }
    }

    // Special case: WEBP requires additional check
    if (ext === 'webp') {
      const webpMarker = header.slice(8, 12).toString('ascii');
      if (webpMarker !== 'WEBP') {
        throw new SecurityViolationError(
          'INVALID_CONTENT',
          filePath,
          'Invalid WEBP format'
        );
      }
    }

    return true;
  }

  /**
   * Validates file size against maximum limit.
   *
   * Mitigates: CRITICAL-4 (CWE-400 Resource Exhaustion)
   *
   * @throws SecurityViolationError if file exceeds maxBytes
   */
  async validateFileSize(filePath: string, maxBytes: number): Promise<void> {
    const stats = await fs.stat(filePath);

    if (stats.size > maxBytes) {
      const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
      const maxMB = (maxBytes / 1024 / 1024).toFixed(0);

      throw new SecurityViolationError(
        'SIZE_EXCEEDED',
        filePath,
        `File too large: ${sizeMB}MB (max ${maxMB}MB)`
      );
    }
  }
}
