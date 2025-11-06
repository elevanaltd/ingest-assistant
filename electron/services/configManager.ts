import * as fs from 'fs/promises';
import * as path from 'path';
import * as yaml from 'js-yaml';
import Store from 'electron-store';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import * as keytar from 'keytar';
import type { AppConfig, Lexicon, AIConfig, AIConfigForUI, AIConnectionTestResult } from '../../src/types';

const KEYCHAIN_SERVICE = 'ingest-assistant';

type AIConfigSchema = {
  provider: 'openrouter' | 'openai' | 'anthropic' | null;
  model: string | null;
  apiKey: string | null; // Deprecated: now stored in Keychain
};

export class ConfigManager {
  private configPath: string;
  private cachedConfig: AppConfig | null = null;
  private aiConfigStore: Store<AIConfigSchema>;

  // Static store for getAIConfig to check electron-store
  private static staticAIConfigStore: Store<AIConfigSchema> | null = null;

  constructor(configPath: string) {
    this.configPath = configPath;
    this.aiConfigStore = new Store<AIConfigSchema>({
      name: 'ai-config',
      defaults: {
        provider: null,
        model: null,
        apiKey: null,
      },
    });

    // Initialize static store on first instantiation
    if (!ConfigManager.staticAIConfigStore) {
      ConfigManager.staticAIConfigStore = this.aiConfigStore;
    }
  }

