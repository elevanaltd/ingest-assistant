import { useState, useEffect } from 'react'

/**
 * CFEx Transfer Window Component
 *
 * Root UI component for CFEx file transfer workflow.
 *
 * Architecture:
 * - IPC integration: invoke('cfex:start-transfer') + event listeners
 * - State management: transfer status, progress, warnings, errors
 * - Child components: FolderPicker, TransferProgress, ValidationResults
 *
 * System Ripples:
 * - Invokes main process CfexTransferService via IPC handlers
 * - Listens to real-time progress events for UI updates
 * - Displays validation results and errors to user
 *
 * MIP Compliance:
 * - ESSENTIAL: IPC orchestration and event handling
 * - ESSENTIAL: State management for transfer workflow
 * - DEFERRED: Advanced features (pause/resume) to Week 2
 *
 * TDD Evidence: Test-driven (see CfexTransferWindow.test.tsx)
 */

// Type definitions for IPC events (from main process)
interface CfexTransferProgressEvent {
  currentFile: string
  fileIndex: number
  filesTotal: number
  percentComplete: number
  totalBytesTransferred: number
  totalBytesExpected: number
  estimatedTimeRemaining: number
}

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

interface TransferResult {
  success: boolean
  filesTransferred: number
  filesTotal: number
  bytesTransferred: number
  duration: number
  validationWarnings: ValidationWarning[]
  errors: TransferError[]
}

interface TransferState {
  status: 'idle' | 'scanning' | 'transferring' | 'validating' | 'complete' | 'error'
  sourcePath: string
  destinationPaths: {
    photos: string
    rawVideos: string
  }
  currentFile: string | null
  filesCompleted: number
  filesTotal: number
  bytesTransferred: number
  bytesTotal: number
  percentComplete: number
  estimatedTimeRemaining: number | null
  warnings: ValidationWarning[]
  errors: TransferError[]
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
  }
  onDestinationChange: (paths: { photos: string; rawVideos: string }) => void
  disabled: boolean
}

function FolderPicker({ sourcePath, onSourceChange, destinationPaths, onDestinationChange, disabled }: FolderPickerProps) {
  return (
    <div style={{ marginBottom: '20px' }}>
      <div style={{ marginBottom: '12px' }}>
        <label htmlFor="source-folder" style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: 500 }}>
          Source Folder (CFEx Card)
        </label>
        <input
          id="source-folder"
          type="text"
          value={sourcePath}
          onChange={(e) => onSourceChange(e.target.value)}
          disabled={disabled}
          placeholder="/Volumes/CFExpress"
          style={{ width: '100%', padding: '6px 8px', fontSize: '13px' }}
        />
      </div>

      <div style={{ marginBottom: '12px' }}>
        <label htmlFor="photos-dest" style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: 500 }}>
          Photos Destination (LucidLink)
        </label>
        <input
          id="photos-dest"
          type="text"
          value={destinationPaths.photos}
          onChange={(e) => onDestinationChange({ ...destinationPaths, photos: e.target.value })}
          disabled={disabled}
          placeholder="/Volumes/LucidLink/photos"
          style={{ width: '100%', padding: '6px 8px', fontSize: '13px' }}
        />
      </div>

      <div style={{ marginBottom: '12px' }}>
        <label htmlFor="videos-dest" style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: 500 }}>
          Raw Videos Destination (Ubuntu)
        </label>
        <input
          id="videos-dest"
          type="text"
          value={destinationPaths.rawVideos}
          onChange={(e) => onDestinationChange({ ...destinationPaths, rawVideos: e.target.value })}
          disabled={disabled}
          placeholder="/Volumes/Ubuntu/videos-raw"
          style={{ width: '100%', padding: '6px 8px', fontSize: '13px' }}
        />
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
        <strong>Progress:</strong> {filesCompleted} / {filesTotal} files ({percentComplete}%)
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
 * Main transfer window component
 */
