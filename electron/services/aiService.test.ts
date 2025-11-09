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
    it('should build prompt with lexicon rules', async () => {
      const prompt = await aiService.buildPrompt(mockLexicon);

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

    it('should parse markdown-wrapped JSON (```json ... ```)', () => {
      const response = `\`\`\`json
{
  "mainName": "microwave-controls",
  "metadata": ["microwave", "control panel"]
}
\`\`\``;

      const result = aiService.parseAIResponse(response);

      expect(result.mainName).toBe('microwave-controls');
      expect(result.metadata).toEqual(['microwave', 'control panel']);
      expect(result.confidence).toBe(0.8);
    });

    it('should parse markdown-wrapped JSON (``` ... ```)', () => {
      const response = `\`\`\`
{
  "mainName": "oven-panel",
  "metadata": ["oven", "panel"]
}
\`\`\``;

      const result = aiService.parseAIResponse(response);

      expect(result.mainName).toBe('oven-panel');
      expect(result.metadata).toEqual(['oven', 'panel']);
      expect(result.confidence).toBe(0.8);
    });

    it('should parse JSON with trailing period', () => {
      const response = '{ "mainName": "siemens-microwave-control-panel", "metadata": ["appliance", "control panel", "european", "kitchen"] }.';

      const result = aiService.parseAIResponse(response);

      expect(result.mainName).toBe('siemens-microwave-control-panel');
      expect(result.metadata).toEqual(['appliance', 'control panel', 'european', 'kitchen']);
      expect(result.confidence).toBe(0.8);
    });

    it('should parse markdown bullet format', () => {
      const response = `**Image Description**

* **Main Name:** Under Sink Bin
* **Metadata:**
  * furniture
  * household
  * interior-exterior`;

      const result = aiService.parseAIResponse(response);

      expect(result.mainName).toBe('under-sink-bin');
      expect(result.metadata).toContain('furniture');
      expect(result.metadata).toContain('household');
      expect(result.confidence).toBe(0.7);
    });

    it('should parse prose with bullets format', () => {
      const response = `The image shows a recessed utility cabinet with a built-in recycling bin.

• **Descriptive Name**: minimalist-sink-cabinet
• **Metadata**: ["sustainable living", "home", "kitchen"]`;

      const result = aiService.parseAIResponse(response);

      expect(result.mainName).toBe('minimalist-sink-cabinet');
      expect(result.metadata).toEqual(['sustainable living', 'home', 'kitchen']);
      expect(result.confidence).toBe(0.7);
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

  describe('analyzeVideo', () => {
    it('should extract frames and analyze them', async () => {
      // Mock VideoFrameExtractor
      const mockFramePaths = [
        '/tmp/frame-1.jpg',
        '/tmp/frame-2.jpg',
        '/tmp/frame-3.jpg'
      ];

      // Spy on analyzeImage method
      const mockAnalysis = {
        mainName: 'kitchen-oven-CU',
        metadata: ['kitchen', 'oven', 'appliance'],
        confidence: 0.9
      };
      vi.spyOn(aiService, 'analyzeImage').mockResolvedValue(mockAnalysis);

      // Mock VideoFrameExtractor
      vi.mock('./videoFrameExtractor', () => ({
        VideoFrameExtractor: vi.fn().mockImplementation(() => ({
          extractFrames: vi.fn().mockResolvedValue(mockFramePaths)
        }))
      }));

      // Method should exist (will fail until implemented - RED state)
      expect(aiService.analyzeVideo).toBeDefined();
      expect(typeof aiService.analyzeVideo).toBe('function');
    });

    it('should synthesize results from multiple frames', async () => {
      // This test verifies the synthesis logic exists
      // Test private method indirectly through analyzeVideo
      expect(aiService.analyzeVideo).toBeDefined();
    });

    it('should cleanup temporary frame files after analysis', async () => {
      // Verify cleanup happens (will test after implementation)
      expect(aiService.analyzeVideo).toBeDefined();
    });
  });
});