  /**
   * Load configuration from YAML file
   * Returns default config if file doesn't exist
   */
  async loadConfig(): Promise<AppConfig> {
    try {
      const content = await fs.readFile(this.configPath, 'utf-8');
      const config = yaml.load(content) as AppConfig;
      this.cachedConfig = config;
      return config;
    } catch (error) {
      // Type guard: Check if error has code property (NodeJS.ErrnoException)
      if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
        // File doesn't exist, return default config
        this.cachedConfig = this.getDefaultConfig();
        return this.cachedConfig;
      }
      // Re-throw other errors (like YAML parse errors)
      throw error;
    }
  }

  /**
   * Save configuration to YAML file
   */
  async saveConfig(config: AppConfig): Promise<boolean> {
    try {
      const yamlContent = yaml.dump(config, {
        indent: 2,
        lineWidth: -1,
      });

      // Ensure directory exists
      const dir = path.dirname(this.configPath);
      await fs.mkdir(dir, { recursive: true });

      await fs.writeFile(this.configPath, yamlContent, 'utf-8');
      this.cachedConfig = config;
      return true;
    } catch (error) {
      console.error('Failed to save config:', error);
      return false;
    }
  }

  /**
   * Get lexicon from current config
   */
  async getLexicon(): Promise<Lexicon> {
    if (!this.cachedConfig) {
      await this.loadConfig();
    }
    return this.cachedConfig!.lexicon;
  }

  /**
   * Save lexicon to config file
   */
  async saveLexicon(lexicon: Lexicon): Promise<void> {
    const config = await this.loadConfig();
    config.lexicon = lexicon;

    const yamlContent = yaml.dump(config, {
      indent: 2,
      lineWidth: -1,
    });

    // Ensure directory exists
    const dir = path.dirname(this.configPath);
    await fs.mkdir(dir, { recursive: true });

    await fs.writeFile(this.configPath, yamlContent, 'utf-8');
    this.cachedConfig = config;
  }

  /**
   * Get default configuration
   */
  getDefaultConfig(): AppConfig {
    return {
      lexicon: {
        preferredTerms: [],
        excludedTerms: [],
        synonymMapping: {},
      },
    };
  }

  /**
   * Get AI config metadata from electron-store (without API key)
   * Returns null if not configured in store
   * Note: API keys are now stored in Keychain, use getAIConfigWithKeychain() for full config
   */
  getAIConfigFromStore(): AIConfig | null {
    const provider = (this.aiConfigStore as any).get('provider');
    const model = (this.aiConfigStore as any).get('model');
    const apiKey = (this.aiConfigStore as any).get('apiKey');

    if (!provider || !model) {
      return null;
    }

    // Return config with apiKey (will be null for Keychain-stored keys)
    return { provider, model, apiKey };
  }

  /**
   * Save AI configuration to electron-store (metadata) and macOS Keychain (API key)
   */
  async saveAIConfig(config: AIConfig): Promise<boolean> {
    try {
      // Store API key in macOS Keychain
      const keychainAccount = `${config.provider}-key`;
      await keytar.setPassword(KEYCHAIN_SERVICE, keychainAccount, config.apiKey);

      // Store non-sensitive metadata in electron-store
      (this.aiConfigStore as any).set('provider', config.provider);
      (this.aiConfigStore as any).set('model', config.model);
      (this.aiConfigStore as any).set('apiKey', null); // Don't store in plaintext anymore
      return true;
    } catch (error) {
      console.error('Failed to save AI config:', error);
      return false;
    }
  }

  /**
   * Get AI configuration with API key from Keychain
   * Returns full config with sensitive data retrieved from macOS Keychain
   */
  async getAIConfigWithKeychain(): Promise<AIConfig | null> {
    const provider = (this.aiConfigStore as any).get('provider');
    const model = (this.aiConfigStore as any).get('model');

    if (!provider || !model) {
      // Fall back to .env
      return ConfigManager.getAIConfig();
    }

    // Retrieve API key from Keychain
    const keychainAccount = `${provider}-key`;
    const apiKey = await keytar.getPassword(KEYCHAIN_SERVICE, keychainAccount);

    if (!apiKey) {
      // No key in Keychain, try .env fallback
      return ConfigManager.getAIConfig();
    }

    return { provider, model, apiKey };
  }

  /**
   * Delete AI configuration from both Keychain and electron-store
   */
  async deleteAIConfig(provider: string): Promise<void> {
    const keychainAccount = `${provider}-key`;
    await keytar.deletePassword(KEYCHAIN_SERVICE, keychainAccount);

    // Clear electron-store if this was active provider
    if ((this.aiConfigStore as any).get('provider') === provider) {
      (this.aiConfigStore as any).set('provider', null);
      (this.aiConfigStore as any).set('model', null);
      (this.aiConfigStore as any).set('apiKey', null);
    }
  }

  /**
   * Get AI configuration for UI with masked API key
   * Safe to expose to renderer process
   * Note: With Keychain storage, API keys are not available in electron-store
   */
  getAIConfigForUI(): AIConfigForUI {
    const config = this.getAIConfigFromStore();

    if (!config) {
      return {
        provider: null,
        model: null,
        apiKey: '',
      };
    }

    // Mask API key: show first 5 chars and last 4 chars (if available in store)
    // With Keychain storage, apiKey will be null, so show '***'
    const maskedKey = config.apiKey && config.apiKey.length > 9
      ? `${config.apiKey.substring(0, 5)}...${config.apiKey.substring(config.apiKey.length - 4)}`
      : '***';

    return {
      provider: config.provider,
      model: config.model,
      apiKey: maskedKey,
    };
  }

  /**
   * Test AI connection using saved Keychain API key
   * Retrieves configuration from electron-store and Keychain, then tests the connection
   */
  async testSavedAIConnection(): Promise<AIConnectionTestResult> {
    try {
      const config = await this.getAIConfigWithKeychain();

      if (!config) {
        return { success: false, error: 'No AI configuration found' };
      }

      if (!config.apiKey) {
        return { success: false, error: 'No API key found in Keychain' };
      }

      // Use existing testAIConnection logic
      return await this.testAIConnection(config.provider, config.model, config.apiKey);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Test failed'
      };
    }
  }

  /**
   * Fetch available models from AI provider
   * Returns a list of models with id, name, and optional description
   */
  async getAIModels(provider: string): Promise<Array<{id: string; name: string; description?: string}>> {
    try {
      if (provider === 'openrouter') {
        // Fetch from OpenRouter API
        const response = await fetch('https://openrouter.ai/api/v1/models');
        if (!response.ok) {
          throw new Error(`OpenRouter API error: ${response.statusText}`);
        }
        const data = await response.json() as { data: Array<{ id: string; name?: string; description?: string }> };

        // Transform to simplified format
        return data.data.map((model) => ({
          id: model.id,
          name: model.name || model.id,
          description: model.description
        }));
      } else if (provider === 'openai') {
        // Return common OpenAI models (API requires auth to list)
        return [
          { id: 'gpt-4-vision-preview', name: 'GPT-4 Vision Preview', description: 'Advanced vision and text model' },
          { id: 'gpt-4o', name: 'GPT-4o', description: 'Multimodal model with vision capabilities' },
          { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', description: 'Fast GPT-4 with vision' },
          { id: 'gpt-4', name: 'GPT-4', description: 'Most capable GPT-4 model' },
        ];
      } else if (provider === 'anthropic') {
        // Return common Anthropic models
        return [
          { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', description: 'Latest balanced model with vision' },
          { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', description: 'Most capable Claude model' },
          { id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet', description: 'Balanced performance and speed' },
          { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku', description: 'Fastest Claude model' },
        ];
      }

      return [];
    } catch (error) {
      console.error('Failed to fetch models:', error);
      return [];
    }
  }

  /**
   * Test AI connection by making a minimal API call
   */
  async testAIConnection(
    provider: 'openai' | 'anthropic' | 'openrouter',
    model: string,
    apiKey: string
  ): Promise<AIConnectionTestResult> {
    try {
      if (provider === 'openai') {
        const client = new OpenAI({ apiKey, timeout: 5000 });
        await client.models.retrieve(model.split('-')[0]); // Test with model family
        return { success: true };
      } else if (provider === 'openrouter') {
        const client = new OpenAI({
          apiKey,
          baseURL: 'https://openrouter.ai/api/v1',
          timeout: 5000,
        });
        // OpenRouter: Test with a minimal completion request
        await client.chat.completions.create({
          model,
          messages: [{ role: 'user', content: 'test' }],
          max_tokens: 1,
        });
        return { success: true };
      } else {
        // Anthropic
        const client = new Anthropic({ apiKey, timeout: 5000 });
        await client.messages.create({
          model,
          max_tokens: 1,
          messages: [{ role: 'user', content: 'test' }],
        });
        return { success: true };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Parse common error messages
      if (errorMessage.includes('401') || errorMessage.includes('Unauthorized') || errorMessage.includes('invalid_api_key')) {
        return { success: false, error: 'Invalid API key' };
      }

      return { success: false, error: errorMessage };
    }
  }

  /**
   * Get AI configuration with fallback priority:
   * 1. electron-store + Keychain (production/runtime config)
   * 2. process.env (development/backward compatibility)
   * Returns null if API key is not configured
   */
  static async getAIConfig(): Promise<AIConfig | null> {
    // Priority 1: Check electron-store + Keychain
    if (ConfigManager.staticAIConfigStore) {
      const provider = (ConfigManager.staticAIConfigStore as any).get('provider');
      const model = (ConfigManager.staticAIConfigStore as any).get('model');

      if (provider && model) {
        const keychainAccount = `${provider}-key`;
        const apiKey = await keytar.getPassword(KEYCHAIN_SERVICE, keychainAccount);

        if (apiKey) {
          return { provider, model, apiKey };
        }
      }
    }

    // Priority 2: Fall back to environment variables
    const provider = (process.env.AI_PROVIDER || 'openrouter') as 'openai' | 'anthropic' | 'openrouter';

    let apiKey: string | undefined;
    let defaultModel: string;

    switch (provider) {
      case 'openai':
        apiKey = process.env.OPENAI_API_KEY;
        defaultModel = 'gpt-4-vision-preview';
        break;
      case 'anthropic':
        apiKey = process.env.ANTHROPIC_API_KEY;
        defaultModel = 'claude-3-5-sonnet-20241022';
        break;
      case 'openrouter':
        apiKey = process.env.OPENROUTER_API_KEY;
        defaultModel = 'anthropic/claude-3.5-sonnet'; // Popular OpenRouter model
        break;
    }

    if (!apiKey) {
      return null;
    }

    return {
      provider,
      model: process.env.AI_MODEL || defaultModel,
      apiKey,
    };
  }
}
