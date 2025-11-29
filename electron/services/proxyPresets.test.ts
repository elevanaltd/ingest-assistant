import { describe, it, expect } from 'vitest';
import { getPresetById, PROXY_PRESETS } from './proxyPresets';

/**
 * ProxyPresets Tests (Configurable Proxy Formats)
 *
 * TDD Workflow: RED Phase
 * Tests written BEFORE implementation (Constitutional compliance).
 *
 * Critical Paths:
 * 1. Preset lookup by ID returns correct configuration
 * 2. All 5 presets defined with correct parameters
 * 3. Default preset is '2k-prores-proxy'
 * 4. Extension tied to codec (ProRes → .MOV, H.264 → .mp4)
 */

describe('ProxyPresets', () => {
  describe('PROXY_PRESETS constant', () => {
    it('should define exactly 5 presets', () => {
      expect(PROXY_PRESETS).toHaveLength(5);
    });

    it('should include 2K ProRes Proxy preset (recommended default)', () => {
      const preset = PROXY_PRESETS.find(p => p.id === '2k-prores-proxy');

      expect(preset).toBeDefined();
      expect(preset?.name).toBe('2K ProRes Proxy (Recommended)');
      expect(preset?.codec).toBe('prores_ks');
      expect(preset?.profile).toBe(0);
      expect(preset?.scale).toBe('2560:1440');
      expect(preset?.extension).toBe('.MOV');
      expect(preset?.description).toContain('Sweet spot');
    });

    it('should include 1080p ProRes Proxy preset', () => {
      const preset = PROXY_PRESETS.find(p => p.id === '1080p-prores-proxy');

      expect(preset).toBeDefined();
      expect(preset?.name).toBe('1080p ProRes Proxy');
      expect(preset?.codec).toBe('prores_ks');
      expect(preset?.profile).toBe(0);
      expect(preset?.scale).toBe('1920:1080');
      expect(preset?.extension).toBe('.MOV');
    });

    it('should include 4K ProRes Proxy preset', () => {
      const preset = PROXY_PRESETS.find(p => p.id === '4k-prores-proxy');

      expect(preset).toBeDefined();
      expect(preset?.name).toBe('4K ProRes Proxy');
      expect(preset?.codec).toBe('prores_ks');
      expect(preset?.profile).toBe(0);
      expect(preset?.scale).toBeNull(); // Keep original 4K resolution
      expect(preset?.extension).toBe('.MOV');
    });

    it('should include 2K H.264 CRF23 preset', () => {
      const preset = PROXY_PRESETS.find(p => p.id === '2k-h264-crf23');

      expect(preset).toBeDefined();
      expect(preset?.name).toBe('2K H.264 (Small Files)');
      expect(preset?.codec).toBe('libx264');
      expect(preset?.crf).toBe(23);
      expect(preset?.scale).toBe('2560:1440');
      expect(preset?.extension).toBe('.mp4');
    });

    it('should include 1080p H.264 CRF18 preset', () => {
      const preset = PROXY_PRESETS.find(p => p.id === '1080p-h264-crf18');

      expect(preset).toBeDefined();
      expect(preset?.name).toBe('1080p H.264 HQ (Smallest)');
      expect(preset?.codec).toBe('libx264');
      expect(preset?.crf).toBe(18);
      expect(preset?.scale).toBe('1920:1080');
      expect(preset?.extension).toBe('.mp4');
    });

    it('should enforce extension matches codec (ProRes → .MOV, H.264 → .mp4)', () => {
      PROXY_PRESETS.forEach(preset => {
        if (preset.codec === 'prores_ks') {
          expect(preset.extension).toBe('.MOV');
        } else if (preset.codec === 'libx264') {
          expect(preset.extension).toBe('.mp4');
        }
      });
    });
  });

  describe('getPresetById', () => {
    it('should return correct preset for valid ID', () => {
      const preset = getPresetById('2k-prores-proxy');

      expect(preset.id).toBe('2k-prores-proxy');
      expect(preset.codec).toBe('prores_ks');
    });

    it('should return default (2k-prores-proxy) for invalid ID', () => {
      const preset = getPresetById('nonexistent-preset');

      expect(preset.id).toBe('2k-prores-proxy');
      expect(preset.name).toContain('Recommended');
    });

    it('should return default (2k-prores-proxy) for undefined ID', () => {
      const preset = getPresetById(undefined as any);

      expect(preset.id).toBe('2k-prores-proxy');
    });

    it('should return default (2k-prores-proxy) for empty string', () => {
      const preset = getPresetById('');

      expect(preset.id).toBe('2k-prores-proxy');
    });
  });
});
