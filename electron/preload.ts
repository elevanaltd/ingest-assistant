import { contextBridge, ipcRenderer } from 'electron';
import type { FileMetadata, AppConfig, AIAnalysisResult, Lexicon, LexiconConfig } from '../src/types';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // File operations
  selectFolder: (): Promise<string | null> =>
    ipcRenderer.invoke('file:select-folder'),

  // CRITICAL-1 FIX: Remove folderPath parameter (security boundary enforced in main process)
  loadFiles: (): Promise<FileMetadata[]> =>
    ipcRenderer.invoke('file:load-files'),

  readFileAsDataUrl: (filePath: string): Promise<string> =>
    ipcRenderer.invoke('file:read-as-data-url', filePath),

  renameFile: (fileId: string, mainName: string, currentPath: string): Promise<boolean> =>
    ipcRenderer.invoke('file:rename', fileId, mainName, currentPath),

  updateMetadata: (fileId: string, metadata: string[]): Promise<boolean> =>
    ipcRenderer.invoke('file:update-metadata', fileId, metadata),

  // AI operations
  isAIConfigured: (): Promise<boolean> =>
    ipcRenderer.invoke('ai:is-configured'),

  analyzeFile: (filePath: string): Promise<AIAnalysisResult> =>
    ipcRenderer.invoke('ai:analyze-file', filePath),

  batchProcess: (fileIds: string[]): Promise<Record<string, AIAnalysisResult>> =>
    ipcRenderer.invoke('ai:batch-process', fileIds),

  // Config operations
  loadConfig: (): Promise<AppConfig> =>
    ipcRenderer.invoke('config:load'),

  saveConfig: (config: AppConfig): Promise<boolean> =>
    ipcRenderer.invoke('config:save', config),

  getLexicon: (): Promise<Lexicon> =>
    ipcRenderer.invoke('config:get-lexicon'),

  // Lexicon operations
  lexicon: {
    load: (): Promise<LexiconConfig> =>
      ipcRenderer.invoke('lexicon:load'),
    save: (config: LexiconConfig): Promise<boolean> =>
      ipcRenderer.invoke('lexicon:save', config),
  },
});
