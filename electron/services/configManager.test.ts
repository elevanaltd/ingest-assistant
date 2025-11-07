import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs/promises';
import { ConfigManager } from './configManager';
import type { AppConfig } from '../../src/types';
import * as keytar from 'keytar';

// Mock fs module
vi.mock('fs/promises');

// Mock keytar
vi.mock('keytar', () => ({
  setPassword: vi.fn(),
  getPassword: vi.fn(),
  deletePassword: vi.fn(),
  findPassword: vi.fn(),
}));

// Mock electron-store
vi.mock('electron-store', () => {
  const storageData = new Map();
  return {
    default: class Store {
      constructor(private config: { name: string; defaults: Record<string, unknown> }) {
        // Initialize with defaults
        if (!storageData.has(config.name)) {
          Object.entries(config.defaults).forEach(([key, value]) => {
            storageData.set(`${config.name}:${key}`, value);
          });
        }
      }

      get(key: string) {
        return storageData.get(`${this.config.name}:${key}`);
      }

      set(key: string, value: unknown) {
        storageData.set(`${this.config.name}:${key}`, value);
      }

      clear() {
        const prefix = `${this.config.name}:`;
        Array.from(storageData.keys())
          .filter(k => k.startsWith(prefix))
          .forEach(k => storageData.delete(k));
      }

      static _clearAll() {
        storageData.clear();
      }
    }
  };
});

// Mock OpenAI and Anthropic - ensure they return successful responses
const mockOpenAIModelsRetrieve = vi.fn().mockResolvedValue({ id: 'gpt-4' });
const mockOpenAICreate = vi.fn().mockResolvedValue({
  choices: [{ message: { content: 'test' } }]
});

vi.mock('openai', () => ({
  default: class MockOpenAI {
    models = {
      retrieve: mockOpenAIModelsRetrieve,
    };
    chat = {
      completions: {
        create: mockOpenAICreate,
      },
    };
  },
}));

const mockAnthropicCreate = vi.fn().mockResolvedValue({
  id: 'msg_123',
  content: [{ text: 'test' }],
});

vi.mock('@anthropic-ai/sdk', () => ({
  default: class MockAnthropic {
    messages = {
      create: mockAnthropicCreate,
    };
  },
}));

