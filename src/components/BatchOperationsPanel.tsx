import { useState, useEffect } from 'react';
import type { BatchQueueState, BatchProgress } from '../types';

interface BatchOperationsPanelProps {
  /** Available files that can be batched */
  availableFiles: Array<{ id: string; filename: string; processedByAI: boolean }>;
  /** Callback when batch completes to refresh file list */
  onBatchComplete?: () => void;
}

export function BatchOperationsPanel({ availableFiles, onBatchComplete }: BatchOperationsPanelProps) {
  const [queueState, setQueueState] = useState<BatchQueueState | null>(null);
  const [currentProgress, setCurrentProgress] = useState<BatchProgress | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  // Subscribe to progress events
  useEffect(() => {
    if (!window.electronAPI) return;

    const cleanup = window.electronAPI.onBatchProgress((progress) => {
      setCurrentProgress(progress);
    });

    // Cleanup on unmount
    return cleanup;
  }, []);

  // Poll for queue status every 2 seconds when queue exists
  useEffect(() => {
    if (!window.electronAPI) return;

    const interval = setInterval(async () => {
      try {
        const status = await window.electronAPI.batchGetStatus();
        setQueueState(status);

        // Auto-expand when processing
        if (status.status === 'processing') {
          setIsExpanded(true);
        }

        // Call completion callback when batch finishes
        if (status.status === 'completed' || status.status === 'cancelled') {
          if (onBatchComplete) {
            onBatchComplete();
          }
        }
      } catch (error) {
        console.error('Failed to get batch status:', error);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [onBatchComplete]);

  const handleStartBatch = async () => {
    if (!window.electronAPI) return;

    // Select unprocessed files
    const unprocessedFiles = availableFiles
      .filter(f => !f.processedByAI)
      .map(f => f.id);

    if (unprocessedFiles.length === 0) {
      alert('No unprocessed files available for batch processing');
      return;
    }

    // Limit to 100 files per batch (schema constraint)
    const BATCH_LIMIT = 100;
    const filesToProcess = unprocessedFiles.slice(0, BATCH_LIMIT);
    const remainingFiles = unprocessedFiles.length - filesToProcess.length;

    // Warn user if files exceed limit
    if (remainingFiles > 0) {
      const proceed = confirm(
        `You have ${unprocessedFiles.length} unprocessed files.\n\n` +
        `Due to API rate limits, batches are limited to ${BATCH_LIMIT} files at a time.\n\n` +
        `This batch will process the first ${BATCH_LIMIT} files.\n` +
        `${remainingFiles} files will remain for the next batch.\n\n` +
        `Continue?`
      );
      if (!proceed) return;
    }

    try {
      await window.electronAPI.batchStart(filesToProcess);
      setIsExpanded(true);
    } catch (error) {
      console.error('Failed to start batch:', error);
      alert('Failed to start batch: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const handleCancel = async () => {
    if (!window.electronAPI) return;

    try {
      const result = await window.electronAPI.batchCancel();
      if (result.success) {
        console.log('Batch cancelled successfully');
      }
    } catch (error) {
      console.error('Failed to cancel batch:', error);
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'processing': return '#2563eb'; // blue
      case 'completed': return '#16a34a'; // green
      case 'error': return '#dc2626'; // red
      case 'cancelled': return '#f59e0b'; // orange
      default: return '#6b7280'; // gray
    }
  };

  const getProgressPercentage = (): number => {
    if (!queueState || queueState.items.length === 0) return 0;
    const completed = queueState.items.filter(item =>
      item.status === 'completed' || item.status === 'error' || item.status === 'cancelled'
    ).length;
    return Math.round((completed / queueState.items.length) * 100);
  };

  const unprocessedCount = availableFiles.filter(f => !f.processedByAI).length;
  const isProcessing = queueState?.status === 'processing';

  return (
    <div style={{
      backgroundColor: '#f9fafb',
      borderBottom: '1px solid #e5e7eb',
      padding: '12px 16px',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '14px',
              padding: '4px',
            }}
            title={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? '▼' : '▶'}
          </button>

          <span style={{ fontSize: '14px', fontWeight: '600' }}>
            Batch Operations
          </span>

          {queueState && (
            <span style={{
              fontSize: '12px',
              padding: '2px 8px',
              borderRadius: '12px',
              backgroundColor: getStatusColor(queueState.status),
              color: 'white',
            }}>
              {queueState.status}
            </span>
          )}

          {unprocessedCount > 0 && !isProcessing && (
            <span style={{ fontSize: '12px', color: '#6b7280' }}>
              {unprocessedCount} file{unprocessedCount !== 1 ? 's' : ''} available
            </span>
          )}
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          {!isProcessing && (
            <button
              onClick={handleStartBatch}
              disabled={unprocessedCount === 0}
              style={{
                padding: '6px 12px',
                fontSize: '13px',
                borderRadius: '4px',
                border: '1px solid #d1d5db',
                backgroundColor: unprocessedCount > 0 ? '#3b82f6' : '#e5e7eb',
                color: unprocessedCount > 0 ? 'white' : '#9ca3af',
                cursor: unprocessedCount > 0 ? 'pointer' : 'not-allowed',
                fontWeight: '500',
              }}
            >
              Process {unprocessedCount > 100 ? 'First 100' : `${unprocessedCount}`} File{unprocessedCount !== 1 ? 's' : ''}
            </button>
          )}

          {isProcessing && (
            <button
              onClick={handleCancel}
              style={{
                padding: '6px 12px',
                fontSize: '13px',
                borderRadius: '4px',
                border: '1px solid #dc2626',
                backgroundColor: '#fee2e2',
                color: '#dc2626',
                cursor: 'pointer',
                fontWeight: '500',
              }}
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && queueState && queueState.items.length > 0 && (
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
              <span>{getProgressPercentage()}%</span>
            </div>
            <div style={{
              width: '100%',
              height: '8px',
              backgroundColor: '#e5e7eb',
              borderRadius: '4px',
              overflow: 'hidden',
            }}>
              <div style={{
                width: `${getProgressPercentage()}%`,
                height: '100%',
                backgroundColor: getStatusColor(queueState.status),
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
              ✓ Completed: {queueState.items.filter(i => i.status === 'completed').length}
            </span>
            <span>
              ✗ Failed: {queueState.items.filter(i => i.status === 'error').length}
            </span>
            {queueState.items.filter(i => i.status === 'cancelled').length > 0 && (
              <span>
                ⊗ Cancelled: {queueState.items.filter(i => i.status === 'cancelled').length}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
