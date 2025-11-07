import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import * as fs from 'fs/promises';
import type { Lexicon, AIAnalysisResult } from '../../src/types';
import { PromptLoader } from '../utils/promptLoader';

export class AIService {
  private provider: 'openai' | 'anthropic' | 'openrouter';
  private model: string;
  private apiKey: string;
  private openaiClient?: OpenAI;
  private anthropicClient?: Anthropic;

  constructor(provider: 'openai' | 'anthropic' | 'openrouter', model: string, apiKey: string) {
    this.provider = provider;
    this.model = model;
    this.apiKey = apiKey;

    if (provider === 'openai') {
      this.openaiClient = new OpenAI({ apiKey });
    } else if (provider === 'openrouter') {
      // OpenRouter uses OpenAI-compatible API
      this.openaiClient = new OpenAI({
        apiKey,
        baseURL: 'https://openrouter.ai/api/v1',
        defaultHeaders: {
          'HTTP-Referer': 'https://github.com/ingest-assistant',
          'X-Title': 'Ingest Assistant',
        },
      });
    } else {
      this.anthropicClient = new Anthropic({ apiKey });
    }
  }

  /**
   * Build prompt with lexicon rules
   * Supports both legacy and new structured formats
   * For structured format, tries to load from prompts/structured-analysis.md
   */
  async buildPrompt(lexicon: Lexicon): Promise<string> {
    // Check if using new structured format
    const isStructured = !!(lexicon.commonLocations || lexicon.commonSubjects || lexicon.shotTypes);

    if (isStructured) {
      return await this.buildStructuredPromptAsync(lexicon);
    } else {
      return this.buildLegacyPrompt(lexicon);
    }
  }

  /**
   * Build structured prompt for {location}-{subject}-{shotType} format
   * Tries to load from prompts/structured-analysis.md first, falls back to hardcoded
   */
  private async buildStructuredPromptAsync(lexicon: Lexicon): Promise<string> {
    // Try loading from template file first
    const templatePrompt = await PromptLoader.loadPrompt('structured-analysis', lexicon);
    if (templatePrompt) {
      return templatePrompt;
    }

    // Fall back to hardcoded prompt
    return this.buildStructuredPromptHardcoded(lexicon);
  }

  /**
   * OCTAVE-compressed structured prompt (fallback when template file not available)
   * 65% token reduction vs verbose version while maintaining 100% decision-logic fidelity
   */
  private buildStructuredPromptHardcoded(lexicon: Lexicon): string {
    const locations = lexicon.commonLocations?.join(', ') || 'any appropriate location';
    const subjects = lexicon.commonSubjects?.join(', ') || 'any relevant subject';
    const actions = lexicon.commonActions?.join(', ') || 'cleaning, installing, replacing';
    const staticShots = lexicon.shotTypes?.static.join(', ') || 'WS, MID, CU, UNDER';
    const movingShots = lexicon.shotTypes?.moving.join(', ') || 'FP, TRACK, ESTAB';

    const wordPrefs = lexicon.wordPreferences || {};
    const synonyms = Object.entries(wordPrefs)
      .map(([from, to]) => `${from}→${to}`)
      .join(', ');

    const goodExamples = lexicon.goodExamples?.join(', ') || '';
    const badExamples = lexicon.badExamples
      ?.map(ex => `${ex.wrong}[${ex.reason}]`)
      .join(', ') || '';

    let prompt = `TASK::IMAGE/VIDEO_METADATA_EXTRACTION→STRUCTURED_NAMING

PATTERN::[
  PHOTO::{location}-{subject}-{shotType}[3_parts],
  VIDEO::{location}-{subject}-{action}-{shotType}[4_parts]
]

COMPONENT_RULES::[
  LOCATION::where_shot_taken[COMMON::${locations}, FLEXIBILITY::custom_allowed],
  SUBJECT::main_object[COMMON::${subjects}, FLEXIBILITY::custom_allowed],
  ACTION::video_only[COMMON::${actions}, CRITICAL::omit_for_photos],
  SHOT_TYPE::[
    STATIC[no_movement]::${staticShots}[WS=wide[full_scene], MID=mid[partial], CU=closeup[detail], UNDER=underneath[below]],
    MOVING[camera_movement]::${movingShots}[FP=focus_pull[rack], TRACK=tracking[follow], ESTAB=establishing[reveal]],
    CONSTRAINT::photos_use_static_only
  ]
]`;

    if (synonyms) {
      prompt += `\n\nWORD_PREFERENCES::${synonyms}`;
    }

    if (lexicon.aiInstructions) {
      prompt += `\n\nCUSTOM_INSTRUCTIONS::${lexicon.aiInstructions}`;
    }

    if (goodExamples || badExamples) {
      prompt += '\n\nEXAMPLES::[';
      if (goodExamples) prompt += `\n  GOOD::${goodExamples}`;
      if (badExamples) prompt += `\n  BAD::${badExamples}`;
      prompt += '\n]';
    }

    prompt += `\n\nOUTPUT::JSON_ONLY[no_markdown,no_explanation]

PHOTO_SCHEMA::{
  "location": "location-name",
  "subject": "subject-name",
  "shotType": "SHOT_TYPE",
  "mainName": "location-subject-SHOT_TYPE",
  "metadata": ["tag1", "tag2"]
}

VIDEO_SCHEMA::{
  "location": "location-name",
  "subject": "subject-name",
  "action": "action-verb",
  "shotType": "SHOT_TYPE",
  "mainName": "location-subject-action-SHOT_TYPE",
  "metadata": ["tag1", "tag2"]
}

EXAMPLE::{
  "location": "kitchen",
  "subject": "oven",
  "shotType": "CU",
  "mainName": "kitchen-oven-CU",
  "metadata": ["appliance", "control-panel", "interior"]
}`;

    return prompt;
  }

