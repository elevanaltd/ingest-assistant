import type { Lexicon, LexiconConfig, TermMapping } from '../../src/types';

/**
 * Convert UI LexiconConfig to YAML Lexicon format
 */
export function convertToYAMLFormat(uiConfig: LexiconConfig): Lexicon {
  const synonymMapping: Record<string, string> = {};
  const preferredTerms: string[] = uiConfig.alwaysInclude.map(t => t.trim());
  const excludedTerms: string[] = [];

  uiConfig.termMappings.forEach(mapping => {
    const preferred = mapping.preferred.trim();
    if (preferred) {
      preferredTerms.push(preferred);

      // Parse comma-separated excluded terms
      const excluded = mapping.excluded
        .split(',')
        .map(t => t.trim())
        .filter(t => t.length > 0);

      excludedTerms.push(...excluded);

      // First excluded term becomes synonym for preferred
      if (excluded[0]) {
        synonymMapping[excluded[0]] = preferred;
      }
    }
  });

  return {
    preferredTerms,
    excludedTerms,
    synonymMapping,
    customInstructions: uiConfig.customInstructions.trim(),
  };
}

/**
 * Convert YAML Lexicon to UI LexiconConfig format
 */
export function convertToUIFormat(lexicon: Lexicon): LexiconConfig {
  const termMappings: TermMapping[] = [];

  // Build mappings from synonym mapping
  Object.entries(lexicon.synonymMapping).forEach(([excluded, preferred]) => {
    // Find if mapping already exists
    let mapping = termMappings.find(m => m.preferred === preferred);
    if (!mapping) {
      mapping = { preferred, excluded: '' };
      termMappings.push(mapping);
    }
    mapping.excluded += (mapping.excluded ? ', ' : '') + excluded;
  });

  // Add empty row for adding new terms
  termMappings.push({ preferred: '', excluded: '' });

  // Extract alwaysInclude (terms not in synonym mappings)
  const mappedPreferred = new Set(termMappings.map(m => m.preferred).filter(p => p));
  const alwaysInclude = lexicon.preferredTerms.filter(
    term => !mappedPreferred.has(term)
  );

  return {
    termMappings,
    alwaysInclude,
    customInstructions: lexicon.customInstructions || '',
  };
}
