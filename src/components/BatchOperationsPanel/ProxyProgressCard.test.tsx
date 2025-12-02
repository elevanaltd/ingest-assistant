import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProxyProgressCard } from './ProxyProgressCard';

/**
 * TDD RED Phase: ProxyProgressCard component tests
 *
 * Purpose: Extract proxy progress card from BatchOperationsPanel
 * Scope: Lines ~569-592 (proxy generation progress)
 *
 * Features:
 * - Proxy progress bar with percentage
 * - Current filename
 * - Progress count (X / Y videos)
 * - ETA display
 */

describe('ProxyProgressCard', () => {
  it('should render proxy generation progress with filename', () => {
    const proxyProgress = {
      type: 'transcode_progress' as const,
      filename: 'EA001621.MOV',
      index: 12,
      total: 58,
      percentage: 45,
      timeString: '2m 30s',
    };

    render(<ProxyProgressCard proxyProgress={proxyProgress} />);

    expect(screen.getByText(/Generating Proxies:/)).toBeInTheDocument();
    expect(screen.getByText(/EA001621\.MOV/)).toBeInTheDocument();
  });

  it('should render progress count', () => {
    const proxyProgress = {
      type: 'transcode_progress' as const,
      filename: 'EA001621.MOV',
      index: 12,
      total: 58,
      percentage: 45,
      timeString: '2m 30s',
    };

    render(<ProxyProgressCard proxyProgress={proxyProgress} />);

    expect(screen.getByText(/Progress:.*12.*58.*videos/)).toBeInTheDocument();
  });

  it('should render percentage in progress count', () => {
    const proxyProgress = {
      type: 'transcode_progress' as const,
      filename: 'EA001621.MOV',
      index: 12,
      total: 58,
      percentage: 45,
      timeString: '2m 30s',
    };

    render(<ProxyProgressCard proxyProgress={proxyProgress} />);

    expect(screen.getByText(/Progress:.*45%/)).toBeInTheDocument();
  });

  it('should render ETA when timeString is provided', () => {
    const proxyProgress = {
      type: 'transcode_progress' as const,
      filename: 'EA001621.MOV',
      index: 12,
      total: 58,
      percentage: 45,
      timeString: '2m 30s',
    };

    render(<ProxyProgressCard proxyProgress={proxyProgress} />);

    expect(screen.getByText(/Encoding:.*45%/)).toBeInTheDocument();
    expect(screen.getByText(/ETA:.*2m 30s/)).toBeInTheDocument();
  });

  it('should NOT render ETA when timeString is missing', () => {
    const proxyProgress = {
      type: 'transcode_progress' as const,
      filename: 'EA001621.MOV',
      index: 12,
      total: 58,
      percentage: 45,
    };

    render(<ProxyProgressCard proxyProgress={proxyProgress} />);

    expect(screen.queryByText(/ETA:/)).not.toBeInTheDocument();
  });

  it('should handle missing optional fields gracefully', () => {
    const proxyProgress = {
      type: 'transcode_progress' as const,
    };

    render(<ProxyProgressCard proxyProgress={proxyProgress} />);

    expect(screen.getByText(/Generating Proxies:/)).toBeInTheDocument();
    expect(screen.getByText(/N\/A/)).toBeInTheDocument(); // filename fallback
    expect(screen.getByText(/Progress:.*0.*0.*videos/)).toBeInTheDocument();
  });

  it('should render progress bar with correct width', () => {
    const proxyProgress = {
      type: 'transcode_progress' as const,
      filename: 'EA001621.MOV',
      index: 12,
      total: 58,
      percentage: 45,
    };

    const { container } = render(<ProxyProgressCard proxyProgress={proxyProgress} />);

    // Find progress bar fill (has width style)
    const progressBar = container.querySelector('[style*="width: 45%"]');
    expect(progressBar).toBeInTheDocument();
    expect(progressBar).toHaveStyle({ backgroundColor: '#3b82f6' }); // blue
  });
});
