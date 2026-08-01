import './MediaViewer.css';

export interface MediaViewerProps {
  fileType: 'image' | 'video';
  filename: string;
  mediaDataUrl: string;
  isLoadingMedia: boolean;
  codecWarning: string;
  transcodeProgress: string;
  transcodePercentage: number;
}

export function MediaViewer({
  fileType,
  filename,
  mediaDataUrl,
  isLoadingMedia,
  codecWarning,
  transcodeProgress,
  transcodePercentage,
}: MediaViewerProps) {
  return (
    <div className="viewer">
      {mediaDataUrl ? (
        fileType === 'image' ? (
          <img
            src={mediaDataUrl}
            alt={filename}
            className="media-preview"
          />
        ) : (
          <video
            src={mediaDataUrl}
            controls
            className="media-preview"
            onLoadStart={() => console.log('[Video] Load started')}
            onLoadedMetadata={() => console.log('[Video] Metadata loaded')}
            onLoadedData={() => console.log('[Video] Data loaded')}
            onCanPlay={() => console.log('[Video] Can play')}
            onError={(e) => {
              console.error('[Video] Error event:', e);
              const video = e.currentTarget;
              console.error('[Video] Error details:', {
                error: video.error,
                code: video.error?.code,
                message: video.error?.message,
                src: video.src?.replace(/([?&])token=[^&]*/g, '$1token=[REDACTED]'),
                networkState: video.networkState,
                readyState: video.readyState
              });
            }}
          />
        )
      ) : (
        <div style={{ color: '#999' }}>Loading media...</div>
      )}

      {/* Loading overlay with dim effect and progress */}
      {isLoadingMedia && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)', // Safari support
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px',
          zIndex: 10
        }}>
          {/* Spinner */}
          <div style={{
            border: '4px solid rgba(255, 255, 255, 0.3)',
            borderTop: '4px solid #fff',
            borderRadius: '50%',
            width: '48px',
            height: '48px',
            animation: 'spin 1s linear infinite'
          }} />

          {/* Progress text */}
          <div style={{
            color: '#fff',
            fontSize: '14px',
            fontWeight: 500,
            textShadow: '0 1px 3px rgba(0,0,0,0.5)'
          }}>
            {transcodeProgress ? `Transcoding: ${transcodePercentage}%` : 'Loading...'}
          </div>

          {/* Progress bar */}
          {transcodeProgress && (
            <div style={{
              width: '200px',
              height: '4px',
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              borderRadius: '2px',
              overflow: 'hidden'
            }}>
              <div style={{
                height: '100%',
                backgroundColor: '#fff',
                width: '100%',
                animation: 'progress-slide 1.5s ease-in-out infinite'
              }} />
            </div>
          )}
        </div>
      )}

      {/* Codec warning display */}
      {codecWarning && (
        <div style={{
          position: 'absolute',
          bottom: '10px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: 'var(--color-warning-bg)',
          border: '1px solid var(--color-warning)',
          borderRadius: '4px',
          padding: '6px 12px',
          color: 'var(--color-warning-text)',
          fontSize: '13px',
          whiteSpace: 'nowrap',
          zIndex: 20
        }}>
          {codecWarning}
        </div>
      )}
    </div>
  );
}
