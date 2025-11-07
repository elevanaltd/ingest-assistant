import { describe, it, expect } from 'vitest';
import type { FileMetadata, Lexicon, AppConfig, AIConfig, AIAnalysisResult } from './index';

describe('Type Definitions', () => {
  describe('FileMetadata', () => {
    it('should allow creation of valid FileMetadata object', () => {
      const metadata: FileMetadata = {
        id: 'EB001537',
        originalFilename: 'EB001537.jpg',
        currentFilename: 'EB001537-oven-control-panel.jpg',
        filePath: '/path/to/file.jpg',
        extension: '.jpg',
        mainName: 'oven-control-panel',
        metadata: ['oven', 'control panel'],
        processedByAI: false,
        lastModified: new Date(),
        fileType: 'image',
      };

      expect(metadata.id).toBe('EB001537');
      expect(metadata.mainName).toBe('oven-control-panel');
      expect(metadata.metadata).toHaveLength(2);
      expect(metadata.fileType).toBe('image');
    });

    it('should support video file type', () => {
      const metadata: FileMetadata = {
        id: 'VD001234',
        originalFilename: 'VD001234.mp4',
        currentFilename: 'VD001234.mp4',
        filePath: '/path/to/video.mp4',
        extension: '.mp4',
        mainName: '',
        metadata: [],
        processedByAI: false,
        lastModified: new Date(),
        fileType: 'video',
      };

      expect(metadata.fileType).toBe('video');
    });
  });

  describe('Lexicon', () => {
    it('should allow creation of valid Lexicon object', () => {
      const lexicon: Lexicon = {
        preferredTerms: ['tap', 'sink'],
        excludedTerms: ['faucet', 'basin'],
        synonymMapping: {
          faucet: 'tap',
          basin: 'sink',
        },
        categories: {
          kitchen: ['oven', 'sink', 'tap'],
        },
      };

      expect(lexicon.preferredTerms).toContain('tap');
      expect(lexicon.excludedTerms).toContain('faucet');
      expect(lexicon.synonymMapping?.['faucet']).toBe('tap');
    });

    it('should allow optional categories', () => {
      const lexicon: Lexicon = {
        preferredTerms: ['test'],
        excludedTerms: ['avoid'],
        synonymMapping: {},
      };

      expect(lexicon.categories).toBeUndefined();
    });
  });

  describe('AppConfig', () => {
    it('should allow creation of valid AppConfig', () => {
      const config: AppConfig = {
        lexicon: {
          preferredTerms: [],
          excludedTerms: [],
          synonymMapping: {},
        },
      };

      expect(config.lexicon).toBeDefined();
      expect(config.lexicon.preferredTerms).toEqual([]);
    });
  });

  describe('AIConfig', () => {
    it('should allow creation of valid AIConfig with OpenRouter', () => {
      const config: AIConfig = {
        provider: 'openrouter',
        model: 'anthropic/claude-3.5-sonnet',
        apiKey: 'sk-test-key',
      };

      expect(config.provider).toBe('openrouter');
      expect(config.model).toBe('anthropic/claude-3.5-sonnet');
    });

    it('should allow creation of valid AIConfig with OpenAI', () => {
      const config: AIConfig = {
        provider: 'openai',
        model: 'gpt-4-vision-preview',
        apiKey: 'sk-test-key',
      };

      expect(config.provider).toBe('openai');
      expect(config.model).toBe('gpt-4-vision-preview');
    });

    it('should allow creation of valid AIConfig with Anthropic', () => {
      const config: AIConfig = {
        provider: 'anthropic',
        model: 'claude-3-5-sonnet-20241022',
        apiKey: 'sk-test-key',
      };

      expect(config.provider).toBe('anthropic');
    });
  });

  describe('AIAnalysisResult', () => {
    it('should allow creation of valid AIAnalysisResult', () => {
      const result: AIAnalysisResult = {
        mainName: 'oven-control-panel',
        metadata: ['oven', 'control panel', 'kitchen'],
        confidence: 0.95,
      };

      expect(result.mainName).toBe('oven-control-panel');
      expect(result.metadata).toHaveLength(3);
      expect(result.confidence).toBe(0.95);
    });
  });
});
