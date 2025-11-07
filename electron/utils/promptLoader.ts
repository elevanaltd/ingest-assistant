import * as fs from 'fs/promises';
import * as path from 'path';
import type { Lexicon } from '../../src/types';

/**
 * Load and process prompt templates
 */
export class PromptLoader {
  private static promptCache: Map<string, string> = new Map();

  /**
   * Load prompt template from file and replace variables
   * @param templateName - Name of template file (without .md extension)
   * @param lexicon - Lexicon configuration for variable replacement
   * @returns Processed prompt string
   */
  static async loadPrompt(templateName: string, lexicon: Lexicon): Promise<string | null> {
    try {
      // In Electron, use __dirname to resolve relative to the built code location
      // __dirname points to dist/electron/, so go up to project root
      const promptPath = path.join(__dirname, '../../prompts', `${templateName}.md`);

      // Try to read from file
      let template: string;
      if (this.promptCache.has(promptPath)) {
        template = this.promptCache.get(promptPath)!;
      } else {
        template = await fs.readFile(promptPath, 'utf-8');
        this.promptCache.set(promptPath, template);
      }

      // Extract prompt content (everything after "## Prompt (Edit Below)")
      // Support both LF (\n) and CRLF (\r\n) line endings for Windows compatibility
      const promptMatch = template.match(/## Prompt \(Edit Below\)\r?\n([\s\S]*?)(?=---\r?\n## Response Format|$)/);
      if (!promptMatch) {
        console.warn('Could not find prompt section in template');
        return null;
      }

      let prompt = promptMatch[1].trim();

      // Replace variables
      prompt = this.replaceVariables(prompt, lexicon);

      // Extract response format section
      // Support both LF (\n) and CRLF (\r\n) line endings for Windows compatibility
      const responseFormatMatch = template.match(/## Response Format\r?\n([\s\S]*?)(?=---\r?\n## |$)/);
      if (responseFormatMatch) {
        const responseFormat = responseFormatMatch[1].trim();
        prompt += '\n\n' + responseFormat;
      }

      return prompt;
    } catch (error) {
      // File doesn't exist or can't be read
      if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
        console.log(`Prompt template '${templateName}.md' not found, will use hardcoded prompt`);
      } else {
        console.error('Error loading prompt template:', error);
      }
      return null;
    }
  }

  /**
   * Replace template variables with actual values
   */
  private static replaceVariables(template: string, lexicon: Lexicon): string {
    const locations = lexicon.commonLocations?.join(', ') || 'any appropriate location';
    const subjects = lexicon.commonSubjects?.join(', ') || 'any relevant subject';
    const staticShots = lexicon.shotTypes?.static.join(', ') || 'WS, MID, CU, UNDER';
    const movingShots = lexicon.shotTypes?.moving.join(', ') || 'FP, TRACK, ESTAB';

    const wordPrefs = lexicon.wordPreferences || lexicon.synonymMapping || {};
    const wordPreferences = Object.entries(wordPrefs)
      .map(([from, to]) => `"${from}" -> "${to}"`)
      .join(', ') || 'none';

    const aiInstructions = lexicon.aiInstructions || lexicon.customInstructions || '';

    // New lexicon variables
    const actions = lexicon.commonActions?.join(', ') || '';
    const goodExamples = lexicon.goodExamples?.join('\n') || '';
    const badExamples = lexicon.badExamples
      ?.map(ex => `${ex.wrong} (${ex.reason})`)
      .join('\n') || '';

    // Use function replacers to prevent $ special sequences from being interpreted
    // as regex replacement patterns (e.g., $& would reinsert the matched token)
    return template
      .replace(/\{\{locations\}\}/g, () => locations)
      .replace(/\{\{subjects\}\}/g, () => subjects)
      .replace(/\{\{staticShots\}\}/g, () => staticShots)
      .replace(/\{\{movingShots\}\}/g, () => movingShots)
      .replace(/\{\{wordPreferences\}\}/g, () => wordPreferences)
      .replace(/\{\{aiInstructions\}\}/g, () => aiInstructions)
      .replace(/\{\{actions\}\}/g, () => actions)
      .replace(/\{\{goodExamples\}\}/g, () => goodExamples)
      .replace(/\{\{badExamples\}\}/g, () => badExamples);
  }

  /**
   * Clear prompt cache (useful for testing/development)
   */
  static clearCache(): void {
    this.promptCache.clear();
  }
}
