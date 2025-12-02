import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';

/**
 * CfexTransferContext - CFEx file transfer state and configuration
 *
 * Architecture Decision (per technical-architect):
 * - Config state (LOW FREQUENCY): sourcePath, destinations, toggles
 * - Transfer state (MEDIUM FREQUENCY): persists across tab switches
 * - Provider at App root (NEVER unmounts) for tab-safe persistence
 *
 * State Partition:
 * - Config: Loaded from IPC once, updated by user actions
 * - Transfer: High-frequency progress updates, must survive tab navigation
 * - Session-ephemeral: filenameRewrite (never persisted)
 *
 * System Ripples:
 * - Extracts state from CfexTransferWindow.tsx (752 lines → simpler component)
 * - IPC subscription lifecycle managed here (cleanup on unmount)
 * - Tab switches don't lose transfer progress (provider persists)
 *
 * MIP Compliance:
 * - ESSENTIAL: Centralized CFEx state management
 * - ESSENTIAL: Tab-safe persistence (technical-architect HIGH risk)
 * - MINIMAL: Only state needed by CFEx feature
 *
 * TDD Evidence: Test-driven (see CfexTransferContext.test.tsx)
 */

// Transfer state types
interface CfexTransferState {
  // Config state (LOW FREQUENCY)
  sourcePath: string;
  photosDestination: string;
  videosDestination: string;
  proxiesDestination: string;

  // Toggle states
  aiAutoAnalyze: boolean;
  metadataWrite: boolean;
  filenameRewrite: boolean; // Session-ephemeral (never persisted)
  filenameTemplate: string;
  proxyPresetId: string;

  // Destination enables
  photosEnabled: boolean;
  videosEnabled: boolean;
  proxiesEnabled: boolean;

  // Transfer state (MEDIUM FREQUENCY - persists across tab switches!)
  isTransferring: boolean;
  transferProgress: number;
  transferStatus: 'idle' | 'scanning' | 'transferring' | 'validating' | 'complete' | 'error';
  currentFile: string | null;
  filesCompleted: number;
  filesTotal: number;
  bytesTransferred: number;
  bytesTotal: number;

  // Error state
  lastError: string | null;
}

interface CfexTransferContextValue {
  state: CfexTransferState;
  // Config actions
  updateConfig: (updates: Partial<CfexTransferState>) => void;
  // Transfer actions
  startTransfer: () => Promise<void>;
  cancelTransfer: () => Promise<void>;
  resetTransfer: () => void;
}

const CfexTransferContext = createContext<CfexTransferContextValue | undefined>(undefined);

// Default state for browser dev mode or initial state
const DEFAULT_STATE: CfexTransferState = {
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

  // Transfer state
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
};

interface CfexTransferProviderProps {
  children: ReactNode;
}

