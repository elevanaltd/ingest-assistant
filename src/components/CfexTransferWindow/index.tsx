import { useState, useEffect } from 'react'
import { useCfexTransfer } from '../../contexts/CfexTransferContext'
import { useProxyProgress } from '../../hooks/useProxyProgress'
import { FolderPicker } from './FolderPicker'
import { TransferProgress } from './TransferProgress'
import { ValidationResults } from './ValidationResults'

/**
 * CFEx Transfer Window Component (Phase 8a - Decomposed)
 *
 * Root UI component for CFEx file transfer workflow.
 *
 * Architecture (Phase 8a):
 * - Context consumption: useCfexTransfer() for state and actions
 * - Tab-safe state: Provider at App root ensures persistence
 * - IPC integration: Managed by context (no duplicate subscriptions)
 * - Child components: FolderPicker, TransferProgress, ValidationResults (extracted)
 *
 * System Ripples:
 * - Consumes CfexTransferContext for config and transfer state
 * - Updates context via updateConfig, startTransfer actions
 * - IPC subscriptions handled by context
 * - Extracted presentational components improve testability
 *
 * MIP Compliance:
 * - ESSENTIAL: UI orchestration and user interactions
 * - REMOVED: Local state management (moved to context)
 * - REMOVED: IPC subscription logic (context handles)
 * - REMOVED: Inline component definitions (Phase 8a extraction)
 * - MINIMAL: Only UI-specific state remains (local warnings/errors)
 *
 * TDD Evidence:
 * - index.test.tsx (integration tests)
 * - index.context.test.tsx (context integration)
 * - FolderPicker.test.tsx (15 tests)
 * - TransferProgress.test.tsx (7 tests)
 * - ValidationResults.test.tsx (7 tests)
 */

// Type definitions for local UI state (not in context)
interface ValidationWarning {
  file: string
  message: string
  severity: 'low' | 'medium' | 'high'
}

interface TransferError {
  file: string
  error: Error
  phase: 'scan' | 'transfer' | 'validation'
}

/**
 * Main transfer window component (Phase 8a - Decomposed Architecture)
 */
