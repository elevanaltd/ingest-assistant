/**
 * Config IPC Handlers
 *
 * Handles configuration and lexicon operations:
 * - config:load - Load application config
 * - config:save - Save application config
 * - config:get-lexicon - Get lexicon config
 * - config:get-shot-types - Get all shot types
 * - lexicon:load - Load lexicon in UI format
 * - lexicon:save - Save lexicon from UI format
 * - folder:set-completed - Mark folder as completed
 * - folder:get-completed - Get folder completion status
 */

import { ipcMain } from 'electron';
import type { ConfigManager } from '../services/configManager';
import type { MetadataStore } from '../services/metadataStore';
import type { AppConfig, LexiconConfig } from '../../src/types';
import { convertToYAMLFormat, convertToUIFormat } from '../utils/lexiconConverter';
import { sanitizeError } from '../utils/errorSanitization';

interface ConfigHandlerDependencies {
  configManager: ConfigManager;
  getCurrentFolderPath: () => string | null;
  getMetadataStore: () => MetadataStore | null;
}

export function registerConfigHandlers(
  dependencies: ConfigHandlerDependencies
): void {
  const {
    configManager,
    getCurrentFolderPath,
    getMetadataStore
  } = dependencies;

  // Config operations
  ipcMain.handle('config:load', async () => {
    return await configManager.loadConfig();
  });

  ipcMain.handle('config:save', async (_event, config: AppConfig) => {
    return await configManager.saveConfig(config);
  });

  ipcMain.handle('config:get-lexicon', async () => {
    return await configManager.getLexicon();
  });

  ipcMain.handle('config:get-shot-types', async () => {
    // Load config first to ensure it's cached
    await configManager.loadConfig();
    return configManager.getAllShotTypes();
  });

  // Lexicon operations (UI format)
  ipcMain.handle('lexicon:load', async () => {
    const lexicon = await configManager.getLexicon();
    return convertToUIFormat(lexicon);
  });

  ipcMain.handle('lexicon:save', async (_event, uiConfig: LexiconConfig) => {
    try {
      const lexicon = convertToYAMLFormat(uiConfig);
      await configManager.saveLexicon(lexicon);
      return true;
    } catch (error) {
      console.error('Failed to save lexicon:', error); // Log full error internally
      throw sanitizeError(error); // Send sanitized error to renderer
    }
  });

  // Folder completion operations (Phase C)
  ipcMain.handle('folder:set-completed', async (_event, completed: boolean) => {
    try {
      const currentFolderPath = getCurrentFolderPath();
      const metadataStore = getMetadataStore();

      if (!currentFolderPath || !metadataStore) {
        throw new Error('No folder selected');
      }

      const result = await metadataStore.setCompleted(completed);
      return result;
    } catch (error) {
      console.error('[configHandlers] folder:set-completed error:', error);
      throw sanitizeError(error);
    }
  });

  ipcMain.handle('folder:get-completed', async () => {
    try {
      const currentFolderPath = getCurrentFolderPath();
      const metadataStore = getMetadataStore();

      if (!currentFolderPath || !metadataStore) {
        throw new Error('No folder selected');
      }

      return metadataStore.getCompleted();
    } catch (error) {
      console.error('[configHandlers] folder:get-completed error:', error);
      throw sanitizeError(error);
    }
  });
}