describe('ConfigManager', () => {
  let configManager: ConfigManager;
  const testConfigPath = '/test/config.yaml';
  // Partial mock of fs/promises for testing (explicit unknown cast)
  const mockFs = fs as unknown as {
    readFile: ReturnType<typeof vi.fn>;
    mkdir: ReturnType<typeof vi.fn>;
    writeFile: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    // Clear electron-store data
    const Store = (await import('electron-store')).default;
    (Store as unknown as { _clearAll: () => void })._clearAll();

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
      expect(lexicon.synonymMapping?.['faucet']).toBe('tap');
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
    it('should return OpenRouter config from environment variables', async () => {
      process.env.AI_PROVIDER = 'openrouter';
      process.env.OPENROUTER_API_KEY = 'test-key';
      process.env.AI_MODEL = 'anthropic/claude-3.5-sonnet';

      const aiConfig = await ConfigManager.getAIConfig();

      expect(aiConfig).not.toBeNull();
      expect(aiConfig!.provider).toBe('openrouter');
      expect(aiConfig!.apiKey).toBe('test-key');
      expect(aiConfig!.model).toBe('anthropic/claude-3.5-sonnet');

      // Cleanup
      delete process.env.AI_PROVIDER;
      delete process.env.OPENROUTER_API_KEY;
      delete process.env.AI_MODEL;
    });

    it('should return OpenAI config from environment variables', async () => {
      process.env.AI_PROVIDER = 'openai';
      process.env.OPENAI_API_KEY = 'test-key';
      process.env.AI_MODEL = 'gpt-4-vision-preview';

      const aiConfig = await ConfigManager.getAIConfig();

      expect(aiConfig).not.toBeNull();
      expect(aiConfig!.provider).toBe('openai');
      expect(aiConfig!.apiKey).toBe('test-key');
      expect(aiConfig!.model).toBe('gpt-4-vision-preview');

      // Cleanup
      delete process.env.AI_PROVIDER;
      delete process.env.OPENAI_API_KEY;
      delete process.env.AI_MODEL;
    });

    it('should default to OpenRouter if no provider specified', async () => {
      delete process.env.AI_PROVIDER;
      process.env.OPENROUTER_API_KEY = 'test-key';

      const aiConfig = await ConfigManager.getAIConfig();

      expect(aiConfig).not.toBeNull();
      expect(aiConfig!.provider).toBe('openrouter');

      // Cleanup
      delete process.env.OPENROUTER_API_KEY;
    });

    it('should return null if API key is not configured', async () => {
      delete process.env.OPENAI_API_KEY;
      delete process.env.ANTHROPIC_API_KEY;
      delete process.env.OPENROUTER_API_KEY;

      const aiConfig = await ConfigManager.getAIConfig();

      expect(aiConfig).toBeNull();
    });
  });

  describe('electron-store AI config (instance methods)', () => {
    describe('getAIConfigFromStore', () => {
      it('should return AI config metadata from electron-store (no API key)', async () => {
        // Save config first
        await configManager.saveAIConfig({
          provider: 'openrouter',
          model: 'anthropic/claude-3.5-sonnet',
          apiKey: 'stored-key',
        });

        const config = configManager.getAIConfigFromStore();

        expect(config).toBeDefined();
        expect(config?.provider).toBe('openrouter');
        expect(config?.model).toBe('anthropic/claude-3.5-sonnet');
        expect(config?.apiKey).toBeNull(); // API key not in store anymore
      });

      it('should return null if no config in electron-store', () => {
        const config = configManager.getAIConfigFromStore();

        expect(config).toBeNull();
      });
    });

    describe('saveAIConfig', () => {
      it('should save AI config metadata to electron-store and key to Keychain', async () => {
        const mockSetPassword = vi.mocked(keytar.setPassword);
        mockSetPassword.mockResolvedValue();

        const config = {
          provider: 'openrouter' as const,
          model: 'anthropic/claude-3.5-sonnet',
          apiKey: 'test-key-123',
        };

        const result = await configManager.saveAIConfig(config);

        expect(result).toBe(true);
        expect(mockSetPassword).toHaveBeenCalledWith('ingest-assistant', 'openrouter-key', 'test-key-123');

        // Verify metadata was saved (but not API key)
        const retrieved = configManager.getAIConfigFromStore();
        expect(retrieved?.provider).toBe('openrouter');
        expect(retrieved?.model).toBe('anthropic/claude-3.5-sonnet');
        expect(retrieved?.apiKey).toBeNull();
      });

      it('should return false on save error', async () => {
        const config = {
          provider: 'openai' as const,
          model: 'gpt-4',
          apiKey: 'test-key',
        };

        // Mock store.set to throw error
        const originalSet = (configManager['aiConfigStore'] as any).set;
        (configManager['aiConfigStore'] as any).set = vi.fn().mockImplementation(() => {
          throw new Error('Store error');
        });

        const result = await configManager.saveAIConfig(config);

        expect(result).toBe(false);

        // Restore
        (configManager['aiConfigStore'] as any).set = originalSet;
      });
    });

    describe('getAIConfigForUI', () => {
      it('should return AI config metadata (no API key in store)', async () => {
        const mockSetPassword = vi.mocked(keytar.setPassword);
        mockSetPassword.mockResolvedValue();

        await configManager.saveAIConfig({
          provider: 'openrouter',
          model: 'anthropic/claude-3.5-sonnet',
          apiKey: 'sk-1234567890abcdef',
        });

        const uiConfig = configManager.getAIConfigForUI();

        expect(uiConfig.provider).toBe('openrouter');
        expect(uiConfig.model).toBe('anthropic/claude-3.5-sonnet');
        expect(uiConfig.apiKey).toBe('***'); // No key in store, so masked as ***
      });

      it('should handle null config gracefully', () => {
        const uiConfig = configManager.getAIConfigForUI();

        expect(uiConfig.provider).toBeNull();
        expect(uiConfig.model).toBeNull();
        expect(uiConfig.apiKey).toBe('');
      });
    });

    describe('testAIConnection', () => {
      it('should validate OpenRouter API key successfully', async () => {
        const result = await configManager.testAIConnection(
          'openrouter',
          'anthropic/claude-3.5-sonnet',
          'valid-key'
        );

        expect(result.success).toBe(true);
      });

      it('should validate OpenAI API key successfully', async () => {
        const result = await configManager.testAIConnection(
          'openai',
          'gpt-4-vision-preview',
          'valid-key'
        );

        expect(result.success).toBe(true);
      });

      it('should validate Anthropic API key successfully', async () => {
        const result = await configManager.testAIConnection(
          'anthropic',
          'claude-3-5-sonnet-20241022',
          'valid-key'
        );

        expect(result.success).toBe(true);
      });
    });

    describe('getAIConfig with fallback', () => {
      it('should prioritize electron-store over process.env', async () => {
        const mockGetPassword = vi.mocked(keytar.getPassword);
        mockGetPassword.mockResolvedValue('stored-key');

        // Save config to store
        await configManager.saveAIConfig({
          provider: 'openrouter',
          model: 'anthropic/claude-3.5-sonnet',
          apiKey: 'stored-key',
        });

        // Also set env var
        process.env.OPENROUTER_API_KEY = 'env-key';

        // Store has config - should take precedence
        const config = await ConfigManager.getAIConfig();

        expect(config).not.toBeNull();
        expect(config!.apiKey).toBe('stored-key'); // Store takes precedence

        // Cleanup
        delete process.env.OPENROUTER_API_KEY;
      });

      it('should fall back to process.env if store is empty', async () => {
        // Store is empty (we cleared it in beforeEach)
        process.env.AI_PROVIDER = 'openrouter';
        process.env.OPENROUTER_API_KEY = 'env-key';

        const config = await ConfigManager.getAIConfig();

        expect(config).not.toBeNull();
        expect(config!.apiKey).toBe('env-key');

        // Cleanup
        delete process.env.AI_PROVIDER;
        delete process.env.OPENROUTER_API_KEY;
      });
    });
  });

  describe('ConfigManager - Keychain Integration', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    describe('saveAIConfig with Keychain', () => {
      it('should store API key in Keychain and metadata in electron-store', async () => {
        const mockSetPassword = vi.mocked(keytar.setPassword);
        mockSetPassword.mockResolvedValue();

        await configManager.saveAIConfig({
          provider: 'openrouter',
          model: 'anthropic/claude-3.5-sonnet',
          apiKey: 'sk-test-key'
        });

        // API key goes to Keychain
        expect(mockSetPassword).toHaveBeenCalledWith(
          'ingest-assistant',
          'openrouter-key',
          'sk-test-key'
        );

        // Provider/model go to electron-store
        const storedConfig = configManager.getAIConfigFromStore();
        expect(storedConfig?.provider).toBe('openrouter');
        expect(storedConfig?.model).toBe('anthropic/claude-3.5-sonnet');
        expect(storedConfig?.apiKey).toBeNull(); // Not in electron-store anymore
      });

      it('should handle multiple providers with separate Keychain entries', async () => {
        const mockSetPassword = vi.mocked(keytar.setPassword);
        mockSetPassword.mockResolvedValue();

        // Save OpenRouter key
        await configManager.saveAIConfig({
          provider: 'openrouter',
          model: 'model1',
          apiKey: 'key1'
        });

        // Save OpenAI key (switch provider)
        await configManager.saveAIConfig({
          provider: 'openai',
          model: 'model2',
          apiKey: 'key2'
        });

        expect(mockSetPassword).toHaveBeenCalledWith('ingest-assistant', 'openrouter-key', 'key1');
        expect(mockSetPassword).toHaveBeenCalledWith('ingest-assistant', 'openai-key', 'key2');
      });
    });

    describe('getAIConfigWithKeychain', () => {
      it('should retrieve API key from Keychain and combine with electron-store', async () => {
        const mockGetPassword = vi.mocked(keytar.getPassword);
        const mockSetPassword = vi.mocked(keytar.setPassword);
        mockSetPassword.mockResolvedValue();

        // Setup: electron-store has provider/model
        await configManager.saveAIConfig({
          provider: 'openrouter',
          model: 'test-model',
          apiKey: 'test-key' // This will be in Keychain
        });

        // Mock Keychain retrieval
        mockGetPassword.mockResolvedValue('test-key');

        const config = await configManager.getAIConfigWithKeychain();

        expect(mockGetPassword).toHaveBeenCalledWith('ingest-assistant', 'openrouter-key');
        expect(config).toEqual({
          provider: 'openrouter',
          model: 'test-model',
          apiKey: 'test-key'
        });
      });

      it('should handle missing Keychain entry gracefully', async () => {
        const mockGetPassword = vi.mocked(keytar.getPassword);
        mockGetPassword.mockResolvedValue(null); // No key in Keychain

        // Clear any env vars that would provide fallback
        delete process.env.AI_PROVIDER;
        delete process.env.AI_MODEL;
        delete process.env.OPENAI_API_KEY;
        delete process.env.ANTHROPIC_API_KEY;
        delete process.env.OPENROUTER_API_KEY;

        const config = await configManager.getAIConfigWithKeychain();
        expect(config).toBeNull();
      });

      it('should fall back to .env if no Keychain entry', async () => {
        process.env.AI_PROVIDER = 'openai';
        process.env.AI_MODEL = 'gpt-4';
        process.env.OPENAI_API_KEY = 'env-key';

        const mockGetPassword = vi.mocked(keytar.getPassword);
        mockGetPassword.mockResolvedValue(null);

        const config = await configManager.getAIConfigWithKeychain();

        expect(config).toEqual({
          provider: 'openai',
          model: 'gpt-4',
          apiKey: 'env-key'
        });

        // Cleanup
        delete process.env.AI_PROVIDER;
        delete process.env.AI_MODEL;
        delete process.env.OPENAI_API_KEY;
      });
    });

    describe('deleteAIConfig', () => {
      it('should remove API key from Keychain and clear electron-store', async () => {
        const mockDeletePassword = vi.mocked(keytar.deletePassword);
        const mockSetPassword = vi.mocked(keytar.setPassword);
        mockDeletePassword.mockResolvedValue(true);
        mockSetPassword.mockResolvedValue();

        // Setup: save config first
        await configManager.saveAIConfig({
          provider: 'openrouter',
          model: 'test-model',
          apiKey: 'test-key'
        });

        await configManager.deleteAIConfig('openrouter');

        expect(mockDeletePassword).toHaveBeenCalledWith('ingest-assistant', 'openrouter-key');

        // Verify store was cleared
        const storedConfig = configManager.getAIConfigFromStore();
        expect(storedConfig).toBeNull();
      });
    });

    describe('getAIConfig (static) with Keychain', () => {
      it('should check Keychain when electron-store has provider/model', async () => {
        const mockGetPassword = vi.mocked(keytar.getPassword);
        const mockSetPassword = vi.mocked(keytar.setPassword);
        mockSetPassword.mockResolvedValue();
        mockGetPassword.mockResolvedValue('keychain-key');

        // Setup: save config to store
        await configManager.saveAIConfig({
          provider: 'openrouter',
          model: 'test-model',
          apiKey: 'keychain-key'
        });

        const config = await ConfigManager.getAIConfig();

        expect(mockGetPassword).toHaveBeenCalledWith('ingest-assistant', 'openrouter-key');
        expect(config).toEqual({
          provider: 'openrouter',
          model: 'test-model',
          apiKey: 'keychain-key'
        });
      });

      it('should fall back to env vars if Keychain is empty', async () => {
        const mockGetPassword = vi.mocked(keytar.getPassword);
        mockGetPassword.mockResolvedValue(null);

        process.env.AI_PROVIDER = 'openai';
        process.env.AI_MODEL = 'gpt-4';
        process.env.OPENAI_API_KEY = 'env-key';

        const config = await ConfigManager.getAIConfig();

        expect(config).toEqual({
          provider: 'openai',
          model: 'gpt-4',
          apiKey: 'env-key'
        });

        // Cleanup
        delete process.env.AI_PROVIDER;
        delete process.env.AI_MODEL;
        delete process.env.OPENAI_API_KEY;
      });
    });
  });

  describe('testSavedAIConnection', () => {
    it('should test connection with saved Keychain API key', async () => {
      const mockGetPassword = vi.mocked(keytar.getPassword);
      const mockSetPassword = vi.mocked(keytar.setPassword);
      mockSetPassword.mockResolvedValue();
      mockGetPassword.mockResolvedValue('saved-keychain-key');

      // Save config to store + Keychain
      await configManager.saveAIConfig({
        provider: 'openrouter',
        model: 'anthropic/claude-3.5-sonnet',
        apiKey: 'saved-keychain-key'
      });

      // Test with saved key (should retrieve from Keychain)
      const result = await configManager.testSavedAIConnection();

      expect(result.success).toBe(true);
      expect(mockGetPassword).toHaveBeenCalledWith('ingest-assistant', 'openrouter-key');
    });

    it('should return error if no saved configuration exists', async () => {
      // No config in store
      const result = await configManager.testSavedAIConnection();

      expect(result.success).toBe(false);
      expect(result.error).toBe('No AI configuration found');
    });

    it('should return error if Keychain key is missing', async () => {
      const mockGetPassword = vi.mocked(keytar.getPassword);
      const mockSetPassword = vi.mocked(keytar.setPassword);
      mockSetPassword.mockResolvedValue();

      // Save config metadata (provider/model)
      await configManager.saveAIConfig({
        provider: 'openai',
        model: 'gpt-4',
        apiKey: 'test-key'
      });

      // Mock Keychain returning null (falls back to env, which is also null in test)
      mockGetPassword.mockResolvedValue(null);

      // Clear env vars so fallback also returns null
      delete process.env.OPENAI_API_KEY;
      delete process.env.ANTHROPIC_API_KEY;
      delete process.env.OPENROUTER_API_KEY;

      const result = await configManager.testSavedAIConnection();

      expect(result.success).toBe(false);
      expect(result.error).toBe('No AI configuration found');
    });

    it('should propagate connection test failures', async () => {
      const mockGetPassword = vi.mocked(keytar.getPassword);
      const mockSetPassword = vi.mocked(keytar.setPassword);
      mockSetPassword.mockResolvedValue();
      mockGetPassword.mockResolvedValue('invalid-key');

      // Mock OpenAI to throw 401 error
      mockOpenAIModelsRetrieve.mockRejectedValueOnce(new Error('401 Unauthorized'));

      await configManager.saveAIConfig({
        provider: 'openai',
        model: 'gpt-4',
        apiKey: 'invalid-key'
      });

      const result = await configManager.testSavedAIConnection();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid API key');
    });
  });
});
