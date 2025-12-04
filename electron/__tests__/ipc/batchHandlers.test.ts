/**
 * Test suite for batch IPC handlers registration
 *
 * Tests that registerBatchHandlers() properly registers all batch-related IPC channels:
 * - batch:start
 * - batch:cancel
 * - batch:get-status
 *
 * TDD Phase: RED
 * This test will fail until electron/ipc/batchHandlers.ts is created
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BrowserWindow, ipcMain } from 'electron';
import type { SecurityValidator } from '../../services/securityValidator';
import type { FileManager } from '../../services/fileManager';
import type { MetadataWriter } from '../../services/metadataWriter';
import type { ConfigManager } from '../../services/configManager';
import type { BatchQueueManager } from '../../services/batchQueueManager';
import type { RateLimiter } from '../../utils/rateLimiter';

// Mock electron modules
vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn(),
    removeHandler: vi.fn()
  },
  BrowserWindow: vi.fn()
}));

describe('registerBatchHandlers', () => {
  let mockWindow: BrowserWindow;
  let mockDeps: {
    batchQueueManager: BatchQueueManager;
    batchProcessRateLimiter: RateLimiter;
    securityValidator: SecurityValidator;
    fileManager: FileManager;
    metadataWriter: MetadataWriter;
    configManager: ConfigManager;
    getCurrentFolderPath: () => string | null;
    getMetadataStoreForFolder: (path: string) => any;
    normalizeFilePath: (metadata: any, basePath: string) => string;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockWindow = {} as BrowserWindow;
    mockDeps = {
      batchQueueManager: {} as BatchQueueManager,
      batchProcessRateLimiter: {} as RateLimiter,
      securityValidator: {} as SecurityValidator,
      fileManager: {} as FileManager,
      metadataWriter: {} as MetadataWriter,
      configManager: {} as ConfigManager,
      getCurrentFolderPath: vi.fn(),
      getMetadataStoreForFolder: vi.fn(),
      normalizeFilePath: vi.fn()
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should register batch:start handler', async () => {
    const { registerBatchHandlers } = await import('../../ipc/batchHandlers');
    registerBatchHandlers(() => mockWindow, mockDeps);

    expect(ipcMain.handle).toHaveBeenCalledWith('batch:start', expect.any(Function));
  });

  it('should register batch:cancel handler', async () => {
    const { registerBatchHandlers } = await import('../../ipc/batchHandlers');
    registerBatchHandlers(() => mockWindow, mockDeps);

    expect(ipcMain.handle).toHaveBeenCalledWith('batch:cancel', expect.any(Function));
  });

  it('should register batch:get-status handler', async () => {
    const { registerBatchHandlers } = await import('../../ipc/batchHandlers');
    registerBatchHandlers(() => mockWindow, mockDeps);

    expect(ipcMain.handle).toHaveBeenCalledWith('batch:get-status', expect.any(Function));
  });

  it('should register all 3 batch handlers', async () => {
    const { registerBatchHandlers } = await import('../../ipc/batchHandlers');
    registerBatchHandlers(() => mockWindow, mockDeps);

    // Verify exactly 3 handlers registered
    expect(ipcMain.handle).toHaveBeenCalledTimes(3);
  });
});
