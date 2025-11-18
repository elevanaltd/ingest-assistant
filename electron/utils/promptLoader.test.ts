import { describe, it, expect, beforeEach } from 'vitest';
import { PromptLoader } from './promptLoader';
import type { Lexicon } from '../../src/types';

// Test interface to access private methods
interface PromptLoaderTestInterface {
  replaceVariables: (template: string, lexicon: Lexicon) => string;
}

describe('PromptLoader', () => {
  beforeEach(() => {
    // Clear cache before each test
    PromptLoader.clearCache();
  });

  describe('replaceVariables', () => {
    it('replaces {{actions}} variable with comma-separated common actions', () => {
      const lexicon: Lexicon = {
        commonActions: ['cleaning', 'installing', 'replacing'],
      };

      // Access private method via type assertion for testing
      const replaceVariables = (PromptLoader as unknown as PromptLoaderTestInterface).replaceVariables.bind(PromptLoader);
      const template = 'Common actions: {{actions}}';
      const result = replaceVariables(template, lexicon);

      expect(result).toBe('Common actions: cleaning, installing, replacing');
    });

    it('replaces {{goodExamples}} variable with comma-separated examples', () => {
      const lexicon: Lexicon = {
        goodExamples: ['kitchen-oven-CU', 'hall-door-MID', 'utility-sink-WS'],
      };

      const replaceVariables = (PromptLoader as unknown as PromptLoaderTestInterface).replaceVariables.bind(PromptLoader);
      const template = 'Good examples:\n{{goodExamples}}';
      const result = replaceVariables(template, lexicon);

      expect(result).toBe('Good examples:\nkitchen-oven-CU, hall-door-MID, utility-sink-WS');
    });

    it('replaces {{badExamples}} variable with formatted bad examples', () => {
      const lexicon: Lexicon = {
        badExamples: [
          { wrong: 'Kitchen-Oven-CU', reason: 'mixed case' },
          { wrong: 'kitchen-fridge freezer-CU', reason: 'missing hyphen' },
        ],
      };

      const replaceVariables = (PromptLoader as unknown as PromptLoaderTestInterface).replaceVariables.bind(PromptLoader);
      const template = 'Bad examples:\n{{badExamples}}';
      const result = replaceVariables(template, lexicon);

      expect(result).toBe('Bad examples:\nKitchen-Oven-CU[mixed case], kitchen-fridge freezer-CU[missing hyphen]');
    });

    it('handles missing new lexicon fields with defaults', () => {
      const lexicon: Lexicon = {};

      const replaceVariables = (PromptLoader as unknown as PromptLoaderTestInterface).replaceVariables.bind(PromptLoader);
      const template = 'Actions: {{actions}}, Examples: {{goodExamples}}, Bad: {{badExamples}}';
      const result = replaceVariables(template, lexicon);

      expect(result).toContain('Actions: ');
      expect(result).toContain('Examples: ');
      expect(result).toContain('Bad: ');
    });

    it('handles empty arrays for new lexicon fields', () => {
      const lexicon: Lexicon = {
        commonActions: [],
        goodExamples: [],
        badExamples: [],
      };

      const replaceVariables = (PromptLoader as unknown as PromptLoaderTestInterface).replaceVariables.bind(PromptLoader);
      const template = 'Actions: {{actions}}, Examples: {{goodExamples}}, Bad: {{badExamples}}';
      const result = replaceVariables(template, lexicon);

      expect(result).toBe('Actions: , Examples: , Bad: ');
    });

    it('replaces all new variables together with existing variables', () => {
      const lexicon: Lexicon = {
        commonLocations: ['kitchen', 'hall'],
        commonSubjects: ['oven', 'sink'],
        commonActions: ['cleaning', 'installing'],
        goodExamples: ['kitchen-oven-CU'],
        badExamples: [{ wrong: 'Kitchen-Oven', reason: 'missing shot type' }],
      };

      const replaceVariables = (PromptLoader as unknown as PromptLoaderTestInterface).replaceVariables.bind(PromptLoader);
      const template = 'Locations: {{locations}}, Subjects: {{subjects}}, Actions: {{actions}}, Good: {{goodExamples}}, Bad: {{badExamples}}';
      const result = replaceVariables(template, lexicon);

      expect(result).toContain('Locations: kitchen, hall');
      expect(result).toContain('Subjects: oven, sink');
      expect(result).toContain('Actions: cleaning, installing');
      expect(result).toContain('Good: kitchen-oven-CU');
      expect(result).toContain('Bad: Kitchen-Oven[missing shot type]');
    });

    it('handles $ characters in user content without corrupting template', () => {
      const lexicon: Lexicon = {
        commonActions: ['replacing $5 fuse', 'installing $200 fixture'],
        goodExamples: ['kitchen-oven-$50-repair-CU'],
        badExamples: [{ wrong: 'costs-$100', reason: 'includes currency in name' }],
      };

      const replaceVariables = (PromptLoader as unknown as PromptLoaderTestInterface).replaceVariables.bind(PromptLoader);
      const template = 'Actions: {{actions}}, Good: {{goodExamples}}, Bad: {{badExamples}}';
      const result = replaceVariables(template, lexicon);

      // Should NOT reinsert template tokens or corrupt the output
      expect(result).not.toContain('{{');
      expect(result).not.toContain('}}');
      expect(result).toBe('Actions: replacing $5 fuse, installing $200 fixture, Good: kitchen-oven-$50-repair-CU, Bad: costs-$100[includes currency in name]');
    });

    it('handles special regex replacement patterns ($&, $1, etc.) in user content', () => {
      const lexicon: Lexicon = {
        commonActions: ['use $& pattern', 'apply $1 syntax'],
        badExamples: [{ wrong: 'example-$&-name', reason: 'contains $& special char' }],
        aiInstructions: 'Variables like $& should work fine',
      };

      const replaceVariables = (PromptLoader as unknown as PromptLoaderTestInterface).replaceVariables.bind(PromptLoader);
      const template = 'Actions: {{actions}}, Bad: {{badExamples}}, Instructions: {{aiInstructions}}';
      const result = replaceVariables(template, lexicon);

      // Critical: $& should not reinsert the matched pattern {{...}}
      expect(result).not.toContain('{{');
      expect(result).not.toContain('}}');
      expect(result).toContain('use $& pattern');
      expect(result).toContain('example-$&-name[contains $& special char]');
      expect(result).toContain('Variables like $& should work fine');
    });
  });

  describe('loadPrompt', () => {
    it('handles CRLF line endings (Windows compatibility)', () => {
      // Test the NEW patterns (with \r?) work with both CRLF and LF line endings
      const newPromptPattern = /## Prompt \(Edit Below\)\r?\n([\s\S]*?)(?=---\r?\n## Response Format|$)/;
      const newResponsePattern = /## Response Format\r?\n([\s\S]*?)(?=---\r?\n## |$)/;

      // Test with CRLF (Windows)
      const crlfTemplate = '---\r\n## Prompt (Edit Below)\r\n\r\nTest prompt content\r\n\r\n---\r\n## Response Format\r\n\r\nExpected format here';
      const crlfPromptMatch = crlfTemplate.match(newPromptPattern);
      const crlfResponseMatch = crlfTemplate.match(newResponsePattern);

      expect(crlfPromptMatch).not.toBeNull();
      expect(crlfPromptMatch![1]).toContain('Test prompt content');
      expect(crlfResponseMatch).not.toBeNull();
      expect(crlfResponseMatch![1]).toContain('Expected format here');

      // Test with LF (Unix/Mac)
      const lfTemplate = '---\n## Prompt (Edit Below)\n\nTest prompt content\n\n---\n## Response Format\n\nExpected format here';
      const lfPromptMatch = lfTemplate.match(newPromptPattern);
      const lfResponseMatch = lfTemplate.match(newResponsePattern);

      expect(lfPromptMatch).not.toBeNull();
      expect(lfPromptMatch![1]).toContain('Test prompt content');
      expect(lfResponseMatch).not.toBeNull();
      expect(lfResponseMatch![1]).toContain('Expected format here');
    });
  });
});
