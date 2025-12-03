import { useState, useEffect } from 'react';
import { useBatchQueue } from '../contexts/BatchQueueContext';
import { useIngestSettings } from '../contexts/IngestSettingsContext';
import { useProxyProgress } from '../hooks/useProxyProgress';
import { BatchActionButtons } from './BatchOperationsPanel/BatchActionButtons';
import { BatchProgressDetails } from './BatchOperationsPanel/BatchProgressDetails';
import { ProxyProgressCard } from './BatchOperationsPanel/ProxyProgressCard';

interface BatchOperationsPanelProps {
  /** Available files that can be batched */
  availableFiles: Array<{ id: string; filename: string; processedByAI: boolean }>;
  /** Currently selected file IDs (optional - for multi-select batch processing) */
  selectedFileIds?: Set<string>;
  /** Whether file renaming is enabled (triggers safety warning) */
  filenameRewrite?: boolean;
  /** Callback when batch completes to refresh file list */
  onBatchComplete?: () => void;
  /** Path to current folder being browsed (used for rawVideoFolder in proxy generation) */
  currentFolderPath?: string;
}

export function BatchOperationsPanel({ availableFiles, selectedFileIds, filenameRewrite = false, onBatchComplete, currentFolderPath }: BatchOperationsPanelProps) {
  // Consume BatchQueueContext instead of local IPC subscriptions
  const { state: queueState, progress: currentProgress, startBatchProcessing, cancelBatchProcessing } = useBatchQueue();

  // Consume IngestSettingsContext for proxy preset selection
  const { settings } = useIngestSettings();

  // Subscribe to proxy generation progress events via hook
  const proxyProgress = useProxyProgress();

  // UI-only local state (NOT managed by context)
  const [isExpanded, setIsExpanded] = useState(false);
  const [previousStatus, setPreviousStatus] = useState<string | null>(null);

  // Monitor queue status changes for UI updates and completion callback
  // Note: queueState comes from BatchQueueContext (already polling)
  useEffect(() => {
    // Auto-expand when processing
    if (queueState.status === 'processing') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsExpanded(true);
      // Reset previousStatus when a new batch starts (allows next completion to be detected)
      if (previousStatus === 'completed' || previousStatus === 'cancelled') {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setPreviousStatus('processing');
      }
    }

    // Call completion callback when batch finishes (only on status CHANGE, not every poll)
    if ((queueState.status === 'completed' || queueState.status === 'cancelled') &&
        queueState.status !== previousStatus) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPreviousStatus(queueState.status);
      if (onBatchComplete) {
        onBatchComplete();
      }
    }
  }, [queueState.status, previousStatus, onBatchComplete]);

  const handleStartBatch = async () => {
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

    // Show file rename warning if enabled
    if (filenameRewrite) {
      const renameConfirmed = window.confirm(
        `⚠️ Batch Rename Active: File renaming is enabled. ` +
        `${filesToProcess.length} files will be renamed during this batch operation. ` +
        `Original filenames preserved in TapeName metadata. Continue?`
      );
      if (!renameConfirmed) return;
    }

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
      await startBatchProcessing(filesToProcess);
      setIsExpanded(true);
    } catch (error) {
      console.error('Failed to start batch:', error);
      alert('Failed to start batch: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const handleCancel = async () => {
    try {
      const result = await cancelBatchProcessing();
      if (result.success) {
        console.log('Batch cancelled successfully');
      }
    } catch (error) {
      console.error('Failed to cancel batch:', error);
    }
  };

  const handleProcessSelected = async () => {
    if (!selectedFileIds || selectedFileIds.size === 0) {
      return;
    }

    // Convert Set to Array for batch processing
    const filesToProcess = Array.from(selectedFileIds);

    // Show file rename warning if enabled
    if (filenameRewrite) {
      const renameConfirmed = window.confirm(
        `⚠️ Batch Rename Active: File renaming is enabled. ` +
        `${filesToProcess.length} files will be renamed during this batch operation. ` +
        `Original filenames preserved in TapeName metadata. Continue?`
      );
      if (!renameConfirmed) return;
    }

    try {
      await startBatchProcessing(filesToProcess);
      setIsExpanded(true);
    } catch (error) {
      console.error('[BatchPanel] Failed to start selected batch:', error);
      alert('Failed to start batch: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const handleReprocess = async (e: React.MouseEvent) => {
    console.log('[BatchPanel] Reprocess button clicked', e);

    // Reprocess ALL files, regardless of processing status
    const filesToProcess = availableFiles.map(f => f.id);
    console.log('[BatchPanel] Files to reprocess:', filesToProcess);

    if (filesToProcess.length === 0) {
      console.log('[BatchPanel] No files to reprocess');
      return;
    }

    // Limit to 100 files per batch
    const actualFiles = filesToProcess.slice(0, 100);

    // Show file rename warning if enabled
    if (filenameRewrite) {
      const renameConfirmed = window.confirm(
        `⚠️ Batch Rename Active: File renaming is enabled. ` +
        `${actualFiles.length} files will be renamed during this batch operation. ` +
        `Original filenames preserved in TapeName metadata. Continue?`
      );
      if (!renameConfirmed) return;
    }

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
      await startBatchProcessing(actualFiles);
      console.log('[BatchPanel] Reprocess batch started successfully');
      setIsExpanded(true);
    } catch (error) {
      console.error('[BatchPanel] Failed to start reprocess:', error);
      alert('Failed to start reprocess: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const isVideoFile = (filename: string): boolean => {
    const videoExtensions = ['.mov', '.mp4', '.m4v'];
    const lowerFilename = filename.toLowerCase();
    return videoExtensions.some(ext => lowerFilename.endsWith(ext));
  };

  const handleGenerateProxies = async () => {
    if (!window.electronAPI?.proxy) return;

    // Selection-aware video filtering (mirrors AI Process pattern)
    const allVideoFiles = availableFiles.filter(f => isVideoFile(f.filename));
    const selectedVideoFiles = selectedFileIds && selectedFileIds.size > 0
      ? allVideoFiles.filter(f => selectedFileIds.has(f.id))
      : allVideoFiles;

    if (selectedVideoFiles.length === 0) {
      alert('No video files available for proxy generation');
      return;
    }

    // Prompt user to select proxy output folder
    const proxyOutputFolder = await window.electronAPI.selectFolder(currentFolderPath);

    if (!proxyOutputFolder) {
      // User cancelled folder selection
      return;
    }

    try {
      // Extract filenames from file IDs
      const videoFilenames = selectedVideoFiles.map(f => f.filename);

      const result = await window.electronAPI.proxy.generateProxies({
        rawVideoFolder: currentFolderPath || '',
        proxyOutputFolder: proxyOutputFolder,
        videoFilenames: videoFilenames,
        proxyPresetId: settings.proxyPresetId, // Pass user-selected preset from context
      });

      // Build informative message showing all outcomes
      const totalFiles = videoFilenames.length;
      let message = `Proxy generation: ${result.completedCount}/${totalFiles} completed`;

      if (result.failedCount > 0) {
        message += `\n\n⚠️ ${result.failedCount} file(s) failed to transcode`;
      }

      if (result.verificationFailures && result.verificationFailures.length > 0) {
        message += `\n\n⚠️ ${result.verificationFailures.length} file(s) have EXIF timestamp issues (I1 compliance)`;
      }

      alert(message);
    } catch (error) {
      console.error('[BatchPanel] Failed to generate proxies:', error);
      alert('Failed to generate proxies: ' + (error instanceof Error ? error.message : 'Unknown error'));
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
    if (queueState.items.length === 0) return 0;
    const completed = queueState.items.filter(item =>
      item.status === 'completed' || item.status === 'error' || item.status === 'cancelled'
    ).length;
    return Math.round((completed / queueState.items.length) * 100);
  };

  const unprocessedCount = availableFiles.filter(f => !f.processedByAI).length;
  const totalFiles = availableFiles.length;

  // Selection-aware video count (mirrors AI Process pattern)
  const allVideoFiles = availableFiles.filter(f => isVideoFile(f.filename));
  const selectedVideoFiles = selectedFileIds && selectedFileIds.size > 0
    ? allVideoFiles.filter(f => selectedFileIds.has(f.id))
    : allVideoFiles;
  const videoCount = selectedVideoFiles.length;

  const isProcessing = queueState?.status === 'processing';
  const selectedCount = selectedFileIds?.size || 0;

  return (
    <div style={{
      backgroundColor: '#f9fafb',
      borderBottom: '1px solid #e5e7eb',
      padding: '16px',
    }}>
      {/* Action Buttons */}
      <BatchActionButtons
        isProcessing={isProcessing}
        selectedCount={selectedCount}
        unprocessedCount={unprocessedCount}
        totalFiles={totalFiles}
        videoCount={videoCount}
        onProcessSelected={handleProcessSelected}
        onStartBatch={handleStartBatch}
        onReprocess={handleReprocess}
        onGenerateProxies={handleGenerateProxies}
        onCancel={handleCancel}
      />

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

        {queueState.status !== 'idle' && (
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
      {isExpanded && queueState.items.length > 0 && (
        <BatchProgressDetails
          queueItems={queueState.items}
          queueStatus={queueState.status}
          currentProgress={currentProgress}
          progressPercentage={getProgressPercentage()}
        />
      )}

      {/* Proxy Generation Progress */}
      {proxyProgress && proxyProgress.type === 'transcode_progress' && (
        <ProxyProgressCard proxyProgress={proxyProgress} />
      )}
    </div>
  );
}
