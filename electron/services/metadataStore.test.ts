import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs/promises';
import { MetadataStore } from './metadataStore';
import type { FileMetadata } from '../../src/types';

vi.mock('fs/promises');

describe('MetadataStore', () => {
  let metadataStore: MetadataStore;
  const testStorePath = '/test/metadata.json';
  // Partial mock of fs/promises for testing (explicit unknown cast)
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

  const createMockFileMetadata = (id: string, shotName = '', keywords: string[] = []): FileMetadata => ({
    id,
    originalFilename: `${id}.jpg`,
    currentFilename: shotName ? `${id}-${shotName}.jpg` : `${id}.jpg`,
    filePath: `/path/${id}.jpg`,
    extension: '.jpg',
    shotName,
    keywords,
    processedByAI: false,
    fileType: 'image',
    createdAt: new Date('2024-01-01'),
    createdBy: 'ingest-assistant',
    modifiedAt: new Date('2024-01-01'),
    modifiedBy: 'ingest-assistant',
    version: '2.0',
    location: '',
    subject: '',
    action: '',
    shotType: '',
    lockedFields: [],
  });

  describe('loadMetadata', () => {
    it('should load metadata from JSON file', async () => {
      const mockData = {
        'EB001537': createMockFileMetadata('EB001537', 'oven-control-panel', ['oven']),
      };
      mockFs.readFile.mockResolvedValue(JSON.stringify(mockData));

      const metadata = await metadataStore.loadMetadata();

      expect(metadata).toHaveProperty('EB001537');
      expect(metadata['EB001537'].shotName).toBe('oven-control-panel');
    });

    it('should return empty object if file does not exist', async () => {
      mockFs.readFile.mockRejectedValue({ code: 'ENOENT' });

      const metadata = await metadataStore.loadMetadata();

      expect(metadata).toEqual({});
    });

    it('should throw error for invalid JSON', async () => {
      mockFs.readFile.mockResolvedValue('{invalid json}');

      await expect(metadataStore.loadMetadata()).rejects.toThrow();
    });

    it('should handle v1.0 JSON files without keywords field (Issue: undefined crash)', async () => {
      // Simulate legacy v1.0 JSON file WITHOUT keywords field
      const legacyV1Data = {
        _schema: '1.0',
        'EB001537': {
          id: 'EB001537',
          originalFilename: 'EB001537.jpg',
          currentFilename: 'EB001537.jpg',
          filePath: '/path/EB001537.jpg',
          extension: '.jpg',
          shotName: 'kitchen-oven',
          // NOTE: No keywords field - this causes the bug
          processedByAI: false,
          fileType: 'image' as const,
          createdAt: '2024-01-01T00:00:00Z',
          createdBy: 'ingest-assistant',
          modifiedAt: '2024-01-01T00:00:00Z',
          modifiedBy: 'ingest-assistant',
          version: '1.0',
          location: '',
          subject: '',
          action: '',
          shotType: '',
        }
      };

      mockFs.readFile.mockResolvedValue(JSON.stringify(legacyV1Data));

      const metadata = await metadataStore.loadMetadata();

      // Should not crash, and keywords should be initialized to empty array
      expect(metadata['EB001537']).toBeDefined();
      expect(metadata['EB001537'].keywords).toBeDefined();
      expect(Array.isArray(metadata['EB001537'].keywords)).toBe(true);
      expect(metadata['EB001537'].keywords).toEqual([]);
    });

    it('should mark v1.0 JSON files as outdated', async () => {
      const legacyV1Data = {
        _schema: '1.0',
        'EB001537': {
          id: 'EB001537',
          originalFilename: 'EB001537.jpg',
          currentFilename: 'EB001537.jpg',
          filePath: '/path/EB001537.jpg',
          extension: '.jpg',
          shotName: 'kitchen-oven',
          keywords: [],
          processedByAI: false,
          fileType: 'image' as const,
          createdAt: '2024-01-01T00:00:00Z',
          createdBy: 'ingest-assistant',
          modifiedAt: '2024-01-01T00:00:00Z',
          modifiedBy: 'ingest-assistant',
          version: '1.0',
          location: '',
          subject: '',
          action: '',
          shotType: '',
        }
      };

      mockFs.readFile.mockResolvedValue(JSON.stringify(legacyV1Data));

      const metadata = await metadataStore.loadMetadata();

      // Should mark file as outdated
      expect(metadata['EB001537'].isOutdated).toBe(true);
    });
  });

  describe('saveMetadata', () => {
    it('should save metadata as JSON', async () => {
      const metadata = {
        'EB001537': createMockFileMetadata('EB001537', 'test', ['tag1']),
      };

      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);

      const result = await metadataStore.saveMetadata(metadata);

      expect(result).toBe(true);
      expect(mockFs.writeFile).toHaveBeenCalled();
      const writeCall = mockFs.writeFile.mock.calls[0];
      expect(writeCall[0]).toBe(testStorePath);

      const savedData = JSON.parse(writeCall[1]);
      expect(savedData['EB001537'].shotName).toBe('test');
    });

    it('should return false on write error', async () => {
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockRejectedValue(new Error('Write failed'));

      const result = await metadataStore.saveMetadata({});

      expect(result).toBe(false);
    });
  });

  describe('getFileMetadata', () => {
    it('should return metadata for specific file', async () => {
      const mockData = {
        'EB001537': createMockFileMetadata('EB001537', 'test-name', ['tag']),
      };
      mockFs.readFile.mockResolvedValue(JSON.stringify(mockData));

      const fileMetadata = await metadataStore.getFileMetadata('EB001537');

      expect(fileMetadata).toBeDefined();
      expect(fileMetadata?.shotName).toBe('test-name');
    });

    it('should return null for non-existent file', async () => {
      mockFs.readFile.mockResolvedValue(JSON.stringify({}));

      const fileMetadata = await metadataStore.getFileMetadata('NOTFOUND');

      expect(fileMetadata).toBeNull();
    });
  });

  describe('updateFileMetadata', () => {
    it('should update existing file metadata', async () => {
      const existing = {
        'EB001537': createMockFileMetadata('EB001537'),
      };
      mockFs.readFile.mockResolvedValue(JSON.stringify(existing));
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);

      const updated = createMockFileMetadata('EB001537', 'new-name', ['new-tag']);
      const result = await metadataStore.updateFileMetadata('EB001537', updated);

      expect(result).toBe(true);
      expect(mockFs.writeFile).toHaveBeenCalled();

      const writeCall = mockFs.writeFile.mock.calls[0];
      const savedData = JSON.parse(writeCall[1]);
      expect(savedData['EB001537'].shotName).toBe('new-name');
    });

    it('should create new entry if file does not exist', async () => {
      mockFs.readFile.mockResolvedValue(JSON.stringify({}));
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);

      const newFile = createMockFileMetadata('NEW00001', 'test', []);
      const result = await metadataStore.updateFileMetadata('NEW00001', newFile);

      expect(result).toBe(true);
      const writeCall = mockFs.writeFile.mock.calls[0];
      const savedData = JSON.parse(writeCall[1]);
      expect(savedData['NEW00001']).toBeDefined();
    });
  });
});
