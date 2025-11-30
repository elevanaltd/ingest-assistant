import { useState, useEffect } from 'react'
import { useCfexTransfer } from '../contexts/CfexTransferContext'

/**
 * CFEx Transfer Window Component
 *
 * Root UI component for CFEx file transfer workflow.
 *
 * Architecture (Phase 5.4):
 * - Context consumption: useCfexTransfer() for state and actions
 * - Tab-safe state: Provider at App root ensures persistence
 * - IPC integration: Managed by context (no duplicate subscriptions)
 * - Child components: FolderPicker, TransferProgress, ValidationResults
 *
 * System Ripples:
 * - Consumes CfexTransferContext for config and transfer state
 * - Updates context via updateConfig, startTransfer actions
 * - IPC subscriptions handled by context (lines removed from component)
 *
 * MIP Compliance:
 * - ESSENTIAL: UI rendering and user interactions
 * - REMOVED: Local state management (moved to context)
 * - REMOVED: IPC subscription logic (context handles)
 * - MINIMAL: Only UI-specific state remains (isBrowsing)
 *
 * TDD Evidence: Test-driven (see CfexTransferWindow.context.test.tsx)
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
 * Stub child components for minimal implementation
 * Will be replaced with full RED→GREEN cycle separately
 */
interface FolderPickerProps {
  sourcePath: string
  onSourceChange: (path: string) => void
  destinationPaths: {
    photos: string
    rawVideos: string
    proxies: string
  }
  onDestinationChange: (paths: { photos: string; rawVideos: string; proxies: string }) => void
  enabledDestinations: {
    photos: boolean
    rawVideos: boolean
    proxies: boolean
  }
  onEnabledDestinationsChange: (enabled: { photos: boolean; rawVideos: boolean; proxies: boolean }) => void
  disabled: boolean
}

