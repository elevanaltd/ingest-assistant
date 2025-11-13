import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs/promises';
import { BatchQueueManager } from '../../services/batchQueueManager';

/**
 * Batch Queue Manager Tests (Issue #24)
 *
 * Requirements:
 * 1. Queue management with FIFO processing
 * 2. Progress tracking (current/total)
 * 3. Cancellation support (graceful shutdown)
 * 4. Queue persistence across restarts
 * 5. Rate limit compliance
 * 6. Concurrent batch prevention (one at a time)
 *
 * TDD Evidence: RED phase - These tests FAIL before implementation
 */

// Mock fs/promises for persistence testing
vi.mock('fs/promises');

describe('BatchQueueManager', () => {
  let queueManager: BatchQueueManager;
  let mockProgressCallback: ReturnType<typeof vi.fn>;
  let mockCompleteCallback: ReturnType<typeof vi.fn>;
  const testQueuePath = '/tmp/.test-batch-queue.json';

  beforeEach(() => {
    vi.clearAllMocks();
    mockProgressCallback = vi.fn();
    mockCompleteCallback = vi.fn();

    // Mock fs operations
    vi.mocked(fs.writeFile).mockResolvedValue(undefined);
    vi.mocked(fs.readFile).mockResolvedValue('{"items":[],"status":"idle"}');
    vi.mocked(fs.access).mockResolvedValue(undefined);

    queueManager = new BatchQueueManager(testQueuePath);
  });

  afterEach(async () => {
    await queueManager.cleanup();
  });

  describe('Queue Management', () => {
    it('should initialize with empty queue', () => {
      const status = queueManager.getStatus();
      expect(status.items).toHaveLength(0);
      expect(status.currentFile).toBeNull();
      expect(status.status).toBe('idle');
    });

    it('should add files to queue and assign queue ID', async () => {
      const fileIds = ['file1', 'file2', 'file3'];
      const queueId = await queueManager.addToQueue(fileIds);

      expect(queueId).toBeTruthy();
      expect(typeof queueId).toBe('string');

      const status = queueManager.getStatus();
      expect(status.items).toHaveLength(3);
      expect(status.items[0].fileId).toBe('file1');
      expect(status.items[0].status).toBe('pending');
    });

    it('should process queue in FIFO order', async () => {
      const fileIds = ['file1', 'file2', 'file3'];
      const processedOrder: string[] = [];

      const mockProcessor = vi.fn(async (fileId: string) => {
        processedOrder.push(fileId);
        return { success: true, result: { mainName: fileId, keywords: [], confidence: 0.9, location: '', subject: '', action: '', shotType: '' as const } };
      });

      await queueManager.addToQueue(fileIds);
      await queueManager.startProcessing(mockProcessor, mockProgressCallback, mockCompleteCallback);

      expect(processedOrder).toEqual(['file1', 'file2', 'file3']);
      expect(mockProcessor).toHaveBeenCalledTimes(3);
    });

    it('should reject adding to queue when another batch is active', async () => {
      const fileIds1 = ['file1', 'file2'];
      const fileIds2 = ['file3', 'file4'];

      // Start first batch (long running)
      const mockProcessor = vi.fn(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return { success: true, result: { mainName: 'test', keywords: [], confidence: 0.9, location: '', subject: '', action: '', shotType: '' as const } };
      });

      await queueManager.addToQueue(fileIds1);
      const processingPromise = queueManager.startProcessing(mockProcessor, mockProgressCallback, mockCompleteCallback);

      // Try to add second batch while first is running
      await expect(queueManager.addToQueue(fileIds2)).rejects.toThrow('Batch already in progress');

      await processingPromise;
    });
  });

  describe('Progress Tracking', () => {
    it('should emit progress events with current/total counts', async () => {
      const fileIds = ['file1', 'file2', 'file3'];
      const progressEvents: Array<{ current: number; total: number; fileId: string }> = [];

      const progressCallback = vi.fn((progress) => {
        progressEvents.push(progress);
      });

      const mockProcessor = vi.fn(async (fileId: string) => {
        return { success: true, result: { mainName: fileId, keywords: [], confidence: 0.9, location: '', subject: '', action: '', shotType: '' as const } };
      });

      await queueManager.addToQueue(fileIds);
      await queueManager.startProcessing(mockProcessor, progressCallback, mockCompleteCallback);

      expect(progressEvents).toHaveLength(3);
      expect(progressEvents[0]).toEqual({ current: 1, total: 3, fileId: 'file1', status: 'processing' });
      expect(progressEvents[1]).toEqual({ current: 2, total: 3, fileId: 'file2', status: 'processing' });
      expect(progressEvents[2]).toEqual({ current: 3, total: 3, fileId: 'file3', status: 'processing' });
    });

    it('should include error information in progress events for failed files', async () => {
      const fileIds = ['file1', 'file2'];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const progressEvents: any[] = [];

      const progressCallback = vi.fn((progress) => {
        progressEvents.push(progress);
      });

      const mockProcessor = vi.fn(async (fileId: string) => {
        if (fileId === 'file2') {
          throw new Error('Processing failed');
        }
        return { success: true, result: { mainName: fileId, keywords: [], confidence: 0.9, location: '', subject: '', action: '', shotType: '' as const } };
      });

      await queueManager.addToQueue(fileIds);
      await queueManager.startProcessing(mockProcessor, progressCallback, mockCompleteCallback);

      // Implementation emits progress event before processing, then error event on failure
      expect(progressEvents).toHaveLength(3);
      expect(progressEvents[0].status).toBe('processing'); // file1
      expect(progressEvents[1].status).toBe('processing'); // file2 before error
      expect(progressEvents[2].status).toBe('error'); // file2 after error
      expect(progressEvents[2].error).toBe('Processing failed');
    });
  });

  describe('Cancellation Support', () => {
    it('should allow cancellation of in-progress batch', async () => {
      const fileIds = ['file1', 'file2', 'file3'];
      let processedCount = 0;

      const mockProcessor = vi.fn(async (fileId: string) => {
        processedCount++;
        if (processedCount === 2) {
          // Cancel after processing 2 files
          queueManager.cancel();
        }
        await new Promise(resolve => setTimeout(resolve, 10));
        return { success: true, result: { mainName: fileId, keywords: [], confidence: 0.9, location: '', subject: '', action: '', shotType: '' as const } };
      });

      await queueManager.addToQueue(fileIds);
      await queueManager.startProcessing(mockProcessor, mockProgressCallback, mockCompleteCallback);

      // Should process file1 and file2, but not file3
      expect(mockProcessor).toHaveBeenCalledTimes(2);

      const status = queueManager.getStatus();
      expect(status.status).toBe('cancelled');
    });

    it('should mark remaining files as cancelled in queue status', async () => {
      const fileIds = ['file1', 'file2', 'file3'];

      const mockProcessor = vi.fn(async (fileId: string) => {
        if (fileId === 'file1') {
          queueManager.cancel();
        }
        return { success: true, result: { mainName: fileId, keywords: [], confidence: 0.9, location: '', subject: '', action: '', shotType: '' as const } };
      });

      await queueManager.addToQueue(fileIds);
      await queueManager.startProcessing(mockProcessor, mockProgressCallback, mockCompleteCallback);

      const status = queueManager.getStatus();
      expect(status.items[0].status).toBe('completed');
      expect(status.items[1].status).toBe('cancelled');
      expect(status.items[2].status).toBe('cancelled');
    });

    it('should emit completion callback with cancelled status', async () => {
      const fileIds = ['file1', 'file2'];

      const mockProcessor = vi.fn(async (fileId: string) => {
        if (fileId === 'file1') {
          queueManager.cancel();
        }
        return { success: true, result: { mainName: fileId, keywords: [], confidence: 0.9, location: '', subject: '', action: '', shotType: '' as const } };
      });

      await queueManager.addToQueue(fileIds);
      await queueManager.startProcessing(mockProcessor, mockProgressCallback, mockCompleteCallback);

      expect(mockCompleteCallback).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'cancelled', completed: 1, cancelled: 1, failed: 0 })
      );
    });
  });

  describe('Queue Persistence', () => {
    it('should persist queue state to disk after each file', async () => {
      const fileIds = ['file1', 'file2'];

      const mockProcessor = vi.fn(async (fileId: string) => {
        return { success: true, result: { mainName: fileId, keywords: [], confidence: 0.9, location: '', subject: '', action: '', shotType: '' as const } };
      });

      await queueManager.addToQueue(fileIds);
      await queueManager.startProcessing(mockProcessor, mockProgressCallback, mockCompleteCallback);

      // Should write: after addToQueue, after file1, after file2, and on completion
      expect(fs.writeFile).toHaveBeenCalledTimes(4);
      expect(fs.writeFile).toHaveBeenCalledWith(
        testQueuePath,
        expect.stringContaining('"fileId": "file1"'),
        'utf-8'
      );
    });

    it('should restore queue state from disk on initialization', async () => {
      const persistedState = {
        items: [
          { fileId: 'file1', status: 'completed', result: { mainName: 'test1', keywords: [], confidence: 0.9, location: '', subject: '', action: '', shotType: '' as const } },
          { fileId: 'file2', status: 'pending', result: null },
        ],
        status: 'idle',
        currentFile: null,
      };

      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(persistedState));
      vi.mocked(fs.access).mockResolvedValue(undefined);

      const restoredManager = new BatchQueueManager(testQueuePath);

      // Wait for async loadState to complete (constructor calls it without await)
      await new Promise(resolve => setImmediate(resolve));

      const status = restoredManager.getStatus();

      expect(status.items).toHaveLength(2);
      expect(status.items[0].status).toBe('completed');
      expect(status.items[1].status).toBe('pending');
    });

    it('should handle missing persistence file gracefully', async () => {
      vi.mocked(fs.access).mockRejectedValue(new Error('ENOENT'));

      const newManager = new BatchQueueManager('/tmp/.nonexistent-queue.json');
      const status = newManager.getStatus();

      expect(status.items).toHaveLength(0);
      expect(status.status).toBe('idle');
    });
  });

  describe('Error Handling', () => {
    it('should continue processing remaining files after individual file failure', async () => {
      const fileIds = ['file1', 'file2', 'file3'];
      const processedFiles: string[] = [];

      const mockProcessor = vi.fn(async (fileId: string) => {
        processedFiles.push(fileId);
        if (fileId === 'file2') {
          throw new Error('File2 processing failed');
        }
        return { success: true, result: { mainName: fileId, keywords: [], confidence: 0.9, location: '', subject: '', action: '', shotType: '' as const } };
      });

      await queueManager.addToQueue(fileIds);
      await queueManager.startProcessing(mockProcessor, mockProgressCallback, mockCompleteCallback);

      expect(processedFiles).toEqual(['file1', 'file2', 'file3']);
      expect(mockProcessor).toHaveBeenCalledTimes(3);

      const status = queueManager.getStatus();
      expect(status.items[0].status).toBe('completed');
      expect(status.items[1].status).toBe('error');
      expect(status.items[2].status).toBe('completed');
    });

    it('should include error message in queue item for failed files', async () => {
      const fileIds = ['file1'];

      const mockProcessor = vi.fn(async () => {
        throw new Error('Security validation failed');
      });

      await queueManager.addToQueue(fileIds);
      await queueManager.startProcessing(mockProcessor, mockProgressCallback, mockCompleteCallback);

      const status = queueManager.getStatus();
      expect(status.items[0].status).toBe('error');
      expect(status.items[0].error).toBe('Security validation failed');
    });
  });

  describe('Rate Limiting Integration', () => {
    it('should respect rate limiter delays between files', async () => {
      const fileIds = ['file1', 'file2'];
      const processingTimestamps: number[] = [];

      const mockProcessor = vi.fn(async (fileId: string) => {
        processingTimestamps.push(Date.now());
        return { success: true, result: { mainName: fileId, keywords: [], confidence: 0.9, location: '', subject: '', action: '', shotType: '' as const } };
      });

      const mockRateLimiter = {
        consume: vi.fn(async () => {
          await new Promise(resolve => setTimeout(resolve, 50)); // 50ms delay
        }),
      };

      await queueManager.addToQueue(fileIds);
      await queueManager.startProcessing(mockProcessor, mockProgressCallback, mockCompleteCallback, mockRateLimiter);

      expect(mockRateLimiter.consume).toHaveBeenCalledTimes(2);
      // Second file should be processed at least 50ms after first
      expect(processingTimestamps[1] - processingTimestamps[0]).toBeGreaterThanOrEqual(45);
    });
  });
});
