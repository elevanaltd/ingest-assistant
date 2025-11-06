import { useState, useEffect } from 'react';
import type { LexiconConfig, TermMapping } from '../types';

interface SettingsModalProps {
  onClose: () => void;
  onSave: (config: LexiconConfig) => Promise<void>;
  initialConfig?: LexiconConfig;
}

export function SettingsModal({ onClose, onSave, initialConfig }: SettingsModalProps) {
  // Tab state
  const [activeTab, setActiveTab] = useState<'lexicon' | 'ai'>('lexicon');

  // Lexicon state
  const [mappings, setMappings] = useState<TermMapping[]>([]);
  const [alwaysInclude, setAlwaysInclude] = useState<string>('');
  const [customInstructions, setCustomInstructions] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string>('');

  // AI config state
  const [aiProvider, setAiProvider] = useState<'openrouter' | 'openai' | 'anthropic'>('openrouter');
  const [aiModel, setAiModel] = useState('');
  const [aiApiKey, setAiApiKey] = useState('');
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [aiErrorMessage, setAiErrorMessage] = useState('');
  const [isSavingAI, setIsSavingAI] = useState(false);
  const [availableModels, setAvailableModels] = useState<Array<{id: string; name: string; description?: string}>>([]);
  const [loadingModels, setLoadingModels] = useState(false);

  // Success states
  const [lexiconSaveSuccess, setLexiconSaveSuccess] = useState(false);
  const [aiSaveSuccess, setAiSaveSuccess] = useState(false);

  // Load initial lexicon config
  useEffect(() => {
    if (initialConfig) {
      setMappings(initialConfig.termMappings);
      setAlwaysInclude(initialConfig.alwaysInclude.join(', '));
      setCustomInstructions(initialConfig.customInstructions);
    } else {
      // Start with one empty row
      setMappings([{ preferred: '', excluded: '' }]);
    }
  }, [initialConfig]);

  // Load AI config when switching to AI tab
  useEffect(() => {
    if (activeTab === 'ai' && window.electronAPI) {
      window.electronAPI.getAIConfig().then(config => {
        if (config.provider) setAiProvider(config.provider);
        if (config.model) setAiModel(config.model);
        // API key is masked, leave empty for user to enter new one if needed
      });
    }
  }, [activeTab]);

  // Fetch available models when provider changes
  useEffect(() => {
    if (activeTab === 'ai' && window.electronAPI) {
      setLoadingModels(true);
      window.electronAPI.getAIModels(aiProvider).then(models => {
        setAvailableModels(models);
        setLoadingModels(false);
      }).catch(err => {
        console.error('Failed to fetch models:', err);
        setAvailableModels([]);
        setLoadingModels(false);
      });
    }
  }, [aiProvider, activeTab]);

  const handleMappingChange = (index: number, field: 'preferred' | 'excluded', value: string) => {
    const newMappings = [...mappings];
    newMappings[index][field] = value;
    setMappings(newMappings);

    // If user is typing in the last row, add a new empty row
    if (index === mappings.length - 1 && value.trim()) {
      setMappings([...newMappings, { preferred: '', excluded: '' }]);
    }
  };

  const handleRemoveRow = (index: number) => {
    // Don't allow removing the last empty row
    if (mappings.length === 1) return;

    const newMappings = mappings.filter((_, i) => i !== index);
    setMappings(newMappings);
  };

  const handleSave = async () => {
    setError('');
    setLexiconSaveSuccess(false);

    // Validate: Remove empty rows
    const validMappings = mappings.filter(
      m => m.preferred.trim() || m.excluded.trim()
    );

    // Parse alwaysInclude
    const alwaysIncludeArray = alwaysInclude
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0);

    const config: LexiconConfig = {
      termMappings: validMappings,
      alwaysInclude: alwaysIncludeArray,
      customInstructions: customInstructions.trim(),
    };

    setIsSaving(true);
    try {
      await onSave(config);

      // Show success message
      setLexiconSaveSuccess(true);

      // Close after 1.5 seconds
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save lexicon');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTestStatus('testing');
    setAiErrorMessage('');

    let result;

    if (!aiApiKey) {
      // No new key entered, test with saved key from Keychain
      result = await window.electronAPI.testSavedAIConnection();
    } else {
      // New key entered, test with it
      result = await window.electronAPI.testAIConnection(aiProvider, aiModel, aiApiKey);
    }

    if (result.success) {
      setTestStatus('success');
    } else {
      setTestStatus('error');
      setAiErrorMessage(result.error || 'Connection test failed');
    }
  };

  const handleSaveAIConfig = async () => {
    if (!aiApiKey) {
      setAiErrorMessage('Please enter an API key');
      return;
    }

    setIsSavingAI(true);
    setAiErrorMessage('');
    setAiSaveSuccess(false);

    const result = await window.electronAPI.updateAIConfig({
      provider: aiProvider,
      model: aiModel,
      apiKey: aiApiKey
    });

    setIsSavingAI(false);

    if (result.success) {
      // Show success message
      setAiSaveSuccess(true);

      // Close after 1.5 seconds
      setTimeout(() => {
        onClose();
      }, 1500);
    } else {
      setAiErrorMessage(result.error || 'Failed to save configuration');
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h2>Settings</h2>
          <button onClick={onClose} className="modal-close" title="Close">
            ×
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="tabs">
          <button
            className={activeTab === 'lexicon' ? 'tab active' : 'tab'}
            onClick={() => setActiveTab('lexicon')}
          >
            Lexicon
          </button>
          <button
            className={activeTab === 'ai' ? 'tab active' : 'tab'}
            onClick={() => setActiveTab('ai')}
          >
            AI Configuration
          </button>
        </div>

        <div className="modal-body">
          {/* Lexicon Tab */}
          {activeTab === 'lexicon' && (
            <div className="lexicon-tab">
              <section className="settings-section">
                <h3>Word Preferences (what to call things)</h3>
                <p className="section-help">
                  Define preferred terms and their alternatives to avoid
                </p>

            <table className="term-mapping-table">
              <thead>
                <tr>
                  <th>Use This</th>
                  <th>Don't Use (avoid)</th>
                  <th style={{ width: '40px' }}></th>
                </tr>
              </thead>
              <tbody>
                {mappings.map((mapping, index) => (
                  <tr key={index}>
                    <td>
                      <input
                        type="text"
                        value={mapping.preferred}
                        onChange={(e) => handleMappingChange(index, 'preferred', e.target.value)}
                        placeholder="e.g., bin"
                        className="input"
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        value={mapping.excluded}
                        onChange={(e) => handleMappingChange(index, 'excluded', e.target.value)}
                        placeholder="e.g., trash, garbage"
                        className="input"
                      />
                    </td>
                    <td>
                      {index < mappings.length - 1 && (
                        <button
                          onClick={() => handleRemoveRow(index)}
                          className="btn-icon"
                          title="Remove row"
                        >
                          ×
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="settings-section">
            <h3>Additional Terms (always good to use)</h3>
            <p className="section-help">
              Comma-separated list of generally preferred terms
            </p>
            <input
              type="text"
              value={alwaysInclude}
              onChange={(e) => setAlwaysInclude(e.target.value)}
              placeholder="e.g., manufacturer, model, category, brand"
              className="input input-wide"
            />
          </section>

          <section className="settings-section">
            <h3>AI Instructions (free-form guidance)</h3>
            <p className="section-help">
              Additional instructions for how AI should analyze images
            </p>
            <textarea
              value={customInstructions}
              onChange={(e) => setCustomInstructions(e.target.value)}
              placeholder="e.g., Always include 'oven' for oven items&#10;Add manufacturer to metadata&#10;Include model number if visible"
              className="textarea"
              rows={5}
            />
          </section>

              {lexiconSaveSuccess && (
                <div className="status-message success">
                  ✓ Lexicon settings saved successfully!
                </div>
              )}

              {error && (
                <div className="error-message">
                  {error}
                </div>
              )}

              <div className="modal-footer">
                <button onClick={onClose} className="btn" disabled={isSaving}>
                  Cancel
                </button>
                <button onClick={handleSave} className="btn-primary" disabled={isSaving}>
                  {isSaving ? 'Saving...' : 'Save Lexicon'}
                </button>
              </div>
            </div>
          )}

          {/* AI Configuration Tab */}
          {activeTab === 'ai' && (
            <div className="ai-config-tab">
              <div className="form-group">
                <label htmlFor="ai-provider">AI Provider</label>
                <select
                  id="ai-provider"
                  value={aiProvider}
                  onChange={(e) => setAiProvider(e.target.value as any)}
                >
                  <option value="openrouter">OpenRouter (Recommended - 100+ models)</option>
                  <option value="openai">OpenAI</option>
                  <option value="anthropic">Anthropic</option>
                </select>
                <small className="help-text">
                  OpenRouter provides access to multiple AI models with a single API key
                </small>
              </div>

              <div className="form-group">
                <label htmlFor="ai-model">Model</label>
                <input
                  id="ai-model"
                  type="text"
                  list="model-options"
                  value={aiModel}
                  onChange={(e) => setAiModel(e.target.value)}
                  placeholder={
                    loadingModels ? 'Loading models...' :
                    aiProvider === 'openrouter'
                      ? 'anthropic/claude-3.5-sonnet'
                      : aiProvider === 'openai'
                      ? 'gpt-4-vision-preview'
                      : 'claude-3-5-sonnet-20241022'
                  }
                  disabled={loadingModels}
                />
                <datalist id="model-options">
                  {availableModels.map(model => (
                    <option key={model.id} value={model.id}>
                      {model.name}
                    </option>
                  ))}
                </datalist>
                <small className="help-text">
                  {aiProvider === 'openrouter' && !loadingModels && `${availableModels.length} models available`}
                  {aiProvider === 'openai' && 'Examples: gpt-4-vision-preview, gpt-4o'}
                  {aiProvider === 'anthropic' && 'Examples: claude-3-5-sonnet-20241022'}
                </small>
              </div>

              <div className="form-group">
                <label htmlFor="ai-api-key">API Key</label>
                <input
                  id="ai-api-key"
                  type="password"
                  value={aiApiKey}
                  onChange={(e) => setAiApiKey(e.target.value)}
                  placeholder="Enter your API key"
                />
                <small className="help-text">
                  {aiProvider === 'openrouter' && 'Get your key at openrouter.ai/keys'}
                  {aiProvider === 'openai' && 'Get your key at platform.openai.com/api-keys'}
                  {aiProvider === 'anthropic' && 'Get your key at console.anthropic.com'}
                </small>
              </div>

              <div className="button-group">
                <button
                  onClick={handleTestConnection}
                  disabled={testStatus === 'testing'}
                  className="btn-secondary"
                >
                  {testStatus === 'testing'
                    ? 'Testing...'
                    : aiApiKey
                    ? 'Test New Key'
                    : 'Test Saved Connection'}
                </button>
              </div>

              {testStatus === 'success' && (
                <div className="status-message success">
                  ✓ Connection successful! API key is valid.
                </div>
              )}

              {testStatus === 'error' && aiErrorMessage && (
                <div className="status-message error">
                  ✗ {aiErrorMessage}
                </div>
              )}

              {aiErrorMessage && testStatus !== 'success' && testStatus !== 'error' && (
                <div className="status-message error">
                  ✗ {aiErrorMessage}
                </div>
              )}

              {aiSaveSuccess && (
                <div className="status-message success">
                  ✓ AI configuration saved successfully! Settings will be available after closing.
                </div>
              )}

              <div className="modal-footer">
                <button onClick={onClose} className="btn-secondary">
                  Cancel
                </button>
                <button
                  onClick={handleSaveAIConfig}
                  disabled={isSavingAI || !aiApiKey}
                  className="btn"
                >
                  {isSavingAI ? 'Saving...' : 'Save Configuration'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
