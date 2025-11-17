import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { VideoTranscoder } from './videoTranscoder';
import * as fs from 'fs';
import * as crypto from 'crypto';
import { spawn } from 'child_process';
import { EventEmitter } from 'events';

/**
 * VideoTranscoder Retroactive Tests
 *
 * RETROACTIVE COVERAGE (Constitutional Note):
 * Code written before tests (TDD violation in 0ff4b20).
 * Tests validate existing behavior to enable safe future enhancements.
 *
 * Critical Paths Requiring 100% Coverage:
 * 1. FFmpeg spawn (security-sensitive: shell command execution)
 * 2. Error cleanup (file system operations on failure)
 * 3. Cache key generation (cryptographic determinism)
 * 4. Concurrent transcode deduplication
 * 5. Cache pruning (age-based file deletion)
 *
 * Future Work: MUST follow RED→GREEN→REFACTOR for all enhancements.
 */

// Mock modules
vi.mock('fs');
vi.mock('child_process');
vi.mock('crypto', async () => {
  const actual = await vi.importActual<typeof crypto>('crypto');
  return {
    ...actual,
    createHash: vi.fn()
  };
});
vi.mock('@ffmpeg-installer/ffmpeg', () => ({
  default: { path: '/usr/local/bin/ffmpeg' }
}));

