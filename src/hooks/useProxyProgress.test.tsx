import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useProxyProgress } from './useProxyProgress';

describe('useProxyProgress', () => {
  // Mock electron API
  const mockCleanup = vi.fn();
  const mockOnProxyProgress = vi.fn(() => mockCleanup);

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup window.electronAPI mock
    Object.defineProperty(window, 'electronAPI', {
      value: {
        proxy: {
          onProxyProgress: mockOnProxyProgress,
        },
      },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    // Clean up window.electronAPI
    delete (window as { electronAPI?: unknown }).electronAPI;
  });

  it('should initialize with null progress state', () => {
    const { result } = renderHook(() => useProxyProgress());

    expect(result.current).toBeNull();
  });

  it('should set up IPC listener on mount', () => {
    renderHook(() => useProxyProgress());

    expect(mockOnProxyProgress).toHaveBeenCalledTimes(1);
    expect(mockOnProxyProgress).toHaveBeenCalledWith(expect.any(Function));
  });

  it('should update state when progress event received', () => {
    const { result } = renderHook(() => useProxyProgress());

    // Get the callback that was passed to onProxyProgress
    const calls = mockOnProxyProgress.mock.calls as unknown as Array<[(progress: unknown) => void]>;
    const progressCallback = calls[0]?.[0];
    expect(progressCallback).toBeDefined();

    // Simulate progress event
    const mockProgress = {
      type: 'file_start',
      filename: 'test.MOV',
      index: 1,
      total: 10,
      percentage: 10,
      timeString: '00:00:05',
    };

    act(() => {
      progressCallback!(mockProgress);
    });

    expect(result.current).toEqual(mockProgress);
  });

  it('should update state with multiple progress events', () => {
    const { result } = renderHook(() => useProxyProgress());

    const calls = mockOnProxyProgress.mock.calls as unknown as Array<[(progress: unknown) => void]>;
    const progressCallback = calls[0]?.[0];
    expect(progressCallback).toBeDefined();

    // First progress event
    act(() => {
      progressCallback!({
        type: 'file_start',
        filename: 'test1.MOV',
        index: 1,
        total: 10,
      });
    });

    expect(result.current).toEqual({
      type: 'file_start',
      filename: 'test1.MOV',
      index: 1,
      total: 10,
    });

    // Second progress event
    act(() => {
      progressCallback!({
        type: 'file_complete',
        filename: 'test1.MOV',
        index: 1,
        total: 10,
        percentage: 10,
      });
    });

    expect(result.current).toEqual({
      type: 'file_complete',
      filename: 'test1.MOV',
      index: 1,
      total: 10,
      percentage: 10,
    });
  });

  it('should clean up listener on unmount', () => {
    const { unmount } = renderHook(() => useProxyProgress());

    expect(mockCleanup).not.toHaveBeenCalled();

    unmount();

    expect(mockCleanup).toHaveBeenCalledTimes(1);
  });

  it('should handle missing electronAPI gracefully', () => {
    // Remove electronAPI
    delete (window as { electronAPI?: unknown }).electronAPI;

    const { result } = renderHook(() => useProxyProgress());

    // Should not crash and should return null
    expect(result.current).toBeNull();
  });

  it('should handle missing proxy.onProxyProgress gracefully', () => {
    // Setup incomplete electronAPI
    Object.defineProperty(window, 'electronAPI', {
      value: {
        proxy: {},
      },
      writable: true,
      configurable: true,
    });

    const { result } = renderHook(() => useProxyProgress());

    // Should not crash and should return null
    expect(result.current).toBeNull();
  });

  it('should handle all progress types', () => {
    const { result } = renderHook(() => useProxyProgress());

    const calls = mockOnProxyProgress.mock.calls as unknown as Array<[(progress: unknown) => void]>;
    const progressCallback = calls[0]?.[0];
    expect(progressCallback).toBeDefined();

    // Test each progress type
    const progressTypes: Array<{
      type: 'file_start' | 'file_complete' | 'file_failed' | 'transcode_progress' | 'phase_start';
      filename?: string;
      index?: number;
      total?: number;
      success?: boolean;
      error?: string;
      timeString?: string;
      percentage?: number;
      phase?: 'transcode' | 'exif_preserve';
    }> = [
      { type: 'file_start', filename: 'test.MOV', index: 1, total: 10 },
      { type: 'file_complete', filename: 'test.MOV', index: 1, total: 10, success: true },
      { type: 'file_failed', filename: 'test.MOV', index: 1, total: 10, error: 'Mock error' },
      { type: 'transcode_progress', filename: 'test.MOV', percentage: 50, timeString: '00:00:10' },
      { type: 'phase_start', phase: 'transcode' },
    ];

    progressTypes.forEach((progress) => {
      act(() => {
        progressCallback!(progress);
      });

      expect(result.current).toEqual(progress);
    });
  });
});
