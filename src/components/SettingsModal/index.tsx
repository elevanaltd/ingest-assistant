import { useState, useEffect, useRef } from 'react';
import type { LexiconConfig, CfexConfig } from '../../types';
import { useIngestSettings } from '../../contexts/IngestSettingsContext';
import { LexiconTab } from './LexiconTab';
import { AITab } from './AITab';
import { CfexTab } from './CfexTab';
import { IngestionTab } from './IngestionTab';

// Default CFEx paths
const DEFAULT_CFEX_CONFIG: CfexConfig = {
  defaultSource: '/Volumes/Untitled/DCIM/100_FUJI',
  defaultPhotos: '/Volumes/videos-current/2. WORKING PROJECTS/',
  defaultVideos: '/Volumes/EAV_Video_RAW/'
};

interface SettingsModalProps {
  onClose: () => void;
  onSave: (config: LexiconConfig) => Promise<void>; // Phase 5.2: Deprecated (kept for backward compat), saves route through updateSettings
  initialConfig?: LexiconConfig; // Phase 5.2: Deprecated, context is source of truth
  // Session-ephemeral filenameRewrite state (lifted to App.tsx)
  filenameRewrite?: boolean;
  onFilenameRewriteChange?: (enabled: boolean) => void;
}

export function SettingsModal({
  onClose,
  onSave: _onSave, // Phase 5.2: Deprecated, saves route through updateSettings
  initialConfig: _initialConfig, // Phase 5.2: Deprecated, context is source of truth
  filenameRewrite: filenameRewriteProp = false,
  onFilenameRewriteChange
}: SettingsModalProps) {
  // Consume context (Phase 5.2: context consumption)
  const { settings, updateSettings } = useIngestSettings();

  // Tab state
  const [activeTab, setActiveTab] = useState<'lexicon' | 'ai' | 'cfex' | 'ingestion'>('lexicon');

  // Lexicon state - synced from context, local for immediate UI updates
  const [pattern, setPattern] = useState('{location}-{subject}-{shotType}');
  const [commonLocations, setCommonLocations] = useState('');
  const [commonSubjects, setCommonSubjects] = useState('');
  const [commonActions, setCommonActions] = useState('');
  const [wordPreferences, setWordPreferences] = useState('');
  const [aiInstructions, setAiInstructions] = useState('');
  const [goodExamples, setGoodExamples] = useState('');
  const [badExamples, setBadExamples] = useState('');
  const [_isSaving, _setIsSaving] = useState(false);
  const [_error, _setError] = useState<string>('');

  // AI config state
  const [aiProvider, setAiProvider] = useState<'openrouter' | 'openai' | 'anthropic'>('openrouter');
  const [aiModel, setAiModel] = useState('');
  const [aiApiKey, setAiApiKey] = useState('');
  const [hasSavedKey, setHasSavedKey] = useState(false);
  const [_testStatus, _setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [_aiErrorMessage, _setAiErrorMessage] = useState('');
  const [_isSavingAI, _setIsSavingAI] = useState(false);
  const [availableModels, setAvailableModels] = useState<Array<{id: string; name: string; description?: string}>>([]);
  const [_loadingModels, _setLoadingModels] = useState(false);

  // Success states
  const [_lexiconSaveSuccess, _setLexiconSaveSuccess] = useState(false);
  const [_aiSaveSuccess, _setAiSaveSuccess] = useState(false);

  // CFEx config state
  const [cfexSource, setCfexSource] = useState(DEFAULT_CFEX_CONFIG.defaultSource);
  const [cfexPhotos, setCfexPhotos] = useState(DEFAULT_CFEX_CONFIG.defaultPhotos);
  const [cfexVideos, setCfexVideos] = useState(DEFAULT_CFEX_CONFIG.defaultVideos);
  const [_isSavingCfex, _setIsSavingCfex] = useState(false);
  const [_cfexSaveSuccess, _setCfexSaveSuccess] = useState(false);
  const [_cfexError, _setCfexError] = useState<string>('');

  // CFEx toggle states (I7 Human Primacy - default OFF)
  const [aiAutoAnalyze, setAiAutoAnalyze] = useState(false);
  const [metadataWrite, setMetadataWrite] = useState(false);
  // filenameRewrite is controlled by parent (App.tsx) - use prop value
  // Local state is fallback if prop not provided (backward compatibility)
  const [filenameRewriteLocal, setFilenameRewriteLocal] = useState(false);
  const _filenameRewrite = onFilenameRewriteChange ? filenameRewriteProp : filenameRewriteLocal;
  const _setFilenameRewrite = onFilenameRewriteChange || setFilenameRewriteLocal;
  const [filenameTemplate, setFilenameTemplate] = useState('{location}-{subject}-{action}-{shotType}');

  // Proxy format state
  const [proxyPresetId, setProxyPresetId] = useState('2k-prores-proxy');

  // Ingestion settings save state
  const [_isSavingIngestion, _setIsSavingIngestion] = useState(false);
  const [_ingestionSaveSuccess, _setIngestionSaveSuccess] = useState(false);
  const [_ingestionError, _setIngestionError] = useState<string>('');

  // Refs for cleanup
  const lexiconCloseTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const aiCloseTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const cfexCloseTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const ingestionCloseTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
      if (cfexCloseTimeoutRef.current) {
        clearTimeout(cfexCloseTimeoutRef.current);
      }
      if (ingestionCloseTimeoutRef.current) {
        clearTimeout(ingestionCloseTimeoutRef.current);
      }
    };
  }, []);

  // Sync context settings to local state (Phase 5.2: hybrid approach for compatibility)
  useEffect(() => {
    // Lexicon settings from context
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPattern(settings.pattern);
    setCommonLocations(settings.commonLocations);
    setCommonSubjects(settings.commonSubjects);
    setCommonActions(settings.commonActions);
    setWordPreferences(settings.wordPreferences);
    setAiInstructions(settings.aiInstructions);
    setGoodExamples(settings.goodExamples);
    setBadExamples(settings.badExamples);

    // AI settings from context
    setAiProvider(settings.aiProvider);
    setAiModel(settings.aiModel);

    // CFEx paths from context
    setCfexSource(settings.cfexSource);
    setCfexPhotos(settings.cfexPhotos);
    setCfexVideos(settings.cfexVideos);

    // Power feature toggles from context
    setAiAutoAnalyze(settings.aiAutoAnalyze);
    setMetadataWrite(settings.metadataWrite);
    setFilenameTemplate(settings.filenameTemplate);
    setProxyPresetId(settings.proxyPresetId);
  }, [settings]);

  // Fetch available models when provider changes
  useEffect(() => {
    if (activeTab === 'ai' && window.electronAPI) {
      let isCurrent = true; // Track if this effect is still current
      // eslint-disable-next-line react-hooks/set-state-in-effect
      _setLoadingModels(true);

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
            _setLoadingModels(false);
          }
        });

      return () => { isCurrent = false; }; // Cleanup: mark stale
    }
  }, [aiProvider, activeTab]);

  const _handleSaveLexicon = async () => {
    try {
      _setError('');
      _setIsSaving(true);
      _setLexiconSaveSuccess(false);

      // Phase 5.2 NO-GO Fix: Route save through updateSettings (context is single source of truth)
      await updateSettings({
        pattern: pattern.trim(),
        commonLocations: commonLocations.trim(),
        commonSubjects: commonSubjects.trim(),
        commonActions: commonActions.trim(),
        wordPreferences: wordPreferences.trim(),
        aiInstructions: aiInstructions.trim(),
        goodExamples: goodExamples.trim(),
        badExamples: badExamples.trim(),
      });

      _setLexiconSaveSuccess(true);

      // Clear any existing timeout
      if (lexiconCloseTimeoutRef.current) {
        clearTimeout(lexiconCloseTimeoutRef.current);
      }

      // Auto-close modal after brief delay to show success message
      lexiconCloseTimeoutRef.current = setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      _setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      _setIsSaving(false);
    }
  };

  const _handleTestAIConnection = async () => {
    if (!aiApiKey && !hasSavedKey) {
      _setAiErrorMessage('Please enter an API key');
      return;
    }

    _setTestStatus('testing');
    _setAiErrorMessage('');

    try {
      const result = await window.electronAPI.testAIConnection(
        aiProvider,
        aiModel || availableModels[0]?.id || '',
        aiApiKey || ''
      );

      if (result.success) {
        _setTestStatus('success');
        setTimeout(() => _setTestStatus('idle'), 3000);
      } else {
        _setTestStatus('error');
        _setAiErrorMessage(result.error || 'Connection test failed');
      }
    } catch (err) {
      _setTestStatus('error');
      _setAiErrorMessage(err instanceof Error ? err.message : 'Connection test failed');
    }
  };

  const _handleTestSavedConnection = async () => {
    _setTestStatus('testing');
    _setAiErrorMessage('');

    try {
      const result = await window.electronAPI.testSavedAIConnection();

      if (result.success) {
        _setTestStatus('success');
        setTimeout(() => _setTestStatus('idle'), 3000);
      } else {
        _setTestStatus('error');
        _setAiErrorMessage(result.error || 'Connection test failed');
      }
    } catch (err) {
      _setTestStatus('error');
      _setAiErrorMessage(err instanceof Error ? err.message : 'Connection test failed');
    }
  };

  const _handleSaveAI = async () => {
    if (!aiModel) {
      _setAiErrorMessage('Please select a model');
      return;
    }

    if (!aiApiKey && !hasSavedKey) {
      _setAiErrorMessage('Please enter an API key');
      return;
    }

    _setIsSavingAI(true);
    _setAiErrorMessage('');
    _setAiSaveSuccess(false);

    try {
      // Update context with AI provider/model (keeps context synchronized)
      await updateSettings({
        aiProvider: aiProvider,
        aiModel: aiModel
      });

      // Update API key separately (security-sensitive, not exposed in context)
      const result = await window.electronAPI.updateAIConfig({
        provider: aiProvider,
        model: aiModel,
        apiKey: aiApiKey || ''
      });

      if (result.success) {
        _setAiSaveSuccess(true);
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
        _setAiErrorMessage(result.error || 'Failed to save AI configuration');
      }
    } catch (err) {
      _setAiErrorMessage(err instanceof Error ? err.message : 'Failed to save AI configuration');
    } finally {
      _setIsSavingAI(false);
    }
  };

  const _handleBrowseCfexPath = async (field: 'source' | 'photos' | 'videos') => {
    if (!window.electronAPI?.selectFolder) return;

    try {
      // Get current path from field to use as defaultPath
      const currentPath = field === 'source' ? cfexSource : field === 'photos' ? cfexPhotos : cfexVideos;
      const selectedPath = await window.electronAPI.selectFolder(currentPath);
      if (selectedPath) {
        switch (field) {
          case 'source':
            setCfexSource(selectedPath);
            break;
          case 'photos':
            setCfexPhotos(selectedPath);
            break;
          case 'videos':
            setCfexVideos(selectedPath);
            break;
        }
      }
    } catch (err) {
      _setCfexError(err instanceof Error ? err.message : 'Failed to select folder');
    }
  };

  const _handleSaveCfex = async () => {
    // Validate paths before save (empty string check)
    const validationErrors: string[] = [];
    if (!cfexSource.trim()) validationErrors.push('Source path cannot be empty');
    if (!cfexPhotos.trim()) validationErrors.push('Photos path cannot be empty');
    if (!cfexVideos.trim()) validationErrors.push('Videos path cannot be empty');

    if (validationErrors.length > 0) {
      _setCfexError(validationErrors.join('. '));
      return;
    }

    _setIsSavingCfex(true);
    _setCfexError('');
    _setCfexSaveSuccess(false);

    try {
      // Phase 5.2 NO-GO Fix: Route save through updateSettings (context is single source of truth)
      await updateSettings({
        cfexSource: cfexSource,
        cfexPhotos: cfexPhotos,
        cfexVideos: cfexVideos,
        aiAutoAnalyze,
        metadataWrite,
        filenameTemplate
      });

      _setCfexSaveSuccess(true);

      // Clear any existing timeout
      if (cfexCloseTimeoutRef.current) {
        clearTimeout(cfexCloseTimeoutRef.current);
      }

      // Auto-close modal after brief delay to show success message
      cfexCloseTimeoutRef.current = setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      _setCfexError(err instanceof Error ? err.message : 'Failed to save CFEx settings');
    } finally {
      _setIsSavingCfex(false);
    }
  };

  const _handleFilenameRewriteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.checked;

    // Show confirmation dialog when enabling filenameRewrite
    if (newValue) {
      const confirmed = window.confirm(
        '⚠️ File Rename Warning: This will rename files based on metadata. ' +
        'Original filenames will be preserved in TapeName XMP field, but file system names will change. ' +
        'This operation affects batch processing and cannot be easily undone. Are you sure?'
      );

      if (confirmed) {
        _setFilenameRewrite(true);
      }
      // If not confirmed, checkbox stays unchecked (don't call setFilenameRewrite)
    } else {
      // Unchecking doesn't need confirmation
      _setFilenameRewrite(false);
    }
  };

  const _handleSaveIngestion = async () => {
    _setIsSavingIngestion(true);
    _setIngestionError('');
    _setIngestionSaveSuccess(false);

    try {
      // Phase 5.2 NO-GO Fix: Route save through updateSettings (context is single source of truth)
      await updateSettings({
        aiAutoAnalyze,
        metadataWrite,
        filenameTemplate,
        proxyPresetId
      });

      _setIngestionSaveSuccess(true);

      // Clear any existing timeout
      if (ingestionCloseTimeoutRef.current) {
        clearTimeout(ingestionCloseTimeoutRef.current);
      }

      // Auto-close modal after brief delay to show success message
      ingestionCloseTimeoutRef.current = setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      _setIngestionError(err instanceof Error ? err.message : 'Failed to save ingestion settings');
    } finally {
      _setIsSavingIngestion(false);
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
          <button
            onClick={() => setActiveTab('cfex')}
            style={{
              padding: '8px 16px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'cfex' ? '2px solid #007bff' : '2px solid transparent',
              cursor: 'pointer',
              fontWeight: activeTab === 'cfex' ? 'bold' : 'normal',
            }}
          >
            CFEx Transfer
          </button>
          <button
            onClick={() => setActiveTab('ingestion')}
            style={{
              padding: '8px 16px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'ingestion' ? '2px solid #007bff' : '2px solid transparent',
              cursor: 'pointer',
              fontWeight: activeTab === 'ingestion' ? 'bold' : 'normal',
            }}
          >
            File Ingestion
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'lexicon' && (
          <LexiconTab
            pattern={pattern}
            setPattern={setPattern}
            commonLocations={commonLocations}
            setCommonLocations={setCommonLocations}
            commonSubjects={commonSubjects}
            setCommonSubjects={setCommonSubjects}
            commonActions={commonActions}
            setCommonActions={setCommonActions}
            wordPreferences={wordPreferences}
            setWordPreferences={setWordPreferences}
            aiInstructions={aiInstructions}
            setAiInstructions={setAiInstructions}
            goodExamples={goodExamples}
            setGoodExamples={setGoodExamples}
            badExamples={badExamples}
            setBadExamples={setBadExamples}
            onSave={_handleSaveLexicon}
            onClose={onClose}
            isSaving={_isSaving}
            saveSuccess={_lexiconSaveSuccess}
            error={_error}
          />
        )}
        {activeTab === 'ai' && (
          <AITab
            aiProvider={aiProvider}
            setAiProvider={setAiProvider}
            aiModel={aiModel}
            setAiModel={setAiModel}
            aiApiKey={aiApiKey}
            setAiApiKey={setAiApiKey}
            hasSavedKey={hasSavedKey}
            testStatus={_testStatus}
            availableModels={availableModels}
            loadingModels={_loadingModels}
            onTestConnection={_handleTestAIConnection}
            onTestSavedConnection={_handleTestSavedConnection}
            onSave={_handleSaveAI}
            onClose={onClose}
            isSaving={_isSavingAI}
            saveSuccess={_aiSaveSuccess}
            error={_aiErrorMessage}
          />
        )}
        {activeTab === 'cfex' && (
          <CfexTab
            cfexSource={cfexSource}
            setCfexSource={setCfexSource}
            cfexPhotos={cfexPhotos}
            setCfexPhotos={setCfexPhotos}
            cfexVideos={cfexVideos}
            setCfexVideos={setCfexVideos}
            onBrowse={_handleBrowseCfexPath}
            onSave={_handleSaveCfex}
            onClose={onClose}
            isSaving={_isSavingCfex}
            saveSuccess={_cfexSaveSuccess}
            error={_cfexError}
          />
        )}
        {activeTab === 'ingestion' && (
          <IngestionTab
            aiAutoAnalyze={aiAutoAnalyze}
            setAiAutoAnalyze={setAiAutoAnalyze}
            metadataWrite={metadataWrite}
            setMetadataWrite={setMetadataWrite}
            filenameRewrite={_filenameRewrite}
            onFilenameRewriteChange={_handleFilenameRewriteChange}
            filenameTemplate={filenameTemplate}
            setFilenameTemplate={setFilenameTemplate}
            proxyPresetId={proxyPresetId}
            setProxyPresetId={setProxyPresetId}
            onSave={_handleSaveIngestion}
            onClose={onClose}
            isSaving={_isSavingIngestion}
            saveSuccess={_ingestionSaveSuccess}
            error={_ingestionError}
          />
        )}
      </div>
    </div>
  );
}
