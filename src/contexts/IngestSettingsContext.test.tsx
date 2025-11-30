import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import { IngestSettingsProvider, useIngestSettings } from './IngestSettingsContext';
import type { LexiconConfig } from '../types';

describe('IngestSettingsContext', () => {
  beforeEach(() => {
    // Clear window.electronAPI mock before each test
    delete (window as { electronAPI?: unknown }).electronAPI;
  });

  it('should render children', () => {
    render(
      <IngestSettingsProvider>
        <div>Test Child</div>
      </IngestSettingsProvider>
    );

    expect(screen.getByText('Test Child')).toBeInTheDocument();
  });

  it('should throw error when useIngestSettings used outside provider', () => {
    // Suppress console.error for this test (expected error)
    const consoleError = console.error;
    console.error = () => {};

    expect(() => {
      renderHook(() => useIngestSettings());
    }).toThrow('useIngestSettings must be used within IngestSettingsProvider');

    console.error = consoleError;
  });

  it('should provide default values when electronAPI not available', () => {
    const { result } = renderHook(() => useIngestSettings(), {
      wrapper: IngestSettingsProvider,
    });

    expect(result.current.settings).toEqual({
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
    });
  });

  it('should load settings from IPC on mount', async () => {
    // Mock electronAPI
    const mockElectronAPI = {
      getAIConfig: vi.fn().mockResolvedValue({
        provider: 'anthropic',
        model: 'claude-3-5-sonnet',
      }),
      lexicon: {
        load: vi.fn().mockResolvedValue({
          pattern: '{location}-{subject}-{action}-{shotType}',
          commonLocations: 'kitchen, bath',
          commonSubjects: 'oven, sink',
          commonActions: 'cleaning, installing',
          wordPreferences: 'faucet → tap',
          aiInstructions: 'Use lowercase',
          goodExamples: 'kitchen-oven-CU',
          badExamples: 'Kitchen-Oven-CU',
        }),
      },
      loadConfig: vi.fn().mockResolvedValue({
        cfex: {
          defaultSource: '/custom/source',
          defaultPhotos: '/custom/photos',
          defaultVideos: '/custom/videos',
          aiAutoAnalyze: true,
          metadataWrite: true,
          filenameTemplate: '{subject}-{location}',
          proxyPresetId: '1080p-h264',
        },
      }),
      getShotTypes: vi.fn().mockResolvedValue(['WS', 'CU', 'MID']),
    };

    (window as { electronAPI: unknown }).electronAPI = mockElectronAPI;

    const { result } = renderHook(() => useIngestSettings(), {
      wrapper: IngestSettingsProvider,
    });

    // Wait for async load to complete
    await waitFor(() => {
      expect(result.current.settings.aiProvider).toBe('anthropic');
    });

    expect(result.current.settings).toEqual({
      aiProvider: 'anthropic',
      aiModel: 'claude-3-5-sonnet',
      pattern: '{location}-{subject}-{action}-{shotType}',
      commonLocations: 'kitchen, bath',
      commonSubjects: 'oven, sink',
      commonActions: 'cleaning, installing',
      wordPreferences: 'faucet → tap',
      aiInstructions: 'Use lowercase',
      goodExamples: 'kitchen-oven-CU',
      badExamples: 'Kitchen-Oven-CU',
      cfexSource: '/custom/source',
      cfexPhotos: '/custom/photos',
      cfexVideos: '/custom/videos',
      aiAutoAnalyze: true,
      metadataWrite: true,
      filenameTemplate: '{subject}-{location}',
      proxyPresetId: '1080p-h264',
      shotTypes: ['WS', 'CU', 'MID'],
    });
  });

  it('should save AI config updates via IPC', async () => {
    const mockUpdateAIConfig = vi.fn().mockResolvedValue({ success: true });
    const mockElectronAPI = {
      getAIConfig: vi.fn().mockResolvedValue({ provider: 'openrouter', model: '' }),
      lexicon: {
        load: vi.fn().mockResolvedValue({}),
        save: vi.fn().mockResolvedValue(true),
      },
      loadConfig: vi.fn().mockResolvedValue({ cfex: {} }),
      saveConfig: vi.fn().mockResolvedValue(true),
      getShotTypes: vi.fn().mockResolvedValue([]),
      updateAIConfig: mockUpdateAIConfig,
    };

    (window as { electronAPI: unknown }).electronAPI = mockElectronAPI;

    const { result } = renderHook(() => useIngestSettings(), {
      wrapper: IngestSettingsProvider,
    });

    await waitFor(() => {
      expect(result.current.settings).toBeDefined();
    });

    await result.current.updateSettings({
      aiProvider: 'anthropic',
      aiModel: 'claude-3-5-sonnet',
    });

    expect(mockUpdateAIConfig).toHaveBeenCalledWith({
      provider: 'anthropic',
      model: 'claude-3-5-sonnet',
      apiKey: '',
    });
  });

  it('should save lexicon config updates via IPC', async () => {
    const mockSaveLexicon = vi.fn().mockResolvedValue(undefined);
    const mockElectronAPI = {
      getAIConfig: vi.fn().mockResolvedValue({ provider: 'openrouter', model: '' }),
      updateAIConfig: vi.fn().mockResolvedValue(true),
      lexicon: {
        load: vi.fn().mockResolvedValue({}),
        save: mockSaveLexicon,
      },
      loadConfig: vi.fn().mockResolvedValue({ cfex: {} }),
      saveConfig: vi.fn().mockResolvedValue(true),
      getShotTypes: vi.fn().mockResolvedValue([]),
    };

    (window as { electronAPI: unknown }).electronAPI = mockElectronAPI;

    const { result } = renderHook(() => useIngestSettings(), {
      wrapper: IngestSettingsProvider,
    });

    await waitFor(() => {
      expect(result.current.settings).toBeDefined();
    });

    await result.current.updateSettings({
      commonLocations: 'kitchen, bath, utility',
    });

    expect(mockSaveLexicon).toHaveBeenCalledWith({
      pattern: '{location}-{subject}-{shotType}',
      commonLocations: 'kitchen, bath, utility',
      commonSubjects: '',
      commonActions: '',
      wordPreferences: '',
      aiInstructions: '',
      goodExamples: '',
      badExamples: '',
    });
  });

  it('should save cfex config updates via IPC', async () => {
    const mockSaveConfig = vi.fn().mockResolvedValue(true);
    const mockElectronAPI = {
      getAIConfig: vi.fn().mockResolvedValue({ provider: 'openrouter', model: '' }),
      updateAIConfig: vi.fn().mockResolvedValue(true),
      lexicon: {
        load: vi.fn().mockResolvedValue({}),
        save: vi.fn().mockResolvedValue(true),
      },
      loadConfig: vi.fn().mockResolvedValue({ cfex: {} }),
      getShotTypes: vi.fn().mockResolvedValue([]),
      saveConfig: mockSaveConfig,
    };

    (window as { electronAPI: unknown }).electronAPI = mockElectronAPI;

    const { result } = renderHook(() => useIngestSettings(), {
      wrapper: IngestSettingsProvider,
    });

    await waitFor(() => {
      expect(result.current.settings).toBeDefined();
    });

    await result.current.updateSettings({
      aiAutoAnalyze: true,
      metadataWrite: true,
    });

    expect(mockSaveConfig).toHaveBeenCalledWith({
      cfex: {
        defaultSource: '/Volumes/Untitled/DCIM/100_FUJI',
        defaultPhotos: '/Volumes/videos-current/2. WORKING PROJECTS/',
        defaultVideos: '/Volumes/EAV_Video_RAW/',
        aiAutoAnalyze: true,
        metadataWrite: true,
        filenameRewrite: false,
        filenameTemplate: '{location}-{subject}-{action}-{shotType}',
        proxyPresetId: '2k-prores-proxy',
      },
    });
  });
});

