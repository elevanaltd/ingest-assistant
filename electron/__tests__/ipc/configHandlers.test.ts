/**
 * Test suite for config IPC handlers registration
 *
 * Tests that registerConfigHandlers() properly registers all config-related IPC channels:
 * - config:load
 * - config:save
 * - config:get-lexicon
 * - config:get-shot-types
 * - lexicon:load
 * - lexicon:save
 * - folder:set-completed
 * - folder:get-completed
 *
 * TDD Phase: RED
 * This test will fail until electron/ipc/configHandlers.ts is created
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ipcMain } from 'electron';
import type { ConfigManager } from '../../services/configManager';
import type { MetadataStore } from '../../services/metadataStore';

// Mock electron modules
vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn(),
    removeHandler: vi.fn()
  }
}));

describe('registerConfigHandlers', () => {
  let mockDeps: {
    configManager: ConfigManager;
    getCurrentFolderPath: () => string | null;
    getMetadataStore: () => MetadataStore | null;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockDeps = {
      configManager: {} as ConfigManager,
      getCurrentFolderPath: vi.fn(),
      getMetadataStore: vi.fn()
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should register config:load handler', async () => {
    const { registerConfigHandlers } = await import('../../ipc/configHandlers');
    registerConfigHandlers(mockDeps);

    expect(ipcMain.handle).toHaveBeenCalledWith('config:load', expect.any(Function));
  });

  it('should register config:save handler', async () => {
    const { registerConfigHandlers } = await import('../../ipc/configHandlers');
    registerConfigHandlers(mockDeps);

    expect(ipcMain.handle).toHaveBeenCalledWith('config:save', expect.any(Function));
  });

  it('should register config:get-lexicon handler', async () => {
    const { registerConfigHandlers } = await import('../../ipc/configHandlers');
    registerConfigHandlers(mockDeps);

    expect(ipcMain.handle).toHaveBeenCalledWith('config:get-lexicon', expect.any(Function));
  });

  it('should register config:get-shot-types handler', async () => {
    const { registerConfigHandlers } = await import('../../ipc/configHandlers');
    registerConfigHandlers(mockDeps);

    expect(ipcMain.handle).toHaveBeenCalledWith('config:get-shot-types', expect.any(Function));
  });

  it('should register lexicon:load handler', async () => {
    const { registerConfigHandlers } = await import('../../ipc/configHandlers');
    registerConfigHandlers(mockDeps);

    expect(ipcMain.handle).toHaveBeenCalledWith('lexicon:load', expect.any(Function));
  });

  it('should register lexicon:save handler', async () => {
    const { registerConfigHandlers } = await import('../../ipc/configHandlers');
    registerConfigHandlers(mockDeps);

    expect(ipcMain.handle).toHaveBeenCalledWith('lexicon:save', expect.any(Function));
  });

  it('should register folder:set-completed handler', async () => {
    const { registerConfigHandlers } = await import('../../ipc/configHandlers');
    registerConfigHandlers(mockDeps);

    expect(ipcMain.handle).toHaveBeenCalledWith('folder:set-completed', expect.any(Function));
  });

  it('should register folder:get-completed handler', async () => {
    const { registerConfigHandlers } = await import('../../ipc/configHandlers');
    registerConfigHandlers(mockDeps);

    expect(ipcMain.handle).toHaveBeenCalledWith('folder:get-completed', expect.any(Function));
  });

  it('should register all 8 config handlers', async () => {
    const { registerConfigHandlers } = await import('../../ipc/configHandlers');
    registerConfigHandlers(mockDeps);

    // Verify exactly 8 handlers registered
    expect(ipcMain.handle).toHaveBeenCalledTimes(8);
  });
});
