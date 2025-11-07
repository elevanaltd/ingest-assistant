import { describe, it, expect } from 'vitest';
import { convertToYAMLFormat, convertToUIFormat } from './lexiconConverter';
import type { Lexicon, LexiconConfig } from '../../src/types';

describe('lexiconConverter', () => {
  describe('convertToYAMLFormat', () => {
    it('converts UI config to YAML lexicon format', () => {
      const uiConfig: LexiconConfig = {
        pattern: '{location}-{subject}-{action}-{shotType}',
        commonLocations: 'kitchen, hall, utility',
        commonSubjects: 'oven, sink, tap, dishwasher',
        commonActions: 'cleaning, installing, replacing',
        wordPreferences: 'faucet → tap\nstove → hob',
        aiInstructions: 'Use lowercase. Hyphens for multi-word terms. Photos: 3-part pattern. Videos: 4-part pattern with action.',
        goodExamples: 'kitchen-oven-CU\nkitchen-dishwasher-cleaning-MID',
        badExamples: 'Kitchen-Oven-CU (mixed case)\nkitchen-fridge freezer-CU (missing hyphen)',
      };

      const lexicon = convertToYAMLFormat(uiConfig);

      expect(lexicon.pattern).toBe('{location}-{subject}-{action}-{shotType}');
      expect(lexicon.commonLocations).toEqual(['kitchen', 'hall', 'utility']);
      expect(lexicon.commonSubjects).toEqual(['oven', 'sink', 'tap', 'dishwasher']);
      expect(lexicon.commonActions).toEqual(['cleaning', 'installing', 'replacing']);
      expect(lexicon.wordPreferences).toEqual({ faucet: 'tap', stove: 'hob' });
      expect(lexicon.aiInstructions).toBe('Use lowercase. Hyphens for multi-word terms. Photos: 3-part pattern. Videos: 4-part pattern with action.');
      expect(lexicon.goodExamples).toEqual(['kitchen-oven-CU', 'kitchen-dishwasher-cleaning-MID']);
      expect(lexicon.badExamples).toEqual([
        { wrong: 'Kitchen-Oven-CU', reason: 'mixed case' },
        { wrong: 'kitchen-fridge freezer-CU', reason: 'missing hyphen' },
      ]);
    });

    it('handles empty fields', () => {
      const uiConfig: LexiconConfig = {
        pattern: '',
        commonLocations: '',
        commonSubjects: '',
        commonActions: '',
        wordPreferences: '',
        aiInstructions: '',
        goodExamples: '',
        badExamples: '',
      };

      const lexicon = convertToYAMLFormat(uiConfig);

      expect(lexicon.pattern).toBe('');
      expect(lexicon.commonLocations).toEqual([]);
      expect(lexicon.commonSubjects).toEqual([]);
      expect(lexicon.commonActions).toEqual([]);
      expect(lexicon.wordPreferences).toEqual({});
      expect(lexicon.aiInstructions).toBe('');
      expect(lexicon.goodExamples).toEqual([]);
      expect(lexicon.badExamples).toEqual([]);
    });

    it('trims whitespace from comma-separated values', () => {
      const uiConfig: LexiconConfig = {
        pattern: '  {location}-{subject}  ',
        commonLocations: '  kitchen ,  hall  , utility  ',
        commonSubjects: '  oven  ,sink,  tap  ',
        commonActions: '  cleaning  ,  installing  ',
        wordPreferences: '',
        aiInstructions: '',
        goodExamples: '',
        badExamples: '',
      };

      const lexicon = convertToYAMLFormat(uiConfig);

      expect(lexicon.pattern).toBe('{location}-{subject}');
      expect(lexicon.commonLocations).toEqual(['kitchen', 'hall', 'utility']);
      expect(lexicon.commonSubjects).toEqual(['oven', 'sink', 'tap']);
      expect(lexicon.commonActions).toEqual(['cleaning', 'installing']);
    });

    it('handles word preferences with various arrow styles', () => {
      const uiConfig: LexiconConfig = {
        pattern: '',
        commonLocations: '',
        commonSubjects: '',
        commonActions: '',
        wordPreferences: 'faucet → tap\nstove->hob\ntrash  →  bin',
        aiInstructions: '',
        goodExamples: '',
        badExamples: '',
      };

      const lexicon = convertToYAMLFormat(uiConfig);

      expect(lexicon.wordPreferences).toEqual({
        faucet: 'tap',
        stove: 'hob',
        trash: 'bin',
      });
    });

    it('parses bad examples with parenthetical reasons', () => {
      const uiConfig: LexiconConfig = {
        pattern: '',
        commonLocations: '',
        commonSubjects: '',
        commonActions: '',
        wordPreferences: '',
        aiInstructions: '',
        goodExamples: '',
        badExamples: 'Kitchen-Oven-CU (wrong: mixed case)\nkitchen_oven_CU(underscores)',
      };

      const lexicon = convertToYAMLFormat(uiConfig);

      expect(lexicon.badExamples).toEqual([
        { wrong: 'Kitchen-Oven-CU', reason: 'wrong: mixed case' },
        { wrong: 'kitchen_oven_CU', reason: 'underscores' },
      ]);
    });
  });

  describe('convertToUIFormat', () => {
    it('converts YAML lexicon to UI config format', () => {
      const lexicon: Lexicon = {
        pattern: '{location}-{subject}-{action}-{shotType}',
        commonLocations: ['kitchen', 'hall', 'utility'],
        commonSubjects: ['oven', 'sink', 'tap', 'dishwasher'],
        commonActions: ['cleaning', 'installing'],
        wordPreferences: { faucet: 'tap', stove: 'hob' },
        aiInstructions: 'Use lowercase. Photos: 3-part. Videos: 4-part with action.',
        goodExamples: ['kitchen-oven-CU', 'kitchen-dishwasher-cleaning-MID'],
        badExamples: [
          { wrong: 'Kitchen-Oven-CU', reason: 'mixed case' },
          { wrong: 'kitchen_oven_CU', reason: 'underscores' },
        ],
      };

      const uiConfig = convertToUIFormat(lexicon);

      expect(uiConfig.pattern).toBe('{location}-{subject}-{action}-{shotType}');
      expect(uiConfig.commonLocations).toBe('kitchen, hall, utility');
      expect(uiConfig.commonSubjects).toBe('oven, sink, tap, dishwasher');
      expect(uiConfig.commonActions).toBe('cleaning, installing');
      expect(uiConfig.wordPreferences).toBe('faucet → tap\nstove → hob');
      expect(uiConfig.aiInstructions).toBe('Use lowercase. Photos: 3-part. Videos: 4-part with action.');
      expect(uiConfig.goodExamples).toBe('kitchen-oven-CU\nkitchen-dishwasher-cleaning-MID');
      expect(uiConfig.badExamples).toBe('Kitchen-Oven-CU (mixed case)\nkitchen_oven_CU (underscores)');
    });

    it('handles empty lexicon', () => {
      const lexicon: Lexicon = {};

      const uiConfig = convertToUIFormat(lexicon);

      expect(uiConfig.pattern).toBe('');
      expect(uiConfig.commonLocations).toBe('');
      expect(uiConfig.commonSubjects).toBe('');
      expect(uiConfig.commonActions).toBe('');
      expect(uiConfig.wordPreferences).toBe('');
      expect(uiConfig.aiInstructions).toBe('');
      expect(uiConfig.goodExamples).toBe('');
      expect(uiConfig.badExamples).toBe('');
    });

    it('handles lexicon with only some fields', () => {
      const lexicon: Lexicon = {
        commonLocations: ['kitchen'],
        commonActions: ['cleaning'],
        wordPreferences: { faucet: 'tap' },
      };

      const uiConfig = convertToUIFormat(lexicon);

      expect(uiConfig.pattern).toBe('');
      expect(uiConfig.commonLocations).toBe('kitchen');
      expect(uiConfig.commonSubjects).toBe('');
      expect(uiConfig.commonActions).toBe('cleaning');
      expect(uiConfig.wordPreferences).toBe('faucet → tap');
      expect(uiConfig.goodExamples).toBe('');
    });
  });

  describe('round-trip conversion', () => {
    it('preserves data through UI->YAML->UI conversion', () => {
      const original: LexiconConfig = {
        pattern: '{location}-{subject}-{action}-{shotType}',
        commonLocations: 'kitchen, hall',
        commonSubjects: 'oven, sink, dishwasher',
        commonActions: 'cleaning, installing',
        wordPreferences: 'faucet → tap\nstove → hob',
        aiInstructions: 'Use lowercase. Photos: 3-part. Videos: 4-part.',
        goodExamples: 'kitchen-oven-CU\nkitchen-dishwasher-cleaning-MID',
        badExamples: 'Kitchen-Oven-CU (mixed case)',
      };

      const lexicon = convertToYAMLFormat(original);
      const restored = convertToUIFormat(lexicon);

      expect(restored.pattern).toBe(original.pattern);
      expect(restored.commonLocations).toBe(original.commonLocations);
      expect(restored.commonSubjects).toBe(original.commonSubjects);
      expect(restored.commonActions).toBe(original.commonActions);
      expect(restored.wordPreferences).toBe(original.wordPreferences);
      expect(restored.aiInstructions).toBe(original.aiInstructions);
      expect(restored.goodExamples).toBe(original.goodExamples);
      expect(restored.badExamples).toBe(original.badExamples);
    });
  });
});
