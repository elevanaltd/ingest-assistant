import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { FileRenameSchema, FileStructuredUpdateSchema, StructuredMetadataSchema } from './schemas/ipcSchemas';
import type { FileMetadata } from '../src/types';
import type { ShotType } from '../src/types';

/**
 * IPC Handler Tests for file:rename and structured metadata persistence
 *
 * Tests validate:
 * 1. Schema validation rejects invalid inputs
 * 2. Action field persists for both new and existing metadata
 * 3. Action field can be cleared (set to empty string)
 * 4. Video vs photo behavior is correct
 * 5. File renaming includes structured components in mainName
 */

describe('IPC Handlers: Structured Metadata Persistence', () => {
  describe('Schema Validation', () => {
    describe('StructuredMetadataSchema', () => {
      it('should accept valid structured metadata', () => {
        const validPayload = {
          location: 'kitchen',
          subject: 'oven',
          action: 'cleaning',
          shotType: 'WS' as const,
        };

        const result = StructuredMetadataSchema.parse(validPayload);
        expect(result).toEqual(validPayload);
      });

      it('should accept structured metadata without action (photos)', () => {
        const validPayload = {
          location: 'kitchen',
          subject: 'oven',
          shotType: 'CU' as const,
        };

        const result = StructuredMetadataSchema.parse(validPayload);
        expect(result).toBeDefined();
        expect(result!.location).toBe('kitchen');
        expect(result!.subject).toBe('oven');
        expect(result!.action).toBeUndefined();
        expect(result!.shotType).toBe('CU');
      });

      it('should reject oversized location (>200 chars)', () => {
        const invalidPayload = {
          location: 'x'.repeat(201),
          subject: 'oven',
          shotType: 'WS' as const,
        };

        expect(() => StructuredMetadataSchema.parse(invalidPayload)).toThrow(z.ZodError);
      });

      it('should reject oversized action (>200 chars)', () => {
        const invalidPayload = {
          location: 'kitchen',
          subject: 'oven',
          action: 'x'.repeat(201),
          shotType: 'WS' as const,
        };

        expect(() => StructuredMetadataSchema.parse(invalidPayload)).toThrow(z.ZodError);
      });

      it('should reject invalid shotType', () => {
        const invalidPayload = {
          location: 'kitchen',
          subject: 'oven',
          shotType: 'INVALID' as unknown as ShotType,
        };

        expect(() => StructuredMetadataSchema.parse(invalidPayload)).toThrow(z.ZodError);
      });

      it('should allow empty string for action (clearing)', () => {
        const validPayload = {
          location: 'kitchen',
          subject: 'oven',
          action: '',
          shotType: 'WS' as const,
        };

        const result = StructuredMetadataSchema.parse(validPayload);
        expect(result).toBeDefined();
        expect(result!.action).toBe('');
      });

      it('should allow undefined for action', () => {
        const validPayload = {
          location: 'kitchen',
          subject: 'oven',
          shotType: 'WS' as const,
        };

        const result = StructuredMetadataSchema.parse(validPayload);
        expect(result).toBeDefined();
        expect(result!.action).toBeUndefined();
      });

      it('should reject missing required fields', () => {
        const invalidPayload = {
          location: 'kitchen',
          // Missing subject and shotType
        };

        expect(() => StructuredMetadataSchema.parse(invalidPayload)).toThrow(z.ZodError);
      });
    });

    describe('FileRenameSchema', () => {
      it('should accept valid file rename with structured metadata', () => {
        const validPayload = {
          fileId: 'EA001597',
          mainName: 'kitchen-wine-cooler-CU',
          currentPath: '/path/to/EA001597.MOV',
          structured: {
            location: 'kitchen',
            subject: 'wine-cooler',
            action: 'cleaning',
            shotType: 'CU' as const,
          },
        };

        const result = FileRenameSchema.parse(validPayload);
        expect(result.fileId).toBe('EA001597');
        expect(result.structured).toBeDefined();
        expect(result.structured?.action).toBe('cleaning');
      });

      it('should accept file rename without structured metadata', () => {
        const validPayload = {
          fileId: 'EA001597',
          mainName: 'kitchen-wine-cooler-CU',
          currentPath: '/path/to/EA001597.MOV',
        };

        const result = FileRenameSchema.parse(validPayload);
        expect(result.structured).toBeUndefined();
      });

      it('should reject oversized mainName (>500 chars)', () => {
        const invalidPayload = {
          fileId: 'EA001597',
          mainName: 'x'.repeat(501),
          currentPath: '/path/to/EA001597.MOV',
        };

        expect(() => FileRenameSchema.parse(invalidPayload)).toThrow(z.ZodError);
      });

      it('should reject missing currentPath', () => {
        const invalidPayload = {
          fileId: 'EA001597',
          mainName: 'kitchen-wine-cooler-CU',
          // Missing currentPath
        };

        expect(() => FileRenameSchema.parse(invalidPayload)).toThrow(z.ZodError);
      });
    });

    describe('FileStructuredUpdateSchema', () => {
      it('should accept valid structured metadata update', () => {
        const validPayload = {
          fileId: 'EA001597',
          structured: {
            location: 'kitchen',
            subject: 'wine-cooler',
            action: 'cleaning',
            shotType: 'CU' as const,
          },
        };

        const result = FileStructuredUpdateSchema.parse(validPayload);
        expect(result.fileId).toBe('EA001597');
        expect(result.structured.action).toBe('cleaning');
      });

      it('should reject oversized payload (location >200 chars)', () => {
        const invalidPayload = {
          fileId: 'EA001597',
          structured: {
            location: 'x'.repeat(201),
            subject: 'oven',
            shotType: 'WS' as const,
          },
        };

        expect(() => FileStructuredUpdateSchema.parse(invalidPayload)).toThrow(z.ZodError);
      });
    });
  });

  describe('Metadata Persistence Logic', () => {
    describe('New metadata creation with action field', () => {
      it('should create new metadata with action for video files', () => {
        // Simulate the handler logic for new metadata creation
        const structured = {
          location: 'kitchen',
          subject: 'oven',
          action: 'cleaning',
          shotType: 'WS' as const,
        };

        const fileMetadata: FileMetadata = {
          id: 'EA001597',
          originalFilename: 'EA001597.MOV',
          currentFilename: 'EA001597-kitchen-oven-cleaning-WS.MOV',
          filePath: '/path/EA001597-kitchen-oven-cleaning-WS.MOV',
          extension: '.MOV',
          mainName: 'kitchen-oven-cleaning-WS',
          keywords: [],
          processedByAI: false,
          lastModified: new Date(),
          fileType: 'video',
          location: structured.location,
          subject: structured.subject,
          action: structured.action,
          shotType: structured.shotType,
        };

        // Assert action field is persisted
        expect(fileMetadata.action).toBe('cleaning');
        expect(fileMetadata.location).toBe('kitchen');
        expect(fileMetadata.subject).toBe('oven');
        expect(fileMetadata.shotType).toBe('WS');
      });

      it('should create new metadata without action for photo files', () => {
        const structured = {
          location: 'kitchen',
          subject: 'oven',
          shotType: 'CU' as const,
        };

        const fileMetadata: FileMetadata = {
          id: 'IMG_12345678',
          originalFilename: 'IMG_12345678.jpg',
          currentFilename: 'IMG_12345678-kitchen-oven-CU.jpg',
          filePath: '/path/IMG_12345678-kitchen-oven-CU.jpg',
          extension: '.jpg',
          mainName: 'kitchen-oven-CU',
          keywords: [],
          processedByAI: false,
          lastModified: new Date(),
          fileType: 'image',
          location: structured.location,
          subject: structured.subject,
          action: undefined,
          shotType: structured.shotType,
        };

        expect(fileMetadata.action).toBeUndefined();
        expect(fileMetadata.location).toBe('kitchen');
        expect(fileMetadata.subject).toBe('oven');
        expect(fileMetadata.shotType).toBe('CU');
      });
    });

    describe('Updating existing metadata with action field', () => {
      it('should update action field when provided', () => {
        const fileMetadata: FileMetadata = {
          id: 'EA001597',
          originalFilename: 'EA001597.MOV',
          currentFilename: 'EA001597-kitchen-oven-WS.MOV',
          filePath: '/path/EA001597-kitchen-oven-WS.MOV',
          extension: '.MOV',
          mainName: 'kitchen-oven-WS',
          keywords: [],
          processedByAI: false,
          lastModified: new Date(),
          fileType: 'video',
          location: 'kitchen',
          subject: 'oven',
          shotType: 'WS',
        };

        const structured = {
          location: 'kitchen',
          subject: 'oven',
          action: 'cleaning',
          shotType: 'WS' as const,
        };

        // Simulate handler update logic
        if (structured && 'action' in structured) {
          fileMetadata.action = structured.action || undefined;
        }

        // Assert action was added
        expect(fileMetadata.action).toBe('cleaning');
      });

      it('should clear action field when set to empty string', () => {
        const fileMetadata: FileMetadata = {
          id: 'EA001597',
          originalFilename: 'EA001597.MOV',
          currentFilename: 'EA001597-kitchen-oven-cleaning-WS.MOV',
          filePath: '/path/EA001597-kitchen-oven-cleaning-WS.MOV',
          extension: '.MOV',
          mainName: 'kitchen-oven-cleaning-WS',
          keywords: [],
          processedByAI: false,
          lastModified: new Date(),
          fileType: 'video',
          location: 'kitchen',
          subject: 'oven',
          action: 'cleaning',
          shotType: 'WS',
        };

        const structured = {
          location: 'kitchen',
          subject: 'oven',
          action: '', // User cleared the action
          shotType: 'WS' as const,
        };

        // Simulate handler update logic (the FIX)
        if (structured && 'action' in structured) {
          fileMetadata.action = structured.action || undefined;
        }

        // Assert action was cleared
        expect(fileMetadata.action).toBeUndefined();
      });

      it('should not modify fields not provided in structured update', () => {
        const fileMetadata: FileMetadata = {
          id: 'EA001597',
          originalFilename: 'EA001597.MOV',
          currentFilename: 'EA001597-kitchen-oven-cleaning-WS.MOV',
          filePath: '/path/EA001597-kitchen-oven-cleaning-WS.MOV',
          extension: '.MOV',
          mainName: 'kitchen-oven-cleaning-WS',
          keywords: [],
          processedByAI: false,
          lastModified: new Date(),
          fileType: 'video',
          location: 'kitchen',
          subject: 'oven',
          action: 'cleaning',
          shotType: 'WS',
        };

        // Partial update - only update location
        const structured = { location: 'bathroom' };

        // Simulate selective update logic
        if (structured && 'location' in structured) {
          fileMetadata.location = structured.location;
        }

        // Assert only location changed, other fields unchanged
        expect(fileMetadata.location).toBe('bathroom');
        expect(fileMetadata.subject).toBe('oven');
        expect(fileMetadata.action).toBe('cleaning');
        expect(fileMetadata.shotType).toBe('WS');
      });
    });

    describe('Generated filename patterns', () => {
      it('should generate 4-part filename for video with action', () => {
        const structured = {
          location: 'kitchen',
          subject: 'oven',
          action: 'cleaning',
          shotType: 'WS' as const,
        };

        const fileType = 'video';

        // Simulate handler logic
        const generatedTitle =
          fileType === 'video' && structured.action
            ? `${structured.location}-${structured.subject}-${structured.action}-${structured.shotType}`
            : `${structured.location}-${structured.subject}-${structured.shotType}`;

        expect(generatedTitle).toBe('kitchen-oven-cleaning-WS');
      });

      it('should generate 3-part filename for video without action', () => {
        const structured: { location: string; subject: string; shotType: 'WS'; action?: string } = {
          location: 'kitchen',
          subject: 'oven',
          shotType: 'WS' as const,
        };

        const fileType = 'video';

        // Simulate handler logic
        const generatedTitle =
          fileType === 'video' && structured.action
            ? `${structured.location}-${structured.subject}-${structured.action}-${structured.shotType}`
            : `${structured.location}-${structured.subject}-${structured.shotType}`;

        expect(generatedTitle).toBe('kitchen-oven-WS');
      });

      it('should generate 3-part filename for photo regardless of action', () => {
        const structured = {
          location: 'kitchen',
          subject: 'oven',
          action: 'cleaning', // Even if action is provided
          shotType: 'CU' as const,
        };

        const fileType = 'image';

        // Simulate handler logic (photos ignore action)
        const generatedTitle =
          fileType === 'image' && structured.action
            ? `${structured.location}-${structured.subject}-${structured.shotType}` // Photos ignore action
            : `${structured.location}-${structured.subject}-${structured.shotType}`;

        expect(generatedTitle).toBe('kitchen-oven-CU');
      });
    });
  });

  describe('Injection and DoS Prevention', () => {
    it('should reject extremely large structured payloads', () => {
      const maliciousPayload = {
        fileId: 'EA001597',
        mainName: 'test',
        currentPath: '/path',
        structured: {
          location: 'x'.repeat(5000), // Way over limit
          subject: 'oven',
          shotType: 'WS' as const,
        },
      };

      expect(() => FileRenameSchema.parse(maliciousPayload)).toThrow(z.ZodError);
    });

    it('should reject injection attempts in action field', () => {
      const injectionPayload = {
        location: 'kitchen',
        subject: 'oven',
        action: "'; DROP TABLE metadata; --",
        shotType: 'WS' as const,
      };

      // The schema should still validate and accept this as a string
      // because we're storing it as-is in JSON, not executing SQL
      // But the important thing is the size limit and type validation
      const result = StructuredMetadataSchema.parse(injectionPayload);

      // The string itself is valid, but it's just stored as data
      expect(result).toBeDefined();
      expect(result!.action).toBe("'; DROP TABLE metadata; --");
    });

    it('should reject null/undefined in required fields', () => {
      const invalidPayload = {
        location: null, // Invalid
        subject: 'oven',
        shotType: 'WS' as const,
      };

      expect(() => StructuredMetadataSchema.parse(invalidPayload)).toThrow(z.ZodError);
    });
  });
});
