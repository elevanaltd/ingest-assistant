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
});
