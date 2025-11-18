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
      onTranscodeProgress: vi.fn().mockReturnValue(() => {}),
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

    expect(screen.getByRole('button', { name: /^process.*file/i })).toBeInTheDocument();
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

    const processButton = screen.getByRole('button', { name: /no files to process/i });
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

  it('should show reprocess button when files have been processed', () => {
    render(
      <BatchOperationsPanel
        availableFiles={[
          { id: '1', filename: 'test1.jpg', processedByAI: true },
          { id: '2', filename: 'test2.jpg', processedByAI: false },
        ]}
        onBatchComplete={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: /reprocess all/i })).toBeInTheDocument();
  });

  it('should show total file count for reprocess button', () => {
    render(
      <BatchOperationsPanel
        availableFiles={[
          { id: '1', filename: 'test1.jpg', processedByAI: true },
          { id: '2', filename: 'test2.jpg', processedByAI: true },
          { id: '3', filename: 'test3.jpg', processedByAI: false },
        ]}
        onBatchComplete={vi.fn()}
      />
    );

    // Should show reprocess for all 3 files
    expect(screen.getByRole('button', { name: /reprocess.*3.*file/i })).toBeInTheDocument();
  });

  // Phase 3: Multi-select batch processing tests (TDD - RED phase)
  describe('Process Selected Files', () => {
    it('should show "Process Selected" button when files are selected', () => {
      // Arrange: Create selected file IDs
      const selectedIds = new Set(['1', '2']);

      // Act: Render with selectedFileIds prop
      render(
        <BatchOperationsPanel
          availableFiles={[
            { id: '1', filename: 'test1.jpg', processedByAI: false },
            { id: '2', filename: 'test2.jpg', processedByAI: false },
            { id: '3', filename: 'test3.jpg', processedByAI: false },
          ]}
          selectedFileIds={selectedIds}
          onBatchComplete={vi.fn()}
        />
      );

      // Assert: Button with selected count should appear
      expect(screen.getByRole('button', { name: /process selected.*2.*file/i })).toBeInTheDocument();
    });

    it('should hide "Process Selected" button when no files are selected', () => {
      // Arrange: Empty selection
      const selectedIds = new Set<string>();

      // Act
      render(
        <BatchOperationsPanel
          availableFiles={[
            { id: '1', filename: 'test1.jpg', processedByAI: false },
          ]}
          selectedFileIds={selectedIds}
          onBatchComplete={vi.fn()}
        />
      );

      // Assert: No "Process Selected" button should appear
      expect(screen.queryByRole('button', { name: /process selected/i })).not.toBeInTheDocument();
    });

    it('should call batchStart with selected file IDs when clicked', async () => {
      // Arrange
      const selectedIds = new Set(['1', '3']);
      const mockBatchStart = vi.fn().mockResolvedValue(undefined);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).electronAPI = {
        ...((window as any).electronAPI),
        batchStart: mockBatchStart,
      };

      render(
        <BatchOperationsPanel
          availableFiles={[
            { id: '1', filename: 'test1.jpg', processedByAI: false },
            { id: '2', filename: 'test2.jpg', processedByAI: false },
            { id: '3', filename: 'test3.jpg', processedByAI: false },
          ]}
          selectedFileIds={selectedIds}
          onBatchComplete={vi.fn()}
        />
      );

      // Act: Click the "Process Selected" button
      const button = screen.getByRole('button', { name: /process selected.*2.*file/i });
      button.click();

      // Assert: Should call batchStart with array of selected IDs
      expect(mockBatchStart).toHaveBeenCalledWith(['1', '3']);
    });

    it('should prioritize "Process Selected" button over regular batch button', () => {
      // When files are selected, "Process Selected" should appear instead of regular "Process X Files"
      const selectedIds = new Set(['1']);

      render(
        <BatchOperationsPanel
          availableFiles={[
            { id: '1', filename: 'test1.jpg', processedByAI: false },
            { id: '2', filename: 'test2.jpg', processedByAI: false },
          ]}
          selectedFileIds={selectedIds}
          onBatchComplete={vi.fn()}
        />
      );

      // Assert: "Process Selected" should appear
      expect(screen.getByRole('button', { name: /process selected.*1.*file/i })).toBeInTheDocument();

      // Assert: Regular batch button should not appear (replaced by Process Selected)
      expect(screen.queryByRole('button', { name: /^process 2 files$/i })).not.toBeInTheDocument();
    });
  });
});
