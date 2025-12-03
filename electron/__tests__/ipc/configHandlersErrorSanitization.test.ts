/**
 * Test suite for config IPC handlers error sanitization
 *
 * HIGH Priority Issue: Config handlers lack try/catch error sanitization
 * - config:load, config:save, config:get-lexicon, config:get-shot-types lack try/catch
 * - Raw filesystem/YAML errors leak to renderer (security + UX issue)
 * - folder:* handlers have correct pattern with sanitizeError()
 *
 * FIX: Wrap each handler with try/catch and sanitizeError() like folder handlers
 *
 * TDD Phase: RED
 * This test will fail until configHandlers.ts implements error sanitization
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ipcMain } from 'electron';

// Mock electron modules
vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn(),
    removeHandler: vi.fn()
  }
}));

// Mock sanitizeError
vi.mock('../../utils/errorSanitization', () => ({
  sanitizeError: vi.fn((error) => {
    // Simulate sanitization (remove stack traces, filesystem paths)
    return new Error('Sanitized: ' + (error.message || 'Unknown error'));
  })
}));

describe('registerConfigHandlers - Error Sanitization', () => {
  let handlers: Record<string, (...args: any[]) => Promise<any>>;

  beforeEach(async () => {
    vi.clearAllMocks();
    handlers = {};

    // Capture all registered handlers
    (ipcMain.handle as any).mockImplementation((channel: string, handler: (...args: any[]) => Promise<any>) => {
      handlers[channel] = handler;
    });

    const mockConfigManager = {
      loadConfig: vi.fn().mockRejectedValue(new Error('ENOENT: /Users/test/.config/config.yaml')),
      saveConfig: vi.fn().mockRejectedValue(new Error('EACCES: Permission denied /Users/test/.config/config.yaml')),
      getLexicon: vi.fn().mockRejectedValue(new Error('YAML parse error at line 42')),
      getAllShotTypes: vi.fn().mockRejectedValue(new Error('Config not loaded'))
    };

    const { registerConfigHandlers } = await import('../../ipc/configHandlers');
    registerConfigHandlers({
      configManager: mockConfigManager as any,
      getCurrentFolderPath: () => '/test/folder',
      getMetadataStore: () => null
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should sanitize errors from config:load', async () => {
    const handler = handlers['config:load'];
    expect(handler).toBeDefined();

    // Should throw sanitized error
    await expect(handler({})).rejects.toThrow('Sanitized:');
  });

  it('should sanitize errors from config:save', async () => {
    const handler = handlers['config:save'];
    expect(handler).toBeDefined();

    await expect(handler({}, {})).rejects.toThrow('Sanitized:');
  });

  it('should sanitize errors from config:get-lexicon', async () => {
    const handler = handlers['config:get-lexicon'];
    expect(handler).toBeDefined();

    await expect(handler({})).rejects.toThrow('Sanitized:');
  });

  it('should sanitize errors from config:get-shot-types', async () => {
    const handler = handlers['config:get-shot-types'];
    expect(handler).toBeDefined();

    await expect(handler({})).rejects.toThrow('Sanitized:');
  });

  it('should log full error internally but throw sanitized error', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const handler = handlers['config:load'];

    try {
      await handler({});
    } catch (error) {
      // Sanitized error should be thrown to renderer
      expect((error as Error).message).toContain('Sanitized:');
    }

    // Full error should be logged internally
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Failed to load config'),
      expect.any(Error)
    );

    consoleErrorSpy.mockRestore();
  });
});
