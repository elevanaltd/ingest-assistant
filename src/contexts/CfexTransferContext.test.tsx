import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, renderHook, act } from '@testing-library/react';
import { CfexTransferProvider, useCfexTransfer } from './CfexTransferContext';

describe('CfexTransferContext', () => {
  beforeEach(() => {
    // Clear window.electronAPI mock before each test
    delete (window as { electronAPI?: unknown }).electronAPI;
  });

  it('should render children', () => {
    render(
      <CfexTransferProvider>
        <div>Test Child</div>
      </CfexTransferProvider>
    );

    expect(screen.getByText('Test Child')).toBeInTheDocument();
  });

  it('should throw error when useCfexTransfer used outside provider', () => {
    // Suppress console.error for this test (expected error)
    const consoleError = console.error;
    console.error = () => {};

    expect(() => {
      renderHook(() => useCfexTransfer());
    }).toThrow('useCfexTransfer must be used within CfexTransferProvider');

    console.error = consoleError;
  });

  it('should provide default values when electronAPI not available', () => {
    const { result } = renderHook(() => useCfexTransfer(), {
      wrapper: CfexTransferProvider,
    });

    expect(result.current.state).toEqual({
      // Config state
      sourcePath: '/Volumes/Untitled/DCIM/100_FUJI',
      photosDestination: '/Volumes/videos-current/2. WORKING PROJECTS/',
      videosDestination: '/Volumes/EAV_Video_RAW/',
      proxiesDestination: '/Volumes/videos-current/2. WORKING PROJECTS/',

      // Toggle states
      aiAutoAnalyze: false,
      metadataWrite: false,
      filenameRewrite: false, // Session-ephemeral
      filenameTemplate: '{location}-{subject}-{action}-{shotType}',
      proxyPresetId: '2k-prores-proxy',

      // Destination enables
      photosEnabled: true,
      videosEnabled: true,
      proxiesEnabled: false,

      // Transfer state (MEDIUM FREQUENCY - persists across tab switches!)
      isTransferring: false,
      transferProgress: 0,
      transferStatus: 'idle',
      currentFile: null,
      filesCompleted: 0,
      filesTotal: 0,
      bytesTransferred: 0,
      bytesTotal: 0,

      // Error state
      lastError: null,
    });
  });

  it('should load CFEx config from IPC on mount', async () => {
    // Mock electronAPI
    const mockElectronAPI = {
      loadConfig: vi.fn().mockResolvedValue({
        cfex: {
          defaultSource: '/Volumes/CFExpress/DCIM',
          defaultPhotos: '/Volumes/LucidLink/photos',
          defaultVideos: '/Volumes/Ubuntu/raw-videos',
          defaultProxies: '/Volumes/LucidLink/proxies',
          aiAutoAnalyze: true,
          metadataWrite: true,
          filenameTemplate: '{location}-{subject}-{shotType}',
          proxyPresetId: '1080p-h264',
        },
      }),
      cfex: {
        onTransferProgress: vi.fn(() => vi.fn()), // Return cleanup function
      },
    };

    (window as { electronAPI?: unknown }).electronAPI = mockElectronAPI;

    const { result } = renderHook(() => useCfexTransfer(), {
      wrapper: CfexTransferProvider,
    });

    // Wait for config to load
    await waitFor(() => {
      expect(result.current.state.sourcePath).toBe('/Volumes/CFExpress/DCIM');
    });

    expect(result.current.state).toMatchObject({
      sourcePath: '/Volumes/CFExpress/DCIM',
      photosDestination: '/Volumes/LucidLink/photos',
      videosDestination: '/Volumes/Ubuntu/raw-videos',
      proxiesDestination: '/Volumes/LucidLink/proxies',
      aiAutoAnalyze: true,
      metadataWrite: true,
      filenameTemplate: '{location}-{subject}-{shotType}',
      proxyPresetId: '1080p-h264',
    });
  });

  it('should update config via updateConfig', () => {
    const { result } = renderHook(() => useCfexTransfer(), {
      wrapper: CfexTransferProvider,
    });

    act(() => {
      result.current.updateConfig({
        sourcePath: '/Volumes/NewCard/DCIM',
        aiAutoAnalyze: true,
      });
    });

    expect(result.current.state.sourcePath).toBe('/Volumes/NewCard/DCIM');
    expect(result.current.state.aiAutoAnalyze).toBe(true);
  });

  // ⚠️ CRITICAL TEST: Tab persistence (HIGH RISK per technical-architect)
  it('should persist transfer state when simulating tab switch', async () => {
    // Mock electronAPI with transfer progress events
    const mockProgressHandler = vi.fn();
    const mockElectronAPI = {
      loadConfig: vi.fn().mockResolvedValue({ cfex: {} }),
      cfex: {
        onTransferProgress: vi.fn((handler) => {
          mockProgressHandler.mockImplementation(handler);
          return vi.fn(); // Cleanup function
        }),
        // Return a promise that resolves after a delay to allow progress events
        startTransfer: vi.fn().mockResolvedValue({
          success: true,
          filesTransferred: 10,
          filesTotal: 10,
          bytesTransferred: 1024 * 1024 * 100,
          duration: 5000,
          validationWarnings: [],
          errors: [],
        }),
      },
    };

    (window as { electronAPI?: unknown }).electronAPI = mockElectronAPI;

    // Render hook with provider
    const { result, rerender } = renderHook(() => useCfexTransfer(), {
      wrapper: CfexTransferProvider,
    });

    // Start transfer and wait for completion
    await act(async () => {
      await result.current.startTransfer();
    });

    // After completion, verify final state
    expect(result.current.state.isTransferring).toBe(false);
    expect(result.current.state.transferStatus).toBe('complete');
    expect(result.current.state.filesCompleted).toBe(10);
    expect(result.current.state.filesTotal).toBe(10);
    expect(result.current.state.transferProgress).toBe(100);

    // ⚠️ CRITICAL: Simulate tab switch by rerendering with SAME provider instance
    // The provider should NOT unmount (per technical-architect requirement B)
    rerender();

    // ⚠️ CRITICAL: Verify state PERSISTS after tab switch
    // The completion state should remain stable across rerenders
    expect(result.current.state.transferStatus).toBe('complete');
    expect(result.current.state.filesCompleted).toBe(10);
    expect(result.current.state.transferProgress).toBe(100);
  });

  it('should subscribe to transfer progress IPC events and block late events', async () => {
    let progressHandler: ((progress: unknown) => void) | null = null;

    const mockElectronAPI = {
      loadConfig: vi.fn().mockResolvedValue({ cfex: {} }),
      cfex: {
        onTransferProgress: vi.fn((handler) => {
          progressHandler = handler;
          return vi.fn(); // Cleanup function
        }),
        startTransfer: vi.fn().mockResolvedValue({
          success: true,
          filesTransferred: 5,
          filesTotal: 5,
          bytesTransferred: 2560,
          duration: 1000,
          validationWarnings: [],
          errors: [],
        }),
      },
    };

    (window as { electronAPI?: unknown }).electronAPI = mockElectronAPI;

    const { result } = renderHook(() => useCfexTransfer(), {
      wrapper: CfexTransferProvider,
    });

    // Wait for mount
    await waitFor(() => {
      expect(mockElectronAPI.cfex.onTransferProgress).toHaveBeenCalled();
    });

    // Start and complete transfer
    await act(async () => {
      await result.current.startTransfer();
    });

    // Verify transfer completed
    expect(result.current.state.transferStatus).toBe('complete');
    expect(result.current.state.isTransferring).toBe(false);

    // Simulate late progress event (after completion)
    // This should be IGNORED by the guard (prevents "resurrection")
    act(() => {
      progressHandler!({
        currentFile: 'late-event.jpg',
        fileIndex: 2,
        filesTotal: 5,
        percentComplete: 40,
        totalBytesTransferred: 1024,
        totalBytesExpected: 2560,
        estimatedTimeRemaining: 10,
      });
    });

    // State should NOT change - late event was blocked
    expect(result.current.state.transferStatus).toBe('complete');
    expect(result.current.state.currentFile).toBeNull(); // Not updated to 'late-event.jpg'
  });

  it('should clean up IPC listeners on unmount', () => {
    const mockCleanup = vi.fn();
    const mockElectronAPI = {
      loadConfig: vi.fn().mockResolvedValue({ cfex: {} }),
      cfex: {
        onTransferProgress: vi.fn(() => mockCleanup),
      },
    };

    (window as { electronAPI?: unknown }).electronAPI = mockElectronAPI;

    const { unmount } = renderHook(() => useCfexTransfer(), {
      wrapper: CfexTransferProvider,
    });

    unmount();

    expect(mockCleanup).toHaveBeenCalled();
  });

  it('should handle startTransfer via IPC and update state on completion', async () => {
    const mockElectronAPI = {
      loadConfig: vi.fn().mockResolvedValue({ cfex: {} }),
      cfex: {
        onTransferProgress: vi.fn(() => vi.fn()),
        startTransfer: vi.fn().mockResolvedValue({
          success: true,
          filesTransferred: 5,
          filesTotal: 10,
          bytesTransferred: 1024000,
          duration: 5000,
          validationWarnings: [],
          errors: [],
        }),
      },
    };

    (window as { electronAPI?: unknown }).electronAPI = mockElectronAPI;

    const { result } = renderHook(() => useCfexTransfer(), {
      wrapper: CfexTransferProvider,
    });

    await act(async () => {
      await result.current.startTransfer();
    });

    expect(mockElectronAPI.cfex.startTransfer).toHaveBeenCalled();
    // After IPC completes, state should reflect completion
    expect(result.current.state.isTransferring).toBe(false);
    expect(result.current.state.transferStatus).toBe('complete');
    expect(result.current.state.filesCompleted).toBe(5);
    expect(result.current.state.filesTotal).toBe(10);
    expect(result.current.state.transferProgress).toBe(100);
  });

  it('should handle cancelTransfer (manual reset - no IPC method yet)', async () => {
    const mockElectronAPI = {
      loadConfig: vi.fn().mockResolvedValue({ cfex: {} }),
      cfex: {
        onTransferProgress: vi.fn(() => vi.fn()),
        // Note: No cancelTransfer IPC method exists yet
      },
    };

    (window as { electronAPI?: unknown }).electronAPI = mockElectronAPI;

    const { result } = renderHook(() => useCfexTransfer(), {
      wrapper: CfexTransferProvider,
    });

    // Set transferring state
    act(() => {
      result.current.updateConfig({ isTransferring: true } as never);
    });

    expect(result.current.state.isTransferring).toBe(true);

    // Cancel should reset state
    await act(async () => {
      await result.current.cancelTransfer();
    });

    expect(result.current.state.isTransferring).toBe(false);
    expect(result.current.state.transferStatus).toBe('idle');
  });

  // RED: Test that cancelTransfer calls IPC handler
  it('should call window.electronAPI.cfex.cancel when cancelTransfer is invoked', async () => {
    const mockCancelFn = vi.fn().mockResolvedValue({ success: true });
    const mockElectronAPI = {
      loadConfig: vi.fn().mockResolvedValue({ cfex: {} }),
      cfex: {
        onTransferProgress: vi.fn(() => vi.fn()),
        cancel: mockCancelFn,
      },
    };

    (window as { electronAPI?: unknown }).electronAPI = mockElectronAPI;

    const { result } = renderHook(() => useCfexTransfer(), {
      wrapper: CfexTransferProvider,
    });

    // Set transferring state
    act(() => {
      result.current.updateConfig({ isTransferring: true } as never);
    });

    // Cancel should call IPC
    await act(async () => {
      await result.current.cancelTransfer();
    });

    expect(mockCancelFn).toHaveBeenCalled();
    expect(result.current.state.isTransferring).toBe(false);
    expect(result.current.state.transferStatus).toBe('idle');
  });

  it('should reset transfer state via resetTransfer', () => {
    const { result } = renderHook(() => useCfexTransfer(), {
      wrapper: CfexTransferProvider,
    });

    // Set some transfer state
    act(() => {
      result.current.updateConfig({
        isTransferring: true,
        currentFile: 'test.jpg',
        filesCompleted: 5,
        transferProgress: 50,
      } as never); // Type assertion for test
    });

    // Reset
    act(() => {
      result.current.resetTransfer();
    });

    expect(result.current.state).toMatchObject({
      isTransferring: false,
      transferProgress: 0,
      transferStatus: 'idle',
      currentFile: null,
      filesCompleted: 0,
      filesTotal: 0,
      lastError: null,
    });
  });

  it('should NOT persist filenameRewrite (session-ephemeral)', async () => {
    const mockElectronAPI = {
      loadConfig: vi.fn().mockResolvedValue({
        cfex: {
          // filenameRewrite intentionally missing (never persisted)
          metadataWrite: true,
        },
      }),
      cfex: {
        onTransferProgress: vi.fn(() => vi.fn()),
      },
    };

    (window as { electronAPI?: unknown }).electronAPI = mockElectronAPI;

    const { result } = renderHook(() => useCfexTransfer(), {
      wrapper: CfexTransferProvider,
    });

    await waitFor(() => {
      expect(result.current.state.metadataWrite).toBe(true);
    });

    // filenameRewrite should always be false (session-ephemeral)
    expect(result.current.state.filenameRewrite).toBe(false);
  });

  /**
   * RED PHASE (Issue #112): Test proxy settings propagation to IPC
   *
   * This test verifies that when proxies are enabled and configured,
   * the startTransfer() method includes proxy settings in the IPC call.
   *
   * EXPECTED TO FAIL: Current implementation doesn't pass proxy settings to backend.
   */
  it('should include proxy settings in startTransfer IPC call when proxies enabled', async () => {
    // ARRANGE: Mock electronAPI with startTransfer IPC handler
    const mockStartTransfer = vi.fn().mockResolvedValue({
      success: true,
      filesTransferred: 5,
      filesTotal: 5,
      bytesTransferred: 1000000,
      duration: 2000,
      validationWarnings: [],
      errors: [],
      transferredFiles: {
        photos: ['/dest/photo1.jpg'],
        rawVideos: ['/dest/video1.MOV'],
        proxies: ['/dest/proxy1.MOV']
      }
    });

    const mockElectronAPI = {
      loadConfig: vi.fn().mockResolvedValue({ cfex: {} }),
      cfex: {
        startTransfer: mockStartTransfer,
        onTransferProgress: vi.fn(() => vi.fn()),
      },
    };

    (window as { electronAPI?: unknown }).electronAPI = mockElectronAPI;

    const { result } = renderHook(() => useCfexTransfer(), {
      wrapper: CfexTransferProvider,
    });

    // ACT: Enable proxies and set proxy destination
    act(() => {
      result.current.updateConfig({
        proxiesEnabled: true,
        proxiesDestination: '/Volumes/videos-current/proxies',
        proxyPresetId: '2k-prores-proxy',
      });
    });

    // ACT: Start transfer
    await act(async () => {
      await result.current.startTransfer();
    });

    // ASSERT: startTransfer IPC called with proxy settings
    expect(mockStartTransfer).toHaveBeenCalledWith(
      expect.objectContaining({
        destinations: expect.objectContaining({
          photos: expect.any(String),
          rawVideos: expect.any(String),
          proxies: '/Volumes/videos-current/proxies', // Should include proxies destination
        }),
        enabledDestinations: expect.objectContaining({
          photos: expect.any(Boolean),
          rawVideos: expect.any(Boolean),
          proxies: true, // Should include proxies enabled flag
        }),
        proxyPresetId: '2k-prores-proxy', // Should include proxy preset ID
      })
    );
  });

  /**
   * RED PHASE (Issue #112): Test that proxy settings are NOT included when proxies disabled
   */
  it('should NOT include proxy settings in startTransfer when proxies disabled', async () => {
    // ARRANGE
    const mockStartTransfer = vi.fn().mockResolvedValue({
      success: true,
      filesTransferred: 2,
      filesTotal: 2,
      bytesTransferred: 500000,
      duration: 1000,
      validationWarnings: [],
      errors: [],
      transferredFiles: {
        photos: ['/dest/photo1.jpg'],
        rawVideos: ['/dest/video1.MOV']
      }
    });

    const mockElectronAPI = {
      loadConfig: vi.fn().mockResolvedValue({ cfex: {} }),
      cfex: {
        startTransfer: mockStartTransfer,
        onTransferProgress: vi.fn(() => vi.fn()),
      },
    };

    (window as { electronAPI?: unknown }).electronAPI = mockElectronAPI;

    const { result } = renderHook(() => useCfexTransfer(), {
      wrapper: CfexTransferProvider,
    });

    // ACT: Keep proxies disabled (default state), set destination anyway
    act(() => {
      result.current.updateConfig({
        proxiesEnabled: false,
        proxiesDestination: '/some/path', // Path set but disabled
      });
    });

    await act(async () => {
      await result.current.startTransfer();
    });

    // ASSERT: Proxy settings either omitted or empty/false
    // (Implementation can choose whether to send with empty values or omit entirely)
    expect(mockStartTransfer).toHaveBeenCalledWith(
      expect.objectContaining({
        enabledDestinations: expect.objectContaining({
          proxies: false, // Proxies should be disabled
        }),
      })
    );
  });
});
