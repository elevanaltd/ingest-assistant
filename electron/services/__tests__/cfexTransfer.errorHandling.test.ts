/**
 * CFEx Transfer Service - Error Handling Integration Tests
 *
 * Tests error handling and retry strategy integration with cfexTransfer service.
 * Verifies ErrorHandler and RetryStrategy integration for automatic retry.
 *
 * TDD: RED phase - These tests will fail until cfexTransfer integrates error handling
 */

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { transferFileWithRetry, FileTransferTask } from '../cfexTransfer';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('transferFileWithRetry', () => {
  describe('transient error retry', () => {
    test('should retry on ENOENT error (LucidLink cache eviction)', async () => {
      let attempts = 0;
      const mockTask: FileTransferTask = {
        source: '/Volumes/CFEx/DCIM/EA001621.JPG',
        destination: '/LucidLink/EAV014/images/EA001621.JPG',
        size: 1024,
        mediaType: 'photo',
        enqueued: Date.now(),
      };

      // Mock transferFile to fail twice with ENOENT, then succeed
      const mockTransferFile = vi.fn(async () => {
        attempts++;
        if (attempts < 3) {
          const error = Object.assign(new Error('File not found'), { code: 'ENOENT' });
          throw error;
        }
        return {
          success: true,
          bytesTransferred: 1024,
          duration: 100,
          warnings: [],
        };
      });

      const promise = transferFileWithRetry(mockTask, mockTransferFile);
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result.success).toBe(true);
      expect(result.attempts).toBe(3);
      expect(mockTransferFile).toHaveBeenCalledTimes(3);
    });

    test('should give up after max retries for persistent EBUSY', async () => {
      const mockTask: FileTransferTask = {
        source: '/Volumes/CFEx/DCIM/EA001621.JPG',
        destination: '/tmp/local/EA001621.JPG',
        size: 1024,
        mediaType: 'photo',
        enqueued: Date.now(),
      };

      // Mock to always fail with EBUSY
      const mockTransferFile = vi.fn(async () => {
        const error = Object.assign(new Error('File busy'), { code: 'EBUSY' });
        throw error;
      });

      const promise = transferFileWithRetry(mockTask, mockTransferFile);
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('EBUSY');
      expect(result.attempts).toBe(4); // Initial + 3 retries for local path
      expect(mockTransferFile).toHaveBeenCalledTimes(4);
    });

    test('should use extended retries for network paths (Ubuntu NFS)', async () => {
      const mockTask: FileTransferTask = {
        source: '/Volumes/CFEx/DCIM/C0001.MOV',
        destination: '/Ubuntu/EAV014/videos-raw/C0001.MOV',
        size: 1024,
        mediaType: 'video',
        enqueued: Date.now(),
      };

      // Mock to always fail with ESTALE
      const mockTransferFile = vi.fn(async () => {
        const error = Object.assign(new Error('Stale handle'), { code: 'ESTALE' });
        throw error;
      });

      const promise = transferFileWithRetry(mockTask, mockTransferFile);
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result.success).toBe(false);
      expect(result.attempts).toBe(6); // Initial + 5 retries for network path
      expect(mockTransferFile).toHaveBeenCalledTimes(6);
    });
  });

  describe('fatal error handling', () => {
    test('should not retry ENOSPC (disk full) error', async () => {
      const mockTask: FileTransferTask = {
        source: '/Volumes/CFEx/DCIM/EA001621.JPG',
        destination: '/LucidLink/EAV014/images/EA001621.JPG',
        size: 1024,
        mediaType: 'photo',
        enqueued: Date.now(),
      };

      const mockTransferFile = vi.fn(async () => {
        const error = Object.assign(new Error('No space left'), { code: 'ENOSPC' });
        throw error;
      });

      const promise = transferFileWithRetry(mockTask, mockTransferFile);
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('ENOSPC');
      expect(result.attempts).toBe(1); // No retries for fatal errors
      expect(mockTransferFile).toHaveBeenCalledTimes(1);
    });

    test('should not retry EACCES (permission denied) error', async () => {
      const mockTask: FileTransferTask = {
        source: '/Volumes/CFEx/DCIM/EA001621.JPG',
        destination: '/LucidLink/EAV014/images/EA001621.JPG',
        size: 1024,
        mediaType: 'photo',
        enqueued: Date.now(),
      };

      const mockTransferFile = vi.fn(async () => {
        const error = Object.assign(new Error('Permission denied'), { code: 'EACCES' });
        throw error;
      });

      const promise = transferFileWithRetry(mockTask, mockTransferFile);
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('EACCES');
      expect(result.attempts).toBe(1);
      expect(mockTransferFile).toHaveBeenCalledTimes(1);
    });
  });

  describe('network error retry', () => {
    test('should retry ETIMEDOUT with extended attempts', async () => {
      let attempts = 0;
      const mockTask: FileTransferTask = {
        source: '/Volumes/CFEx/PRIVATE/M4ROOT/CLIP/C0001.MOV',
        destination: '/Ubuntu/EAV014/videos-raw/C0001.MOV',
        size: 1024,
        mediaType: 'video',
        enqueued: Date.now(),
      };

      // Fail 4 times with ETIMEDOUT, then succeed
      const mockTransferFile = vi.fn(async () => {
        attempts++;
        if (attempts < 5) {
          const error = Object.assign(new Error('Connection timeout'), { code: 'ETIMEDOUT' });
          throw error;
        }
        return {
          success: true,
          bytesTransferred: 1024,
          duration: 100,
          warnings: [],
        };
      });

      const promise = transferFileWithRetry(mockTask, mockTransferFile);
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result.success).toBe(true);
      expect(result.attempts).toBe(5);
      expect(mockTransferFile).toHaveBeenCalledTimes(5);
    });
  });

  describe('exponential backoff', () => {
    test('should apply exponential backoff delays', async () => {
      const mockTask: FileTransferTask = {
        source: '/Volumes/CFEx/DCIM/EA001621.JPG',
        destination: '/tmp/local/EA001621.JPG',
        size: 1024,
        mediaType: 'photo',
        enqueued: Date.now(),
      };

      const delays: number[] = [];

      // Mock to always fail with EBUSY
      const mockTransferFile = vi.fn(async () => {
        const error = Object.assign(new Error('File busy'), { code: 'EBUSY' });
        throw error;
      });

      const promise = transferFileWithRetry(mockTask, mockTransferFile, {
        onRetry: (attempt, delay) => {
          delays.push(delay);
        },
      });
      await vi.runAllTimersAsync();
      await promise;

      // Expect exponential backoff: 1s, 2s, 4s
      expect(delays).toEqual([1000, 2000, 4000]);
    });

    test('should use 2s base delay for network errors', async () => {
      const mockTask: FileTransferTask = {
        source: '/Volumes/CFEx/PRIVATE/M4ROOT/CLIP/C0001.MOV',
        destination: '/Ubuntu/EAV014/videos-raw/C0001.MOV',
        size: 1024,
        mediaType: 'video',
        enqueued: Date.now(),
      };

      const delays: number[] = [];

      // Mock to always fail with ETIMEDOUT
      const mockTransferFile = vi.fn(async () => {
        const error = Object.assign(new Error('Timeout'), { code: 'ETIMEDOUT' });
        throw error;
      });

      const promise = transferFileWithRetry(mockTask, mockTransferFile, {
        onRetry: (attempt, delay) => {
          delays.push(delay);
        },
      });
      await vi.runAllTimersAsync();
      await promise;

      // Expect 2s base delay for network errors: 2s, 4s, 8s, 16s, 32s
      expect(delays).toEqual([2000, 4000, 8000, 16000, 32000]);
    });
  });

  describe('error classification in results', () => {
    test('should include error classification in result', async () => {
      const mockTask: FileTransferTask = {
        source: '/Volumes/CFEx/DCIM/EA001621.JPG',
        destination: '/LucidLink/EAV014/images/EA001621.JPG',
        size: 1024,
        mediaType: 'photo',
        enqueued: Date.now(),
      };

      const mockTransferFile = vi.fn(async () => {
        const error = Object.assign(new Error('No space left'), { code: 'ENOSPC' });
        throw error;
      });

      const promise = transferFileWithRetry(mockTask, mockTransferFile);
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result.errorClassification).toBeDefined();
      expect(result.errorClassification?.category).toBe('FATAL');
      expect(result.errorClassification?.code).toBe('ENOSPC');
      expect(result.errorClassification?.userMessage).toContain('disk is full');
      expect(result.errorClassification?.recoveryAction).toContain('Free up disk space');
    });
  });

  describe('card removal detection', () => {
    test('should detect CFEx card removal and abort', async () => {
      const mockTask: FileTransferTask = {
        source: '/Volumes/NO NAME/DCIM/EA001621.JPG',
        destination: '/LucidLink/EAV014/images/EA001621.JPG',
        size: 1024,
        mediaType: 'photo',
        enqueued: Date.now(),
      };

      const mockTransferFile = vi.fn(async () => {
        const error = Object.assign(new Error('File not found'), { code: 'ENOENT' });
        throw error;
      });

      const promise = transferFileWithRetry(mockTask, mockTransferFile, {
        cfexCardPath: '/Volumes/NO NAME',
        checkCardRemoval: () => false, // Card mount gone
      });
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result.success).toBe(false);
      expect(result.cardRemoved).toBe(true);
      expect(result.attempts).toBe(1); // No retry on card removal
    });
  });
});
