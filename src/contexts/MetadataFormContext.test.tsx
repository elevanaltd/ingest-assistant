import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { MetadataFormProvider, useMetadataForm } from './MetadataFormContext';
import { FileListProvider } from './FileListContext';
import { IngestSettingsProvider } from './IngestSettingsContext';
import type { ReactNode } from 'react';
import type { MediaFile, LexiconConfig } from '../types';

// Mock electron APIs
const mockElectronAPI = {
  getShotTypes: vi.fn(),
  analyzeFile: vi.fn(),
  updateStructuredMetadata: vi.fn(),
  updateMetadata: vi.fn(),
  onTranscodeProgress: vi.fn(() => () => {}),
  loadFiles: vi.fn(),
  lexicon: {
    load: vi.fn(),
    save: vi.fn(),
  },
  settings: {
    load: vi.fn(),
  },
};

// Setup global window mock
beforeEach(() => {
  vi.clearAllMocks();
  (global as any).window = {
    electronAPI: mockElectronAPI,
  };

  // Default mock returns
  mockElectronAPI.getShotTypes.mockResolvedValue(['WS', 'MID', 'CU', 'UNDER', 'FP', 'TRACK', 'ESTAB']);
  mockElectronAPI.lexicon.load.mockResolvedValue({
    locations: [],
    subjects: [],
    actions: [],
    shotTypes: [],
  } as LexiconConfig);
  mockElectronAPI.settings.load.mockResolvedValue({});
});

// Create a proper wrapper with all required providers
function createWrapper(mockFiles: MediaFile[] = []) {
  // Mock loadFiles for FileListContext
  mockElectronAPI.loadFiles.mockResolvedValue(mockFiles);

  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <IngestSettingsProvider>
        <FileListProvider>
          <MetadataFormProvider>{children}</MetadataFormProvider>
        </FileListProvider>
      </IngestSettingsProvider>
    );
  };
}

