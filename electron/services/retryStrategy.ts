/**
 * Retry Strategy Service
 *
 * Provides automatic retry with exponential backoff for file transfer operations.
 * Integrates with ErrorHandler for error classification and retry decisions.
 *
 * Design Philosophy (MIP Compliance):
 * - ESSENTIAL: Automatic retry with exponential backoff (1s, 2s, 4s, 8s...)
 * - ESSENTIAL: Fatal error detection (no retry for ENOSPC, EACCES, EROFS)
 * - ESSENTIAL: Abort conditions (card removal, manual abort)
 * - ESSENTIAL: Progress callbacks (onRetry, onError)
 *
 * System Ripples:
 * - Retry delays → Transfer performance and user wait time
 * - Fatal error detection → Transfer halt and user notification
 * - Abort conditions → Cleanup and partial file removal
 *
 * Reference: D3 Blueprint lines 859-1044
 */

import { ErrorHandler, ErrorClassification } from './errorHandler';

/**
 * Retry options for executeWithRetry
 */
export interface RetryOptions {
  destinationPath: string;
  sourcePath?: string;
  cfexCardPath?: string;
  abortSignal?: AbortSignal;
  checkCardRemoval?: () => boolean; // Returns true if card still exists
  onRetry?: (attempt: number, delayMs: number) => void;
  onError?: (classification: ErrorClassification) => void;
}

/**
 * Retry result containing success status, value, error, and metadata
 */
export interface RetryResult<T> {
  success: boolean;
  value?: T;
  error?: Error & { code?: string };
  attempts: number;
  cardRemoved?: boolean;
}

/**
 * Retry Strategy Service
 *
 * Wraps operations with automatic retry logic using ErrorHandler for classification.
 * Supports exponential backoff, abort conditions, and progress callbacks.
 */
export class RetryStrategy {
  private errorHandler: ErrorHandler;

  constructor() {
    this.errorHandler = new ErrorHandler();
  }

  /**
   * Execute operation with automatic retry on transient/network errors
   *
   * Features:
   * - Exponential backoff (1s, 2s, 4s, 8s... for transient, 2s, 4s, 8s... for network)
   * - Path-based max retries (5 for network paths, 3 for local)
   * - Fatal error detection (no retry for ENOSPC, EACCES, EROFS, etc.)
   * - Card removal detection (abort on CFEx card removal)
   * - Manual abort (via AbortSignal)
   * - Progress callbacks (onRetry, onError)
   *
   * @param operation - Async operation to execute with retry
   * @param options - Retry configuration (destinationPath, abort, callbacks)
   * @returns RetryResult with success status, value, error, attempts
   *
   * @example
   * ```typescript
   * const retryStrategy = new RetryStrategy();
   * const result = await retryStrategy.executeWithRetry(
   *   async () => transferFile(task),
   *   {
   *     destinationPath: '/LucidLink/EAV014/images/',
   *     onRetry: (attempt, delay) => console.log(`Retry ${attempt} after ${delay}ms`),
   *     onError: (classification) => console.error(classification.userMessage)
   *   }
   * );
   * ```
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    options: RetryOptions
  ): Promise<RetryResult<T>> {
    const maxRetries = this.errorHandler.getMaxRetries(options.destinationPath);
    let attempts = 0;
    let lastError: (Error & { code?: string }) | undefined;

    while (attempts <= maxRetries) {
      // Check abort signal
      if (options.abortSignal?.aborted) {
        return {
          success: false,
          error: lastError,
          attempts,
        };
      }

      attempts++;

      try {
        const value = await operation();
        return {
          success: true,
          value,
          attempts,
        };
      } catch (error) {
        lastError = error as Error & { code?: string };

        // Classify error
        const classification = this.errorHandler.classify(lastError);

        // Notify error callback
        if (options.onError) {
          options.onError(classification);
        }

        // Check for card removal (ENOENT on source path + card mount gone)
        if (
          options.sourcePath &&
          options.cfexCardPath &&
          options.checkCardRemoval !== undefined
        ) {
          const mountExists = options.checkCardRemoval();
          const isCardRemoval = this.errorHandler.isCardRemovalError(
            lastError,
            options.sourcePath,
            options.cfexCardPath,
            mountExists
          );

          if (isCardRemoval) {
            return {
              success: false,
              error: lastError,
              attempts,
              cardRemoved: true,
            };
          }
        }

        // Fatal errors: No retry
        if (!classification.retriable) {
          return {
            success: false,
            error: lastError,
            attempts,
          };
        }

        // Max retries reached
        if (attempts > maxRetries) {
          return {
            success: false,
            error: lastError,
            attempts,
          };
        }

        // Calculate backoff delay
        const delay = this.errorHandler.getBackoffDelay(lastError, attempts - 1);

        // Notify retry callback
        if (options.onRetry) {
          options.onRetry(attempts, delay);
        }

        // Wait before retry
        await this.sleep(delay);
      }
    }

    // Fallback (should not reach here)
    return {
      success: false,
      error: lastError,
      attempts,
    };
  }

  /**
   * Sleep for specified milliseconds
   *
   * @param ms - Milliseconds to sleep
   * @returns Promise that resolves after delay
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
