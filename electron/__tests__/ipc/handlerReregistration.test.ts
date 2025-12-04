/**
 * Test suite for IPC handler re-registration safety
 *
 * Tests that all handler registration functions can be called multiple times
 * without throwing "Attempted to register a second handler" errors.
 *
 * CONTEXT: On macOS, app.on('activate') re-creates the window when reopening
 * from dock after close, which calls all registerXxxHandlers() functions again.
 * Without removeHandler() guards, this crashes the app.
 *
 * Platform Impact:
 * - macOS: AFFECTED (window reopen from dock calls createWindow() again)
 * - Linux: NOT affected (app quits on window close, fresh restart)
 *
 * FIX: Each ipcMain.handle() call must be preceded by ipcMain.removeHandler()
 * to safely allow re-registration.
 *
 * TDD Phase: RED
 * This test will fail until removeHandler() guards are added to all handler modules.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserWindow, ipcMain } from 'electron';

// Mock electron modules
vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn(),
    removeHandler: vi.fn(),
    on: vi.fn()
  },
  BrowserWindow: vi.fn(),
  dialog: {
    showOpenDialog: vi.fn()
  }
}));

// Mock services to prevent import errors
vi.mock('../../services/securityValidator');
vi.mock('../../services/fileManager');
vi.mock('../../services/metadataWriter');
vi.mock('../../services/videoTranscoder');
vi.mock('../../services/batchQueueManager');
vi.mock('../../services/configManager');
vi.mock('../../services/aiService');
vi.mock('../../utils/rateLimiter');
vi.mock('../../services/metadataStore');

describe('IPC handler re-registration safety', () => {
  let mockWindow: BrowserWindow;

  beforeEach(() => {
    vi.clearAllMocks();

    mockWindow = {
      webContents: {
        send: vi.fn()
      }
    } as unknown as BrowserWindow;
  });

  it('should call removeHandler before handle for fileHandlers', async () => {
    const { registerFileHandlers } = await import('../../ipc/fileHandlers');

    const mockDeps = {
      securityValidator: {} as any,
      fileManager: {} as any,
      metadataWriter: {} as any,
      videoTranscoder: {} as any,
      batchQueueManager: {} as any,
      MEDIA_SERVER_PORT: 8765,
      MEDIA_SERVER_TOKEN: 'test-token',
      currentFolderPath: null,
      getMetadataStoreForFolder: vi.fn()
    };

    // First registration
    registerFileHandlers(mockWindow, mockDeps);

    const handleCalls = (ipcMain.handle as any).mock.calls;
    const removeHandlerCalls = (ipcMain.removeHandler as any).mock.calls;

    // Verify that for each handle() call, removeHandler() was called first with same channel
    const channels = handleCalls.map((call: any[]) => call[0]);
    const removedChannels = removeHandlerCalls.map((call: any[]) => call[0]);

    // RED: This will fail because removeHandler is not yet called before handle
    expect(removedChannels.length).toBeGreaterThan(0);
    channels.forEach((channel: string) => {
      expect(removedChannels).toContain(channel);
    });

    vi.clearAllMocks();

    // Second registration (simulates macOS window reopen)
    registerFileHandlers(mockWindow, mockDeps);

    // Should not throw - verify removeHandler was called again
    const secondRemoveCalls = (ipcMain.removeHandler as any).mock.calls;
    expect(secondRemoveCalls.length).toBeGreaterThan(0);
  });

  it('should call removeHandler before handle for aiHandlers', async () => {
    const { registerAiHandlers } = await import('../../ipc/aiHandlers');

    const mockDeps = {
      aiService: null,
      securityValidator: {} as any,
      fileManager: {} as any,
      configManager: {} as any,
      batchProcessRateLimiter: {} as any,
      getCurrentFolderPath: () => null,
      getMetadataStoreForFolder: vi.fn(),
      normalizeFilePath: vi.fn()
    };

    registerAiHandlers(mockWindow, mockDeps);

    const handleCalls = (ipcMain.handle as any).mock.calls;
    const removeHandlerCalls = (ipcMain.removeHandler as any).mock.calls;

    const channels = handleCalls.map((call: any[]) => call[0]);
    const removedChannels = removeHandlerCalls.map((call: any[]) => call[0]);

    // RED: This will fail
    expect(removedChannels.length).toBeGreaterThan(0);
    channels.forEach((channel: string) => {
      expect(removedChannels).toContain(channel);
    });

    vi.clearAllMocks();

    const mockDeps2 = {
      aiService: null,
      securityValidator: {} as any,
      fileManager: {} as any,
      configManager: {} as any,
      batchProcessRateLimiter: {} as any,
      getCurrentFolderPath: () => null,
      getMetadataStoreForFolder: vi.fn(),
      normalizeFilePath: vi.fn()
    };

    registerAiHandlers(mockWindow, mockDeps2);

    const secondRemoveCalls = (ipcMain.removeHandler as any).mock.calls;
    expect(secondRemoveCalls.length).toBeGreaterThan(0);
  });

  it('should call removeHandler before handle for batchHandlers', async () => {
    const { registerBatchHandlers } = await import('../../ipc/batchHandlers');

    const mockDeps = {
      batchQueueManager: {} as any,
      batchProcessRateLimiter: {} as any,
      securityValidator: {} as any,
      fileManager: {} as any,
      metadataWriter: {} as any,
      configManager: {} as any,
      getCurrentFolderPath: () => null,
      getMetadataStoreForFolder: vi.fn(),
      normalizeFilePath: vi.fn()
    };

    registerBatchHandlers(() => mockWindow, mockDeps);

    const handleCalls = (ipcMain.handle as any).mock.calls;
    const removeHandlerCalls = (ipcMain.removeHandler as any).mock.calls;

    const channels = handleCalls.map((call: any[]) => call[0]);
    const removedChannels = removeHandlerCalls.map((call: any[]) => call[0]);

    // RED: This will fail
    expect(removedChannels.length).toBeGreaterThan(0);
    channels.forEach((channel: string) => {
      expect(removedChannels).toContain(channel);
    });

    vi.clearAllMocks();
    registerBatchHandlers(() => mockWindow, mockDeps);

    const secondRemoveCalls = (ipcMain.removeHandler as any).mock.calls;
    expect(secondRemoveCalls.length).toBeGreaterThan(0);
  });

  it('should call removeHandler before handle for configHandlers', async () => {
    const { registerConfigHandlers } = await import('../../ipc/configHandlers');

    const mockDeps = {
      configManager: {} as any,
      getCurrentFolderPath: () => null,
      getMetadataStore: () => null
    };

    registerConfigHandlers(mockDeps);

    const handleCalls = (ipcMain.handle as any).mock.calls;
    const removeHandlerCalls = (ipcMain.removeHandler as any).mock.calls;

    const channels = handleCalls.map((call: any[]) => call[0]);
    const removedChannels = removeHandlerCalls.map((call: any[]) => call[0]);

    // RED: This will fail
    expect(removedChannels.length).toBeGreaterThan(0);
    channels.forEach((channel: string) => {
      expect(removedChannels).toContain(channel);
    });

    vi.clearAllMocks();

    const mockDeps2 = {
      configManager: {} as any,
      getCurrentFolderPath: () => null,
      getMetadataStore: () => null
    };

    registerConfigHandlers(mockDeps2);

    const secondRemoveCalls = (ipcMain.removeHandler as any).mock.calls;
    expect(secondRemoveCalls.length).toBeGreaterThan(0);
  });

  it('should call removeHandler before handle for cfexTransferHandlers', async () => {
    const { registerCfexTransferHandlers } = await import('../../ipc/cfexTransferHandlers');

    registerCfexTransferHandlers(mockWindow);

    const handleCalls = (ipcMain.handle as any).mock.calls;
    const removeHandlerCalls = (ipcMain.removeHandler as any).mock.calls;

    const channels = handleCalls.map((call: any[]) => call[0]);
    const removedChannels = removeHandlerCalls.map((call: any[]) => call[0]);

    // RED: This will fail
    expect(removedChannels.length).toBeGreaterThan(0);
    channels.forEach((channel: string) => {
      expect(removedChannels).toContain(channel);
    });

    vi.clearAllMocks();
    registerCfexTransferHandlers(mockWindow);

    const secondRemoveCalls = (ipcMain.removeHandler as any).mock.calls;
    expect(secondRemoveCalls.length).toBeGreaterThan(0);
  });

  it('should call removeHandler before handle for proxyGenerationHandlers', async () => {
    const { registerProxyGenerationHandlers } = await import('../../ipc/proxyGenerationHandlers');

    registerProxyGenerationHandlers(mockWindow);

    const handleCalls = (ipcMain.handle as any).mock.calls;
    const removeHandlerCalls = (ipcMain.removeHandler as any).mock.calls;

    const channels = handleCalls.map((call: any[]) => call[0]);
    const removedChannels = removeHandlerCalls.map((call: any[]) => call[0]);

    // RED: This will fail
    expect(removedChannels.length).toBeGreaterThan(0);
    channels.forEach((channel: string) => {
      expect(removedChannels).toContain(channel);
    });

    vi.clearAllMocks();
    registerProxyGenerationHandlers(mockWindow);

    const secondRemoveCalls = (ipcMain.removeHandler as any).mock.calls;
    expect(secondRemoveCalls.length).toBeGreaterThan(0);
  });
});
