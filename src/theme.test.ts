import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const css = readFileSync(resolve(__dirname, 'index.css'), 'utf-8');

const CORE_TOKENS = [
  '--color-bg',
  '--color-surface',
  '--color-border',
  '--color-text',
  '--color-text-secondary',
  '--color-accent',
  '--color-danger-bg',
  '--color-success-bg',
  '--color-warning-bg',
  '--color-info-bg',
];

describe('theme tokens (src/index.css)', () => {
  it('declares color-scheme: light dark so the OS preference is honored', () => {
    expect(css).toMatch(/color-scheme:\s*light dark/);
  });

  it('defines every core color token on :root (light values)', () => {
    const rootBlock = css.slice(0, css.indexOf('@media'));
    for (const token of CORE_TOKENS) {
      expect(rootBlock).toContain(`${token}:`);
    }
  });

  it('overrides every core color token inside a prefers-color-scheme: dark query', () => {
    const darkMatch = css.match(/@media \(prefers-color-scheme: dark\)\s*{([\s\S]*)}\s*}/);
    expect(darkMatch).not.toBeNull();
    const darkBlock = darkMatch![1];
    for (const token of CORE_TOKENS) {
      expect(darkBlock).toContain(`${token}:`);
    }
  });
});
