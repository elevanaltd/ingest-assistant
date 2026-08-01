import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const css = readFileSync(resolve(__dirname, 'index.css'), 'utf-8');

/**
 * Parses a `--color-*: value;` declaration block into a token -> value map.
 */
function parseTokens(block: string): Map<string, string> {
  const tokens = new Map<string, string>();
  const declRe = /(--color-[\w-]+):\s*([^;]+);/g;
  let match: RegExpExecArray | null;
  while ((match = declRe.exec(block)) !== null) {
    tokens.set(match[1], match[2].trim());
  }
  return tokens;
}

// Light block: the first top-level `:root { ... }`, before the dark media query.
const lightBlockMatch = css.match(/:root\s*{([^}]*)}/);
if (!lightBlockMatch) {
  throw new Error('Could not find :root block in index.css');
}
const lightTokens = parseTokens(lightBlockMatch[1]);

// Dark block: the `:root { ... }` nested inside @media (prefers-color-scheme: dark).
const darkMediaMatch = css.match(/@media \(prefers-color-scheme: dark\)\s*{\s*:root\s*{([^}]*)}/);
if (!darkMediaMatch) {
  throw new Error('Could not find @media (prefers-color-scheme: dark) :root block in index.css');
}
const darkTokens = parseTokens(darkMediaMatch[1]);

// Derived from the CSS itself (not hand-picked) so every token that exists is
// covered automatically, and new tokens can't silently ship without a dark
// override just because a hardcoded list wasn't updated.
const ALL_TOKENS = [...lightTokens.keys()];

describe('theme tokens (src/index.css)', () => {
  it('declares color-scheme: light dark so the OS preference is honored', () => {
    expect(css).toMatch(/color-scheme:\s*light dark/);
  });

  it('defines at least one color token on :root', () => {
    expect(ALL_TOKENS.length).toBeGreaterThan(0);
  });

  it.each(ALL_TOKENS)('overrides %s inside the prefers-color-scheme: dark query', (token) => {
    expect(darkTokens.has(token)).toBe(true);
  });

  it.each(ALL_TOKENS)('gives %s a different value in dark mode than in light mode', (token) => {
    // Guards against a copy-pasted dark override that defines the token but
    // leaves it visually identical to light (dark mode that doesn't change anything).
    expect(darkTokens.get(token)).not.toBe(lightTokens.get(token));
  });
});
