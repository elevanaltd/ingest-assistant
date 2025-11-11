import * as fs from 'fs/promises';
import { randomUUID } from 'crypto';
import type { BatchQueueState, BatchQueueItem, BatchProgress, BatchCompleteSummary, AIAnalysisResult } from '../../src/types';

/**
 * Batch Queue Manager (Issue #24)
 *
 * Manages batch processing queue with:
 * - FIFO queue processing
 * - Progress tracking and event emission
 * - Cancellation support (graceful shutdown)
 * - Queue persistence across restarts
 * - Rate limit integration
 *
 * System Integration:
 * - Coordinates with AIService for file processing
 * - Emits progress events to main process for renderer
 * - Persists state to JSON file (survives app restarts)
 */

export type ProcessorFunction = (fileId: string) => Promise<{ success: boolean; result?: AIAnalysisResult }>;
export type ProgressCallback = (progress: BatchProgress) => void;
export type CompleteCallback = (summary: BatchCompleteSummary) => void;

interface RateLimiter {
  consume: (tokens: number) => Promise<void>;
}

export class BatchQueueManager {
  private state: BatchQueueState;
  private queuePath: string;
  private isCancelled: boolean = false;
  private isProcessing: boolean = false;

  constructor(queuePath: string) {
    this.queuePath = queuePath;
    this.state = {
      items: [],
      status: 'idle',
      currentFile: null,
    };

    // Load persisted state if exists
    this.loadState().catch(error => {
      console.log('[BatchQueueManager] No persisted state found, starting fresh:', error.message);
    });
  }

  /**
   * Add files to queue and return queue ID
   * Rejects if another batch is already in progress
   */
  async addToQueue(fileIds: string[]): Promise<string> {
    if (this.isProcessing) {
      throw new Error('Batch already in progress. Please wait for current batch to complete or cancel it.');
    }

    const queueId = randomUUID();
    const items: BatchQueueItem[] = fileIds.map(fileId => ({
      fileId,
      status: 'pending',
    }));

    this.state = {
      items,
      status: 'idle',
      currentFile: null,
    };

    this.isCancelled = false;

    // Persist queue state
    await this.saveState();

    return queueId;
  }

  /**
   * Start processing the queue
   * Emits progress events and handles errors gracefully
   */
  async startProcessing(
    processor: ProcessorFunction,
    progressCallback: ProgressCallback,
    completeCallback: CompleteCallback,
    rateLimiter?: RateLimiter
  ): Promise<void> {
    if (this.isProcessing) {
      throw new Error('Batch already in progress');
    }

    this.isProcessing = true;
    this.state.status = 'processing';

    const total = this.state.items.length;
    let current = 0;
    let completed = 0;
    let failed = 0;
    let cancelled = 0;

    try {
      for (const item of this.state.items) {
        // Check for cancellation before processing each file
        if (this.isCancelled) {
          // Mark remaining files as cancelled
          item.status = 'cancelled';
          cancelled++;
          continue;
        }

        current++;
        item.status = 'processing';
        this.state.currentFile = item.fileId;

        // Emit progress event
        progressCallback({
          current,
          total,
          fileId: item.fileId,
          status: 'processing',
        });

        try {
          // Apply rate limiting if provided
          if (rateLimiter) {
            await rateLimiter.consume(1);
          }

          // Process file
          const result = await processor(item.fileId);

          if (result.success && result.result) {
            item.status = 'completed';
            item.result = result.result;
            completed++;
          } else {
            item.status = 'error';
            item.error = 'Processing failed';
            failed++;
          }
        } catch (error) {
          // Individual file failure - continue with remaining files
          item.status = 'error';
          item.error = error instanceof Error ? error.message : 'Unknown error';
          failed++;

          // Emit error progress event
          progressCallback({
            current,
            total,
            fileId: item.fileId,
            status: 'error',
            error: item.error,
          });
        }

        // Persist queue state after each file
        await this.saveState();
      }

      // Determine final status
      if (this.isCancelled) {
        this.state.status = 'cancelled';
      } else if (failed > 0 && completed === 0) {
        this.state.status = 'error';
      } else {
        this.state.status = 'completed';
      }

      this.state.currentFile = null;

      // Emit completion callback
      completeCallback({
        status: this.state.status,
        completed,
        failed,
        cancelled,
      });

      // Final persistence
      await this.saveState();
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Cancel the current batch processing
   * Graceful shutdown: finishes current file, then stops
   */
  cancel(): { success: boolean } {
    if (!this.isProcessing) {
      return { success: false };
    }

    this.isCancelled = true;
    this.state.status = 'cancelled';

    return { success: true };
  }

  /**
   * Get current queue status
   */
  getStatus(): BatchQueueState {
    return {
      items: [...this.state.items],
      status: this.state.status,
      currentFile: this.state.currentFile,
    };
  }

  /**
   * Persist queue state to disk
   * Allows queue to survive app restarts
   */
  private async saveState(): Promise<void> {
    try {
      const json = JSON.stringify(this.state, null, 2);
      await fs.writeFile(this.queuePath, json, 'utf-8');
    } catch (error) {
      console.error('[BatchQueueManager] Failed to save state:', error);
      // Non-blocking - continue processing even if persistence fails
    }
  }

  /**
   * Load queue state from disk
   * Restores queue after app restart
   */
  private async loadState(): Promise<void> {
    await fs.access(this.queuePath);
    const json = await fs.readFile(this.queuePath, 'utf-8');
    const persisted = JSON.parse(json) as BatchQueueState;

    // Restore state but reset processing flags
    this.state = {
      ...persisted,
      status: persisted.status === 'processing' ? 'idle' : persisted.status,
      currentFile: null,
    };

    console.log(`[BatchQueueManager] Restored ${this.state.items.length} items from disk`);
  }

  /**
   * Clear the queue
   * Used when folder changes to prevent stale fileIds from previous folder
   * Issue #24: Prevents 99/100 failures when user opens new folder after app restart
   */
  clearQueue(): void {
    const itemCount = this.state.items.length;
    console.log(`[BatchQueueManager] Clearing queue (had ${itemCount} items)`);

    this.state = {
      items: [],
      status: 'idle',
      currentFile: null,
    };
    this.isCancelled = false;

    // Persist cleared state immediately
    this.saveState().catch(error => {
      console.error('[BatchQueueManager] Failed to persist cleared state:', error);
    });
  }

  /**
   * Cleanup resources
   * Called on app shutdown
   */
  async cleanup(): Promise<void> {
    if (this.isProcessing) {
      this.cancel();
    }
    await this.saveState();
  }
}
