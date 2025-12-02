import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BatchProgressDetails } from './BatchProgressDetails';
import type { BatchProgress } from '../../types';

/**
 * TDD RED Phase: BatchProgressDetails component tests
 *
 * Purpose: Extract progress details from BatchOperationsPanel
 * Scope: Lines ~493-567 (expanded progress view)
 *
 * Features:
 * - Progress bar with percentage
 * - Current file information
 * - Queue summary (completed, failed, cancelled counts)
 */

describe('BatchProgressDetails', () => {
  const mockQueueItems = [
    { fileId: 'file1', status: 'completed' as const },
    { fileId: 'file2', status: 'completed' as const },
    { fileId: 'file3', status: 'processing' as const },
    { fileId: 'file4', status: 'pending' as const },
    { fileId: 'file5', status: 'error' as const },
  ];

  it('should render progress bar with percentage', () => {
    render(
      <BatchProgressDetails
        queueItems={mockQueueItems}
        queueStatus="processing"
        currentProgress={{
          fileId: 'file3',
          current: 3,
          total: 5,
        }}
        progressPercentage={40}
      />
    );

    expect(screen.getByText('Progress')).toBeInTheDocument();
    expect(screen.getByText('40%')).toBeInTheDocument();
  });

  it('should render current file information', () => {
    const currentProgress: BatchProgress = {
      fileId: 'test-file.jpg',
      current: 3,
      total: 5,
    };

    render(
      <BatchProgressDetails
        queueItems={mockQueueItems}
        queueStatus="processing"
        currentProgress={currentProgress}
        progressPercentage={40}
      />
    );

    expect(screen.getByText(/Processing: test-file\.jpg/)).toBeInTheDocument();
    expect(screen.getByText(/3 of 5 files/)).toBeInTheDocument();
  });

  it('should display error message when currentProgress has error', () => {
    const currentProgress: BatchProgress = {
      fileId: 'test-file.jpg',
      current: 3,
      total: 5,
      error: 'File not found',
    };

    render(
      <BatchProgressDetails
        queueItems={mockQueueItems}
        queueStatus="processing"
        currentProgress={currentProgress}
        progressPercentage={40}
      />
    );

    expect(screen.getByText(/Error: File not found/)).toBeInTheDocument();
  });

  it('should render queue summary with completed count', () => {
    render(
      <BatchProgressDetails
        queueItems={mockQueueItems}
        queueStatus="processing"
        currentProgress={null}
        progressPercentage={40}
      />
    );

    expect(screen.getByText(/✓ Completed: 2/)).toBeInTheDocument();
  });

  it('should render queue summary with failed count', () => {
    render(
      <BatchProgressDetails
        queueItems={mockQueueItems}
        queueStatus="processing"
        currentProgress={null}
        progressPercentage={40}
      />
    );

    expect(screen.getByText(/✗ Failed: 1/)).toBeInTheDocument();
  });

  it('should render cancelled count when items are cancelled', () => {
    const itemsWithCancelled = [
      { fileId: 'file1', status: 'completed' as const },
      { fileId: 'file2', status: 'cancelled' as const },
      { fileId: 'file3', status: 'cancelled' as const },
    ];

    render(
      <BatchProgressDetails
        queueItems={itemsWithCancelled}
        queueStatus="cancelled"
        currentProgress={null}
        progressPercentage={33}
      />
    );

    expect(screen.getByText(/⊗ Cancelled: 2/)).toBeInTheDocument();
  });

  it('should NOT render cancelled count when no items are cancelled', () => {
    const itemsWithoutCancelled = [
      { fileId: 'file1', status: 'completed' as const },
      { fileId: 'file2', status: 'processing' as const },
    ];

    render(
      <BatchProgressDetails
        queueItems={itemsWithoutCancelled}
        queueStatus="processing"
        currentProgress={null}
        progressPercentage={50}
      />
    );

    expect(screen.queryByText(/⊗ Cancelled:/)).not.toBeInTheDocument();
  });

  it('should NOT render current file section when currentProgress is null', () => {
    render(
      <BatchProgressDetails
        queueItems={mockQueueItems}
        queueStatus="completed"
        currentProgress={null}
        progressPercentage={100}
      />
    );

    expect(screen.queryByText(/Processing:/)).not.toBeInTheDocument();
  });

  it('should apply correct progress bar color based on queue status', () => {
    const { container } = render(
      <BatchProgressDetails
        queueItems={mockQueueItems}
        queueStatus="processing"
        currentProgress={null}
        progressPercentage={40}
      />
    );

    // Find progress bar fill (has width style)
    const progressBar = container.querySelector('[style*="width: 40%"]');
    expect(progressBar).toBeInTheDocument();
    expect(progressBar).toHaveStyle({ backgroundColor: '#2563eb' }); // blue for processing
  });
});
