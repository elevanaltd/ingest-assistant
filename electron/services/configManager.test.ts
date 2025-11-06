import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs/promises';
import { ConfigManager } from './configManager';
import type { AppConfig } from '../../src/types';

// Mock fs module
vi.mock('fs/promises');

describe('ConfigManager', () => {
  let configManager: ConfigManager;
  const testConfigPath = '/test/config.yaml';
  const mockFs = fs as any;

  beforeEach(() => {
    vi.clearAllMocks();
    configManager = new ConfigManager(testConfigPath);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('loadConfig', () => {
    it('should load and parse valid YAML config', async () => {
      const yamlContent = `
lexicon:
  preferredTerms:
    - tap
    - sink
  excludedTerms:
    - faucet
  synonymMapping:
    faucet: tap
`;
      mockFs.readFile.mockResolvedValue(yamlContent);

      const config = await configManager.loadConfig();

      expect(config.lexicon.preferredTerms).toContain('tap');
      expect(config.lexicon.preferredTerms).toContain('sink');
      expect(mockFs.readFile).toHaveBeenCalledWith(testConfigPath, 'utf-8');
    });

    it('should return default config if file does not exist', async () => {
      mockFs.readFile.mockRejectedValue({ code: 'ENOENT' });

      const config = await configManager.loadConfig();

      expect(config.lexicon).toBeDefined();
      expect(config.lexicon.preferredTerms).toEqual([]);
    });

    it('should throw error for invalid YAML', async () => {
      mockFs.readFile.mockResolvedValue('invalid: yaml: content: [[[');

      await expect(configManager.loadConfig()).rejects.toThrow();
    });
  });

  describe('saveConfig', () => {
    it('should save config as YAML to file', async () => {
      const config: AppConfig = {
        lexicon: {
          preferredTerms: ['test'],
          excludedTerms: ['avoid'],
          synonymMapping: {},
        },
      };

      mockFs.writeFile.mockResolvedValue(undefined);
      mockFs.mkdir.mockResolvedValue(undefined);

      const result = await configManager.saveConfig(config);

      expect(result).toBe(true);
      expect(mockFs.mkdir).toHaveBeenCalled();
      expect(mockFs.writeFile).toHaveBeenCalled();

      const writeCall = mockFs.writeFile.mock.calls[0];
      expect(writeCall[0]).toBe(testConfigPath);
      expect(writeCall[1]).toContain('preferredTerms');
      expect(writeCall[1]).toContain('test');
    });

    it('should return false on write error', async () => {
      const config: AppConfig = {
        lexicon: { preferredTerms: [], excludedTerms: [], synonymMapping: {} },
      };

      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockRejectedValue(new Error('Write failed'));

      const result = await configManager.saveConfig(config);

      expect(result).toBe(false);
    });
  });

  describe('getLexicon', () => {
    it('should return lexicon from loaded config', async () => {
      const yamlContent = `
lexicon:
  preferredTerms: [tap, sink]
  excludedTerms: [faucet]
  synonymMapping:
    faucet: tap
`;
      mockFs.readFile.mockResolvedValue(yamlContent);

      const lexicon = await configManager.getLexicon();

      expect(lexicon.preferredTerms).toEqual(['tap', 'sink']);
      expect(lexicon.excludedTerms).toEqual(['faucet']);
      expect(lexicon.synonymMapping['faucet']).toBe('tap');
    });
  });

  describe('getDefaultConfig', () => {
    it('should return valid default configuration', () => {
      const defaultConfig = configManager.getDefaultConfig();

      expect(defaultConfig.lexicon).toBeDefined();
      expect(Array.isArray(defaultConfig.lexicon.preferredTerms)).toBe(true);
      expect(Array.isArray(defaultConfig.lexicon.excludedTerms)).toBe(true);
    });
  });

  describe('getAIConfig (static)', () => {
    it('should return OpenRouter config from environment variables', () => {
      process.env.AI_PROVIDER = 'openrouter';
      process.env.OPENROUTER_API_KEY = 'test-key';
      process.env.AI_MODEL = 'anthropic/claude-3.5-sonnet';

      const aiConfig = ConfigManager.getAIConfig();

      expect(aiConfig).not.toBeNull();
      expect(aiConfig!.provider).toBe('openrouter');
      expect(aiConfig!.apiKey).toBe('test-key');
      expect(aiConfig!.model).toBe('anthropic/claude-3.5-sonnet');

      // Cleanup
      delete process.env.AI_PROVIDER;
      delete process.env.OPENROUTER_API_KEY;
      delete process.env.AI_MODEL;
    });

    it('should return OpenAI config from environment variables', () => {
      process.env.AI_PROVIDER = 'openai';
      process.env.OPENAI_API_KEY = 'test-key';
      process.env.AI_MODEL = 'gpt-4-vision-preview';

      const aiConfig = ConfigManager.getAIConfig();

      expect(aiConfig).not.toBeNull();
      expect(aiConfig!.provider).toBe('openai');
      expect(aiConfig!.apiKey).toBe('test-key');
      expect(aiConfig!.model).toBe('gpt-4-vision-preview');

      // Cleanup
      delete process.env.AI_PROVIDER;
      delete process.env.OPENAI_API_KEY;
      delete process.env.AI_MODEL;
    });

    it('should default to OpenRouter if no provider specified', () => {
      delete process.env.AI_PROVIDER;
      process.env.OPENROUTER_API_KEY = 'test-key';

      const aiConfig = ConfigManager.getAIConfig();

      expect(aiConfig).not.toBeNull();
      expect(aiConfig!.provider).toBe('openrouter');

      // Cleanup
      delete process.env.OPENROUTER_API_KEY;
    });

    it('should return null if API key is not configured', () => {
      delete process.env.OPENAI_API_KEY;
      delete process.env.ANTHROPIC_API_KEY;
      delete process.env.OPENROUTER_API_KEY;

      const aiConfig = ConfigManager.getAIConfig();

      expect(aiConfig).toBeNull();
    });
  });
});