describe('VideoTranscoder', () => {
  let transcoder: VideoTranscoder;
  const mockCacheDir = '/tmp/test-cache';
  const mockSourceFile = '/path/to/video.mov';

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock: directory doesn't exist, gets created
    vi.mocked(fs.existsSync).mockReturnValue(false);
    vi.mocked(fs.mkdirSync).mockReturnValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Constructor', () => {
    it('should create cache directory if it does not exist', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      transcoder = new VideoTranscoder(mockCacheDir);

      expect(fs.mkdirSync).toHaveBeenCalledWith(mockCacheDir, { recursive: true });
      expect(transcoder.getCacheDirectory()).toBe(mockCacheDir);
    });

    it('should not create cache directory if it already exists', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);

      transcoder = new VideoTranscoder(mockCacheDir);

      expect(fs.mkdirSync).not.toHaveBeenCalled();
      expect(transcoder.getCacheDirectory()).toBe(mockCacheDir);
    });

    it('should use default cache directory when none provided', () => {
      transcoder = new VideoTranscoder();

      const cacheDir = transcoder.getCacheDirectory();
      expect(cacheDir).toContain('catalog-previews');
      expect(fs.mkdirSync).toHaveBeenCalledWith(cacheDir, { recursive: true });
    });
  });

  describe('getCacheDirectory', () => {
    it('should return the configured cache directory path', () => {
      transcoder = new VideoTranscoder(mockCacheDir);

      expect(transcoder.getCacheDirectory()).toBe(mockCacheDir);
    });
  });

  describe('Cache Key Generation', () => {
    beforeEach(() => {
      transcoder = new VideoTranscoder(mockCacheDir);
    });

    it('should generate deterministic hash from file path, mtime, and size', () => {
      const mockStats = {
        mtime: new Date('2025-01-15T10:00:00Z'),
        size: 1024000
      } as fs.Stats;

      vi.mocked(fs.statSync).mockReturnValue(mockStats);

      // Mock crypto hash (digest('hex') returns hex string, not Buffer)
      const mockHash = {
        update: vi.fn().mockReturnThis(),
        digest: vi.fn().mockReturnValue('abcdef1234567890abcdef1234567890')
      };
      vi.mocked(crypto.createHash).mockReturnValue(mockHash as any);

      // Trigger cache key generation via transcodeForPreview
      vi.mocked(fs.existsSync).mockReturnValue(true); // Cache hit to avoid actual transcode

      transcoder.transcodeForPreview(mockSourceFile);

      expect(crypto.createHash).toHaveBeenCalledWith('sha256');
      expect(mockHash.update).toHaveBeenCalledWith(
        expect.stringContaining(mockSourceFile)
      );
      expect(mockHash.update).toHaveBeenCalledWith(
        expect.stringContaining('1736935200000') // mtime.getTime()
      );
      expect(mockHash.update).toHaveBeenCalledWith(
        expect.stringContaining('1024000') // size
      );
    });
  });

  describe('transcodeForPreview - Cache Hit/Miss', () => {
    beforeEach(() => {
      transcoder = new VideoTranscoder(mockCacheDir);

      const mockStats = {
        mtime: new Date('2025-01-15T10:00:00Z'),
        size: 1024000
      } as fs.Stats;
      vi.mocked(fs.statSync).mockReturnValue(mockStats);

      // Mock hash generation (digest('hex') returns hex string, slice(0,16) = first 16 chars)
      const mockHash = {
        update: vi.fn().mockReturnThis(),
        digest: vi.fn().mockReturnValue('abcd1234abcd1234567890abcdef0123')
      };
      vi.mocked(crypto.createHash).mockReturnValue(mockHash as any);
    });

    it('should return cached file path immediately on cache hit', async () => {
      const expectedPath = `${mockCacheDir}/abcd1234abcd1234-720p.mp4`;
      vi.mocked(fs.existsSync).mockReturnValue(true); // Cache hit

      const result = await transcoder.transcodeForPreview(mockSourceFile);

      expect(result).toBe(expectedPath);
      expect(spawn).not.toHaveBeenCalled();
    });

    it('should transcode and return path on cache miss', async () => {
      const expectedPath = `${mockCacheDir}/abcd1234abcd1234-720p.mp4`;

      // Cache miss initially
      let existsCallCount = 0;
      vi.mocked(fs.existsSync).mockImplementation(() => {
        existsCallCount++;
        return existsCallCount > 1; // First call (cache check) = false, subsequent = true
      });

      // Mock successful FFmpeg spawn
      const mockProcess = new EventEmitter() as any;
      mockProcess.stderr = new EventEmitter();
      vi.mocked(spawn).mockReturnValue(mockProcess);

      const transcodePromise = transcoder.transcodeForPreview(mockSourceFile);

      // Simulate FFmpeg success
      setTimeout(() => {
        mockProcess.emit('close', 0);
      }, 10);

      const result = await transcodePromise;

      // Verify FFmpeg called with correct args (check key args, not full array due to many options)
      expect(spawn).toHaveBeenCalledWith(
        '/usr/local/bin/ffmpeg',
        expect.arrayContaining(['-hwaccel', 'videotoolbox', '-i', mockSourceFile])
      );
      expect(result).toBe(expectedPath);
    });

    it('should deduplicate concurrent transcodes for same file', async () => {
      // Cache miss
      let existsCallCount = 0;
      vi.mocked(fs.existsSync).mockImplementation(() => {
        existsCallCount++;
        return existsCallCount > 1;
      });

      // Mock FFmpeg spawn
      const mockProcess = new EventEmitter() as any;
      mockProcess.stderr = new EventEmitter();
      vi.mocked(spawn).mockReturnValue(mockProcess);

      // Start two concurrent transcodes
      const promise1 = transcoder.transcodeForPreview(mockSourceFile);
      const promise2 = transcoder.transcodeForPreview(mockSourceFile);

      // Simulate FFmpeg completion
      setTimeout(() => {
        mockProcess.emit('close', 0);
      }, 10);

      const [result1, result2] = await Promise.all([promise1, promise2]);

      // Both should resolve to same path
      expect(result1).toBe(result2);

      // FFmpeg should only be spawned once (deduplication)
      expect(spawn).toHaveBeenCalledTimes(1);
    });
  });

  describe('doTranscode - FFmpeg Execution', () => {
    beforeEach(() => {
      transcoder = new VideoTranscoder(mockCacheDir);

      const mockStats = {
        mtime: new Date('2025-01-15T10:00:00Z'),
        size: 1024000
      } as fs.Stats;
      vi.mocked(fs.statSync).mockReturnValue(mockStats);

      const mockHash = {
        update: vi.fn().mockReturnThis(),
        digest: vi.fn().mockReturnValue('abcd1234abcd1234567890abcdef0123')
      };
      vi.mocked(crypto.createHash).mockReturnValue(mockHash as any);

      vi.mocked(fs.existsSync).mockReturnValue(false); // Force transcode
    });

    it('should resolve with output path on successful transcode (exit code 0)', async () => {
      const mockProcess = new EventEmitter() as any;
      mockProcess.stderr = new EventEmitter();
      vi.mocked(spawn).mockReturnValue(mockProcess);

      const transcodePromise = transcoder.transcodeForPreview(mockSourceFile);

      // Simulate successful FFmpeg execution
      setTimeout(() => {
        mockProcess.emit('close', 0);
      }, 10);

      const result = await transcodePromise;

      expect(result).toBe(`${mockCacheDir}/abcd1234abcd1234-720p.mp4`);
    });

    it('should reject with error on FFmpeg failure (non-zero exit code)', async () => {
      const mockProcess = new EventEmitter() as any;
      mockProcess.stderr = new EventEmitter();
      vi.mocked(spawn).mockReturnValue(mockProcess);

      const transcodePromise = transcoder.transcodeForPreview(mockSourceFile);

      // Simulate FFmpeg failure
      setTimeout(() => {
        mockProcess.stderr.emit('data', Buffer.from('FFmpeg error output'));
        mockProcess.emit('close', 1);
      }, 10);

      await expect(transcodePromise).rejects.toThrow('FFmpeg transcode failed (exit code 1)');
    });

    it('should clean up failed output file on transcode error', async () => {
      const outputPath = `${mockCacheDir}/abcd1234abcd1234-720p.mp4`;

      // Mock: cache miss initially, then output exists after failure (for cleanup check)
      let existsCalls = 0;
      vi.mocked(fs.existsSync).mockImplementation((path) => {
        existsCalls++;
        // First call: cache check (false), subsequent calls in error handler: true
        return existsCalls > 1 && path === outputPath;
      });
      vi.mocked(fs.unlinkSync).mockReturnValue(undefined);

      const mockProcess = new EventEmitter() as any;
      mockProcess.stderr = new EventEmitter();
      vi.mocked(spawn).mockReturnValue(mockProcess);

      const transcodePromise = transcoder.transcodeForPreview(mockSourceFile);

      setTimeout(() => {
        mockProcess.emit('close', 1);
      }, 10);

      await expect(transcodePromise).rejects.toThrow();

      // Verify cleanup
      expect(fs.unlinkSync).toHaveBeenCalledWith(outputPath);
    });

    it('should reject on FFmpeg spawn error', async () => {
      const mockProcess = new EventEmitter() as any;
      mockProcess.stderr = new EventEmitter();
      vi.mocked(spawn).mockReturnValue(mockProcess);

      const spawnError = new Error('ENOENT: ffmpeg not found');
      const transcodePromise = transcoder.transcodeForPreview(mockSourceFile);

      setTimeout(() => {
        mockProcess.emit('error', spawnError);
      }, 10);

      await expect(transcodePromise).rejects.toThrow('ENOENT: ffmpeg not found');
    });

    it('should construct FFmpeg args with hardware acceleration and streaming flags', async () => {
      const mockProcess = new EventEmitter() as any;
      mockProcess.stderr = new EventEmitter();
      vi.mocked(spawn).mockReturnValue(mockProcess);

      const transcodePromise = transcoder.transcodeForPreview(mockSourceFile);

      setTimeout(() => {
        mockProcess.emit('close', 0);
      }, 10);

      await transcodePromise;

      expect(spawn).toHaveBeenCalledWith('/usr/local/bin/ffmpeg', expect.arrayContaining([
        '-hwaccel', 'videotoolbox',
        '-c:v', 'h264_videotoolbox',
        '-movflags', '+faststart+frag_keyframe+empty_moov',
        '-vf', 'scale=-2:720',
        '-r', '24'
      ]));
    });
  });

  describe('Progress Callback', () => {
    beforeEach(() => {
      transcoder = new VideoTranscoder(mockCacheDir);

      const mockStats = {
        mtime: new Date('2025-01-15T10:00:00Z'),
        size: 1024000
      } as fs.Stats;
      vi.mocked(fs.statSync).mockReturnValue(mockStats);

      const mockHash = {
        update: vi.fn().mockReturnThis(),
        digest: vi.fn().mockReturnValue('abcd1234abcd1234567890abcdef0123')
      };
      vi.mocked(crypto.createHash).mockReturnValue(mockHash as any);

      vi.mocked(fs.existsSync).mockReturnValue(false); // Force transcode
    });

    it('should call progress callback when FFmpeg emits time progress', async () => {
      const mockProcess = new EventEmitter() as any;
      mockProcess.stderr = new EventEmitter();
      vi.mocked(spawn).mockReturnValue(mockProcess);

      const onProgress = vi.fn();
      const transcodePromise = transcoder.transcodeForPreview(mockSourceFile, onProgress);

      // Simulate FFmpeg progress output
      setTimeout(() => {
        mockProcess.stderr.emit('data', Buffer.from('frame=  123 fps=24 time=00:00:05.12 bitrate=2500kbits/s'));
        mockProcess.stderr.emit('data', Buffer.from('frame=  246 fps=24 time=00:00:10.25 bitrate=2500kbits/s'));
        mockProcess.emit('close', 0);
      }, 10);

      await transcodePromise;

      // Progress callback should be called for each progress update
      expect(onProgress).toHaveBeenCalledTimes(2);
      expect(onProgress).toHaveBeenCalledWith('00:00:05.12');
      expect(onProgress).toHaveBeenCalledWith('00:00:10.25');
    });

    it('should not fail when progress callback is not provided (backward compatibility)', async () => {
      const mockProcess = new EventEmitter() as any;
      mockProcess.stderr = new EventEmitter();
      vi.mocked(spawn).mockReturnValue(mockProcess);

      // Call without progress callback (original signature)
      const transcodePromise = transcoder.transcodeForPreview(mockSourceFile);

      setTimeout(() => {
        mockProcess.stderr.emit('data', Buffer.from('frame=  123 fps=24 time=00:00:05.12 bitrate=2500kbits/s'));
        mockProcess.emit('close', 0);
      }, 10);

      // Should complete successfully without error
      const result = await transcodePromise;
      expect(result).toBe(`${mockCacheDir}/abcd1234abcd1234-720p.mp4`);
    });

    it('should not call progress callback when stderr has no time progress', async () => {
      const mockProcess = new EventEmitter() as any;
      mockProcess.stderr = new EventEmitter();
      vi.mocked(spawn).mockReturnValue(mockProcess);

      const onProgress = vi.fn();
      const transcodePromise = transcoder.transcodeForPreview(mockSourceFile, onProgress);

      setTimeout(() => {
        mockProcess.stderr.emit('data', Buffer.from('Some other FFmpeg output without time'));
        mockProcess.emit('close', 0);
      }, 10);

      await transcodePromise;

      // Progress callback should not be called for non-progress output
      expect(onProgress).not.toHaveBeenCalled();
    });

    it('should not call progress callback when cache hit (no transcode)', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true); // Cache hit

      const onProgress = vi.fn();
      const result = await transcoder.transcodeForPreview(mockSourceFile, onProgress);

      expect(result).toBe(`${mockCacheDir}/abcd1234abcd1234-720p.mp4`);
      expect(onProgress).not.toHaveBeenCalled(); // No transcode = no progress
      expect(spawn).not.toHaveBeenCalled(); // FFmpeg not spawned
    });
  });

  describe('cleanCache - Age-Based Pruning', () => {
    beforeEach(() => {
      transcoder = new VideoTranscoder(mockCacheDir);
    });

    it('should remove files older than maxAgeMs threshold', async () => {
      const now = Date.now();
      const oldFileTime = now - (8 * 24 * 60 * 60 * 1000); // 8 days old
      const recentFileTime = now - (2 * 24 * 60 * 60 * 1000); // 2 days old

      vi.mocked(fs.readdirSync).mockReturnValue(['old-cache.mp4', 'recent-cache.mp4'] as any);

      let statCallCount = 0;
      vi.mocked(fs.statSync).mockImplementation((path) => {
        statCallCount++;
        return {
          mtime: new Date(statCallCount === 1 ? oldFileTime : recentFileTime)
        } as fs.Stats;
      });

      vi.mocked(fs.unlinkSync).mockReturnValue(undefined);

      await transcoder.cleanCache(7 * 24 * 60 * 60 * 1000); // 7 days threshold

      // Only old file should be removed
      expect(fs.unlinkSync).toHaveBeenCalledTimes(1);
      expect(fs.unlinkSync).toHaveBeenCalledWith(`${mockCacheDir}/old-cache.mp4`);
    });

    it('should keep all files when none exceed maxAgeMs', async () => {
      const now = Date.now();
      const recentTime = now - (2 * 24 * 60 * 60 * 1000); // 2 days old

      vi.mocked(fs.readdirSync).mockReturnValue(['cache1.mp4', 'cache2.mp4'] as any);
      vi.mocked(fs.statSync).mockReturnValue({
        mtime: new Date(recentTime)
      } as fs.Stats);

      await transcoder.cleanCache(7 * 24 * 60 * 60 * 1000);

      expect(fs.unlinkSync).not.toHaveBeenCalled();
    });

    it('should handle empty cache directory', async () => {
      vi.mocked(fs.readdirSync).mockReturnValue([] as any);

      await transcoder.cleanCache();

      expect(fs.unlinkSync).not.toHaveBeenCalled();
    });
  });
});
