import { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from 'react';

// Ingest settings interface - config state only (low frequency updates)
interface IngestSettings {
  // AI Config
  aiProvider: 'openrouter' | 'openai' | 'anthropic';
  aiModel: string;

  // Lexicon Config
  pattern: string;
  commonLocations: string;
  commonSubjects: string;
  commonActions: string;
  wordPreferences: string;
  aiInstructions: string;
  goodExamples: string;
  badExamples: string;

  // CFEx Config (paths)
  cfexSource: string;
  cfexPhotos: string;
  cfexVideos: string;

  // Power Features (toggles)
  aiAutoAnalyze: boolean;
  metadataWrite: boolean;
  filenameTemplate: string;
  proxyPresetId: string;

  // Shot types
  shotTypes: string[];
}

interface IngestSettingsContextValue {
  settings: IngestSettings;
  updateSettings: (updates: Partial<IngestSettings>) => Promise<void>;
}

const IngestSettingsContext = createContext<IngestSettingsContextValue | undefined>(undefined);

// Default settings for browser dev mode or initial state
const DEFAULT_SETTINGS: IngestSettings = {
  aiProvider: 'openrouter',
  aiModel: '',
  pattern: '{location}-{subject}-{shotType}',
  commonLocations: '',
  commonSubjects: '',
  commonActions: '',
  wordPreferences: '',
  aiInstructions: '',
  goodExamples: '',
  badExamples: '',
  cfexSource: '/Volumes/Untitled/DCIM/100_FUJI',
  cfexPhotos: '/Volumes/videos-current/2. WORKING PROJECTS/',
  cfexVideos: '/Volumes/EAV_Video_RAW/',
  aiAutoAnalyze: false,
  metadataWrite: false,
  filenameTemplate: '{location}-{subject}-{action}-{shotType}',
  proxyPresetId: '2k-prores-proxy',
  shotTypes: ['WS', 'MID', 'CU', 'UNDER', 'FP', 'TRACK', 'ESTAB'],
};

interface IngestSettingsProviderProps {
  children: ReactNode;
}

export function IngestSettingsProvider({ children }: IngestSettingsProviderProps) {
  const [settings, setSettings] = useState<IngestSettings>(DEFAULT_SETTINGS);

  // Load settings on mount (if electronAPI available)
  useEffect(() => {
    if (window.electronAPI) {
      Promise.all([
        window.electronAPI.getAIConfig(),
        window.electronAPI.lexicon.load(),
        window.electronAPI.loadConfig(),
        window.electronAPI.getShotTypes(),
      ]).then(([aiConfig, lexiconConfig, appConfig, shotTypes]) => {
        setSettings({
          // AI config
          aiProvider: aiConfig.provider || DEFAULT_SETTINGS.aiProvider,
          aiModel: aiConfig.model || DEFAULT_SETTINGS.aiModel,

          // Lexicon config
          pattern: lexiconConfig?.pattern || DEFAULT_SETTINGS.pattern,
          commonLocations: lexiconConfig?.commonLocations || DEFAULT_SETTINGS.commonLocations,
          commonSubjects: lexiconConfig?.commonSubjects || DEFAULT_SETTINGS.commonSubjects,
          commonActions: lexiconConfig?.commonActions || DEFAULT_SETTINGS.commonActions,
          wordPreferences: lexiconConfig?.wordPreferences || DEFAULT_SETTINGS.wordPreferences,
          aiInstructions: lexiconConfig?.aiInstructions || DEFAULT_SETTINGS.aiInstructions,
          goodExamples: lexiconConfig?.goodExamples || DEFAULT_SETTINGS.goodExamples,
          badExamples: lexiconConfig?.badExamples || DEFAULT_SETTINGS.badExamples,

          // CFEx config
          cfexSource: appConfig.cfex?.defaultSource || DEFAULT_SETTINGS.cfexSource,
          cfexPhotos: appConfig.cfex?.defaultPhotos || DEFAULT_SETTINGS.cfexPhotos,
          cfexVideos: appConfig.cfex?.defaultVideos || DEFAULT_SETTINGS.cfexVideos,
          aiAutoAnalyze: appConfig.cfex?.aiAutoAnalyze ?? DEFAULT_SETTINGS.aiAutoAnalyze,
          metadataWrite: appConfig.cfex?.metadataWrite ?? DEFAULT_SETTINGS.metadataWrite,
          filenameTemplate: appConfig.cfex?.filenameTemplate || DEFAULT_SETTINGS.filenameTemplate,
          proxyPresetId: appConfig.cfex?.proxyPresetId || DEFAULT_SETTINGS.proxyPresetId,

          // Shot types
          shotTypes: shotTypes || DEFAULT_SETTINGS.shotTypes,
        });
      }).catch(error => {
        console.error('Failed to load ingest settings:', error);
      });
    }
  }, []);

  const updateSettings = useCallback(async (updates: Partial<IngestSettings>) => {
    setSettings(prev => ({ ...prev, ...updates }));

    // Persist to backend if electronAPI available
    if (window.electronAPI) {
      // Determine which settings changed and save to appropriate storage
      if ('aiProvider' in updates || 'aiModel' in updates) {
        // AI config changes
        await window.electronAPI.updateAIConfig({
          provider: updates.aiProvider || settings.aiProvider,
          model: updates.aiModel || settings.aiModel,
          apiKey: '', // Don't change API key from context update
        });
      }

      if ('pattern' in updates || 'commonLocations' in updates || 'commonSubjects' in updates ||
          'commonActions' in updates || 'wordPreferences' in updates || 'aiInstructions' in updates ||
          'goodExamples' in updates || 'badExamples' in updates) {
        // Lexicon config changes
        await window.electronAPI.lexicon.save({
          pattern: updates.pattern ?? settings.pattern,
          commonLocations: updates.commonLocations ?? settings.commonLocations,
          commonSubjects: updates.commonSubjects ?? settings.commonSubjects,
          commonActions: updates.commonActions ?? settings.commonActions,
          wordPreferences: updates.wordPreferences ?? settings.wordPreferences,
          aiInstructions: updates.aiInstructions ?? settings.aiInstructions,
          goodExamples: updates.goodExamples ?? settings.goodExamples,
          badExamples: updates.badExamples ?? settings.badExamples,
        });
      }

      if ('cfexSource' in updates || 'cfexPhotos' in updates || 'cfexVideos' in updates ||
          'aiAutoAnalyze' in updates || 'metadataWrite' in updates ||
          'filenameTemplate' in updates || 'proxyPresetId' in updates) {
        // App config changes
        const currentConfig = await window.electronAPI.loadConfig();
        await window.electronAPI.saveConfig({
          ...currentConfig,
          cfex: {
            defaultSource: updates.cfexSource ?? settings.cfexSource,
            defaultPhotos: updates.cfexPhotos ?? settings.cfexPhotos,
            defaultVideos: updates.cfexVideos ?? settings.cfexVideos,
            aiAutoAnalyze: updates.aiAutoAnalyze ?? settings.aiAutoAnalyze,
            metadataWrite: updates.metadataWrite ?? settings.metadataWrite,
            filenameRewrite: false, // Session-ephemeral, never persisted
            filenameTemplate: updates.filenameTemplate ?? settings.filenameTemplate,
            proxyPresetId: updates.proxyPresetId ?? settings.proxyPresetId,
          },
        });
      }
    }
  }, [settings]);

  const value = useMemo<IngestSettingsContextValue>(() => ({
    settings,
    updateSettings,
  }), [settings, updateSettings]);

  return (
    <IngestSettingsContext.Provider value={value}>
      {children}
    </IngestSettingsContext.Provider>
  );
}

export function useIngestSettings() {
  const context = useContext(IngestSettingsContext);
  if (!context) {
    throw new Error('useIngestSettings must be used within IngestSettingsProvider');
  }
  return context;
}
