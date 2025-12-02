/**
 * ProxyProgressCard Component
 *
 * Purpose: Render proxy generation progress card
 * Extracted from: BatchOperationsPanel (lines ~569-592)
 *
 * Features:
 * - Proxy progress bar with percentage
 * - Current filename
 * - Progress count (X / Y videos)
 * - ETA display
 */

interface ProxyProgressCardProps {
  /** Proxy generation progress state */
  proxyProgress: {
    type: string;
    filename?: string;
    index?: number;
    total?: number;
    percentage?: number;
    timeString?: string;
  };
}

export function ProxyProgressCard({ proxyProgress }: ProxyProgressCardProps) {
  return (
    <div style={{ marginTop: '12px', padding: '12px', backgroundColor: '#f0f9ff', borderRadius: '4px', border: '1px solid #bfdbfe' }}>
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
  );
}
