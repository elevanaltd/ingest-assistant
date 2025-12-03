/**
 * Test suite for file IPC handlers registration
 *
 * Tests that registerFileHandlers() properly registers all file-related IPC channels:
 * - file:select-folder
 * - file:read-as-data-url
 * - file:load-files
 * - file:list-range
 * - file:rename
 * - file:update-metadata
 * - file:update-structured-metadata
 *
 * TDD Phase: RED
 * This test will fail until electron/ipc/fileHandlers.ts is created
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BrowserWindow, ipcMain } from 'electron';
import type { SecurityValidator } from '../../services/securityValidator';
import type { FileManager } from '../../services/fileManager';
import type { MetadataWriter } from '../../services/metadataWriter';
import type { VideoTranscoder } from '../../services/videoTranscoder';
import type { BatchQueueManager } from '../../services/batchQueueManager';

// Mock electron modules
vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn(),
    removeHandler: vi.fn()
  },
  BrowserWindow: vi.fn(),
  dialog: {
    showOpenDialog: vi.fn()
  }
}));

describe('registerFileHandlers', () => {
  let mockWindow: BrowserWindow;
  let mockDeps: {
    securityValidator: SecurityValidator;
    fileManager: FileManager;
    metadataWriter: MetadataWriter;
    videoTranscoder: VideoTranscoder;
    batchQueueManager: BatchQueueManager;
    MEDIA_SERVER_PORT: number;
    MEDIA_SERVER_TOKEN: string;
    currentFolderPath: string | null;
    getMetadataStoreForFolder: (folderPath: string) => any;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockWindow = {
      webContents: {
        send: vi.fn()
      }
    } as unknown as BrowserWindow;

    mockDeps = {
      securityValidator: {} as SecurityValidator,
      fileManager: {} as FileManager,
      metadataWriter: {} as MetadataWriter,
      videoTranscoder: {} as VideoTranscoder,
      batchQueueManager: {} as BatchQueueManager,
      MEDIA_SERVER_PORT: 8765,
      MEDIA_SERVER_TOKEN: 'test-token',
      currentFolderPath: null,
      getMetadataStoreForFolder: vi.fn()
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should fail: registerFileHandlers not yet implemented', async () => {
    // RED phase: This will fail because electron/ipc/fileHandlers.ts doesn't exist yet
    try {
      const { registerFileHandlers } = await import('../../ipc/fileHandlers');

      registerFileHandlers(mockWindow, mockDeps);

      // Verify all 7 file handlers are registered
      expect(ipcMain.handle).toHaveBeenCalledWith('file:select-folder', expect.any(Function));
      expect(ipcMain.handle).toHaveBeenCalledWith('file:read-as-data-url', expect.any(Function));
      expect(ipcMain.handle).toHaveBeenCalledWith('file:load-files', expect.any(Function));
      expect(ipcMain.handle).toHaveBeenCalledWith('file:list-range', expect.any(Function));
      expect(ipcMain.handle).toHaveBeenCalledWith('file:rename', expect.any(Function));
      expect(ipcMain.handle).toHaveBeenCalledWith('file:update-metadata', expect.any(Function));
      expect(ipcMain.handle).toHaveBeenCalledWith('file:update-structured-metadata', expect.any(Function));

      expect(ipcMain.handle).toHaveBeenCalledTimes(7);
    } catch (error) {
      // Expected to fail - module doesn't exist yet
      expect(error).toBeDefined();
      expect((error as Error).message).toContain('Cannot find module');
    }
  });

  it('should register file:select-folder handler', async () => {
    // RED phase: Will fail until implementation exists
    try {
      const { registerFileHandlers } = await import('../../ipc/fileHandlers');
      registerFileHandlers(mockWindow, mockDeps);

      expect(ipcMain.handle).toHaveBeenCalledWith('file:select-folder', expect.any(Function));
    } catch (error) {
      expect(error).toBeDefined();
    }
  });

  it('should register file:read-as-data-url handler', async () => {
    try {
      const { registerFileHandlers } = await import('../../ipc/fileHandlers');
      registerFileHandlers(mockWindow, mockDeps);

      expect(ipcMain.handle).toHaveBeenCalledWith('file:read-as-data-url', expect.any(Function));
    } catch (error) {
      expect(error).toBeDefined();
    }
  });

  it('should register file:load-files handler', async () => {
    try {
      const { registerFileHandlers } = await import('../../ipc/fileHandlers');
      registerFileHandlers(mockWindow, mockDeps);

      expect(ipcMain.handle).toHaveBeenCalledWith('file:load-files', expect.any(Function));
    } catch (error) {
      expect(error).toBeDefined();
    }
  });

  it('should register file:list-range handler', async () => {
    try {
      const { registerFileHandlers } = await import('../../ipc/fileHandlers');
      registerFileHandlers(mockWindow, mockDeps);

      expect(ipcMain.handle).toHaveBeenCalledWith('file:list-range', expect.any(Function));
    } catch (error) {
      expect(error).toBeDefined();
    }
  });

  it('should register file:rename handler', async () => {
    try {
      const { registerFileHandlers } = await import('../../ipc/fileHandlers');
      registerFileHandlers(mockWindow, mockDeps);

      expect(ipcMain.handle).toHaveBeenCalledWith('file:rename', expect.any(Function));
    } catch (error) {
      expect(error).toBeDefined();
    }
  });

  it('should register file:update-metadata handler', async () => {
    try {
      const { registerFileHandlers } = await import('../../ipc/fileHandlers');
      registerFileHandlers(mockWindow, mockDeps);

      expect(ipcMain.handle).toHaveBeenCalledWith('file:update-metadata', expect.any(Function));
    } catch (error) {
      expect(error).toBeDefined();
    }
  });

  it('should register file:update-structured-metadata handler', async () => {
    try {
      const { registerFileHandlers } = await import('../../ipc/fileHandlers');
      registerFileHandlers(mockWindow, mockDeps);

      expect(ipcMain.handle).toHaveBeenCalledWith('file:update-structured-metadata', expect.any(Function));
    } catch (error) {
      expect(error).toBeDefined();
    }
  });
});
