import { describe, it, expect } from 'vitest';
import packageJson from '../../package.json';

describe('Dependency Version Requirements', () => {
  describe('React Security Patches', () => {
    it('should use React 19.2.1 or later (security: RCE fix in RSC)', () => {
      const reactVersion = packageJson.dependencies.react;

      // Extract major.minor.patch from version string (handles ^, ~, or exact)
      const versionMatch = reactVersion.match(/(\d+)\.(\d+)\.(\d+)/);
      expect(versionMatch).toBeTruthy();

      if (versionMatch) {
        const [, major, minor, patch] = versionMatch;
        const numericVersion = parseInt(major) * 10000 + parseInt(minor) * 100 + parseInt(patch);
        const requiredVersion = 19 * 10000 + 2 * 100 + 1; // 19.2.1

        expect(numericVersion).toBeGreaterThanOrEqual(requiredVersion);
      }
    });

    it('should use react-dom 19.2.1 or later matching React version', () => {
      const reactVersion = packageJson.dependencies.react;
      const reactDomVersion = packageJson.dependencies['react-dom'];

      // Extract full version for ReactDOM (handles ^, ~, or exact)
      const reactDomMatch = reactDomVersion.match(/(\d+)\.(\d+)\.(\d+)/);
      expect(reactDomMatch).toBeTruthy();

      if (reactDomMatch) {
        const [, major, minor, patch] = reactDomMatch;
        const numericVersion = parseInt(major) * 10000 + parseInt(minor) * 100 + parseInt(patch);
        const requiredVersion = 19 * 10000 + 2 * 100 + 1; // 19.2.1

        // Enforce ReactDOM >= 19.2.1 (same security patch as React)
        expect(numericVersion).toBeGreaterThanOrEqual(requiredVersion);
      }

      // Ensure React and ReactDOM versions match exactly (lockstep for render/runtime)
      const reactMatch = reactVersion.match(/(\d+)\.(\d+)\.(\d+)/);
      if (reactMatch && reactDomMatch) {
        expect(reactDomMatch[0]).toBe(reactMatch[0]); // Full version match
      }
    });
  });
});
