import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import { FileManager } from './fileManager';
import { SecurityValidator } from './securityValidator';

vi.mock('fs/promises');

describe('FileManager', () => {
  let fileManager: FileManager;
  let mockSecurityValidator: SecurityValidator;

  // Partial mock of fs/promises for testing (explicit unknown cast)
  const mockFs = fs as unknown as {
    readdir: ReturnType<typeof vi.fn>;
    stat: ReturnType<typeof vi.fn>;
    rename: ReturnType<typeof vi.fn>;
    realpath: ReturnType<typeof vi.fn>;
    readFile: ReturnType<typeof vi.fn>;
  };
  const testFolderPath = '/test/folder';

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock SecurityValidator
    mockSecurityValidator = new SecurityValidator();

    // Mock validateFilePath to pass through (no path traversal for normal tests)
    vi.spyOn(mockSecurityValidator, 'validateFilePath').mockImplementation(async (path: string) => path);

    // Mock validateFileSize to call the real implementation
    // (This allows file size validation tests to work properly)
    vi.spyOn(mockSecurityValidator, 'validateFileSize').mockImplementation(
      async (filePath: string, maxBytes: number) => {
        // Call through to the real SecurityValidator implementation
        const realValidator = new SecurityValidator();
        return realValidator.validateFileSize(filePath, maxBytes);
      }
    );

    // Mock setAllowedBasePath (no-op for normal tests)
    vi.spyOn(mockSecurityValidator, 'setAllowedBasePath').mockImplementation(() => {});

    fileManager = new FileManager(mockSecurityValidator);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('scanFolder', () => {
    it('should scan folder and return image and video files', async () => {
      const mockFiles = [
        { name: 'EB001537.jpg', isFile: () => true, isDirectory: () => false },
        { name: 'VD002341.mp4', isFile: () => true, isDirectory: () => false },
        { name: 'document.pdf', isFile: () => true, isDirectory: () => false },
        { name: 'subfolder', isFile: () => false, isDirectory: () => true },
      ];

      mockFs.readdir.mockResolvedValue(mockFiles);
      mockFs.stat.mockImplementation(async (filePath: string) => ({
        isFile: () => !filePath.includes('subfolder'),
        isDirectory: () => filePath.includes('subfolder'),
        mtime: new Date('2024-01-01'),
      }));

      const files = await fileManager.scanFolder(testFolderPath);

      expect(files).toHaveLength(2);
      expect(files[0].id).toBe('EB001537');
      expect(files[0].fileType).toBe('image');
      expect(files[1].id).toBe('VD002341');
      expect(files[1].fileType).toBe('video');
    });

    it('should handle folders with no valid files', async () => {
      mockFs.readdir.mockResolvedValue([
        { name: 'document.pdf', isFile: () => true, isDirectory: () => false },
      ]);
      mockFs.stat.mockResolvedValue({
        isFile: () => true,
        mtime: new Date(),
      });

      const files = await fileManager.scanFolder(testFolderPath);

      expect(files).toHaveLength(0);
    });

    it('should throw error if folder does not exist', async () => {
      mockFs.readdir.mockRejectedValue({ code: 'ENOENT' });

      await expect(fileManager.scanFolder('/nonexistent')).rejects.toThrow();
    });
  });

  describe('extractFileId', () => {
    it('should extract first 8 characters as ID', () => {
      expect(fileManager.extractFileId('EB001537-test.jpg')).toBe('EB001537');
      expect(fileManager.extractFileId('VD123456.mp4')).toBe('VD123456');
    });

    it('should handle filenames shorter than 8 characters', () => {
      expect(fileManager.extractFileId('ABC.jpg')).toBe('ABC');
    });
  });

  describe('toKebabCase', () => {
    it('should convert to kebab-case', () => {
      expect(fileManager.toKebabCase('Oven Control Panel')).toBe('oven-control-panel');
      expect(fileManager.toKebabCase('Kitchen Sink')).toBe('kitchen-sink');
      expect(fileManager.toKebabCase('Test  Multiple   Spaces')).toBe('test-multiple-spaces');
    });

    it('should handle special characters', () => {
      expect(fileManager.toKebabCase('Test/Path\\Name')).toBe('test-path-name');
      expect(fileManager.toKebabCase('Test_Underscore')).toBe('test-underscore');
    });

    it('should handle already kebab-case strings', () => {
      expect(fileManager.toKebabCase('already-kebab-case')).toBe('already-kebab-case');
    });
  });

  describe('renameFile', () => {
    it('should rename file with kebab-case name', async () => {
      const originalPath = path.join(testFolderPath, 'EB001537.jpg');
      const newPath = path.join(testFolderPath, 'EB001537-oven-control-panel.jpg');

      mockFs.rename.mockResolvedValue(undefined);

      const result = await fileManager.renameFile(
        originalPath,
        'EB001537',
        'Oven Control Panel'
      );

      expect(result).toBe(newPath);
      expect(mockFs.rename).toHaveBeenCalledWith(originalPath, newPath);
    });

    it('should handle file already having a name', async () => {
      const originalPath = path.join(testFolderPath, 'EB001537-old-name.jpg');
      const newPath = path.join(testFolderPath, 'EB001537-new-name.jpg');

      mockFs.rename.mockResolvedValue(undefined);

      const result = await fileManager.renameFile(
        originalPath,
        'EB001537',
        'New Name'
      );

      expect(result).toBe(newPath);
    });

    it('should throw error if rename fails', async () => {
      mockFs.rename.mockRejectedValue(new Error('Permission denied'));

      await expect(
        fileManager.renameFile('/test/file.jpg', 'EB001537', 'test')
      ).rejects.toThrow('Permission denied');
    });
  });

  describe('isMediaFile', () => {
    it('should identify image files', () => {
      expect(fileManager.isMediaFile('test.jpg')).toBe(true);
      expect(fileManager.isMediaFile('test.JPG')).toBe(true);
      expect(fileManager.isMediaFile('test.png')).toBe(true);
      expect(fileManager.isMediaFile('test.jpeg')).toBe(true);
    });

    it('should identify video files', () => {
      expect(fileManager.isMediaFile('test.mp4')).toBe(true);
      expect(fileManager.isMediaFile('test.mov')).toBe(true);
      expect(fileManager.isMediaFile('test.avi')).toBe(true);
    });

    it('should reject non-media files', () => {
      expect(fileManager.isMediaFile('test.pdf')).toBe(false);
      expect(fileManager.isMediaFile('test.doc')).toBe(false);
      expect(fileManager.isMediaFile('test.txt')).toBe(false);
    });
  });

  describe('getFileType', () => {
    it('should return image for image files', () => {
      expect(fileManager.getFileType('test.jpg')).toBe('image');
      expect(fileManager.getFileType('test.png')).toBe('image');
    });

    it('should return video for video files', () => {
      expect(fileManager.getFileType('test.mp4')).toBe('video');
      expect(fileManager.getFileType('test.mov')).toBe('video');
    });
  });

  describe('validateFileSize - Security', () => {
    it('should reject files larger than 100MB', async () => {
      const largeFilePath = '/test/huge-file.jpg';

      // Mock fs.stat to return 150MB size
      mockFs.stat.mockResolvedValue({
        size: 150 * 1024 * 1024, // 150MB
        isFile: () => true,
        isDirectory: () => false,
        mtime: new Date(),
      });

      await expect(
        fileManager.validateFileSize(largeFilePath)
      ).rejects.toThrow('File too large: 150.00MB (max 100MB)');
    });

    it('should accept files smaller than 100MB', async () => {
      const normalFilePath = '/test/normal-file.jpg';

      mockFs.stat.mockResolvedValue({
        size: 50 * 1024 * 1024, // 50MB
        isFile: () => true,
        isDirectory: () => false,
        mtime: new Date(),
      });

      await expect(
        fileManager.validateFileSize(normalFilePath)
      ).resolves.not.toThrow();
    });

    it('should accept files exactly at 100MB limit', async () => {
      const limitFilePath = '/test/limit-file.jpg';

      mockFs.stat.mockResolvedValue({
        size: 100 * 1024 * 1024, // exactly 100MB
        isFile: () => true,
        isDirectory: () => false,
        mtime: new Date(),
      });

      await expect(
        fileManager.validateFileSize(limitFilePath)
      ).resolves.not.toThrow();
    });

    it('should reject files just over 100MB', async () => {
      const overLimitPath = '/test/over-limit.jpg';

      mockFs.stat.mockResolvedValue({
        size: (100 * 1024 * 1024) + 1, // 100MB + 1 byte
        isFile: () => true,
        isDirectory: () => false,
        mtime: new Date(),
      });

      await expect(
        fileManager.validateFileSize(overLimitPath)
      ).rejects.toThrow('File too large');
    });
  });
});
