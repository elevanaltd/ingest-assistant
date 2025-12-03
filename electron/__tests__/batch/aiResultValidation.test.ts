import { describe, it, expect } from 'vitest';
import { isAIFailure } from '../../utils/aiResultValidation';

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
 * TDD Evidence: These tests exercise the PRODUCTION helper from electron/utils/aiResultValidation.ts
 * to ensure regression protection.
 */

describe('AI Result Validation (Issue #128)', () => {
  describe('isAIFailure detection', () => {
    it('should detect TRUE FAILURE: confidence=0 with all empty fields', () => {
      const failureResult = {
        version: '2',
        shotName: '',
        keywords: [],
        confidence: 0,
        location: '',
        subject: '',
        action: '',
        shotType: '',
      } as any;

      expect(isAIFailure(failureResult)).toBe(true);
    });

    it('should detect TRUE FAILURE: confidence=0 with undefined fields', () => {
      const failureResult = {
        version: '2',
        shotName: '',
        keywords: [],
        confidence: 0,
        location: undefined,
        subject: undefined,
        action: undefined,
        shotType: undefined,
      } as any;

      expect(isAIFailure(failureResult)).toBe(true);
    });

    it('should NOT detect failure: confidence=0 but has location data (PR #131 preserved)', () => {
      const validLowConfidence = {
        version: '2',
        shotName: '',
        keywords: [],
        confidence: 0,
        location: 'kitchen',
      } as any;

      expect(isAIFailure(validLowConfidence)).toBe(false);
    });

    it('should NOT detect failure: confidence=0 but has subject data (PR #131 preserved)', () => {
      const validLowConfidence = {
        version: '2',
        shotName: '',
        keywords: [],
        confidence: 0,
        subject: 'oven',
      } as any;

      expect(isAIFailure(validLowConfidence)).toBe(false);
    });

    it('should NOT detect failure: confidence=0.3 with some data (normal QC workflow)', () => {
      const normalResult = {
        version: '2',
        shotName: '',
        keywords: [],
        confidence: 0.3,
        location: 'kitchen',
        subject: 'oven',
        shotType: 'CU',
      } as any;

      expect(isAIFailure(normalResult)).toBe(false);
    });

    it('should NOT detect failure: high confidence with full data', () => {
      const successResult = {
        version: '2',
        shotName: '',
        keywords: [],
        confidence: 0.9,
        location: 'kitchen',
        subject: 'oven',
        action: 'cleaning',
        shotType: 'WS',
      } as any;

      expect(isAIFailure(successResult)).toBe(false);
    });

    it('should NOT detect failure: confidence=0 but has action data (PR #131 preserved)', () => {
      const validLowConfidence = {
        version: '2',
        shotName: '',
        keywords: [],
        confidence: 0,
        action: 'cleaning',
      } as any;

      expect(isAIFailure(validLowConfidence)).toBe(false);
    });

    it('should NOT detect failure: confidence=0 but has shotType data (PR #131 preserved)', () => {
      const validLowConfidence = {
        version: '2',
        shotName: '',
        keywords: [],
        confidence: 0,
        shotType: 'MID',
      } as any;

      expect(isAIFailure(validLowConfidence)).toBe(false);
    });

    it('should NOT detect failure: confidence=0.01 with data (not a failure boundary)', () => {
      // Edge case: Very low but non-zero confidence with data should NOT be treated as failure
      const edgeCase = {
        version: '2',
        shotName: '',
        keywords: [],
        confidence: 0.01,
        location: 'kitchen',
      } as any;

      expect(isAIFailure(edgeCase)).toBe(false);
    });
  });

  describe('processedByAI flag behavior', () => {
    it('should NOT set processedByAI=true when AI returns TRUE FAILURE', () => {
      // This test validates the expected behavior after GREEN phase implementation
      // Current behavior (before fix): processedByAI=true incorrectly set
      // Expected behavior (after fix): processedByAI remains false

      const aiFailureResult = {
        version: '2',
        shotName: '',
        keywords: [],
        confidence: 0,
      } as any;

      const shouldProcess = !isAIFailure(aiFailureResult);

      // TRUE FAILURE should NOT be processed
      expect(shouldProcess).toBe(false);
    });

    it('should set processedByAI=true when AI returns low confidence with data (PR #131)', () => {
      // PR #131: Write ALL results regardless of confidence for QC workflow
      const lowConfidenceResult = {
        version: '2',
        shotName: '',
        keywords: [],
        confidence: 0.2,
        location: 'kitchen',
        subject: 'oven',
        shotType: 'CU',
      } as any;

      const shouldProcess = !isAIFailure(lowConfidenceResult);

      // Low confidence WITH data should be processed per PR #131
      expect(shouldProcess).toBe(true);
    });

    it('should set processedByAI=true when AI returns confidence=0 but has some structured data (PR #131)', () => {
      // PR #131: Even confidence=0 with partial data should be written for QC
      const partialDataResult = {
        version: '2',
        shotName: '',
        keywords: [],
        confidence: 0,
        location: 'kitchen',
      } as any;

      const shouldProcess = !isAIFailure(partialDataResult);

      // confidence=0 but WITH some data should be processed per PR #131
      expect(shouldProcess).toBe(true);
    });
  });
});
