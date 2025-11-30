import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BatchQueueProvider, useBatchQueue } from './BatchQueueContext';

// Test component that consumes the context
function TestConsumer() {
  const context = useBatchQueue();

  return (
    <div>
      <div data-testid="queue-status">{context.state.status}</div>
      <div data-testid="queue-items">{context.state.items.length}</div>
    </div>
  );
}

describe('BatchQueueContext', () => {
  let mockElectronAPI: any;

  beforeEach(() => {
    // Mock electronAPI
    mockElectronAPI = {
      batchGetStatus: vi.fn().mockResolvedValue({
        items: [],
        status: 'idle'
      }),
      batchStart: vi.fn().mockResolvedValue('queue-123'),
      batchCancel: vi.fn().mockResolvedValue({ success: true }),
      onBatchProgress: vi.fn().mockReturnValue(() => {}),
    };

    (window as any).electronAPI = mockElectronAPI;
  });

  afterEach(() => {
    delete (window as any).electronAPI;
    vi.clearAllMocks();
  });

  describe('Provider', () => {
    it('renders children without electronAPI', () => {
      delete (window as any).electronAPI;

      render(
        <BatchQueueProvider>
          <div data-testid="child">Test Child</div>
        </BatchQueueProvider>
      );

      expect(screen.getByTestId('child')).toBeInTheDocument();
    });

    it('renders children with electronAPI', () => {
      render(
        <BatchQueueProvider>
          <div data-testid="child">Test Child</div>
        </BatchQueueProvider>
      );

      expect(screen.getByTestId('child')).toBeInTheDocument();
    });

    it('provides default state when no electronAPI', () => {
      delete (window as any).electronAPI;

      render(
        <BatchQueueProvider>
          <TestConsumer />
        </BatchQueueProvider>
      );

      expect(screen.getByTestId('queue-status')).toHaveTextContent('idle');
      expect(screen.getByTestId('queue-items')).toHaveTextContent('0');
    });
  });

  describe('useBatchQueue hook', () => {
    it('throws error when used outside provider', () => {
      // Suppress console.error for this test
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        render(<TestConsumer />);
      }).toThrow('useBatchQueue must be used within BatchQueueProvider');

      consoleError.mockRestore();
    });

    it('returns context value when used inside provider', () => {
      render(
        <BatchQueueProvider>
          <TestConsumer />
        </BatchQueueProvider>
      );

      expect(screen.getByTestId('queue-status')).toBeInTheDocument();
      expect(screen.getByTestId('queue-items')).toBeInTheDocument();
    });
  });

  describe('IPC Integration', () => {
    it('subscribes to batch progress on mount', () => {
      render(
        <BatchQueueProvider>
          <div>Test</div>
        </BatchQueueProvider>
      );

      expect(mockElectronAPI.onBatchProgress).toHaveBeenCalledTimes(1);
      expect(mockElectronAPI.onBatchProgress).toHaveBeenCalledWith(expect.any(Function));
    });

    it('cleans up progress subscription on unmount', () => {
      const mockCleanup = vi.fn();
      mockElectronAPI.onBatchProgress.mockReturnValue(mockCleanup);

      const { unmount } = render(
        <BatchQueueProvider>
          <div>Test</div>
        </BatchQueueProvider>
      );

      expect(mockCleanup).not.toHaveBeenCalled();

      unmount();

      expect(mockCleanup).toHaveBeenCalledTimes(1);
    });

    it('provides startBatchProcessing action', async () => {
      function ActionConsumer() {
        const { startBatchProcessing } = useBatchQueue();

        return (
          <button
            data-testid="start-btn"
            onClick={() => startBatchProcessing(['file1', 'file2'])}
          >
            Start
          </button>
        );
      }

      render(
        <BatchQueueProvider>
          <ActionConsumer />
        </BatchQueueProvider>
      );

      const button = screen.getByTestId('start-btn');
      button.click();

      // Wait for async action
      await vi.waitFor(() => {
        expect(mockElectronAPI.batchStart).toHaveBeenCalledWith(['file1', 'file2']);
      });
    });

    it('provides cancelBatchProcessing action', async () => {
      function ActionConsumer() {
        const { cancelBatchProcessing } = useBatchQueue();

        return (
          <button
            data-testid="cancel-btn"
            onClick={() => cancelBatchProcessing()}
          >
            Cancel
          </button>
        );
      }

      render(
        <BatchQueueProvider>
          <ActionConsumer />
        </BatchQueueProvider>
      );

      const button = screen.getByTestId('cancel-btn');
      button.click();

      // Wait for async action
      await vi.waitFor(() => {
        expect(mockElectronAPI.batchCancel).toHaveBeenCalledTimes(1);
      });
    });

    it('throws error when starting batch without electronAPI', async () => {
      delete (window as any).electronAPI;

      let thrownError: Error | null = null;

      function ActionConsumer() {
        const { startBatchProcessing } = useBatchQueue();

        return (
          <button
            data-testid="start-btn"
            onClick={async () => {
              try {
                await startBatchProcessing(['file1']);
              } catch (error) {
                thrownError = error as Error;
              }
            }}
          >
            Start
          </button>
        );
      }

      render(
        <BatchQueueProvider>
          <ActionConsumer />
        </BatchQueueProvider>
      );

      const button = screen.getByTestId('start-btn');
      button.click();

      // Wait for the async operation and error capture
      await vi.waitFor(() => {
        expect(thrownError).toBeTruthy();
        expect(thrownError?.message).toBe('Electron API not available');
      });
    });
  });
});
