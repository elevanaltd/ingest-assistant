import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import { IngestSettingsProvider, useIngestSettings } from './IngestSettingsContext';

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
      lexicon: { load: vi.fn().mockResolvedValue({}) },
      loadConfig: vi.fn().mockResolvedValue({ cfex: {} }),
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
      lexicon: {
        load: vi.fn().mockResolvedValue({}),
        save: mockSaveLexicon,
      },
      loadConfig: vi.fn().mockResolvedValue({ cfex: {} }),
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
      lexicon: { load: vi.fn().mockResolvedValue({}) },
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
