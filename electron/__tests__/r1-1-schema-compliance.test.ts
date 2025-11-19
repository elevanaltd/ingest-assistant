import { describe, it, expect } from 'vitest';
import { MetadataStore } from '../services/metadataStore';

/**
 * R1.1 Schema Compliance Tests
 *
 * CEP Panel Contract: /Volumes/HestAI-Projects/eav-cep-assist/.coord/docs/005-DOC-SCHEMA-R1-1-AUTHORITATIVE-CEP-IA-METADATA.md
 *
 * Changes Required:
 * 1. Field rename: shotName → shotName
 * 2. Add required field: lockedFields (array)
 * 3. shotName format: must include #N suffix when shotNumber exists
 */

describe('R1.1 Schema Compliance', () => {
  it('RED: shotName field must exist (not shotName)', () => {
    const metadata = MetadataStore.createMetadata({
      id: 'TEST001',
      originalFilename: 'TEST001.MOV',
      currentFilename: 'TEST001.MOV',
      filePath: '/test/TEST001.MOV',
      extension: '.MOV',
      fileType: 'video',
      shotName: 'kitchen-oven-cleaning-CU-#5',
      shotNumber: 5
    });

    // R1.1 Contract: Field must be named "shotName"
    expect(metadata.shotName).toBeDefined();
    expect(metadata.shotName).toBe('kitchen-oven-cleaning-CU-#5');
  });

  it('RED: lockedFields must exist and default to empty array', () => {
    const metadata = MetadataStore.createMetadata({
      id: 'TEST002',
      originalFilename: 'TEST002.JPG',
      currentFilename: 'TEST002.JPG',
      filePath: '/test/TEST002.JPG',
      extension: '.JPG',
      fileType: 'image',
      shotName: 'hallway-door-CU-#12',
      shotNumber: 12
    });

    // R1.1 Contract: lockedFields is REQUIRED field (array)
    expect(metadata.lockedFields).toBeDefined();
    expect(Array.isArray(metadata.lockedFields)).toBe(true);
    expect(metadata.lockedFields).toEqual([]);
  });

  it('RED: shotName must include #N suffix when shotNumber exists', () => {
    const metadata = MetadataStore.createMetadata({
      id: 'TEST003',
      originalFilename: 'TEST003.MOV',
      currentFilename: 'TEST003.MOV',
      filePath: '/test/TEST003.MOV',
      extension: '.MOV',
      fileType: 'video',
      shotName: 'bathroom-sink-turning-on-CU-#25',
      shotNumber: 25
    });

    // R1.1 Contract: shotName format includes #N when shotNumber present
    expect(metadata.shotName).toMatch(/-#\d+$/);
    expect(metadata.shotName).toContain('-#25');
  });

  it('RED: lockedFields can contain field names to lock', () => {
    const metadata = MetadataStore.createMetadata({
      id: 'TEST004',
      originalFilename: 'TEST004.JPG',
      currentFilename: 'TEST004.JPG',
      filePath: '/test/TEST004.JPG',
      extension: '.JPG',
      fileType: 'image',
      shotName: 'kitchen-cooker-hood-MID-#3',
      shotNumber: 3,
      lockedFields: ['location', 'subject']
    });

    // R1.1 Contract: lockedFields can specify locked field names
    expect(metadata.lockedFields).toEqual(['location', 'subject']);
  });
});
