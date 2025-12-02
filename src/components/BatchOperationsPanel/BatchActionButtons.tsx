/**
 * BatchActionButtons Component
 *
 * Purpose: Render batch operation action buttons
 * Extracted from: BatchOperationsPanel (lines ~319-437)
 *
 * Features:
 * - Conditional rendering based on processing state
 * - "Process Selected" vs regular batch button logic
 * - Reprocess button
 * - Generate Proxies button
 * - Cancel button
 */

interface BatchActionButtonsProps {
  /** Whether batch processing is currently running */
  isProcessing: boolean;
  /** Number of selected files (0 = no selection) */
  selectedCount: number;
  /** Number of unprocessed files */
  unprocessedCount: number;
  /** Total number of files in folder */
  totalFiles: number;
  /** Number of video files (for proxy generation) */
  videoCount: number;
  /** Callback when "Process Selected" button clicked */
  onProcessSelected: () => void;
  /** Callback when regular batch process button clicked */
  onStartBatch: () => void;
  /** Callback when reprocess button clicked */
  onReprocess: (e: React.MouseEvent) => void;
  /** Callback when generate proxies button clicked */
  onGenerateProxies: () => void;
  /** Callback when cancel button clicked */
  onCancel: () => void;
}

export function BatchActionButtons({
  isProcessing,
  selectedCount,
  unprocessedCount,
  totalFiles,
  videoCount,
  onProcessSelected,
  onStartBatch,
  onReprocess,
  onGenerateProxies,
  onCancel,
}: BatchActionButtonsProps) {
  const hasSelection = selectedCount > 0;

  return (
    <>
      {/* Action Buttons - At Top */}
      {!isProcessing && (
        <>
          {/* Show "Process Selected" button when files are selected, otherwise show regular batch button */}
          {hasSelection ? (
            <button
              onClick={onProcessSelected}
              style={{
                width: '100%',
                padding: '10px 16px',
                fontSize: '14px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: '#3b82f6',
                color: 'white',
                cursor: 'pointer',
                fontWeight: '600',
                marginBottom: '8px',
              }}
            >
              {`Process Selected ${selectedCount} File${selectedCount !== 1 ? 's' : ''}`}
            </button>
          ) : (
            <button
              onClick={onStartBatch}
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
                ? `AI Process First 100 Files`
                : unprocessedCount > 0
                ? `AI Process ${unprocessedCount} File${unprocessedCount !== 1 ? 's' : ''}`
                : 'No Files to Process'
              }
            </button>
          )}

          {totalFiles > 0 && (
            <button
              onClick={onReprocess}
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
                marginBottom: '8px',
                position: 'relative',
                zIndex: 1,
              }}
            >
              {totalFiles > 100
                ? `AI Reprocess First 100 Files`
                : `AI Reprocess All ${totalFiles} File${totalFiles !== 1 ? 's' : ''}`
              }
            </button>
          )}

          {/* Generate Proxies Button (B2.7_04) */}
          <button
            onClick={onGenerateProxies}
            disabled={videoCount === 0}
            style={{
              width: '100%',
              padding: '10px 16px',
              fontSize: '14px',
              borderRadius: '6px',
              border: '1px solid #9ca3af',
              backgroundColor: videoCount > 0 ? 'white' : '#e5e7eb',
              color: videoCount > 0 ? '#374151' : '#9ca3af',
              cursor: videoCount > 0 ? 'pointer' : 'not-allowed',
              fontWeight: '600',
              marginBottom: '16px',
            }}
          >
            {videoCount > 0
              ? `Generate Proxies for ${videoCount} Video${videoCount !== 1 ? 's' : ''}`
              : 'No Videos to Process'
            }
          </button>
        </>
      )}

      {isProcessing && (
        <button
          onClick={onCancel}
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
    </>
  );
}
