import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MetadataToggleService } from '../metadataToggle';
import { MetadataWriter } from '../metadataWriter';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

describe('MetadataToggleService - TapeName Conditional Logic', () => {
  let service: MetadataToggleService;
  let writer: MetadataWriter;
  let testDir: string;
  let testFile: string;

  beforeEach(async () => {
    writer = new MetadataWriter();
    service = new MetadataToggleService(writer);
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'metadata-toggle-test-'));
    testFile = path.join(testDir, 'test-image.jpg');

    // Create valid JPEG
    const jpegData = Buffer.concat([
      Buffer.from([0xFF, 0xD8]),  // SOI
      Buffer.from([0xFF, 0xE0, 0x00, 0x10]),  // APP0
      Buffer.from('JFIF\x00\x01\x01\x00\x00\x01\x00\x01\x00\x00'),
      Buffer.from([0xFF, 0xDB, 0x00, 0x43]),  // DQT
      Buffer.alloc(67, 0x10),
      Buffer.from([0xFF, 0xC0, 0x00, 0x0B, 0x08, 0x00, 0x01, 0x00, 0x01, 0x01, 0x01, 0x11, 0x00]),
      Buffer.from([0xFF, 0xDA, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3F, 0x00]),
      Buffer.from([0xD2, 0x75, 0x3D]),
      Buffer.from([0xFF, 0xD9])  // EOI
    ]);
    await fs.writeFile(testFile, jpegData);
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('TapeName Write Logic - 3 Scenarios', () => {
    it('Scenario 1: TapeName NOT written when both toggles OFF (default workflow)', async () => {
      const config = {
        metadataWrite: false,
        filenameRewrite: false
      };

      const metadata = {
        location: 'kitchen',
        subject: 'oven',
        shotType: 'CU' as const,
        shotNumber: 5,
        cameraId: 'EA001622'
      };

      await service.conditionalWrite(testFile, metadata, config);

      // Verify TapeName was NOT written
      const tapeNameValue = await writer.readTapeNameFromFile(testFile);
      expect(tapeNameValue).toBeUndefined();
    });

    it('Scenario 2: TapeName written when metadataWrite toggle ON', async () => {
      const config = {
        metadataWrite: true,
        filenameRewrite: false
      };

      const metadata = {
        location: 'kitchen',
        subject: 'oven',
        shotType: 'CU' as const,
        shotNumber: 5,
        cameraId: 'EA001622'
      };

      await service.conditionalWrite(testFile, metadata, config);

      // Verify TapeName WAS written with cameraId
      const tapeNameValue = await writer.readTapeNameFromFile(testFile);
      expect(tapeNameValue).toBe('EA001622');
    });

    it('Scenario 3: TapeName written when filenameRewrite toggle ON', async () => {
      const config = {
        metadataWrite: false,
        filenameRewrite: true
      };

      const metadata = {
        location: 'kitchen',
        subject: 'oven',
        shotType: 'CU' as const,
        shotNumber: 5,
        cameraId: 'EA001622'
      };

      await service.conditionalWrite(testFile, metadata, config);

      // Verify TapeName WAS written with cameraId (preserves original before rename)
      const tapeNameValue = await writer.readTapeNameFromFile(testFile);
      expect(tapeNameValue).toBe('EA001622');
    });

    it('TapeName written when BOTH toggles ON', async () => {
      const config = {
        metadataWrite: true,
        filenameRewrite: true
      };

      const metadata = {
        location: 'kitchen',
        subject: 'oven',
        shotType: 'CU' as const,
        shotNumber: 5,
        cameraId: 'EA001622'
      };

      await service.conditionalWrite(testFile, metadata, config);

      // Verify TapeName WAS written
      const tapeNameValue = await writer.readTapeNameFromFile(testFile);
      expect(tapeNameValue).toBe('EA001622');
    });
  });

  describe('Metadata Write Toggle', () => {
    it('should write full metadata when metadataWrite toggle ON', async () => {
      const config = {
        metadataWrite: true,
        filenameRewrite: false
      };

      const metadata = {
        location: 'kitchen',
        subject: 'oven',
        shotType: 'CU' as const,
        shotNumber: 5,
        cameraId: 'EA001622'
      };

      await service.conditionalWrite(testFile, metadata, config);

      // Verify full metadata written (shotName, LogComment, Description, TapeName)
      const readMetadata = await writer.readMetadataFromFile(testFile);
      expect(readMetadata.title).toBe('kitchen-oven-CU-#5');
    });

    it('should NOT write metadata when metadataWrite toggle OFF', async () => {
      const config = {
        metadataWrite: false,
        filenameRewrite: false
      };

      const metadata = {
        location: 'kitchen',
        subject: 'oven',
        shotType: 'CU' as const,
        shotNumber: 5,
        cameraId: 'EA001622'
      };

      await service.conditionalWrite(testFile, metadata, config);

      // Verify NO metadata written (file should be unchanged)
      const readMetadata = await writer.readMetadataFromFile(testFile);
      expect(readMetadata.title).toBeUndefined();
    });
  });

  describe('JSON Metadata Storage', () => {
    it('should ALWAYS write JSON metadata regardless of toggles', async () => {
      const config = {
        metadataWrite: false,
        filenameRewrite: false
      };

      const metadata = {
        location: 'kitchen',
        subject: 'oven',
        shotType: 'CU' as const,
        shotNumber: 5,
        cameraId: 'EA001622'
      };

      const jsonMetadata = await service.conditionalWrite(testFile, metadata, config);

      // JSON metadata should be returned for storage (single source of truth)
      expect(jsonMetadata.location).toBe('kitchen');
      expect(jsonMetadata.subject).toBe('oven');
      expect(jsonMetadata.shotType).toBe('CU');
      expect(jsonMetadata.shotNumber).toBe(5);
      expect(jsonMetadata.cameraId).toBe('EA001622');
    });

    it('should generate shotName from structured components', async () => {
      const config = {
        metadataWrite: false,
        filenameRewrite: false
      };

      const metadata = {
        location: 'kitchen',
        subject: 'oven',
        action: 'cleaning',
        shotType: 'WS' as const,
        shotNumber: 10,
        cameraId: 'EA001622'
      };

      const jsonMetadata = await service.conditionalWrite(testFile, metadata, config);

      // shotName should be generated for JSON storage
      expect(jsonMetadata.shotName).toBe('kitchen-oven-cleaning-WS');
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing optional fields gracefully', async () => {
      const config = {
        metadataWrite: true,
        filenameRewrite: false
      };

      const metadata = {
        location: 'kitchen',
        subject: 'oven',
        shotType: 'CU' as const,
        shotNumber: 5
        // cameraId omitted
      };

      await service.conditionalWrite(testFile, metadata, config);

      // Should not throw, TapeName just not written
      const tapeNameValue = await writer.readTapeNameFromFile(testFile);
      expect(tapeNameValue).toBeUndefined();
    });

    it('should preserve existing TapeName when already present', async () => {
      const config = {
        metadataWrite: true,
        filenameRewrite: false
      };

      // Pre-write TapeName with original value
      await writer.writeMetadataToFile(testFile, 'kitchen-oven-CU', [], {
        cameraId: 'ORIGINAL_ID'
      });

      const metadata = {
        location: 'kitchen',
        subject: 'oven',
        shotType: 'CU' as const,
        shotNumber: 5,
        cameraId: 'EA001622'  // Different cameraId
      };

      await service.conditionalWrite(testFile, metadata, config);

      // TapeName should NOT be overwritten (existing value preserved)
      const tapeNameValue = await writer.readTapeNameFromFile(testFile);
      expect(tapeNameValue).toBe('ORIGINAL_ID');
    });
  });
});