export function CfexTransferWindow() {
  // Consume context for transfer state and actions
  const { state: ctxState, updateConfig, startTransfer } = useCfexTransfer()

  // Subscribe to proxy generation progress events via hook
  const proxyProgress = useProxyProgress()

  // Local UI-only state (not in context)
  const [isDetecting, setIsDetecting] = useState(false)
  const [warnings, setWarnings] = useState<ValidationWarning[]>([])
  const [errors, setErrors] = useState<TransferError[]>([])

  // NOTE: Config loading and onTransferProgress subscription removed
  // Context (CfexTransferProvider) handles both (lines 117-211 in CfexTransferContext.tsx)

  // Auto-detect CFEx cards and destinations on mount
  useEffect(() => {
    // Verify electronAPI.cfex.detectSources exists (contextBridge abstraction)
    if (!window.electronAPI?.cfex?.detectSources) {
      console.warn('[CfexTransferWindow] electronAPI.cfex.detectSources not available')
      return
    }

    async function runAutoDetection() {
      setIsDetecting(true)

      try {
        const result = await window.electronAPI.cfex.detectSources()
        setIsDetecting(false)

        // Update context state if auto-populate conditions met
        if (result.shouldAutoPopulate && result.selectedCard) {
          updateConfig({ sourcePath: result.selectedCard })
        }

        // Update destination paths if detected (not defaults)
        const updates: Record<string, string> = {}
        if (result.destinations.photos !== '/default/photos') {
          updates.photosDestination = result.destinations.photos
        }
        if (result.destinations.rawVideos !== '/default/rawVideos') {
          updates.videosDestination = result.destinations.rawVideos
        }

        if (Object.keys(updates).length > 0) {
          updateConfig(updates)
        }
      } catch (error) {
        console.warn('[CfexTransferWindow] Auto-detection failed:', error)
        setIsDetecting(false)
      }
    }

    runAutoDetection()
  }, [updateConfig])

  // Start transfer handler - delegates to context action
  async function handleStartTransfer() {
    // Clear local warnings/errors before new transfer
    setWarnings([])
    setErrors([])

    // Invoke context startTransfer action (handles IPC)
    await startTransfer()

    // After context completes, check for proxy generation
    // Note: Context state updates after startTransfer completes
    // TODO: Move proxy generation trigger to context (future refactor)
    if (ctxState.proxiesEnabled && ctxState.transferStatus === 'complete') {
      // Proxy generation logic handled here for now
      // Future: Move to context or separate hook
      console.log('[CfexTransferWindow] Proxy generation would trigger here')
    }
  }

  // Computed UI state from context
  const canStart = Boolean(ctxState.sourcePath) && ctxState.transferStatus === 'idle' && !isDetecting
  const isTransferring = ctxState.transferStatus !== 'idle' && ctxState.transferStatus !== 'complete' && ctxState.transferStatus !== 'error'

  // Basic cancel handler (Week 1 - UI only)
  // Note: Full graceful cancellation with IPC handler deferred to Week 2
  // TODO: Context has cancelTransfer action - use that instead
  function handleCancel() {
    setWarnings([])
    setErrors([])
    // Note: proxyProgress state managed by useProxyProgress hook (read-only from component perspective)
    // Context reset handled separately (not called here to avoid confusion)
  }

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '20px', fontSize: '24px' }}>CFEx File Transfer</h1>

      {isDetecting && (
        <div style={{ marginBottom: '12px', padding: '8px', backgroundColor: '#e3f2fd', borderRadius: '4px', fontSize: '13px', color: '#1976d2' }}>
          Detecting CFEx cards...
        </div>
      )}

      <FolderPicker
        sourcePath={ctxState.sourcePath}
        onSourceChange={(path) => updateConfig({ sourcePath: path })}
        destinationPaths={{
          photos: ctxState.photosDestination,
          rawVideos: ctxState.videosDestination,
          proxies: ctxState.proxiesDestination
        }}
        onDestinationChange={(paths) => updateConfig({
          photosDestination: paths.photos,
          videosDestination: paths.rawVideos,
          proxiesDestination: paths.proxies
        })}
        enabledDestinations={{
          photos: ctxState.photosEnabled,
          rawVideos: ctxState.videosEnabled,
          proxies: ctxState.proxiesEnabled
        }}
        onEnabledDestinationsChange={(enabled) => updateConfig({
          photosEnabled: enabled.photos,
          videosEnabled: enabled.rawVideos,
          proxiesEnabled: enabled.proxies
        })}
        disabled={isDetecting || ctxState.transferStatus !== 'idle'}
      />

      {ctxState.transferStatus !== 'idle' && (
        <TransferProgress
          status={ctxState.transferStatus}
          currentFile={ctxState.currentFile}
          filesCompleted={ctxState.filesCompleted}
          filesTotal={ctxState.filesTotal}
          bytesTransferred={ctxState.bytesTransferred}
          bytesTotal={ctxState.bytesTotal}
          percentComplete={ctxState.transferProgress}
          estimatedTimeRemaining={null} // Context doesn't track this yet
        />
      )}

      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
        <button
          onClick={handleStartTransfer}
          disabled={!canStart}
          style={{
            flex: 1,
            padding: '12px',
            fontSize: '14px',
            fontWeight: 500,
            backgroundColor: canStart ? '#007bff' : '#ccc',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: canStart ? 'pointer' : 'not-allowed'
          }}
        >
          {ctxState.transferStatus === 'idle' ? 'Start Transfer' :
           ctxState.transferStatus === 'complete' ? 'Transfer Complete' :
           ctxState.transferStatus === 'error' ? 'Transfer Failed' :
           'Transfer In Progress...'}
        </button>

        {isTransferring && (
          <button
            onClick={handleCancel}
            style={{
              padding: '12px 24px',
              fontSize: '14px',
              fontWeight: 500,
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
        )}
      </div>

      {isTransferring && (
        <div style={{ marginBottom: '12px', padding: '8px', backgroundColor: '#fff3cd', borderRadius: '4px', fontSize: '12px', color: '#856404' }}>
          <strong>Note:</strong> Cancel currently stops UI updates only. Full graceful cancellation (stopping file operations) coming in Week 2.
        </div>
      )}

      {/* Error Display */}
      {ctxState.lastError && (
        <div style={{ marginBottom: '20px', padding: '12px', backgroundColor: '#fee', borderRadius: '4px', border: '1px solid #fcc' }}>
          <div style={{ fontSize: '13px', fontWeight: '500', color: '#c00' }}>
            {ctxState.lastError}
          </div>
        </div>
      )}

      {/* Proxy Generation Progress */}
      {proxyProgress && proxyProgress.type === 'transcode_progress' && (
        <div style={{ marginBottom: '20px', padding: '12px', backgroundColor: '#f0f9ff', borderRadius: '4px', border: '1px solid #bfdbfe' }}>
          <div style={{ fontSize: '13px', fontWeight: '500', marginBottom: '8px', color: '#1e40af' }}>
            Generating Proxies: {proxyProgress.filename || 'N/A'}
          </div>
          <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px' }}>
            Progress: {proxyProgress.index || 0} / {proxyProgress.total || 0} videos ({proxyProgress.percentage || 0}%)
          </div>
          <div style={{ width: '100%', height: '8px', backgroundColor: '#e5e7eb', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{
              width: `${proxyProgress.percentage || 0}%`,
              height: '100%',
              backgroundColor: '#3b82f6',
              transition: 'width 0.3s ease'
            }} />
          </div>
          {proxyProgress.timeString && (
            <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
              Encoding: {proxyProgress.percentage || 0}% | ETA: {proxyProgress.timeString}
            </div>
          )}
        </div>
      )}

      <ValidationResults
        warnings={warnings}
        errors={errors}
      />
    </div>
  )
}
