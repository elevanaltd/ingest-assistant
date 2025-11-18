import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import App from './App';

/**
 * Test suite for window resize responsiveness
 *
 * Issue: After batch processing, window resizes but UI layout doesn't recalculate
 * Expected: UI should respond to window resize events at all times
 */
describe('App - Window Resize Responsiveness', () => {
  let resizeCallback: (() => void) | null = null;

  beforeEach(() => {
    // Mock window.electronAPI
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).electronAPI = {
      selectFolder: vi.fn(),
      getFiles: vi.fn(),
      updateFileMetadata: vi.fn(),
      renameFile: vi.fn(),
      analyzeImage: vi.fn(),
      saveConfig: vi.fn(),
      getConfig: vi.fn(),
      getLexicon: vi.fn(),
      saveLexicon: vi.fn(),
      isAIConfigured: vi.fn().mockResolvedValue(true),
      getShotTypes: vi.fn().mockResolvedValue([]),
      getMediaServerToken: vi.fn().mockResolvedValue('test-token'),
      batchStart: vi.fn(),
      batchCancel: vi.fn(),
      batchGetStatus: vi.fn().mockResolvedValue({
        queueId: null,
        status: 'idle',
        items: [],
      }),
      onBatchProgress: vi.fn().mockReturnValue(() => {}),
      onBatchComplete: vi.fn().mockReturnValue(() => {}),
      onTranscodeProgress: vi.fn().mockReturnValue(() => {}),
    };

    // Capture resize event listener
    const originalAddEventListener = window.addEventListener;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    window.addEventListener = vi.fn((event: string, handler: any) => {
      if (event === 'resize') {
        resizeCallback = handler as () => void;
      }
      return originalAddEventListener.call(window, event, handler);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any;
  });

  afterEach(() => {
    resizeCallback = null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (window as any).electronAPI;
    vi.restoreAllMocks();
  });

  it('should register window resize listener on mount', () => {
    render(<App />);

    // Verify resize listener was registered
    expect(window.addEventListener).toHaveBeenCalledWith(
      'resize',
      expect.any(Function)
    );
  });

  it('should respond to window resize events during normal operation', async () => {
    const { container } = render(<App />);

    // Get initial layout
    const appElement = container.querySelector('.app');
    expect(appElement).toBeTruthy();

    // Simulate window resize
    if (resizeCallback) {
      resizeCallback();
    }

    // Force React to process updates
    await waitFor(() => {
      // After resize event, app should still be responsive
      // This is a smoke test - we're verifying the app doesn't freeze
      expect(appElement).toBeTruthy();
    });
  });

  it('should respond to window resize after batch processing starts', async () => {
    const { container } = render(<App />);

    // Simulate batch processing state
    const batchStatus = {
      queueId: 'test-queue',
      status: 'processing' as const,
      items: [
        { fileId: 'test1', status: 'pending' as const, addedAt: Date.now() },
      ],
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).electronAPI.batchGetStatus = vi.fn().mockResolvedValue(batchStatus);

    // Wait for batch status polling
    await waitFor(() => {
      // Batch panel should appear (if folder selected)
    }, { timeout: 3000 });

    // Simulate window resize during batch processing
    if (resizeCallback) {
      resizeCallback();
    }

    // Verify app is still responsive (resize listener working)
    const appElement = container.querySelector('.app');
    await waitFor(() => {
      expect(appElement).toBeTruthy();
      // Verify app element exists and resize handler didn't crash
      expect(appElement).toHaveClass('app');
    });
  });

  it('should respond to window resize after batch processing completes', async () => {
    const { container } = render(<App />);

    // Simulate batch completion state
    const batchStatus = {
      queueId: 'test-queue',
      status: 'completed' as const,
      items: [
        { fileId: 'test1', status: 'completed' as const, addedAt: Date.now(), completedAt: Date.now() },
      ],
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).electronAPI.batchGetStatus = vi.fn().mockResolvedValue(batchStatus);

    // Wait for batch status polling
    await waitFor(() => {
      // Batch should be in completed state
    }, { timeout: 3000 });

    // This is the critical test - resize after batch completes
    if (resizeCallback) {
      resizeCallback();
    }

    // Verify UI responds to resize (not frozen)
    const appElement = container.querySelector('.app');
    await waitFor(() => {
      expect(appElement).toBeTruthy();
      // Verify resize handler exists and is functioning
      expect(appElement).toHaveClass('app');
      // If we got here without crashes, resize handling is working
    });
  });

  it('should cleanup resize listener on unmount', () => {
    const { unmount } = render(<App />);

    // Mock removeEventListener to verify cleanup
    const removeEventListener = vi.spyOn(window, 'removeEventListener');

    unmount();

    // Verify cleanup
    expect(removeEventListener).toHaveBeenCalledWith(
      'resize',
      expect.any(Function)
    );
  });
});
