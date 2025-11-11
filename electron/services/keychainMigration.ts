import Store from 'electron-store';
import * as keytar from 'keytar';

const KEYCHAIN_SERVICE = 'ingest-assistant';

type OldAIConfigSchema = {
  provider: 'openrouter' | 'openai' | 'anthropic' | null;
  model: string | null;
  apiKey: string | null; // Old plaintext storage
};

// Helper interface for Store methods
interface StoreWithMethods<T> {
  get<K extends keyof T>(key: K): T[K];
  set<K extends keyof T>(key: K, value: T[K]): void;
}

/**
 * Migrate API keys from electron-store (plaintext) to macOS Keychain (encrypted)
 * This is a one-time migration for existing users
 * Returns true if migration was performed, false if nothing to migrate
 */
export async function migrateToKeychain(): Promise<boolean> {
  const oldStore = new Store<OldAIConfigSchema>({ name: 'ai-config' }) as unknown as StoreWithMethods<OldAIConfigSchema>;

  const provider = oldStore.get('provider');
  const apiKey = oldStore.get('apiKey');

  if (!provider || !apiKey) {
    // Nothing to migrate (either not configured or already migrated)
    return false;
  }

  try {
    // Move API key to Keychain
    const keychainAccount = `${provider}-key`;
    await keytar.setPassword(KEYCHAIN_SERVICE, keychainAccount, apiKey);

    // Clear old plaintext key from electron-store
    oldStore.set('apiKey', null);

    console.log(`Successfully migrated ${provider} API key to Keychain`);
    return true;
  } catch (error) {
    console.error('Failed to migrate API key to Keychain:', error);
    // Don't delete the old key if migration failed
    return false;
  }
}
