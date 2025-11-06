import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SecurityValidator } from './securityValidator';
import { SecurityViolationError } from '../utils/securityViolationError';

// Mock fs/promises module at the top level
vi.mock('fs/promises', () => ({
  realpath: vi.fn(),
  readFile: vi.fn(),
  stat: vi.fn(),
}));

import * as fs from 'fs/promises';

describe('SecurityValidator', () => {
  let validator: SecurityValidator;

  beforeEach(() => {
    validator = new SecurityValidator();
    vi.clearAllMocks();
  });

  describe('Path Traversal Protection', () => {
    it('should allow files within allowed root', async () => {
      validator.setAllowedBasePath('/selected/folder');

      // Mock realpath to return the same path (simulates valid file)
      vi.mocked(fs.realpath).mockResolvedValue('/selected/folder/subdir/image.jpg' as any);

      const validPath = '/selected/folder/subdir/image.jpg';
      await expect(
        validator.validateFilePath(validPath)
      ).resolves.toBe(validPath);
    });

    it('should reject absolute paths outside allowed root', async () => {
      validator.setAllowedBasePath('/selected/folder');

      // Mock realpath to return the actual path (no traversal)
      vi.mocked(fs.realpath).mockResolvedValue('/etc/passwd' as any);

      const maliciousPath = '/etc/passwd';
      await expect(
        validator.validateFilePath(maliciousPath)
      ).rejects.toThrow(SecurityViolationError);

      try {
        await validator.validateFilePath(maliciousPath);
      } catch (error) {
        expect(error).toBeInstanceOf(SecurityViolationError);
        expect((error as SecurityViolationError).type).toBe('PATH_TRAVERSAL');
      }
    });

    it('should reject relative path traversal attempts (../)', async () => {
      validator.setAllowedBasePath('/selected/folder');

      // Mock realpath to resolve the traversal (simulates what Node does)
      vi.mocked(fs.realpath).mockResolvedValue('/etc/passwd' as any);

      const traversalPath = '/selected/folder/../../etc/passwd';
      await expect(
        validator.validateFilePath(traversalPath)
      ).rejects.toThrow(SecurityViolationError);
    });

    it('should reject symlink path traversal', async () => {
      validator.setAllowedBasePath('/selected/folder');

      // Mock realpath to simulate symlink pointing outside
      vi.mocked(fs.realpath).mockResolvedValue('/etc/passwd' as any);

      const symlinkPath = '/selected/folder/symlink-to-passwd';
      await expect(
        validator.validateFilePath(symlinkPath)
      ).rejects.toThrow(SecurityViolationError);
    });

    it('should throw if no allowed base path set', async () => {
      // Don't call setAllowedBasePath

      await expect(
        validator.validateFilePath('/any/path')
      ).rejects.toThrow('No folder selected');
    });

    // CRITICAL-2 REGRESSION TESTS: Prefix Bypass Vulnerability
    describe('CRITICAL-2: Prefix Bypass Prevention', () => {
      it('should reject sibling directory with matching prefix', async () => {
        validator.setAllowedBasePath('/Users/alice/ingest');

        // Sibling directory that LOOKS like it's inside base
        // Current bug: "/Users/alice/ingest-backup".startsWith("/Users/alice/ingest") → TRUE
        vi.mocked(fs.realpath).mockResolvedValue('/Users/alice/ingest-backup/file.jpg' as any);

        const siblingPath = '/Users/alice/ingest-backup/file.jpg';

        // This test will FAIL initially (RED phase)
        // Because current code uses startsWith() which allows prefix matches
        await expect(
          validator.validateFilePath(siblingPath)
        ).rejects.toThrow(SecurityViolationError);

        try {
          await validator.validateFilePath(siblingPath);
        } catch (error) {
          expect(error).toBeInstanceOf(SecurityViolationError);
          expect((error as SecurityViolationError).type).toBe('PATH_TRAVERSAL');
        }
      });

      it('should reject parent directory traversal after resolution', async () => {
        validator.setAllowedBasePath('/Users/alice/ingest');

        // Path that resolves outside after traversal
        vi.mocked(fs.realpath).mockResolvedValue('/Users/alice/.ssh/id_rsa' as any);

        const traversalPath = '/Users/alice/ingest/../.ssh/id_rsa';

        await expect(
          validator.validateFilePath(traversalPath)
        ).rejects.toThrow(SecurityViolationError);
      });

      it('should allow legitimate subdirectories', async () => {
        validator.setAllowedBasePath('/Users/alice/ingest');

        vi.mocked(fs.realpath).mockResolvedValue('/Users/alice/ingest/subfolder/image.jpg' as any);

        const validPath = '/Users/alice/ingest/subfolder/image.jpg';

        await expect(
          validator.validateFilePath(validPath)
        ).resolves.toBe(validPath);
      });

      it('should reject paths that are prefix but not contained', async () => {
        validator.setAllowedBasePath('/app/data');

        // Malicious: /app/data-backup shares prefix but is NOT inside /app/data
        vi.mocked(fs.realpath).mockResolvedValue('/app/data-backup/secrets.txt' as any);

        await expect(
          validator.validateFilePath('/app/data-backup/secrets.txt')
        ).rejects.toThrow(SecurityViolationError);
      });
    });
  });

  describe('File Content Validation', () => {
    it('should accept valid JPEG files', async () => {
      const jpegBuffer = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, ...Array(100).fill(0)]);
      vi.mocked(fs.readFile).mockResolvedValue(jpegBuffer as any);

      await expect(
        validator.validateFileContent('/test/image.jpg')
      ).resolves.toBe(true);
    });

    it('should accept valid PNG files', async () => {
      const pngBuffer = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, ...Array(100).fill(0)]);
      vi.mocked(fs.readFile).mockResolvedValue(pngBuffer as any);

      await expect(
        validator.validateFileContent('/test/image.png')
      ).resolves.toBe(true);
    });

    it('should reject executable disguised as JPEG', async () => {
      const exeBuffer = Buffer.from([0x4D, 0x5A, ...Array(100).fill(0)]); // MZ header (Windows EXE)
      vi.mocked(fs.readFile).mockResolvedValue(exeBuffer as any);

      await expect(
        validator.validateFileContent('/test/malware.jpg')
      ).rejects.toThrow(SecurityViolationError);

      try {
        await validator.validateFileContent('/test/malware.jpg');
      } catch (error) {
        expect((error as SecurityViolationError).type).toBe('INVALID_CONTENT');
      }
    });

    it('should reject files with mismatched extension', async () => {
      const pngBuffer = Buffer.from([0x89, 0x50, 0x4E, 0x47, ...Array(100).fill(0)]);
      vi.mocked(fs.readFile).mockResolvedValue(pngBuffer as any);

      // PNG magic bytes but .jpg extension
      await expect(
        validator.validateFileContent('/test/fake.jpg')
      ).rejects.toThrow(SecurityViolationError);
    });

    // CRITICAL-3 REGRESSION TESTS: Video Magic Number Validation
    describe('CRITICAL-3: Video Format Validation', () => {
      it('should reject malicious MP4 with only null bytes', async () => {
        // Current bug: [0x00, 0x00, 0x00] signature is too short
        // Exploit: Just 3 null bytes passes validation
        const fakeMP4 = Buffer.from([0x00, 0x00, 0x00, 0x00, ...Array(100).fill(0xFF)]);
        vi.mocked(fs.readFile).mockResolvedValue(fakeMP4 as any);

        // This test will FAIL initially (RED phase)
        // Because current code only checks first 3 bytes
        await expect(
          validator.validateFileContent('/test/malicious.mp4')
        ).rejects.toThrow(SecurityViolationError);

        try {
          await validator.validateFileContent('/test/malicious.mp4');
        } catch (error) {
          expect((error as SecurityViolationError).type).toBe('INVALID_CONTENT');
        }
      });

      it('should accept valid MP4 with ftyp box', async () => {
        // Valid MP4 header: size (4 bytes) + 'ftyp' + 'isom'
        const validMP4 = Buffer.from([
          0x00, 0x00, 0x00, 0x20,  // Box size: 32 bytes
          0x66, 0x74, 0x79, 0x70,  // 'ftyp'
          0x69, 0x73, 0x6F, 0x6D,  // 'isom' brand
          ...Array(100).fill(0x00)
        ]);
        vi.mocked(fs.readFile).mockResolvedValue(validMP4 as any);

        await expect(
          validator.validateFileContent('/test/valid.mp4')
        ).resolves.toBe(true);
      });

      it('should accept valid MOV with qt brand', async () => {
        const validMOV = Buffer.from([
          0x00, 0x00, 0x00, 0x20,  // Box size
          0x66, 0x74, 0x79, 0x70,  // 'ftyp'
          0x71, 0x74, 0x20, 0x20,  // 'qt  ' brand
          ...Array(100).fill(0x00)
        ]);
        vi.mocked(fs.readFile).mockResolvedValue(validMOV as any);

        await expect(
          validator.validateFileContent('/test/valid.mov')
        ).resolves.toBe(true);
      });

      it('should reject AVI file without AVI marker', async () => {
        // Current bug: Only checks 'RIFF', not 'AVI ' marker
        // RIFF header but not AVI
        const fakeAVI = Buffer.from([
          0x52, 0x49, 0x46, 0x46,  // 'RIFF'
          0x00, 0x00, 0x00, 0x00,  // Size
          0x4E, 0x4F, 0x54, 0x20,  // 'NOT ' instead of 'AVI '
          ...Array(100).fill(0x00)
        ]);
        vi.mocked(fs.readFile).mockResolvedValue(fakeAVI as any);

        // This test will FAIL initially (RED phase)
        await expect(
          validator.validateFileContent('/test/fake.avi')
        ).rejects.toThrow(SecurityViolationError);
      });

      it('should accept valid AVI file', async () => {
        const validAVI = Buffer.from([
          0x52, 0x49, 0x46, 0x46,  // 'RIFF'
          0x00, 0x00, 0x00, 0x00,  // Size
          0x41, 0x56, 0x49, 0x20,  // 'AVI '
          ...Array(100).fill(0x00)
        ]);
        vi.mocked(fs.readFile).mockResolvedValue(validAVI as any);

        await expect(
          validator.validateFileContent('/test/valid.avi')
        ).resolves.toBe(true);
      });

      it('should accept valid WebM file', async () => {
        const validWebM = Buffer.from([
          0x1A, 0x45, 0xDF, 0xA3,  // EBML header
          ...Array(100).fill(0x00)
        ]);
        vi.mocked(fs.readFile).mockResolvedValue(validWebM as any);

        await expect(
          validator.validateFileContent('/test/valid.webm')
        ).resolves.toBe(true);
      });

      it('should reject invalid MP4 brand', async () => {
        // ftyp box with unknown brand
        const invalidMP4 = Buffer.from([
          0x00, 0x00, 0x00, 0x20,  // Box size
          0x66, 0x74, 0x79, 0x70,  // 'ftyp'
          0x58, 0x58, 0x58, 0x58,  // 'XXXX' (invalid brand)
          ...Array(100).fill(0x00)
        ]);
        vi.mocked(fs.readFile).mockResolvedValue(invalidMP4 as any);

        await expect(
          validator.validateFileContent('/test/invalid.mp4')
        ).rejects.toThrow(SecurityViolationError);
      });
    });

    // HIGH-1 REGRESSION TESTS: BMP and MKV Support
    describe('HIGH-1: Missing Format Support', () => {
      it('should accept valid BMP file', async () => {
        const validBMP = Buffer.from([
          0x42, 0x4D,  // 'BM'
          ...Array(100).fill(0x00)
        ]);
        vi.mocked(fs.readFile).mockResolvedValue(validBMP as any);

        await expect(
          validator.validateFileContent('/test/valid.bmp')
        ).resolves.toBe(true);
      });

      it('should reject invalid BMP file', async () => {
        const invalidBMP = Buffer.from([0x00, 0x00, ...Array(100).fill(0x00)]);
        vi.mocked(fs.readFile).mockResolvedValue(invalidBMP as any);

        await expect(
          validator.validateFileContent('/test/invalid.bmp')
        ).rejects.toThrow(SecurityViolationError);
      });

      it('should accept valid MKV file', async () => {
        const validMKV = Buffer.from([
          0x1A, 0x45, 0xDF, 0xA3,  // EBML header
          ...Array(100).fill(0x00)
        ]);
        vi.mocked(fs.readFile).mockResolvedValue(validMKV as any);

        await expect(
          validator.validateFileContent('/test/valid.mkv')
        ).resolves.toBe(true);
      });

      it('should reject invalid MKV file', async () => {
        const invalidMKV = Buffer.from([0x00, 0x00, 0x00, 0x00, ...Array(100).fill(0x00)]);
        vi.mocked(fs.readFile).mockResolvedValue(invalidMKV as any);

        await expect(
          validator.validateFileContent('/test/invalid.mkv')
        ).rejects.toThrow(SecurityViolationError);
      });
    });
  });

  describe('File Size Validation', () => {
    it('should accept files under max size', async () => {
      vi.mocked(fs.stat).mockResolvedValue({
        size: 50 * 1024 * 1024, // 50MB
      } as any);

      await expect(
        validator.validateFileSize('/test/file.jpg', 100 * 1024 * 1024)
      ).resolves.not.toThrow();
    });

    it('should reject files over max size', async () => {
      vi.mocked(fs.stat).mockResolvedValue({
        size: 150 * 1024 * 1024, // 150MB
      } as any);

      await expect(
        validator.validateFileSize('/test/huge.jpg', 100 * 1024 * 1024)
      ).rejects.toThrow(SecurityViolationError);

      try {
        await validator.validateFileSize('/test/huge.jpg', 100 * 1024 * 1024);
      } catch (error) {
        expect((error as SecurityViolationError).type).toBe('SIZE_EXCEEDED');
      }
    });
  });
});