export function CfexTransferProvider({ children }: CfexTransferProviderProps) {
  const [state, setState] = useState<CfexTransferState>(DEFAULT_STATE);

  // Load CFEx config from IPC on mount (Condition C: Safe Fallback)
  useEffect(() => {
    if (!window.electronAPI?.loadConfig) {
      console.warn('[CfexTransferContext] loadConfig not available - using defaults');
      return;
    }

    window.electronAPI.loadConfig().then(config => {
      const cfexConfig = config?.cfex;
      if (cfexConfig) {
        setState(prev => ({
          ...prev,
          sourcePath: cfexConfig.defaultSource || prev.sourcePath,
          photosDestination: cfexConfig.defaultPhotos || prev.photosDestination,
          videosDestination: cfexConfig.defaultVideos || prev.videosDestination,
          proxiesDestination: cfexConfig.defaultProxies || prev.proxiesDestination,
          aiAutoAnalyze: cfexConfig.aiAutoAnalyze ?? prev.aiAutoAnalyze,
          metadataWrite: cfexConfig.metadataWrite ?? prev.metadataWrite,
          filenameTemplate: cfexConfig.filenameTemplate || prev.filenameTemplate,
          proxyPresetId: cfexConfig.proxyPresetId || prev.proxyPresetId,
          // filenameRewrite is session-ephemeral - NOT loaded from config
        }));
      }
    }).catch(err => {
      console.warn('[CfexTransferContext] Failed to load config:', err);
    });
  }, []);

  // Subscribe to transfer progress IPC events (Condition A: Volatile State)
  useEffect(() => {
    if (!window.electronAPI?.cfex?.onTransferProgress) {
      console.warn('[CfexTransferContext] cfex.onTransferProgress not available');
      return;
    }

    const progressHandler = (progress: {
      currentFile: string;
      fileIndex: number;
      filesTotal: number;
      percentComplete: number;
      totalBytesTransferred: number;
      totalBytesExpected: number;
      estimatedTimeRemaining: number;
    }) => {
      setState(prev => {
        // Guard: Ignore progress updates if not actively transferring
        // Prevents "resurrection" of cancelled/completed transfers (code-review finding)
        if (!prev.isTransferring) {
          return prev;
        }

        return {
          ...prev,
          transferStatus: 'transferring',
          currentFile: progress.currentFile,
          filesCompleted: progress.fileIndex - 1, // fileIndex is 1-based
          filesTotal: progress.filesTotal,
          bytesTransferred: progress.totalBytesTransferred,
          bytesTotal: progress.totalBytesExpected,
          transferProgress: progress.percentComplete,
        };
      });
    };

    // Subscribe to IPC events
    const cleanupProgress = window.electronAPI.cfex.onTransferProgress(progressHandler);

    // Subscribe to transfer completion event (if available)
    // Note: onTransferComplete may not exist yet - check dynamically
    let cleanupComplete: (() => void) | undefined;
    const cfexApi = window.electronAPI.cfex as Record<string, unknown>;
    if (typeof cfexApi.onTransferComplete === 'function') {
      cleanupComplete = (cfexApi.onTransferComplete as (callback: (result: {
        success: boolean;
        filesTransferred: number;
        totalFiles: number;
        errors?: string[];
      }) => void) => () => void)((result) => {
        setState(prev => ({
          ...prev,
          isTransferring: false,
          transferStatus: result.success ? 'complete' : 'error',
          filesCompleted: result.filesTransferred,
          filesTotal: result.totalFiles,
          transferProgress: 100,
          lastError: result.errors?.join(', ') || null,
        }));
      });
    }

    // Cleanup on unmount
    return () => {
      cleanupProgress();
      cleanupComplete?.();
    };
  }, []);

  // Config update action
  const updateConfig = useCallback((updates: Partial<CfexTransferState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  // Start transfer action
  const startTransfer = useCallback(async () => {
    if (!window.electronAPI?.cfex?.startTransfer) {
      console.error('[CfexTransferContext] startTransfer not available');
      return;
    }

    setState(prev => ({
      ...prev,
      isTransferring: true,
      transferStatus: 'scanning',
      lastError: null,
    }));

    try {
      // IPC returns result with success, filesTransferred, filesTotal, etc.
      const result = await window.electronAPI.cfex.startTransfer({
        source: state.sourcePath,
        destinations: {
          photos: state.photosEnabled ? state.photosDestination : '',
          rawVideos: state.videosEnabled ? state.videosDestination : '',
          proxies: state.proxiesEnabled ? state.proxiesDestination : '',
        },
        enabledDestinations: {
          photos: state.photosEnabled,
          rawVideos: state.videosEnabled,
          proxies: state.proxiesEnabled,
        },
        proxyPresetId: state.proxyPresetId,
      });

      // Update state with completion result (Finding 1 fix)
      // This handles cases where backend completes without emitting progress events
      setState(prev => ({
        ...prev,
        isTransferring: false,
        transferStatus: result.success ? 'complete' : 'error',
        filesCompleted: result.filesTransferred,
        filesTotal: result.filesTotal,
        bytesTransferred: result.bytesTransferred,
        transferProgress: 100,
        lastError: result.errors?.length > 0
          ? result.errors.map(e => `${e.file}: ${e.error}`).join(', ')
          : null,
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        isTransferring: false,
        transferStatus: 'error',
        lastError: error instanceof Error ? error.message : 'Transfer failed',
      }));
    }
  }, [state.sourcePath, state.photosDestination, state.videosDestination, state.photosEnabled, state.videosEnabled, state.proxiesEnabled, state.proxiesDestination, state.proxyPresetId]);

  /**
   * Cancel transfer action
   *
   * Calls IPC handler to stop backend transfer process, then resets UI state.
   */
  const cancelTransfer = useCallback(async () => {
    try {
      // Call IPC handler to cancel backend transfer
      const result = await window.electronAPI.cfex.cancel();
      console.log('[CfexTransferContext] cancelTransfer IPC result:', result);

      // Reset UI state after IPC call
      setState(prev => ({
        ...prev,
        isTransferring: false,
        transferStatus: 'idle',
        currentFile: null,
      }));
    } catch (error) {
      console.error('[CfexTransferContext] cancelTransfer IPC error:', error);
      // Reset state even if IPC fails (UI should reflect cancellation intent)
      setState(prev => ({
        ...prev,
        isTransferring: false,
        transferStatus: 'idle',
        currentFile: null,
      }));
    }
  }, []);

  // Reset transfer state
  const resetTransfer = useCallback(() => {
    setState(prev => ({
      ...prev,
      isTransferring: false,
      transferProgress: 0,
      transferStatus: 'idle',
      currentFile: null,
      filesCompleted: 0,
      filesTotal: 0,
      bytesTransferred: 0,
      bytesTotal: 0,
      lastError: null,
    }));
  }, []);

  return (
    <CfexTransferContext.Provider
      value={{
        state,
        updateConfig,
        startTransfer,
        cancelTransfer,
        resetTransfer,
      }}
    >
      {children}
    </CfexTransferContext.Provider>
  );
}

export function useCfexTransfer() {
  const context = useContext(CfexTransferContext);
  if (!context) {
    throw new Error('useCfexTransfer must be used within CfexTransferProvider');
  }
  return context;
}
