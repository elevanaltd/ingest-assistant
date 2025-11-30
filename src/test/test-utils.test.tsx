import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from './test-utils';

describe('test-utils', () => {
  describe('renderWithProviders', () => {
    it('renders component wrapped in AppProviders', () => {
      const TestComponent = () => <div>Test component with providers</div>;

      renderWithProviders(<TestComponent />);

      expect(screen.getByText('Test component with providers')).toBeInTheDocument();
    });

    it('passes render options through to RTL render', () => {
      const TestComponent = () => <div>Component with container</div>;

      const { container } = renderWithProviders(<TestComponent />);

      expect(container).toBeDefined();
      expect(screen.getByText('Component with container')).toBeInTheDocument();
    });

    it('allows custom render options', () => {
      const TestComponent = () => <div data-testid="custom-test">Custom options test</div>;

      const result = renderWithProviders(<TestComponent />, {
        container: document.body,
      });

      expect(result.getByTestId('custom-test')).toBeInTheDocument();
    });
  });
});
