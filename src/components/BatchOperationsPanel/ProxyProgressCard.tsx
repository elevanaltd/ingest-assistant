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
    <div style={{ marginTop: '12px', padding: '12px', backgroundColor: 'var(--color-info-bg)', borderRadius: '4px', border: '1px solid var(--color-info-border)' }}>
      <div style={{ fontSize: '13px', fontWeight: '500', marginBottom: '8px', color: 'var(--color-info-text)' }}>
        Generating Proxies: {proxyProgress.filename || 'N/A'}
      </div>
      <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '8px' }}>
        Progress: {proxyProgress.index || 0} / {proxyProgress.total || 0} videos ({proxyProgress.percentage || 0}%)
      </div>
      <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--color-border-subtle)', borderRadius: '4px', overflow: 'hidden' }}>
        <div style={{
          width: `${proxyProgress.percentage || 0}%`,
          height: '100%',
          backgroundColor: 'var(--color-accent)',
          transition: 'width 0.3s ease'
        }} />
      </div>
      {proxyProgress.timeString && (
        <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
          Encoding: {proxyProgress.percentage || 0}% | ETA: {proxyProgress.timeString}
        </div>
      )}
    </div>
  );
}
