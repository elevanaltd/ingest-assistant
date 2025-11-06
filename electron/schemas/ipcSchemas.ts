import { z } from 'zod';

/**
 * IPC Message Validation Schemas
 *
 * Purpose: Prevent type confusion attacks and injection from malicious renderer
 * Mitigates: CRITICAL-8 (IPC Message Validation)
 *
 * Security-specialist: consulted for validation constraints
 */

// File operations
export const FileRenameSchema = z.object({
  fileId: z.string().min(1).max(50),
  mainName: z.string().min(1).max(500),
  currentPath: z.string().min(1),
});

export const FileUpdateMetadataSchema = z.object({
  fileId: z.string().min(1).max(50),
  metadata: z.array(z.string()).max(100), // Max 100 metadata items
});

// AI operations
export const AIAnalyzeFileSchema = z.object({
  filePath: z.string().min(1),
});

export const AIBatchProcessSchema = z.object({
  fileIds: z.array(z.string()).min(1).max(100), // Max 100 files per batch
});

// Config operations
export const ConfigSaveSchema = z.object({
  provider: z.enum(['openai', 'anthropic']),
  apiKey: z.string().min(1).max(200),
  model: z.string().min(1).max(100),
});

// Lexicon operations
export const LexiconSaveSchema = z.object({
  lexicon: z.record(z.string(), z.unknown()).refine(
    (obj) => Object.keys(obj).length <= 1000,
    'Lexicon cannot exceed 1000 entries'
  ),
});

// Type exports for TypeScript
export type FileRenameInput = z.infer<typeof FileRenameSchema>;
export type FileUpdateMetadataInput = z.infer<typeof FileUpdateMetadataSchema>;
export type AIAnalyzeFileInput = z.infer<typeof AIAnalyzeFileSchema>;
export type AIBatchProcessInput = z.infer<typeof AIBatchProcessSchema>;
export type ConfigSaveInput = z.infer<typeof ConfigSaveSchema>;
export type LexiconSaveInput = z.infer<typeof LexiconSaveSchema>;
