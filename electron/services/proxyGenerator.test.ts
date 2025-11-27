import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ProxyGenerator } from './proxyGenerator';
import { spawn } from 'child_process';
import { EventEmitter } from 'events';
import * as fs from 'fs';

/**
 * ProxyGenerator Tests (Phase 1b B2.1)
 *
 * TDD Workflow: RED Phase
 * Tests written BEFORE implementation (Constitutional compliance).
 *
 * Critical Paths (B0 Condition 1 - Progress Parsing):
 * 1. ffmpeg stderr `time=` parsing (not 17.5% heuristic)
 * 2. Duration extraction from source file (ffprobe)
 * 3. Progress percentage calculation (currentTime / duration * 100)
 * 4. Short clip (5s) and long clip (60s) accuracy
 */

// Mock modules
vi.mock('fs');
vi.mock('child_process');
vi.mock('@ffmpeg-installer/ffmpeg', () => ({
  default: { path: '/usr/local/bin/ffmpeg' }
}));

describe('ProxyGenerator', () => {
  let generator: ProxyGenerator;
  const mockSourceFile = '/Volumes/videos-raw/test.MOV';
  const mockOutputDir = '/Volumes/videos-proxy';

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fs.existsSync).mockReturnValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Constructor', () => {
    it('should initialize with default timeout (10 minutes)', () => {
      generator = new ProxyGenerator();

      expect(generator).toBeDefined();
      // Timeout verification will be tested through transcode timeout behavior
    });

    it('should accept custom timeout in constructor', () => {
      generator = new ProxyGenerator({ timeoutMs: 5 * 60 * 1000 }); // 5 minutes

      expect(generator).toBeDefined();
    });
  });

  describe('Duration Extraction (ffprobe)', () => {
    beforeEach(() => {
      generator = new ProxyGenerator();
    });

    it('should extract duration from source video via ffprobe', async () => {
      // Mock ffprobe spawn to return duration
      const mockProcess = new EventEmitter() as any;
      mockProcess.stdout = new EventEmitter();
      mockProcess.stderr = new EventEmitter();

      vi.mocked(spawn).mockReturnValue(mockProcess);

      const durationPromise = generator.extractDuration(mockSourceFile);

      // Simulate ffprobe output with 20 second video
      setTimeout(() => {
        mockProcess.stdout.emit('data', Buffer.from('20.500000\n'));
        mockProcess.emit('close', 0);
      }, 10);

      const duration = await durationPromise;

      expect(duration).toBe(20.5);
      expect(spawn).toHaveBeenCalledWith(
        '/usr/local/bin/ffprobe', // ffprobe path (not ffmpeg)
        expect.arrayContaining([
          '-v', 'error',
          '-show_entries', 'format=duration',
          '-of', 'default=noprint_wrappers=1:nokey=1',
          mockSourceFile
        ])
      );
    });

    it('should handle short clips (5 seconds) correctly', async () => {
      const mockProcess = new EventEmitter() as any;
      mockProcess.stdout = new EventEmitter();
      mockProcess.stderr = new EventEmitter();

      vi.mocked(spawn).mockReturnValue(mockProcess);

      const durationPromise = generator.extractDuration(mockSourceFile);

      setTimeout(() => {
        mockProcess.stdout.emit('data', Buffer.from('5.000000\n'));
        mockProcess.emit('close', 0);
      }, 10);

      const duration = await durationPromise;

      expect(duration).toBe(5.0);
    });

    it('should handle long clips (60+ seconds) correctly', async () => {
      const mockProcess = new EventEmitter() as any;
      mockProcess.stdout = new EventEmitter();
      mockProcess.stderr = new EventEmitter();

      vi.mocked(spawn).mockReturnValue(mockProcess);

      const durationPromise = generator.extractDuration(mockSourceFile);

      setTimeout(() => {
        mockProcess.stdout.emit('data', Buffer.from('125.750000\n')); // 2m 5.75s
        mockProcess.emit('close', 0);
      }, 10);

      const duration = await durationPromise;

      expect(duration).toBe(125.75);
    });

    it('should reject when ffprobe fails', async () => {
      const mockProcess = new EventEmitter() as any;
      mockProcess.stdout = new EventEmitter();
      mockProcess.stderr = new EventEmitter();

      vi.mocked(spawn).mockReturnValue(mockProcess);

      const durationPromise = generator.extractDuration(mockSourceFile);

      setTimeout(() => {
        mockProcess.stderr.emit('data', Buffer.from('Invalid file'));
        mockProcess.emit('close', 1);
      }, 10);

      await expect(durationPromise).rejects.toThrow('Failed to extract duration');
    });

    it('should reject when ffprobe returns invalid duration', async () => {
      const mockProcess = new EventEmitter() as any;
      mockProcess.stdout = new EventEmitter();
      mockProcess.stderr = new EventEmitter();

      vi.mocked(spawn).mockReturnValue(mockProcess);

      const durationPromise = generator.extractDuration(mockSourceFile);

      setTimeout(() => {
        mockProcess.stdout.emit('data', Buffer.from('N/A\n')); // Invalid duration
        mockProcess.emit('close', 0);
      }, 10);

      await expect(durationPromise).rejects.toThrow('Invalid duration');
    });
  });

  describe('Progress Parsing (ffmpeg stderr)', () => {
    beforeEach(() => {
      generator = new ProxyGenerator();
    });

    it('should parse time= from ffmpeg stderr and calculate percentage', async () => {
      // Mock ffprobe (duration extraction) - called first
      const mockFfprobeProcess = new EventEmitter() as any;
      mockFfprobeProcess.stdout = new EventEmitter();
      mockFfprobeProcess.stderr = new EventEmitter();

      // Mock ffmpeg (transcode) - called second
      const mockFfmpegProcess = new EventEmitter() as any;
      mockFfmpegProcess.stderr = new EventEmitter();

      let callCount = 0;
      vi.mocked(spawn).mockImplementation(() => {
        callCount++;
        if (callCount === 1) return mockFfprobeProcess; // First call: ffprobe
        return mockFfmpegProcess; // Second call: ffmpeg
      });

      const onProgress = vi.fn();
      const transcodePromise = generator.generateProxy(
        mockSourceFile,
        mockOutputDir,
        { onProgress }
      );

      setTimeout(() => {
        // First: ffprobe returns duration (20 seconds)
        mockFfprobeProcess.stdout.emit('data', Buffer.from('20.000000\n'));
        mockFfprobeProcess.emit('close', 0);
      }, 10);

      // Then: wait for ffmpeg to be spawned after duration extraction completes
      setTimeout(() => {
        mockFfmpegProcess.stderr.emit('data', Buffer.from('frame=  120 fps=24 time=00:00:05.00 bitrate=5000kbits/s'));
        mockFfmpegProcess.stderr.emit('data', Buffer.from('frame=  240 fps=24 time=00:00:10.00 bitrate=5000kbits/s'));
        mockFfmpegProcess.stderr.emit('data', Buffer.from('frame=  360 fps=24 time=00:00:15.00 bitrate=5000kbits/s'));
        mockFfmpegProcess.emit('close', 0);
      }, 50);

      await transcodePromise;

      // Progress callback should be called with time string and percentage
      expect(onProgress).toHaveBeenCalledTimes(3);
      expect(onProgress).toHaveBeenNthCalledWith(1, '00:00:05.00', 25);  // 5/20 = 25%
      expect(onProgress).toHaveBeenNthCalledWith(2, '00:00:10.00', 50);  // 10/20 = 50%
      expect(onProgress).toHaveBeenNthCalledWith(3, '00:00:15.00', 75);  // 15/20 = 75%
    });

    it('should calculate accurate progress for short clips (5 seconds)', async () => {
      // Mock ffprobe (duration extraction)
      const mockFfprobeProcess = new EventEmitter() as any;
      mockFfprobeProcess.stdout = new EventEmitter();
      mockFfprobeProcess.stderr = new EventEmitter();

      // Mock ffmpeg (transcode)
      const mockFfmpegProcess = new EventEmitter() as any;
      mockFfmpegProcess.stderr = new EventEmitter();

      let callCount = 0;
      vi.mocked(spawn).mockImplementation(() => {
        callCount++;
        if (callCount === 1) return mockFfprobeProcess;
        return mockFfmpegProcess;
      });

      const onProgress = vi.fn();
      const transcodePromise = generator.generateProxy(
        mockSourceFile,
        mockOutputDir,
        { onProgress }
      );

      setTimeout(() => {
        // ffprobe returns 5 second duration
        mockFfprobeProcess.stdout.emit('data', Buffer.from('5.000000\n'));
        mockFfprobeProcess.emit('close', 0);
      }, 10);

      setTimeout(() => {
        // ffmpeg progress for 5 second video
        mockFfmpegProcess.stderr.emit('data', Buffer.from('time=00:00:01.00'));
        mockFfmpegProcess.stderr.emit('data', Buffer.from('time=00:00:02.50'));
        mockFfmpegProcess.stderr.emit('data', Buffer.from('time=00:00:04.00'));
        mockFfmpegProcess.emit('close', 0);
      }, 50);

      await transcodePromise;

      // For 5 second video
      expect(onProgress).toHaveBeenNthCalledWith(1, '00:00:01.00', 20);  // 1/5 = 20%
      expect(onProgress).toHaveBeenNthCalledWith(2, '00:00:02.50', 50);  // 2.5/5 = 50%
      expect(onProgress).toHaveBeenNthCalledWith(3, '00:00:04.00', 80);  // 4/5 = 80%
    });

    it('should calculate accurate progress for long clips (60+ seconds)', async () => {
      // Mock ffprobe (duration extraction)
      const mockFfprobeProcess = new EventEmitter() as any;
      mockFfprobeProcess.stdout = new EventEmitter();
      mockFfprobeProcess.stderr = new EventEmitter();

      // Mock ffmpeg (transcode)
      const mockFfmpegProcess = new EventEmitter() as any;
      mockFfmpegProcess.stderr = new EventEmitter();

      let callCount = 0;
      vi.mocked(spawn).mockImplementation(() => {
        callCount++;
        if (callCount === 1) return mockFfprobeProcess;
        return mockFfmpegProcess;
      });

      const onProgress = vi.fn();
      const transcodePromise = generator.generateProxy(
        mockSourceFile,
        mockOutputDir,
        { onProgress }
      );

      setTimeout(() => {
        // ffprobe returns 120 second duration
        mockFfprobeProcess.stdout.emit('data', Buffer.from('120.000000\n'));
        mockFfprobeProcess.emit('close', 0);
      }, 10);

      setTimeout(() => {
        // ffmpeg progress for 120 second video (2 minutes)
        mockFfmpegProcess.stderr.emit('data', Buffer.from('time=00:00:30.00'));
        mockFfmpegProcess.stderr.emit('data', Buffer.from('time=00:01:00.00'));
        mockFfmpegProcess.stderr.emit('data', Buffer.from('time=00:01:30.00'));
        mockFfmpegProcess.emit('close', 0);
      }, 50);

      await transcodePromise;

      // For 120 second video
      expect(onProgress).toHaveBeenNthCalledWith(1, '00:00:30.00', 25);  // 30/120 = 25%
      expect(onProgress).toHaveBeenNthCalledWith(2, '00:01:00.00', 50);  // 60/120 = 50%
      expect(onProgress).toHaveBeenNthCalledWith(3, '00:01:30.00', 75);  // 90/120 = 75%
    });

    it('should not call progress callback when stderr has no time= line', async () => {
      const mockProcess = new EventEmitter() as any;
      mockProcess.stderr = new EventEmitter();

      vi.mocked(spawn).mockReturnValue(mockProcess);

      const onProgress = vi.fn();
      const transcodePromise = generator.generateProxy(
        mockSourceFile,
        mockOutputDir,
        { onProgress }
      );

      setTimeout(() => {
        mockProcess.stderr.emit('data', Buffer.from('Some other FFmpeg output without time'));
        mockProcess.emit('close', 0);
      }, 10);

      await transcodePromise;

      expect(onProgress).not.toHaveBeenCalled();
    });

    it('should handle progress without duration (0% until duration known)', async () => {
      const mockProcess = new EventEmitter() as any;
      mockProcess.stderr = new EventEmitter();

      vi.mocked(spawn).mockReturnValue(mockProcess);

      const onProgress = vi.fn();
      const transcodePromise = generator.generateProxy(
        mockSourceFile,
        mockOutputDir,
        { onProgress }
      );

      setTimeout(() => {
        // Progress emitted before duration extracted
        mockProcess.stderr.emit('data', Buffer.from('time=00:00:05.00'));
        mockProcess.emit('close', 0);
      }, 10);

      await transcodePromise;

      // Should call with 0% if duration not yet known
      expect(onProgress).toHaveBeenCalledWith('00:00:05.00', 0);
    });
  });

  describe('Proxy Generation (ProRes 2560x1440)', () => {
    beforeEach(() => {
      generator = new ProxyGenerator();
    });

    it('should generate 2560x1440 ProRes Proxy with correct ffmpeg args', async () => {
      const mockProcess = new EventEmitter() as any;
      mockProcess.stderr = new EventEmitter();

      vi.mocked(spawn).mockReturnValue(mockProcess);

      const transcodePromise = generator.generateProxy(mockSourceFile, mockOutputDir);

      setTimeout(() => {
        mockProcess.emit('close', 0);
      }, 10);

      await transcodePromise;

      // Verify FFmpeg called with Phase 1b spec args
      expect(spawn).toHaveBeenCalledWith(
        '/usr/local/bin/ffmpeg',
        expect.arrayContaining([
          '-i', mockSourceFile,
          '-vf', 'scale=2560:1440',
          '-c:v', 'prores_ks',
          '-profile:v', '0', // ProRes Proxy profile
          '-vendor', 'apl0',
          '-pix_fmt', 'yuv422p10le',
          '-c:a', 'pcm_s16le'
        ])
      );
    });

    it('should write proxy to output directory with correct filename', async () => {
      // Mock ffprobe
      const mockFfprobeProcess = new EventEmitter() as any;
      mockFfprobeProcess.stdout = new EventEmitter();
      mockFfprobeProcess.stderr = new EventEmitter();

      // Mock ffmpeg
      const mockFfmpegProcess = new EventEmitter() as any;
      mockFfmpegProcess.stderr = new EventEmitter();

      let callCount = 0;
      vi.mocked(spawn).mockImplementation(() => {
        callCount++;
        if (callCount === 1) return mockFfprobeProcess;
        return mockFfmpegProcess;
      });

      const transcodePromise = generator.generateProxy(mockSourceFile, mockOutputDir);

      setTimeout(() => {
        mockFfprobeProcess.stdout.emit('data', Buffer.from('20.000000\n'));
        mockFfprobeProcess.emit('close', 0);
      }, 10);

      setTimeout(() => {
        mockFfmpegProcess.emit('close', 0);
      }, 50);

      const result = await transcodePromise;

      // Expected output: /Volumes/videos-proxy/test_proxy.MOV
      expect(result).toBe(`${mockOutputDir}/test_proxy.MOV`);
    });

    it('should resolve with output path on successful transcode', async () => {
      const mockProcess = new EventEmitter() as any;
      mockProcess.stderr = new EventEmitter();

      vi.mocked(spawn).mockReturnValue(mockProcess);

      const transcodePromise = generator.generateProxy(mockSourceFile, mockOutputDir);

      setTimeout(() => {
        mockProcess.emit('close', 0);
      }, 10);

      const result = await transcodePromise;

      expect(result).toBe(`${mockOutputDir}/test_proxy.MOV`);
    });

    it('should reject on ffmpeg failure (non-zero exit code)', async () => {
      const mockProcess = new EventEmitter() as any;
      mockProcess.stderr = new EventEmitter();

      vi.mocked(spawn).mockReturnValue(mockProcess);

      const transcodePromise = generator.generateProxy(mockSourceFile, mockOutputDir);

      setTimeout(() => {
        mockProcess.stderr.emit('data', Buffer.from('FFmpeg error'));
        mockProcess.emit('close', 1);
      }, 10);

      await expect(transcodePromise).rejects.toThrow('Proxy generation failed');
    });

    it('should reject on ffmpeg spawn error', async () => {
      const mockProcess = new EventEmitter() as any;
      mockProcess.stderr = new EventEmitter();

      vi.mocked(spawn).mockReturnValue(mockProcess);

      const spawnError = new Error('ENOENT: ffmpeg not found');
      const transcodePromise = generator.generateProxy(mockSourceFile, mockOutputDir);

      setTimeout(() => {
        mockProcess.emit('error', spawnError);
      }, 10);

      await expect(transcodePromise).rejects.toThrow('ENOENT: ffmpeg not found');
    });
  });

  describe('Timeout Handling (10 minutes default)', () => {
    beforeEach(() => {
      generator = new ProxyGenerator({ timeoutMs: 1000 }); // 1 second for testing
    });

    it('should reject when transcode exceeds timeout', async () => {
      const mockProcess = new EventEmitter() as any;
      mockProcess.stderr = new EventEmitter();
      mockProcess.kill = vi.fn(); // Mock kill method

      vi.mocked(spawn).mockReturnValue(mockProcess);

      const transcodePromise = generator.generateProxy(mockSourceFile, mockOutputDir);

      // Don't emit close event - let timeout trigger

      await expect(transcodePromise).rejects.toThrow('Transcode timeout');
      expect(mockProcess.kill).toHaveBeenCalled();
    });

    it('should not timeout when transcode completes within limit', async () => {
      const mockProcess = new EventEmitter() as any;
      mockProcess.stderr = new EventEmitter();

      vi.mocked(spawn).mockReturnValue(mockProcess);

      const transcodePromise = generator.generateProxy(mockSourceFile, mockOutputDir);

      setTimeout(() => {
        mockProcess.emit('close', 0);
      }, 500); // Complete before 1 second timeout

      const result = await transcodePromise;

      expect(result).toBe(`${mockOutputDir}/test_proxy.MOV`);
    });
  });

  describe('Options Handling', () => {
    beforeEach(() => {
      generator = new ProxyGenerator();
    });

    it('should work without progress callback (backward compatibility)', async () => {
      const mockProcess = new EventEmitter() as any;
      mockProcess.stderr = new EventEmitter();

      vi.mocked(spawn).mockReturnValue(mockProcess);

      const transcodePromise = generator.generateProxy(mockSourceFile, mockOutputDir);

      setTimeout(() => {
        mockProcess.stderr.emit('data', Buffer.from('time=00:00:05.00'));
        mockProcess.emit('close', 0);
      }, 10);

      const result = await transcodePromise;

      expect(result).toBe(`${mockOutputDir}/test_proxy.MOV`);
    });

    it('should accept custom output filename', async () => {
      // Mock ffprobe
      const mockFfprobeProcess = new EventEmitter() as any;
      mockFfprobeProcess.stdout = new EventEmitter();
      mockFfprobeProcess.stderr = new EventEmitter();

      // Mock ffmpeg
      const mockFfmpegProcess = new EventEmitter() as any;
      mockFfmpegProcess.stderr = new EventEmitter();

      let callCount = 0;
      vi.mocked(spawn).mockImplementation(() => {
        callCount++;
        if (callCount === 1) return mockFfprobeProcess;
        return mockFfmpegProcess;
      });

      const customName = 'custom_proxy.MOV';
      const transcodePromise = generator.generateProxy(
        mockSourceFile,
        mockOutputDir,
        { outputFilename: customName }
      );

      setTimeout(() => {
        mockFfprobeProcess.stdout.emit('data', Buffer.from('20.000000\n'));
        mockFfprobeProcess.emit('close', 0);
      }, 10);

      setTimeout(() => {
        mockFfmpegProcess.emit('close', 0);
      }, 50);

      const result = await transcodePromise;

      expect(result).toBe(`${mockOutputDir}/${customName}`);
    });
  });
});
