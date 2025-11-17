import type { FileMetadata, AppConfig, AIAnalysisResult, Lexicon, LexiconConfig, AIConfigForUI, AIConnectionTestResult } from './index';

export interface ElectronAPI {
  // File operations
  selectFolder: () => Promise<string | null>;
  // CRITICAL-1 FIX: Removed folderPath parameter (security boundary enforced in main process)
  loadFiles: () => Promise<FileMetadata[]>;
  readFileAsDataUrl: (filePath: string) => Promise<string>;
  renameFile: (fileId: string, mainName: string, currentPath: string, structured?: { location?: string; subject?: string; action?: string; shotType?: string }) => Promise<boolean>;
  updateMetadata: (fileId: string, metadata: string[]) => Promise<boolean>;
  updateStructuredMetadata: (fileId: string, structured: { location: string; subject: string; action?: string; shotType: string }, filePath?: string, fileType?: 'image' | 'video') => Promise<boolean>;

  // AI operations
  isAIConfigured: () => Promise<boolean>;
  getAIConfig: () => Promise<AIConfigForUI>;
  updateAIConfig: (config: { provider: 'openai' | 'anthropic' | 'openrouter'; model: string; apiKey: string }) => Promise<{ success: boolean; error?: string }>;
  testAIConnection: (provider: 'openai' | 'anthropic' | 'openrouter', model: string, apiKey: string) => Promise<AIConnectionTestResult>;
  testSavedAIConnection: () => Promise<AIConnectionTestResult>;
  getAIModels: (provider: string) => Promise<Array<{id: string; name: string; description?: string}>>;
  analyzeFile: (filePath: string) => Promise<AIAnalysisResult>;
  batchProcess: (fileIds: string[]) => Promise<Record<string, AIAnalysisResult>>;

  // Batch operations (Issue #24)
  batchStart: (fileIds: string[]) => Promise<string>;
  batchCancel: () => Promise<{ success: boolean }>;
  batchGetStatus: () => Promise<import('./index').BatchQueueState>;
  onBatchProgress: (callback: (progress: import('./index').BatchProgress) => void) => () => void;

  // Transcode progress (for loading overlay)
  onTranscodeProgress: (callback: (progress: { time: string }) => void) => () => void;

  // Config operations
  loadConfig: () => Promise<AppConfig>;
  saveConfig: (config: AppConfig) => Promise<boolean>;
  getLexicon: () => Promise<Lexicon>;
  getShotTypes: () => Promise<string[]>;

  // Lexicon operations
  lexicon: {
    load: () => Promise<LexiconConfig>;
    save: (config: LexiconConfig) => Promise<boolean>;
  };
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
