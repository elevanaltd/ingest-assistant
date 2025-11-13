/**
 * Tests for AIAnalysisResult Zod schemas
 *
 * Validates schema definitions work correctly for:
 * - V1 schema (legacy format)
 * - V2 schema (structured naming)
 * - Discriminated union
 * - Type guards
 *
 * Related: ADR-008 (Result Type Schema Versioning & Serialization)
 */

import { describe, it, expect } from 'vitest';
import {
  AIAnalysisResultV1Schema,
  AIAnalysisResultV2Schema,
  AIAnalysisResultSchema,
  ShotTypeSchema,
  isV1Result,
  isV2Result,
} from './aiResultSchemas';

describe('aiResultSchemas', () => {
  describe('ShotTypeSchema', () => {
    it('validates all static shot types', () => {
      const staticShots = ['WS', 'MID', 'CU', 'UNDER'];

      for (const shot of staticShots) {
        expect(ShotTypeSchema.safeParse(shot).success).toBe(true);
      }
    });

    it('validates all moving shot types', () => {
      const movingShots = ['FP', 'TRACK', 'ESTAB'];

      for (const shot of movingShots) {
        expect(ShotTypeSchema.safeParse(shot).success).toBe(true);
      }
    });

    it('rejects invalid shot types', () => {
      const invalidShots = ['INVALID', 'XCU', 'WIDE', 'close-up'];

      for (const shot of invalidShots) {
        expect(ShotTypeSchema.safeParse(shot).success).toBe(false);
      }
    });
  });

  describe('AIAnalysisResultV1Schema', () => {
    it('validates v1 result with version field', () => {
      const v1 = {
        version: '1',
        mainName: 'kitchen-oven',
        keywords: ['kitchen', 'oven'],
        confidence: 0.8,
      };

      const result = AIAnalysisResultV1Schema.safeParse(v1);
      expect(result.success).toBe(true);
    });

    it('defaults version to "1" when missing', () => {
      const v1NoVersion = {
        mainName: 'kitchen-oven',
        keywords: ['kitchen'],
        confidence: 0.7,
      };

      const result = AIAnalysisResultV1Schema.safeParse(v1NoVersion);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.version).toBe('1');
      }
    });

    it('requires mainName field', () => {
      const missing = {
        version: '1',
        keywords: [],
        confidence: 0.8,
        // Missing mainName
      };

      expect(AIAnalysisResultV1Schema.safeParse(missing).success).toBe(false);
    });

    it('requires metadata array', () => {
      const missing = {
        version: '1',
        mainName: 'test',
        confidence: 0.8,
        // Missing metadata
      };

      expect(AIAnalysisResultV1Schema.safeParse(missing).success).toBe(false);
    });

    it('requires confidence number', () => {
      const missing = {
        version: '1',
        mainName: 'test',
        keywords: [],
        // Missing confidence
      };

      expect(AIAnalysisResultV1Schema.safeParse(missing).success).toBe(false);
    });

    it('validates confidence range [0, 1]', () => {
      const validConfidences = [0, 0.5, 1];
      const invalidConfidences = [-0.1, 1.1, 2];

      for (const conf of validConfidences) {
        const data = { mainName: 'test', keywords: [], confidence: conf };
        expect(AIAnalysisResultV1Schema.safeParse(data).success).toBe(true);
      }

      for (const conf of invalidConfidences) {
        const data = { mainName: 'test', keywords: [], confidence: conf };
        expect(AIAnalysisResultV1Schema.safeParse(data).success).toBe(false);
      }
    });

    it('accepts empty metadata array', () => {
      const v1 = {
        version: '1',
        mainName: 'test',
        keywords: [],
        confidence: 0.5,
      };

      expect(AIAnalysisResultV1Schema.safeParse(v1).success).toBe(true);
    });
  });

  describe('AIAnalysisResultV2Schema', () => {
    it('validates v2 result with all fields', () => {
      const v2 = {
        version: '2',
        mainName: 'kitchen-oven-CU',
        keywords: ['kitchen', 'oven'],
        confidence: 0.9,
        location: 'kitchen',
        subject: 'oven',
        shotType: 'CU',
      };

      const result = AIAnalysisResultV2Schema.safeParse(v2);
      expect(result.success).toBe(true);
    });

    it('validates v2 result with action (video)', () => {
      const v2Video = {
        version: '2',
        mainName: 'kitchen-oven-installing-CU',
        keywords: ['kitchen', 'installation'],
        confidence: 0.85,
        location: 'kitchen',
        subject: 'oven',
        action: 'installing',
        shotType: 'CU',
      };

      const result = AIAnalysisResultV2Schema.safeParse(v2Video);
      expect(result.success).toBe(true);
    });

    it('accepts v2 with only required fields', () => {
      const minimal = {
        version: '2',
        mainName: 'test',
        keywords: [],
        confidence: 0.5,
      };

      const result = AIAnalysisResultV2Schema.safeParse(minimal);
      expect(result.success).toBe(true);
    });

    it('requires version to be exactly "2"', () => {
      const wrongVersion = {
        version: '1', // Wrong version
        mainName: 'test',
        keywords: [],
        confidence: 0.8,
        location: 'kitchen',
      };

      expect(AIAnalysisResultV2Schema.safeParse(wrongVersion).success).toBe(false);
    });

    it('requires version field (no default)', () => {
      const noVersion = {
        mainName: 'test',
        keywords: [],
        confidence: 0.8,
        // Missing version
      };

      expect(AIAnalysisResultV2Schema.safeParse(noVersion).success).toBe(false);
    });

    it('validates shotType is valid enum value', () => {
      const validShots = ['WS', 'MID', 'CU', 'UNDER', 'FP', 'TRACK', 'ESTAB'];

      for (const shot of validShots) {
        const data = {
          version: '2',
          mainName: 'test',
          keywords: [],
          confidence: 0.8,
          shotType: shot,
        };
        expect(AIAnalysisResultV2Schema.safeParse(data).success).toBe(true);
      }
    });

    it('rejects invalid shotType', () => {
      const invalid = {
        version: '2',
        mainName: 'test',
        keywords: [],
        confidence: 0.8,
        shotType: 'INVALID',
      };

      expect(AIAnalysisResultV2Schema.safeParse(invalid).success).toBe(false);
    });

    it('allows optional fields to be undefined', () => {
      const v2 = {
        version: '2',
        mainName: 'test',
        keywords: [],
        confidence: 0.7,
        location: undefined,
        subject: undefined,
        action: undefined,
        shotType: undefined,
      };

      const result = AIAnalysisResultV2Schema.safeParse(v2);
      expect(result.success).toBe(true);
    });

    it('allows optional fields to be omitted', () => {
      const v2 = {
        version: '2',
        mainName: 'test',
        keywords: [],
        confidence: 0.7,
        // No optional fields
      };

      const result = AIAnalysisResultV2Schema.safeParse(v2);
      expect(result.success).toBe(true);
    });
  });

  describe('AIAnalysisResultSchema (discriminated union)', () => {
    it('validates v1 result via union', () => {
      const v1 = {
        version: '1',
        mainName: 'test',
        keywords: [],
        confidence: 0.8,
      };

      const result = AIAnalysisResultSchema.safeParse(v1);
      expect(result.success).toBe(true);
    });

    it('validates v2 result via union', () => {
      const v2 = {
        version: '2',
        mainName: 'test',
        keywords: [],
        confidence: 0.8,
      };

      const result = AIAnalysisResultSchema.safeParse(v2);
      expect(result.success).toBe(true);
    });

    it('validates v1 without version field (defaults to v1)', () => {
      const legacyV1 = {
        mainName: 'test',
        keywords: [],
        confidence: 0.7,
      };

      const result = AIAnalysisResultSchema.safeParse(legacyV1);
      expect(result.success).toBe(true);
    });

    it('rejects unknown version', () => {
      const unknownVersion = {
        version: '99',
        mainName: 'test',
        keywords: [],
        confidence: 0.8,
      };

      expect(AIAnalysisResultSchema.safeParse(unknownVersion).success).toBe(false);
    });

    it('rejects completely invalid structure', () => {
      const invalid = {
        foo: 'bar',
      };

      expect(AIAnalysisResultSchema.safeParse(invalid).success).toBe(false);
    });

    it('provides discriminated union type narrowing', () => {
      const v1Data = {
        version: '1',
        mainName: 'test',
        keywords: [],
        confidence: 0.8,
      };

      const v2Data = {
        version: '2',
        mainName: 'test',
        keywords: [],
        confidence: 0.8,
        location: 'kitchen',
      };

      const v1Result = AIAnalysisResultSchema.parse(v1Data);
      const v2Result = AIAnalysisResultSchema.parse(v2Data);

      // TypeScript should narrow types based on version
      if (v1Result.version === '1') {
        // v1Result is AIAnalysisResultV1
        expect(v1Result.mainName).toBe('test');
      }

      if (v2Result.version === '2') {
        // v2Result is AIAnalysisResultV2
        expect(v2Result.location).toBe('kitchen');
      }
    });
  });

  describe('Type guards', () => {
    describe('isV1Result', () => {
      it('returns true for v1 result with version="1"', () => {
        const v1 = {
          version: '1' as const,
          mainName: 'test',
          keywords: [],
          confidence: 0.8,
        };

        expect(isV1Result(v1)).toBe(true);
      });

      it('returns true for result without version field (legacy)', () => {
        const legacy = {
          mainName: 'test',
          keywords: [],
          confidence: 0.8,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any;

        expect(isV1Result(legacy)).toBe(true);
      });

      it('returns false for v2 result', () => {
        const v2 = {
          version: '2' as const,
          mainName: 'test',
          keywords: [],
          confidence: 0.8,
        };

        expect(isV1Result(v2)).toBe(false);
      });
    });

    describe('isV2Result', () => {
      it('returns true for v2 result', () => {
        const v2 = {
          version: '2' as const,
          mainName: 'test',
          keywords: [],
          confidence: 0.8,
        };

        expect(isV2Result(v2)).toBe(true);
      });

      it('returns false for v1 result', () => {
        const v1 = {
          version: '1' as const,
          mainName: 'test',
          keywords: [],
          confidence: 0.8,
        };

        expect(isV2Result(v1)).toBe(false);
      });

      it('returns false for legacy result without version', () => {
        const legacy = {
          mainName: 'test',
          keywords: [],
          confidence: 0.8,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any;

        expect(isV2Result(legacy)).toBe(false);
      });
    });
  });

  describe('Error messages', () => {
    it('provides clear error for missing field', () => {
      const missing = {
        version: '2',
        keywords: [],
        confidence: 0.8,
        // Missing mainName
      };

      const result = AIAnalysisResultV2Schema.safeParse(missing);
      expect(result.success).toBe(false);
      if (!result.success) {
        const error = result.error.issues[0];
        expect(error.path).toContain('mainName');
        expect(error.message).toContain('Required');
      }
    });

    it('provides clear error for wrong type', () => {
      const wrongType = {
        version: '2',
        mainName: 123, // Should be string
        keywords: [],
        confidence: 0.8,
      };

      const result = AIAnalysisResultV2Schema.safeParse(wrongType);
      expect(result.success).toBe(false);
      if (!result.success) {
        const error = result.error.issues[0];
        expect(error.path).toContain('mainName');
        expect(error.message).toContain('Expected string');
      }
    });

    it('provides clear error for out of range value', () => {
      const outOfRange = {
        version: '2',
        mainName: 'test',
        keywords: [],
        confidence: 1.5, // > 1
      };

      const result = AIAnalysisResultV2Schema.safeParse(outOfRange);
      expect(result.success).toBe(false);
      if (!result.success) {
        const error = result.error.issues[0];
        expect(error.path).toContain('confidence');
        expect(error.message).toContain('less than or equal to 1');
      }
    });
  });
});
