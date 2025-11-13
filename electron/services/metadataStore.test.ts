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

  const createMockFileMetadata = (id: string, mainName = '', keywords: string[] = []): FileMetadata => ({
    id,
    originalFilename: `${id}.jpg`,
    currentFilename: mainName ? `${id}-${mainName}.jpg` : `${id}.jpg`,
    filePath: `/path/${id}.jpg`,
    extension: '.jpg',
    mainName,
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
  });

  describe('loadMetadata', () => {
    it('should load metadata from JSON file', async () => {
      const mockData = {
        'EB001537': createMockFileMetadata('EB001537', 'oven-control-panel', ['oven']),
      };
      mockFs.readFile.mockResolvedValue(JSON.stringify(mockData));

      const metadata = await metadataStore.loadMetadata();

      expect(metadata).toHaveProperty('EB001537');
      expect(metadata['EB001537'].mainName).toBe('oven-control-panel');
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
      expect(savedData['EB001537'].mainName).toBe('test');
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
      expect(fileMetadata?.mainName).toBe('test-name');
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
      expect(savedData['EB001537'].mainName).toBe('new-name');
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
