/**
 * Versioned Zod schemas for AIAnalysisResult
 *
 * Provides runtime validation, schema evolution, and migration support for AI analysis results
 * transmitted via IPC between main and renderer processes.
 *
 * Architecture:
 * - V1: Legacy format (pre-structured naming, implicit version)
 * - V2: Current format (structured naming with location/subject/action/shotType)
 * - Discriminated union enables type-safe version detection
 *
 * Related: ADR-008 (Result Type Schema Versioning & Serialization)
 */

import { z } from 'zod';

/**
 * Valid shot type values
 * Static shots: WS (Wide Shot), MID (Mid Shot), CU (Close Up), UNDER (Under Shot)
 * Moving shots: FP (First Person), TRACK (Tracking Shot), ESTAB (Establishing Shot)
 */
export const ShotTypeSchema = z.enum([
  'WS',
  'MID',
  'CU',
  'UNDER',
  'FP',
  'TRACK',
  'ESTAB',
]);

/**
 * Version 1: Legacy AI Analysis Result (pre-structured naming)
 *
 * Format used before Phase 1 implementation of structured naming.
 * Contains only mainName (string) without parsed components.
 *
 * Version field:
 * - May be missing (legacy data without version field)
 * - Defaults to '1' for backward compatibility
 *
 * Example:
 * ```json
 * {
 *   "mainName": "kitchen-oven-controls",
 *   "metadata": ["kitchen", "oven", "controls"],
 *   "confidence": 0.85
 * }
 * ```
 */
export const AIAnalysisResultV1Schema = z.object({
  version: z.literal('1').optional().default('1'),
  mainName: z.string(),
  metadata: z.array(z.string()),
  confidence: z.number().min(0).max(1),
});

/**
 * Version 2: Current AI Analysis Result (structured naming)
 *
 * Format introduced in Phase 1 with structured naming components.
 * Parses mainName into location, subject, action (videos only), and shotType.
 *
 * Version field:
 * - Required (must be '2')
 * - Enables type-safe discrimination in union
 *
 * Patterns:
 * - Photo: {location}-{subject}-{shotType} (no action)
 * - Video: {location}-{subject}-{action}-{shotType}
 *
 * Example:
 * ```json
 * {
 *   "version": "2",
 *   "mainName": "kitchen-oven-installing-CU",
 *   "metadata": ["kitchen", "oven", "installation"],
 *   "confidence": 0.9,
 *   "location": "kitchen",
 *   "subject": "oven",
 *   "action": "installing",
 *   "shotType": "CU"
 * }
 * ```
 */
export const AIAnalysisResultV2Schema = z.object({
  version: z.literal('2'),
  mainName: z.string(),
  metadata: z.array(z.string()),
  confidence: z.number().min(0).max(1),
  location: z.string().optional(),
  subject: z.string().optional(),
  action: z.string().optional(),
  shotType: ShotTypeSchema.optional(),
});

/**
 * Discriminated union of all AIAnalysisResult versions
 *
 * TypeScript can narrow the union type based on the `version` field:
 * ```typescript
 * const result = AIAnalysisResultSchema.parse(data);
 * if (result.version === '1') {
 *   // result is AIAnalysisResultV1
 * } else {
 *   // result is AIAnalysisResultV2
 * }
 * ```
 *
 * Validation errors provide clear messages:
 * - "Invalid discriminator value. Expected '1' | '2'"
 * - "Required at [path]"
 * - "Expected number, received string"
 */
export const AIAnalysisResultSchema = z.discriminatedUnion('version', [
  AIAnalysisResultV1Schema,
  AIAnalysisResultV2Schema,
]);

/**
 * Type exports for use in TypeScript code
 *
 * Usage:
 * ```typescript
 * import type { AIAnalysisResultV2 } from './schemas/aiResultSchemas';
 *
 * function processResult(result: AIAnalysisResultV2) {
 *   console.log(result.location); // Type-safe access
 * }
 * ```
 */
export type AIAnalysisResultV1 = z.infer<typeof AIAnalysisResultV1Schema>;
export type AIAnalysisResultV2 = z.infer<typeof AIAnalysisResultV2Schema>;
export type AIAnalysisResult = z.infer<typeof AIAnalysisResultSchema>;

/**
 * Helper type guard for v1 results
 */
export function isV1Result(result: AIAnalysisResult): result is AIAnalysisResultV1 {
  return result.version === '1' || !('version' in result);
}

/**
 * Helper type guard for v2 results
 */
export function isV2Result(result: AIAnalysisResult): result is AIAnalysisResultV2 {
  return result.version === '2';
}
