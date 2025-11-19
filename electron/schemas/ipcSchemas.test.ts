import { describe, it, expect } from 'vitest';
import { FileRenameSchema, FileUpdateMetadataSchema, AIBatchProcessSchema } from './ipcSchemas';

describe('IPC Schema Validation', () => {
  describe('FileRenameSchema', () => {
    it('should accept valid rename input', () => {
      const valid = {
        fileId: 'ABC123',
        shotName: 'Test Name',
        currentPath: '/test/path.jpg',
      };

      expect(() => FileRenameSchema.parse(valid)).not.toThrow();
    });

    it('should reject oversized shotName', () => {
      const malicious = {
        fileId: 'ABC123',
        shotName: 'A'.repeat(10000), // Way over 500 char limit
        currentPath: '/test/path.jpg',
      };

      expect(() => FileRenameSchema.parse(malicious)).toThrow();
    });

    it('should reject empty fileId', () => {
      const invalid = {
        fileId: '',
        shotName: 'Valid Name',
        currentPath: '/test/path.jpg',
      };

      expect(() => FileRenameSchema.parse(invalid)).toThrow();
    });
  });

  describe('FileUpdateMetadataSchema', () => {
    it('should accept valid metadata array', () => {
      const valid = {
        fileId: 'ABC123',
        keywords: ['tag1', 'tag2', 'tag3'],
      };

      expect(() => FileUpdateMetadataSchema.parse(valid)).not.toThrow();
    });

    it('should reject metadata arrays over 100 items', () => {
      const malicious = {
        fileId: 'ABC123',
        metadata: Array(101).fill('tag'), // 101 items > max 100
      };

      expect(() => FileUpdateMetadataSchema.parse(malicious)).toThrow();
    });
  });

  describe('AIBatchProcessSchema', () => {
    it('should accept valid fileIds array', () => {
      const valid = {
        fileIds: ['ID1', 'ID2', 'ID3'],
      };

      expect(() => AIBatchProcessSchema.parse(valid)).not.toThrow();
    });

    it('should reject empty fileIds array', () => {
      const invalid = {
        fileIds: [],
      };

      expect(() => AIBatchProcessSchema.parse(invalid)).toThrow();
    });

    it('should reject fileIds arrays over 100 items', () => {
      const malicious = {
        fileIds: Array(101).fill('ID'), // 101 items > max 100
      };

      expect(() => AIBatchProcessSchema.parse(malicious)).toThrow();
    });
  });
});