// Phase 5.5: Extended context values (isAIConfigured, lexiconConfig, filenameRewrite)
describe('IngestSettingsContext - Phase 5.5 Extensions', () => {
  // Test component to access extended context values
  function TestConsumer() {
    const { settings, isAIConfigured, lexiconConfig, filenameRewrite, setFilenameRewrite } = useIngestSettings();

    return (
      <div>
        <div data-testid="ai-configured">{String(isAIConfigured)}</div>
        <div data-testid="lexicon-pattern">{lexiconConfig?.pattern || 'none'}</div>
        <div data-testid="filename-rewrite">{String(filenameRewrite)}</div>
        <div data-testid="ai-provider">{settings.aiProvider}</div>
        <button onClick={() => setFilenameRewrite(true)}>Enable Rewrite</button>
      </div>
    );
  }

  beforeEach(() => {
    vi.clearAllMocks();
    delete (window as { electronAPI?: unknown }).electronAPI;
  });

  describe('isAIConfigured', () => {
    it('should default to false when electronAPI unavailable', () => {
      render(
        <IngestSettingsProvider>
          <TestConsumer />
        </IngestSettingsProvider>
      );

      expect(screen.getByTestId('ai-configured')).toHaveTextContent('false');
    });

    it('should load isAIConfigured from electronAPI on mount', async () => {
      (window as { electronAPI: unknown }).electronAPI = {
        isAIConfigured: vi.fn().mockResolvedValue(true),
        getAIConfig: vi.fn().mockResolvedValue({ provider: 'openrouter', model: 'test' }),
        lexicon: {
          load: vi.fn().mockResolvedValue({ pattern: '{location}-{subject}-{shotType}' }),
          save: vi.fn().mockResolvedValue(undefined),
        },
        loadConfig: vi.fn().mockResolvedValue({ cfex: {} }),
        getShotTypes: vi.fn().mockResolvedValue(['WS', 'MID', 'CU']),
      };

      render(
        <IngestSettingsProvider>
          <TestConsumer />
        </IngestSettingsProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('ai-configured')).toHaveTextContent('true');
      });
    });
  });

  describe('lexiconConfig', () => {
    it('should default to undefined when electronAPI unavailable', () => {
      render(
        <IngestSettingsProvider>
          <TestConsumer />
        </IngestSettingsProvider>
      );

      expect(screen.getByTestId('lexicon-pattern')).toHaveTextContent('none');
    });

    it('should load lexiconConfig from electronAPI on mount', async () => {
      const mockLexicon: LexiconConfig = {
        pattern: '{location}-{subject}-{action}-{shotType}',
        commonLocations: 'kitchen,office',
        commonSubjects: 'oven,desk',
        commonActions: 'cleaning,typing',
        wordPreferences: 'color',
        aiInstructions: 'Be concise',
        goodExamples: 'kitchen-oven-cleaning-CU',
        badExamples: 'bad-example',
      };

      (window as { electronAPI: unknown }).electronAPI = {
        isAIConfigured: vi.fn().mockResolvedValue(false),
        getAIConfig: vi.fn().mockResolvedValue({ provider: 'openrouter', model: 'test' }),
        lexicon: {
          load: vi.fn().mockResolvedValue(mockLexicon),
          save: vi.fn().mockResolvedValue(undefined),
        },
        loadConfig: vi.fn().mockResolvedValue({ cfex: {} }),
        getShotTypes: vi.fn().mockResolvedValue(['WS']),
      };

      render(
        <IngestSettingsProvider>
          <TestConsumer />
        </IngestSettingsProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('lexicon-pattern')).toHaveTextContent(mockLexicon.pattern);
      });
    });
  });

  describe('filenameRewrite (session-ephemeral)', () => {
    it('should default to false', () => {
      render(
        <IngestSettingsProvider>
          <TestConsumer />
        </IngestSettingsProvider>
      );

      expect(screen.getByTestId('filename-rewrite')).toHaveTextContent('false');
    });

    it('should allow setFilenameRewrite to update state', async () => {
      render(
        <IngestSettingsProvider>
          <TestConsumer />
        </IngestSettingsProvider>
      );

      expect(screen.getByTestId('filename-rewrite')).toHaveTextContent('false');

      screen.getByRole('button', { name: /enable rewrite/i }).click();

      await waitFor(() => {
        expect(screen.getByTestId('filename-rewrite')).toHaveTextContent('true');
      });
    });

    it('should remain false after settings updates (never persisted)', async () => {
      (window as { electronAPI: unknown }).electronAPI = {
        isAIConfigured: vi.fn().mockResolvedValue(false),
        getAIConfig: vi.fn().mockResolvedValue({ provider: 'openrouter', model: 'test' }),
        updateAIConfig: vi.fn().mockResolvedValue(undefined),
        lexicon: {
          load: vi.fn().mockResolvedValue({ pattern: '{location}-{subject}-{shotType}' }),
          save: vi.fn().mockResolvedValue(undefined),
        },
        loadConfig: vi.fn().mockResolvedValue({ cfex: {} }),
        saveConfig: vi.fn().mockResolvedValue(undefined),
        getShotTypes: vi.fn().mockResolvedValue(['WS']),
      };

      const TestUpdater = () => {
        const { updateSettings, filenameRewrite } = useIngestSettings();
        return (
          <div>
            <div data-testid="filename-rewrite">{String(filenameRewrite)}</div>
            <button onClick={() => updateSettings({ aiProvider: 'anthropic' })}>Update Settings</button>
          </div>
        );
      };

      render(
        <IngestSettingsProvider>
          <TestUpdater />
        </IngestSettingsProvider>
      );

      screen.getByRole('button', { name: /update settings/i }).click();

      await waitFor(() => {
        expect((window as { electronAPI: { updateAIConfig: unknown } }).electronAPI.updateAIConfig).toHaveBeenCalled();
      });

      // filenameRewrite should still be false (never persisted)
      expect(screen.getByTestId('filename-rewrite')).toHaveTextContent('false');
    });
  });
});
