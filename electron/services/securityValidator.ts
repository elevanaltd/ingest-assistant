import * as fs from 'fs/promises';
import * as path from 'path';
import { SecurityViolationError } from '../utils/securityViolationError';

// File magic bytes signatures
// Note: Video formats require deeper validation beyond simple prefix checks
const FILE_SIGNATURES: Record<string, number[]> = {
  jpg: [0xFF, 0xD8, 0xFF],
  jpeg: [0xFF, 0xD8, 0xFF],
  png: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A],
  gif: [0x47, 0x49, 0x46, 0x38],
  webp: [0x52, 0x49, 0x46, 0x46], // "RIFF" (need to check bytes 8-11 for "WEBP")
  bmp: [0x42, 0x4D], // 'BM'
  webm: [0x1A, 0x45, 0xDF, 0xA3], // EBML header
  mkv: [0x1A, 0x45, 0xDF, 0xA3], // EBML header (same as WebM)
  // Note: MP4/MOV/AVI require special validation logic (see validateFileContent)
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
   * Fixed: Prefix bypass vulnerability using path.relative() instead of startsWith()
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

    // Security check: Use path.relative() to prevent prefix bypass
    // Calculate relative path from base to resolved
    const relativePath = path.relative(this.allowedBasePath, resolvedPath);

    // Reject if relative path:
    // 1. Starts with '..' (goes up from base - sibling or parent directory)
    // 2. Is absolute (completely outside base)
    if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
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
   * Fixed: Enhanced video format validation (MP4/MOV/AVI require deeper checks)
   * Added: BMP and MKV format support (HIGH-1)
   *
   * @throws SecurityViolationError if content doesn't match extension
   * @returns true if valid
   */
  async validateFileContent(filePath: string): Promise<boolean> {
    const ext = path.extname(filePath).toLowerCase().slice(1); // Remove leading dot

    // Read only first 64 bytes for magic number validation (not entire file!)
    // This prevents ERR_FS_FILE_TOO_LARGE for videos >2GB
    const fileHandle = await fs.open(filePath, 'r');
    try {
      const buffer = Buffer.alloc(64);
      await fileHandle.read(buffer, 0, 64, 0);
      const header = buffer;

      // Image format validation (simple magic byte checks)
      if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(ext)) {
        const signature = FILE_SIGNATURES[ext];
        if (!signature) {
          throw new SecurityViolationError(
            'INVALID_EXTENSION',
            filePath,
            `Unsupported file extension: ${ext}`
          );
        }

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

    // Video format validation (ENHANCED - requires deeper checks)
    if (['mp4', 'mov', 'm4v'].includes(ext)) {
      // MP4/MOV: Check for 'ftyp' box at bytes 4-7
      const ftypMarker = header.slice(4, 8).toString('ascii');
      if (ftypMarker !== 'ftyp') {
        throw new SecurityViolationError(
          'INVALID_CONTENT',
          filePath,
          'Invalid MP4/MOV format (missing ftyp box)'
        );
      }

      // Additional validation: Check brand (bytes 8-11)
      const brand = header.slice(8, 12).toString('ascii');
      const validBrands = ['isom', 'iso2', 'mp41', 'mp42', 'M4V ', 'M4A ', 'qt  '];
      if (!validBrands.includes(brand)) {
        throw new SecurityViolationError(
          'INVALID_CONTENT',
          filePath,
          `Unknown MP4/MOV brand: ${brand}`
        );
      }

      return true;
    }

    if (ext === 'avi') {
      // AVI: Must be "RIFF" at 0-3 AND "AVI " at 8-11
      if (header.slice(0, 4).toString('ascii') !== 'RIFF') {
        throw new SecurityViolationError(
          'INVALID_CONTENT',
          filePath,
          'Invalid AVI format (missing RIFF)'
        );
      }
      if (header.slice(8, 12).toString('ascii') !== 'AVI ') {
        throw new SecurityViolationError(
          'INVALID_CONTENT',
          filePath,
          'Invalid AVI format (missing AVI marker)'
        );
      }
      return true;
    }

    if (ext === 'webm' || ext === 'mkv') {
      // WebM/MKV: EBML header
      const signature = FILE_SIGNATURES[ext];
      if (!signature) {
        throw new SecurityViolationError(
          'INVALID_EXTENSION',
          filePath,
          `Unsupported file extension: ${ext}`
        );
      }

      if (header[0] !== 0x1A || header[1] !== 0x45 || header[2] !== 0xDF || header[3] !== 0xA3) {
        throw new SecurityViolationError(
          'INVALID_CONTENT',
          filePath,
          `Invalid ${ext.toUpperCase()} format (EBML header mismatch)`
        );
      }
      return true;
    }

    throw new SecurityViolationError(
      'INVALID_EXTENSION',
      filePath,
      `Unsupported file extension: ${ext}`
    );
    } finally {
      await fileHandle.close();
    }
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
