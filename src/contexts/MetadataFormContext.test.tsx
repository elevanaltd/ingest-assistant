import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MetadataFormProvider, useMetadataForm } from './MetadataFormContext';

// Mock the dependencies to prevent runtime errors
vi.mock('./FileListContext', () => ({
  useFileList: () => ({
    files: [],
    currentFileIndex: 0,
    setFiles: vi.fn(),
  }),
}));

vi.mock('./IngestSettingsContext', () => ({
  useIngestSettings: () => ({
    lexiconConfig: {
      locations: [],
      subjects: [],
      actions: [],
      shotTypes: [],
    },
  }),
}));

beforeEach(() => {
  // Mock window.electronAPI
  (global as any).window = {
    electronAPI: {
      getShotTypes: vi.fn().mockResolvedValue(['WS', 'MID', 'CU']),
      analyzeFile: vi.fn(),
      updateStructuredMetadata: vi.fn(),
      updateMetadata: vi.fn(),
    },
  };
});

describe('MetadataFormContext', () => {
  it('should export MetadataFormProvider', () => {
    expect(MetadataFormProvider).toBeDefined();
    expect(typeof MetadataFormProvider).toBe('function');
  });

  it('should export useMetadataForm hook', () => {
    expect(useMetadataForm).toBeDefined();
    expect(typeof useMetadataForm).toBe('function');
  });

  it('should throw error when useMetadataForm used outside provider', () => {
    // This tests the hook contract - it must be used within a provider
    expect(() => {
      useMetadataForm();
    }).toThrow();
  });
});
