import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BatchOperationsPanel } from './BatchOperationsPanel';

/**
 * Test suite for BatchOperationsPanel component
 * Tests layout, button visibility, and user interactions
 */
describe('BatchOperationsPanel', () => {
  beforeEach(() => {
    // Mock window.electronAPI for batch operations
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).electronAPI = {
      batchGetStatus: vi.fn().mockResolvedValue({
        queueId: null,
        status: 'idle',
        items: [],
      }),
      onBatchProgress: vi.fn().mockReturnValue(() => {}),
    };
  });

  it('should render batch operations header', () => {
    render(
      <BatchOperationsPanel
        availableFiles={[]}
        onBatchComplete={vi.fn()}
      />
    );

    expect(screen.getByText('Batch Operations')).toBeInTheDocument();
  });

  it('should show file count when files are available', () => {
    render(
      <BatchOperationsPanel
        availableFiles={[
          { id: '1', filename: 'test1.jpg', processedByAI: false },
          { id: '2', filename: 'test2.jpg', processedByAI: false },
        ]}
        onBatchComplete={vi.fn()}
      />
    );

    // Should show count of unprocessed files
    expect(screen.getByText(/2.*ready/i)).toBeInTheDocument();
  });

  it('should show process button when files are available', () => {
    render(
      <BatchOperationsPanel
        availableFiles={[
          { id: '1', filename: 'test1.jpg', processedByAI: false },
        ]}
        onBatchComplete={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: /process/i })).toBeInTheDocument();
  });

  it('should disable process button when no unprocessed files', () => {
    render(
      <BatchOperationsPanel
        availableFiles={[
          { id: '1', filename: 'test1.jpg', processedByAI: true },
        ]}
        onBatchComplete={vi.fn()}
      />
    );

    const processButton = screen.getByRole('button', { name: /process/i });
    expect(processButton).toBeDisabled();
  });

  it('should have expand/collapse functionality', () => {
    render(
      <BatchOperationsPanel
        availableFiles={[]}
        onBatchComplete={vi.fn()}
      />
    );

    const collapseButton = screen.getByTitle(/expand|collapse/i);
    expect(collapseButton).toBeInTheDocument();
  });
});
