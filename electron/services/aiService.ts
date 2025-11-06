import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import * as fs from 'fs/promises';
import type { Lexicon, AIAnalysisResult } from '../../src/types';

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
   */
  buildPrompt(lexicon: Lexicon): string {
    const preferredTerms = lexicon.preferredTerms.join(', ');
    const excludedTerms = lexicon.excludedTerms.join(', ');
    const synonyms = Object.entries(lexicon.synonymMapping)
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
   * Handles both raw JSON and markdown-wrapped JSON (```json ... ```)
   */
  parseAIResponse(response: string): AIAnalysisResult {
    try {
      // Remove markdown code block wrapper if present
      let jsonString = response.trim();

      // Check for markdown code block (```json ... ``` or ``` ... ```)
      const codeBlockMatch = jsonString.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
      if (codeBlockMatch) {
        jsonString = codeBlockMatch[1].trim();
      }

      // Parse the JSON
      const parsed = JSON.parse(jsonString);

      // Validate and return
      return {
        mainName: parsed.mainName || '',
        metadata: Array.isArray(parsed.metadata) ? parsed.metadata : [],
        confidence: 0.8, // Default confidence
      };
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
   * Analyze image using AI
   */
  async analyzeImage(
    imagePath: string,
    lexicon: Lexicon
  ): Promise<AIAnalysisResult> {
    const prompt = this.buildPrompt(lexicon);

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
