import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ProxyOrchestrator, ProxyJobConfig } from './proxyOrchestrator';
import { ProxyGenerator } from './proxyGenerator';
import { ExifPreserver } from './exifPreserver';

/**
 * ProxyOrchestrator Tests (Phase 1b B2.3)
 *
 * TDD Workflow: RED Phase
 * Tests written BEFORE implementation (Constitutional compliance).
 *
 * Critical Paths (B0 Condition 2 - Fail-Log-Continue):
 * 1. Coordinates ProxyGenerator + ExifPreserver workflow
 * 2. Fail-log-continue: Single file failure doesn't halt entire batch
 * 3. Reports partial success (95/100 files completed)
 * 4. Collects all errors for user display
 * 5. Progress callbacks for UI updates
 */

// Mock dependencies - use vi.hoisted to ensure mocks are available during hoisting
const { MockProxyGenerator, MockExifPreserver } = vi.hoisted(() => ({
  MockProxyGenerator: vi.fn(),
  MockExifPreserver: vi.fn(),
}));

vi.mock('./proxyGenerator', () => ({
  ProxyGenerator: MockProxyGenerator,
}));
vi.mock('./exifPreserver', () => ({
  ExifPreserver: MockExifPreserver,
}));

describe('ProxyOrchestrator', () => {
  let orchestrator: ProxyOrchestrator;
  let mockProxyGenerator: any;
  let mockExifPreserver: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock instances
    mockProxyGenerator = {
      generateProxy: vi.fn(),
      extractDuration: vi.fn()
    };

    mockExifPreserver = {
      extractBatch: vi.fn(),
      writeBatch: vi.fn(),
      verifyBatch: vi.fn()
    };

    // Reset and configure mock constructors to return instances when called with 'new'
    MockProxyGenerator.mockReset().mockImplementation(function(this: any) {
      return mockProxyGenerator;
    });
    MockExifPreserver.mockReset().mockImplementation(function(this: any) {
      return mockExifPreserver;
    });

    orchestrator = new ProxyOrchestrator();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Successful Job Execution', () => {
    it('should execute full workflow: transcode → EXIF preserve → verify', async () => {
      const jobConfig: ProxyJobConfig = {
        rawVideoPaths: [
          '/Volumes/EAV_Video_RAW/project/video1.MOV',
          '/Volumes/EAV_Video_RAW/project/video2.MOV'
        ],
        proxyOutputDir: '/Volumes/videos-current/project/proxies'
      };

      // Mock successful transcode
      mockProxyGenerator.generateProxy
        .mockResolvedValueOnce('/Volumes/videos-current/project/proxies/video1_proxy.MOV')
        .mockResolvedValueOnce('/Volumes/videos-current/project/proxies/video2_proxy.MOV');

      // Mock successful EXIF extraction
      mockExifPreserver.extractBatch.mockResolvedValue(
        new Map([
          ['/Volumes/EAV_Video_RAW/project/video1.MOV', '2024:11:20 14:30:45'],
          ['/Volumes/EAV_Video_RAW/project/video2.MOV', '2024:11:20 14:32:10']
        ])
      );

      // Mock successful EXIF write
      mockExifPreserver.writeBatch.mockResolvedValue(undefined);

      // Mock successful verification
      mockExifPreserver.verifyBatch.mockResolvedValue([
        {
          proxyPath: '/Volumes/videos-current/project/proxies/video1_proxy.MOV',
          rawDate: '2024:11:20 14:30:45',
          proxyDate: '2024:11:20 14:30:45',
          matches: true
        },
        {
          proxyPath: '/Volumes/videos-current/project/proxies/video2_proxy.MOV',
          rawDate: '2024:11:20 14:32:10',
          proxyDate: '2024:11:20 14:32:10',
          matches: true
        }
      ]);

      const progressCallback = vi.fn();
      const result = await orchestrator.executeJob(jobConfig, progressCallback);

      // Should complete successfully
      expect(result.success).toBe(true);
      expect(result.completedCount).toBe(2);
      expect(result.failedCount).toBe(0);
      expect(result.failedFiles).toHaveLength(0);
      expect(result.verificationFailures).toHaveLength(0);

      // Should call progress callback
      expect(progressCallback).toHaveBeenCalled();
    });

    it('should pass progress events through to callback', async () => {
      const jobConfig: ProxyJobConfig = {
        rawVideoPaths: ['/Volumes/EAV_Video_RAW/project/video1.MOV'],
        proxyOutputDir: '/Volumes/videos-current/project/proxies'
      };

      mockProxyGenerator.generateProxy.mockImplementation(
        async (_source: string, _output: string, options?: { onProgress?: (t: string, p: number) => void }) => {
          // Simulate progress events
          if (options?.onProgress) {
            options.onProgress('00:00:05.00', 50);
            options.onProgress('00:00:10.00', 100);
          }
          return '/Volumes/videos-current/project/proxies/video1_proxy.MOV';
        }
      );

      mockExifPreserver.extractBatch.mockResolvedValue(new Map());
      mockExifPreserver.writeBatch.mockResolvedValue(undefined);
      mockExifPreserver.verifyBatch.mockResolvedValue([]);

      const progressCallback = vi.fn();
      await orchestrator.executeJob(jobConfig, progressCallback);

      // Should receive progress events
      expect(progressCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'transcode_progress',
          filename: expect.any(String),
          timeString: expect.any(String),
          percentage: expect.any(Number)
        })
      );
    });
  });

  describe('Fail-Log-Continue (B0 Condition 2)', () => {
    it('should continue processing after single file transcode failure', async () => {
      const jobConfig: ProxyJobConfig = {
        rawVideoPaths: [
          '/Volumes/EAV_Video_RAW/project/video1.MOV',
          '/Volumes/EAV_Video_RAW/project/video2.MOV', // Will fail
          '/Volumes/EAV_Video_RAW/project/video3.MOV'
        ],
        proxyOutputDir: '/Volumes/videos-current/project/proxies'
      };

      // Mock: video2 fails, others succeed
      mockProxyGenerator.generateProxy
        .mockResolvedValueOnce('/Volumes/videos-current/project/proxies/video1_proxy.MOV')
        .mockRejectedValueOnce(new Error('Transcode failed'))
        .mockResolvedValueOnce('/Volumes/videos-current/project/proxies/video3_proxy.MOV');

      mockExifPreserver.extractBatch.mockResolvedValue(new Map());
      mockExifPreserver.writeBatch.mockResolvedValue(undefined);
      mockExifPreserver.verifyBatch.mockResolvedValue([]);

      const result = await orchestrator.executeJob(jobConfig, vi.fn());

      // Should report partial success
      expect(result.success).toBe(false); // Not 100% success
      expect(result.completedCount).toBe(2); // video1 + video3
      expect(result.failedCount).toBe(1); // video2
      expect(result.failedFiles).toHaveLength(1);
      expect(result.failedFiles[0]).toMatchObject({
        filename: 'video2.MOV',
        error: 'Transcode failed'
      });
    });

    it('should report partial success (95/100 files completed)', async () => {
      const rawVideoPaths = Array.from({ length: 100 }, (_, i) =>
        `/Volumes/EAV_Video_RAW/project/video${i + 1}.MOV`
      );

      const jobConfig: ProxyJobConfig = {
        rawVideoPaths,
        proxyOutputDir: '/Volumes/videos-current/project/proxies'
      };

      // Mock: 95 succeed, 5 fail
      mockProxyGenerator.generateProxy.mockImplementation(async (sourcePath: string) => {
        const fileNum = parseInt(sourcePath.match(/video(\d+)\.MOV/)?.[1] || '0');

        // Fail files 10, 25, 50, 75, 90
        if ([10, 25, 50, 75, 90].includes(fileNum)) {
          throw new Error('Transcode failed');
        }

        return `/Volumes/videos-current/project/proxies/video${fileNum}_proxy.MOV`;
      });

      mockExifPreserver.extractBatch.mockResolvedValue(new Map());
      mockExifPreserver.writeBatch.mockResolvedValue(undefined);
      mockExifPreserver.verifyBatch.mockResolvedValue([]);

      const result = await orchestrator.executeJob(jobConfig, vi.fn());

      // Should report partial success
      expect(result.completedCount).toBe(95);
      expect(result.failedCount).toBe(5);
      expect(result.failedFiles).toHaveLength(5);
      expect(result.success).toBe(false); // Not 100%
    });

    it('should collect all errors for display', async () => {
      const jobConfig: ProxyJobConfig = {
        rawVideoPaths: [
          '/Volumes/EAV_Video_RAW/project/video1.MOV',
          '/Volumes/EAV_Video_RAW/project/video2.MOV',
          '/Volumes/EAV_Video_RAW/project/video3.MOV'
        ],
        proxyOutputDir: '/Volumes/videos-current/project/proxies'
      };

      // Mock: All files fail with different errors
      mockProxyGenerator.generateProxy
        .mockRejectedValueOnce(new Error('Codec not supported'))
        .mockRejectedValueOnce(new Error('File not found'))
        .mockRejectedValueOnce(new Error('Transcode timeout'));

      mockExifPreserver.extractBatch.mockResolvedValue(new Map());
      mockExifPreserver.writeBatch.mockResolvedValue(undefined);
      mockExifPreserver.verifyBatch.mockResolvedValue([]);

      const result = await orchestrator.executeJob(jobConfig, vi.fn());

      // Should collect all errors
      expect(result.failedFiles).toHaveLength(3);
      expect(result.failedFiles[0]).toMatchObject({
        filename: 'video1.MOV',
        error: 'Codec not supported'
      });
      expect(result.failedFiles[1]).toMatchObject({
        filename: 'video2.MOV',
        error: 'File not found'
      });
      expect(result.failedFiles[2]).toMatchObject({
        filename: 'video3.MOV',
        error: 'Transcode timeout'
      });
    });

    it('should continue to EXIF phase even if some transcodes failed', async () => {
      const jobConfig: ProxyJobConfig = {
        rawVideoPaths: [
          '/Volumes/EAV_Video_RAW/project/video1.MOV',
          '/Volumes/EAV_Video_RAW/project/video2.MOV' // Will fail
        ],
        proxyOutputDir: '/Volumes/videos-current/project/proxies'
      };

      mockProxyGenerator.generateProxy
        .mockResolvedValueOnce('/Volumes/videos-current/project/proxies/video1_proxy.MOV')
        .mockRejectedValueOnce(new Error('Transcode failed'));

      mockExifPreserver.extractBatch.mockResolvedValue(new Map([
        ['/Volumes/EAV_Video_RAW/project/video1.MOV', '2024:11:20 14:30:45']
      ]));
      mockExifPreserver.writeBatch.mockResolvedValue(undefined);
      mockExifPreserver.verifyBatch.mockResolvedValue([
        {
          proxyPath: '/Volumes/videos-current/project/proxies/video1_proxy.MOV',
          rawDate: '2024:11:20 14:30:45',
          proxyDate: '2024:11:20 14:30:45',
          matches: true
        }
      ]);

      const result = await orchestrator.executeJob(jobConfig, vi.fn());

      // Should still run EXIF phase for successful files
      expect(mockExifPreserver.extractBatch).toHaveBeenCalled();
      expect(mockExifPreserver.writeBatch).toHaveBeenCalled();
      expect(mockExifPreserver.verifyBatch).toHaveBeenCalled();

      expect(result.completedCount).toBe(1);
      expect(result.failedCount).toBe(1);
    });
  });

  describe('EXIF Verification Failures', () => {
    it('should report I1 violations separately from transcode failures', async () => {
      const jobConfig: ProxyJobConfig = {
        rawVideoPaths: [
          '/Volumes/EAV_Video_RAW/project/video1.MOV',
          '/Volumes/EAV_Video_RAW/project/video2.MOV'
        ],
        proxyOutputDir: '/Volumes/videos-current/project/proxies'
      };

      mockProxyGenerator.generateProxy
        .mockResolvedValueOnce('/Volumes/videos-current/project/proxies/video1_proxy.MOV')
        .mockResolvedValueOnce('/Volumes/videos-current/project/proxies/video2_proxy.MOV');

      mockExifPreserver.extractBatch.mockResolvedValue(new Map([
        ['/Volumes/EAV_Video_RAW/project/video1.MOV', '2024:11:20 14:30:45'],
        ['/Volumes/EAV_Video_RAW/project/video2.MOV', '2024:11:20 14:32:10']
      ]));
      mockExifPreserver.writeBatch.mockResolvedValue(undefined);
      mockExifPreserver.verifyBatch.mockResolvedValue([
        {
          proxyPath: '/Volumes/videos-current/project/proxies/video1_proxy.MOV',
          rawDate: '2024:11:20 14:30:45',
          proxyDate: '2024:11:20 14:30:45',
          matches: true
        },
        {
          proxyPath: '/Volumes/videos-current/project/proxies/video2_proxy.MOV',
          rawDate: '2024:11:20 14:32:10',
          proxyDate: '2024:11:20 15:00:00', // MISMATCH
          matches: false
        }
      ]);

      const result = await orchestrator.executeJob(jobConfig, vi.fn());

      // Transcodes succeeded
      expect(result.completedCount).toBe(2);
      expect(result.failedCount).toBe(0);

      // But I1 violation detected
      expect(result.verificationFailures).toHaveLength(1);
      expect(result.verificationFailures[0]).toMatchObject({
        proxyPath: '/Volumes/videos-current/project/proxies/video2_proxy.MOV',
        matches: false
      });
    });
  });

  describe('Progress Events', () => {
    it('should emit file_start event for each file', async () => {
      const jobConfig: ProxyJobConfig = {
        rawVideoPaths: [
          '/Volumes/EAV_Video_RAW/project/video1.MOV',
          '/Volumes/EAV_Video_RAW/project/video2.MOV'
        ],
        proxyOutputDir: '/Volumes/videos-current/project/proxies'
      };

      mockProxyGenerator.generateProxy
        .mockResolvedValueOnce('/proxy1.MOV')
        .mockResolvedValueOnce('/proxy2.MOV');

      mockExifPreserver.extractBatch.mockResolvedValue(new Map());
      mockExifPreserver.writeBatch.mockResolvedValue(undefined);
      mockExifPreserver.verifyBatch.mockResolvedValue([]);

      const progressCallback = vi.fn();
      await orchestrator.executeJob(jobConfig, progressCallback);

      // Should emit file_start for each file
      expect(progressCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'file_start',
          filename: 'video1.MOV',
          index: 0,
          total: 2
        })
      );
      expect(progressCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'file_start',
          filename: 'video2.MOV',
          index: 1,
          total: 2
        })
      );
    });

    it('should emit file_complete event after successful transcode', async () => {
      const jobConfig: ProxyJobConfig = {
        rawVideoPaths: ['/Volumes/EAV_Video_RAW/project/video1.MOV'],
        proxyOutputDir: '/Volumes/videos-current/project/proxies'
      };

      mockProxyGenerator.generateProxy.mockResolvedValue('/proxy1.MOV');
      mockExifPreserver.extractBatch.mockResolvedValue(new Map());
      mockExifPreserver.writeBatch.mockResolvedValue(undefined);
      mockExifPreserver.verifyBatch.mockResolvedValue([]);

      const progressCallback = vi.fn();
      await orchestrator.executeJob(jobConfig, progressCallback);

      expect(progressCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'file_complete',
          filename: 'video1.MOV',
          success: true
        })
      );
    });

    it('should emit file_failed event after transcode failure', async () => {
      const jobConfig: ProxyJobConfig = {
        rawVideoPaths: ['/Volumes/EAV_Video_RAW/project/video1.MOV'],
        proxyOutputDir: '/Volumes/videos-current/project/proxies'
      };

      mockProxyGenerator.generateProxy.mockRejectedValue(new Error('Transcode failed'));
      mockExifPreserver.extractBatch.mockResolvedValue(new Map());
      mockExifPreserver.writeBatch.mockResolvedValue(undefined);
      mockExifPreserver.verifyBatch.mockResolvedValue([]);

      const progressCallback = vi.fn();
      await orchestrator.executeJob(jobConfig, progressCallback);

      expect(progressCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'file_failed',
          filename: 'video1.MOV',
          error: 'Transcode failed'
        })
      );
    });

    it('should include index and total in transcode_progress events for UI display', async () => {
      // Issue: ProxyProgressCard displays "X / Y videos" but transcode_progress
      // events were missing index and total, causing "0 / 0" to display
      const jobConfig: ProxyJobConfig = {
        rawVideoPaths: [
          '/Volumes/EAV_Video_RAW/project/video1.MOV',
          '/Volumes/EAV_Video_RAW/project/video2.MOV'
        ],
        proxyOutputDir: '/Volumes/videos-current/project/proxies'
      };

      mockProxyGenerator.generateProxy.mockImplementation(
        async (_source: string, _output: string, options?: { onProgress?: (t: string, p: number) => void }) => {
          // Simulate progress event during transcode
          if (options?.onProgress) {
            options.onProgress('00:00:05.00', 50);
          }
          return '/proxy.MOV';
        }
      );

      mockExifPreserver.extractBatch.mockResolvedValue(new Map());
      mockExifPreserver.writeBatch.mockResolvedValue(undefined);
      mockExifPreserver.verifyBatch.mockResolvedValue([]);

      const progressCallback = vi.fn();
      await orchestrator.executeJob(jobConfig, progressCallback);

      // Find transcode_progress events
      const transcodeProgressCalls = progressCallback.mock.calls
        .filter((call) => call[0]?.type === 'transcode_progress');

      expect(transcodeProgressCalls.length).toBeGreaterThan(0);

      // CRITICAL: transcode_progress MUST include index and total for UI
      transcodeProgressCalls.forEach((call) => {
        expect(call[0]).toMatchObject({
          type: 'transcode_progress',
          index: expect.any(Number),
          total: 2 // Total files in job
        });
      });
    });

    it('should emit phase_start events for transcode and EXIF phases', async () => {
      const jobConfig: ProxyJobConfig = {
        rawVideoPaths: ['/Volumes/EAV_Video_RAW/project/video1.MOV'],
        proxyOutputDir: '/Volumes/videos-current/project/proxies'
      };

      mockProxyGenerator.generateProxy.mockResolvedValue('/proxy1.MOV');
      mockExifPreserver.extractBatch.mockResolvedValue(new Map());
      mockExifPreserver.writeBatch.mockResolvedValue(undefined);
      mockExifPreserver.verifyBatch.mockResolvedValue([]);

      const progressCallback = vi.fn();
      await orchestrator.executeJob(jobConfig, progressCallback);

      expect(progressCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'phase_start',
          phase: 'transcode'
        })
      );
      expect(progressCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'phase_start',
          phase: 'exif_preserve'
        })
      );
    });
  });
});
