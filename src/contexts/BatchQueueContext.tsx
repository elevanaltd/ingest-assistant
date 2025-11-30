import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import type { BatchQueueState, BatchProgress } from '../types';

/**
 * BatchQueueContext manages the state for batch processing operations.
 *
 * VOLATILE STATE: This context manages high-frequency state updates
 * (progress events, queue status) that change rapidly during batch processing.
 *
 * ARCHITECTURE (Feature-Context Pattern):
 * - Separates volatile batch state from stable settings
 * - Subscribes to IPC progress events
 * - Provides cleanup on unmount
 * - Uses useCallback/useMemo to prevent unnecessary re-renders
 *
 * Related: Issue #102 Feature-Context Architecture Phase 3
 */

interface BatchQueueContextValue {
  state: BatchQueueState;
  progress: BatchProgress | null;

  // Actions
  startBatchProcessing: (fileIds: string[]) => Promise<string>;
  cancelBatchProcessing: () => Promise<{ success: boolean }>;
}

const BatchQueueContext = createContext<BatchQueueContextValue | undefined>(undefined);

interface BatchQueueProviderProps {
  children: React.ReactNode;
}

export function BatchQueueProvider({ children }: BatchQueueProviderProps) {
  const [queueState, setQueueState] = useState<BatchQueueState>({
    items: [],
    status: 'idle',
    currentFile: null
  });
  const [progress, setProgress] = useState<BatchProgress | null>(null);

  // Subscribe to IPC progress events
  useEffect(() => {
    if (!window.electronAPI?.onBatchProgress) return;

    const cleanup = window.electronAPI.onBatchProgress((progressData) => {
      setProgress(progressData);
    });

    return cleanup;
  }, []);

  // Poll for queue status every 2 seconds
  useEffect(() => {
    if (!window.electronAPI?.batchGetStatus) return;

    const interval = setInterval(async () => {
      try {
        const status = await window.electronAPI.batchGetStatus();
        setQueueState(status);
      } catch (error) {
        console.error('Failed to get batch status:', error);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  // Actions
  const startBatchProcessing = useCallback(async (fileIds: string[]) => {
    if (!window.electronAPI?.batchStart) {
      throw new Error('Electron API not available');
    }
    return window.electronAPI.batchStart(fileIds);
  }, []);

  const cancelBatchProcessing = useCallback(async () => {
    if (!window.electronAPI?.batchCancel) {
      throw new Error('Electron API not available');
    }
    return window.electronAPI.batchCancel();
  }, []);

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(
    () => ({
      state: queueState,
      progress,
      startBatchProcessing,
      cancelBatchProcessing,
    }),
    [queueState, progress, startBatchProcessing, cancelBatchProcessing]
  );

  return (
    <BatchQueueContext.Provider value={contextValue}>
      {children}
    </BatchQueueContext.Provider>
  );
}

/**
 * Hook to access batch queue context.
 *
 * @throws Error if used outside BatchQueueProvider
 */
export function useBatchQueue() {
  const context = useContext(BatchQueueContext);

  if (!context) {
    throw new Error('useBatchQueue must be used within BatchQueueProvider');
  }

  return context;
}
