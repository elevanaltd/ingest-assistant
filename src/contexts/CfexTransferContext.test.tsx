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
        startTransfer: vi.fn().mockResolvedValue({
          success: true,
          filesTransferred: 10,
          filesTotal: 10,
        }),
      },
    };

    (window as { electronAPI?: unknown }).electronAPI = mockElectronAPI;

    // Render hook with provider
    const { result, rerender } = renderHook(() => useCfexTransfer(), {
      wrapper: CfexTransferProvider,
    });

    // Start transfer
    await act(async () => {
      await result.current.startTransfer();
    });

    expect(result.current.state.isTransferring).toBe(true);

    // Simulate progress update via IPC
    act(() => {
      mockProgressHandler({
        currentFile: 'EA001234.JPG',
        fileIndex: 5,
        filesTotal: 10,
        percentComplete: 50,
        totalBytesTransferred: 1024 * 1024 * 50, // 50 MB
        totalBytesExpected: 1024 * 1024 * 100, // 100 MB
        estimatedTimeRemaining: 30,
      });
    });

    // Verify state updated
    expect(result.current.state).toMatchObject({
      isTransferring: true,
      transferStatus: 'transferring',
      currentFile: 'EA001234.JPG',
      filesCompleted: 4, // fileIndex - 1
      filesTotal: 10,
      bytesTransferred: 1024 * 1024 * 50,
      bytesTotal: 1024 * 1024 * 100,
      transferProgress: 50,
    });

    // ⚠️ CRITICAL: Simulate tab switch by rerendering with SAME provider instance
    // The provider should NOT unmount (per technical-architect requirement B)
    rerender();

    // ⚠️ CRITICAL: Verify state PERSISTS after tab switch
    expect(result.current.state.isTransferring).toBe(true);
    expect(result.current.state.currentFile).toBe('EA001234.JPG');
    expect(result.current.state.filesCompleted).toBe(4);
    expect(result.current.state.transferProgress).toBe(50);
  });

  it('should subscribe to transfer progress IPC events', async () => {
    let progressHandler: ((progress: unknown) => void) | null = null;

    const mockElectronAPI = {
      loadConfig: vi.fn().mockResolvedValue({ cfex: {} }),
      cfex: {
        onTransferProgress: vi.fn((handler) => {
          progressHandler = handler;
          return vi.fn(); // Cleanup function
        }),
        startTransfer: vi.fn().mockResolvedValue(undefined),
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

    // Start transfer first (required for progress updates to be accepted)
    await act(async () => {
      await result.current.startTransfer();
    });

    // Simulate progress event
    act(() => {
      progressHandler!({
        currentFile: 'test.jpg',
        fileIndex: 2,
        filesTotal: 5,
        percentComplete: 40,
        totalBytesTransferred: 1024,
        totalBytesExpected: 2560,
        estimatedTimeRemaining: 10,
      });
    });

    expect(result.current.state).toMatchObject({
      transferStatus: 'transferring',
      currentFile: 'test.jpg',
      filesCompleted: 1,
      filesTotal: 5,
      transferProgress: 40,
    });
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

  it('should handle startTransfer via IPC', async () => {
    const mockElectronAPI = {
      loadConfig: vi.fn().mockResolvedValue({ cfex: {} }),
      cfex: {
        onTransferProgress: vi.fn(() => vi.fn()),
        startTransfer: vi.fn().mockResolvedValue({
          success: true,
          filesTransferred: 5,
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
    expect(result.current.state.isTransferring).toBe(true);
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
});
