import { contextBridge, ipcRenderer } from 'electron';
import type { FileMetadata, AppConfig, AIAnalysisResult, Lexicon } from '../src/types';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // File operations
  selectFolder: (): Promise<string | null> =>
    ipcRenderer.invoke('file:select-folder'),

  loadFiles: (folderPath: string): Promise<FileMetadata[]> =>
    ipcRenderer.invoke('file:load-files', folderPath),

  renameFile: (fileId: string, mainName: string): Promise<boolean> =>
    ipcRenderer.invoke('file:rename', fileId, mainName),

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
});
