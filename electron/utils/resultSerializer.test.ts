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
        mainName: 'kitchen-oven-CU',
        metadata: ['kitchen', 'oven'],
        confidence: 0.9,
        location: 'kitchen',
        subject: 'oven',
        shotType: 'CU',
      };

      const serialized = serializeResult(result);

      expect(serialized.version).toBe('2');
      expect(serialized.mainName).toBe('kitchen-oven-CU');
      expect(serialized.location).toBe('kitchen');
      expect(serialized.subject).toBe('oven');
      expect(serialized.shotType).toBe('CU');
    });

    it('validates required fields are present', () => {
      const invalidResult = {
        // Missing mainName, metadata, confidence
        location: 'kitchen',
      };

      expect(() => serializeResult(invalidResult)).toThrow();
    });

    it('validates confidence is in range [0, 1]', () => {
      const invalidConfidence = {
        mainName: 'test',
        metadata: [],
        confidence: 1.5, // Invalid: > 1
      };

      expect(() => serializeResult(invalidConfidence)).toThrow();
    });

    it('validates shotType is valid enum value', () => {
      const invalidShotType = {
        mainName: 'test',
        metadata: [],
        confidence: 0.8,
        shotType: 'INVALID', // Not in enum
      };

      expect(() => serializeResult(invalidShotType)).toThrow();
    });

    it('accepts result without optional fields', () => {
      const minimalResult = {
        mainName: 'test',
        metadata: [],
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
        mainName: 'kitchen-oven-CU',
        metadata: ['kitchen', 'oven'],
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
        mainName: 'test',
        // Missing metadata and confidence
      };

      expect(() => deserializeResult(invalidV2)).toThrow();
    });
  });

  describe('deserializeResult - V1 migration (3-part pattern)', () => {
    it('migrates v1 with 3-part pattern: {location}-{subject}-{shotType}', () => {
      const v1Data = {
        version: '1',
        mainName: 'kitchen-oven-CU',
        metadata: ['kitchen'],
        confidence: 0.8,
      };

      const v2 = deserializeResult(v1Data);

      expect(v2.version).toBe('2');
      expect(v2.mainName).toBe('kitchen-oven-CU');
      expect(v2.location).toBe('kitchen');
      expect(v2.subject).toBe('oven');
      expect(v2.shotType).toBe('CU');
      expect(v2.action).toBeUndefined();
    });

    it('migrates v1 without version field (backward compatibility)', () => {
      const legacyV1 = {
        // No version field (legacy data)
        mainName: 'bathroom-sink-MID',
        metadata: ['bathroom', 'sink'],
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
        mainName: 'garage-car-ws', // lowercase 'ws'
        metadata: [],
        confidence: 0.7,
      };

      const v2 = deserializeResult(v1Data);

      expect(v2.shotType).toBe('WS'); // Converted to uppercase
    });

    it('recognizes all valid shot types in 3-part pattern', () => {
      const shotTypes = ['WS', 'MID', 'CU', 'UNDER', 'FP', 'TRACK', 'ESTAB'];

      for (const shotType of shotTypes) {
        const v1Data = {
          mainName: `location-subject-${shotType}`,
          metadata: [],
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
        mainName: 'kitchen-oven-installing-CU',
        metadata: ['kitchen', 'installation'],
        confidence: 0.9,
      };

      const v2 = deserializeResult(v1Data);

      expect(v2.version).toBe('2');
      expect(v2.mainName).toBe('kitchen-oven-installing-CU');
      expect(v2.location).toBe('kitchen');
      expect(v2.subject).toBe('oven');
      expect(v2.action).toBe('installing');
      expect(v2.shotType).toBe('CU');
    });

    it('handles video action verbs correctly', () => {
      const actions = ['cleaning', 'replacing', 'inspecting', 'demonstrating'];

      for (const action of actions) {
        const v1Data = {
          mainName: `garage-toolbox-${action}-WS`,
          metadata: [],
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
    it('preserves mainName when pattern does not match', () => {
      const v1Data = {
        mainName: 'random-descriptive-name',
        metadata: ['random'],
        confidence: 0.5,
      };

      const v2 = deserializeResult(v1Data);

      expect(v2.version).toBe('2');
      expect(v2.mainName).toBe('random-descriptive-name');
      expect(v2.location).toBeUndefined();
      expect(v2.subject).toBeUndefined();
      expect(v2.shotType).toBeUndefined();
    });

    it('does not parse when last part is not a valid shot type', () => {
      const v1Data = {
        mainName: 'kitchen-oven-description', // 'description' is not a shot type
        metadata: [],
        confidence: 0.7,
      };

      const v2 = deserializeResult(v1Data);

      expect(v2.location).toBeUndefined();
      expect(v2.subject).toBeUndefined();
      expect(v2.shotType).toBeUndefined();
      expect(v2.mainName).toBe('kitchen-oven-description');
    });

    it('handles single-word mainName', () => {
      const v1Data = {
        mainName: 'singleword',
        metadata: [],
        confidence: 0.6,
      };

      const v2 = deserializeResult(v1Data);

      expect(v2.mainName).toBe('singleword');
      expect(v2.location).toBeUndefined();
    });

    it('handles two-part mainName', () => {
      const v1Data = {
        mainName: 'two-parts',
        metadata: [],
        confidence: 0.6,
      };

      const v2 = deserializeResult(v1Data);

      expect(v2.mainName).toBe('two-parts');
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
        mainName: 'test',
        metadata: [],
        confidence: 0.8,
      };

      expect(() => deserializeResult(unknownVersion)).toThrow();
    });

    it('throws ZodError for wrong data types', () => {
      const wrongTypes = {
        version: '2',
        mainName: 123, // Should be string
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
          mainName: 'test',
          metadata: [],
          confidence: 0.8,
        };

        expect(isValidResult(valid)).toBe(true);
      });

      it('returns true for valid v1 result', () => {
        const valid = {
          version: '1',
          mainName: 'test',
          metadata: [],
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
          mainName: 'test',
          metadata: [],
          confidence: 0.8,
        };

        const errors = getValidationErrors(valid);
        expect(errors).toBeNull();
      });

      it('returns ZodError for invalid result', () => {
        const invalid = {
          version: '2',
          mainName: 'test',
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
          mainName: 'test',
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
        mainName: 'kitchen-oven-CU',
        metadata: ['kitchen', 'oven'],
        confidence: 0.9,
        location: 'kitchen',
        subject: 'oven',
        shotType: 'CU' as const,
      };

      const serialized = serializeResult(original);
      const deserialized = deserializeResult(serialized);

      expect(deserialized.mainName).toBe(original.mainName);
      expect(deserialized.metadata).toEqual(original.metadata);
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
        mainName: 'bathroom-sink-installing-CU',
        metadata: ['bathroom', 'sink', 'installation'],
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
        mainName: 'kitchen-microwave-WS',
        metadata: ['kitchen', 'microwave'],
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
        mainName: 'garage-toolbox-organizing-MID',
        metadata: ['garage', 'toolbox', 'organization', 'tools'],
        confidence: 0.95,
        location: 'garage',
        subject: 'toolbox',
        action: 'organizing',
        shotType: 'MID' as const,
      };

      const serialized = serializeResult(fullResult);
      const deserialized = deserializeResult(serialized);

      expect(deserialized.confidence).toBe(0.95);
      expect(deserialized.metadata).toHaveLength(4);
      expect(deserialized.action).toBe('organizing');
    });

    it('handles AI response with low confidence and minimal data', () => {
      const lowConfidenceResult = {
        mainName: 'unclear-image',
        metadata: [],
        confidence: 0.2,
      };

      const serialized = serializeResult(lowConfidenceResult);
      const deserialized = deserializeResult(serialized);

      expect(deserialized.confidence).toBe(0.2);
      expect(deserialized.metadata).toEqual([]);
      expect(deserialized.location).toBeUndefined();
    });
  });
});
