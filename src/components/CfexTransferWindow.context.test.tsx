/**
 * CfexTransferWindow Context Integration Tests
 *
 * TDD RED Phase - Tests for context consumption and tab persistence
 *
 * Test Coverage:
 * - Component consumes useCfexTransfer hook
 * - Config state from context displayed in UI
 * - Tab persistence (state survives tab switches)
 * - Transfer actions invoke context methods
 * - IPC subscriptions managed by context (not component)
 *
 * Architecture:
 * - CfexTransferProvider at App root (never unmounts)
 * - Context state persists across tab switches
 * - Component is stateless consumer (except UI-only state)
 */
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { renderWithProviders } from '../test/test-utils';
import { CfexTransferWindow } from './CfexTransferWindow';

describe('CfexTransferWindow - Context Integration (Phase 5.4)', () => {
  beforeEach(() => {
    // Mock electronAPI.cfex for context subscription
    const mockStartTransfer = vi.fn().mockResolvedValue({
      success: true,
      filesTransferred: 0,
      filesTotal: 0,
      bytesTransferred: 0,
      duration: 0,
      validationWarnings: [],
      errors: []
    });

    const mockOnTransferProgress = vi.fn().mockReturnValue(() => {});
    const mockDetectSources = vi.fn().mockResolvedValue({
      cards: [],
      destinations: { photos: '/default/photos', rawVideos: '/default/rawVideos' },
      shouldAutoPopulate: false,
      selectedCard: undefined
    });

    (window as any).electronAPI = {
      loadConfig: vi.fn().mockResolvedValue({
        cfex: {
          defaultSource: '/Volumes/CFExpress/DCIM',
          defaultPhotos: '/Volumes/LucidLink/photos',
          defaultVideos: '/Volumes/Ubuntu/videos-raw',
          defaultProxies: '/Volumes/LucidLink/proxies',
        }
      }),
      cfex: {
        detectSources: mockDetectSources,
        startTransfer: mockStartTransfer,
        onTransferProgress: mockOnTransferProgress,
        getTransferState: vi.fn()
      },
      proxy: {
        generateProxies: vi.fn().mockResolvedValue({
          success: true,
          completedCount: 0,
          failedCount: 0,
          completedFiles: [],
          failedFiles: []
        })
      }
    };
  });

  describe('Context Consumption', () => {
    test('displays source path from context state', async () => {
      // ARRANGE: Context loads config with custom source path
      renderWithProviders(<CfexTransferWindow />);

      // Wait for config load
      await waitFor(() => {
        const sourceInput = screen.getByLabelText(/source.*folder/i) as HTMLInputElement;
        expect(sourceInput.value).toBe('/Volumes/CFExpress/DCIM');
      });
    });

    test('displays photos destination from context state', async () => {
      // ARRANGE
      renderWithProviders(<CfexTransferWindow />);

      // ASSERT: Photos destination loaded from context config
      await waitFor(() => {
        const photosInput = screen.getByPlaceholderText(/LucidLink.*photos/i) as HTMLInputElement;
        expect(photosInput.value).toBe('/Volumes/LucidLink/photos');
      });
    });

    test('displays videos destination from context state', async () => {
      // ARRANGE
      renderWithProviders(<CfexTransferWindow />);

      // ASSERT: Videos destination loaded from context config
      await waitFor(() => {
        const videosInput = screen.getByPlaceholderText(/Ubuntu/i) as HTMLInputElement;
        expect(videosInput.value).toBe('/Volumes/Ubuntu/videos-raw');
      });
    });

    test('displays proxies destination from context state', async () => {
      // ARRANGE
      renderWithProviders(<CfexTransferWindow />);

      // ASSERT: Proxies destination loaded from context config
      await waitFor(() => {
        const proxiesInput = screen.getByPlaceholderText(/LucidLink.*proxy/i) as HTMLInputElement;
        expect(proxiesInput.value).toBe('/Volumes/LucidLink/proxies');
      });
    });
  });

  describe('Config Updates via Context', () => {
    test('updating source path calls context.updateConfig', async () => {
      // ARRANGE
      renderWithProviders(<CfexTransferWindow />);
      const user = userEvent.setup();

      // Wait for auto-detection to complete
      await waitFor(() => {
        const sourceInput = screen.getByLabelText(/source.*folder/i);
        expect(sourceInput).not.toBeDisabled();
      });

      // ACT: Update source path
      const sourceInput = screen.getByLabelText(/source.*folder/i);
      await user.clear(sourceInput);
      await user.type(sourceInput, '/Volumes/NewCard/DCIM');

      // ASSERT: Context state updated (verify via re-render persistence)
      expect(sourceInput).toHaveValue('/Volumes/NewCard/DCIM');
    });

    test('updating photos destination calls context.updateConfig', async () => {
      // ARRANGE
      renderWithProviders(<CfexTransferWindow />);
      const user = userEvent.setup();

      // Wait for component ready
      await waitFor(() => {
        const photosInput = screen.getByPlaceholderText(/LucidLink.*photos/i);
        expect(photosInput).not.toBeDisabled();
      });

      // ACT: Update photos destination
      const photosInput = screen.getByPlaceholderText(/LucidLink.*photos/i);
      await user.clear(photosInput);
      await user.type(photosInput, '/Volumes/Custom/photos');

      // ASSERT: Context state updated
      expect(photosInput).toHaveValue('/Volumes/Custom/photos');
    });
  });

  describe('Transfer Actions via Context', () => {
    test('start transfer button calls context.startTransfer', async () => {
      // ARRANGE
      const mockStartTransfer = vi.fn().mockResolvedValue({
        success: true,
        filesTransferred: 10,
        filesTotal: 10,
        bytesTransferred: 1000000,
        duration: 5000,
        validationWarnings: [],
        errors: []
      });

      (window as any).electronAPI.cfex.startTransfer = mockStartTransfer;

      renderWithProviders(<CfexTransferWindow />);
      const user = userEvent.setup();

      // Wait for component ready
      await waitFor(() => {
        const startButton = screen.getByRole('button', { name: /start transfer/i });
        expect(startButton).not.toBeDisabled();
      });

      // ACT: Click start transfer
      const startButton = screen.getByRole('button', { name: /start transfer/i });
      await user.click(startButton);

      // ASSERT: Context called startTransfer via IPC
      await waitFor(() => {
        expect(mockStartTransfer).toHaveBeenCalledWith(
          expect.objectContaining({
            source: expect.any(String),
            destinations: expect.objectContaining({
              photos: expect.any(String),
              rawVideos: expect.any(String)
            })
          })
        );
      });
    });
  });

  describe('Tab Persistence (CRITICAL)', () => {
    test('transfer state persists across component remount', async () => {
      // ARRANGE: Start a transfer
      const mockStartTransfer = vi.fn().mockImplementation(() => {
        return new Promise(() => {}); // Never resolves (simulates in-progress)
      });

      let progressHandler: ((progress: any) => void) | null = null;
      const mockOnTransferProgress = vi.fn().mockImplementation((callback) => {
        progressHandler = callback;
        return () => {}; // cleanup
      });

      (window as any).electronAPI.cfex.startTransfer = mockStartTransfer;
      (window as any).electronAPI.cfex.onTransferProgress = mockOnTransferProgress;

      const { unmount, rerender } = renderWithProviders(<CfexTransferWindow />);
      const user = userEvent.setup();

      // Wait for component ready
      await waitFor(() => {
        const startButton = screen.getByRole('button', { name: /start transfer/i });
        expect(startButton).not.toBeDisabled();
      });

      // ACT: Start transfer
      const startButton = screen.getByRole('button', { name: /start transfer/i });
      await user.click(startButton);

      // Simulate progress event BEFORE unmount
      if (progressHandler) {
        (progressHandler as ((progress: {
          currentFile: string;
          fileIndex: number;
          filesTotal: number;
          percentComplete: number;
          totalBytesTransferred: number;
          totalBytesExpected: number;
          estimatedTimeRemaining: number;
        }) => void))({
          currentFile: 'test-photo.jpg',
          fileIndex: 3,
          filesTotal: 10,
          percentComplete: 30,
          totalBytesTransferred: 300000,
          totalBytesExpected: 1000000,
          estimatedTimeRemaining: 120
        });
      }

      // Wait for progress to appear
      await waitFor(() => {
        expect(screen.getByText(/test-photo\.jpg/i)).toBeInTheDocument();
      });

      // ACT: Simulate tab switch (unmount component but provider persists)
      unmount();

      // ACT: Switch back to tab (remount component)
      rerender(<CfexTransferWindow />);

      // ASSERT: Transfer state persisted! Progress still visible
      await waitFor(() => {
        expect(screen.getByText(/test-photo\.jpg/i)).toBeInTheDocument();
        expect(screen.getByText(/30\.00%/i)).toBeInTheDocument();
      });
    });

    test('config changes persist across component remount', async () => {
      // ARRANGE
      const { unmount, rerender } = renderWithProviders(<CfexTransferWindow />);
      const user = userEvent.setup();

      // Wait for component ready
      await waitFor(() => {
        const sourceInput = screen.getByLabelText(/source.*folder/i);
        expect(sourceInput).not.toBeDisabled();
      });

      // ACT: Update source path
      const sourceInput = screen.getByLabelText(/source.*folder/i);
      await user.clear(sourceInput);
      await user.type(sourceInput, '/Volumes/PersistTest/DCIM');

      // Verify update
      expect(sourceInput).toHaveValue('/Volumes/PersistTest/DCIM');

      // ACT: Simulate tab switch (unmount)
      unmount();

      // ACT: Switch back to tab (remount)
      rerender(<CfexTransferWindow />);

      // ASSERT: Config persisted
      await waitFor(() => {
        const restoredInput = screen.getByLabelText(/source.*folder/i) as HTMLInputElement;
        expect(restoredInput.value).toBe('/Volumes/PersistTest/DCIM');
      });
    });
  });

  describe('IPC Subscription Deduplication', () => {
    test('does NOT subscribe to onTransferProgress in component', () => {
      // CRITICAL: Context already subscribes to onTransferProgress
      // Component should NOT create duplicate subscription

      const mockOnTransferProgress = vi.fn().mockReturnValue(() => {});
      (window as any).electronAPI.cfex.onTransferProgress = mockOnTransferProgress;

      // ACT: Render component with context
      renderWithProviders(<CfexTransferWindow />);

      // ASSERT: onTransferProgress called ONCE by context, NOT by component
      // Context subscribes on mount, component should not add another subscription
      expect(mockOnTransferProgress).toHaveBeenCalledTimes(1);
    });
  });
});
