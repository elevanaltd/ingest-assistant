/**
 * Shared types for ingest-assistant
 */

export interface FileMetadata {
  /** First 8 digits extracted from filename */
  id: string;
  /** Original filename */
  originalFilename: string;
  /** Current filename (may be renamed) */
  currentFilename: string;
  /** Full path to the file */
  filePath: string;
  /** File extension */
  extension: string;
  /** Main descriptive name (kebab-case) */
  mainName: string;
  /** Array of metadata tags */
  metadata: string[];
  /** Whether this file has been processed by AI */
  processedByAI: boolean;
  /** Last modified timestamp */
  lastModified: Date;
  /** File type: image or video */
  fileType: 'image' | 'video';
}

export interface Lexicon {
  /** Terms to prefer when AI generates names/metadata */
  preferredTerms: string[];
  /** Terms to avoid */
  excludedTerms: string[];
  /** Synonym mapping (e.g., "faucet" -> "tap") */
  synonymMapping: Record<string, string>;
  /** Categorized term groups */
  categories?: Record<string, string[]>;
  /** Custom AI instructions (free-form guidance) */
  customInstructions?: string;
}

/** UI representation of term mapping for Settings Modal */
export interface TermMapping {
  /** Preferred term to use */
  preferred: string;
  /** Comma-separated excluded terms */
  excluded: string;
}

/** UI configuration for lexicon settings */
export interface LexiconConfig {
  /** Table rows of preferred/excluded term mappings */
  termMappings: TermMapping[];
  /** Additional preferred terms (not part of mappings) */
  alwaysInclude: string[];
  /** Free-form AI guidance */
  customInstructions: string;
}

export interface AppConfig {
  lexicon: Lexicon;
}

export interface AIConfig {
  provider: 'openai' | 'anthropic' | 'openrouter';
  model: string;
  apiKey: string;
}

export interface AIAnalysisResult {
  mainName: string;
  metadata: string[];
  confidence: number;
}

export interface IPCChannels {
  // File operations
  'file:select-folder': () => Promise<string | null>;
  'file:load-files': (folderPath: string) => Promise<FileMetadata[]>;
  'file:rename': (fileId: string, mainName: string) => Promise<boolean>;
  'file:update-metadata': (fileId: string, metadata: string[]) => Promise<boolean>;

  // AI operations
  'ai:analyze-file': (filePath: string) => Promise<AIAnalysisResult>;
  'ai:batch-process': (fileIds: string[]) => Promise<Map<string, AIAnalysisResult>>;

  // Config operations
  'config:load': () => Promise<AppConfig>;
  'config:save': (config: AppConfig) => Promise<boolean>;
  'config:get-lexicon': () => Promise<Lexicon>;
}
