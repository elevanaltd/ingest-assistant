import React, { ReactNode } from 'react';
import { IngestSettingsProvider } from '../contexts/IngestSettingsContext';
import { BatchQueueProvider } from '../contexts/BatchQueueContext';
import { CfexTransferProvider } from '../contexts/CfexTransferContext';
import { FileListProvider } from '../contexts/FileListContext';

/**
 * AppProviders Component
 *
 * Root provider composition for the application. This component orchestrates all
 * context providers and MUST remain mounted at the App root level to ensure IPC
 * singleton safety (Condition B: Technical-Architect mandate).
 *
 * ARCHITECTURAL REQUIREMENTS:
 * - NEVER unmount during tab navigation (IPC Singleton Safety - Condition B)
 * - Safe fallback for window.electronAPI in browser dev mode (Condition C)
 * - Volatile state partition (Condition A) - future context additions will respect this
 *
 * USAGE:
 * ```tsx
 * // In App.tsx root:
 * function App() {
 *   return (
 *     <AppProviders>
 *       <Router>
 *         {/* All routes and navigation here *\/}
 *       </Router>
 *     </AppProviders>
 *   );
 * }
 * ```
 *
 * CONTEXT PROVIDERS (Condition A - Volatile State Partition):
 * - IngestSettingsProvider: CONFIG state (low-frequency updates) - AI config, lexicon, CFEx paths, toggles
 * - BatchQueueProvider: VOLATILE state (high-frequency progress updates) - batch queue, IPC subscriptions
 * - CfexTransferProvider: MIXED state (config + transfer progress) - CFEx file transfer workflow
 * - FileListProvider: VOLATILE state (high-frequency navigation) - file list, selection, folder state
 */

interface AppProvidersProps {
  children: ReactNode;
}

export const AppProviders: React.FC<AppProvidersProps> = ({ children }) => {
  // Condition C: Safe fallback for browser dev mode
  // Check if window.electronAPI exists before attempting to use it
  const hasElectronAPI = typeof window !== 'undefined' && 'electronAPI' in window;

  if (!hasElectronAPI) {
    // Browser dev mode - log warning but continue rendering
    console.warn('[AppProviders] Running in browser mode - window.electronAPI not available');
  }

  // Phase 2: IngestSettingsProvider (CONFIG state - low frequency)
  // Manages AI config, lexicon, CFEx paths, power feature toggles
  // Phase 3: BatchQueueProvider (VOLATILE state - high frequency)
  // Manages batch queue state, progress updates, IPC subscriptions
  // Phase 4: CfexTransferProvider (MIXED state - config + transfer progress)
  // Manages CFEx file transfer workflow, persists across tab switches
  // Phase 5.6: FileListProvider (VOLATILE state - high frequency)
  // Manages file list, navigation, selection, folder completion state
  return (
    <IngestSettingsProvider>
      <BatchQueueProvider>
        <CfexTransferProvider>
          <FileListProvider>
            {children}
          </FileListProvider>
        </CfexTransferProvider>
      </BatchQueueProvider>
    </IngestSettingsProvider>
  );
};

// Export type for test-utils
export type { AppProvidersProps };