export function CfexTransferWindow() {
  const [state, setState] = useState<TransferState>({
    status: 'idle',
    sourcePath: '',
    destinationPaths: {
      photos: '/Volumes/videos-current/2. WORKING PROJECTS/',
      rawVideos: '/Volumes/EAV_Video_RAW/'
    },
    currentFile: null,
    filesCompleted: 0,
    filesTotal: 0,
    bytesTransferred: 0,
    bytesTotal: 0,
    percentComplete: 0,
    estimatedTimeRemaining: null,
    warnings: [],
    errors: []
  })

  // Listen to progress events from main process
  useEffect(() => {
    // Verify electronAPI.cfex exists (contextBridge abstraction)
    if (!window.electronAPI?.cfex) {
      console.warn('[CfexTransferWindow] electronAPI.cfex not available')
      return
    }

    const progressHandler = (progress: CfexTransferProgressEvent) => {
      setState(prev => ({
        ...prev,
        status: 'transferring',
        currentFile: progress.currentFile,
        filesCompleted: progress.fileIndex - 1, // fileIndex is 1-based
        filesTotal: progress.filesTotal,
        bytesTransferred: progress.totalBytesTransferred,
        bytesTotal: progress.totalBytesExpected,
        percentComplete: progress.percentComplete,
        estimatedTimeRemaining: progress.estimatedTimeRemaining
      }))
    }

    // Register event listener via contextBridge abstraction
    const cleanup = window.electronAPI.cfex.onTransferProgress(progressHandler)

    // Cleanup on unmount
    return cleanup
  }, [])

  // Start transfer handler
  async function handleStartTransfer() {
    // Verify electronAPI.cfex exists (contextBridge abstraction)
    if (!window.electronAPI?.cfex) {
      console.error('[CfexTransferWindow] electronAPI.cfex not available')
      setState(prev => ({
        ...prev,
        status: 'error',
        errors: [{ file: 'unknown', error: new Error('CFEx API not available'), phase: 'transfer' }]
      }))
      return
    }

    // Update status to scanning
    setState(prev => ({ ...prev, status: 'scanning', warnings: [], errors: [] }))

    try {
      // Invoke via contextBridge abstraction
      const result: TransferResult = await window.electronAPI.cfex.startTransfer({
        source: state.sourcePath,
        destinations: state.destinationPaths
      })

      // Update final state
      setState(prev => ({
        ...prev,
        status: result.success ? 'complete' : 'error',
        filesCompleted: result.filesTransferred,
        filesTotal: result.filesTotal,
        bytesTransferred: result.bytesTransferred,
        warnings: result.validationWarnings || [],
        errors: result.errors || []
      }))
    } catch (error) {
      console.error('[CfexTransferWindow] Transfer failed:', error)
      setState(prev => ({
        ...prev,
        status: 'error',
        errors: [{ file: 'unknown', error: error as Error, phase: 'transfer' }]
      }))
    }
  }

  const canStart = Boolean(state.sourcePath) && state.status === 'idle'

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '20px', fontSize: '24px' }}>CFEx File Transfer</h1>

      <FolderPicker
        sourcePath={state.sourcePath}
        onSourceChange={(path) => setState(prev => ({ ...prev, sourcePath: path }))}
        destinationPaths={state.destinationPaths}
        onDestinationChange={(paths) => setState(prev => ({ ...prev, destinationPaths: paths }))}
        disabled={state.status !== 'idle'}
      />

      {state.status !== 'idle' && (
        <TransferProgress
          status={state.status}
          currentFile={state.currentFile}
          filesCompleted={state.filesCompleted}
          filesTotal={state.filesTotal}
          bytesTransferred={state.bytesTransferred}
          bytesTotal={state.bytesTotal}
          percentComplete={state.percentComplete}
          estimatedTimeRemaining={state.estimatedTimeRemaining}
        />
      )}

      <button
        onClick={handleStartTransfer}
        disabled={!canStart}
        style={{
          width: '100%',
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
        {state.status === 'idle' ? 'Start Transfer' : 'Transfer In Progress...'}
      </button>

      <ValidationResults
        warnings={state.warnings}
        errors={state.errors}
      />
    </div>
  )
}
