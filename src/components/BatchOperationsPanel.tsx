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

  const handleReprocess = async () => {
    console.log('[BatchPanel] Reprocess button clicked');

    if (!window.electronAPI) {
      console.error('[BatchPanel] window.electronAPI is not available');
      return;
    }

    // Reprocess ALL files, regardless of processing status
    const filesToProcess = availableFiles.map(f => f.id);
    console.log('[BatchPanel] Files to reprocess:', filesToProcess);

    if (filesToProcess.length === 0) {
      console.log('[BatchPanel] No files to reprocess');
      return;
    }

    // Limit to 100 files per batch
    const actualFiles = filesToProcess.slice(0, 100);

    if (filesToProcess.length > 100) {
      const remainingFiles = filesToProcess.length - 100;
      const proceed = confirm(
        `Batch processing is limited to 100 files at a time.\n\n` +
        `${actualFiles.length} files will be reprocessed now.\n` +
        `${remainingFiles} files will remain for the next batch.\n\n` +
        `Continue?`
      );
      if (!proceed) {
        console.log('[BatchPanel] User cancelled reprocess (100+ files)');
        return;
      }
    } else {
      const proceed = confirm(
        `This will reprocess ALL ${actualFiles.length} file${actualFiles.length !== 1 ? 's' : ''}, including those already processed.\n\n` +
        `Continue?`
      );
      if (!proceed) {
        console.log('[BatchPanel] User cancelled reprocess');
        return;
      }
    }

    console.log('[BatchPanel] Starting reprocess with files:', actualFiles);
    try {
      await window.electronAPI.batchStart(actualFiles);
      console.log('[BatchPanel] Reprocess batch started successfully');
      setIsExpanded(true);
    } catch (error) {
      console.error('[BatchPanel] Failed to start reprocess:', error);
      alert('Failed to start reprocess: ' + (error instanceof Error ? error.message : 'Unknown error'));
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
  const totalFiles = availableFiles.length;
  const isProcessing = queueState?.status === 'processing';

  return (
    <div style={{
      backgroundColor: '#f9fafb',
      borderBottom: '1px solid #e5e7eb',
      padding: '16px',
    }}>
      {/* Action Buttons - At Top */}
      {!isProcessing && (
        <>
          <button
            onClick={handleStartBatch}
            disabled={unprocessedCount === 0}
            style={{
              width: '100%',
              padding: '10px 16px',
              fontSize: '14px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: unprocessedCount > 0 ? '#3b82f6' : '#e5e7eb',
              color: unprocessedCount > 0 ? 'white' : '#9ca3af',
              cursor: unprocessedCount > 0 ? 'pointer' : 'not-allowed',
              fontWeight: '600',
              marginBottom: '8px',
            }}
          >
            {unprocessedCount > 100
              ? `Process First 100 Files`
              : unprocessedCount > 0
              ? `Process ${unprocessedCount} File${unprocessedCount !== 1 ? 's' : ''}`
              : 'No Files to Process'
            }
          </button>

          {totalFiles > 0 && (
            <button
              onClick={(e) => {
                console.log('[BatchPanel] Button click event:', e);
                handleReprocess();
              }}
              style={{
                width: '100%',
                padding: '10px 16px',
                fontSize: '14px',
                borderRadius: '6px',
                border: '1px solid #9ca3af',
                backgroundColor: 'white',
                color: '#374151',
                cursor: 'pointer',
                fontWeight: '600',
                marginBottom: '16px',
                position: 'relative',
                zIndex: 1,
              }}
            >
              {totalFiles > 100
                ? `Reprocess First 100 Files`
                : `Reprocess All ${totalFiles} File${totalFiles !== 1 ? 's' : ''}`
              }
            </button>
          )}
        </>
      )}

      {isProcessing && (
        <button
          onClick={handleCancel}
          style={{
            width: '100%',
            padding: '10px 16px',
            fontSize: '14px',
            borderRadius: '6px',
            border: '1px solid #dc2626',
            backgroundColor: '#fee2e2',
            color: '#dc2626',
            cursor: 'pointer',
            fontWeight: '600',
            marginBottom: '16px',
          }}
        >
          Cancel Processing
        </button>
      )}

      {/* Header - Compact */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '12px',
      }}>
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

        <span style={{ fontSize: '14px', fontWeight: '600', flex: 1 }}>
          Batch Operations
        </span>

        {queueState && (
          <span style={{
            fontSize: '11px',
            padding: '3px 8px',
            borderRadius: '12px',
            backgroundColor: getStatusColor(queueState.status),
            color: 'white',
            textTransform: 'capitalize',
          }}>
            {queueState.status}
          </span>
        )}
      </div>

      {/* Status Message */}
      <div style={{
        fontSize: '13px',
        color: unprocessedCount > 0 ? '#374151' : '#6b7280',
        marginBottom: '12px',
        lineHeight: '1.5',
      }}>
        {unprocessedCount > 0 ? (
          <strong>{unprocessedCount} file{unprocessedCount !== 1 ? 's' : ''} ready to process</strong>
        ) : (
          'All files processed'
        )}
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
