/**
 * Shared types for ingest-assistant
 */

/**
 * Shot type vocabulary for structured naming
 */
export type ShotType =
  | 'WS'     // Wide shot
  | 'MID'    // Midshot
  | 'CU'     // Close up
  | 'UNDER'  // Underneath
  | 'FP'     // Focus pull
  | 'TRACK'  // Tracking
  | 'ESTAB'; // Establishing

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
  /** Main descriptive name (kebab-case) - format: {location}-{subject}-{shotType} */
  mainName: string;
  /** Array of metadata tags */
  metadata: string[];
  /** Whether this file has been processed by AI */
  processedByAI: boolean;
  /** Last modified timestamp */
  lastModified: Date;
  /** File type: image or video */
  fileType: 'image' | 'video';

  // Structured naming fields (optional for backward compatibility)
  /** Location where shot takes place (e.g., "kitchen", "bathroom") */
  location?: string;
  /** Main subject/object in shot (e.g., "oven", "sink") */
  subject?: string;
  /** Shot type from controlled vocabulary */
  shotType?: ShotType;
}

/**
 * Shot types structure for lexicon configuration
 */
export interface ShotTypesConfig {
  /** Static shot types (no camera movement) */
  static: string[];
  /** Moving shot types (camera movement or focus change) */
  moving: string[];
}

/**
 * Lexicon configuration
 * Supports both legacy format (preferredTerms, excludedTerms) and new structured format
 */
export interface Lexicon {
  // === NEW STRUCTURED FORMAT (Preferred) ===
  /** Filename pattern template */
  pattern?: string;
  /** Common locations for AI guidance (not enforced) */
  commonLocations?: string[];
  /** Common subjects for AI guidance (not enforced) */
  commonSubjects?: string[];
  /** Word preferences for synonym replacement */
  wordPreferences?: Record<string, string>;
  /** Shot type vocabulary (controlled - enforced in UI) */
  shotTypes?: ShotTypesConfig;
  /** Custom AI instructions for structured naming */
  aiInstructions?: string;
  /** Good example filenames for AI guidance */
  goodExamples?: string[];
  /** Bad example filenames with explanations for AI guidance */
  badExamples?: Array<{wrong: string, reason: string}>;

  // === LEGACY FORMAT (Backward compatibility) ===
  /** @deprecated Use commonLocations/commonSubjects instead */
  preferredTerms?: string[];
  /** @deprecated Use wordPreferences instead */
  excludedTerms?: string[];
  /** @deprecated Use wordPreferences instead */
  synonymMapping?: Record<string, string>;
  /** @deprecated Use commonLocations/commonSubjects instead */
  categories?: Record<string, string[]>;
  /** @deprecated Use aiInstructions instead */
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
  /** Filename pattern (e.g., "{location}-{subject}-{shotType}") */
  pattern: string;
  /** Comma-separated list of common locations */
  commonLocations: string;
  /** Comma-separated list of common subjects */
  commonSubjects: string;
  /** Word preferences mapping (one per line, format: "from → to") */
  wordPreferences: string;
  /** Custom AI instructions */
  aiInstructions: string;
  /** Correct example filenames (one per line) */
  goodExamples: string;
  /** Incorrect examples with reasons (one per line, format: "bad-example (reason)") */
  badExamples: string;
}

export interface AppConfig {
  lexicon: Lexicon;
}

export interface AIConfig {
  provider: 'openai' | 'anthropic' | 'openrouter';
  model: string;
  apiKey: string;
}

/** UI-safe AI configuration with masked API key */
export interface AIConfigForUI {
  provider: 'openai' | 'anthropic' | 'openrouter' | null;
  model: string | null;
  apiKey: string; // Masked for UI display
}

/** Result of AI connection test */
export interface AIConnectionTestResult {
  success: boolean;
  error?: string;
}

export interface AIAnalysisResult {
  /** Structured main name: {location}-{subject}-{shotType} */
  mainName: string;
  /** Array of metadata tags */
  metadata: string[];
  /** AI confidence score (0-1) */
  confidence: number;

  // Structured components (optional - parsed from mainName or provided directly)
  /** Location component */
  location?: string;
  /** Subject component */
  subject?: string;
  /** Shot type component */
  shotType?: ShotType;
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
