/**
 * TransferProgress Component (Extracted Phase 8a)
 *
 * Presentational component for CFEx transfer progress display.
 *
 * Features:
 * - Current file name display
 * - Files completed / total count
 * - Percentage complete
 * - Visual progress bar
 *
 * System Ripples:
 * - Pure presentational component (no side effects)
 * - No context consumption (parent passes all state)
 *
 * MIP Compliance:
 * - ESSENTIAL: Progress visualization for user feedback
 * - MINIMAL: No local state, pure render from props
 */

export interface TransferProgressProps {
  status: 'idle' | 'scanning' | 'transferring' | 'validating' | 'complete' | 'error'
  currentFile: string | null
  filesCompleted: number
  filesTotal: number
  bytesTransferred: number
  bytesTotal: number
  percentComplete: number
  estimatedTimeRemaining: number | null
}

export function TransferProgress({
  currentFile,
  filesCompleted,
  filesTotal,
  percentComplete
}: TransferProgressProps) {
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
