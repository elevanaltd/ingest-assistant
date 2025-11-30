import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { AppProviders } from './AppProviders';

describe('AppProviders', () => {
  it('renders children components', () => {
    render(
      <AppProviders>
        <div>Test child content</div>
      </AppProviders>
    );

    expect(screen.getByText('Test child content')).toBeInTheDocument();
  });

  it('provides a stable provider tree that never unmounts during navigation', () => {
    // This test documents the IPC Singleton Safety requirement (Condition B)
    // AppProviders should be mounted at App root and remain stable
    const { rerender } = render(
      <AppProviders>
        <div>Initial content</div>
      </AppProviders>
    );

    // Simulate navigation by changing children
    rerender(
      <AppProviders>
        <div>New route content</div>
      </AppProviders>
    );

    expect(screen.getByText('New route content')).toBeInTheDocument();
  });

  it('handles missing window.electronAPI gracefully for browser dev mode', () => {
    // This test documents the Safe Fallback requirement (Condition C)
    // Delete window.electronAPI to simulate browser environment
    const originalElectronAPI = (window as any).electronAPI;

    try {
      delete (window as any).electronAPI;

      // Should not throw error
      expect(() => {
        render(
          <AppProviders>
            <div>Browser mode content</div>
          </AppProviders>
        );
      }).not.toThrow();

      expect(screen.getByText('Browser mode content')).toBeInTheDocument();
    } finally {
      // Guaranteed restoration to prevent test pollution
      if (originalElectronAPI) {
        (window as any).electronAPI = originalElectronAPI;
      }
    }
  });
});
