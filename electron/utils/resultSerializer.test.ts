/**
 * Tests for AIAnalysisResult serialization layer
 *
 * Validates:
 * - Runtime validation (prevents crashes from malformed data)
 * - Version migration (v1 → v2 automatic upgrade)
 * - Backward compatibility (reads legacy data without version field)
 * - Error handling (validation failures, invalid structures)
 *
 * Related: ADR-008 (Result Type Schema Versioning & Serialization)
 */

import { describe, it, expect } from 'vitest';
import {
  serializeResult,
  deserializeResult,
  isValidResult,
  getValidationErrors,
} from './resultSerializer';

describe('resultSerializer', () => {
  describe('serializeResult', () => {
    it('adds version field and validates v2 result', () => {
      const result = {
        shotName: 'kitchen-oven-CU',
        keywords: ['kitchen', 'oven'],
        confidence: 0.9,
        location: 'kitchen',
        subject: 'oven',
        shotType: 'CU',
      };

      const serialized = serializeResult(result);

      expect(serialized.version).toBe('2');
      expect(serialized.shotName).toBe('kitchen-oven-CU');
      expect(serialized.location).toBe('kitchen');
      expect(serialized.subject).toBe('oven');
      expect(serialized.shotType).toBe('CU');
    });

    it('validates required fields are present', () => {
      const invalidResult = {
        // Missing shotName, metadata, confidence
        location: 'kitchen',
      };

      expect(() => serializeResult(invalidResult)).toThrow();
    });

    it('validates confidence is in range [0, 1]', () => {
      const invalidConfidence = {
        shotName: 'test',
        keywords: [],
        confidence: 1.5, // Invalid: > 1
      };

      expect(() => serializeResult(invalidConfidence)).toThrow();
    });

    it('validates shotType is valid enum value', () => {
      const invalidShotType = {
        shotName: 'test',
        keywords: [],
        confidence: 0.8,
        shotType: 'INVALID', // Not in enum
      };

      expect(() => serializeResult(invalidShotType)).toThrow();
    });

    it('accepts result without optional fields', () => {
      const minimalResult = {
        shotName: 'test',
        keywords: [],
        confidence: 0.5,
      };

      const serialized = serializeResult(minimalResult);

      expect(serialized.version).toBe('2');
      expect(serialized.location).toBeUndefined();
      expect(serialized.subject).toBeUndefined();
      expect(serialized.shotType).toBeUndefined();
    });
  });

  describe('deserializeResult - V2 data', () => {
    it('validates and returns v2 result unchanged', () => {
      const v2Data = {
        version: '2',
        shotName: 'kitchen-oven-CU',
        keywords: ['kitchen', 'oven'],
        confidence: 0.9,
        location: 'kitchen',
        subject: 'oven',
        shotType: 'CU',
      };

      const deserialized = deserializeResult(v2Data);

      expect(deserialized.version).toBe('2');
      expect(deserialized.location).toBe('kitchen');
      expect(deserialized.subject).toBe('oven');
      expect(deserialized.shotType).toBe('CU');
    });

    it('rejects v2 data with invalid structure', () => {
      const invalidV2 = {
        version: '2',
        shotName: 'test',
        // Missing metadata and confidence
      };

      expect(() => deserializeResult(invalidV2)).toThrow();
    });
  });

  describe('deserializeResult - V1 migration (3-part pattern)', () => {
    it('migrates v1 with 3-part pattern: {location}-{subject}-{shotType}', () => {
      const v1Data = {
        version: '1',
        shotName: 'kitchen-oven-CU',
        keywords: ['kitchen'],
        confidence: 0.8,
      };

      const v2 = deserializeResult(v1Data);

      expect(v2.version).toBe('2');
      expect(v2.shotName).toBe('kitchen-oven-CU');
      expect(v2.location).toBe('kitchen');
      expect(v2.subject).toBe('oven');
      expect(v2.shotType).toBe('CU');
      expect(v2.action).toBeUndefined();
    });

    it('migrates v1 without version field (backward compatibility)', () => {
      const legacyV1 = {
        // No version field (legacy data)
        shotName: 'bathroom-sink-MID',
        keywords: ['bathroom', 'sink'],
        confidence: 0.85,
      };

      const v2 = deserializeResult(legacyV1);

      expect(v2.version).toBe('2');
      expect(v2.location).toBe('bathroom');
      expect(v2.subject).toBe('sink');
      expect(v2.shotType).toBe('MID');
    });

    it('handles case-insensitive shot type matching', () => {
      const v1Data = {
        shotName: 'garage-car-ws', // lowercase 'ws'
        keywords: [],
        confidence: 0.7,
      };

      const v2 = deserializeResult(v1Data);

      expect(v2.shotType).toBe('WS'); // Converted to uppercase
    });

    it('recognizes all valid shot types in 3-part pattern', () => {
      const shotTypes = ['WS', 'MID', 'CU', 'UNDER', 'FP', 'TRACK', 'ESTAB'];

      for (const shotType of shotTypes) {
        const v1Data = {
          shotName: `location-subject-${shotType}`,
          keywords: [],
          confidence: 0.8,
        };

        const v2 = deserializeResult(v1Data);

        expect(v2.shotType).toBe(shotType);
        expect(v2.location).toBe('location');
        expect(v2.subject).toBe('subject');
      }
    });
  });

  describe('deserializeResult - V1 migration (4-part pattern)', () => {
    it('migrates v1 with 4-part pattern: {location}-{subject}-{action}-{shotType}', () => {
      const v1Data = {
        version: '1',
        shotName: 'kitchen-oven-installing-CU',
        keywords: ['kitchen', 'installation'],
        confidence: 0.9,
      };

      const v2 = deserializeResult(v1Data);

      expect(v2.version).toBe('2');
      expect(v2.shotName).toBe('kitchen-oven-installing-CU');
      expect(v2.location).toBe('kitchen');
      expect(v2.subject).toBe('oven');
      expect(v2.action).toBe('installing');
      expect(v2.shotType).toBe('CU');
    });

    it('handles video action verbs correctly', () => {
      const actions = ['cleaning', 'replacing', 'inspecting', 'demonstrating'];

      for (const action of actions) {
        const v1Data = {
          shotName: `garage-toolbox-${action}-WS`,
          keywords: [],
          confidence: 0.8,
        };

        const v2 = deserializeResult(v1Data);

        expect(v2.location).toBe('garage');
        expect(v2.subject).toBe('toolbox');
        expect(v2.action).toBe(action);
        expect(v2.shotType).toBe('WS');
      }
    });
  });

  describe('deserializeResult - V1 migration (no pattern match)', () => {
    it('preserves shotName when pattern does not match', () => {
      const v1Data = {
        shotName: 'random-descriptive-name',
        keywords: ['random'],
        confidence: 0.5,
      };

      const v2 = deserializeResult(v1Data);

      expect(v2.version).toBe('2');
      expect(v2.shotName).toBe('random-descriptive-name');
      expect(v2.location).toBeUndefined();
      expect(v2.subject).toBeUndefined();
      expect(v2.shotType).toBeUndefined();
    });

    it('does not parse when last part is not a valid shot type', () => {
      const v1Data = {
        shotName: 'kitchen-oven-description', // 'description' is not a shot type
        keywords: [],
        confidence: 0.7,
      };

      const v2 = deserializeResult(v1Data);

      expect(v2.location).toBeUndefined();
      expect(v2.subject).toBeUndefined();
      expect(v2.shotType).toBeUndefined();
      expect(v2.shotName).toBe('kitchen-oven-description');
    });

    it('handles single-word shotName', () => {
      const v1Data = {
        shotName: 'singleword',
        keywords: [],
        confidence: 0.6,
      };

      const v2 = deserializeResult(v1Data);

      expect(v2.shotName).toBe('singleword');
      expect(v2.location).toBeUndefined();
    });

    it('handles two-part shotName', () => {
      const v1Data = {
        shotName: 'two-parts',
        keywords: [],
        confidence: 0.6,
      };

      const v2 = deserializeResult(v1Data);

      expect(v2.shotName).toBe('two-parts');
      expect(v2.location).toBeUndefined();
    });
  });

  describe('Error handling', () => {
    it('throws ZodError for invalid JSON structure', () => {
      const invalidData = {
        version: '2',
        // Missing required fields
      };

      expect(() => deserializeResult(invalidData)).toThrow();
    });

    it('throws ZodError for unknown version', () => {
      const unknownVersion = {
        version: '99',
        shotName: 'test',
        keywords: [],
        confidence: 0.8,
      };

      expect(() => deserializeResult(unknownVersion)).toThrow();
    });

    it('throws ZodError for wrong data types', () => {
      const wrongTypes = {
        version: '2',
        shotName: 123, // Should be string
        metadata: 'not-an-array', // Should be array
        confidence: '0.8', // Should be number
      };

      expect(() => deserializeResult(wrongTypes)).toThrow();
    });
  });

  describe('Helper functions', () => {
    describe('isValidResult', () => {
      it('returns true for valid v2 result', () => {
        const valid = {
          version: '2',
          shotName: 'test',
          keywords: [],
          confidence: 0.8,
        };

        expect(isValidResult(valid)).toBe(true);
      });

      it('returns true for valid v1 result', () => {
        const valid = {
          version: '1',
          shotName: 'test',
          keywords: [],
          confidence: 0.8,
        };

        expect(isValidResult(valid)).toBe(true);
      });

      it('returns false for invalid result', () => {
        const invalid = {
          version: '2',
          // Missing required fields
        };

        expect(isValidResult(invalid)).toBe(false);
      });

      it('returns false for completely wrong structure', () => {
        const invalid = {
          foo: 'bar',
        };

        expect(isValidResult(invalid)).toBe(false);
      });
    });

    describe('getValidationErrors', () => {
      it('returns null for valid result', () => {
        const valid = {
          version: '2',
          shotName: 'test',
          keywords: [],
          confidence: 0.8,
        };

        const errors = getValidationErrors(valid);
        expect(errors).toBeNull();
      });

      it('returns ZodError for invalid result', () => {
        const invalid = {
          version: '2',
          shotName: 'test',
          // Missing metadata and confidence
        };

        const errors = getValidationErrors(invalid);
        expect(errors).not.toBeNull();
        expect(errors?.issues).toBeDefined();
        expect(errors?.issues.length).toBeGreaterThan(0);
      });

      it('provides detailed error messages', () => {
        const invalid = {
          version: '2',
          shotName: 'test',
          metadata: 'not-an-array',
          confidence: 'not-a-number',
        };

        const errors = getValidationErrors(invalid);
        expect(errors?.issues).toHaveLength(2); // metadata and confidence
      });
    });
  });

  describe('Round-trip serialization', () => {
    it('serialize then deserialize preserves data', () => {
      const original = {
        shotName: 'kitchen-oven-CU',
        keywords: ['kitchen', 'oven'],
        confidence: 0.9,
        location: 'kitchen',
        subject: 'oven',
        shotType: 'CU' as const,
      };

      const serialized = serializeResult(original);
      const deserialized = deserializeResult(serialized);

      expect(deserialized.shotName).toBe(original.shotName);
      expect(deserialized.keywords).toEqual(original.keywords);
      expect(deserialized.confidence).toBe(original.confidence);
      expect(deserialized.location).toBe(original.location);
      expect(deserialized.subject).toBe(original.subject);
      expect(deserialized.shotType).toBe(original.shotType);
    });
  });

  describe('Real-world scenarios', () => {
    it('handles result from AI service (no version field)', () => {
      // Simulates AIService.parseAIResponse() output
      const aiServiceResult = {
        shotName: 'bathroom-sink-installing-CU',
        keywords: ['bathroom', 'sink', 'installation'],
        confidence: 0.87,
        location: 'bathroom',
        subject: 'sink',
        action: 'installing',
        shotType: 'CU' as const,
      };

      // Main process serializes
      const serialized = serializeResult(aiServiceResult);
      expect(serialized.version).toBe('2');

      // Renderer deserializes
      const deserialized = deserializeResult(serialized);
      expect(deserialized.location).toBe('bathroom');
      expect(deserialized.action).toBe('installing');
    });

    it('handles legacy data from metadata store (v1, no version field)', () => {
      // Simulates old data persisted before Phase 1
      const legacyData = {
        shotName: 'kitchen-microwave-WS',
        keywords: ['kitchen', 'microwave'],
        confidence: 0.75,
      };

      // Should migrate automatically
      const migrated = deserializeResult(legacyData);
      expect(migrated.version).toBe('2');
      expect(migrated.location).toBe('kitchen');
      expect(migrated.subject).toBe('microwave');
      expect(migrated.shotType).toBe('WS');
    });

    it('handles AI response with high confidence and all fields', () => {
      const fullResult = {
        shotName: 'garage-toolbox-organizing-MID',
        keywords: ['garage', 'toolbox', 'organization', 'tools'],
        confidence: 0.95,
        location: 'garage',
        subject: 'toolbox',
        action: 'organizing',
        shotType: 'MID' as const,
      };

      const serialized = serializeResult(fullResult);
      const deserialized = deserializeResult(serialized);

      expect(deserialized.confidence).toBe(0.95);
      expect(deserialized.keywords).toHaveLength(4);
      expect(deserialized.action).toBe('organizing');
    });

    it('handles AI response with low confidence and minimal data', () => {
      const lowConfidenceResult = {
        shotName: 'unclear-image',
        keywords: [],
        confidence: 0.2,
      };

      const serialized = serializeResult(lowConfidenceResult);
      const deserialized = deserializeResult(serialized);

      expect(deserialized.confidence).toBe(0.2);
      expect(deserialized.keywords).toEqual([]);
      expect(deserialized.location).toBeUndefined();
    });
  });
});
