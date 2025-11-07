import type { Lexicon, LexiconConfig } from '../../src/types';

/**
 * Convert UI LexiconConfig to YAML Lexicon format
 */
export function convertToYAMLFormat(uiConfig: LexiconConfig): Lexicon {
  // Parse comma-separated locations
  const commonLocations = uiConfig.commonLocations
    .split(',')
    .map(t => t.trim())
    .filter(t => t.length > 0);

  // Parse comma-separated subjects
  const commonSubjects = uiConfig.commonSubjects
    .split(',')
    .map(t => t.trim())
    .filter(t => t.length > 0);

  // Parse comma-separated actions
  const commonActions = uiConfig.commonActions
    .split(',')
    .map(t => t.trim())
    .filter(t => t.length > 0);

  // Parse word preferences (format: "from → to" or "from->to")
  const wordPreferences: Record<string, string> = {};
  if (uiConfig.wordPreferences.trim()) {
    uiConfig.wordPreferences.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (!trimmed) return;

      // Match "from → to" or "from->to" or "from → to"
      const match = trimmed.match(/^(.+?)\s*(?:→|->)\s*(.+)$/);
      if (match) {
        const [, from, to] = match;
        wordPreferences[from.trim()] = to.trim();
      }
    });
  }

  // Parse good examples (one per line)
  const goodExamples = uiConfig.goodExamples
    .split('\n')
    .map(t => t.trim())
    .filter(t => t.length > 0);

  // Parse bad examples (format: "bad-example (reason)" or "bad-example(reason)")
  const badExamples: Array<{wrong: string, reason: string}> = [];
  if (uiConfig.badExamples.trim()) {
    uiConfig.badExamples.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (!trimmed) return;

      // Match "bad-example (reason)" or "bad-example(reason)"
      const match = trimmed.match(/^(.+?)\s*\((.+?)\)\s*$/);
      if (match) {
        const [, wrong, reason] = match;
        badExamples.push({ wrong: wrong.trim(), reason: reason.trim() });
      }
    });
  }

  return {
    pattern: uiConfig.pattern.trim(),
    commonLocations,
    commonSubjects,
    commonActions,
    wordPreferences,
    aiInstructions: uiConfig.aiInstructions.trim(),
    goodExamples,
    badExamples,
  };
}

/**
 * Convert YAML Lexicon to UI LexiconConfig format
 */
export function convertToUIFormat(lexicon: Lexicon): LexiconConfig {
  // Convert locations array to comma-separated string
  const commonLocations = (lexicon.commonLocations || []).join(', ');

  // Convert subjects array to comma-separated string
  const commonSubjects = (lexicon.commonSubjects || []).join(', ');

  // Convert actions array to comma-separated string
  const commonActions = (lexicon.commonActions || []).join(', ');

  // Convert word preferences to "from → to" format (one per line)
  const wordPrefs = lexicon.wordPreferences || {};
  const wordPreferences = Object.entries(wordPrefs)
    .map(([from, to]) => `${from} → ${to}`)
    .join('\n');

  // Convert good examples to newline-separated string
  const goodExamples = (lexicon.goodExamples || []).join('\n');

  // Convert bad examples to "wrong (reason)" format
  const badExamples = (lexicon.badExamples || [])
    .map(ex => `${ex.wrong} (${ex.reason})`)
    .join('\n');

  return {
    pattern: lexicon.pattern || '',
    commonLocations,
    commonSubjects,
    commonActions,
    wordPreferences,
    aiInstructions: lexicon.aiInstructions || '',
    goodExamples,
    badExamples,
  };
}
