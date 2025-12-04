/**
 * Test suite for batch IPC handlers window lifecycle
 *
 * BLOCKING Issue: Stale BrowserWindow reference causes crashes on macOS
 * - macOS: app stays alive after window closes (darwin behavior)
 * - When window closes, webContents is destroyed but reference is truthy
 * - Batch progress/complete callbacks crash: "Attempting to call a function in a renderer window that has been closed"
 *
 * FIX: Replace mainWindow: BrowserWindow with getMainWindow: () => BrowserWindow | null
 * Progress/complete callbacks must check: win && !win.isDestroyed()
 *
 * TDD Phase: RED
 * This test will fail until batchHandlers.ts implements getMainWindow pattern
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BrowserWindow, ipcMain } from 'electron';

// Mock electron modules
vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn(),
    removeHandler: vi.fn()
  },
  BrowserWindow: vi.fn()
}));

// Mock aiHandlers to prevent "AI service not configured" errors
vi.mock('../../ipc/aiHandlers', () => ({
  getAiService: () => ({
    analyzeImage: vi.fn().mockResolvedValue({
      shotName: 'test-shot',
      keywords: [],
      location: '',
      subject: '',
      action: '',
      shotType: 'WS'
    }),
    analyzeVideo: vi.fn().mockResolvedValue({
      shotName: 'test-shot',
      keywords: [],
      location: '',
      subject: '',
      action: '',
      shotType: 'WS'
    })
  })
}));

describe('registerBatchHandlers - Window Lifecycle Safety', () => {
  let mockWindow: BrowserWindow;
  let mockWebContents: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock window with webContents
    mockWebContents = {
      send: vi.fn()
    };

    mockWindow = {
      webContents: mockWebContents,
      isDestroyed: vi.fn(() => false)
    } as unknown as BrowserWindow;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should accept getMainWindow getter function instead of BrowserWindow instance', async () => {
    const { registerBatchHandlers } = await import('../../ipc/batchHandlers');

    // This test verifies the signature change from:
    // registerBatchHandlers(mainWindow: BrowserWindow, deps)
    // to:
    // registerBatchHandlers(getMainWindow: () => BrowserWindow | null, deps)

    const getMainWindow = () => mockWindow;
    const mockDeps = {} as any;

    expect(() => {
      registerBatchHandlers(getMainWindow, mockDeps);
    }).not.toThrow();
  });

  it('should guard against window destruction in progress callback', async () => {
    const { registerBatchHandlers } = await import('../../ipc/batchHandlers');

    let progressCallback: any;
    const mockBatchQueueManager = {
      addToQueue: vi.fn().mockResolvedValue('queue-1'),
      startProcessing: vi.fn().mockImplementation(async (processor, progressCb) => {
        progressCallback = progressCb; // Capture the callback
      })
    };

    const mockDeps = {
      batchQueueManager: mockBatchQueueManager,
      getCurrentFolderPath: () => '/test',
      getMetadataStoreForFolder: () => ({
        clearCache: vi.fn(),
        loadMetadata: vi.fn()
      }),
      configManager: {
        getLexicon: vi.fn().mockResolvedValue({}),
        getCfexToggles: vi.fn().mockResolvedValue({})
      },
      batchProcessRateLimiter: {},
      securityValidator: {},
      fileManager: {},
      metadataWriter: {},
      normalizeFilePath: vi.fn()
    } as any;

    // Simulate destroyed window
    (mockWindow.isDestroyed as any).mockReturnValue(true);
    const getMainWindow = () => mockWindow;

    registerBatchHandlers(getMainWindow, mockDeps);

    // Trigger batch:start to capture callbacks
    const handleCalls = (ipcMain.handle as any).mock.calls;
    const batchStartCall = handleCalls.find((call: any) => call[0] === 'batch:start');
    await batchStartCall[1]({}, ['file1']);

    // Call progress callback with destroyed window
    progressCallback({ processed: 1, total: 1, failed: 0, current: 'test.jpg' });

    // Should NOT crash and should NOT attempt to send
    expect(mockWebContents.send).not.toHaveBeenCalled();
  });

  it('should guard against null window in complete callback', async () => {
    const { registerBatchHandlers } = await import('../../ipc/batchHandlers');

    let completeCallback: any;
    const mockBatchQueueManager = {
      addToQueue: vi.fn().mockResolvedValue('queue-1'),
      startProcessing: vi.fn().mockImplementation(async (processor, progressCb, completeCb) => {
        completeCallback = completeCb; // Capture the callback
      })
    };

    const mockDeps = {
      batchQueueManager: mockBatchQueueManager,
      getCurrentFolderPath: () => '/test',
      getMetadataStoreForFolder: () => ({
        clearCache: vi.fn(),
        loadMetadata: vi.fn()
      }),
      configManager: {
        getLexicon: vi.fn().mockResolvedValue({}),
        getCfexToggles: vi.fn().mockResolvedValue({})
      },
      batchProcessRateLimiter: {},
      securityValidator: {},
      fileManager: {},
      metadataWriter: {},
      normalizeFilePath: vi.fn()
    } as any;

    // Simulate null window (darwin app-stays-alive scenario)
    const getMainWindow = () => null;

    registerBatchHandlers(getMainWindow, mockDeps);

    // Trigger batch:start to capture callbacks
    const handleCalls = (ipcMain.handle as any).mock.calls;
    const batchStartCall = handleCalls.find((call: any) => call[0] === 'batch:start');
    await batchStartCall[1]({}, ['file1']);

    // Call complete callback with null window
    await completeCallback({ processed: 1, total: 1, failed: 0 });

    // Should NOT crash and should NOT attempt to send
    expect(mockWebContents.send).not.toHaveBeenCalled();
  });
});
