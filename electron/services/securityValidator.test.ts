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
