import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AIService } from './aiService';
import type { Lexicon } from '../../src/types';

// Mock the AI SDK modules
vi.mock('openai');
vi.mock('@anthropic-ai/sdk');

describe('AIService', () => {
  let aiService: AIService;
  const mockLexicon: Lexicon = {
    preferredTerms: ['tap', 'sink'],
    excludedTerms: ['faucet', 'basin'],
    synonymMapping: { faucet: 'tap' },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    aiService = new AIService('openrouter', 'anthropic/claude-3.5-sonnet', 'test-key');
  });

  describe('buildPrompt', () => {
    it('should build prompt with lexicon rules', () => {
      const prompt = aiService.buildPrompt(mockLexicon);

      expect(prompt).toContain('Preferred terms');
      expect(prompt).toContain('tap');
      expect(prompt).toContain('sink');
      expect(prompt).toContain('Excluded terms');
      expect(prompt).toContain('faucet');
      expect(prompt).toContain('JSON');
    });
  });

  describe('parseAIResponse', () => {
    it('should parse valid JSON response', () => {
      const response = JSON.stringify({
        mainName: 'oven-control-panel',
        metadata: ['oven', 'control panel'],
      });

      const result = aiService.parseAIResponse(response);

      expect(result.mainName).toBe('oven-control-panel');
      expect(result.metadata).toEqual(['oven', 'control panel']);
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should handle malformed JSON gracefully', () => {
      const response = 'This is not JSON';

      const result = aiService.parseAIResponse(response);

      expect(result.mainName).toBe('');
      expect(result.metadata).toEqual([]);
      expect(result.confidence).toBe(0);
    });
  });

  describe('analyzeImage', () => {
    it('should create proper request structure', async () => {
      // This is a simplified test that validates the method exists
      // Full integration tests would require actual API keys
      expect(aiService.analyzeImage).toBeDefined();
      expect(typeof aiService.analyzeImage).toBe('function');
    });
  });
});
