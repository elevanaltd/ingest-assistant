import { useState, useEffect } from 'react';

/**
 * Type definition for proxy generation progress events
 * Matches the ElectronAPI.proxy.onProxyProgress callback signature
 */
export interface ProxyProgress {
  type: 'file_start' | 'file_complete' | 'file_failed' | 'transcode_progress' | 'phase_start';
  filename?: string;
  index?: number;
  total?: number;
  success?: boolean;
  error?: string;
  timeString?: string;
  percentage?: number;
  phase?: 'transcode' | 'exif_preserve';
}

/**
 * Custom hook to subscribe to proxy generation progress events
 * Manages IPC listener lifecycle and provides current progress state
 *
 * @returns Current proxy progress state (null if no progress)
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const proxyProgress = useProxyProgress();
 *
 *   if (proxyProgress?.type === 'file_start') {
 *     return <div>Processing {proxyProgress.filename}...</div>;
 *   }
 *
 *   return null;
 * }
 * ```
 */
export function useProxyProgress(): ProxyProgress | null {
  const [proxyProgress, setProxyProgress] = useState<ProxyProgress | null>(null);

  useEffect(() => {
    // Guard: Check if electronAPI and proxy.onProxyProgress are available
    if (!window.electronAPI?.proxy?.onProxyProgress) {
      return;
    }

    // Subscribe to proxy progress events
    const cleanup = window.electronAPI.proxy.onProxyProgress((progress) => {
      setProxyProgress(progress);
    });

    // Cleanup listener on unmount
    return cleanup;
  }, []);

  return proxyProgress;
}
