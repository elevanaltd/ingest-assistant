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
  // === File Identification ===
  /** First 8 digits extracted from filename */
  id: string;
  /** Original filename */
  originalFilename: string;
  /** Current filename (may be renamed or unchanged) */
  currentFilename: string;
  /** Full path to the file */
  filePath: string;
  /** File extension */
  extension: string;
  /** File type: image or video */
  fileType: 'image' | 'video';
  /** Original creation timestamp from camera/device (used for unique naming) */
  creationTimestamp?: Date;
  /** Camera clip ID extracted from original filename (e.g., "EA001597") */
  cameraId?: string;
  /** Sequential shot number assigned chronologically within folder (1-based, immutable) */
  shotNumber?: number;

  // === Core Metadata (matches XMP) ===
  /** Main descriptive name (kebab-case) - XMP-xmpDM:shotName */
  shotName: string;
  /** Array of keyword tags - XMP-dc:Description */
  keywords: string[];
  /** Field-level lock array (prevents editing specific fields) - CEP Panel R1.1 */
  lockedFields: string[];

  // === Structured Components (XMP-xmpDM:LogComment) ===
  /** Location where shot takes place (e.g., "kitchen", "bathroom") */
  location: string;
  /** Main subject/object in shot (e.g., "oven", "sink") */
  subject: string;
  /** Action being performed (empty string for images, e.g., "cleaning" for videos) */
  action: string;
  /** Shot type from controlled vocabulary */
  shotType: ShotType | '';

  // === Processing State ===
  /** Whether this file has been processed by AI */
  processedByAI: boolean;
  /** Whether metadata is from legacy v1.0 JSON (outdated schema) */
  isOutdated?: boolean;

  // === Audit Trail (CEP Panel alignment) ===
  /** When metadata was first created */
  createdAt: Date;
  /** System that created metadata: "ingest-assistant" | "cep-panel" | "manual" */
  createdBy: string;
  /** When metadata was last modified */
  modifiedAt: Date;
  /** System that last modified metadata */
  modifiedBy: string;
  /** App version that created/modified this metadata */
  version: string;
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
  /** Common actions for video analysis (not enforced) */
  commonActions?: string[];
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
  /** Comma-separated list of common actions (for videos) */
  commonActions: string;
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
  /** Structured main name: {location}-{subject}-{shotType} or {location}-{subject}-{action}-{shotType} */
  shotName: string;
  /** Array of keyword tags */
  keywords: string[];
  /** AI confidence score (0-1) */
  confidence: number;

  // Structured components (required - parsed from shotName or provided directly)
  /** Location component */
  location: string;
  /** Subject component */
  subject: string;
  /** Action component (empty string for images) */
  action: string;
  /** Shot type component */
  shotType: ShotType | '';
}

/**
 * Paginated file list response
 */
export interface FileListRangeResponse {
  /** Array of file metadata for the requested range */
  files: FileMetadata[];
  /** Total number of files available */
  totalCount: number;
  /** Starting index of this page (0-based) */
  startIndex: number;
  /** Number of items requested per page */
  pageSize: number;
  /** Whether more files exist beyond this page */
  hasMore: boolean;
}

/**
 * Batch Operation Types (Issue #24)
 * Support for batch processing with progress tracking and cancellation
 */

/** Status of a single file in the batch queue */
export type BatchItemStatus = 'pending' | 'processing' | 'completed' | 'error' | 'cancelled';

/** Status of the overall batch queue */
export type BatchQueueStatus = 'idle' | 'processing' | 'completed' | 'cancelled' | 'error';

/** Single item in the batch queue */
export interface BatchQueueItem {
  /** File ID being processed */
  fileId: string;
  /** Current status of this item */
  status: BatchItemStatus;
  /** AI analysis result if completed successfully */
  result?: AIAnalysisResult;
  /** Error message if processing failed */
  error?: string;
}

/** Current state of the batch queue */
export interface BatchQueueState {
  /** All items in the queue */
  items: BatchQueueItem[];
  /** Overall queue status */
  status: BatchQueueStatus;
  /** File ID currently being processed */
  currentFile: string | null;
}

/** Progress event emitted during batch processing */
export interface BatchProgress {
  /** Current file number being processed (1-indexed) */
  current: number;
  /** Total number of files in batch */
  total: number;
  /** File ID being processed */
  fileId: string;
  /** Status of current file */
  status: BatchItemStatus;
  /** Error message if status is 'error' */
  error?: string;
}

/** Summary emitted when batch completes */
export interface BatchCompleteSummary {
  /** Final status of the batch */
  status: BatchQueueStatus;
  /** Number of files completed successfully */
  completed: number;
  /** Number of files that failed */
  failed: number;
  /** Number of files cancelled */
  cancelled: number;
}

export interface IPCChannels {
  // File operations
  'file:select-folder': () => Promise<string | null>;
  'file:load-files': () => Promise<FileMetadata[]>;
  'file:list-range': (startIndex: number, pageSize: number) => Promise<FileListRangeResponse>;
  'file:read-as-data-url': (filePath: string) => Promise<string>;
  'file:rename': (fileId: string, shotName: string, currentPath: string, structured?: { location?: string; subject?: string; action?: string; shotType?: string }) => Promise<boolean>;
  'file:update-metadata': (fileId: string, metadata: string[]) => Promise<boolean>;
  'file:update-structured-metadata': (fileId: string, structured: { location: string; subject: string; action?: string; shotType: string }, filePath?: string, fileType?: 'image' | 'video') => Promise<boolean>;

  // AI operations
  'ai:is-configured': () => Promise<boolean>;
  'ai:analyze-file': (filePath: string) => Promise<AIAnalysisResult>;
  'ai:batch-process': (fileIds: string[]) => Promise<Record<string, AIAnalysisResult>>;
  'ai:get-config': () => Promise<AIConfigForUI>;

  // Batch operations (Issue #24)
  'batch:start': (fileIds: string[]) => Promise<string>; // Returns queue ID
  'batch:cancel': () => Promise<{ success: boolean }>;
  'batch:get-status': () => Promise<BatchQueueState>;
  'ai:update-config': (config: { provider: 'openai' | 'anthropic' | 'openrouter'; model: string; apiKey: string }) => Promise<{ success: boolean; error?: string }>;
  'ai:test-connection': (provider: 'openai' | 'anthropic' | 'openrouter', model: string, apiKey: string) => Promise<AIConnectionTestResult>;
  'ai:test-saved-connection': () => Promise<AIConnectionTestResult>;
  'ai:get-models': (provider: string) => Promise<Array<{id: string; name: string; description?: string}>>;

  // Config operations
  'config:load': () => Promise<AppConfig>;
  'config:save': (config: AppConfig) => Promise<boolean>;
  'config:get-lexicon': () => Promise<Lexicon>;
  'config:get-shot-types': () => Promise<string[]>;

  // Lexicon operations
  'lexicon:load': () => Promise<LexiconConfig>;
  'lexicon:save': (config: LexiconConfig) => Promise<boolean>;
}
