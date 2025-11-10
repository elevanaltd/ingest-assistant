/**
 * Serialization layer for AIAnalysisResult with versioning and migration support
 *
 * Provides type-safe serialization/deserialization for AI analysis results transmitted
 * via IPC between main and renderer processes.
 *
 * Features:
 * - Runtime validation (prevents crashes from malformed data)
 * - Version migration (v1 → v2 automatic upgrade)
 * - Backward compatibility (reads legacy data without version field)
 * - Forward compatibility (graceful degradation if needed)
 *
 * Architecture:
 * ```
 * AIService.parseAIResponse() → creates unversioned result
 *     ↓
 * serializeResult() → adds version='2', validates, stringifies
 *     ↓
 * IPC transmission (JSON over Electron IPC)
 *     ↓
 * deserializeResult() → parses, validates, migrates if v1, returns v2
 *     ↓
 * Renderer consumes type-safe AIAnalysisResultV2
 * ```
 *
 * Related: ADR-008 (Result Type Schema Versioning & Serialization)
 */

import {
  AIAnalysisResultSchema,
  AIAnalysisResultV2Schema,
  ShotTypeSchema,
  type AIAnalysisResultV1,
  type AIAnalysisResultV2,
} from '../schemas/aiResultSchemas';
import { z } from 'zod';

/**
 * Serialize AI analysis result for IPC transmission
 *
 * Takes untyped result (from AIService.parseAIResponse) and:
 * 1. Adds version='2' field
 * 2. Validates against V2 schema
 * 3. Returns type-safe result
 *
 * Throws ZodError if validation fails (invalid structure, missing required fields, etc.)
 *
 * @param result - Unversioned result from AI service
 * @returns Validated V2 result with version field
 *
 * @example
 * ```typescript
 * const rawResult = aiService.parseAIResponse(apiResponse);
 * const validated = serializeResult(rawResult);
 * // validated.version === '2'
 * // validated is AIAnalysisResultV2
 * ```
 */
export function serializeResult(result: unknown): AIAnalysisResultV2 {
  // Add version field for new results (default to v2)
  // Cast to Record<string, unknown> to allow spreading
  const versionedResult = {
    version: '2',
    ...(result as Record<string, unknown>),
  };

  // Validate before serialization
  // This catches:
  // - Missing required fields (mainName, metadata, confidence)
  // - Invalid types (confidence not number, metadata not array, etc.)
  // - Out of range values (confidence > 1)
  // - Invalid shot types (not in enum)
  const validated = AIAnalysisResultV2Schema.parse(versionedResult);

  return validated;
}

/**
 * Deserialize AI analysis result from IPC with automatic migration
 *
 * Takes JSON data (from IPC) and:
 * 1. Parses JSON
 * 2. Validates against all known versions (v1 or v2)
 * 3. Migrates v1 → v2 if needed
 * 4. Returns type-safe V2 result
 *
 * Migration strategy (v1 → v2):
 * - Attempts to parse mainName into structured components
 * - Recognizes patterns: {location}-{subject}-{shotType} or {location}-{subject}-{action}-{shotType}
 * - Falls back to mainName-only if pattern doesn't match
 *
 * Throws ZodError if validation fails (unknown version, invalid structure, etc.)
 *
 * @param data - Serialized result (unknown structure)
 * @returns Validated and migrated V2 result
 *
 * @example
 * ```typescript
 * // V1 legacy data
 * const v1Data = { mainName: 'kitchen-oven-CU', metadata: [], confidence: 0.8 };
 * const v2 = deserializeResult(v1Data);
 * // v2.version === '2'
 * // v2.location === 'kitchen'
 * // v2.subject === 'oven'
 * // v2.shotType === 'CU'
 * ```
 */
export function deserializeResult(data: unknown): AIAnalysisResultV2 {
  // Validate against all known versions (discriminated union)
  // Zod will:
  // - Check if version field exists and is '1' or '2'
  // - Validate structure based on version
  // - Narrow type to specific version
  const validated = AIAnalysisResultSchema.parse(data);

  // Migrate to current version if needed
  if (validated.version === '1' || !('version' in validated)) {
    return migrateV1ToV2(validated);
  }

  return validated;
}

