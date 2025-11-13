import { z } from 'zod';

/**
 * IPC Message Validation Schemas
 *
 * Purpose: Prevent type confusion attacks and injection from malicious renderer
 * Mitigates: CRITICAL-8 (IPC Message Validation)
 *
 * Security-specialist: consulted for validation constraints
 */

// Structured metadata validation (BLOCKING fix for action field persistence)
// Prevents oversized payloads and injection attacks through structured IPC params
export const StructuredMetadataSchema = z.object({
  location: z.string().max(200),
  subject: z.string().max(200),
  action: z.string().max(200).optional(),
  shotType: z.enum(['WS', 'MID', 'CU', 'UNDER', 'FP', 'TRACK', 'ESTAB']),
}).optional();

// File operations
export const FileListRangeSchema = z.object({
  startIndex: z.number().int().min(0).max(1000000), // Prevent excessive values
  pageSize: z.number().int().min(1).max(100), // Limit page size to 100 items
});

export const FileRenameSchema = z.object({
  fileId: z.string().min(1).max(50),
  mainName: z.string().min(1).max(500),
  currentPath: z.string().min(1),
  structured: StructuredMetadataSchema,
});

export const FileUpdateMetadataSchema = z.object({
  fileId: z.string().min(1).max(50),
  keywords: z.array(z.string()).max(100), // Max 100 keyword items (renamed from metadata for v2.0 schema)
});

// Structured metadata update schema (for update-structured-metadata handler)
export const FileStructuredUpdateSchema = z.object({
  fileId: z.string().min(1).max(50),
  structured: z.object({
    location: z.string().max(200),
    subject: z.string().max(200),
    action: z.string().max(200).optional(),
    shotType: z.enum(['WS', 'MID', 'CU', 'UNDER', 'FP', 'TRACK', 'ESTAB']),
  }),
});

// AI operations
export const AIAnalyzeFileSchema = z.object({
  filePath: z.string().min(1),
});

export const AIBatchProcessSchema = z.object({
  fileIds: z.array(z.string()).min(1).max(100), // Max 100 files per batch
});

// Batch operations (Issue #24)
export const BatchStartSchema = z.object({
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
export type FileListRangeInput = z.infer<typeof FileListRangeSchema>;
export type StructuredMetadataInput = z.infer<typeof StructuredMetadataSchema>;
export type FileRenameInput = z.infer<typeof FileRenameSchema>;
export type FileUpdateMetadataInput = z.infer<typeof FileUpdateMetadataSchema>;
export type FileStructuredUpdateInput = z.infer<typeof FileStructuredUpdateSchema>;
export type AIAnalyzeFileInput = z.infer<typeof AIAnalyzeFileSchema>;
export type AIBatchProcessInput = z.infer<typeof AIBatchProcessSchema>;
export type ConfigSaveInput = z.infer<typeof ConfigSaveSchema>;
export type LexiconSaveInput = z.infer<typeof LexiconSaveSchema>;
