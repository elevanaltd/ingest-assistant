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

    it('should preserve unique camera IDs without modification', async () => {
      // Test that primary workflow (camera files) is unchanged
      const mockFiles = [
        { name: 'EA001234.jpg', isFile: () => true, isDirectory: () => false },
        { name: 'EA001235.jpg', isFile: () => true, isDirectory: () => false },
        { name: 'EA001236.mov', isFile: () => true, isDirectory: () => false },
      ];

      mockFs.readdir.mockResolvedValue(mockFiles);
      mockFs.stat.mockResolvedValue({
        isFile: () => true,
        mtime: new Date('2024-01-01'),
      });

      const files = await fileManager.scanFolder(testFolderPath);

      // Camera IDs should be preserved exactly (no counters)
      expect(files).toHaveLength(3);
      expect(files[0].id).toBe('EA001234');
      expect(files[1].id).toBe('EA001235');
      expect(files[2].id).toBe('EA001236');
    });

    it('should add counter suffix to duplicate IDs', async () => {
      // Test edge case: renamed files with duplicate 8-char prefixes
      const mockFiles = [
        { name: 'Utility shot 1.mov', isFile: () => true, isDirectory: () => false },
        { name: 'Utility shot 2.mov', isFile: () => true, isDirectory: () => false },
        { name: 'Utility shot 3.mov', isFile: () => true, isDirectory: () => false },
      ];

      mockFs.readdir.mockResolvedValue(mockFiles);
      mockFs.stat.mockResolvedValue({
        isFile: () => true,
        mtime: new Date('2024-01-01'),
      });

      const files = await fileManager.scanFolder(testFolderPath);

      // First "Utility " gets ID as-is, duplicates get trimmed counters
      expect(files).toHaveLength(3);
      expect(files[0].id).toBe('Utility '); // First occurrence (preserves trailing space)
      expect(files[1].id).toBe('Utility-2'); // Second occurrence (trimmed + counter)
      expect(files[2].id).toBe('Utility-3'); // Third occurrence (trimmed + counter)
    });

    it('should handle mixed unique and duplicate IDs', async () => {
      const mockFiles = [
        { name: 'EA001234.jpg', isFile: () => true, isDirectory: () => false }, // Unique
        { name: 'Utility shot 1.mov', isFile: () => true, isDirectory: () => false }, // First "Utility "
        { name: 'EA001235.jpg', isFile: () => true, isDirectory: () => false }, // Unique
        { name: 'Utility shot 2.mov', isFile: () => true, isDirectory: () => false }, // Duplicate "Utility "
        { name: 'VD002341.mp4', isFile: () => true, isDirectory: () => false }, // Unique
      ];

      mockFs.readdir.mockResolvedValue(mockFiles);
      mockFs.stat.mockResolvedValue({
        isFile: () => true,
        mtime: new Date('2024-01-01'),
      });

      const files = await fileManager.scanFolder(testFolderPath);

      expect(files).toHaveLength(5);
      expect(files[0].id).toBe('EA001234'); // Unique - unchanged
      expect(files[1].id).toBe('Utility '); // First occurrence (preserves trailing space)
      expect(files[2].id).toBe('EA001235'); // Unique - unchanged
      expect(files[3].id).toBe('Utility-2'); // Duplicate detected (trimmed + counter)
      expect(files[4].id).toBe('VD002341'); // Unique - unchanged
    });

    it('should handle many duplicates (stress test)', async () => {
      // Test with 10 files all having same 8-char prefix
      const mockFiles = Array.from({ length: 10 }, (_, i) => ({
        name: `Test fil ${i + 1}.jpg`,
        isFile: () => true,
        isDirectory: () => false,
      }));

      mockFs.readdir.mockResolvedValue(mockFiles);
      mockFs.stat.mockResolvedValue({
        isFile: () => true,
        mtime: new Date('2024-01-01'),
      });

      const files = await fileManager.scanFolder(testFolderPath);

      expect(files).toHaveLength(10);
      expect(files[0].id).toBe('Test fil'); // First
      expect(files[1].id).toBe('Test fil-2'); // Counter
      expect(files[9].id).toBe('Test fil-10'); // 10th duplicate
    });

    it('should trim whitespace before adding counter', async () => {
      // Test that "Utility " becomes "Utility-2" not "Utility -2"
      const mockFiles = [
        { name: 'Utility 1.mov', isFile: () => true, isDirectory: () => false },
        { name: 'Utility 2.mov', isFile: () => true, isDirectory: () => false },
      ];

      mockFs.readdir.mockResolvedValue(mockFiles);
      mockFs.stat.mockResolvedValue({
        isFile: () => true,
        mtime: new Date('2024-01-01'),
      });

      const files = await fileManager.scanFolder(testFolderPath);

      expect(files[0].id).toBe('Utility '); // First gets ID as extracted
      expect(files[1].id).toBe('Utility-2'); // Trimmed before counter
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

  describe('invalidateCache', () => {
    it('should provide public method to invalidate cache for a folder', async () => {
      // First scan - populate cache
      const mockFiles = [
        { name: 'EB001537.jpg', isFile: () => true, isDirectory: () => false },
      ];
      mockFs.readdir.mockResolvedValue(mockFiles);
      mockFs.stat.mockResolvedValue({
        isFile: () => true,
        mtime: new Date('2024-01-01'),
      });

      await fileManager.scanFolder(testFolderPath);
      expect(mockFs.readdir).toHaveBeenCalledTimes(1);

      // Second scan - should hit cache (no new readdir)
      await fileManager.scanFolder(testFolderPath);
      expect(mockFs.readdir).toHaveBeenCalledTimes(1); // Still 1 (cached)

      // Invalidate cache
      fileManager.invalidateCache(testFolderPath);

      // Third scan - cache cleared, should trigger new readdir
      await fileManager.scanFolder(testFolderPath);
      expect(mockFs.readdir).toHaveBeenCalledTimes(2); // Now 2 (cache was cleared)
    });

    it('should only invalidate cache for specific folder path', async () => {
      const folder1 = '/test/folder1';
      const folder2 = '/test/folder2';

      const mockFiles = [
        { name: 'test.jpg', isFile: () => true, isDirectory: () => false },
      ];
      mockFs.readdir.mockResolvedValue(mockFiles);
      mockFs.stat.mockResolvedValue({
        isFile: () => true,
        mtime: new Date(),
      });

      // Populate both caches
      await fileManager.scanFolder(folder1);
      await fileManager.scanFolder(folder2);
      expect(mockFs.readdir).toHaveBeenCalledTimes(2);

      // Invalidate only folder1
      fileManager.invalidateCache(folder1);

      // Scan folder1 - should trigger new readdir (cache cleared)
      await fileManager.scanFolder(folder1);
      expect(mockFs.readdir).toHaveBeenCalledTimes(3);

      // Scan folder2 - should NOT trigger readdir (cache still valid)
      await fileManager.scanFolder(folder2);
      expect(mockFs.readdir).toHaveBeenCalledTimes(3); // Still 3
    });
  });

  describe('renameFile - cache invalidation', () => {
    it('should automatically invalidate cache after successful rename', async () => {
      const originalPath = path.join(testFolderPath, 'EB001537.jpg');

      // First, populate cache with a scan
      const mockFiles = [
        { name: 'EB001537.jpg', isFile: () => true, isDirectory: () => false },
      ];
      mockFs.readdir.mockResolvedValue(mockFiles);
      mockFs.stat.mockResolvedValue({
        isFile: () => true,
        mtime: new Date('2024-01-01'),
      });

      await fileManager.scanFolder(testFolderPath);
      expect(mockFs.readdir).toHaveBeenCalledTimes(1);

      // Verify cache is working - second scan should not trigger readdir
      await fileManager.scanFolder(testFolderPath);
      expect(mockFs.readdir).toHaveBeenCalledTimes(1); // Still 1 (cached)

      // Perform rename operation
      mockFs.rename.mockResolvedValue(undefined);
      await fileManager.renameFile(originalPath, 'EB001537', 'New Name');

      // After rename, cache should be invalidated
      // Next scan should trigger new readdir
      await fileManager.scanFolder(testFolderPath);
      expect(mockFs.readdir).toHaveBeenCalledTimes(2); // Now 2 (cache cleared by rename)
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
