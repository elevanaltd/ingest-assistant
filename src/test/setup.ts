import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// ---------------------------------------------------------------------------
// Console noise suppression
// ---------------------------------------------------------------------------
// Known acceptable warnings that flood test output and mask real regressions.
// Each entry is a substring match against the first argument of console calls.
//
// IMPORTANT: Be conservative when adding patterns. Only add warnings that are:
// 1. Known to be harmless in the test environment
// 2. Consistently noisy across multiple test files
// 3. Not indicative of actual bugs
// ---------------------------------------------------------------------------

const ALLOWLISTED_ERROR_PATTERNS: string[] = [
  // React act() warnings from async state updates in component tests.
  // These are well-known testing artifacts, not real bugs.
  'inside a test was not wrapped in act(...)',
];

const ALLOWLISTED_WARN_PATTERNS: string[] = [
  // Context provider warnings when IPC bridge is unavailable in test env.
  // These fire because Electron IPC is not available in jsdom.
  '[CfexTransferContext] loadConfig not available',
  '[CfexTransferContext] cfex.onTransferProgress not available',
];

function isAllowlisted(args: unknown[], patterns: string[]): boolean {
  if (args.length === 0) return false;
  const message = String(args[0]);
  return patterns.some((pattern) => message.includes(pattern));
}

// Preserve originals for passthrough and test verification
const originalError = console.error;
const originalWarn = console.warn;

// Expose originals and marker for test verification (see console-interception.test.ts)
(console as Console & { __testIntercepted: boolean }).__testIntercepted = true;
(console as Console & { __originalError: typeof console.error }).__originalError =
  originalError;
(console as Console & { __originalWarn: typeof console.warn }).__originalWarn =
  originalWarn;

// Install interceptors
console.error = (...args: unknown[]) => {
  if (isAllowlisted(args, ALLOWLISTED_ERROR_PATTERNS)) {
    return; // Suppress known noise
  }
  // Flag unexpected errors so they stand out in output
  (console as Console & { __originalError: typeof console.error }).__originalError(
    '[UNEXPECTED console.error]',
    ...args
  );
};

console.warn = (...args: unknown[]) => {
  if (isAllowlisted(args, ALLOWLISTED_WARN_PATTERNS)) {
    return; // Suppress known noise
  }
  // Flag unexpected warnings so they stand out in output
  (console as Console & { __originalWarn: typeof console.warn }).__originalWarn(
    '[UNEXPECTED console.warn]',
    ...args
  );
};

// ---------------------------------------------------------------------------
// Test cleanup
// ---------------------------------------------------------------------------

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Extend Vitest's expect with custom matchers
// @testing-library/jest-dom matchers are now available
