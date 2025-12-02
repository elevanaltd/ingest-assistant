import type { BatchProgress, BatchQueueItem } from '../../types';

/**
 * BatchProgressDetails Component
 *
 * Purpose: Render expanded progress view for batch operations
 * Extracted from: BatchOperationsPanel (lines ~493-567)
 *
 * Features:
 * - Progress bar with percentage
 * - Current file information
 * - Queue summary (completed, failed, cancelled counts)
 */

interface BatchProgressDetailsProps {
  /** Queue items for summary statistics */
  queueItems: BatchQueueItem[];
  /** Current queue status for progress bar color */
  queueStatus: string;
  /** Current file being processed (null if no active file) */
  currentProgress: BatchProgress | null;
  /** Progress percentage (0-100) */
  progressPercentage: number;
}

export function BatchProgressDetails({
  queueItems,
  queueStatus,
  currentProgress,
  progressPercentage,
}: BatchProgressDetailsProps) {
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'processing': return '#2563eb'; // blue
      case 'completed': return '#16a34a'; // green
      case 'error': return '#dc2626'; // red
      case 'cancelled': return '#f59e0b'; // orange
      default: return '#6b7280'; // gray
    }
  };

  return (
    <div style={{ marginTop: '12px' }}>
      {/* Progress Bar */}
      <div style={{ marginBottom: '12px' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '12px',
          marginBottom: '4px',
          color: '#6b7280',
        }}>
          <span>Progress</span>
          <span>{progressPercentage}%</span>
        </div>
        <div style={{
          width: '100%',
          height: '8px',
          backgroundColor: '#e5e7eb',
          borderRadius: '4px',
          overflow: 'hidden',
        }}>
          <div style={{
            width: `${progressPercentage}%`,
            height: '100%',
            backgroundColor: getStatusColor(queueStatus),
            transition: 'width 0.3s ease',
          }} />
        </div>
      </div>

      {/* Current File */}
      {currentProgress && (
        <div style={{
          fontSize: '12px',
          padding: '8px',
          backgroundColor: '#fff',
          borderRadius: '4px',
          border: '1px solid #e5e7eb',
        }}>
          <div style={{ fontWeight: '500', marginBottom: '4px' }}>
            Processing: {currentProgress.fileId}
          </div>
          <div style={{ color: '#6b7280' }}>
            {currentProgress.current} of {currentProgress.total} files
            {currentProgress.error && (
              <span style={{ color: '#dc2626', marginLeft: '8px' }}>
                Error: {currentProgress.error}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Queue Summary */}
      <div style={{
        marginTop: '8px',
        fontSize: '12px',
        color: '#6b7280',
        display: 'flex',
        gap: '16px',
      }}>
        <span>
          ✓ Completed: {queueItems.filter(i => i.status === 'completed').length}
        </span>
        <span>
          ✗ Failed: {queueItems.filter(i => i.status === 'error').length}
        </span>
        {queueItems.filter(i => i.status === 'cancelled').length > 0 && (
          <span>
            ⊗ Cancelled: {queueItems.filter(i => i.status === 'cancelled').length}
          </span>
        )}
      </div>
    </div>
  );
}
