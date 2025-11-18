import { useState, useEffect, useRef } from 'react';
import type { LexiconConfig } from '../types';

interface SettingsModalProps {
  onClose: () => void;
  onSave: (config: LexiconConfig) => Promise<void>;
  initialConfig?: LexiconConfig;
}

export function SettingsModal({ onClose, onSave, initialConfig }: SettingsModalProps) {
  // Tab state
  const [activeTab, setActiveTab] = useState<'lexicon' | 'ai'>('lexicon');

  // Lexicon state - simple text fields
  const [pattern, setPattern] = useState('{location}-{subject}-{shotType}');
  const [commonLocations, setCommonLocations] = useState('');
  const [commonSubjects, setCommonSubjects] = useState('');
  const [commonActions, setCommonActions] = useState('');
  const [wordPreferences, setWordPreferences] = useState('');
  const [aiInstructions, setAiInstructions] = useState('');
  const [goodExamples, setGoodExamples] = useState('');
  const [badExamples, setBadExamples] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string>('');

  // AI config state
  const [aiProvider, setAiProvider] = useState<'openrouter' | 'openai' | 'anthropic'>('openrouter');
  const [aiModel, setAiModel] = useState('');
  const [aiApiKey, setAiApiKey] = useState('');
  const [hasSavedKey, setHasSavedKey] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [aiErrorMessage, setAiErrorMessage] = useState('');
  const [isSavingAI, setIsSavingAI] = useState(false);
  const [availableModels, setAvailableModels] = useState<Array<{id: string; name: string; description?: string}>>([]);
  const [loadingModels, setLoadingModels] = useState(false);

  // Success states
  const [lexiconSaveSuccess, setLexiconSaveSuccess] = useState(false);
  const [aiSaveSuccess, setAiSaveSuccess] = useState(false);

  // Refs for cleanup
  const lexiconCloseTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const aiCloseTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Handle Escape key to close modal
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (lexiconCloseTimeoutRef.current) {
        clearTimeout(lexiconCloseTimeoutRef.current);
      }
      if (aiCloseTimeoutRef.current) {
        clearTimeout(aiCloseTimeoutRef.current);
      }
    };
  }, []);

  // Load initial lexicon config
  useEffect(() => {
    if (initialConfig) {
      setPattern(initialConfig.pattern || '{location}-{subject}-{shotType}');
      setCommonLocations(initialConfig.commonLocations || '');
      setCommonSubjects(initialConfig.commonSubjects || '');
      setCommonActions(initialConfig.commonActions || '');
      setWordPreferences(initialConfig.wordPreferences || '');
      setAiInstructions(initialConfig.aiInstructions || '');
      setGoodExamples(initialConfig.goodExamples || '');
      setBadExamples(initialConfig.badExamples || '');
    }
  }, [initialConfig]);

  // Load AI config when switching to AI tab
  useEffect(() => {
    if (activeTab === 'ai' && window.electronAPI) {
      Promise.all([
        window.electronAPI.getAIConfig(),
        window.electronAPI.isAIConfigured()
      ]).then(([config, isConfigured]) => {
        if (config.provider) {
          setAiProvider(config.provider);
        }
        if (config.model) setAiModel(config.model);
        setHasSavedKey(isConfigured);
      }).catch(error => {
        setAiErrorMessage(`Failed to load AI configuration: ${error.message}`);
      });
    }
  }, [activeTab]);

  // Fetch available models when provider changes
  useEffect(() => {
    if (activeTab === 'ai' && window.electronAPI) {
      let isCurrent = true; // Track if this effect is still current
      setLoadingModels(true);

      window.electronAPI.getAIModels(aiProvider)
        .then(models => {
          if (isCurrent) { // Only update if provider hasn't changed
            setAvailableModels(models);
          }
        })
        .catch(err => {
          console.error('Failed to fetch models:', err);
          if (isCurrent) {
            setAvailableModels([]);
          }
        })
        .finally(() => {
          if (isCurrent) {
            setLoadingModels(false);
          }
        });

      return () => { isCurrent = false; }; // Cleanup: mark stale
    }
  }, [aiProvider, activeTab]);

  const handleSaveLexicon = async () => {
    try {
      setError('');
      setIsSaving(true);
      setLexiconSaveSuccess(false);

      const config: LexiconConfig = {
        pattern: pattern.trim(),
        commonLocations: commonLocations.trim(),
        commonSubjects: commonSubjects.trim(),
        commonActions: commonActions.trim(),
        wordPreferences: wordPreferences.trim(),
        aiInstructions: aiInstructions.trim(),
        goodExamples: goodExamples.trim(),
        badExamples: badExamples.trim(),
      };

      await onSave(config);
      setLexiconSaveSuccess(true);

      // Clear any existing timeout
      if (lexiconCloseTimeoutRef.current) {
        clearTimeout(lexiconCloseTimeoutRef.current);
      }

      // Auto-close modal after brief delay to show success message
      lexiconCloseTimeoutRef.current = setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestAIConnection = async () => {
    if (!aiApiKey && !hasSavedKey) {
      setAiErrorMessage('Please enter an API key');
      return;
    }

    setTestStatus('testing');
    setAiErrorMessage('');

    try {
      const result = await window.electronAPI.testAIConnection(
        aiProvider,
        aiModel || availableModels[0]?.id || '',
        aiApiKey || ''
      );

      if (result.success) {
        setTestStatus('success');
        setTimeout(() => setTestStatus('idle'), 3000);
      } else {
        setTestStatus('error');
        setAiErrorMessage(result.error || 'Connection test failed');
      }
    } catch (err) {
      setTestStatus('error');
      setAiErrorMessage(err instanceof Error ? err.message : 'Connection test failed');
    }
  };

  const handleTestSavedConnection = async () => {
    setTestStatus('testing');
    setAiErrorMessage('');

    try {
      const result = await window.electronAPI.testSavedAIConnection();

      if (result.success) {
        setTestStatus('success');
        setTimeout(() => setTestStatus('idle'), 3000);
      } else {
        setTestStatus('error');
        setAiErrorMessage(result.error || 'Connection test failed');
      }
    } catch (err) {
      setTestStatus('error');
      setAiErrorMessage(err instanceof Error ? err.message : 'Connection test failed');
    }
  };

  const handleSaveAI = async () => {
    if (!aiModel) {
      setAiErrorMessage('Please select a model');
      return;
    }

    if (!aiApiKey && !hasSavedKey) {
      setAiErrorMessage('Please enter an API key');
      return;
    }

    setIsSavingAI(true);
    setAiErrorMessage('');
    setAiSaveSuccess(false);

    try {
      const result = await window.electronAPI.updateAIConfig({
        provider: aiProvider,
        model: aiModel,
        apiKey: aiApiKey || ''
      });

      if (result.success) {
        setAiSaveSuccess(true);
        setHasSavedKey(true);
        setAiApiKey('');

        // Clear any existing timeout
        if (aiCloseTimeoutRef.current) {
          clearTimeout(aiCloseTimeoutRef.current);
        }

        // Auto-close modal after brief delay to show success message
        aiCloseTimeoutRef.current = setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        setAiErrorMessage(result.error || 'Failed to save AI configuration');
      }
    } catch (err) {
      setAiErrorMessage(err instanceof Error ? err.message : 'Failed to save AI configuration');
    } finally {
      setIsSavingAI(false);
    }
  };

  return (
    <div
      className="modal-backdrop"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div
        className="modal-content settings-modal"
        style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          width: '90%',
          maxWidth: '800px',
          maxHeight: '90vh',
          overflow: 'auto',
          padding: '24px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          position: 'relative',
        }}
      >
        <button
          onClick={onClose}
          title="Close settings"
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'none',
            border: 'none',
            fontSize: '24px',
            cursor: 'pointer',
            color: '#666',
            padding: '4px 8px',
            lineHeight: 1,
          }}
          aria-label="Close settings"
        >
          ×
        </button>
        <h2 style={{ marginTop: 0 }}>Settings</h2>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '16px', borderBottom: '1px solid #ddd', marginBottom: '24px' }}>
          <button
            onClick={() => setActiveTab('lexicon')}
            style={{
              padding: '8px 16px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'lexicon' ? '2px solid #007bff' : '2px solid transparent',
              cursor: 'pointer',
              fontWeight: activeTab === 'lexicon' ? 'bold' : 'normal',
            }}
          >
            Lexicon
          </button>
          <button
            onClick={() => setActiveTab('ai')}
            style={{
              padding: '8px 16px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'ai' ? '2px solid #007bff' : '2px solid transparent',
              cursor: 'pointer',
              fontWeight: activeTab === 'ai' ? 'bold' : 'normal',
            }}
          >
            AI Connection
          </button>
        </div>

        {/* Lexicon Tab */}
        {activeTab === 'lexicon' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label htmlFor="pattern" style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
                Pattern
              </label>
              <input
                id="pattern"
                type="text"
                value={pattern}
                onChange={(e) => setPattern(e.target.value)}
                placeholder="{location}-{subject}-{shotType}"
                style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
              />
              <small style={{ color: '#666' }}>
                Photos: {'{location}-{subject}-{shotType}'} • Videos: {'{location}-{subject}-{action}-{shotType}'}
              </small>
            </div>

            <div>
              <label htmlFor="commonLocations" style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
                Common Locations (comma-separated)
              </label>
              <input
                id="commonLocations"
                type="text"
                value={commonLocations}
                onChange={(e) => setCommonLocations(e.target.value)}
                placeholder="kitchen, hall, utility, bath, building"
                style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
              />
            </div>

            <div>
              <label htmlFor="commonSubjects" style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
                Common Subjects (comma-separated)
              </label>
              <input
                id="commonSubjects"
                type="text"
                value={commonSubjects}
                onChange={(e) => setCommonSubjects(e.target.value)}
                placeholder="oven, sink, tap, dishwasher, shower"
                style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
              />
            </div>

            <div>
              <label htmlFor="commonActions" style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
                Common Actions (comma-separated, for videos)
              </label>
              <input
                id="commonActions"
                type="text"
                value={commonActions}
                onChange={(e) => setCommonActions(e.target.value)}
                placeholder="cleaning, installing, replacing, inspecting"
                style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
              />
            </div>

            <div>
              <label htmlFor="wordPreferences" style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
                Word Preferences (one per line: "from → to")
              </label>
              <textarea
                id="wordPreferences"
                value={wordPreferences}
                onChange={(e) => setWordPreferences(e.target.value)}
                placeholder={"faucet → tap\nstove → hob\ntrash → bin"}
                rows={3}
                style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', fontFamily: 'monospace' }}
              />
            </div>

            <div>
              <label htmlFor="aiInstructions" style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
                AI Instructions
              </label>
              <textarea
                id="aiInstructions"
                value={aiInstructions}
                onChange={(e) => setAiInstructions(e.target.value)}
                placeholder="Use lowercase. Hyphens for multi-word terms. Photos use 3-part pattern. Videos use 4-part pattern with action."
                rows={3}
                style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
              />
            </div>

            <div>
              <label htmlFor="goodExamples" style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
                ✅ Good Examples (one per line)
              </label>
              <textarea
                id="goodExamples"
                value={goodExamples}
                onChange={(e) => setGoodExamples(e.target.value)}
                placeholder={"kitchen-oven-CU\nbath-shower-MID\nkitchen-dishwasher-cleaning-MID"}
                rows={3}
                style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', fontFamily: 'monospace' }}
              />
            </div>

            <div>
              <label htmlFor="badExamples" style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
                ❌ Bad Examples (one per line: "wrong-example (reason)")
              </label>
              <textarea
                id="badExamples"
                value={badExamples}
                onChange={(e) => setBadExamples(e.target.value)}
                placeholder={"Kitchen-Oven-CU (mixed case)\nkitchen_oven_CU (underscores)\nkitchen-fridge freezer-CU (missing hyphen)"}
                rows={3}
                style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', fontFamily: 'monospace' }}
              />
            </div>

            {error && <div style={{ color: 'red' }}>{error}</div>}
            {lexiconSaveSuccess && <div style={{ color: 'green' }}>✓ Lexicon settings saved successfully!</div>}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
              <button onClick={onClose} style={{ padding: '8px 16px' }}>
                Cancel
              </button>
              <button
                onClick={handleSaveLexicon}
                disabled={isSaving}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: isSaving ? 'not-allowed' : 'pointer',
                }}
              >
                {isSaving ? 'Saving...' : 'Save Lexicon'}
              </button>
            </div>
          </div>
        )}

        {/* AI Tab */}
        {activeTab === 'ai' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label htmlFor="aiProvider" style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
                Provider
              </label>
              <select
                id="aiProvider"
                value={aiProvider}
                onChange={(e) => setAiProvider(e.target.value as 'openrouter' | 'openai' | 'anthropic')}
                style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
              >
                <option value="openrouter">OpenRouter</option>
                <option value="openai">OpenAI</option>
                <option value="anthropic">Anthropic</option>
              </select>
            </div>

            <div>
              <label htmlFor="aiModel" style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
                Model {availableModels.length > 0 && <span style={{ color: '#666', fontSize: '12px', fontWeight: 'normal' }}>({availableModels.length} available)</span>}
              </label>
              <input
                id="aiModel"
                type="text"
                list="modelList"
                value={aiModel}
                onChange={(e) => setAiModel(e.target.value)}
                disabled={loadingModels}
                placeholder={loadingModels ? "Loading models..." : availableModels.length > 0 ? "Type to search or select..." : "No models available"}
                style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
              />
              <datalist id="modelList">
                {availableModels.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name}
                  </option>
                ))}
              </datalist>
              {aiModel && !availableModels.find(m => m.id === aiModel) && availableModels.length > 0 && (
                <small style={{ color: '#f59e0b', display: 'block', marginTop: '4px' }}>
                  ⚠️ Model not in list - will use as custom model ID
                </small>
              )}
            </div>

            <div>
              <label htmlFor="aiApiKey" style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
                API Key {hasSavedKey && <span style={{ color: 'green', fontSize: '12px' }}>(saved in Keychain)</span>}
              </label>
              <input
                id="aiApiKey"
                type="password"
                value={aiApiKey}
                onChange={(e) => setAiApiKey(e.target.value)}
                placeholder={hasSavedKey ? "Leave empty to keep existing key" : "Enter API key"}
                style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
              />
            </div>

            {aiErrorMessage && <div style={{ color: 'red' }}>{aiErrorMessage}</div>}
            {aiSaveSuccess && <div style={{ color: 'green' }}>✓ AI configuration saved successfully!</div>}

            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
              {hasSavedKey && (
                <button
                  onClick={handleTestSavedConnection}
                  disabled={testStatus === 'testing'}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#28a745',
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
                onClick={handleTestAIConnection}
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
                onClick={handleSaveAI}
                disabled={isSavingAI}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: isSavingAI ? 'not-allowed' : 'pointer',
                }}
              >
                {isSavingAI ? 'Saving...' : 'Save AI Config'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
