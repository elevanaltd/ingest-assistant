import type { FileMetadata, AppConfig, AIAnalysisResult, Lexicon } from './index';

export interface ElectronAPI {
  // File operations
  selectFolder: () => Promise<string | null>;
  loadFiles: (folderPath: string) => Promise<FileMetadata[]>;
  readFileAsDataUrl: (filePath: string) => Promise<string>;
  renameFile: (fileId: string, mainName: string, currentPath: string) => Promise<boolean>;
  updateMetadata: (fileId: string, metadata: string[]) => Promise<boolean>;

  // AI operations
  isAIConfigured: () => Promise<boolean>;
  analyzeFile: (filePath: string) => Promise<AIAnalysisResult>;
  batchProcess: (fileIds: string[]) => Promise<Record<string, AIAnalysisResult>>;

  // Config operations
  loadConfig: () => Promise<AppConfig>;
  saveConfig: (config: AppConfig) => Promise<boolean>;
  getLexicon: () => Promise<Lexicon>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
