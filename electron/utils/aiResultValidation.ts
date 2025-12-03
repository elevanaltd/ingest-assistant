/**
 * AI Result Validation Utilities (Issue #128)
 *
 * Provides validation logic to detect AI analysis TRUE FAILURES vs valid low-confidence results.
 *
 * Context:
 * - Production evidence: 46 clips with processedByAI=true but empty metadata fields
 * - Root cause: No validation gate after AI analysis
 * - PR #131 requirement: Write ALL results (high + low confidence) for QC workflow
 *
 * This module distinguishes:
 * 1. TRUE FAILURE: confidence=0 AND all structured fields empty → DON'T mark processed
 * 2. Valid low-confidence: confidence=0 BUT some data present → WRITE for QC (PR #131)
 * 3. Normal operation: confidence>0 with any data → WRITE
 */

import type { AIAnalysisResult } from '../../src/types';

/**
 * Detect AI analysis TRUE FAILURE
 *
 * TRUE FAILURE occurs when the AI service catch block returns a failure sentinel:
 * - confidence = 0 (failure indicator)
 * - ALL structured fields empty (no useful data extracted)
 *
 * This distinguishes true failures from PR #131 valid low-confidence results:
 * - confidence=0 with location="kitchen" → VALID (write for QC)
 * - confidence=0 with all empty → TRUE FAILURE (don't mark processed)
 *
 * @param result AI analysis result to validate
 * @returns true if this is a true failure (should not mark as processed)
 *
 * @example
 * ```typescript
 * // TRUE FAILURE - don't mark as processed
 * isAIFailure({ confidence: 0, location: '', subject: '', action: '', shotType: '' })
 * // → true
 *
 * // Valid low-confidence result - write for QC per PR #131
 * isAIFailure({ confidence: 0, location: 'kitchen', subject: '', action: '', shotType: '' })
 * // → false
 *
 * // Normal operation
 * isAIFailure({ confidence: 0.8, location: 'kitchen', subject: 'oven', action: '', shotType: 'CU' })
 * // → false
 * ```
 */
export function isAIFailure(result: AIAnalysisResult): boolean {
  return (
    result.confidence === 0 &&
    !result.location &&
    !result.subject &&
    !result.action &&
    !result.shotType
  );
}
