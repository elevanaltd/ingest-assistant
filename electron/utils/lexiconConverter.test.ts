import { describe, it, expect } from 'vitest';
import { convertToYAMLFormat, convertToUIFormat } from './lexiconConverter';
import type { Lexicon, LexiconConfig } from '../../src/types';

describe('lexiconConverter', () => {
  describe('convertToYAMLFormat', () => {
    it('converts UI config to YAML lexicon format', () => {
      const uiConfig: LexiconConfig = {
        termMappings: [
          { preferred: 'bin', excluded: 'trash, garbage' },
          { preferred: 'tap', excluded: 'faucet' },
        ],
        alwaysInclude: ['manufacturer', 'model'],
        customInstructions: 'Always include manufacturer',
      };

      const lexicon = convertToYAMLFormat(uiConfig);

      expect(lexicon.preferredTerms).toContain('bin');
      expect(lexicon.preferredTerms).toContain('tap');
      expect(lexicon.preferredTerms).toContain('manufacturer');
      expect(lexicon.preferredTerms).toContain('model');

      expect(lexicon.excludedTerms).toContain('trash');
      expect(lexicon.excludedTerms).toContain('garbage');
      expect(lexicon.excludedTerms).toContain('faucet');

      expect(lexicon.synonymMapping['trash']).toBe('bin');
      expect(lexicon.synonymMapping['faucet']).toBe('tap');

      expect(lexicon.customInstructions).toBe('Always include manufacturer');
    });

    it('handles empty mappings', () => {
      const uiConfig: LexiconConfig = {
        termMappings: [],
        alwaysInclude: [],
        customInstructions: '',
      };

      const lexicon = convertToYAMLFormat(uiConfig);

      expect(lexicon.preferredTerms).toEqual([]);
      expect(lexicon.excludedTerms).toEqual([]);
      expect(lexicon.synonymMapping).toEqual({});
      expect(lexicon.customInstructions).toBe('');
    });

    it('handles mappings with only preferred terms', () => {
      const uiConfig: LexiconConfig = {
        termMappings: [
          { preferred: 'bin', excluded: '' },
        ],
        alwaysInclude: [],
        customInstructions: '',
      };

      const lexicon = convertToYAMLFormat(uiConfig);

      expect(lexicon.preferredTerms).toContain('bin');
      expect(lexicon.excludedTerms).toEqual([]);
      expect(lexicon.synonymMapping).toEqual({});
    });

    it('handles mappings with multiple excluded terms', () => {
      const uiConfig: LexiconConfig = {
        termMappings: [
          { preferred: 'bin', excluded: 'trash, garbage, rubbish, waste' },
        ],
        alwaysInclude: [],
        customInstructions: '',
      };

      const lexicon = convertToYAMLFormat(uiConfig);

      expect(lexicon.excludedTerms).toContain('trash');
      expect(lexicon.excludedTerms).toContain('garbage');
      expect(lexicon.excludedTerms).toContain('rubbish');
      expect(lexicon.excludedTerms).toContain('waste');

      // First excluded term maps to preferred
      expect(lexicon.synonymMapping['trash']).toBe('bin');
    });

    it('trims whitespace from terms', () => {
      const uiConfig: LexiconConfig = {
        termMappings: [
          { preferred: '  bin  ', excluded: '  trash , garbage  ' },
        ],
        alwaysInclude: ['  manufacturer  ', '  model  '],
        customInstructions: '  some instructions  ',
      };

      const lexicon = convertToYAMLFormat(uiConfig);

      expect(lexicon.preferredTerms).toContain('bin');
      expect(lexicon.preferredTerms).toContain('manufacturer');
      expect(lexicon.preferredTerms).toContain('model');
      expect(lexicon.excludedTerms).toContain('trash');
      expect(lexicon.excludedTerms).toContain('garbage');
      expect(lexicon.customInstructions).toBe('some instructions');
    });
  });

  describe('convertToUIFormat', () => {
    it('converts YAML lexicon to UI config format', () => {
      const lexicon: Lexicon = {
        preferredTerms: ['bin', 'tap', 'manufacturer', 'model'],
        excludedTerms: ['trash', 'garbage', 'faucet'],
        synonymMapping: {
          'trash': 'bin',
          'faucet': 'tap',
        },
        customInstructions: 'Always include manufacturer',
      };

      const uiConfig = convertToUIFormat(lexicon);

      // Should have mappings for bin and tap
      const binMapping = uiConfig.termMappings.find(m => m.preferred === 'bin');
      expect(binMapping).toBeDefined();
      expect(binMapping?.excluded).toContain('trash');

      const tapMapping = uiConfig.termMappings.find(m => m.preferred === 'tap');
      expect(tapMapping).toBeDefined();
      expect(tapMapping?.excluded).toContain('faucet');

      // Terms not in synonym mapping should be in alwaysInclude
      expect(uiConfig.alwaysInclude).toContain('manufacturer');
      expect(uiConfig.alwaysInclude).toContain('model');

      expect(uiConfig.customInstructions).toBe('Always include manufacturer');

      // Should have empty row at the end
      const lastMapping = uiConfig.termMappings[uiConfig.termMappings.length - 1];
      expect(lastMapping.preferred).toBe('');
      expect(lastMapping.excluded).toBe('');
    });

    it('handles empty lexicon', () => {
      const lexicon: Lexicon = {
        preferredTerms: [],
        excludedTerms: [],
        synonymMapping: {},
      };

      const uiConfig = convertToUIFormat(lexicon);

      expect(uiConfig.termMappings).toHaveLength(1); // Just the empty row
      expect(uiConfig.termMappings[0]).toEqual({ preferred: '', excluded: '' });
      expect(uiConfig.alwaysInclude).toEqual([]);
      expect(uiConfig.customInstructions).toBe('');
    });

    it('groups multiple excluded terms for same preferred term', () => {
      const lexicon: Lexicon = {
        preferredTerms: ['bin'],
        excludedTerms: ['trash', 'garbage', 'rubbish'],
        synonymMapping: {
          'trash': 'bin',
          'garbage': 'bin',
          'rubbish': 'bin',
        },
      };

      const uiConfig = convertToUIFormat(lexicon);

      const binMapping = uiConfig.termMappings.find(m => m.preferred === 'bin');
      expect(binMapping).toBeDefined();
      expect(binMapping?.excluded.split(',').map(t => t.trim()).sort()).toEqual(['garbage', 'rubbish', 'trash']);
    });

    it('handles missing customInstructions', () => {
      const lexicon: Lexicon = {
        preferredTerms: [],
        excludedTerms: [],
        synonymMapping: {},
      };

      const uiConfig = convertToUIFormat(lexicon);
      expect(uiConfig.customInstructions).toBe('');
    });
  });

  describe('round-trip conversion', () => {
    it('preserves data through UI->YAML->UI conversion', () => {
      const original: LexiconConfig = {
        termMappings: [
          { preferred: 'bin', excluded: 'trash, garbage' },
          { preferred: 'tap', excluded: 'faucet' },
        ],
        alwaysInclude: ['manufacturer', 'model'],
        customInstructions: 'Include model numbers',
      };

      const lexicon = convertToYAMLFormat(original);
      const restored = convertToUIFormat(lexicon);

      // Remove empty row for comparison
      const restoredMappings = restored.termMappings.filter(
        m => m.preferred || m.excluded
      );

      expect(restoredMappings.length).toBe(2);
      expect(restored.alwaysInclude.sort()).toEqual(['manufacturer', 'model']);
      expect(restored.customInstructions).toBe('Include model numbers');
    });
  });
});
