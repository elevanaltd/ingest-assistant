/**
 * Test Utilities
 *
 * Custom testing helpers that wrap components with all necessary providers.
 * Based on React Testing Library's recommended pattern for custom render functions.
 *
 * @see https://testing-library.com/docs/react-testing-library/setup#custom-render
 */

import { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { AppProviders } from '../providers/AppProviders';

/**
 * Custom render function that wraps components with AppProviders
 *
 * Usage:
 * ```tsx
 * import { renderWithProviders } from '@/test/test-utils';
 *
 * test('renders component', () => {
 *   renderWithProviders(<MyComponent />);
 *   // ... assertions
 * });
 * ```
 */
export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  return render(ui, { wrapper: AppProviders, ...options });
}

// Re-export everything from React Testing Library
export * from '@testing-library/react';

// Override render with our custom renderWithProviders
export { renderWithProviders as render };
