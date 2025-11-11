import { describe, it, expect, vi } from 'vitest';
import { VideoFrameExtractor } from './videoFrameExtractor';

// Mock ffmpeg installers
vi.mock('@ffmpeg-installer/ffmpeg', () => ({
  default: { path: '/usr/bin/ffmpeg' },
}));

vi.mock('@ffprobe-installer/ffprobe', () => ({
  default: { path: '/usr/bin/ffprobe' },
}));

describe('VideoFrameExtractor', () => {
  describe('Class instantiation', () => {
    it('should create VideoFrameExtractor instance', () => {
      const extractor = new VideoFrameExtractor();
      expect(extractor).toBeInstanceOf(VideoFrameExtractor);
    });

    it('should have extractFrames method', () => {
      const extractor = new VideoFrameExtractor();
      expect(typeof extractor.extractFrames).toBe('function');
    });
  });

  describe('extractFrames', () => {
    it('should return empty array for empty timestamps', async () => {
      const extractor = new VideoFrameExtractor();
      const result = await extractor.extractFrames('/test/video.mp4', []);
      expect(result).toEqual([]);
    });
  });

  describe('Security - Command Injection Prevention', () => {
    it('should reject filenames with double quotes', async () => {
      const extractor = new VideoFrameExtractor();
      const maliciousPath = '/tmp/video".mp4';

      // Expected: Should reject filename with shell metacharacters
      // Current: exec() would allow command injection via quotes
      await expect(
        extractor.extractFrames(maliciousPath, [0.5])
      ).rejects.toThrow(/invalid.*filename|forbidden.*character|security/i);
    });

    it('should reject filenames with semicolons', async () => {
      const extractor = new VideoFrameExtractor();
      const maliciousPath = '/tmp/video;rm -rf test;.mp4';

      // Expected: Should reject filename with command separators
      await expect(
        extractor.extractFrames(maliciousPath, [0.5])
      ).rejects.toThrow(/invalid.*filename|forbidden.*character|security/i);
    });

    it('should reject filenames with backticks', async () => {
      const extractor = new VideoFrameExtractor();
      const maliciousPath = '/tmp/video`whoami`.mp4';

      // Expected: Should reject filename with command substitution
      await expect(
        extractor.extractFrames(maliciousPath, [0.5])
      ).rejects.toThrow(/invalid.*filename|forbidden.*character|security/i);
    });

    it('should reject filenames with dollar signs (variable expansion)', async () => {
      const extractor = new VideoFrameExtractor();
      const maliciousPath = '/tmp/video$HOME.mp4';

      // Expected: Should reject filename with variable expansion
      await expect(
        extractor.extractFrames(maliciousPath, [0.5])
      ).rejects.toThrow(/invalid.*filename|forbidden.*character|security/i);
    });

    it('should accept safe filenames with spaces and dashes', async () => {
      const extractor = new VideoFrameExtractor();
      const safePath = '/tmp/my-video file.mp4';

      // This should NOT throw - spaces and dashes are safe
      // Note: Will fail for other reasons (file doesn't exist) but shouldn't reject as malicious
      try {
        await extractor.extractFrames(safePath, [0.5]);
      } catch (error) {
        // Should fail with file access error, NOT security validation error
        expect((error as Error).message).not.toMatch(/invalid.*filename|forbidden.*character|security/i);
      }
    });
  });
});
