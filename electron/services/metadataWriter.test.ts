import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { ExecException } from 'child_process';

// Create a mock execAsync function that will be used by metadataWriter
const mockExecAsync = vi.fn<[string], Promise<{ stdout: string; stderr: string }>>();

// Mock child_process module
vi.mock('child_process', async (importOriginal) => {
  const actual = await importOriginal<typeof import('child_process')>();

  // Create a callback-style function that uses our mock promise
  const mockExecCallback = (cmd: string, callback: (error: ExecException | null, result: { stdout: string; stderr: string } | null) => void) => {
    mockExecAsync(cmd)
      .then((result) => callback(null, result))
      .catch((error) => callback(error, null));
  };

  return {
    ...actual,
    exec: mockExecCallback as any,
  };
});

import { MetadataWriter } from './metadataWriter';

describe('MetadataWriter', () => {
  let metadataWriter: MetadataWriter;

  beforeEach(() => {
    vi.clearAllMocks();
    metadataWriter = new MetadataWriter();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('writeMetadataToFile', () => {
    const testFilePath = '/test/path/EB001537.jpg';
    const testMainName = 'oven-control-panel';
    const testTags = ['kitchen', 'appliance', 'oven'];

    it('should write metadata with mainName and tags', async () => {
      mockExecAsync.mockResolvedValue({ stdout: '', stderr: '1 image files updated' });

      await metadataWriter.writeMetadataToFile(testFilePath, testMainName, testTags);

      expect(mockExecAsync).toHaveBeenCalledTimes(1);
      const calledCommand = mockExecAsync.mock.calls[0][0];

      // Verify command includes mainName
      expect(calledCommand).toContain(`-Title="${testMainName}"`);
      expect(calledCommand).toContain(`-XMP:Title="${testMainName}"`);
      expect(calledCommand).toContain(`-IPTC:ObjectName="${testMainName}"`);

      // Verify command includes tags
      const tagsStr = testTags.join(', ');
      expect(calledCommand).toContain(`-Keywords="${tagsStr}"`);
      expect(calledCommand).toContain(`-XMP:Subject="${tagsStr}"`);
      expect(calledCommand).toContain(`-IPTC:Keywords="${tagsStr}"`);

      // Verify command includes description
      const description = `${testMainName} - ${tagsStr}`;
      expect(calledCommand).toContain(`-Description="${description}"`);

      // Verify overwrite flag
      expect(calledCommand).toContain('-overwrite_original');

      // Verify file path
      expect(calledCommand).toContain(`"${testFilePath}"`);
    });

    it('should write metadata with mainName only', async () => {
      mockExecAsync.mockResolvedValue({ stdout: '', stderr: '1 image files updated' });

      await metadataWriter.writeMetadataToFile(testFilePath, testMainName, []);

      expect(mockExecAsync).toHaveBeenCalledTimes(1);
      const calledCommand = mockExecAsync.mock.calls[0][0];

      expect(calledCommand).toContain(`-Title="${testMainName}"`);
      expect(calledCommand).toContain(`-Description="${testMainName}"`);
      expect(calledCommand).not.toContain('-Keywords=');
    });

    it('should write metadata with tags only', async () => {
      mockExecAsync.mockResolvedValue({ stdout: '', stderr: '1 image files updated' });

      await metadataWriter.writeMetadataToFile(testFilePath, '', testTags);

      expect(mockExecAsync).toHaveBeenCalledTimes(1);
      const calledCommand = mockExecAsync.mock.calls[0][0];

      const tagsStr = testTags.join(', ');
      expect(calledCommand).toContain(`-Keywords="${tagsStr}"`);
      expect(calledCommand).not.toContain('-Title=');
    });

    it('should handle empty mainName and tags', async () => {
      mockExecAsync.mockResolvedValue({ stdout: '', stderr: '1 image files updated' });

      await metadataWriter.writeMetadataToFile(testFilePath, '', []);

      expect(mockExecAsync).toHaveBeenCalledTimes(1);
      const calledCommand = mockExecAsync.mock.calls[0][0];

      // Should still include description (empty in this case)
      expect(calledCommand).toContain('-Description=""');
      expect(calledCommand).toContain('-overwrite_original');
    });

    it('should handle stderr that includes success message', async () => {
      mockExecAsync.mockResolvedValue({ stdout: '', stderr: '1 image files updated\nSome other output' });

      // Should not throw
      await expect(
        metadataWriter.writeMetadataToFile(testFilePath, testMainName, testTags)
      ).resolves.toBeUndefined();
    });

    it('should throw error when exiftool command fails', async () => {
      const testError = new Error('exiftool not found');
      mockExecAsync.mockRejectedValue(testError);

      await expect(
        metadataWriter.writeMetadataToFile(testFilePath, testMainName, testTags)
      ).rejects.toThrow('exiftool not found');
    });

    it('should handle stderr without success message', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      mockExecAsync.mockResolvedValue({ stdout: '', stderr: 'Warning: something happened' });

      await metadataWriter.writeMetadataToFile(testFilePath, testMainName, testTags);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'exiftool stderr:',
        'Warning: something happened'
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe('readMetadataFromFile', () => {
    const testFilePath = '/test/path/EB001537.jpg';

    it('should read metadata from file successfully', async () => {
      const mockMetadata = {
        Title: 'oven-control-panel',
        Keywords: ['kitchen', 'appliance', 'oven'],
        Description: 'oven-control-panel - kitchen, appliance, oven',
      };

      mockExecAsync.mockResolvedValue({ stdout: JSON.stringify([mockMetadata]), stderr: '' });

      const result = await metadataWriter.readMetadataFromFile(testFilePath);

      expect(mockExecAsync).toHaveBeenCalledTimes(1);
      const calledCommand = mockExecAsync.mock.calls[0][0];
      expect(calledCommand).toContain('exiftool');
      expect(calledCommand).toContain('-Title');
      expect(calledCommand).toContain('-Keywords');
      expect(calledCommand).toContain('-Description');
      expect(calledCommand).toContain('-json');
      expect(calledCommand).toContain(`"${testFilePath}"`);

      expect(result).toEqual({
        title: 'oven-control-panel',
        keywords: ['kitchen', 'appliance', 'oven'],
        description: 'oven-control-panel - kitchen, appliance, oven',
      });
    });

    it('should handle keywords as single string', async () => {
      const mockMetadata = {
        Title: 'test',
        Keywords: 'single-keyword',
        Description: 'test description',
      };

      mockExecAsync.mockResolvedValue({ stdout: JSON.stringify([mockMetadata]), stderr: '' });

      const result = await metadataWriter.readMetadataFromFile(testFilePath);

      expect(result.keywords).toEqual(['single-keyword']);
    });

    it('should handle missing keywords', async () => {
      const mockMetadata = {
        Title: 'test',
        Description: 'test description',
      };

      mockExecAsync.mockResolvedValue({ stdout: JSON.stringify([mockMetadata]), stderr: '' });

      const result = await metadataWriter.readMetadataFromFile(testFilePath);

      expect(result.keywords).toEqual([]);
    });

    it('should handle partial metadata', async () => {
      const mockMetadata = {
        Title: 'test-title',
      };

      mockExecAsync.mockResolvedValue({ stdout: JSON.stringify([mockMetadata]), stderr: '' });

      const result = await metadataWriter.readMetadataFromFile(testFilePath);

      expect(result).toEqual({
        title: 'test-title',
        keywords: [],
        description: undefined,
      });
    });

    it('should return empty object when no metadata found', async () => {
      mockExecAsync.mockResolvedValue({ stdout: '[]', stderr: '' });

      const result = await metadataWriter.readMetadataFromFile(testFilePath);

      expect(result).toEqual({});
    });

    it('should return empty object on exiftool error', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const testError = new Error('File not found');

      mockExecAsync.mockRejectedValue(testError);

      const result = await metadataWriter.readMetadataFromFile(testFilePath);

      expect(result).toEqual({});
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to read metadata from file:',
        testError
      );

      consoleErrorSpy.mockRestore();
    });

    it('should handle invalid JSON response', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      mockExecAsync.mockResolvedValue({ stdout: 'invalid json', stderr: '' });

      const result = await metadataWriter.readMetadataFromFile(testFilePath);

      expect(result).toEqual({});
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });
});
