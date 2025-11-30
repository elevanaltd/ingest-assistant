import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { FileListProvider, useFileList } from './FileListContext';
import type { FileMetadata } from '../types';

// Mock electronAPI
const mockElectronAPI = {
  selectFolder: vi.fn(),
  loadFiles: vi.fn(),
  getFolderCompleted: vi.fn(),
  setFolderCompleted: vi.fn(),
};

// Helper to create complete FileMetadata objects
function createMockFile(partial: Partial<FileMetadata>): FileMetadata {
  return {
    id: 'test-id',
    originalFilename: 'test.jpg',
    currentFilename: 'test.jpg',
    filePath: '/test/test.jpg',
    extension: 'jpg',
    fileType: 'image',
    shotName: '',
    keywords: [],
    lockedFields: [],
    location: '',
    subject: '',
    action: '',
    shotType: '',
    processedByAI: false,
    createdAt: new Date(),
    createdBy: 'test',
    modifiedAt: new Date(),
    modifiedBy: 'test',
    version: '1.0.0',
    ...partial,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  (window as any).electronAPI = mockElectronAPI;
});

describe('FileListContext', () => {
  describe('initial state', () => {
    it('should provide empty initial state', () => {
      const { result } = renderHook(() => useFileList(), {
        wrapper: FileListProvider,
      });

      expect(result.current.folderPath).toBe('');
      expect(result.current.files).toEqual([]);
      expect(result.current.currentFileIndex).toBe(0);
      expect(result.current.selectedFileIds).toEqual(new Set());
      expect(result.current.isFolderCompleted).toBe(false);
      expect(result.current.isFolderLoading).toBe(false);
    });
  });

  describe('handleSelectFolder', () => {
    it('should load folder and files when path is selected', async () => {
      const mockFiles: FileMetadata[] = [
        createMockFile({ id: 'test-1', filePath: '/test/file1.jpg', originalFilename: 'file1.jpg', currentFilename: 'file1.jpg', shotNumber: 1 }),
        createMockFile({ id: 'test-2', filePath: '/test/file2.jpg', originalFilename: 'file2.jpg', currentFilename: 'file2.jpg', shotNumber: 2 }),
      ];

      mockElectronAPI.selectFolder.mockResolvedValue('/test/folder');
      mockElectronAPI.loadFiles.mockResolvedValue(mockFiles);
      mockElectronAPI.getFolderCompleted.mockResolvedValue(false);

      const { result } = renderHook(() => useFileList(), {
        wrapper: FileListProvider,
      });

      await act(async () => {
        await result.current.handleSelectFolder();
      });

      expect(result.current.folderPath).toBe('/test/folder');
      expect(result.current.files).toEqual(mockFiles);
      expect(result.current.currentFileIndex).toBe(0);
      expect(result.current.isFolderCompleted).toBe(false);
    });

    it('should set isFolderLoading to false after folder selection completes', async () => {
      mockElectronAPI.selectFolder.mockResolvedValue('/test/folder');
      mockElectronAPI.loadFiles.mockResolvedValue([]);
      mockElectronAPI.getFolderCompleted.mockResolvedValue(false);

      const { result } = renderHook(() => useFileList(), {
        wrapper: FileListProvider,
      });

      await act(async () => {
        await result.current.handleSelectFolder();
      });

      // Check loading state is false after completion
      expect(result.current.isFolderLoading).toBe(false);
    });

    it('should clear selection when switching folders', async () => {
      mockElectronAPI.selectFolder.mockResolvedValue('/test/folder');
      mockElectronAPI.loadFiles.mockResolvedValue([]);
      mockElectronAPI.getFolderCompleted.mockResolvedValue(false);

      const { result } = renderHook(() => useFileList(), {
        wrapper: FileListProvider,
      });

      // Set initial selection
      act(() => {
        result.current.handleToggleSelection('test-1', true);
      });

      expect(result.current.selectedFileIds.has('test-1')).toBe(true);

      // Select new folder
      await act(async () => {
        await result.current.handleSelectFolder();
      });

      // Selection should be cleared
      expect(result.current.selectedFileIds.size).toBe(0);
    });

    it('should handle null folder path (user cancels)', async () => {
      mockElectronAPI.selectFolder.mockResolvedValue(null);

      const { result } = renderHook(() => useFileList(), {
        wrapper: FileListProvider,
      });

      await act(async () => {
        await result.current.handleSelectFolder();
      });

      // State should remain unchanged
      expect(result.current.folderPath).toBe('');
      expect(result.current.files).toEqual([]);
    });

    it('should load folder completion status', async () => {
      mockElectronAPI.selectFolder.mockResolvedValue('/test/folder');
      mockElectronAPI.loadFiles.mockResolvedValue([]);
      mockElectronAPI.getFolderCompleted.mockResolvedValue(true);

      const { result } = renderHook(() => useFileList(), {
        wrapper: FileListProvider,
      });

      await act(async () => {
        await result.current.handleSelectFolder();
      });

      expect(result.current.isFolderCompleted).toBe(true);
    });

    it('should default to false if folder completion status fails to load', async () => {
      mockElectronAPI.selectFolder.mockResolvedValue('/test/folder');
      mockElectronAPI.loadFiles.mockResolvedValue([]);
      mockElectronAPI.getFolderCompleted.mockRejectedValue(new Error('Failed to load'));

      const { result } = renderHook(() => useFileList(), {
        wrapper: FileListProvider,
      });

      await act(async () => {
        await result.current.handleSelectFolder();
      });

      expect(result.current.isFolderCompleted).toBe(false);
    });
  });

  describe('handleToggleSelection', () => {
    it('should add file to selection', () => {
      const { result } = renderHook(() => useFileList(), {
        wrapper: FileListProvider,
      });

      act(() => {
        result.current.handleToggleSelection('file-1', true);
      });

      expect(result.current.selectedFileIds.has('file-1')).toBe(true);
    });

    it('should remove file from selection', () => {
      const { result } = renderHook(() => useFileList(), {
        wrapper: FileListProvider,
      });

      act(() => {
        result.current.handleToggleSelection('file-1', true);
        result.current.handleToggleSelection('file-2', true);
      });

      expect(result.current.selectedFileIds.size).toBe(2);

      act(() => {
        result.current.handleToggleSelection('file-1', false);
      });

      expect(result.current.selectedFileIds.has('file-1')).toBe(false);
      expect(result.current.selectedFileIds.has('file-2')).toBe(true);
    });
  });

  describe('handleNext', () => {
    it('should increment currentFileIndex', async () => {
      const mockFiles: FileMetadata[] = [
        createMockFile({ id: '1', filePath: '/test/1.jpg', originalFilename: '1.jpg', currentFilename: '1.jpg', shotNumber: 1 }),
        createMockFile({ id: '2', filePath: '/test/2.jpg', originalFilename: '2.jpg', currentFilename: '2.jpg', shotNumber: 2 }),
      ];

      mockElectronAPI.selectFolder.mockResolvedValue('/test');
      mockElectronAPI.loadFiles.mockResolvedValue(mockFiles);
      mockElectronAPI.getFolderCompleted.mockResolvedValue(false);

      const { result } = renderHook(() => useFileList(), {
        wrapper: FileListProvider,
      });

      await act(async () => {
        await result.current.handleSelectFolder();
      });

      expect(result.current.currentFileIndex).toBe(0);

      act(() => {
        result.current.handleNext();
      });

      expect(result.current.currentFileIndex).toBe(1);
    });

    it('should not increment beyond last file', async () => {
      const mockFiles: FileMetadata[] = [
        createMockFile({ id: '1', filePath: '/test/1.jpg', originalFilename: '1.jpg', currentFilename: '1.jpg', shotNumber: 1 }),
      ];

      mockElectronAPI.selectFolder.mockResolvedValue('/test');
      mockElectronAPI.loadFiles.mockResolvedValue(mockFiles);
      mockElectronAPI.getFolderCompleted.mockResolvedValue(false);

      const { result } = renderHook(() => useFileList(), {
        wrapper: FileListProvider,
      });

      await act(async () => {
        await result.current.handleSelectFolder();
      });

      act(() => {
        result.current.handleNext();
      });

      expect(result.current.currentFileIndex).toBe(0);
    });
  });

  describe('handlePrevious', () => {
    it('should decrement currentFileIndex', async () => {
      const mockFiles: FileMetadata[] = [
        createMockFile({ id: '1', filePath: '/test/1.jpg', originalFilename: '1.jpg', currentFilename: '1.jpg', shotNumber: 1 }),
        createMockFile({ id: '2', filePath: '/test/2.jpg', originalFilename: '2.jpg', currentFilename: '2.jpg', shotNumber: 2 }),
      ];

      mockElectronAPI.selectFolder.mockResolvedValue('/test');
      mockElectronAPI.loadFiles.mockResolvedValue(mockFiles);
      mockElectronAPI.getFolderCompleted.mockResolvedValue(false);

      const { result } = renderHook(() => useFileList(), {
        wrapper: FileListProvider,
      });

      await act(async () => {
        await result.current.handleSelectFolder();
      });

      // Move to second file first
      act(() => {
        result.current.handleNext();
      });

      expect(result.current.currentFileIndex).toBe(1);

      // Go back to first file
      act(() => {
        result.current.handlePrevious();
      });

      expect(result.current.currentFileIndex).toBe(0);
    });

    it('should not decrement below 0', () => {
      const { result } = renderHook(() => useFileList(), {
        wrapper: FileListProvider,
      });

      act(() => {
        result.current.handlePrevious();
      });

      expect(result.current.currentFileIndex).toBe(0);
    });
  });

  describe('handleCompleteFolder', () => {
    it('should mark folder as completed', async () => {
      mockElectronAPI.selectFolder.mockResolvedValue('/test/folder');
      mockElectronAPI.loadFiles.mockResolvedValue([]);
      mockElectronAPI.getFolderCompleted.mockResolvedValue(false);
      mockElectronAPI.setFolderCompleted.mockResolvedValue(undefined);

      const { result } = renderHook(() => useFileList(), {
        wrapper: FileListProvider,
      });

      await act(async () => {
        await result.current.handleSelectFolder();
      });

      await act(async () => {
        await result.current.handleCompleteFolder();
      });

      expect(mockElectronAPI.setFolderCompleted).toHaveBeenCalledWith(true);
      expect(result.current.isFolderCompleted).toBe(true);
    });

    it('should not call API if no folder is selected', async () => {
      const { result } = renderHook(() => useFileList(), {
        wrapper: FileListProvider,
      });

      await act(async () => {
        await result.current.handleCompleteFolder();
      });

      expect(mockElectronAPI.setFolderCompleted).not.toHaveBeenCalled();
    });

    it('should re-throw errors for UI error handling', async () => {
      mockElectronAPI.selectFolder.mockResolvedValue('/test/folder');
      mockElectronAPI.loadFiles.mockResolvedValue([]);
      mockElectronAPI.getFolderCompleted.mockResolvedValue(false);
      mockElectronAPI.setFolderCompleted.mockRejectedValue(new Error('API Error'));

      const { result } = renderHook(() => useFileList(), {
        wrapper: FileListProvider,
      });

      await act(async () => {
        await result.current.handleSelectFolder();
      });

      // Error should propagate to caller (App.tsx)
      await expect(
        act(async () => {
          await result.current.handleCompleteFolder();
        })
      ).rejects.toThrow('API Error');

      // State should remain unchanged on error
      expect(result.current.isFolderCompleted).toBe(false);
    });
  });

  describe('handleReopenFolder', () => {
    it('should reopen completed folder', async () => {
      mockElectronAPI.selectFolder.mockResolvedValue('/test/folder');
      mockElectronAPI.loadFiles.mockResolvedValue([]);
      mockElectronAPI.getFolderCompleted.mockResolvedValue(true);
      mockElectronAPI.setFolderCompleted.mockResolvedValue(undefined);

      const { result } = renderHook(() => useFileList(), {
        wrapper: FileListProvider,
      });

      await act(async () => {
        await result.current.handleSelectFolder();
      });

      expect(result.current.isFolderCompleted).toBe(true);

      await act(async () => {
        await result.current.handleReopenFolder();
      });

      expect(mockElectronAPI.setFolderCompleted).toHaveBeenCalledWith(false);
      expect(result.current.isFolderCompleted).toBe(false);
    });

    it('should not call API if no folder is selected', async () => {
      const { result } = renderHook(() => useFileList(), {
        wrapper: FileListProvider,
      });

      await act(async () => {
        await result.current.handleReopenFolder();
      });

      expect(mockElectronAPI.setFolderCompleted).not.toHaveBeenCalled();
    });

    it('should re-throw errors for UI error handling', async () => {
      mockElectronAPI.selectFolder.mockResolvedValue('/test/folder');
      mockElectronAPI.loadFiles.mockResolvedValue([]);
      mockElectronAPI.getFolderCompleted.mockResolvedValue(true);
      mockElectronAPI.setFolderCompleted.mockRejectedValue(new Error('API Error'));

      const { result } = renderHook(() => useFileList(), {
        wrapper: FileListProvider,
      });

      await act(async () => {
        await result.current.handleSelectFolder();
      });

      // Error should propagate to caller (App.tsx)
      await expect(
        act(async () => {
          await result.current.handleReopenFolder();
        })
      ).rejects.toThrow('API Error');

      // State should remain unchanged on error
      expect(result.current.isFolderCompleted).toBe(true);
    });
  });

  describe('setFiles and setCurrentFileIndex', () => {
    it('should allow external updates to files array', async () => {
      const { result } = renderHook(() => useFileList(), {
        wrapper: FileListProvider,
      });

      const newFiles: FileMetadata[] = [
        createMockFile({ id: '1', filePath: '/test/1.jpg', originalFilename: '1.jpg', currentFilename: '1.jpg', shotNumber: 1 }),
      ];

      act(() => {
        result.current.setFiles(newFiles);
      });

      expect(result.current.files).toEqual(newFiles);
    });

    it('should allow external updates to currentFileIndex', () => {
      const { result } = renderHook(() => useFileList(), {
        wrapper: FileListProvider,
      });

      act(() => {
        result.current.setCurrentFileIndex(5);
      });

      expect(result.current.currentFileIndex).toBe(5);
    });
  });
});
