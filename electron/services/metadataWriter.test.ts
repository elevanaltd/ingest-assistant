import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { MetadataWriter } from './metadataWriter';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

const execAsync = promisify(exec);

/**
 * Integration Tests for MetadataWriter
 *
 * These are integration tests that validate real behavior with exiftool.
 * They test the actual integration point between the app and exiftool,
 * which is more valuable than mocked unit tests for this use case.
 *
 * Requirements:
 * - exiftool must be installed (brew install exiftool on macOS)
 * - Tests will skip if exiftool is not available
 */
describe('MetadataWriter (Integration)', () => {
  let metadataWriter: MetadataWriter;
  let testDir: string;
  let testFilePath: string;
  let exiftoolAvailable = false;

  beforeAll(async () => {
    // Check if exiftool is installed
    try {
      await execAsync('exiftool -ver');
      exiftoolAvailable = true;
    } catch (error) {
      console.warn('⚠️  exiftool not installed - skipping MetadataWriter integration tests');
      console.warn('   Install with: brew install exiftool (macOS) or apt-get install libimage-exiftool-perl (Linux)');
    }

    if (exiftoolAvailable) {
      // Create temp directory for test files
      testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'metadata-writer-test-'));
    }
  });

  afterAll(async () => {
    // Clean up test directory
    if (exiftoolAvailable && testDir) {
      try {
        await fs.rm(testDir, { recursive: true, force: true });
      } catch (error) {
        console.warn('Failed to clean up test directory:', error);
      }
    }
  });

  beforeEach(async () => {
    if (!exiftoolAvailable) {
      return;
    }

    metadataWriter = new MetadataWriter();

    // Create a minimal valid JPEG file for testing
    // This is a 1x1 pixel red JPEG
    const minimalJpeg = Buffer.from([
      0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
      0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43,
      0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
      0x09, 0x08, 0x0A, 0x0C, 0x14, 0x0D, 0x0C, 0x0B, 0x0B, 0x0C, 0x19, 0x12,
      0x13, 0x0F, 0x14, 0x1D, 0x1A, 0x1F, 0x1E, 0x1D, 0x1A, 0x1C, 0x1C, 0x20,
      0x24, 0x2E, 0x27, 0x20, 0x22, 0x2C, 0x23, 0x1C, 0x1C, 0x28, 0x37, 0x29,
      0x2C, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1F, 0x27, 0x39, 0x3D, 0x38, 0x32,
      0x3C, 0x2E, 0x33, 0x34, 0x32, 0xFF, 0xC0, 0x00, 0x0B, 0x08, 0x00, 0x01,
      0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xFF, 0xC4, 0x00, 0x14, 0x00, 0x01,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x03, 0xFF, 0xC4, 0x00, 0x14, 0x10, 0x01, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0xFF, 0xDA, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3F, 0x00,
      0x37, 0xFF, 0xD9
    ]);

    testFilePath = path.join(testDir, 'test-image.jpg');
    await fs.writeFile(testFilePath, minimalJpeg);
  });

  describe('writeMetadataToFile', () => {
    it('should write title and keywords to real file', async () => {
      if (!exiftoolAvailable) {
        console.log('⏭️  Skipping - exiftool not available');
        return;
      }

      const mainName = 'test-image-name';
      const tags = ['test-tag-1', 'test-tag-2'];

      await metadataWriter.writeMetadataToFile(testFilePath, mainName, tags);

      // Verify metadata was written by reading it back
      const result = await metadataWriter.readMetadataFromFile(testFilePath);

      expect(result.title).toBe(mainName);
      expect(result.keywords).toContain('test-tag-1');
      expect(result.keywords).toContain('test-tag-2');
    });

    it('should write title without tags', async () => {
      if (!exiftoolAvailable) {
        console.log('⏭️  Skipping - exiftool not available');
        return;
      }

      const mainName = 'title-only';

      await metadataWriter.writeMetadataToFile(testFilePath, mainName, []);

      const result = await metadataWriter.readMetadataFromFile(testFilePath);

      expect(result.title).toBe(mainName);
      // Description only written when tags.length > 0
      expect(result.description).toBeUndefined();
    });

    it('should write tags without title', async () => {
      if (!exiftoolAvailable) {
        console.log('⏭️  Skipping - exiftool not available');
        return;
      }

      const tags = ['tag-only-1', 'tag-only-2'];

      await metadataWriter.writeMetadataToFile(testFilePath, '', tags);

      const result = await metadataWriter.readMetadataFromFile(testFilePath);

      expect(result.keywords).toContain('tag-only-1');
      expect(result.keywords).toContain('tag-only-2');
    });

    it('should handle complex metadata values', async () => {
      if (!exiftoolAvailable) {
        console.log('⏭️  Skipping - exiftool not available');
        return;
      }

      const mainName = 'complex-name-with-dashes';
      const tags = ['kitchen appliance', 'stainless-steel', 'commercial-grade'];

      await metadataWriter.writeMetadataToFile(testFilePath, mainName, tags);

      const result = await metadataWriter.readMetadataFromFile(testFilePath);

      expect(result.title).toBe(mainName);
      expect(result.keywords?.length).toBeGreaterThan(0);
    });

    it('should throw error for non-existent file', async () => {
      if (!exiftoolAvailable) {
        console.log('⏭️  Skipping - exiftool not available');
        return;
      }

      const nonExistentPath = path.join(testDir, 'does-not-exist.jpg');

      await expect(
        metadataWriter.writeMetadataToFile(nonExistentPath, 'test', ['tag'])
      ).rejects.toThrow();
    });

    it('should overwrite existing metadata', async () => {
      if (!exiftoolAvailable) {
        console.log('⏭️  Skipping - exiftool not available');
        return;
      }

      // Write initial metadata
      await metadataWriter.writeMetadataToFile(testFilePath, 'original-name', ['original-tag']);

      // Overwrite with new metadata
      await metadataWriter.writeMetadataToFile(testFilePath, 'new-name', ['new-tag']);

      const result = await metadataWriter.readMetadataFromFile(testFilePath);

      expect(result.title).toBe('new-name');
      expect(result.keywords).toContain('new-tag');
      expect(result.keywords).not.toContain('original-tag');
    });
  });

  describe('readMetadataFromFile', () => {
    it('should read metadata from file with metadata', async () => {
      if (!exiftoolAvailable) {
        console.log('⏭️  Skipping - exiftool not available');
        return;
      }

      const mainName = 'read-test';
      const tags = ['read-tag-1', 'read-tag-2'];

      await metadataWriter.writeMetadataToFile(testFilePath, mainName, tags);
      const result = await metadataWriter.readMetadataFromFile(testFilePath);

      expect(result.title).toBe(mainName);
      expect(result.keywords).toBeDefined();
      expect(result.description).toBeDefined();
    });

    it('should return empty object for file without metadata', async () => {
      if (!exiftoolAvailable) {
        console.log('⏭️  Skipping - exiftool not available');
        return;
      }

      // File was just created, should have minimal metadata
      const result = await metadataWriter.readMetadataFromFile(testFilePath);

      // May have some metadata or none - just verify it doesn't crash
      expect(result).toBeDefined();
    });

    it('should return empty object for non-existent file', async () => {
      if (!exiftoolAvailable) {
        console.log('⏭️  Skipping - exiftool not available');
        return;
      }

      const nonExistentPath = path.join(testDir, 'does-not-exist.jpg');
      const result = await metadataWriter.readMetadataFromFile(nonExistentPath);

      expect(result).toEqual({});
    });

    it('should handle keywords as array', async () => {
      if (!exiftoolAvailable) {
        console.log('⏭️  Skipping - exiftool not available');
        return;
      }

      await metadataWriter.writeMetadataToFile(testFilePath, 'test', ['tag1', 'tag2', 'tag3']);
      const result = await metadataWriter.readMetadataFromFile(testFilePath);

      expect(Array.isArray(result.keywords)).toBe(true);
      expect(result.keywords?.length).toBeGreaterThan(0);
    });
  });

  describe('round-trip consistency', () => {
    it('should maintain data integrity through write/read cycle', async () => {
      if (!exiftoolAvailable) {
        console.log('⏭️  Skipping - exiftool not available');
        return;
      }

      const mainName = 'oven-control-panel';
      const tags = ['kitchen', 'appliance', 'oven'];

      // Write metadata
      await metadataWriter.writeMetadataToFile(testFilePath, mainName, tags);

      // Read it back
      const result = await metadataWriter.readMetadataFromFile(testFilePath);

      // Verify consistency
      expect(result.title).toBe(mainName);
      tags.forEach(tag => {
        expect(result.keywords).toContain(tag);
      });
    });
  });

  describe('PP native XMP fields (Issue #54 - xmpDM:shotName)', () => {
    it('should write xmpDM:shotName and dc:Description (PP Shot field mapping)', async () => {
      if (!exiftoolAvailable) {
        console.log('⏭️  Skipping - exiftool not available');
        return;
      }

      const mainName = 'kitchen-oven-cleaning-WS';
      const tags = ['appliance', 'demo'];
      const structured = {
        location: 'kitchen',
        subject: 'oven',
        action: 'cleaning',
        shotType: 'WS'
      };

      await metadataWriter.writeMetadataToFile(testFilePath, mainName, tags, structured);

      // Read XMP-xmpDM:shotName (maps to PP Shot field) and dc:Description
      const { stdout } = await execAsync(`exiftool -XMP-xmpDM:shotName -XMP-dc:Description -json "${testFilePath}"`);
      const data = JSON.parse(stdout);
      const xmpData = data[0];

      // XMP-xmpDM:shotName should contain the combined entity (maps to PP Shot field)
      expect(xmpData['ShotName']).toBe('kitchen-oven-cleaning-WS');

      // XMP-dc:Description should contain keywords (comma-separated)
      expect(xmpData['Description']).toBe('appliance, demo');
    });

    it('should write custom description when provided', async () => {
      if (!exiftoolAvailable) {
        console.log('⏭️  Skipping - exiftool not available');
        return;
      }

      const mainName = 'test-name';
      const tags = ['tag1', 'tag2'];
      const description = 'This is a custom description field';

      await metadataWriter.writeMetadataToFile(testFilePath, mainName, tags, undefined, description);

      const { stdout } = await execAsync(`exiftool -Description -XMP-dc:Description -json "${testFilePath}"`);
      const data = JSON.parse(stdout);
      const metadata = data[0];

      // Custom description should override tag-based description
      expect(metadata['Description']).toBe(description);
    });

    it('should work without structured components (backward compatibility)', async () => {
      if (!exiftoolAvailable) {
        console.log('⏭️  Skipping - exiftool not available');
        return;
      }

      const mainName = 'simple-name';
      const tags = ['tag1', 'tag2'];

      // Call without structured parameter (backward compatibility)
      await metadataWriter.writeMetadataToFile(testFilePath, mainName, tags);

      const result = await metadataWriter.readMetadataFromFile(testFilePath);
      expect(result.title).toBe(mainName);
      expect(result.description).toBe('tag1, tag2');
    });

    it('should not write individual component fields (JSON-only strategy)', async () => {
      if (!exiftoolAvailable) {
        console.log('⏭️  Skipping - exiftool not available');
        return;
      }

      const mainName = 'kitchen-oven-WS';
      const tags = ['appliance'];
      const structured = {
        location: 'kitchen',
        subject: 'oven',
        shotType: 'WS'
      };

      await metadataWriter.writeMetadataToFile(testFilePath, mainName, tags, structured);

      // Verify individual components are NOT written to XMP
      const { stdout } = await execAsync(`exiftool -XMP:all -json "${testFilePath}"`);
      const data = JSON.parse(stdout);
      const xmpData = data[0];

      // Should only have ShotName (xmpDM) and Description (dc), not individual components
      expect(xmpData['ShotName']).toBe('kitchen-oven-WS');
      expect(xmpData['Description']).toBe('appliance');

      // Individual components should NOT exist in XMP (they're in JSON instead)
      expect(xmpData['Location']).toBeUndefined();
      expect(xmpData['Action']).toBeUndefined();
      expect(xmpData['Shot']).toBeUndefined();

      // Subject should NOT exist as a separate component field
      // (XMP-dc:Subject would be something else, not our structured component)
      expect(xmpData['Subject']).toBeUndefined();
    });

    it('should write XMP-xmpDM:LogComment for CEP panel parsing (Issue #54)', async () => {
      if (!exiftoolAvailable) {
        console.log('⏭️  Skipping - exiftool not available');
        return;
      }

      const mainName = 'kitchen-oven-cleaning-WS';
      const tags = ['plumbing', 'renovation', 'demo'];
      const structured = {
        location: 'kitchen',
        subject: 'oven',
        action: 'cleaning',
        shotType: 'WS'
      };

      await metadataWriter.writeMetadataToFile(testFilePath, mainName, tags, structured);

      // Read XMP-xmpDM:LogComment specifically (CEP panel requirement)
      const { stdout } = await execAsync(`exiftool -XMP-xmpDM:LogComment -json "${testFilePath}"`);
      const data = JSON.parse(stdout);
      const xmpData = data[0];

      // XMP-xmpDM:LogComment should contain structured key=value pairs for CEP parsing
      expect(xmpData['LogComment']).toBe('location=kitchen, subject=oven, action=cleaning, shotType=WS');
    });

    it('should write LogComment with partial structured components', async () => {
      if (!exiftoolAvailable) {
        console.log('⏭️  Skipping - exiftool not available');
        return;
      }

      const mainName = 'kitchen-oven-WS';
      const tags = ['appliance'];
      const structured = {
        location: 'kitchen',
        subject: 'oven',
        shotType: 'WS'
        // action is omitted
      };

      await metadataWriter.writeMetadataToFile(testFilePath, mainName, tags, structured);

      const { stdout } = await execAsync(`exiftool -XMP-xmpDM:LogComment -json "${testFilePath}"`);
      const data = JSON.parse(stdout);
      const xmpData = data[0];

      // LogComment should only include provided components
      expect(xmpData['LogComment']).toBe('location=kitchen, subject=oven, shotType=WS');
    });

    it('should not write LogComment when structured components not provided', async () => {
      if (!exiftoolAvailable) {
        console.log('⏭️  Skipping - exiftool not available');
        return;
      }

      const mainName = 'simple-name';
      const tags = ['tag1', 'tag2'];

      // Call without structured parameter
      await metadataWriter.writeMetadataToFile(testFilePath, mainName, tags);

      const { stdout } = await execAsync(`exiftool -XMP-xmpDM:LogComment -json "${testFilePath}"`);
      const data = JSON.parse(stdout);
      const xmpData = data[0];

      // LogComment should not exist without structured components
      expect(xmpData['LogComment']).toBeUndefined();
    });
  });
});
