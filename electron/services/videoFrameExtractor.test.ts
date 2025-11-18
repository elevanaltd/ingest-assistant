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
    // Per Critical-Engineer: Comprehensive test coverage for all attack vectors

    it('should reject filenames with double quotes', async () => {
      const extractor = new VideoFrameExtractor();
      const maliciousPath = '/tmp/video".mp4';

      await expect(
        extractor.extractFrames(maliciousPath, [0.5])
      ).rejects.toThrow(/invalid.*filename|forbidden.*character|security/i);
    });

    it('should reject filenames with single quotes', async () => {
      const extractor = new VideoFrameExtractor();
      const maliciousPath = "/tmp/video'.mp4";

      // Per Critical-Engineer: Missing from original regex
      await expect(
        extractor.extractFrames(maliciousPath, [0.5])
      ).rejects.toThrow(/invalid.*filename|forbidden.*character|security/i);
    });

    it('should reject filenames with semicolons', async () => {
      const extractor = new VideoFrameExtractor();
      const maliciousPath = '/tmp/video;rm -rf test;.mp4';

      await expect(
        extractor.extractFrames(maliciousPath, [0.5])
      ).rejects.toThrow(/invalid.*filename|forbidden.*character|security/i);
    });

    it('should reject filenames with backticks', async () => {
      const extractor = new VideoFrameExtractor();
      const maliciousPath = '/tmp/video`whoami`.mp4';

      await expect(
        extractor.extractFrames(maliciousPath, [0.5])
      ).rejects.toThrow(/invalid.*filename|forbidden.*character|security/i);
    });

    it('should reject filenames with dollar signs (variable expansion)', async () => {
      const extractor = new VideoFrameExtractor();
      const maliciousPath = '/tmp/video$HOME.mp4';

      await expect(
        extractor.extractFrames(maliciousPath, [0.5])
      ).rejects.toThrow(/invalid.*filename|forbidden.*character|security/i);
    });

    it('should reject filenames with wildcards (*)', async () => {
      const extractor = new VideoFrameExtractor();
      const maliciousPath = '/tmp/video*.mp4';

      // Per Critical-Engineer: Missing from original regex
      await expect(
        extractor.extractFrames(maliciousPath, [0.5])
      ).rejects.toThrow(/invalid.*filename|forbidden.*character|security/i);
    });

    it('should reject filenames with wildcards (?)', async () => {
      const extractor = new VideoFrameExtractor();
      const maliciousPath = '/tmp/video?.mp4';

      // Per Critical-Engineer: Missing from original regex
      await expect(
        extractor.extractFrames(maliciousPath, [0.5])
      ).rejects.toThrow(/invalid.*filename|forbidden.*character|security/i);
    });

    it('should reject filenames with tildes', async () => {
      const extractor = new VideoFrameExtractor();
      const maliciousPath = '/tmp/video~.mp4';

      // Per Critical-Engineer: Missing from original regex
      await expect(
        extractor.extractFrames(maliciousPath, [0.5])
      ).rejects.toThrow(/invalid.*filename|forbidden.*character|security/i);
    });

    it('should reject filenames with newlines', async () => {
      const extractor = new VideoFrameExtractor();
      const maliciousPath = '/tmp/video\n.mp4';

      // Per Critical-Engineer: Control character validation
      await expect(
        extractor.extractFrames(maliciousPath, [0.5])
      ).rejects.toThrow(/invalid.*filename|forbidden.*character|security/i);
    });

    it('should reject filenames with tabs', async () => {
      const extractor = new VideoFrameExtractor();
      const maliciousPath = '/tmp/video\t.mp4';

      // Per Critical-Engineer: Control character validation
      await expect(
        extractor.extractFrames(maliciousPath, [0.5])
      ).rejects.toThrow(/invalid.*filename|forbidden.*character|security/i);
    });

    it('should reject filenames starting with dash (flag injection)', async () => {
      const extractor = new VideoFrameExtractor();
      const maliciousPath = '/tmp/-i-malicious.mp4';

      // Per Critical-Engineer: Flag injection protection
      await expect(
        extractor.extractFrames(maliciousPath, [0.5])
      ).rejects.toThrow(/dash|flag injection/i);
    });

    it('should accept safe filenames with spaces and dashes in middle', async () => {
      const extractor = new VideoFrameExtractor();
      const safePath = '/tmp/my-video file.mp4';

      // Dashes in middle are safe, only leading dash is dangerous
      // Note: Will fail for other reasons (file doesn't exist) but shouldn't reject as malicious
      try {
        await extractor.extractFrames(safePath, [0.5]);
      } catch (error) {
        // Should fail with file access error, NOT security validation error
        expect((error as Error).message).not.toMatch(/invalid.*filename|forbidden.*character|security|flag injection/i);
      }
    });

    it('should accept filenames with parentheses in directory names (Issue #1)', async () => {
      // Issue #1: Video player regression - paths with parentheses blocked
      // Real-world case: "/Volumes/videos-current/Project/04. Media/Video (Proxy)/file.mov"
      // Parentheses are SAFE with spawn() - no shell expansion occurs
      const extractor = new VideoFrameExtractor();
      const safePath = '/Volumes/videos-current/Project/Video (Proxy)/01. Introduction_Proxy.mov';

      // Per Security: spawn() prevents shell interpolation, so parentheses are safe
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
