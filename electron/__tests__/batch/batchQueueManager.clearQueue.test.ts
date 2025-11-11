import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs/promises';
import { BatchQueueManager } from '../../services/batchQueueManager';

/**
 * BatchQueueManager clearQueue() Tests
 *
 * Purpose: Prevent stale queue persistence across folder changes
 *
 * Issue: #24 (99/100 failures due to stale fileIds)
 * Root Cause: Queue persisted from previous folder contains invalid fileIds
 * Symptom: When user opens new folder, batch shows "complete" with 99 failures
 *
 * TDD Evidence: RED phase - This test FAILS before clearQueue() implementation
 */

// Mock fs/promises for persistence testing
vi.mock('fs/promises');

describe('BatchQueueManager - clearQueue()', () => {
  let queueManager: BatchQueueManager;
  const testQueuePath = '/tmp/.test-batch-queue.json';

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock fs operations
    vi.mocked(fs.writeFile).mockResolvedValue(undefined);
    vi.mocked(fs.readFile).mockResolvedValue('{"items":[],"status":"idle","currentFile":null}');
    vi.mocked(fs.access).mockResolvedValue(undefined);

    queueManager = new BatchQueueManager(testQueuePath);
  });

  afterEach(async () => {
    await queueManager.cleanup();
  });

  describe('Stale Queue Prevention', () => {
    it('should clear queue to prevent stale fileIds across folder changes', async () => {
      // ARRANGE: Add files to queue (simulating previous folder)
      const staleFileIds = ['file1.mov', 'file2.mov', 'file3.mov'];
      await queueManager.addToQueue(staleFileIds);

      // Verify queue has items
      let status = queueManager.getStatus();
      expect(status.items).toHaveLength(3);
      expect(status.status).toBe('idle');

      // ACT: Clear queue (simulating folder change)
      // This method does NOT exist yet - test will FAIL (RED phase)
      queueManager.clearQueue();

      // ASSERT: Queue should be empty
      status = queueManager.getStatus();
      expect(status.items).toHaveLength(0);
      expect(status.status).toBe('idle');
      expect(status.currentFile).toBeNull();
    });

    it('should persist cleared state to disk', async () => {
      // ARRANGE: Add files to queue
      await queueManager.addToQueue(['file1.mov', 'file2.mov']);

      // ACT: Clear queue
      queueManager.clearQueue();

      // ASSERT: fs.writeFile should be called with empty queue
      // Get the last call to writeFile
      const writeFileCalls = vi.mocked(fs.writeFile).mock.calls;
      const lastCall = writeFileCalls[writeFileCalls.length - 1];

      expect(lastCall).toBeDefined();
      const writtenData = JSON.parse(lastCall[1] as string);
      expect(writtenData.items).toHaveLength(0);
      expect(writtenData.status).toBe('idle');
      expect(writtenData.currentFile).toBeNull();
    });

    it('should be safe to call clearQueue when queue is already empty', () => {
      // ARRANGE: Queue is empty by default

      // ACT & ASSERT: Should not throw
      expect(() => {
        queueManager.clearQueue();
      }).not.toThrow();

      const status = queueManager.getStatus();
      expect(status.items).toHaveLength(0);
    });

    it('should reset status to idle when clearing a completed queue', async () => {
      // ARRANGE: Simulate completed queue
      await queueManager.addToQueue(['file1.mov']);

      // Mock processor that succeeds (must return result object)
      const mockProcessor = vi.fn().mockResolvedValue({
        success: true,
        result: { mainName: 'test', metadata: {}, confidence: 0.9 },
      });
      const mockProgress = vi.fn();
      const mockComplete = vi.fn();

      // Process the queue
      await queueManager.startProcessing(mockProcessor, mockProgress, mockComplete);

      // Verify queue is completed
      let status = queueManager.getStatus();
      expect(status.status).toBe('completed');

      // ACT: Clear the completed queue
      queueManager.clearQueue();

      // ASSERT: Status should reset to idle
      status = queueManager.getStatus();
      expect(status.status).toBe('idle');
      expect(status.items).toHaveLength(0);
    });

    it('should handle clearing queue with mixed item statuses', async () => {
      // ARRANGE: Add queue and partially process
      await queueManager.addToQueue(['file1.mov', 'file2.mov', 'file3.mov']);

      // Mock processor that fails on second file
      let callCount = 0;
      const mockProcessor = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 2) {
          throw new Error('Processing failed');
        }
        return Promise.resolve({
          success: true,
          result: { mainName: 'test', metadata: {}, confidence: 0.9 },
        });
      });
      const mockProgress = vi.fn();
      const mockComplete = vi.fn();

      // Process queue (will have completed, error, completed)
      await queueManager.startProcessing(mockProcessor, mockProgress, mockComplete);

      // Verify mixed statuses exist
      let status = queueManager.getStatus();
      expect(status.items.some(i => i.status === 'completed')).toBe(true);
      expect(status.items.some(i => i.status === 'error')).toBe(true);

      // ACT: Clear queue
      queueManager.clearQueue();

      // ASSERT: All items should be cleared
      status = queueManager.getStatus();
      expect(status.items).toHaveLength(0);
      expect(status.status).toBe('idle');
    });
  });

  describe('Integration with Folder Changes', () => {
    it('should demonstrate the 99/100 failure scenario without clearQueue', async () => {
      // SCENARIO: Reproduce the bug
      //
      // 1. User processes 100 files in Folder A
      // 2. Queue persisted with fileIds from Folder A
      // 3. App restarts, loads persisted queue
      // 4. User opens Folder B (different fileIds)
      // 5. Batch processing attempts to use Folder A fileIds in Folder B context
      // 6. Result: 99/100 failures because fileIds don't exist

      // ARRANGE: Simulate persisted queue from "Folder A"
      const folderAFileIds = Array.from({ length: 100 }, (_, i) => `folderA-file${i}.mov`);
      vi.mocked(fs.readFile).mockResolvedValueOnce(JSON.stringify({
        items: folderAFileIds.map(fileId => ({
          fileId,
          status: 'pending',
        })),
        status: 'idle',
        currentFile: null,
      }));

      // ACT: Create new queue manager (simulates app restart)
      const restoredQueue = new BatchQueueManager(testQueuePath);

      // Wait for loadState to complete
      await new Promise(resolve => setTimeout(resolve, 10));

      // ASSERT: Queue restored with Folder A fileIds
      const status = restoredQueue.getStatus();
      expect(status.items).toHaveLength(100);
      expect(status.items[0].fileId).toBe('folderA-file0.mov');

      // PROBLEM: If user now opens "Folder B" and starts processing,
      // these fileIds won't exist in Folder B's metadata store
      // Result: 99/100 failures (the bug we're fixing)

      // SOLUTION: clearQueue() should be called when folder changes
      // This test documents the problem; next tests verify the solution

      await restoredQueue.cleanup();
    });
  });
});
