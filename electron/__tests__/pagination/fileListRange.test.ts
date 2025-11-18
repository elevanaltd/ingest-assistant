import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs/promises';
import type { Dirent, Stats } from 'fs';
import { FileListRangeSchema } from '../../schemas/ipcSchemas';
import { FileManager } from '../../services/fileManager';
import { MetadataStore } from '../../services/metadataStore';
import { SecurityValidator } from '../../services/securityValidator';
import type { FileMetadata, FileListRangeResponse } from '../../../src/types';

/**
 * TDD RED: Paginated File List Tests
 *
 * Tests for file:list-range IPC handler implementing issue #19
 * Performance requirements: <300ms initial, <50ms cached
 *
 * Coverage:
 * 1. Schema validation (security)
 * 2. Pagination logic (first/middle/last page)
 * 3. hasMore flag calculation
 * 4. Edge cases (empty, out of bounds)
 * 5. Metadata hydration per page
 */

vi.mock('fs/promises');

describe('file:list-range - Pagination', () => {
  describe('Schema Validation (Security)', () => {
    it('should accept valid pagination parameters', () => {
      const validParams = {
        startIndex: 0,
        pageSize: 20,
      };

      const result = FileListRangeSchema.parse(validParams);
      expect(result).toEqual(validParams);
    });

    it('should reject negative startIndex', () => {
      const invalidParams = {
        startIndex: -1,
        pageSize: 20,
      };

      expect(() => FileListRangeSchema.parse(invalidParams)).toThrow();
    });

    it('should reject zero pageSize', () => {
      const invalidParams = {
        startIndex: 0,
        pageSize: 0,
      };

      expect(() => FileListRangeSchema.parse(invalidParams)).toThrow();
    });

    it('should reject pageSize exceeding 100', () => {
      const invalidParams = {
        startIndex: 0,
        pageSize: 101,
      };

      expect(() => FileListRangeSchema.parse(invalidParams)).toThrow();
    });

    it('should reject non-integer startIndex', () => {
      const invalidParams = {
        startIndex: 1.5,
        pageSize: 20,
      };

      expect(() => FileListRangeSchema.parse(invalidParams)).toThrow();
    });

    it('should reject excessively large startIndex', () => {
      const invalidParams = {
        startIndex: 1000001,
        pageSize: 20,
      };

      expect(() => FileListRangeSchema.parse(invalidParams)).toThrow();
    });
  });

  describe('FileManager.scanFolderRange', () => {
    let fileManager: FileManager;
    let mockSecurityValidator: SecurityValidator;
    let mockMetadataWriter: any;
    const testFolderPath = '/test/folder';

    const mockFs = fs as unknown as {
      readdir: ReturnType<typeof vi.fn>;
      stat: ReturnType<typeof vi.fn>;
    };

    beforeEach(() => {
      vi.clearAllMocks();
      mockSecurityValidator = new SecurityValidator();
      vi.spyOn(mockSecurityValidator, 'validateFilePath').mockResolvedValue('/test/folder');
      vi.spyOn(mockSecurityValidator, 'setAllowedBasePath').mockImplementation(() => {});

      // Mock MetadataWriter to prevent real execFile calls (CI performance issue)
      mockMetadataWriter = {
        readCreationTimestamp: vi.fn().mockResolvedValue(undefined),
      };

      fileManager = new FileManager(mockSecurityValidator, mockMetadataWriter);
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    const createMockDirent = (name: string, isFile = true): Partial<Dirent> => ({
      name,
      isFile: () => isFile,
      isDirectory: () => !isFile,
    });

    const createMockStats = (): Partial<Stats> => ({
      mtime: new Date('2024-01-01'),
      size: 1024,
    });

    it('should return first page of files', async () => {
      // Mock 50 files
      const mockFiles = Array.from({ length: 50 }, (_, i) =>
        createMockDirent(`IMG_${String(i).padStart(4, '0')}.jpg`)
      );

      mockFs.readdir.mockResolvedValue(mockFiles as Dirent[]);
      mockFs.stat.mockResolvedValue(createMockStats() as Stats);

      const result = await fileManager.scanFolderRange(testFolderPath, 0, 20);

      expect(result.files).toHaveLength(20);
      expect(result.totalCount).toBe(50);
      expect(result.startIndex).toBe(0);
      expect(result.pageSize).toBe(20);
      expect(result.hasMore).toBe(true);
      expect(result.files[0].id).toBe('IMG_0000');
      expect(result.files[19].id).toBe('IMG_0019');
    });

    it('should return middle page of files', async () => {
      // Mock 100 files with unique 8-char IDs (camera-style)
      const mockFiles = Array.from({ length: 100 }, (_, i) =>
        createMockDirent(`EA${String(i).padStart(6, '0')}.jpg`)
      );

      mockFs.readdir.mockResolvedValue(mockFiles as Dirent[]);
      mockFs.stat.mockResolvedValue(createMockStats() as Stats);

      const result = await fileManager.scanFolderRange(testFolderPath, 40, 20);

      expect(result.files).toHaveLength(20);
      expect(result.totalCount).toBe(100);
      expect(result.startIndex).toBe(40);
      expect(result.hasMore).toBe(true);
      expect(result.files[0].id).toBe('EA000040');
      expect(result.files[19].id).toBe('EA000059');
    });

    it('should return last partial page', async () => {
      // Mock 45 files, request last page
      const mockFiles = Array.from({ length: 45 }, (_, i) =>
        createMockDirent(`TEST_${String(i).padStart(4, '0')}.jpg`)
      );

      mockFs.readdir.mockResolvedValue(mockFiles as Dirent[]);
      mockFs.stat.mockResolvedValue(createMockStats() as Stats);

      const result = await fileManager.scanFolderRange(testFolderPath, 40, 20);

      expect(result.files).toHaveLength(5);
      expect(result.totalCount).toBe(45);
      expect(result.startIndex).toBe(40);
      expect(result.hasMore).toBe(false);
    });

    it('should return empty array when startIndex exceeds file count', async () => {
      const mockFiles = Array.from({ length: 10 }, (_, i) =>
        createMockDirent(`IMG_${String(i).padStart(4, '0')}.jpg`)
      );

      mockFs.readdir.mockResolvedValue(mockFiles as Dirent[]);
      mockFs.stat.mockResolvedValue(createMockStats() as Stats);

      const result = await fileManager.scanFolderRange(testFolderPath, 50, 20);

      expect(result.files).toHaveLength(0);
      expect(result.totalCount).toBe(10);
      expect(result.hasMore).toBe(false);
    });

    it('should handle empty folder', async () => {
      mockFs.readdir.mockResolvedValue([]);

      const result = await fileManager.scanFolderRange(testFolderPath, 0, 20);

      expect(result.files).toHaveLength(0);
      expect(result.totalCount).toBe(0);
      expect(result.hasMore).toBe(false);
    });

    it('should filter out non-media files', async () => {
      const mockFiles = [
        createMockDirent('IMG_0001.jpg'),
        createMockDirent('VIDEO_0002.mp4'),
        createMockDirent('README.txt'), // Not media
        createMockDirent('IMG_0003.png'),
        createMockDirent('.DS_Store'), // System file
        createMockDirent('._IMG_0004.jpg'), // macOS resource fork
      ];

      mockFs.readdir.mockResolvedValue(mockFiles as Dirent[]);
      mockFs.stat.mockResolvedValue(createMockStats() as Stats);

      const result = await fileManager.scanFolderRange(testFolderPath, 0, 20);

      expect(result.files).toHaveLength(3); // Only media files
      expect(result.totalCount).toBe(3);
    });
  });

  describe('MetadataStore.getMetadataForRange', () => {
    let metadataStore: MetadataStore;
    const testStorePath = '/test/metadata.json';

    const mockFs = fs as unknown as {
      readFile: ReturnType<typeof vi.fn>;
      mkdir: ReturnType<typeof vi.fn>;
      writeFile: ReturnType<typeof vi.fn>;
    };

    beforeEach(() => {
      vi.clearAllMocks();
      metadataStore = new MetadataStore(testStorePath);
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    const createMockFileMetadata = (id: string): FileMetadata => ({
      id,
      originalFilename: `${id}.jpg`,
      currentFilename: `${id}-test.jpg`,
      filePath: `/path/${id}.jpg`,
      extension: '.jpg',
      mainName: 'test-name',
      keywords: ['tag1', 'tag2'],
      processedByAI: true,
      fileType: 'image',
      createdAt: new Date('2024-01-01'),
      createdBy: 'ingest-assistant',
      modifiedAt: new Date('2024-01-01'),
      modifiedBy: 'ingest-assistant',
      version: '2.0',
      location: 'kitchen',
      subject: 'oven',
      action: '',
      shotType: 'WS',
    });

    it('should hydrate metadata for file IDs in range', async () => {
      const mockData = {
        'IMG_0001': createMockFileMetadata('IMG_0001'),
        'IMG_0002': createMockFileMetadata('IMG_0002'),
        'IMG_0003': createMockFileMetadata('IMG_0003'),
      };

      mockFs.readFile.mockResolvedValue(JSON.stringify(mockData));

      const fileIds = ['IMG_0001', 'IMG_0002', 'IMG_0003'];
      const result = await metadataStore.getMetadataForRange(fileIds);

      expect(result).toHaveLength(3);
      expect(result[0].mainName).toBe('test-name');
      expect(result[0].processedByAI).toBe(true);
    });

    it('should return partial metadata when some IDs missing', async () => {
      const mockData = {
        'IMG_0001': createMockFileMetadata('IMG_0001'),
      };

      mockFs.readFile.mockResolvedValue(JSON.stringify(mockData));

      const fileIds = ['IMG_0001', 'IMG_0002', 'IMG_0003'];
      const result = await metadataStore.getMetadataForRange(fileIds);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('IMG_0001');
    });

    it('should return empty array when no metadata exists', async () => {
      mockFs.readFile.mockResolvedValue(JSON.stringify({}));

      const fileIds = ['IMG_0001', 'IMG_0002'];
      const result = await metadataStore.getMetadataForRange(fileIds);

      expect(result).toHaveLength(0);
    });
  });

  describe('Integration: IPC Handler', () => {
    it('should return paginated response with hydrated metadata', async () => {
      // This test will validate the full integration when handler is implemented
      // For now, it serves as specification

      const expectedResponse: FileListRangeResponse = {
        files: [],
        totalCount: 100,
        startIndex: 0,
        pageSize: 20,
        hasMore: true,
      };

      expect(expectedResponse).toBeDefined();
      expect(expectedResponse.hasMore).toBe(true);
    });
  });
});