function FolderPicker({ sourcePath, onSourceChange, destinationPaths, onDestinationChange, enabledDestinations, onEnabledDestinationsChange, disabled }: FolderPickerProps) {
  const [isBrowsing, setIsBrowsing] = useState(false)
  const [browseError, setBrowseError] = useState<string | null>(null)

  async function handleBrowseWithTimeout(onSelect: (path: string) => void, startPath?: string) {
    setIsBrowsing(true)
    setBrowseError(null)

    // Track timeout ID for cleanup
    let timeoutId: NodeJS.Timeout | null = null

    try {
      // Race between folder selection and 10-second timeout
      const path = await Promise.race([
        window.electronAPI.selectFolder(startPath), // Pass current path as defaultPath
        new Promise<null>((_, reject) => {
          timeoutId = setTimeout(() => {
            reject(new Error('Folder picker timeout (60s). Disconnected volumes may cause delays.'))
          }, 60000)
        })
      ])

      // SUCCESS: Clean up timeout to prevent unhandled rejection
      if (timeoutId !== null) {
        clearTimeout(timeoutId)
      }

      if (path) {
        onSelect(path)
        setBrowseError(null)
      }
    } catch (error) {
      // ERROR: Clean up timeout before handling error
      if (timeoutId !== null) {
        clearTimeout(timeoutId)
      }

      const message = error instanceof Error ? error.message : 'Folder picker failed'
      setBrowseError(message)
      console.error('[FolderPicker] Browse failed:', error)
    } finally {
      setIsBrowsing(false)
    }
  }

  async function handleBrowseSource() {
    await handleBrowseWithTimeout(onSourceChange, sourcePath)
  }

  async function handleBrowsePhotos() {
    await handleBrowseWithTimeout((path) => onDestinationChange({ ...destinationPaths, photos: path }), destinationPaths.photos)
  }

  async function handleBrowseVideos() {
    await handleBrowseWithTimeout((path) => onDestinationChange({ ...destinationPaths, rawVideos: path }), destinationPaths.rawVideos)
  }

  async function handleBrowseProxies() {
    await handleBrowseWithTimeout((path) => onDestinationChange({ ...destinationPaths, proxies: path }), destinationPaths.proxies)
  }

  return (
    <div style={{ marginBottom: '20px' }}>
      {browseError && (
        <div style={{ marginBottom: '12px', padding: '8px', backgroundColor: '#f8d7da', borderRadius: '4px', fontSize: '13px', color: '#721c24' }}>
          <strong>Browse failed:</strong> {browseError}<br />
          <span style={{ fontSize: '12px' }}>Please type the path manually instead.</span>
        </div>
      )}
      <div style={{ marginBottom: '12px' }}>
        <label htmlFor="source-folder" style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: 500 }}>
          Source Folder (CFEx Card)
        </label>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            id="source-folder"
            type="text"
            value={sourcePath}
            onChange={(e) => onSourceChange(e.target.value)}
            disabled={disabled}
            placeholder="/Volumes/CFExpress"
            style={{ flex: 1, padding: '6px 8px', fontSize: '13px' }}
          />
          <button
            onClick={handleBrowseSource}
            disabled={disabled || isBrowsing}
            style={{
              padding: '6px 16px',
              fontSize: '13px',
              backgroundColor: isBrowsing ? '#ffc107' : '#f0f0f0',
              border: '1px solid #ccc',
              borderRadius: '4px',
              cursor: (disabled || isBrowsing) ? 'not-allowed' : 'pointer'
            }}
          >
            {isBrowsing ? 'Opening...' : 'Browse...'}
          </button>
        </div>
      </div>

      <div style={{ marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px', gap: '8px' }}>
          <input
            id="photos-enabled"
            type="checkbox"
            checked={enabledDestinations.photos}
            onChange={(e) => onEnabledDestinationsChange({ ...enabledDestinations, photos: e.target.checked })}
            disabled={disabled}
            aria-label="Photos Destination (LucidLink)"
            style={{ cursor: disabled ? 'not-allowed' : 'pointer' }}
          />
          <label htmlFor="photos-dest" style={{ fontSize: '13px', fontWeight: 500 }}>
            Photos Destination (LucidLink)
          </label>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            id="photos-dest"
            type="text"
            value={destinationPaths.photos}
            onChange={(e) => onDestinationChange({ ...destinationPaths, photos: e.target.value })}
            disabled={disabled || !enabledDestinations.photos}
            placeholder="/Volumes/LucidLink/photos"
            style={{ flex: 1, padding: '6px 8px', fontSize: '13px', opacity: enabledDestinations.photos ? 1 : 0.6 }}
            aria-label="Photos destination path"
          />
          <button
            onClick={handleBrowsePhotos}
            disabled={disabled || isBrowsing || !enabledDestinations.photos}
            style={{
              padding: '6px 16px',
              fontSize: '13px',
              backgroundColor: isBrowsing ? '#ffc107' : '#f0f0f0',
              border: '1px solid #ccc',
              borderRadius: '4px',
              cursor: (disabled || isBrowsing || !enabledDestinations.photos) ? 'not-allowed' : 'pointer',
              opacity: enabledDestinations.photos ? 1 : 0.6
            }}
          >
            {isBrowsing ? 'Opening...' : 'Browse...'}
          </button>
        </div>
      </div>

      <div style={{ marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px', gap: '8px' }}>
          <input
            id="videos-enabled"
            type="checkbox"
            checked={enabledDestinations.rawVideos}
            onChange={(e) => onEnabledDestinationsChange({ ...enabledDestinations, rawVideos: e.target.checked })}
            disabled={disabled}
            aria-label="Raw Videos Destination (Ubuntu)"
            style={{ cursor: disabled ? 'not-allowed' : 'pointer' }}
          />
          <label htmlFor="videos-dest" style={{ fontSize: '13px', fontWeight: 500 }}>
            Raw Videos Destination (Ubuntu)
          </label>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            id="videos-dest"
            type="text"
            value={destinationPaths.rawVideos}
            onChange={(e) => onDestinationChange({ ...destinationPaths, rawVideos: e.target.value })}
            disabled={disabled || !enabledDestinations.rawVideos}
            placeholder="/Volumes/Ubuntu/videos-raw"
            style={{ flex: 1, padding: '6px 8px', fontSize: '13px', opacity: enabledDestinations.rawVideos ? 1 : 0.6 }}
          />
          <button
            onClick={handleBrowseVideos}
            disabled={disabled || isBrowsing || !enabledDestinations.rawVideos}
            style={{
              padding: '6px 16px',
              fontSize: '13px',
              backgroundColor: isBrowsing ? '#ffc107' : '#f0f0f0',
              border: '1px solid #ccc',
              borderRadius: '4px',
              cursor: (disabled || isBrowsing || !enabledDestinations.rawVideos) ? 'not-allowed' : 'pointer',
              opacity: enabledDestinations.rawVideos ? 1 : 0.6
            }}
          >
            {isBrowsing ? 'Opening...' : 'Browse...'}
          </button>
        </div>
      </div>

      <div style={{ marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px', gap: '8px' }}>
          <input
            id="proxies-enabled"
            type="checkbox"
            checked={enabledDestinations.proxies}
            onChange={(e) => onEnabledDestinationsChange({ ...enabledDestinations, proxies: e.target.checked })}
            disabled={disabled}
            aria-label="Proxy Videos Destination (LucidLink)"
            style={{ cursor: disabled ? 'not-allowed' : 'pointer' }}
          />
          <label htmlFor="proxies-dest" style={{ fontSize: '13px', fontWeight: 500 }}>
            Proxy Videos Destination (LucidLink)
          </label>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            id="proxies-dest"
            type="text"
            value={destinationPaths.proxies}
            onChange={(e) => onDestinationChange({ ...destinationPaths, proxies: e.target.value })}
            disabled={disabled || !enabledDestinations.proxies}
            placeholder="/Volumes/LucidLink/videos-proxy"
            style={{ flex: 1, padding: '6px 8px', fontSize: '13px', opacity: enabledDestinations.proxies ? 1 : 0.6 }}
          />
          <button
            onClick={handleBrowseProxies}
            disabled={disabled || isBrowsing || !enabledDestinations.proxies}
            style={{
              padding: '6px 16px',
              fontSize: '13px',
              backgroundColor: isBrowsing ? '#ffc107' : '#f0f0f0',
              border: '1px solid #ccc',
              borderRadius: '4px',
              cursor: (disabled || isBrowsing || !enabledDestinations.proxies) ? 'not-allowed' : 'pointer',
              opacity: enabledDestinations.proxies ? 1 : 0.6
            }}
          >
            {isBrowsing ? 'Opening...' : 'Browse...'}
          </button>
        </div>
      </div>
    </div>
  )
}

interface TransferProgressProps {
  status: 'idle' | 'scanning' | 'transferring' | 'validating' | 'complete' | 'error'
  currentFile: string | null
  filesCompleted: number
  filesTotal: number
  bytesTransferred: number
  bytesTotal: number
  percentComplete: number
  estimatedTimeRemaining: number | null
}

function TransferProgress({ currentFile, filesCompleted, filesTotal, percentComplete }: TransferProgressProps) {
  return (
    <div style={{ marginBottom: '20px', padding: '12px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
      <div style={{ marginBottom: '8px', fontSize: '14px' }}>
        <strong>Current File:</strong> {currentFile || 'N/A'}
      </div>
      <div style={{ marginBottom: '8px', fontSize: '14px' }}>
        <strong>Progress:</strong> {filesCompleted} / {filesTotal} files ({percentComplete.toFixed(2)}%)
      </div>
      <div style={{ height: '8px', backgroundColor: '#ddd', borderRadius: '4px', overflow: 'hidden' }}>
        <div style={{ width: `${percentComplete}%`, height: '100%', backgroundColor: '#007bff' }} />
      </div>
    </div>
  )
}

interface ValidationResultsProps {
  warnings: ValidationWarning[]
  errors: TransferError[]
}

function ValidationResults({ warnings, errors }: ValidationResultsProps) {
  if (warnings.length === 0 && errors.length === 0) return null

  return (
    <div style={{ marginTop: '20px' }}>
      {warnings.length > 0 && (
        <div style={{ marginBottom: '12px' }}>
          <h3 style={{ fontSize: '14px', marginBottom: '8px' }}>Warnings</h3>
          {warnings.map((warning, index) => (
            <div key={index} style={{ padding: '8px', backgroundColor: '#fff3cd', borderRadius: '4px', marginBottom: '4px', fontSize: '13px' }}>
              <strong>{warning.file}:</strong> {warning.message}
            </div>
          ))}
        </div>
      )}

      {errors.length > 0 && (
        <div>
          <h3 style={{ fontSize: '14px', marginBottom: '8px' }}>Errors</h3>
          {errors.map((error, index) => (
            <div key={index} style={{ padding: '8px', backgroundColor: '#f8d7da', borderRadius: '4px', marginBottom: '4px', fontSize: '13px' }}>
              <strong>{error.file || 'Unknown'}:</strong> {error.error.message}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * Main transfer window component (Phase 5.4 - Context Integration)
 */
export function CfexTransferWindow() {
  // Consume context for transfer state and actions
  const { state: ctxState, updateConfig, startTransfer } = useCfexTransfer()

  // Local UI-only state (not in context)
  const [isDetecting, setIsDetecting] = useState(false)
  const [warnings, setWarnings] = useState<ValidationWarning[]>([])
  const [errors, setErrors] = useState<TransferError[]>([])
  const [proxyProgress, setProxyProgress] = useState<{
    type: string
    filename?: string
    index?: number
    total?: number
    percentage?: number
    timeString?: string
  } | null>(null)

  // NOTE: Config loading and onTransferProgress subscription removed
  // Context (CfexTransferProvider) handles both (lines 117-211 in CfexTransferContext.tsx)

  // Listen to proxy generation progress events (local UI state)
  useEffect(() => {
    if (!window.electronAPI?.proxy?.onProxyProgress) {
      return
    }

    const proxyProgressHandler = (progress: {
      type: string
      filename?: string
      index?: number
      total?: number
      percentage?: number
      timeString?: string
    }) => {
      setProxyProgress(progress)
    }

    const cleanup = window.electronAPI.proxy.onProxyProgress(proxyProgressHandler)

    return cleanup
  }, [])

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
    setProxyProgress(null)
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
