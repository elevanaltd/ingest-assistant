interface AITabProps {
  aiProvider: 'openrouter' | 'openai' | 'anthropic';
  setAiProvider: (provider: 'openrouter' | 'openai' | 'anthropic') => void;
  aiModel: string;
  setAiModel: (model: string) => void;
  aiApiKey: string;
  setAiApiKey: (key: string) => void;
  hasSavedKey: boolean;
  testStatus: 'idle' | 'testing' | 'success' | 'error';
  availableModels: Array<{id: string; name: string; description?: string}>;
  loadingModels: boolean;
  onTestConnection: () => Promise<void>;
  onTestSavedConnection: () => Promise<void>;
  onSave: () => Promise<void>;
  onClose: () => void;
  isSaving: boolean;
  saveSuccess: boolean;
  error: string;
}

export function AITab({
  aiProvider,
  setAiProvider,
  aiModel,
  setAiModel,
  aiApiKey,
  setAiApiKey,
  hasSavedKey,
  testStatus,
  availableModels,
  loadingModels,
  onTestConnection,
  onTestSavedConnection,
  onSave,
  onClose,
  isSaving,
  saveSuccess,
  error
}: AITabProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <label htmlFor="aiProvider" style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
          Provider
        </label>
        <select
          id="aiProvider"
          value={aiProvider}
          onChange={(e) => setAiProvider(e.target.value as 'openrouter' | 'openai' | 'anthropic')}
          style={{ width: '100%', padding: '8px', border: '1px solid var(--color-border)', borderRadius: '4px' }}
        >
          <option value="openrouter">OpenRouter</option>
          <option value="openai">OpenAI</option>
          <option value="anthropic">Anthropic</option>
        </select>
      </div>

      <div>
        <label htmlFor="aiModel" style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
          Model {availableModels.length > 0 && <span style={{ color: 'var(--color-text-secondary)', fontSize: '12px', fontWeight: 'normal' }}>({availableModels.length} available)</span>}
        </label>
        <input
          id="aiModel"
          type="text"
          list="modelList"
          value={aiModel}
          onChange={(e) => setAiModel(e.target.value)}
          disabled={loadingModels}
          placeholder={loadingModels ? "Loading models..." : availableModels.length > 0 ? "Type to search or select..." : "No models available"}
          style={{ width: '100%', padding: '8px', border: '1px solid var(--color-border)', borderRadius: '4px' }}
        />
        <datalist id="modelList">
          {availableModels.map((model) => (
            <option key={model.id} value={model.id}>
              {model.name}
            </option>
          ))}
        </datalist>
        {aiModel && !availableModels.find(m => m.id === aiModel) && availableModels.length > 0 && (
          <small style={{ color: 'var(--color-warning-text)', display: 'block', marginTop: '4px' }}>
            ⚠️ Model not in list - will use as custom model ID
          </small>
        )}
      </div>

      <div>
        <label htmlFor="aiApiKey" style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
          API Key {hasSavedKey && <span style={{ color: 'var(--color-success-text)', fontSize: '12px' }}>(saved in Keychain)</span>}
        </label>
        <input
          id="aiApiKey"
          type="password"
          value={aiApiKey}
          onChange={(e) => setAiApiKey(e.target.value)}
          placeholder={hasSavedKey ? "Leave empty to keep existing key" : "Enter API key"}
          style={{ width: '100%', padding: '8px', border: '1px solid var(--color-border)', borderRadius: '4px' }}
        />
      </div>

      {error && <div style={{ color: 'var(--color-danger-text)' }}>{error}</div>}
      {saveSuccess && <div style={{ color: 'var(--color-success-text)' }}>✓ AI configuration saved successfully!</div>}

      <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
        {hasSavedKey && (
          <button
            onClick={onTestSavedConnection}
            disabled={testStatus === 'testing'}
            style={{
              padding: '8px 16px',
              backgroundColor: 'var(--color-success)',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: testStatus === 'testing' ? 'not-allowed' : 'pointer',
            }}
          >
            {testStatus === 'testing' ? 'Testing...' : testStatus === 'success' ? '✓ Success' : 'Test Saved Connection'}
          </button>
        )}
        <button
          onClick={onTestConnection}
          disabled={testStatus === 'testing' || (!aiApiKey && !hasSavedKey)}
          style={{
            padding: '8px 16px',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: (testStatus === 'testing' || (!aiApiKey && !hasSavedKey)) ? 'not-allowed' : 'pointer',
          }}
        >
          {testStatus === 'testing' ? 'Testing...' : 'Test Connection'}
        </button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
        <button onClick={onClose} style={{ padding: '8px 16px' }}>
          Close
        </button>
        <button
          onClick={onSave}
          disabled={isSaving}
          style={{
            padding: '8px 16px',
            backgroundColor: 'var(--color-accent)',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isSaving ? 'not-allowed' : 'pointer',
          }}
        >
          {isSaving ? 'Saving...' : 'Save AI Config'}
        </button>
      </div>
    </div>
  );
}
