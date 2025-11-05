import * as fs from 'fs/promises';
import * as path from 'path';
import * as yaml from 'js-yaml';
import type { AppConfig, Lexicon, AIConfig } from '../../src/types';

export class ConfigManager {
  private configPath: string;
  private cachedConfig: AppConfig | null = null;

  constructor(configPath: string) {
    this.configPath = configPath;
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
    } catch (error: any) {
      if (error.code === 'ENOENT') {
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
   * Get AI configuration from environment variables
   * Returns null if API key is not configured
   */
  static getAIConfig(): AIConfig | null {
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