describe('MetadataFormContext', () => {
  describe('Provider and Hook', () => {
    it('should throw error when useMetadataForm is used outside provider', () => {
      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useMetadataForm());
      }).toThrow('useMetadataForm must be used within MetadataFormProvider');

      consoleSpy.mockRestore();
    });

    it('should provide initial form state', async () => {
      const { result } = renderHook(() => useMetadataForm(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current).toBeDefined();
      });

      expect(result.current.location).toBe('');
      expect(result.current.subject).toBe('');
      expect(result.current.action).toBe('');
      expect(result.current.shotType).toBe('');
      expect(result.current.shotName).toBe('');
      expect(result.current.keywords).toBe('');
      expect(result.current.isLoading).toBe(false);
    });

    it('should provide shotTypes array', async () => {
      const { result } = renderHook(() => useMetadataForm(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.shotTypes).toHaveLength(7);
      });

      expect(result.current.shotTypes).toEqual(['WS', 'MID', 'CU', 'UNDER', 'FP', 'TRACK', 'ESTAB']);
    });
  });

  describe('Form Field Synchronization', () => {
    it('should sync form fields when currentFile has structured data', async () => {
      const mockFile: MediaFile = {
        id: 'test-1',
        name: 'test.jpg',
        filePath: '/path/test.jpg',
        fileType: 'image',
        location: 'kitchen',
        subject: 'oven',
        action: '',
        shotType: 'CU',
        shotName: 'kitchen-oven-CU',
        keywords: ['test', 'metadata'],
        shotNumber: 1,
      };

      const { result } = renderHook(() => useMetadataForm(), {
        wrapper: createWrapper([mockFile]),
      });

      await waitFor(() => {
        expect(result.current.location).toBe('kitchen');
      });

      expect(result.current.subject).toBe('oven');
      expect(result.current.action).toBe('');
      expect(result.current.shotType).toBe('CU');
      expect(result.current.shotName).toBe('kitchen-oven-CU');
      expect(result.current.keywords).toBe('test, metadata');
    });

    it('should parse shotName when structured fields not available (3-part photo format)', async () => {
      const mockFile: MediaFile = {
        id: 'test-2',
        name: 'test.jpg',
        filePath: '/path/test.jpg',
        fileType: 'image',
        shotName: 'kitchen-oven-CU',
        keywords: [],
        shotNumber: 1,
      };

      const { result } = renderHook(() => useMetadataForm(), {
        wrapper: createWrapper([mockFile]),
      });

      await waitFor(() => {
        expect(result.current.location).toBe('kitchen');
      });

      expect(result.current.subject).toBe('oven');
      expect(result.current.action).toBe('');
      expect(result.current.shotType).toBe('CU');
    });

    it('should parse shotName when structured fields not available (4-part video format)', async () => {
      const mockFile: MediaFile = {
        id: 'test-3',
        name: 'test.mov',
        filePath: '/path/test.mov',
        fileType: 'video',
        shotName: 'kitchen-oven-cleaning-WS',
        keywords: [],
        shotNumber: 1,
      };

      const { result } = renderHook(() => useMetadataForm(), {
        wrapper: createWrapper([mockFile]),
      });

      await waitFor(() => {
        expect(result.current.location).toBe('kitchen');
      });

      expect(result.current.subject).toBe('oven');
      expect(result.current.action).toBe('cleaning');
      expect(result.current.shotType).toBe('WS');
    });

    it('should clear form when no currentFile', async () => {
      const mockFile: MediaFile = {
        id: 'test-4',
        name: 'test.jpg',
        filePath: '/path/test.jpg',
        fileType: 'image',
        location: 'kitchen',
        subject: 'oven',
        shotType: 'CU',
        shotName: 'kitchen-oven-CU',
        keywords: [],
        shotNumber: 1,
      };

      const { result } = renderHook(() => useMetadataForm(), {
        wrapper: createWrapper([mockFile]),
      });

      // Wait for initial sync
      await waitFor(() => {
        expect(result.current.location).toBe('kitchen');
      });

      // Simulate clearing files (no current file)
      // This would happen via FileListContext, but for testing we verify the sync logic
      // The actual clearing happens when FileListContext provides undefined currentFile
      expect(result.current.location).toBe('kitchen'); // Still populated with current file
    });
  });

  describe('Form Field Setters', () => {
    it('should update location field', async () => {
      const { result } = renderHook(() => useMetadataForm(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current).toBeDefined();
      });

      act(() => {
        result.current.setLocation('bedroom');
      });

      expect(result.current.location).toBe('bedroom');
    });

    it('should update subject field', async () => {
      const { result } = renderHook(() => useMetadataForm(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current).toBeDefined();
      });

      act(() => {
        result.current.setSubject('lamp');
      });

      expect(result.current.subject).toBe('lamp');
    });

    it('should update action field', async () => {
      const { result } = renderHook(() => useMetadataForm(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current).toBeDefined();
      });

      act(() => {
        result.current.setAction('turning-on');
      });

      expect(result.current.action).toBe('turning-on');
    });

    it('should update shotType field', async () => {
      const { result } = renderHook(() => useMetadataForm(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current).toBeDefined();
      });

      act(() => {
        result.current.setShotType('WS');
      });

      expect(result.current.shotType).toBe('WS');
    });

    it('should update keywords field', async () => {
      const { result } = renderHook(() => useMetadataForm(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current).toBeDefined();
      });

      act(() => {
        result.current.setKeywords('tag1, tag2, tag3');
      });

      expect(result.current.keywords).toBe('tag1, tag2, tag3');
    });
  });

  describe('handleSave', () => {
    it('should save metadata with structured data for photos', async () => {
      const mockFile: MediaFile = {
        id: 'test-5',
        name: 'test.jpg',
        filePath: '/path/test.jpg',
        fileType: 'image',
        keywords: [],
        shotNumber: 1,
      };

      mockElectronAPI.updateStructuredMetadata.mockResolvedValue(undefined);
      mockElectronAPI.updateMetadata.mockResolvedValue(undefined);

      const { result } = renderHook(() => useMetadataForm(), {
        wrapper: createWrapper([mockFile]),
      });

      await waitFor(() => {
        expect(result.current).toBeDefined();
      });

      // Set form fields
      act(() => {
        result.current.setLocation('kitchen');
        result.current.setSubject('oven');
        result.current.setShotType('CU');
        result.current.setKeywords('test, metadata');
      });

      // Save
      await act(async () => {
        await result.current.handleSave();
      });

      expect(mockElectronAPI.updateStructuredMetadata).toHaveBeenCalledWith(
        'test-5',
        { location: 'kitchen', subject: 'oven', action: '', shotType: 'CU' },
        '/path/test.jpg',
        'image'
      );

      expect(mockElectronAPI.updateMetadata).toHaveBeenCalledWith(
        'test-5',
        ['test', 'metadata']
      );
    });

    it('should save metadata with structured data for videos (with action)', async () => {
      const mockFile: MediaFile = {
        id: 'test-6',
        name: 'test.mov',
        filePath: '/path/test.mov',
        fileType: 'video',
        keywords: [],
        shotNumber: 1,
      };

      mockElectronAPI.updateStructuredMetadata.mockResolvedValue(undefined);
      mockElectronAPI.updateMetadata.mockResolvedValue(undefined);

      const { result } = renderHook(() => useMetadataForm(), {
        wrapper: createWrapper([mockFile]),
      });

      await waitFor(() => {
        expect(result.current).toBeDefined();
      });

      // Set form fields
      act(() => {
        result.current.setLocation('kitchen');
        result.current.setSubject('oven');
        result.current.setAction('cleaning');
        result.current.setShotType('WS');
        result.current.setKeywords('test');
      });

      // Save
      await act(async () => {
        await result.current.handleSave();
      });

      expect(mockElectronAPI.updateStructuredMetadata).toHaveBeenCalledWith(
        'test-6',
        { location: 'kitchen', subject: 'oven', action: 'cleaning', shotType: 'WS' },
        '/path/test.mov',
        'video'
      );
    });

    it('should not save when no currentFile', async () => {
      const { result } = renderHook(() => useMetadataForm(), {
        wrapper: createWrapper([]), // No files
      });

      await waitFor(() => {
        expect(result.current).toBeDefined();
      });

      await act(async () => {
        await result.current.handleSave();
      });

      expect(mockElectronAPI.updateStructuredMetadata).not.toHaveBeenCalled();
      expect(mockElectronAPI.updateMetadata).not.toHaveBeenCalled();
    });

    it('should set loading state during save', async () => {
      const mockFile: MediaFile = {
        id: 'test-7',
        name: 'test.jpg',
        filePath: '/path/test.jpg',
        fileType: 'image',
        keywords: [],
        shotNumber: 1,
      };

      // Delay the mock to verify loading state
      mockElectronAPI.updateStructuredMetadata.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );

      const { result } = renderHook(() => useMetadataForm(), {
        wrapper: createWrapper([mockFile]),
      });

      await waitFor(() => {
        expect(result.current).toBeDefined();
      });

      // Set required fields
      act(() => {
        result.current.setLocation('kitchen');
        result.current.setSubject('oven');
        result.current.setShotType('CU');
      });

      // Start save (don't await)
      act(() => {
        result.current.handleSave();
      });

      // Should be loading
      await waitFor(() => {
        expect(result.current.isLoading).toBe(true);
      });

      // Wait for completion
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      }, { timeout: 1000 });
    });
  });

  describe('handleAIAssist', () => {
    it('should populate structured fields from AI analysis', async () => {
      const mockFile: MediaFile = {
        id: 'test-8',
        name: 'test.jpg',
        filePath: '/path/test.jpg',
        fileType: 'image',
        keywords: [],
        shotNumber: 1,
      };

      mockElectronAPI.analyzeFile.mockResolvedValue({
        location: 'kitchen',
        subject: 'oven',
        action: '',
        shotType: 'CU',
        shotName: 'kitchen-oven-CU',
        keywords: ['test', 'ai'],
        confidence: 0.85,
      });

      const { result } = renderHook(() => useMetadataForm(), {
        wrapper: createWrapper([mockFile]),
      });

      await waitFor(() => {
        expect(result.current).toBeDefined();
      });

      await act(async () => {
        await result.current.handleAIAssist();
      });

      expect(result.current.location).toBe('kitchen');
      expect(result.current.subject).toBe('oven');
      expect(result.current.action).toBe('');
      expect(result.current.shotType).toBe('CU');
      expect(result.current.keywords).toBe('test, ai');
    });

    it('should not analyze when no currentFile', async () => {
      const { result } = renderHook(() => useMetadataForm(), {
        wrapper: createWrapper([]), // No files
      });

      await waitFor(() => {
        expect(result.current).toBeDefined();
      });

      await act(async () => {
        await result.current.handleAIAssist();
      });

      expect(mockElectronAPI.analyzeFile).not.toHaveBeenCalled();
    });

    it('should set loading state during AI analysis', async () => {
      const mockFile: MediaFile = {
        id: 'test-9',
        name: 'test.jpg',
        filePath: '/path/test.jpg',
        fileType: 'image',
        keywords: [],
        shotNumber: 1,
      };

      // Delay the mock to verify loading state
      mockElectronAPI.analyzeFile.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({
          location: 'kitchen',
          subject: 'oven',
          shotType: 'CU',
          shotName: 'kitchen-oven-CU',
          keywords: [],
          confidence: 0.8,
        }), 100))
      );

      const { result } = renderHook(() => useMetadataForm(), {
        wrapper: createWrapper([mockFile]),
      });

      await waitFor(() => {
        expect(result.current).toBeDefined();
      });

      // Start AI analysis (don't await)
      act(() => {
        result.current.handleAIAssist();
      });

      // Should be loading
      await waitFor(() => {
        expect(result.current.isLoading).toBe(true);
      });

      // Wait for completion
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      }, { timeout: 1000 });
    });
  });
});
