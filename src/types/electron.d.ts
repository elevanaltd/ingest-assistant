import type { FileMetadata, AppConfig, AIAnalysisResult, Lexicon, LexiconConfig, AIConfigForUI, AIConnectionTestResult } from './index';

export interface ElectronAPI {
  // File operations
  selectFolder: (startPath?: string) => Promise<string | null>;
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
  onTranscodeProgress: (callback: (progress: { time: string; percentage: number }) => void) => () => void;

  // Folder operations
  setFolderCompleted: (completed: boolean) => Promise<boolean>;
  getFolderCompleted: () => Promise<boolean>;

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

  // CFEx transfer operations (Week 1 Days 5-7)
  cfex: {
    detectSources: () => Promise<{
      cards: string[];
      destinations: { photos: string; rawVideos: string };
      shouldAutoPopulate: boolean;
      selectedCard: string | undefined;
    }>;
    startTransfer: (config: {
      source: string;
      destinations: { photos: string; rawVideos: string };
      enabledDestinations: { photos: boolean; rawVideos: boolean };
    }) => Promise<{
      success: boolean;
      filesTransferred: number;
      filesTotal: number;
      bytesTransferred: number;
      duration: number;
      validationWarnings: Array<{
        file: string;
        message: string;
        severity: 'low' | 'medium' | 'high';
      }>;
      errors: Array<{
        file: string;
        error: Error;
        phase: 'scan' | 'transfer' | 'validation';
      }>;
    }>;
    onTransferProgress: (callback: (progress: {
      currentFile: string;
      fileIndex: number;
      filesTotal: number;
      percentComplete: number;
      totalBytesTransferred: number;
      totalBytesExpected: number;
      estimatedTimeRemaining: number;
    }) => void) => () => void;
    getTransferState: () => Promise<{
      status: 'idle' | 'scanning' | 'transferring' | 'validating' | 'complete' | 'error';
      filesCompleted: number;
      filesTotal: number;
      bytesTransferred: number;
      bytesTotal: number;
      currentFile?: string;
      error?: Error;
    }>;
  };

  // Proxy generation operations (Phase 1b B2.6)
  proxy: {
    generateProxies: (request: {
      rawVideoFolder: string;
      proxyOutputFolder: string;
      videoFilenames: string[];
    }) => Promise<{
      success: boolean;
      completedCount: number;
      failedCount: number;
      failedFiles: Array<{ filename: string; error: string }>;
      verificationFailures: Array<{
        proxyPath: string;
        rawDateTimeOriginal: string | null;
        proxyDateTimeOriginal: string | null;
        match: boolean;
      }>;
    }>;
    onProxyProgress: (callback: (progress: {
      type: 'file_start' | 'file_complete' | 'file_failed' | 'transcode_progress' | 'phase_start';
      filename?: string;
      index?: number;
      total?: number;
      success?: boolean;
      error?: string;
      timeString?: string;
      percentage?: number;
      phase?: 'transcode' | 'exif_preserve';
    }) => void) => () => void;
  };
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