  /**
   * Build legacy prompt for backward compatibility
   */
  private buildLegacyPrompt(lexicon: Lexicon): string {
    const preferredTerms = lexicon.preferredTerms?.join(', ') || '';
    const excludedTerms = lexicon.excludedTerms?.join(', ') || '';
    const synonyms = Object.entries(lexicon.synonymMapping || {})
      .map(([from, to]) => `"${from}" -> "${to}"`)
      .join(', ');

    let prompt = `Analyze this image and provide:
1. A descriptive name (kebab-case, concise, 2-4 words)
2. Relevant metadata tags (2-5 tags)

Lexicon rules:
- Preferred terms: ${preferredTerms || 'none'}
- Excluded terms (do not use): ${excludedTerms || 'none'}
- Synonym mappings: ${synonyms || 'none'}`;

    if (lexicon.customInstructions) {
      prompt += `\n\nADDITIONAL INSTRUCTIONS:\n${lexicon.customInstructions}`;
    }

    prompt += `\n\nIMPORTANT: Return ONLY valid JSON in this exact format (no markdown, no explanation):
{
  "mainName": "descriptive-name",
  "metadata": ["tag1", "tag2", "tag3"]
}`;

    return prompt;
  }

  /**
   * Parse AI response into structured result
   * Handles multiple response formats:
   * - Raw JSON: { "mainName": "...", "metadata": [...] }
   * - Markdown code blocks: ```json ... ```
   * - JSON with trailing punctuation: { ... }.
   * - Markdown bullets: * **Main Name:** ... * **Metadata:** ...
   * - Prose with bullets: The image shows... • **Descriptive Name**: ...
   */
  parseAIResponse(response: string): AIAnalysisResult {
    try {
      let jsonString = response.trim();

      // Strategy 1: Extract from markdown code block
      const codeBlockMatch = jsonString.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
      if (codeBlockMatch) {
        jsonString = codeBlockMatch[1].trim();
      }

      // Strategy 2: Extract JSON object from text (find { ... })
      const jsonObjectMatch = jsonString.match(/\{[\s\S]*\}/);
      if (jsonObjectMatch) {
        jsonString = jsonObjectMatch[0];

        // Remove trailing punctuation after closing brace
        jsonString = jsonString.replace(/\}\s*[.,;!]+\s*$/, '}');
      }

      // Try parsing as JSON
      try {
        const parsed = JSON.parse(jsonString);
        console.log('[AIService] Parsed AI response:', JSON.stringify(parsed, null, 2));

        // Handle structured format (with location, subject, shotType)
        if (parsed.location && parsed.subject && parsed.shotType) {
          console.log('[AIService] Using structured format (separate fields provided)');
          return {
            location: parsed.location,
            subject: parsed.subject,
            shotType: parsed.shotType,
            mainName: parsed.mainName || `${parsed.location}-${parsed.subject}-${parsed.shotType}`,
            metadata: Array.isArray(parsed.metadata) ? parsed.metadata : [],
            confidence: 0.8,
          };
        }

        // Try parsing mainName into structured components if pattern matches
        const mainName = parsed.mainName || '';
        console.log('[AIService] Checking if mainName matches pattern:', mainName);
        const parts = mainName.split('-');
        const shotTypes = ['WS', 'MID', 'CU', 'UNDER', 'FP', 'TRACK', 'ESTAB'];

        console.log('[AIService] Split parts:', parts);
        console.log('[AIService] Last part uppercase:', parts.length > 0 ? parts[parts.length - 1].toUpperCase() : 'N/A');

        if (parts.length === 3 && shotTypes.includes(parts[2].toUpperCase())) {
          // mainName follows {location}-{subject}-{shotType} pattern
          const result = {
            location: parts[0],
            subject: parts[1],
            shotType: parts[2].toUpperCase(),
            mainName: mainName,
            metadata: Array.isArray(parsed.metadata) ? parsed.metadata : [],
            confidence: 0.8,
          };
          console.log('[AIService] Pattern matched! Extracted structured components:', result);
          return result;
        }

        // Handle legacy format (just mainName and metadata, no pattern match)
        console.log('[AIService] No pattern match, using legacy format');
        return {
          mainName: mainName,
          metadata: Array.isArray(parsed.metadata) ? parsed.metadata : [],
          confidence: 0.8,
        };
      } catch (jsonError) {
        // Strategy 3: Parse markdown/prose format
        return this.parseMarkdownFormat(response);
      }
    } catch (error) {
      console.error('Failed to parse AI response:', error);
      console.error('Response was:', response);
      return {
        mainName: '',
        metadata: [],
        confidence: 0,
      };
    }
  }

  /**
   * Fallback parser for markdown/prose formats
   * Handles:
   * - * **Main Name:** value
   * - • **Descriptive Name**: value
   * - **Metadata**: ["tag1", "tag2"]
   */
  private parseMarkdownFormat(response: string): AIAnalysisResult {
    let mainName = '';
    const metadata: string[] = [];

    // Extract main name (various formats)
    const namePatterns = [
      /\*\*\s*Main Name\s*\*\*:\s*([^\n]+)/i,          // **Main Name**: value
      /\*\s*\*\*\s*Main Name\s*:\*\*\s*([^\n]+)/i,     // * **Main Name:** value (with space before closing **)
      /\*\s*\*\*\s*Main Name\s*\*\*:\s*([^\n]+)/i,     // * **Main Name**: value
      /•\s*\*\*\s*Descriptive\s*Name\s*\*\*:\s*([^\n]+)/i, // • **Descriptive Name**: value
      /Descriptive\s*Name\s*:\s*([^\n]+)/i,            // Descriptive Name: value
    ];

    for (const pattern of namePatterns) {
      const match = response.match(pattern);
      if (match) {
        mainName = match[1].trim();
        break;
      }
    }

    // Extract metadata array from JSON format in text
    const metadataArrayMatch = response.match(/\["([^"]+)"(?:,\s*"([^"]+)")*\]/);
    if (metadataArrayMatch) {
      const matched = response.match(/"([^"]+)"/g);
      if (matched) {
        metadata.push(...matched.map(m => m.replace(/"/g, '')));
      }
    } else {
      // Extract metadata from bullet list
      const metadataSection = response.match(/\*\*\s*Metadata\s*:\*\*[\s\S]*?(?=\n\n|\n\*\*|$)/i);
      if (metadataSection) {
        const bullets = metadataSection[0].match(/[•*]\s*([^\n]+)/g);
        if (bullets) {
          metadata.push(...bullets.map(b => b.replace(/^[•*]\s*/, '').trim()));
        }
      }
    }

    // Convert to kebab-case if needed
    if (mainName && !mainName.includes('-')) {
      mainName = mainName.toLowerCase().replace(/\s+/g, '-');
    }

    return {
      mainName: mainName || '',
      metadata: metadata.length > 0 ? metadata : [],
      confidence: mainName || metadata.length > 0 ? 0.7 : 0,
    };
  }

  /**
   * Analyze image using AI
   */
  async analyzeImage(
    imagePath: string,
    lexicon: Lexicon
  ): Promise<AIAnalysisResult> {
    const prompt = await this.buildPrompt(lexicon);
    console.log('[AIService] Using prompt (first 500 chars):', prompt.substring(0, 500));
    console.log('[AIService] Full prompt length:', prompt.length, 'characters');
    console.log('[AIService] Full prompt:\n' + '='.repeat(80) + '\n' + prompt + '\n' + '='.repeat(80));
    console.log('[AIService] Lexicon has structured format:', !!(lexicon.commonLocations || lexicon.commonSubjects || lexicon.shotTypes));

    try {
      if (this.provider === 'openai' || this.provider === 'openrouter') {
        return await this.analyzeWithOpenAI(imagePath, prompt);
      } else {
        return await this.analyzeWithAnthropic(imagePath, prompt);
      }
    } catch (error) {
      console.error('AI analysis failed:', error);
      return {
        mainName: '',
        metadata: [],
        confidence: 0,
      };
    }
  }

  /**
   * Analyze with OpenAI
   */
  private async analyzeWithOpenAI(
    imagePath: string,
    prompt: string
  ): Promise<AIAnalysisResult> {
    if (!this.openaiClient) {
      throw new Error('OpenAI client not initialized');
    }

    const imageBuffer = await fs.readFile(imagePath);
    const base64Image = imageBuffer.toString('base64');

    const response = await this.openaiClient.chat.completions.create({
      model: this.model,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`,
              },
            },
          ],
        },
      ],
      max_tokens: 300,
    });

    const content = response.choices[0]?.message?.content || '{}';
    return this.parseAIResponse(content);
  }

  /**
   * Analyze with Anthropic
   */
  private async analyzeWithAnthropic(
    imagePath: string,
    prompt: string
  ): Promise<AIAnalysisResult> {
    if (!this.anthropicClient) {
      throw new Error('Anthropic client not initialized');
    }

    const imageBuffer = await fs.readFile(imagePath);
    const base64Image = imageBuffer.toString('base64');

    const response = await this.anthropicClient.messages.create({
      model: this.model,
      max_tokens: 300,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: 'image/jpeg',
                data: base64Image,
              },
            },
            {
              type: 'text',
              text: prompt,
            },
          ],
        },
      ],
    });

    const content =
      response.content[0]?.type === 'text' ? response.content[0].text : '{}';
    return this.parseAIResponse(content);
  }
}
