/**
 * Retry Strategy Tests
 *
 * Tests retry execution with exponential backoff, abort conditions, and error recovery.
 * Integrates with ErrorHandler for error classification.
 *
 * TDD: RED phase - These tests will fail until retryStrategy.ts is implemented
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RetryStrategy, RetryOptions, RetryResult } from '../retryStrategy';

describe('RetryStrategy', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('retry with transient errors', () => {
    it('should retry ENOENT error with exponential backoff', async () => {
      const retryStrategy = new RetryStrategy();
      let attempts = 0;

      const operation = vi.fn(async () => {
        attempts++;
        if (attempts < 3) {
          const error = Object.assign(new Error('File not found'), { code: 'ENOENT' });
          throw error;
        }
        return 'success';
      });

      const options: RetryOptions = {
        destinationPath: '/LucidLink/EAV014/images/',
      };

      // Start retry operation
      const promise = retryStrategy.executeWithRetry(operation, options);

      // Fast-forward through delays
      await vi.runAllTimersAsync();

      const result = await promise;

      expect(result.success).toBe(true);
      expect(result.value).toBe('success');
      expect(result.attempts).toBe(3);
      expect(attempts).toBe(3);
    });

    it('should give up after max retries for transient errors', async () => {
      const retryStrategy = new RetryStrategy();

      const operation = vi.fn(async () => {
        const error = Object.assign(new Error('File busy'), { code: 'EBUSY' });
        throw error;
      });

      const options: RetryOptions = {
        destinationPath: '/tmp/local/', // Local path: 3 max retries
      };

      const promise = retryStrategy.executeWithRetry(operation, options);
      await vi.runAllTimersAsync();

      const result = await promise;

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe('EBUSY');
      expect(result.attempts).toBe(4); // Initial + 3 retries
      expect(operation).toHaveBeenCalledTimes(4);
    });

    it('should use extended retries for network paths', async () => {
      const retryStrategy = new RetryStrategy();

      const operation = vi.fn(async () => {
        const error = Object.assign(new Error('Stale handle'), { code: 'ESTALE' });
        throw error;
      });

      const options: RetryOptions = {
        destinationPath: '/Ubuntu/EAV014/videos-raw/', // Network path: 5 max retries
      };

      const promise = retryStrategy.executeWithRetry(operation, options);
      await vi.runAllTimersAsync();

      const result = await promise;

      expect(result.success).toBe(false);
      expect(result.attempts).toBe(6); // Initial + 5 retries
      expect(operation).toHaveBeenCalledTimes(6);
    });
  });

  describe('retry with fatal errors', () => {
    it('should not retry ENOSPC (disk full) error', async () => {
      const retryStrategy = new RetryStrategy();

      const operation = vi.fn(async () => {
        const error = Object.assign(new Error('No space left'), { code: 'ENOSPC' });
        throw error;
      });

      const options: RetryOptions = {
        destinationPath: '/LucidLink/EAV014/images/',
      };

      const promise = retryStrategy.executeWithRetry(operation, options);
      await vi.runAllTimersAsync();

      const result = await promise;

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('ENOSPC');
      expect(result.attempts).toBe(1); // No retries for fatal errors
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should not retry EACCES (permission denied) error', async () => {
      const retryStrategy = new RetryStrategy();

      const operation = vi.fn(async () => {
        const error = Object.assign(new Error('Permission denied'), { code: 'EACCES' });
        throw error;
      });

      const options: RetryOptions = {
        destinationPath: '/LucidLink/EAV014/images/',
      };

      const promise = retryStrategy.executeWithRetry(operation, options);
      await vi.runAllTimersAsync();

      const result = await promise;

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('EACCES');
      expect(result.attempts).toBe(1);
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should not retry EROFS (read-only filesystem) error', async () => {
      const retryStrategy = new RetryStrategy();

      const operation = vi.fn(async () => {
        const error = Object.assign(new Error('Read-only'), { code: 'EROFS' });
        throw error;
      });

      const options: RetryOptions = {
        destinationPath: '/LucidLink/EAV014/images/',
      };

      const promise = retryStrategy.executeWithRetry(operation, options);
      await vi.runAllTimersAsync();

      const result = await promise;

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('EROFS');
      expect(result.attempts).toBe(1);
      expect(operation).toHaveBeenCalledTimes(1);
    });
  });

  describe('retry with network errors', () => {
    it('should retry ETIMEDOUT with longer delays (2s base)', async () => {
      const retryStrategy = new RetryStrategy();
      const delaysSpy = vi.fn();

      const operation = vi.fn(async () => {
        const error = Object.assign(new Error('Timeout'), { code: 'ETIMEDOUT' });
        throw error;
      });

      const options: RetryOptions = {
        destinationPath: '/LucidLink/EAV014/images/',
        onRetry: (attempt, delay) => {
          delaysSpy(attempt, delay);
        },
      };

      const promise = retryStrategy.executeWithRetry(operation, options);
      await vi.runAllTimersAsync();

      await promise;

      // Network errors use 2s base delay: 2s, 4s, 8s, 16s, 32s
      expect(delaysSpy).toHaveBeenCalledWith(1, 2000);
      expect(delaysSpy).toHaveBeenCalledWith(2, 4000);
      expect(delaysSpy).toHaveBeenCalledWith(3, 8000);
      expect(delaysSpy).toHaveBeenCalledWith(4, 16000);
      expect(delaysSpy).toHaveBeenCalledWith(5, 32000);
    });

    it('should retry ENETUNREACH error', async () => {
      const retryStrategy = new RetryStrategy();
      let attempts = 0;

      const operation = vi.fn(async () => {
        attempts++;
        if (attempts < 3) {
          const error = Object.assign(new Error('Network unreachable'), { code: 'ENETUNREACH' });
          throw error;
        }
        return 'success';
      });

      const options: RetryOptions = {
        destinationPath: '/Ubuntu/EAV014/videos-raw/',
      };

      const promise = retryStrategy.executeWithRetry(operation, options);
      await vi.runAllTimersAsync();

      const result = await promise;

      expect(result.success).toBe(true);
      expect(result.value).toBe('success');
      expect(result.attempts).toBe(3);
    });
  });

  describe('abort conditions', () => {
    it('should abort retry when abort signal triggered', async () => {
      const retryStrategy = new RetryStrategy();
      const abortController = new AbortController();

      const operation = vi.fn(async () => {
        const error = Object.assign(new Error('File busy'), { code: 'EBUSY' });
        throw error;
      });

      const options: RetryOptions = {
        destinationPath: '/LucidLink/EAV014/images/',
        abortSignal: abortController.signal,
      };

      const promise = retryStrategy.executeWithRetry(operation, options);

      // Trigger abort after first failure
      await vi.advanceTimersByTimeAsync(500);
      abortController.abort();
      await vi.runAllTimersAsync();

      const result = await promise;

      expect(result.success).toBe(false);
      expect(result.attempts).toBeLessThan(4); // Aborted before all retries
    });

    it('should abort on card removal error', async () => {
      const retryStrategy = new RetryStrategy();

      const operation = vi.fn(async () => {
        const error = Object.assign(new Error('File not found'), { code: 'ENOENT' });
        throw error;
      });

      const options: RetryOptions = {
        destinationPath: '/LucidLink/EAV014/images/',
        sourcePath: '/Volumes/NO NAME/DCIM/EA001621.JPG',
        cfexCardPath: '/Volumes/NO NAME',
        checkCardRemoval: () => false, // Card mount gone
      };

      const promise = retryStrategy.executeWithRetry(operation, options);
      await vi.runAllTimersAsync();

      const result = await promise;

      expect(result.success).toBe(false);
      expect(result.cardRemoved).toBe(true);
      expect(result.attempts).toBe(1); // No retry on card removal
    });
  });

  describe('progress callbacks', () => {
    it('should invoke onRetry callback with attempt and delay', async () => {
      const retryStrategy = new RetryStrategy();
      const onRetrySpy = vi.fn();

      const operation = vi.fn(async () => {
        const error = Object.assign(new Error('File busy'), { code: 'EBUSY' });
        throw error;
      });

      const options: RetryOptions = {
        destinationPath: '/tmp/local/',
        onRetry: onRetrySpy,
      };

      const promise = retryStrategy.executeWithRetry(operation, options);
      await vi.runAllTimersAsync();

      await promise;

      expect(onRetrySpy).toHaveBeenCalledTimes(3); // 3 retries
      expect(onRetrySpy).toHaveBeenNthCalledWith(1, 1, 1000); // 2^0 * 1000ms = 1s
      expect(onRetrySpy).toHaveBeenNthCalledWith(2, 2, 2000); // 2^1 * 1000ms = 2s
      expect(onRetrySpy).toHaveBeenNthCalledWith(3, 3, 4000); // 2^2 * 1000ms = 4s
    });

    it('should invoke onError callback with error classification', async () => {
      const retryStrategy = new RetryStrategy();
      const onErrorSpy = vi.fn();

      const operation = vi.fn(async () => {
        const error = Object.assign(new Error('Disk full'), { code: 'ENOSPC' });
        throw error;
      });

      const options: RetryOptions = {
        destinationPath: '/LucidLink/EAV014/images/',
        onError: onErrorSpy,
      };

      const promise = retryStrategy.executeWithRetry(operation, options);
      await vi.runAllTimersAsync();

      await promise;

      expect(onErrorSpy).toHaveBeenCalledTimes(1);
      const classification = onErrorSpy.mock.calls[0][0];
      expect(classification.category).toBe('FATAL');
      expect(classification.code).toBe('ENOSPC');
      expect(classification.retriable).toBe(false);
    });
  });

  describe('successful operations', () => {
    it('should return success on first attempt', async () => {
      const retryStrategy = new RetryStrategy();

      const operation = vi.fn(async () => {
        return 'success';
      });

      const options: RetryOptions = {
        destinationPath: '/LucidLink/EAV014/images/',
      };

      const result = await retryStrategy.executeWithRetry(operation, options);

      expect(result.success).toBe(true);
      expect(result.value).toBe('success');
      expect(result.attempts).toBe(1);
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should return success after retry', async () => {
      const retryStrategy = new RetryStrategy();
      let attempts = 0;

      const operation = vi.fn(async () => {
        attempts++;
        if (attempts === 1) {
          const error = Object.assign(new Error('Busy'), { code: 'EBUSY' });
          throw error;
        }
        return 'success after retry';
      });

      const options: RetryOptions = {
        destinationPath: '/LucidLink/EAV014/images/',
      };

      const promise = retryStrategy.executeWithRetry(operation, options);
      await vi.runAllTimersAsync();

      const result = await promise;

      expect(result.success).toBe(true);
      expect(result.value).toBe('success after retry');
      expect(result.attempts).toBe(2);
    });
  });
});
