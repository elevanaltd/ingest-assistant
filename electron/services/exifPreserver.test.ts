import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ExifPreserver } from './exifPreserver';
import { spawn } from 'child_process';
import { EventEmitter } from 'events';

/**
 * ExifPreserver Tests (Phase 1b B2.2)
 *
 * TDD Workflow: RED Phase
 * Tests written BEFORE implementation (Constitutional compliance).
 *
 * Critical Paths (B0 Condition 4 - EXIF DateTimeOriginal Preservation):
 * 1. Batch extraction of DateTimeOriginal from raw videos (Phase 1)
 * 2. Batch write of DateTimeOriginal to proxy videos (Phase 3a)
 * 3. Batch verification of timestamp match (Phase 3b - I1 compliance)
 * 4. Full workflow coordinator (extract → transcode → write → verify)
 */

// Mock modules
vi.mock('child_process');

describe('ExifPreserver', () => {
  let preserver: ExifPreserver;

  beforeEach(() => {
    vi.clearAllMocks();
    preserver = new ExifPreserver();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Phase 1: Batch Extract DateTimeOriginal', () => {
    it('should reject with clear error when exiftool is not installed', async () => {
      // Mock spawn to emit ENOENT error (simulating missing exiftool)
      const mockProcess = new EventEmitter() as any;
      mockProcess.stdout = new EventEmitter();
      mockProcess.stderr = new EventEmitter();
      vi.mocked(spawn).mockReturnValue(mockProcess);

      const extractPromise = preserver.extractBatch(['/valid/video.MOV']);

      setTimeout(() => {
        const enoentError: any = new Error('spawn exiftool ENOENT');
        enoentError.code = 'ENOENT';
        mockProcess.emit('error', enoentError);
      }, 10);

      await expect(extractPromise).rejects.toThrow(/ENOENT|exiftool/i);
    });

    it('should extract DateTimeOriginal from multiple raw videos via exiftool -json', async () => {
      // Mock exiftool spawn to return JSON output
      const mockProcess = new EventEmitter() as any;
      mockProcess.stdout = new EventEmitter();
      mockProcess.stderr = new EventEmitter();

      vi.mocked(spawn).mockReturnValue(mockProcess);

      const rawPaths = [
        '/Volumes/EAV_Video_RAW/project/video1.MOV',
        '/Volumes/EAV_Video_RAW/project/video2.MOV'
      ];

      const extractPromise = preserver.extractBatch(rawPaths);

      setTimeout(() => {
        // Simulate exiftool -json output
        const jsonOutput = JSON.stringify([
          {
            SourceFile: '/Volumes/EAV_Video_RAW/project/video1.MOV',
            DateTimeOriginal: '2024:11:20 14:30:45'
          },
          {
            SourceFile: '/Volumes/EAV_Video_RAW/project/video2.MOV',
            DateTimeOriginal: '2024:11:20 14:32:10'
          }
        ]);
        mockProcess.stdout.emit('data', Buffer.from(jsonOutput));
        mockProcess.emit('close', 0);
      }, 10);

      const result = await extractPromise;

      // Should return Map of rawPath -> DateTimeOriginal
      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(2);
      expect(result.get('/Volumes/EAV_Video_RAW/project/video1.MOV')).toBe('2024:11:20 14:30:45');
      expect(result.get('/Volumes/EAV_Video_RAW/project/video2.MOV')).toBe('2024:11:20 14:32:10');

      // Verify exiftool called with -json flag for batch extraction
      expect(spawn).toHaveBeenCalledWith(
        'exiftool',
        expect.arrayContaining([
          '-json',
          '-DateTimeOriginal',
          ...rawPaths
        ])
      );
    });

    it('should handle empty batch gracefully', async () => {
      const result = await preserver.extractBatch([]);

      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(0);
    });

    it('should handle missing DateTimeOriginal in some files', async () => {
      const mockProcess = new EventEmitter() as any;
      mockProcess.stdout = new EventEmitter();
      mockProcess.stderr = new EventEmitter();

      vi.mocked(spawn).mockReturnValue(mockProcess);

      const rawPaths = [
        '/Volumes/EAV_Video_RAW/project/video1.MOV',
        '/Volumes/EAV_Video_RAW/project/video2.MOV'
      ];

      const extractPromise = preserver.extractBatch(rawPaths);

      setTimeout(() => {
        // video2 has no DateTimeOriginal
        const jsonOutput = JSON.stringify([
          {
            SourceFile: '/Volumes/EAV_Video_RAW/project/video1.MOV',
            DateTimeOriginal: '2024:11:20 14:30:45'
          },
          {
            SourceFile: '/Volumes/EAV_Video_RAW/project/video2.MOV'
            // Missing DateTimeOriginal
          }
        ]);
        mockProcess.stdout.emit('data', Buffer.from(jsonOutput));
        mockProcess.emit('close', 0);
      }, 10);

      const result = await extractPromise;

      // Should only include files with DateTimeOriginal
      expect(result.size).toBe(1);
      expect(result.get('/Volumes/EAV_Video_RAW/project/video1.MOV')).toBe('2024:11:20 14:30:45');
      expect(result.has('/Volumes/EAV_Video_RAW/project/video2.MOV')).toBe(false);
    });

    it('should reject when exiftool fails', async () => {
      const mockProcess = new EventEmitter() as any;
      mockProcess.stdout = new EventEmitter();
      mockProcess.stderr = new EventEmitter();

      vi.mocked(spawn).mockReturnValue(mockProcess);

      const extractPromise = preserver.extractBatch(['/invalid/path.MOV']);

      setTimeout(() => {
        mockProcess.stderr.emit('data', Buffer.from('File not found'));
        mockProcess.emit('close', 1);
      }, 10);

      await expect(extractPromise).rejects.toThrow('Failed to extract EXIF data');
    });
  });

  describe('Phase 3a: Batch Write DateTimeOriginal', () => {
    it('should write DIFFERENT DateTimeOriginal values to each proxy file (I1 bug fix)', async () => {
      // GREEN PHASE: Fixed implementation calls exiftool separately for each file
      // This ensures per-file timestamp preservation (I1 compliance)
      const mockProcesses: any[] = [];

      vi.mocked(spawn).mockImplementation(() => {
        const mockProcess = new EventEmitter() as any;
        mockProcess.stdout = new EventEmitter();
        mockProcess.stderr = new EventEmitter();
        mockProcesses.push(mockProcess);
        return mockProcess;
      });

      const proxyDateMap = new Map([
        ['/Volumes/videos-current/project/video1_proxy.MOV', '2024:11:20 14:30:45'],
        ['/Volumes/videos-current/project/video2_proxy.MOV', '2024:11:20 14:32:10']
      ]);

      const writePromise = preserver.writeBatch(proxyDateMap);

      // Complete all spawned processes
      setTimeout(() => {
        mockProcesses.forEach(process => process.emit('close', 0));
      }, 10);

      await writePromise;

      // CRITICAL: Should call exiftool separately for each file to preserve per-file timestamps
      const spawnCalls = vi.mocked(spawn).mock.calls;

      // Expected behavior: Each file gets its own exiftool call with its specific timestamp
      expect(spawnCalls.length).toBe(2); // Should be 2 separate calls (1 per file)

      // First call: video1_proxy.MOV with 14:30:45
      expect(spawnCalls[0][0]).toBe('exiftool');
      expect(spawnCalls[0][1]).toContain('-overwrite_original');
      expect(spawnCalls[0][1]).toContain('-QuickTime:DateTimeOriginal=2024:11:20 14:30:45');
      expect(spawnCalls[0][1]).toContain('/Volumes/videos-current/project/video1_proxy.MOV');
      expect(spawnCalls[0][1]).not.toContain('video2_proxy.MOV'); // Should NOT include other files

      // Second call: video2_proxy.MOV with 14:32:10
      expect(spawnCalls[1][0]).toBe('exiftool');
      expect(spawnCalls[1][1]).toContain('-overwrite_original');
      expect(spawnCalls[1][1]).toContain('-QuickTime:DateTimeOriginal=2024:11:20 14:32:10');
      expect(spawnCalls[1][1]).toContain('/Volumes/videos-current/project/video2_proxy.MOV');
      expect(spawnCalls[1][1]).not.toContain('video1_proxy.MOV'); // Should NOT include other files
    });

    it('should write DateTimeOriginal to multiple proxy videos via exiftool', async () => {
      const mockProcesses: any[] = [];

      vi.mocked(spawn).mockImplementation(() => {
        const mockProcess = new EventEmitter() as any;
        mockProcess.stdout = new EventEmitter();
        mockProcess.stderr = new EventEmitter();
        mockProcesses.push(mockProcess);
        return mockProcess;
      });

      const proxyDateMap = new Map([
        ['/Volumes/videos-current/project/video1_proxy.MOV', '2024:11:20 14:30:45'],
        ['/Volumes/videos-current/project/video2_proxy.MOV', '2024:11:20 14:32:10']
      ]);

      const writePromise = preserver.writeBatch(proxyDateMap);

      setTimeout(() => {
        mockProcesses.forEach(process => process.emit('close', 0));
      }, 10);

      await writePromise;

      // Should call exiftool separately for each file with its specific timestamp
      expect(spawn).toHaveBeenCalledTimes(2);
      expect(spawn).toHaveBeenCalledWith(
        'exiftool',
        expect.arrayContaining([
          '-overwrite_original',
          '-QuickTime:DateTimeOriginal=2024:11:20 14:30:45',
          '/Volumes/videos-current/project/video1_proxy.MOV'
        ])
      );
      expect(spawn).toHaveBeenCalledWith(
        'exiftool',
        expect.arrayContaining([
          '-overwrite_original',
          '-QuickTime:DateTimeOriginal=2024:11:20 14:32:10',
          '/Volumes/videos-current/project/video2_proxy.MOV'
        ])
      );
    });

    it('should handle empty batch gracefully', async () => {
      await expect(preserver.writeBatch(new Map())).resolves.not.toThrow();
    });

    it('should reject when exiftool write fails', async () => {
      const mockProcess = new EventEmitter() as any;
      mockProcess.stdout = new EventEmitter();
      mockProcess.stderr = new EventEmitter();

      vi.mocked(spawn).mockReturnValue(mockProcess);

      const proxyDateMap = new Map([
        ['/invalid/proxy.MOV', '2024:11:20 14:30:45']
      ]);

      const writePromise = preserver.writeBatch(proxyDateMap);

      setTimeout(() => {
        mockProcess.stderr.emit('data', Buffer.from('File not found'));
        mockProcess.emit('close', 1);
      }, 10);

      await expect(writePromise).rejects.toThrow('Failed to write EXIF data');
    });

    it('should limit concurrent exiftool processes to prevent EMFILE errors', async () => {
      // CRITICAL: Prevents O(n) simultaneous processes which causes EMFILE on large batches
      // Risk: 500+ proxies → 500+ spawn() → OS file descriptor exhaustion
      const mockProcesses: any[] = [];
      let maxConcurrent = 0;
      let currentConcurrent = 0;

      vi.mocked(spawn).mockImplementation(() => {
        const mockProcess = new EventEmitter() as any;
        mockProcess.stdout = new EventEmitter();
        mockProcess.stderr = new EventEmitter();

        // Track concurrent process count
        currentConcurrent++;
        if (currentConcurrent > maxConcurrent) {
          maxConcurrent = currentConcurrent;
        }

        mockProcesses.push(mockProcess);

        // Simulate process completing (decrement counter)
        mockProcess.on('close', () => {
          currentConcurrent--;
        });

        // Auto-complete process immediately (chunked implementation waits for each chunk)
        setTimeout(() => {
          mockProcess.emit('close', 0);
        }, 1);

        return mockProcess;
      });

      // Create large batch (20 files to verify chunking)
      const proxyDateMap = new Map<string, string>();
      for (let i = 1; i <= 20; i++) {
        proxyDateMap.set(`/Volumes/videos-current/project/video${i}_proxy.MOV`, `2024:11:20 14:${i.toString().padStart(2, '0')}:00`);
      }

      await preserver.writeBatch(proxyDateMap);

      // ASSERTION: Max concurrent processes should be limited to 8 (not 20)
      expect(maxConcurrent).toBeLessThanOrEqual(8);
      expect(maxConcurrent).toBeGreaterThan(0); // Sanity check: at least 1 concurrent process

      // ASSERTION: All 20 files should still be processed
      expect(spawn).toHaveBeenCalledTimes(20);
    });
  });

  describe('Phase 3b: Batch Verification', () => {
    it('should verify DateTimeOriginal matches between raw and proxies', async () => {
      const mockProcess = new EventEmitter() as any;
      mockProcess.stdout = new EventEmitter();
      mockProcess.stderr = new EventEmitter();

      vi.mocked(spawn).mockReturnValue(mockProcess);

      const rawDateMap = new Map([
        ['/Volumes/EAV_Video_RAW/project/video1.MOV', '2024:11:20 14:30:45'],
        ['/Volumes/EAV_Video_RAW/project/video2.MOV', '2024:11:20 14:32:10']
      ]);

      const proxyPaths = [
        '/Volumes/videos-current/project/video1_proxy.MOV',
        '/Volumes/videos-current/project/video2_proxy.MOV'
      ];

      const verifyPromise = preserver.verifyBatch(rawDateMap, proxyPaths);

      setTimeout(() => {
        // Simulate exiftool -json output from proxies
        const jsonOutput = JSON.stringify([
          {
            SourceFile: '/Volumes/videos-current/project/video1_proxy.MOV',
            DateTimeOriginal: '2024:11:20 14:30:45' // Matches
          },
          {
            SourceFile: '/Volumes/videos-current/project/video2_proxy.MOV',
            DateTimeOriginal: '2024:11:20 14:32:10' // Matches
          }
        ]);
        mockProcess.stdout.emit('data', Buffer.from(jsonOutput));
        mockProcess.emit('close', 0);
      }, 10);

      const results = await verifyPromise;

      // Should return verification results
      expect(results).toHaveLength(2);
      expect(results[0]).toMatchObject({
        proxyPath: '/Volumes/videos-current/project/video1_proxy.MOV',
        rawDate: '2024:11:20 14:30:45',
        proxyDate: '2024:11:20 14:30:45',
        matches: true
      });
      expect(results[1]).toMatchObject({
        proxyPath: '/Volumes/videos-current/project/video2_proxy.MOV',
        rawDate: '2024:11:20 14:32:10',
        proxyDate: '2024:11:20 14:32:10',
        matches: true
      });
    });

    it('should detect timestamp mismatch (I1 violation)', async () => {
      const mockProcess = new EventEmitter() as any;
      mockProcess.stdout = new EventEmitter();
      mockProcess.stderr = new EventEmitter();

      vi.mocked(spawn).mockReturnValue(mockProcess);

      const rawDateMap = new Map([
        ['/Volumes/EAV_Video_RAW/project/video1.MOV', '2024:11:20 14:30:45']
      ]);

      const proxyPaths = [
        '/Volumes/videos-current/project/video1_proxy.MOV'
      ];

      const verifyPromise = preserver.verifyBatch(rawDateMap, proxyPaths);

      setTimeout(() => {
        // Proxy has WRONG timestamp
        const jsonOutput = JSON.stringify([
          {
            SourceFile: '/Volumes/videos-current/project/video1_proxy.MOV',
            DateTimeOriginal: '2024:11:20 15:00:00' // MISMATCH
          }
        ]);
        mockProcess.stdout.emit('data', Buffer.from(jsonOutput));
        mockProcess.emit('close', 0);
      }, 10);

      const results = await verifyPromise;

      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        proxyPath: '/Volumes/videos-current/project/video1_proxy.MOV',
        rawDate: '2024:11:20 14:30:45',
        proxyDate: '2024:11:20 15:00:00',
        matches: false
      });
    });

    it('should handle missing DateTimeOriginal in proxy', async () => {
      const mockProcess = new EventEmitter() as any;
      mockProcess.stdout = new EventEmitter();
      mockProcess.stderr = new EventEmitter();

      vi.mocked(spawn).mockReturnValue(mockProcess);

      const rawDateMap = new Map([
        ['/Volumes/EAV_Video_RAW/project/video1.MOV', '2024:11:20 14:30:45']
      ]);

      const proxyPaths = [
        '/Volumes/videos-current/project/video1_proxy.MOV'
      ];

      const verifyPromise = preserver.verifyBatch(rawDateMap, proxyPaths);

      setTimeout(() => {
        // Proxy has NO DateTimeOriginal
        const jsonOutput = JSON.stringify([
          {
            SourceFile: '/Volumes/videos-current/project/video1_proxy.MOV'
            // Missing DateTimeOriginal
          }
        ]);
        mockProcess.stdout.emit('data', Buffer.from(jsonOutput));
        mockProcess.emit('close', 0);
      }, 10);

      const results = await verifyPromise;

      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        proxyPath: '/Volumes/videos-current/project/video1_proxy.MOV',
        rawDate: '2024:11:20 14:30:45',
        proxyDate: undefined,
        matches: false
      });
    });
  });

  describe('Proxy Path Matching (Cross-Platform)', () => {
    it('should match proxy with lowercase .mov extension', async () => {
      const mockProcess = new EventEmitter() as any;
      mockProcess.stdout = new EventEmitter();
      mockProcess.stderr = new EventEmitter();

      vi.mocked(spawn).mockReturnValue(mockProcess);

      const rawDateMap = new Map([
        ['/Volumes/EAV_Video_RAW/project/video1.mov', '2024:11:20 14:30:45']
      ]);

      const proxyPaths = [
        '/Volumes/videos-current/project/video1_proxy.mov'
      ];

      const verifyPromise = preserver.verifyBatch(rawDateMap, proxyPaths);

      setTimeout(() => {
        const jsonOutput = JSON.stringify([
          {
            SourceFile: '/Volumes/videos-current/project/video1_proxy.mov',
            DateTimeOriginal: '2024:11:20 14:30:45'
          }
        ]);
        mockProcess.stdout.emit('data', Buffer.from(jsonOutput));
        mockProcess.emit('close', 0);
      }, 10);

      const results = await verifyPromise;

      expect(results).toHaveLength(1);
      expect(results[0].proxyPath).toBe('/Volumes/videos-current/project/video1_proxy.mov');
      expect(results[0].matches).toBe(true);
    });

    it('should match proxy with .mp4 extension', async () => {
      const mockProcess = new EventEmitter() as any;
      mockProcess.stdout = new EventEmitter();
      mockProcess.stderr = new EventEmitter();

      vi.mocked(spawn).mockReturnValue(mockProcess);

      const rawDateMap = new Map([
        ['/Volumes/EAV_Video_RAW/project/video1.mp4', '2024:11:20 14:30:45']
      ]);

      const proxyPaths = [
        '/Volumes/videos-current/project/video1_proxy.mp4'
      ];

      const verifyPromise = preserver.verifyBatch(rawDateMap, proxyPaths);

      setTimeout(() => {
        const jsonOutput = JSON.stringify([
          {
            SourceFile: '/Volumes/videos-current/project/video1_proxy.mp4',
            DateTimeOriginal: '2024:11:20 14:30:45'
          }
        ]);
        mockProcess.stdout.emit('data', Buffer.from(jsonOutput));
        mockProcess.emit('close', 0);
      }, 10);

      const results = await verifyPromise;

      expect(results).toHaveLength(1);
      expect(results[0].proxyPath).toBe('/Volumes/videos-current/project/video1_proxy.mp4');
      expect(results[0].matches).toBe(true);
    });

    it('should match proxy with .m4v extension', async () => {
      const mockProcess = new EventEmitter() as any;
      mockProcess.stdout = new EventEmitter();
      mockProcess.stderr = new EventEmitter();

      vi.mocked(spawn).mockReturnValue(mockProcess);

      const rawDateMap = new Map([
        ['/Volumes/EAV_Video_RAW/project/video1.m4v', '2024:11:20 14:30:45']
      ]);

      const proxyPaths = [
        '/Volumes/videos-current/project/video1_proxy.m4v'
      ];

      const verifyPromise = preserver.verifyBatch(rawDateMap, proxyPaths);

      setTimeout(() => {
        const jsonOutput = JSON.stringify([
          {
            SourceFile: '/Volumes/videos-current/project/video1_proxy.m4v',
            DateTimeOriginal: '2024:11:20 14:30:45'
          }
        ]);
        mockProcess.stdout.emit('data', Buffer.from(jsonOutput));
        mockProcess.emit('close', 0);
      }, 10);

      const results = await verifyPromise;

      expect(results).toHaveLength(1);
      expect(results[0].proxyPath).toBe('/Volumes/videos-current/project/video1_proxy.m4v');
      expect(results[0].matches).toBe(true);
    });

    it('should match proxy with mixed-case .Mov extension', async () => {
      const mockProcess = new EventEmitter() as any;
      mockProcess.stdout = new EventEmitter();
      mockProcess.stderr = new EventEmitter();

      vi.mocked(spawn).mockReturnValue(mockProcess);

      const rawDateMap = new Map([
        ['/Volumes/EAV_Video_RAW/project/video1.Mov', '2024:11:20 14:30:45']
      ]);

      const proxyPaths = [
        '/Volumes/videos-current/project/video1_proxy.Mov'
      ];

      const verifyPromise = preserver.verifyBatch(rawDateMap, proxyPaths);

      setTimeout(() => {
        const jsonOutput = JSON.stringify([
          {
            SourceFile: '/Volumes/videos-current/project/video1_proxy.Mov',
            DateTimeOriginal: '2024:11:20 14:30:45'
          }
        ]);
        mockProcess.stdout.emit('data', Buffer.from(jsonOutput));
        mockProcess.emit('close', 0);
      }, 10);

      const results = await verifyPromise;

      expect(results).toHaveLength(1);
      expect(results[0].proxyPath).toBe('/Volumes/videos-current/project/video1_proxy.Mov');
      expect(results[0].matches).toBe(true);
    });

  });

  describe('Full Workflow Coordinator', () => {
    it('should execute complete preserve-and-verify workflow', async () => {
      // Mock extract (Phase 1)
      const mockExtractProcess = new EventEmitter() as any;
      mockExtractProcess.stdout = new EventEmitter();
      mockExtractProcess.stderr = new EventEmitter();

      // Mock write (Phase 3a)
      const mockWriteProcess = new EventEmitter() as any;
      mockWriteProcess.stdout = new EventEmitter();
      mockWriteProcess.stderr = new EventEmitter();

      // Mock verify (Phase 3b)
      const mockVerifyProcess = new EventEmitter() as any;
      mockVerifyProcess.stdout = new EventEmitter();
      mockVerifyProcess.stderr = new EventEmitter();

      let callCount = 0;
      vi.mocked(spawn).mockImplementation(() => {
        callCount++;
        if (callCount === 1) return mockExtractProcess; // Extract
        if (callCount === 2) return mockWriteProcess;   // Write
        return mockVerifyProcess;                        // Verify
      });

      const rawPaths = ['/Volumes/EAV_Video_RAW/project/video1.MOV'];
      const proxyPaths = ['/Volumes/videos-current/project/video1_proxy.MOV'];

      const workflowPromise = preserver.preserveAndVerify(rawPaths, proxyPaths);

      // Extract phase
      setTimeout(() => {
        const extractJson = JSON.stringify([
          {
            SourceFile: '/Volumes/EAV_Video_RAW/project/video1.MOV',
            DateTimeOriginal: '2024:11:20 14:30:45'
          }
        ]);
        mockExtractProcess.stdout.emit('data', Buffer.from(extractJson));
        mockExtractProcess.emit('close', 0);
      }, 10);

      // Write phase
      setTimeout(() => {
        mockWriteProcess.emit('close', 0);
      }, 50);

      // Verify phase
      setTimeout(() => {
        const verifyJson = JSON.stringify([
          {
            SourceFile: '/Volumes/videos-current/project/video1_proxy.MOV',
            DateTimeOriginal: '2024:11:20 14:30:45'
          }
        ]);
        mockVerifyProcess.stdout.emit('data', Buffer.from(verifyJson));
        mockVerifyProcess.emit('close', 0);
      }, 100);

      const results = await workflowPromise;

      // Should return verification results showing success
      expect(results).toHaveLength(1);
      expect(results[0].matches).toBe(true);
    });

    it('should report I1 violations in full workflow', async () => {
      // Mock extract
      const mockExtractProcess = new EventEmitter() as any;
      mockExtractProcess.stdout = new EventEmitter();
      mockExtractProcess.stderr = new EventEmitter();

      // Mock write
      const mockWriteProcess = new EventEmitter() as any;
      mockWriteProcess.stdout = new EventEmitter();
      mockWriteProcess.stderr = new EventEmitter();

      // Mock verify
      const mockVerifyProcess = new EventEmitter() as any;
      mockVerifyProcess.stdout = new EventEmitter();
      mockVerifyProcess.stderr = new EventEmitter();

      let callCount = 0;
      vi.mocked(spawn).mockImplementation(() => {
        callCount++;
        if (callCount === 1) return mockExtractProcess;
        if (callCount === 2) return mockWriteProcess;
        return mockVerifyProcess;
      });

      const rawPaths = ['/Volumes/EAV_Video_RAW/project/video1.MOV'];
      const proxyPaths = ['/Volumes/videos-current/project/video1_proxy.MOV'];

      const workflowPromise = preserver.preserveAndVerify(rawPaths, proxyPaths);

      // Extract
      setTimeout(() => {
        const extractJson = JSON.stringify([
          {
            SourceFile: '/Volumes/EAV_Video_RAW/project/video1.MOV',
            DateTimeOriginal: '2024:11:20 14:30:45'
          }
        ]);
        mockExtractProcess.stdout.emit('data', Buffer.from(extractJson));
        mockExtractProcess.emit('close', 0);
      }, 10);

      // Write
      setTimeout(() => {
        mockWriteProcess.emit('close', 0);
      }, 50);

      // Verify (mismatch detected)
      setTimeout(() => {
        const verifyJson = JSON.stringify([
          {
            SourceFile: '/Volumes/videos-current/project/video1_proxy.MOV',
            DateTimeOriginal: '2024:11:20 15:00:00' // WRONG
          }
        ]);
        mockVerifyProcess.stdout.emit('data', Buffer.from(verifyJson));
        mockVerifyProcess.emit('close', 0);
      }, 100);

      const results = await workflowPromise;

      // Should report I1 violation
      expect(results).toHaveLength(1);
      expect(results[0].matches).toBe(false);
      expect(results[0].rawDate).toBe('2024:11:20 14:30:45');
      expect(results[0].proxyDate).toBe('2024:11:20 15:00:00');
    });

    it('should handle lowercase .mov files in full workflow', async () => {
      // Mock extract
      const mockExtractProcess = new EventEmitter() as any;
      mockExtractProcess.stdout = new EventEmitter();
      mockExtractProcess.stderr = new EventEmitter();

      // Mock write
      const mockWriteProcess = new EventEmitter() as any;
      mockWriteProcess.stdout = new EventEmitter();
      mockWriteProcess.stderr = new EventEmitter();

      // Mock verify
      const mockVerifyProcess = new EventEmitter() as any;
      mockVerifyProcess.stdout = new EventEmitter();
      mockVerifyProcess.stderr = new EventEmitter();

      let callCount = 0;
      vi.mocked(spawn).mockImplementation(() => {
        callCount++;
        if (callCount === 1) return mockExtractProcess;
        if (callCount === 2) return mockWriteProcess;
        return mockVerifyProcess;
      });

      const rawPaths = ['/Volumes/EAV_Video_RAW/project/video1.mov'];
      const proxyPaths = ['/Volumes/videos-current/project/video1_proxy.mov'];

      const workflowPromise = preserver.preserveAndVerify(rawPaths, proxyPaths);

      // Extract
      setTimeout(() => {
        const extractJson = JSON.stringify([
          {
            SourceFile: '/Volumes/EAV_Video_RAW/project/video1.mov',
            DateTimeOriginal: '2024:11:20 14:30:45'
          }
        ]);
        mockExtractProcess.stdout.emit('data', Buffer.from(extractJson));
        mockExtractProcess.emit('close', 0);
      }, 10);

      // Write
      setTimeout(() => {
        mockWriteProcess.emit('close', 0);
      }, 50);

      // Verify
      setTimeout(() => {
        const verifyJson = JSON.stringify([
          {
            SourceFile: '/Volumes/videos-current/project/video1_proxy.mov',
            DateTimeOriginal: '2024:11:20 14:30:45'
          }
        ]);
        mockVerifyProcess.stdout.emit('data', Buffer.from(verifyJson));
        mockVerifyProcess.emit('close', 0);
      }, 100);

      const results = await workflowPromise;

      // Should successfully match lowercase .mov file
      expect(results).toHaveLength(1);
      expect(results[0].matches).toBe(true);
    });
  });
});
