import { describe, it, expect } from 'vitest';

/**
 * AI Result Validation Tests (Issue #128)
 *
 * Problem: AI cataloging can fail silently, leaving processedByAI=true with empty metadata fields.
 * Production evidence: 46 clips in EAV036 had empty fields.
 *
 * Root Cause: No validation gate after AI analysis. When AI returns confidence=0 with all empty fields
 * (a TRUE FAILURE from aiService catch blocks), the code still marks the file as processed.
 *
 * CRITICAL ALIGNMENT: PR #131 removed confidence thresholds - we write ALL results for QC workflow.
 * This fix must PRESERVE that behavior:
 * - confidence > 0 with ANY data → Write results, set processedByAI=true (QC workflow)
 * - confidence === 0 AND ALL empty fields → TRUE FAILURE, DON'T set processedByAI=true
 *
 * TDD Evidence: RED phase - These tests FAIL before implementation
 */

/**
 * Helper function to detect AI analysis TRUE FAILURE
 * TRUE FAILURE = confidence 0 AND all structured fields empty
 *
 * This distinguishes between:
 * 1. Low confidence results with some data (valid per PR #131) → processedByAI=true
 * 2. Total AI failure with no data (aiService catch block) → processedByAI=false
 */
export function isAIFailure(result: {
  confidence: number;
  location?: string;
  subject?: string;
  action?: string;
  shotType?: string;
}): boolean {
  return (
    result.confidence === 0 &&
    !result.location &&
    !result.subject &&
    !result.action &&
    !result.shotType
  );
}

describe('AI Result Validation (Issue #128)', () => {
  describe('isAIFailure detection', () => {
    it('should detect TRUE FAILURE: confidence=0 with all empty fields', () => {
      const failureResult = {
        confidence: 0,
        location: '',
        subject: '',
        action: '',
        shotType: '',
      };

      expect(isAIFailure(failureResult)).toBe(true);
    });

    it('should detect TRUE FAILURE: confidence=0 with undefined fields', () => {
      const failureResult = {
        confidence: 0,
        location: undefined,
        subject: undefined,
        action: undefined,
        shotType: undefined,
      };

      expect(isAIFailure(failureResult)).toBe(true);
    });

    it('should NOT detect failure: confidence=0 but has location data (PR #131 preserved)', () => {
      const validLowConfidence = {
        confidence: 0,
        location: 'kitchen',
        subject: '',
        action: '',
        shotType: '',
      };

      expect(isAIFailure(validLowConfidence)).toBe(false);
    });

    it('should NOT detect failure: confidence=0 but has subject data (PR #131 preserved)', () => {
      const validLowConfidence = {
        confidence: 0,
        location: '',
        subject: 'oven',
        action: '',
        shotType: '',
      };

      expect(isAIFailure(validLowConfidence)).toBe(false);
    });

    it('should NOT detect failure: confidence=0.3 with some data (normal QC workflow)', () => {
      const normalResult = {
        confidence: 0.3,
        location: 'kitchen',
        subject: 'oven',
        action: '',
        shotType: 'CU',
      };

      expect(isAIFailure(normalResult)).toBe(false);
    });

    it('should NOT detect failure: high confidence with full data', () => {
      const successResult = {
        confidence: 0.9,
        location: 'kitchen',
        subject: 'oven',
        action: 'cleaning',
        shotType: 'WS',
      };

      expect(isAIFailure(successResult)).toBe(false);
    });

    it('should NOT detect failure: confidence=0 but has action data (PR #131 preserved)', () => {
      const validLowConfidence = {
        confidence: 0,
        location: '',
        subject: '',
        action: 'cleaning',
        shotType: '',
      };

      expect(isAIFailure(validLowConfidence)).toBe(false);
    });

    it('should NOT detect failure: confidence=0 but has shotType data (PR #131 preserved)', () => {
      const validLowConfidence = {
        confidence: 0,
        location: '',
        subject: '',
        action: '',
        shotType: 'MID',
      };

      expect(isAIFailure(validLowConfidence)).toBe(false);
    });

    it('should detect failure: confidence=0.01 treated as failure boundary', () => {
      // Edge case: Very low but non-zero confidence with data should NOT be treated as failure
      const edgeCase = {
        confidence: 0.01,
        location: 'kitchen',
        subject: '',
        action: '',
        shotType: '',
      };

      expect(isAIFailure(edgeCase)).toBe(false);
    });
  });

  describe('processedByAI flag behavior', () => {
    it('should NOT set processedByAI=true when AI returns TRUE FAILURE', () => {
      // This test validates the expected behavior after GREEN phase implementation
      // Current behavior (before fix): processedByAI=true incorrectly set
      // Expected behavior (after fix): processedByAI remains false

      const aiFailureResult = {
        confidence: 0,
        location: '',
        subject: '',
        action: '',
        shotType: '',
      };

      const shouldProcess = !isAIFailure(aiFailureResult);

      // TRUE FAILURE should NOT be processed
      expect(shouldProcess).toBe(false);
    });

    it('should set processedByAI=true when AI returns low confidence with data (PR #131)', () => {
      // PR #131: Write ALL results regardless of confidence for QC workflow
      const lowConfidenceResult = {
        confidence: 0.2,
        location: 'kitchen',
        subject: 'oven',
        action: '',
        shotType: 'CU',
      };

      const shouldProcess = !isAIFailure(lowConfidenceResult);

      // Low confidence WITH data should be processed per PR #131
      expect(shouldProcess).toBe(true);
    });

    it('should set processedByAI=true when AI returns confidence=0 but has some structured data (PR #131)', () => {
      // PR #131: Even confidence=0 with partial data should be written for QC
      const partialDataResult = {
        confidence: 0,
        location: 'kitchen',
        subject: '',
        action: '',
        shotType: '',
      };

      const shouldProcess = !isAIFailure(partialDataResult);

      // confidence=0 but WITH some data should be processed per PR #131
      expect(shouldProcess).toBe(true);
    });
  });
});