/**
 * Migrate V1 result to V2 by parsing mainName pattern
 *
 * Attempts to extract structured components from mainName string.
 *
 * Recognized patterns:
 * 1. Photo: {location}-{subject}-{shotType}
 *    Example: "kitchen-oven-CU" → {location: "kitchen", subject: "oven", shotType: "CU"}
 *
 * 2. Video: {location}-{subject}-{action}-{shotType}
 *    Example: "kitchen-oven-installing-CU" → {location: "kitchen", subject: "oven", action: "installing", shotType: "CU"}
 *
 * 3. No match: Preserve mainName, no structured components
 *    Example: "random-description" → {mainName: "random-description"}
 *
 * Shot type validation:
 * - Only recognizes known shot types (WS, MID, CU, UNDER, FP, TRACK, ESTAB)
 * - Case-insensitive matching (converts to uppercase)
 *
 * @param v1 - Legacy V1 result
 * @returns Migrated V2 result
 *
 * @private
 */
function migrateV1ToV2(v1: AIAnalysisResultV1): AIAnalysisResultV2 {
  const parts = v1.mainName.split('-');

  // Try parsing as 3-part pattern: {location}-{subject}-{shotType}
  if (parts.length === 3) {
    const potentialShotType = parts[2].toUpperCase();

    // Validate shot type using Zod schema
    const shotTypeResult = ShotTypeSchema.safeParse(potentialShotType);

    if (shotTypeResult.success) {
      console.log('[resultSerializer] Migrated v1→v2 (3-part pattern):', {
        mainName: v1.mainName,
        location: parts[0],
        subject: parts[1],
        shotType: shotTypeResult.data,
      });

      return {
        version: '2',
        mainName: v1.mainName,
        metadata: v1.metadata,
        confidence: v1.confidence,
        location: parts[0],
        subject: parts[1],
        shotType: shotTypeResult.data,
      };
    }
  }

  // Try parsing as 4-part pattern: {location}-{subject}-{action}-{shotType}
  if (parts.length === 4) {
    const potentialShotType = parts[3].toUpperCase();

    // Validate shot type using Zod schema
    const shotTypeResult = ShotTypeSchema.safeParse(potentialShotType);

    if (shotTypeResult.success) {
      console.log('[resultSerializer] Migrated v1→v2 (4-part pattern):', {
        mainName: v1.mainName,
        location: parts[0],
        subject: parts[1],
        action: parts[2],
        shotType: shotTypeResult.data,
      });

      return {
        version: '2',
        mainName: v1.mainName,
        metadata: v1.metadata,
        confidence: v1.confidence,
        location: parts[0],
        subject: parts[1],
        action: parts[2],
        shotType: shotTypeResult.data,
      };
    }
  }

  // No pattern match - return without structured components
  console.log('[resultSerializer] Migrated v1→v2 (no pattern match):', {
    mainName: v1.mainName,
    reason: 'mainName does not match {location}-{subject}-{shotType} or {location}-{subject}-{action}-{shotType} pattern',
  });

  return {
    version: '2',
    mainName: v1.mainName,
    metadata: v1.metadata,
    confidence: v1.confidence,
  };
}

/**
 * Validation helper: Check if data is a valid AIAnalysisResult (any version)
 *
 * Non-throwing validation useful for:
 * - Pre-flight checks
 * - Graceful degradation
 * - Logging/debugging
 *
 * @param data - Unknown data to validate
 * @returns true if valid, false otherwise
 *
 * @example
 * ```typescript
 * if (isValidResult(data)) {
 *   const result = deserializeResult(data);
 * } else {
 *   console.error('Invalid result data:', data);
 * }
 * ```
 */
export function isValidResult(data: unknown): boolean {
  return AIAnalysisResultSchema.safeParse(data).success;
}

/**
 * Validation helper: Get validation errors without throwing
 *
 * Useful for debugging and error reporting.
 *
 * @param data - Unknown data to validate
 * @returns Validation errors if invalid, null if valid
 *
 * @example
 * ```typescript
 * const errors = getValidationErrors(data);
 * if (errors) {
 *   console.error('Validation failed:', errors.issues);
 * }
 * ```
 */
export function getValidationErrors(data: unknown): z.ZodError | null {
  const result = AIAnalysisResultSchema.safeParse(data);
  return result.success ? null : result.error;
}
