import React, { ReactNode } from 'react';

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
 * FUTURE CONTEXT ADDITIONS (Phase 2-4):
 * - Add new context providers below with clear comments
 * - Respect volatile state partition (Condition A)
 * - High-frequency state separate from config state
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

  // Phase 1 (Scaffold): Minimal passthrough
  // Phase 2-4 will add context providers here:
  // Example structure for future:
  // <ConfigContext.Provider>
  //   <VolatileStateContext.Provider>
  //     {children}
  //   </VolatileStateContext.Provider>
  // </ConfigContext.Provider>

  return <>{children}</>;
};

// Export type for test-utils
export type { AppProvidersProps };
