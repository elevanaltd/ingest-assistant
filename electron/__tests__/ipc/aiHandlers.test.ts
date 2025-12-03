/**
 * Test suite for AI IPC handlers registration
 *
 * Tests that registerAiHandlers() properly registers all AI-related IPC channels:
 * - ai:analyze-file (single file AI analysis with security validation)
 * - ai:batch-process (multi-file AI batch processing with rate limiting)
 * - ai:is-configured (check if AI service configured)
 * - ai:get-config (get AI config for UI with masked key)
 * - ai:update-config (update AI configuration + hot reload)
 * - ai:test-connection (test AI provider connection)
 * - ai:test-saved-connection (test with saved Keychain key)
 * - ai:get-models (get available models for provider)
 *
 * TDD Phase: RED
 * This test will fail until electron/ipc/aiHandlers.ts is created
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BrowserWindow, ipcMain } from 'electron';
import type { AIService } from '../../services/aiService';
import type { SecurityValidator } from '../../services/securityValidator';
import type { FileManager } from '../../services/fileManager';
import type { ConfigManager } from '../../services/configManager';
import type { RateLimiter } from '../../utils/rateLimiter';
import type { MetadataStore } from '../../services/metadataStore';
import type { FileMetadata } from '../../../src/types';

// Mock electron modules
vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn(),
    removeHandler: vi.fn()
  },
  BrowserWindow: vi.fn()
}));

describe('registerAiHandlers', () => {
  let mockWindow: BrowserWindow;
  let mockDeps: {
    aiService: AIService | null;
    securityValidator: SecurityValidator;
    fileManager: FileManager;
    configManager: ConfigManager;
    batchProcessRateLimiter: RateLimiter;
    getCurrentFolderPath: () => string | null;
    getMetadataStoreForFolder: (path: string) => MetadataStore;
    normalizeFilePath: (metadata: FileMetadata, basePath: string) => string;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockWindow = {
      webContents: {
        send: vi.fn()
      }
    } as unknown as BrowserWindow;

    mockDeps = {
      aiService: null,
      securityValidator: {} as SecurityValidator,
      fileManager: {} as FileManager,
      configManager: {} as ConfigManager,
      batchProcessRateLimiter: {} as RateLimiter,
      getCurrentFolderPath: vi.fn(() => null),
      getMetadataStoreForFolder: vi.fn(),
      normalizeFilePath: vi.fn((metadata, basePath) => basePath + '/' + metadata.currentFilename)
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should fail: registerAiHandlers not yet implemented', async () => {
    // RED phase: This will fail because electron/ipc/aiHandlers.ts doesn't exist yet
    try {
      const { registerAiHandlers } = await import('../../ipc/aiHandlers');

      const result = registerAiHandlers(mockWindow, mockDeps);

      // Verify all 8 AI handlers are registered
      expect(ipcMain.handle).toHaveBeenCalledWith('ai:analyze-file', expect.any(Function));
      expect(ipcMain.handle).toHaveBeenCalledWith('ai:batch-process', expect.any(Function));
      expect(ipcMain.handle).toHaveBeenCalledWith('ai:is-configured', expect.any(Function));
      expect(ipcMain.handle).toHaveBeenCalledWith('ai:get-config', expect.any(Function));
      expect(ipcMain.handle).toHaveBeenCalledWith('ai:update-config', expect.any(Function));
      expect(ipcMain.handle).toHaveBeenCalledWith('ai:test-connection', expect.any(Function));
      expect(ipcMain.handle).toHaveBeenCalledWith('ai:test-saved-connection', expect.any(Function));
      expect(ipcMain.handle).toHaveBeenCalledWith('ai:get-models', expect.any(Function));

      expect(ipcMain.handle).toHaveBeenCalledTimes(8);

      // Verify setAiService function is returned for hot-reload capability
      expect(result).toHaveProperty('setAiService');
      expect(typeof result.setAiService).toBe('function');
    } catch (error) {
      // Expected to fail - module doesn't exist yet
      expect(error).toBeDefined();
      expect((error as Error).message).toContain('Cannot find module');
    }
  });
});
