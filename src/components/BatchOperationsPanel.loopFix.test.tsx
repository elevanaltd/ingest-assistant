import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';
import { BatchOperationsPanel } from './BatchOperationsPanel';
import type { BatchQueueState } from '../types';

// Mock electron API
const mockElectronAPI = {
  batchStart: vi.fn(async () => 'mock-queue-id'),
  batchCancel: vi.fn(async () => ({ success: true })),
  batchGetStatus: vi.fn(),
  onBatchProgress: vi.fn(() => () => {}),
  onTranscodeProgress: vi.fn(() => () => {}),
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();

  Object.defineProperty(window, 'electronAPI', {
    value: mockElectronAPI,
    writable: true,
    configurable: true,
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('BatchOperationsPanel - Loop Fix', () => {
  it('should call onBatchComplete only ONCE when status changes to completed (not on every poll)', async () => {
    // Arrange: Mock batch status progression
    const mockCompletedStatus: BatchQueueState = {
      items: [
        { fileId: 'file1', status: 'completed' },
        { fileId: 'file2', status: 'completed' },
      ],
      status: 'completed',
      currentFile: null,
    };

    // Start with processing, then switch to completed
    mockElectronAPI.batchGetStatus
      .mockResolvedValueOnce({ items: [], status: 'processing', currentFile: null })
      .mockResolvedValue(mockCompletedStatus); // All subsequent calls return 'completed'

    const onBatchComplete = vi.fn();

    // Act: Render component
    render(
      <BatchOperationsPanel
        availableFiles={[
          { id: 'file1', filename: 'test1.jpg', processedByAI: false },
          { id: 'file2', filename: 'test2.jpg', processedByAI: false },
        ]}
        onBatchComplete={onBatchComplete}
      />
    );

    // Wait for first poll + processing status (no call)
    await act(async () => {
      vi.advanceTimersByTime(2000);
      await Promise.resolve(); // Let pending promises resolve
    });

    // Wait for second poll + completed status (should call once)
    await act(async () => {
      vi.advanceTimersByTime(2000);
      await Promise.resolve();
    });

    // Wait for third poll + still completed (should NOT call again)
    await act(async () => {
      vi.advanceTimersByTime(2000);
      await Promise.resolve();
    });

    // Wait for fourth poll + still completed (should NOT call again)
    await act(async () => {
      vi.advanceTimersByTime(2000);
      await Promise.resolve();
    });

    // Assert: onBatchComplete called EXACTLY ONCE despite multiple polls with 'completed' status
    // This will FAIL until we implement the fix
    expect(onBatchComplete).toHaveBeenCalledTimes(1);
  });

  it('should call onBatchComplete again if batch is restarted after completion', async () => {
    // Arrange: Mock status progression: processing → completed → processing → completed
    const mockProcessingStatus: BatchQueueState = {
      items: [{ fileId: 'file1', status: 'processing' }],
      status: 'processing',
      currentFile: 'file1',
    };

    const mockCompletedStatus: BatchQueueState = {
      items: [{ fileId: 'file1', status: 'completed' }],
      status: 'completed',
      currentFile: null,
    };

    mockElectronAPI.batchGetStatus
      .mockResolvedValueOnce(mockProcessingStatus)    // Poll 1: processing
      .mockResolvedValueOnce(mockCompletedStatus)     // Poll 2: completed
      .mockResolvedValueOnce(mockCompletedStatus)     // Poll 3: completed (no call)
      .mockResolvedValueOnce(mockProcessingStatus)    // Poll 4: processing again (new batch)
      .mockResolvedValue(mockCompletedStatus);        // Poll 5+: completed again

    const onBatchComplete = vi.fn();

    render(
      <BatchOperationsPanel
        availableFiles={[{ id: 'file1', filename: 'test1.jpg', processedByAI: false }]}
        onBatchComplete={onBatchComplete}
      />
    );

    // Poll 1: processing (no call)
    await act(async () => {
      vi.advanceTimersByTime(2000);
      await Promise.resolve();
    });

    // Poll 2: completed (first call)
    await act(async () => {
      vi.advanceTimersByTime(2000);
      await Promise.resolve();
    });

    // Poll 3: still completed (no additional call)
    await act(async () => {
      vi.advanceTimersByTime(2000);
      await Promise.resolve();
    });

    // Poll 4: processing (new batch started, no call yet)
    await act(async () => {
      vi.advanceTimersByTime(2000);
      await Promise.resolve();
    });

    // Poll 5: completed again (second call)
    await act(async () => {
      vi.advanceTimersByTime(2000);
      await Promise.resolve();
    });

    // Assert: Called twice (once per batch completion)
    expect(onBatchComplete).toHaveBeenCalledTimes(2);
  });
});
