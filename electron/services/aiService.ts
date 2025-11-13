import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import * as fs from 'fs/promises';
import type { Lexicon, AIAnalysisResult } from '../../src/types';
import { PromptLoader } from '../utils/promptLoader';
import { VideoFrameExtractor } from './videoFrameExtractor';

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
   * Ultra-compressed OCTAVE prompt (fallback when template file not available)
   * ~75% token reduction: Eliminated all redundancy, merged schemas, used shorthand vocab
   * Real-world shotlist examples integrated, zero duplication
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

    let prompt = `TASK::{location}-{subject}-{shotType|action+shotType}

SCHEMA::PHOTO[{loc}-{sub}-{shot}]|VIDEO[{loc}-{sub}-{act}-{shot}]

VOCAB::[
  LOC::${locations}[+custom],
  SUB::${subjects}[+custom][controls|serial=suffix_if_focus],
  ACT::${actions}[video_only],
  SHOT::STATIC[${staticShots}]|MOVING[${movingShots}][photo=static_only]
]`;

    if (synonyms) {
      prompt += `\n\nMAP::${synonyms}[british_english]`;
    }

    if (lexicon.aiInstructions) {
      prompt += `\n\nRULES::${lexicon.aiInstructions}`;
    }

    if (goodExamples || badExamples) {
      prompt += '\n\nREF::[';
      if (goodExamples) prompt += `GOOD::${goodExamples}`;
      if (goodExamples && badExamples) prompt += '|';
      if (badExamples) prompt += `BAD::${badExamples}`;
      prompt += ']';
    }

    // Include action field in output schema for videos
    prompt += `\n\nOUT::JSON{"location":"str","subject":"str","action":"str[video_only|optional]","shotType":"${staticShots.split(', ')[0]}","mainName":"loc-sub-shot|loc-sub-act-shot[if_video_with_action]","metadata":["max4","brand_if_visible"]}`;

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

          // Trust AI-provided structured fields (Issue #54: preserve hyphenated concepts)
          // DO NOT parse mainName - it's a display artifact, not source of truth
          return {
            location: parsed.location,
            subject: parsed.subject,
            action: parsed.action || undefined,
            shotType: parsed.shotType,
            mainName: parsed.mainName || `${parsed.location}-${parsed.subject}-${parsed.shotType}`,
            keywords: Array.isArray(parsed.keywords) ? parsed.keywords : (Array.isArray(parsed.metadata) ? parsed.metadata : []),
            confidence: 0.8,
          };
        }

        // Handle legacy format (mainName without structured fields)
        // DO NOT attempt to parse mainName - hyphenated concepts break naive splitting
        // mainName is display artifact for Premiere Pro, not source of structured data
        console.log('[AIService] Legacy format detected (no structured fields)');
        return {
          mainName: parsed.mainName || '',
          keywords: Array.isArray(parsed.keywords) ? parsed.keywords : (Array.isArray(parsed.metadata) ? parsed.metadata : []),
          confidence: 0.8,
          location: '',
          subject: '',
          action: '',
          shotType: '',
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
        keywords: [],
        confidence: 0,
        location: '',
        subject: '',
        action: '',
        shotType: '',
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
      keywords: metadata.length > 0 ? metadata : [],
      confidence: mainName || metadata.length > 0 ? 0.7 : 0,
      location: '',
      subject: '',
      action: '',
      shotType: '',
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
        keywords: [],
        confidence: 0,
        location: '',
        subject: '',
        action: '',
        shotType: '',
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

    // Validate response structure before accessing choices
    if (!response || typeof response !== 'object') {
      console.error('[AIService] Invalid OpenAI response structure:', response);
      throw new Error('OpenAI API returned invalid response (not an object)');
    }

    if (!('choices' in response) || !Array.isArray(response.choices)) {
      console.error('[AIService] OpenAI response missing choices array');
      console.error('[AIService] Full response:', JSON.stringify(response, null, 2));

      // Check if response contains an error field
      if ('error' in response && response.error) {
        const error = response.error as { message?: string; type?: string; code?: string };
        throw new Error(
          `OpenAI API error: ${error.message || 'Unknown error'} (type: ${error.type || 'unknown'}, code: ${error.code || 'unknown'})`
        );
      }

      throw new Error('OpenAI API returned response without choices array. Check API key, model availability, and rate limits.');
    }

    if (response.choices.length === 0) {
      console.error('[AIService] OpenAI response has empty choices array');
      console.error('[AIService] Full response:', JSON.stringify(response, null, 2));
      throw new Error('OpenAI API returned empty choices array (no completions generated)');
    }

    const content = response.choices[0]?.message?.content;

    if (!content) {
      console.error('[AIService] OpenAI choice missing message content');
      console.error('[AIService] Choice object:', JSON.stringify(response.choices[0], null, 2));
      throw new Error('OpenAI API returned choice without message content');
    }

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

  /**
   * Analyze video by extracting and analyzing frames
   * Implements Phase 1 of ADR-007: Video Analysis Workflow
   *
   * @param videoPath - Full path to video file
   * @param lexicon - Lexicon rules for AI guidance
   * @returns Synthesized analysis result from multiple frames
   *
   * Example:
   * ```typescript
   * const result = await aiService.analyzeVideo('/path/video.mp4', lexicon);
   * // Returns: { mainName: 'kitchen-oven-installing-CU', metadata: [...], confidence: 0.85 }
   * ```
   */
  async analyzeVideo(
    videoPath: string,
    lexicon: Lexicon
  ): Promise<AIAnalysisResult> {
    console.log('[AIService] Starting video analysis:', videoPath);

    try {
      // 1. Extract frames at specified timestamps (10%, 30%, 50%, 70%, 90%)
      const frameExtractor = new VideoFrameExtractor();
      const framePaths = await frameExtractor.extractFrames(
        videoPath,
        [0.1, 0.3, 0.5, 0.7, 0.9]
      );

      console.log('[AIService] Extracted', framePaths.length, 'frames');

      // 2. Analyze each frame sequentially (prevents API rate limit 429 errors)
      // Sequential processing avoids burst of 5 simultaneous API calls during batch processing
      // Trade-off: ~5s slower per video for 100% reliability in batch operations
      const frameAnalyses: AIAnalysisResult[] = [];
      for (const framePath of framePaths) {
        const analysis = await this.analyzeImage(framePath, lexicon);
        frameAnalyses.push(analysis);
      }

      console.log('[AIService] Analyzed all frames');

      // 3. Synthesize results (combine frame analyses into single result)
      const synthesized = this.synthesizeFrameAnalyses(frameAnalyses);

      console.log('[AIService] Synthesized result:', synthesized);

      // 4. Cleanup temporary frame files
      await Promise.all(framePaths.map((framePath) => fs.unlink(framePath)));

      console.log('[AIService] Cleaned up temporary frames');

      return synthesized;
    } catch (error) {
      console.error('[AIService] Video analysis failed:', error);
      return {
        mainName: '',
        keywords: [],
        confidence: 0,
        location: '',
        subject: '',
        action: '',
        shotType: '',
      };
    }
  }

  /**
   * Synthesize multiple frame analyses into single result
   * Strategy: Most common terms, highest confidence
   *
   * @param analyses - Array of analysis results from individual frames
   * @returns Combined analysis result
   * @private
   */
  private synthesizeFrameAnalyses(
    analyses: AIAnalysisResult[]
  ): AIAnalysisResult {
    if (analyses.length === 0) {
      return {
        mainName: '',
        keywords: [],
        confidence: 0,
        location: "",
        subject: "",
        action: "",
        shotType: "",
      };
    }

    // Select best mainName (most common, or highest confidence if tie)
    const mainName = this.selectBestMainName(analyses);

    // Consolidate metadata (unique tags, frequency-weighted)
    const metadata = this.consolidateMetadata(analyses);

    // Average confidence across all frames
    const avgConfidence =
      analyses.reduce((sum, a) => sum + a.confidence, 0) / analyses.length;

    // Extract structured components if available
    const firstWithStructure = analyses.find(
      (a) => a.location && a.subject && a.shotType
    );

    return {
      mainName,
      keywords: metadata,
      confidence: avgConfidence,
      // Include structured components (required in v2.0)
      location: firstWithStructure?.location || '',
      subject: firstWithStructure?.subject || '',
      action: firstWithStructure?.action || '',
      shotType: firstWithStructure?.shotType || '',
    };
  }

  /**
   * Select best mainName from multiple analyses
   * Strategy: Most frequent, or highest confidence if tie
   * @private
   */
  private selectBestMainName(analyses: AIAnalysisResult[]): string {
    const nameFrequency = new Map<string, number>();
    const nameConfidence = new Map<string, number>();

    // Count frequency and track max confidence for each name
    for (const analysis of analyses) {
      const name = analysis.mainName;
      if (!name) continue;

      nameFrequency.set(name, (nameFrequency.get(name) || 0) + 1);

      const currentMaxConfidence = nameConfidence.get(name) || 0;
      if (analysis.confidence > currentMaxConfidence) {
        nameConfidence.set(name, analysis.confidence);
      }
    }

    // Find name with highest frequency
    let bestName = '';
    let maxFrequency = 0;
    let maxConfidence = 0;

    for (const [name, frequency] of nameFrequency.entries()) {
      const confidence = nameConfidence.get(name) || 0;

      if (
        frequency > maxFrequency ||
        (frequency === maxFrequency && confidence > maxConfidence)
      ) {
        bestName = name;
        maxFrequency = frequency;
        maxConfidence = confidence;
      }
    }

    return bestName;
  }

  /**
   * Consolidate metadata from multiple analyses
   * Strategy: Unique tags, weighted by frequency
   * @private
   */
  private consolidateMetadata(analyses: AIAnalysisResult[]): string[] {
    const tagFrequency = new Map<string, number>();

    // Count frequency of each tag
    for (const analysis of analyses) {
      for (const tag of analysis.keywords) {
        tagFrequency.set(tag, (tagFrequency.get(tag) || 0) + 1);
      }
    }

    // Sort by frequency (most common first) and return unique tags
    return Array.from(tagFrequency.entries())
      .sort((a, b) => b[1] - a[1]) // Sort by frequency descending
      .map((entry) => entry[0]); // Extract tag name
  }
}
