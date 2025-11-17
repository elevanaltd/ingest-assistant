import { contextBridge, ipcRenderer } from 'electron';
import type { FileMetadata, AppConfig, AIAnalysisResult, Lexicon, LexiconConfig, AIConfigForUI, AIConnectionTestResult } from '../src/types';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // File operations
  selectFolder: (): Promise<string | null> =>
    ipcRenderer.invoke('file:select-folder'),

  // CRITICAL-1 FIX: Remove folderPath parameter (security boundary enforced in main process)
  loadFiles: (): Promise<FileMetadata[]> =>
    ipcRenderer.invoke('file:load-files'),

  // Paginated file listing (issue #19)
  listFilesRange: (startIndex: number, pageSize: number): Promise<import('../src/types').FileListRangeResponse> =>
    ipcRenderer.invoke('file:list-range', startIndex, pageSize),

  readFileAsDataUrl: (filePath: string): Promise<string> =>
    ipcRenderer.invoke('file:read-as-data-url', filePath),

  renameFile: (fileId: string, mainName: string, currentPath: string, structured?: { location?: string; subject?: string; action?: string; shotType?: string }): Promise<boolean> =>
    ipcRenderer.invoke('file:rename', fileId, mainName, currentPath, structured),

  updateMetadata: (fileId: string, keywords: string[]): Promise<boolean> =>
    ipcRenderer.invoke('file:update-metadata', fileId, keywords),

  updateStructuredMetadata: (fileId: string, structured: { location: string; subject: string; action?: string; shotType: string }, filePath?: string, fileType?: 'image' | 'video'): Promise<boolean> =>
    ipcRenderer.invoke('file:update-structured-metadata', fileId, structured, filePath, fileType),

  // AI operations
  isAIConfigured: (): Promise<boolean> =>
    ipcRenderer.invoke('ai:is-configured'),

  getAIConfig: (): Promise<AIConfigForUI> =>
    ipcRenderer.invoke('ai:get-config'),

  updateAIConfig: (config: { provider: 'openai' | 'anthropic' | 'openrouter'; model: string; apiKey: string }): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('ai:update-config', config),

  testAIConnection: (provider: 'openai' | 'anthropic' | 'openrouter', model: string, apiKey: string): Promise<AIConnectionTestResult> =>
    ipcRenderer.invoke('ai:test-connection', provider, model, apiKey),

  testSavedAIConnection: (): Promise<AIConnectionTestResult> =>
    ipcRenderer.invoke('ai:test-saved-connection'),

  getAIModels: (provider: string): Promise<Array<{id: string; name: string; description?: string}>> =>
    ipcRenderer.invoke('ai:get-models', provider),

  analyzeFile: (filePath: string): Promise<AIAnalysisResult> =>
    ipcRenderer.invoke('ai:analyze-file', filePath),

  batchProcess: (fileIds: string[]): Promise<Record<string, AIAnalysisResult>> =>
    ipcRenderer.invoke('ai:batch-process', fileIds),

  // Batch operations (Issue #24)
  batchStart: (fileIds: string[]): Promise<string> =>
    ipcRenderer.invoke('batch:start', fileIds),

  batchCancel: (): Promise<{ success: boolean }> =>
    ipcRenderer.invoke('batch:cancel'),

  batchGetStatus: (): Promise<import('../src/types').BatchQueueState> =>
    ipcRenderer.invoke('batch:get-status'),

  onBatchProgress: (callback: (progress: import('../src/types').BatchProgress) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, progress: import('../src/types').BatchProgress) => callback(progress);
    ipcRenderer.on('batch:progress', listener);
    // Return cleanup function
    return () => ipcRenderer.removeListener('batch:progress', listener);
  },

  onTranscodeProgress: (callback: (progress: { time: string }) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, progress: { time: string }) => callback(progress);
    ipcRenderer.on('file:transcode-progress', listener);
    // Return cleanup function
    return () => ipcRenderer.removeListener('file:transcode-progress', listener);
  },

  // Config operations
  loadConfig: (): Promise<AppConfig> =>
    ipcRenderer.invoke('config:load'),

  saveConfig: (config: AppConfig): Promise<boolean> =>
    ipcRenderer.invoke('config:save', config),

  getLexicon: (): Promise<Lexicon> =>
    ipcRenderer.invoke('config:get-lexicon'),

  getShotTypes: (): Promise<string[]> =>
    ipcRenderer.invoke('config:get-shot-types'),

  // Lexicon operations
  lexicon: {
    load: (): Promise<LexiconConfig> =>
      ipcRenderer.invoke('lexicon:load'),
    save: (config: LexiconConfig): Promise<boolean> =>
      ipcRenderer.invoke('lexicon:save', config),
  },
});
