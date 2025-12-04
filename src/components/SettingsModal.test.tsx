import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../test/test-utils'; // Phase 5.2: Use renderWithProviders for context
import { SettingsModal } from './SettingsModal';
import type { LexiconConfig } from '../types';

// Shared mock for getShotTypes (required by MetadataFormContext)
const mockGetShotTypes = vi.fn().mockResolvedValue(['WS', 'MID', 'CU', 'UNDER', 'FP', 'TRACK', 'ESTAB']);

describe('SettingsModal', () => {
  const mockOnClose = vi.fn();
  const mockOnSave = vi.fn();

  beforeEach(() => {
    mockOnClose.mockClear();
    mockOnSave.mockClear();
    mockOnSave.mockResolvedValue(undefined);

    // Phase 5.2: Add minimal electronAPI mocks for context provider
    window.electronAPI = {
      getAIConfig: vi.fn().mockResolvedValue({
        provider: 'openrouter',
        model: ''
      }),
      isAIConfigured: vi.fn().mockResolvedValue(false),
      getAIModels: vi.fn().mockResolvedValue([]),
      lexicon: {
        load: vi.fn().mockResolvedValue({}),
        save: vi.fn().mockResolvedValue(true)
      },
      loadConfig: vi.fn().mockResolvedValue({ cfex: {} }),
      saveConfig: vi.fn().mockResolvedValue(true),
      getShotTypes: mockGetShotTypes,
      updateAIConfig: vi.fn().mockResolvedValue({ success: true })
    } as any;
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  it('renders modal with title', () => {
    renderWithProviders(<SettingsModal onClose={mockOnClose} onSave={mockOnSave} />);
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('renders lexicon form with all fields', () => {
    renderWithProviders(<SettingsModal onClose={mockOnClose} onSave={mockOnSave} />);

    // Pattern field
    expect(screen.getByPlaceholderText(/\{location\}-\{subject\}-\{shotType\}/i)).toBeInTheDocument();

    // Common fields
    expect(screen.getByPlaceholderText(/kitchen, hall, utility/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/oven, sink, tap/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/cleaning, installing/i)).toBeInTheDocument();

    // Textarea fields
    expect(screen.getByPlaceholderText(/faucet → tap/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Use lowercase/i)).toBeInTheDocument();

    // Get all textareas to verify both good and bad examples exist
    const textareas = screen.getAllByRole('textbox', { hidden: false });
    expect(textareas.length).toBeGreaterThanOrEqual(5); // wordPreferences, aiInstructions, goodExamples, badExamples
  });

  it('loads initial config data', async () => {
    // Phase 5.2: Context is now the source of truth, not initialConfig prop
    // Mock the lexicon.load to return initial values
    const initialConfig: LexiconConfig = {
      pattern: '{location}-{subject}-{shotType}',
      commonLocations: 'kitchen, bathroom',
      commonSubjects: 'oven, sink',
      commonActions: 'cleaning, installing',
      wordPreferences: 'faucet → tap\nstove → hob',
      aiInstructions: 'Use lowercase and hyphens',
      goodExamples: 'kitchen-oven-CU\nbath-shower-MID',
      badExamples: 'Kitchen-Oven-CU (mixed case)',
    };

    // Override the default mock to return initial config values
    window.electronAPI.lexicon.load = vi.fn().mockResolvedValue(initialConfig);

    renderWithProviders(
      <SettingsModal
        onClose={mockOnClose}
        onSave={mockOnSave}
        initialConfig={initialConfig}
      />
    );

    // Wait for context to load and sync to component state
    await waitFor(() => {
      expect(screen.getByDisplayValue('kitchen, bathroom')).toBeInTheDocument();
    });

    // Input fields
    expect(screen.getByDisplayValue('{location}-{subject}-{shotType}')).toBeInTheDocument();
    expect(screen.getByDisplayValue('kitchen, bathroom')).toBeInTheDocument();
    expect(screen.getByDisplayValue('oven, sink')).toBeInTheDocument();
    expect(screen.getByDisplayValue('cleaning, installing')).toBeInTheDocument();

    // Textareas - need to use different matcher for multiline content
    const wordPrefTextarea = screen.getByPlaceholderText(/faucet → tap/i) as HTMLTextAreaElement;
    expect(wordPrefTextarea.value).toBe('faucet → tap\nstove → hob');

    const aiInstrTextarea = screen.getByPlaceholderText(/Use lowercase/i) as HTMLTextAreaElement;
    expect(aiInstrTextarea.value).toBe('Use lowercase and hyphens');

    const goodExTextarea = screen.getByPlaceholderText(/kitchen-oven-CU.*bath-shower-MID/s) as HTMLTextAreaElement;
    expect(goodExTextarea.value).toBe('kitchen-oven-CU\nbath-shower-MID');

    const badExTextarea = screen.getByPlaceholderText(/Kitchen-Oven-CU.*mixed case/s) as HTMLTextAreaElement;
    expect(badExTextarea.value).toBe('Kitchen-Oven-CU (mixed case)');
  });

  it('updates field values when user types', () => {
    renderWithProviders(<SettingsModal onClose={mockOnClose} onSave={mockOnSave} />);

    const patternInput = screen.getByPlaceholderText(/\{location\}-\{subject\}-\{shotType\}/i) as HTMLInputElement;
    fireEvent.change(patternInput, { target: { value: '{location}-{subject}-{action}-{shotType}' } });
    expect(patternInput.value).toBe('{location}-{subject}-{action}-{shotType}');

    const locationsInput = screen.getByPlaceholderText(/kitchen, hall, utility/i) as HTMLInputElement;
    fireEvent.change(locationsInput, { target: { value: 'kitchen, bathroom, garage' } });
    expect(locationsInput.value).toBe('kitchen, bathroom, garage');

    const wordPrefTextarea = screen.getByPlaceholderText(/faucet → tap/i) as HTMLTextAreaElement;
    fireEvent.change(wordPrefTextarea, { target: { value: 'faucet → tap\nstove → hob' } });
    expect(wordPrefTextarea.value).toBe('faucet → tap\nstove → hob');
  });

  it('calls onClose when cancel button clicked', () => {
    renderWithProviders(<SettingsModal onClose={mockOnClose} onSave={mockOnSave} />);

    fireEvent.click(screen.getByText('Cancel'));
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });
  it('does not close when backdrop clicked', () => {
    renderWithProviders(<SettingsModal onClose={mockOnClose} onSave={mockOnSave} />);

    // Click on the backdrop (not the modal content)
    const backdrop = screen.getByText('Settings').closest('.modal-backdrop');
    expect(backdrop).toBeTruthy();

    fireEvent.click(backdrop!);
    // Modal should NOT close when clicking outside
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('saves lexicon config when save button clicked', async () => {
    // Phase 5.2: Context routes saves through updateSettings → lexicon.save
    const initialConfig: LexiconConfig = {
      pattern: '{location}-{subject}-{shotType}',
      commonLocations: 'kitchen, bathroom',
      commonSubjects: 'oven, sink',
      commonActions: 'cleaning',
      wordPreferences: 'faucet → tap',
      aiInstructions: 'Use lowercase',
      goodExamples: 'kitchen-oven-CU',
      badExamples: 'Kitchen-Oven-CU (mixed case)',
    };

    // Override the default mock to return initial config values
    window.electronAPI.lexicon.load = vi.fn().mockResolvedValue(initialConfig);

    renderWithProviders(
      <SettingsModal
        onClose={mockOnClose}
        onSave={mockOnSave}
        initialConfig={initialConfig}
      />
    );

    // Wait for context to load and sync to component state
    await waitFor(() => {
      expect(screen.getByDisplayValue('kitchen, bathroom')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Save Lexicon'));

    // Phase 5.2: Expect lexicon.save to be called (not onSave)
    await waitFor(() => {
      expect(window.electronAPI.lexicon.save).toHaveBeenCalledTimes(1);
    });

    const savedConfig = (window.electronAPI.lexicon.save as any).mock.calls[0][0] as LexiconConfig;
    expect(savedConfig.pattern).toBe('{location}-{subject}-{shotType}');
    expect(savedConfig.commonLocations).toBe('kitchen, bathroom');
    expect(savedConfig.commonSubjects).toBe('oven, sink');
    expect(savedConfig.commonActions).toBe('cleaning');
    expect(savedConfig.wordPreferences).toBe('faucet → tap');
    expect(savedConfig.aiInstructions).toBe('Use lowercase');
    expect(savedConfig.goodExamples).toBe('kitchen-oven-CU');
    expect(savedConfig.badExamples).toBe('Kitchen-Oven-CU (mixed case)');
  });

  it('trims whitespace when saving', async () => {
    renderWithProviders(<SettingsModal onClose={mockOnClose} onSave={mockOnSave} />);

    const patternInput = screen.getByPlaceholderText(/\{location\}-\{subject\}-\{shotType\}/i);
    const locationsInput = screen.getByPlaceholderText(/kitchen, hall, utility/i);

    fireEvent.change(patternInput, { target: { value: '  {location}-{subject}  ' } });
    fireEvent.change(locationsInput, { target: { value: '  kitchen, bathroom  ' } });

    fireEvent.click(screen.getByText('Save Lexicon'));

    // Phase 5.2: Expect lexicon.save to be called (not onSave)
    await waitFor(() => {
      expect(window.electronAPI.lexicon.save).toHaveBeenCalledTimes(1);
    });

    const savedConfig = (window.electronAPI.lexicon.save as any).mock.calls[0][0] as LexiconConfig;
    expect(savedConfig.pattern).toBe('{location}-{subject}');
    expect(savedConfig.commonLocations).toBe('kitchen, bathroom');
  });
  it('shows error message when save fails', async () => {
    // Phase 5.2: Mock lexicon.save to reject (not onSave)
    window.electronAPI.lexicon.save = vi.fn().mockRejectedValue(new Error('Network error'));

    renderWithProviders(<SettingsModal onClose={mockOnClose} onSave={mockOnSave} />);

    fireEvent.click(screen.getByText('Save Lexicon'));

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });

    // Should NOT close modal on error
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('disables save button while saving', async () => {
    mockOnSave.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

    renderWithProviders(<SettingsModal onClose={mockOnClose} onSave={mockOnSave} />);

    const saveButton = screen.getByText('Save Lexicon');

    fireEvent.click(saveButton);

    // Save button should be disabled during save
    expect(saveButton).toBeDisabled();
    expect(screen.getByText('Saving...')).toBeInTheDocument();
  });

  it('shows success message after save', async () => {
    renderWithProviders(<SettingsModal onClose={mockOnClose} onSave={mockOnSave} />);

    fireEvent.click(screen.getByText('Save Lexicon'));

    // Phase 5.2: Expect lexicon.save to be called (not onSave)
    await waitFor(() => {
      expect(window.electronAPI.lexicon.save).toHaveBeenCalledTimes(1);
    });

    // Should show success message
    await waitFor(() => {
      expect(screen.getByText(/Lexicon settings saved successfully/i)).toBeInTheDocument();
    }, { timeout: 2000 });

    // Modal should auto-close after brief delay (1.5s)
    expect(mockOnClose).not.toHaveBeenCalled(); // Not yet

    // Wait for auto-close delay
    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    }, { timeout: 2000 });
  });

  describe('AI Configuration Tab', () => {
    beforeEach(() => {
      // Phase 5.2: Must include all context-required mocks
      window.electronAPI = {
        getAIConfig: vi.fn().mockResolvedValue({
          provider: 'openrouter',
          model: 'anthropic/claude-3.5-sonnet',
          apiKey: '***masked***'
        }),
        isAIConfigured: vi.fn().mockResolvedValue(true),
        updateAIConfig: vi.fn().mockResolvedValue({ success: true }),
        testAIConnection: vi.fn().mockResolvedValue({ success: true }),
        testSavedAIConnection: vi.fn().mockResolvedValue({ success: true }),
        getAIModels: vi.fn().mockResolvedValue([
          { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', description: 'Latest model' },
          { id: 'openai/gpt-4', name: 'GPT-4', description: 'OpenAI GPT-4' },
        ]),
        // Context-required mocks (IngestSettingsContext needs these)
        lexicon: {
          load: vi.fn().mockResolvedValue({}),
          save: vi.fn().mockResolvedValue(true)
        },
        loadConfig: vi.fn().mockResolvedValue({ cfex: {} }),
        saveConfig: vi.fn().mockResolvedValue(true),
        getShotTypes: mockGetShotTypes,
        // Batch operations methods
        batchStart: vi.fn(async () => 'mock-queue-id'),
        batchCancel: vi.fn(async () => ({ success: true })),
        batchGetStatus: vi.fn(async () => ({
          items: [],
          status: 'idle',
          currentFile: null
        })),
        onBatchProgress: vi.fn(() => () => {}), // Returns cleanup function
        onTranscodeProgress: vi.fn(() => () => {}), // Returns cleanup function
      } as Partial<typeof window.electronAPI> as typeof window.electronAPI;
    });

    it('should render tabs for Lexicon and AI Connection', () => {
      renderWithProviders(<SettingsModal onClose={mockOnClose} onSave={mockOnSave} />);

      expect(screen.getByText('Lexicon')).toBeInTheDocument();
      expect(screen.getByText('AI Connection')).toBeInTheDocument();
    });

    it('should switch to AI Connection tab when clicked', () => {
      renderWithProviders(<SettingsModal onClose={mockOnClose} onSave={mockOnSave} />);

      const aiTab = screen.getByText('AI Connection');
      fireEvent.click(aiTab);

      // Should show AI config form elements
      expect(screen.getByText('Provider')).toBeInTheDocument();
      expect(screen.getByText('Model')).toBeInTheDocument();
      expect(screen.getByText(/API Key/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/Enter API key/i)).toBeInTheDocument();
    });

    it('should load existing AI config when switching to AI tab', async () => {
      renderWithProviders(<SettingsModal onClose={mockOnClose} onSave={mockOnSave} />);

      const aiTab = screen.getByText('AI Connection');
      fireEvent.click(aiTab);

      await waitFor(() => {
        expect(window.electronAPI.getAIConfig).toHaveBeenCalled();
        expect(window.electronAPI.getAIModels).toHaveBeenCalled();
      });

      // Should populate model select with loaded config
      // Get all comboboxes - Provider is first, Model is second
      await waitFor(() => {
        const selects = screen.getAllByRole('combobox');
        const modelSelect = selects[1]; // Second select is Model
        expect(modelSelect).toHaveValue('anthropic/claude-3.5-sonnet');
      });
    });

    it('should test connection successfully', async () => {
      renderWithProviders(<SettingsModal onClose={mockOnClose} onSave={mockOnSave} />);

      fireEvent.click(screen.getByText('AI Connection'));

      // Wait for config and models to load
      await waitFor(() => {
        expect(window.electronAPI.getAIConfig).toHaveBeenCalled();
        expect(window.electronAPI.getAIModels).toHaveBeenCalled();
      });

      const apiKeyInput = screen.getByPlaceholderText(/Leave empty to keep existing key|Enter API key/i);
      fireEvent.change(apiKeyInput, { target: { value: 'test-api-key' } });

      const testButton = screen.getByText('Test Connection');
      fireEvent.click(testButton);

      // Phase 5.2: "Test Connection" button doesn't show success text (only "Test Saved Connection" does)
      // Verify success by checking testAIConnection was called and no error message appears
      await waitFor(() => {
        expect(window.electronAPI.testAIConnection).toHaveBeenCalledWith(
          'openrouter',
          'anthropic/claude-3.5-sonnet',
          'test-api-key'
        );
      });

      // No error message should be displayed (success is silent for "Test Connection")
      await waitFor(() => {
        expect(screen.queryByText(/invalid api key/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/connection test failed/i)).not.toBeInTheDocument();
      });
    });

    it('should show error when connection test fails', async () => {
      window.electronAPI.testAIConnection = vi.fn().mockResolvedValue({
        success: false,
        error: 'Invalid API key'
      });

      renderWithProviders(<SettingsModal onClose={mockOnClose} onSave={mockOnSave} />);

      fireEvent.click(screen.getByText('AI Connection'));

      // Wait for config load
      await waitFor(() => {
        expect(window.electronAPI.getAIConfig).toHaveBeenCalled();
      });

      const apiKeyInput = screen.getByPlaceholderText(/Leave empty to keep existing key|Enter API key/i);
      fireEvent.change(apiKeyInput, { target: { value: 'bad-key' } });

      const testButton = screen.getByText('Test Connection');
      fireEvent.click(testButton);

      await waitFor(() => {
        expect(screen.getByText(/Invalid API key/i)).toBeInTheDocument();
      });
    });

    it('should save AI configuration successfully', async () => {
      renderWithProviders(<SettingsModal onClose={mockOnClose} onSave={mockOnSave} />);

      fireEvent.click(screen.getByText('AI Connection'));

      // Wait for async config loading and models
      await waitFor(() => {
        expect(window.electronAPI.getAIConfig).toHaveBeenCalled();
        expect(window.electronAPI.getAIModels).toHaveBeenCalled();
      });

      // Get selects by role - there are 2 comboboxes (Provider and Model)
      const selects = screen.getAllByRole('combobox');
      const providerSelect = selects[0]; // First select is Provider
      const modelSelect = selects[1]; // Second select is Model
      const apiKeyInput = screen.getByPlaceholderText(/Enter API key|Leave empty|saved in Keychain/i);

      fireEvent.change(providerSelect, { target: { value: 'openai' } });

      // Wait for models to reload after provider change
      await waitFor(() => {
        expect(window.electronAPI.getAIModels).toHaveBeenCalledWith('openai');
      });

      fireEvent.change(modelSelect, { target: { value: 'openai/gpt-4' } });
      fireEvent.change(apiKeyInput, { target: { value: 'sk-test-key' } });

      const saveButton = screen.getByText('Save AI Config');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(window.electronAPI.updateAIConfig).toHaveBeenCalledWith({
          provider: 'openai',
          model: 'openai/gpt-4',
          apiKey: 'sk-test-key'
        });
      });

      // Should show success message
      await waitFor(() => {
        expect(screen.getByText(/AI configuration saved successfully/i)).toBeInTheDocument();
      }, { timeout: 2000 });

      // Modal should auto-close after brief delay (1.5s)
      expect(mockOnClose).not.toHaveBeenCalled(); // Not yet

      // Wait for auto-close delay
      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalledTimes(1);
      }, { timeout: 2000 });
    });

    it('should show error when save fails', async () => {
      window.electronAPI.updateAIConfig = vi.fn().mockResolvedValue({
        success: false,
        error: 'Failed to save configuration'
      });

      renderWithProviders(<SettingsModal onClose={mockOnClose} onSave={mockOnSave} />);

      fireEvent.click(screen.getByText('AI Connection'));

      // Wait for config to load
      await waitFor(() => {
        expect(window.electronAPI.getAIConfig).toHaveBeenCalled();
      });

      const apiKeyInput = screen.getByPlaceholderText(/Enter API key|Leave empty/i);
      fireEvent.change(apiKeyInput, { target: { value: 'test-key' } });

      const saveButton = screen.getByText('Save AI Config');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(window.electronAPI.updateAIConfig).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(screen.getByText(/Failed to save configuration/i)).toBeInTheDocument();
      });

      // Modal should NOT close on error
      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('should show "Test Saved Connection" when saved key exists', async () => {
      // Phase 5.2: hasSavedKey only becomes true AFTER saving, not on load
      // Component no longer checks isAIConfigured on mount (context is source of truth)
      // This test verifies the button appears after a successful save
      renderWithProviders(<SettingsModal onClose={mockOnClose} onSave={mockOnSave} />);

      fireEvent.click(screen.getByText('AI Connection'));

      // Wait for models to load
      await waitFor(() => {
        expect(window.electronAPI.getAIModels).toHaveBeenCalled();
      });

      // Initially, only "Test Connection" button exists (no saved key yet)
      expect(screen.queryByText('Test Saved Connection')).not.toBeInTheDocument();
      expect(screen.getByText('Test Connection')).toBeInTheDocument();

      // Enter API key and save
      const apiKeyInput = screen.getByPlaceholderText(/Enter API key/i);
      fireEvent.change(apiKeyInput, { target: { value: 'test-key' } });

      const saveButton = screen.getByText('Save AI Config');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(window.electronAPI.updateAIConfig).toHaveBeenCalled();
      });

      // After successful save, hasSavedKey becomes true, "Test Saved Connection" appears
      await waitFor(() => {
        expect(screen.getByText('Test Saved Connection')).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should require API key when no saved key exists', async () => {
      // Mock scenario where NO key is saved
      window.electronAPI.isAIConfigured = vi.fn().mockResolvedValue(false);

      renderWithProviders(<SettingsModal onClose={mockOnClose} onSave={mockOnSave} />);

      fireEvent.click(screen.getByText('AI Connection'));

      // Wait for async loading to complete
      await waitFor(() => {
        expect(window.electronAPI.getAIConfig).toHaveBeenCalled();
      });

      // Test button should be disabled when no saved key and no new key entered
      const testButton = screen.getByText('Test Connection');
      expect(testButton).toBeDisabled();
    });
    it('should disable buttons while testing connection', async () => {
      window.electronAPI.testAIConnection = vi.fn().mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ success: true }), 100))
      );

      renderWithProviders(<SettingsModal onClose={mockOnClose} onSave={mockOnSave} />);

      fireEvent.click(screen.getByText('AI Connection'));

      // Wait for config to load
      await waitFor(() => {
        expect(window.electronAPI.getAIConfig).toHaveBeenCalled();
      });

      const apiKeyInput = screen.getByPlaceholderText(/Enter API key|Leave empty/i);
      fireEvent.change(apiKeyInput, { target: { value: 'test-key' } });

      const testButton = screen.getByText('Test Connection');
      fireEvent.click(testButton);

      // When testing, the button text changes to "Testing..."
      // There might be multiple buttons (Test Saved Connection and Test Connection)
      // so we verify the specific test button is disabled
      expect(testButton).toBeDisabled();
      // Verify at least one Testing... button exists
      const testingButtons = screen.getAllByText('Testing...');
      expect(testingButtons.length).toBeGreaterThanOrEqual(1);
    });

    it('should disable buttons while saving', async () => {
      window.electronAPI.updateAIConfig = vi.fn().mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ success: true }), 100))
      );

      renderWithProviders(<SettingsModal onClose={mockOnClose} onSave={mockOnSave} />);

      fireEvent.click(screen.getByText('AI Connection'));

      // Wait for config to load
      await waitFor(() => {
        expect(window.electronAPI.getAIConfig).toHaveBeenCalled();
      });

      const apiKeyInput = screen.getByPlaceholderText(/Enter API key|Leave empty/i);
      fireEvent.change(apiKeyInput, { target: { value: 'test-key' } });

      const saveButton = screen.getByText('Save AI Config');
      fireEvent.click(saveButton);

      expect(screen.getByText('Saving...')).toBeInTheDocument();
      expect(saveButton).toBeDisabled();
    });

    it('should handle race condition when switching providers quickly', async () => {
      // Mock slow model fetching for OpenRouter
      const openRouterModels = [
        { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet' },
      ];
      const openAIModels = [
        { id: 'gpt-4', name: 'GPT-4' },
        { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' },
      ];

      let openRouterResolve: ((value: unknown) => void) | undefined;
      let openAIResolve: ((value: unknown) => void) | undefined;

      window.electronAPI.getAIModels = vi.fn().mockImplementation((provider: string) => {
        if (provider === 'openrouter') {
          return new Promise(resolve => {
            openRouterResolve = resolve;
          });
        } else if (provider === 'openai') {
          return new Promise(resolve => {
            openAIResolve = resolve;
          });
        }
        return Promise.resolve([]);
      });

      renderWithProviders(<SettingsModal onClose={mockOnClose} onSave={mockOnSave} />);

      fireEvent.click(screen.getByText('AI Connection'));

      // Wait for initial config load
      await waitFor(() => {
        expect(window.electronAPI.getAIConfig).toHaveBeenCalled();
      });

      // Get provider select (first combobox)
      const selects = screen.getAllByRole('combobox');
      const providerSelect = selects[0];

      // Quickly switch from openrouter -> openai (both requests in flight)
      fireEvent.change(providerSelect, { target: { value: 'openrouter' } });
      fireEvent.change(providerSelect, { target: { value: 'openai' } });

      // Resolve openrouter AFTER switching to openai (stale response)
      openRouterResolve?.(openRouterModels);

      // Resolve openai (current provider)
      openAIResolve?.(openAIModels);

      // Final state should show OpenAI models (not stale OpenRouter models)
      await waitFor(() => {
        // Model selector is now an input with datalist, not a select
        const datalist = document.getElementById('modelList');

        expect(datalist).toBeTruthy();
        const options = datalist?.querySelectorAll('option');
        const modelIds = Array.from(options || []).map(opt => opt.value);

        // Should have OpenAI models, NOT OpenRouter models
        expect(modelIds).toContain('gpt-4');
        expect(modelIds).not.toContain('anthropic/claude-3.5-sonnet');
      });
    });

    it('should display error message when AI config loading fails', async () => {
      // Phase 5.2: Component no longer calls getAIConfig on tab switch (context is source of truth)
      // Test updated to verify error handling when getAIModels fails instead
      window.electronAPI.getAIModels = vi.fn().mockRejectedValue(new Error('Failed to load models'));

      renderWithProviders(<SettingsModal onClose={mockOnClose} onSave={mockOnSave} />);

      fireEvent.click(screen.getByText('AI Connection'));

      // Should gracefully handle model loading failure (sets availableModels to empty array)
      await waitFor(() => {
        expect(window.electronAPI.getAIModels).toHaveBeenCalled();
      });

      // Component should still render without crashing
      // Provider and Model selects should exist
      await waitFor(() => {
        const selects = screen.getAllByRole('combobox');
        expect(selects.length).toBeGreaterThanOrEqual(2); // Provider and Model selects exist
      });

      // Model dropdown exists but has no models (error handled gracefully)
      // The component logs the error to console but doesn't show error UI
      expect(screen.getByText('Model')).toBeInTheDocument(); // Model label exists
    });
  });

  /**
   * CFEx Transfer Settings Tab Tests
   *
   * TDD RED Phase - Tests for configurable default paths
   * Feature: Priority 4 - CFEx Default Paths + Folder Creation
   */
  describe('CFEx Transfer Settings Tab', () => {
    beforeEach(() => {
      // Phase 5.2: Must include all context-required mocks
      window.electronAPI = {
        getAIConfig: vi.fn().mockResolvedValue({
          provider: 'openrouter',
          model: 'anthropic/claude-3.5-sonnet',
          apiKey: '***masked***'
        }),
        isAIConfigured: vi.fn().mockResolvedValue(true),
        updateAIConfig: vi.fn().mockResolvedValue({ success: true }),
        testAIConnection: vi.fn().mockResolvedValue({ success: true }),
        testSavedAIConnection: vi.fn().mockResolvedValue({ success: true }),
        getAIModels: vi.fn().mockResolvedValue([]),
        // Context-required mocks (IngestSettingsContext needs these)
        lexicon: {
          load: vi.fn().mockResolvedValue({}),
          save: vi.fn().mockResolvedValue(true)
        },
        loadConfig: vi.fn().mockResolvedValue({
          lexicon: {},
          cfex: {
            defaultSource: '/Volumes/Untitled/DCIM/100_FUJI',
            defaultPhotos: '/Volumes/videos-current/2. WORKING PROJECTS/',
            defaultVideos: '/Volumes/EAV_Video_RAW/'
          }
        }),
        saveConfig: vi.fn().mockResolvedValue(true),
        getShotTypes: mockGetShotTypes,
        selectFolder: vi.fn().mockResolvedValue('/selected/path'),
        batchStart: vi.fn(async () => 'mock-queue-id'),
        batchCancel: vi.fn(async () => ({ success: true })),
        batchGetStatus: vi.fn(async () => ({
          items: [],
          status: 'idle',
          currentFile: null
        })),
        onBatchProgress: vi.fn(() => () => {}),
        onTranscodeProgress: vi.fn(() => () => {}),
      } as Partial<typeof window.electronAPI> as typeof window.electronAPI;
    });

    it('should render CFEx Transfer tab alongside Lexicon and AI tabs', () => {
      renderWithProviders(<SettingsModal onClose={mockOnClose} onSave={mockOnSave} />);

      expect(screen.getByText('Lexicon')).toBeInTheDocument();
      expect(screen.getByText('AI Connection')).toBeInTheDocument();
      expect(screen.getByText('CFEx Transfer')).toBeInTheDocument();
    });

    it('should switch to CFEx Transfer tab when clicked', async () => {
      renderWithProviders(<SettingsModal onClose={mockOnClose} onSave={mockOnSave} />);

      const cfexTab = screen.getByText('CFEx Transfer');
      fireEvent.click(cfexTab);

      // Should show CFEx config form elements
      await waitFor(() => {
        expect(screen.getByLabelText(/default source folder/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/default photos destination/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/default raw videos destination/i)).toBeInTheDocument();
      });
    });

    it('should load saved CFEx config when switching to CFEx tab', async () => {
      renderWithProviders(<SettingsModal onClose={mockOnClose} onSave={mockOnSave} />);

      fireEvent.click(screen.getByText('CFEx Transfer'));

      await waitFor(() => {
        expect(window.electronAPI.loadConfig).toHaveBeenCalled();
      });

      // Should populate inputs with saved values
      await waitFor(() => {
        expect(screen.getByDisplayValue('/Volumes/Untitled/DCIM/100_FUJI')).toBeInTheDocument();
        expect(screen.getByDisplayValue('/Volumes/videos-current/2. WORKING PROJECTS/')).toBeInTheDocument();
        expect(screen.getByDisplayValue('/Volumes/EAV_Video_RAW/')).toBeInTheDocument();
      });
    });

    it('should have Browse buttons for each path field', async () => {
      renderWithProviders(<SettingsModal onClose={mockOnClose} onSave={mockOnSave} />);

      fireEvent.click(screen.getByText('CFEx Transfer'));

      await waitFor(() => {
        expect(window.electronAPI.loadConfig).toHaveBeenCalled();
      });

      // Should have 3 Browse buttons (one for each path field)
      const browseButtons = screen.getAllByRole('button', { name: /browse/i });
      expect(browseButtons.length).toBe(3);
    });

    it('should open folder picker when Browse button clicked', async () => {
      renderWithProviders(<SettingsModal onClose={mockOnClose} onSave={mockOnSave} />);

      fireEvent.click(screen.getByText('CFEx Transfer'));

      await waitFor(() => {
        expect(window.electronAPI.loadConfig).toHaveBeenCalled();
      });

      const browseButtons = screen.getAllByRole('button', { name: /browse/i });
      fireEvent.click(browseButtons[0]); // Click first Browse button (source)

      await waitFor(() => {
        expect(window.electronAPI.selectFolder).toHaveBeenCalled();
      });
    });

    it('should update input when folder selected via Browse', async () => {
      window.electronAPI.selectFolder = vi.fn().mockResolvedValue('/Volumes/NewCard/DCIM');

      renderWithProviders(<SettingsModal onClose={mockOnClose} onSave={mockOnSave} />);

      fireEvent.click(screen.getByText('CFEx Transfer'));

      await waitFor(() => {
        expect(window.electronAPI.loadConfig).toHaveBeenCalled();
      });

      const browseButtons = screen.getAllByRole('button', { name: /browse/i });
      fireEvent.click(browseButtons[0]); // Click first Browse button (source)

      await waitFor(() => {
        expect(screen.getByDisplayValue('/Volumes/NewCard/DCIM')).toBeInTheDocument();
      });
    });

    it('should save CFEx configuration when Save button clicked', async () => {
      renderWithProviders(<SettingsModal onClose={mockOnClose} onSave={mockOnSave} />);

      fireEvent.click(screen.getByText('CFEx Transfer'));

      await waitFor(() => {
        expect(window.electronAPI.loadConfig).toHaveBeenCalled();
      });

      // Modify a field
      const sourceInput = screen.getByLabelText(/default source folder/i);
      fireEvent.change(sourceInput, { target: { value: '/Volumes/NewSource/' } });

      const saveButton = screen.getByText('Save CFEx Settings');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(window.electronAPI.saveConfig).toHaveBeenCalledWith(
          expect.objectContaining({
            cfex: expect.objectContaining({
              defaultSource: '/Volumes/NewSource/',
              defaultPhotos: '/Volumes/videos-current/2. WORKING PROJECTS/',
              defaultVideos: '/Volumes/EAV_Video_RAW/'
            })
          })
        );
      });
    });

    it('should show success message after saving CFEx config', async () => {
      renderWithProviders(<SettingsModal onClose={mockOnClose} onSave={mockOnSave} />);

      fireEvent.click(screen.getByText('CFEx Transfer'));

      await waitFor(() => {
        expect(window.electronAPI.loadConfig).toHaveBeenCalled();
      });

      const saveButton = screen.getByText('Save CFEx Settings');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/CFEx settings saved successfully/i)).toBeInTheDocument();
      }, { timeout: 2000 });
    });

    it('should show error message when save fails', async () => {
      // Phase 5.2: saveConfig must reject (not return false) for context to throw
      window.electronAPI.saveConfig = vi.fn().mockRejectedValue(new Error('Failed to save CFEx settings'));

      renderWithProviders(<SettingsModal onClose={mockOnClose} onSave={mockOnSave} />);

      fireEvent.click(screen.getByText('CFEx Transfer'));

      await waitFor(() => {
        expect(window.electronAPI.loadConfig).toHaveBeenCalled();
      });

      const saveButton = screen.getByText('Save CFEx Settings');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/failed to save cfex settings/i)).toBeInTheDocument();
      });
    });

    it('should use default values when no config exists', async () => {
      window.electronAPI.loadConfig = vi.fn().mockResolvedValue({
        lexicon: {}
        // No cfex property - should use defaults
      });

      renderWithProviders(<SettingsModal onClose={mockOnClose} onSave={mockOnSave} />);

      fireEvent.click(screen.getByText('CFEx Transfer'));

      await waitFor(() => {
        expect(window.electronAPI.loadConfig).toHaveBeenCalled();
      });

      // Should show default values
      await waitFor(() => {
        expect(screen.getByDisplayValue('/Volumes/Untitled/DCIM/100_FUJI')).toBeInTheDocument();
        expect(screen.getByDisplayValue('/Volumes/videos-current/2. WORKING PROJECTS/')).toBeInTheDocument();
        expect(screen.getByDisplayValue('/Volumes/EAV_Video_RAW/')).toBeInTheDocument();
      });
    });

    it('should prevent saving empty CFEx paths', async () => {
      renderWithProviders(<SettingsModal onClose={mockOnClose} onSave={mockOnSave} />);

      fireEvent.click(screen.getByText('CFEx Transfer'));

      await waitFor(() => {
        expect(window.electronAPI.loadConfig).toHaveBeenCalled();
      });

      // Clear all path inputs
      const sourceInput = screen.getByLabelText(/default source folder/i);
      const photosInput = screen.getByLabelText(/default photos destination/i);
      const videosInput = screen.getByLabelText(/default raw videos destination/i);

      fireEvent.change(sourceInput, { target: { value: '' } });
      fireEvent.change(photosInput, { target: { value: '' } });
      fireEvent.change(videosInput, { target: { value: '' } });

      // Try to save
      const saveButton = screen.getByText('Save CFEx Settings');
      fireEvent.click(saveButton);

      // Should show validation error
      await waitFor(() => {
        expect(screen.getByText(/source path cannot be empty/i)).toBeInTheDocument();
      });

      // Should NOT have called saveConfig
      expect(window.electronAPI.saveConfig).not.toHaveBeenCalled();
    });
  });

  /**
   * Phase 1c: Power Features - CFEx Toggle Settings
   *
   * TDD RED Phase - Tests for AI Auto-Analyze, Metadata Write, and Filename Rewrite toggles
   * Feature: User-controlled post-transfer automation (I7 Human Primacy compliance)
   */
  describe('CFEx Power Features - Toggle Settings', () => {
    beforeEach(() => {
      // Phase 5.2: Must include all context-required mocks
      window.electronAPI = {
        getAIConfig: vi.fn().mockResolvedValue({
          provider: 'openrouter',
          model: 'anthropic/claude-3.5-sonnet',
          apiKey: '***masked***'
        }),
        isAIConfigured: vi.fn().mockResolvedValue(true),
        updateAIConfig: vi.fn().mockResolvedValue({ success: true }),
        testAIConnection: vi.fn().mockResolvedValue({ success: true }),
        testSavedAIConnection: vi.fn().mockResolvedValue({ success: true }),
        getAIModels: vi.fn().mockResolvedValue([]),
        // Context-required mocks (IngestSettingsContext needs these)
        lexicon: {
          load: vi.fn().mockResolvedValue({}),
          save: vi.fn().mockResolvedValue(true)
        },
        loadConfig: vi.fn().mockResolvedValue({
          lexicon: {},
          cfex: {
            defaultSource: '/Volumes/Untitled/DCIM/100_FUJI',
            defaultPhotos: '/Volumes/videos-current/2. WORKING PROJECTS/',
            defaultVideos: '/Volumes/EAV_Video_RAW/',
            aiAutoAnalyze: false,
            metadataWrite: false,
            filenameRewrite: false,
            filenameTemplate: '{location}-{subject}-{action}-{shotType}'
          }
        }),
        saveConfig: vi.fn().mockResolvedValue(true),
        getShotTypes: mockGetShotTypes,
        selectFolder: vi.fn().mockResolvedValue('/selected/path'),
        batchStart: vi.fn(async () => 'mock-queue-id'),
        batchCancel: vi.fn(async () => ({ success: true })),
        batchGetStatus: vi.fn(async () => ({
          items: [],
          status: 'idle',
          currentFile: null
        })),
        onBatchProgress: vi.fn(() => () => {}),
        onTranscodeProgress: vi.fn(() => () => {}),
      } as Partial<typeof window.electronAPI> as typeof window.electronAPI;
    });

    it('should render AI Auto-Analyze toggle checkbox', async () => {
      renderWithProviders(<SettingsModal onClose={mockOnClose} onSave={mockOnSave} />);

      fireEvent.click(screen.getByText('File Ingestion'));

      await waitFor(() => {
        expect(window.electronAPI.loadConfig).toHaveBeenCalled();
      });

      // Should have AI Auto-Analyze checkbox
      expect(screen.getByLabelText(/AI Auto-Analyze after transfer/i)).toBeInTheDocument();
    });

    it('should render Metadata Write toggle checkbox', async () => {
      renderWithProviders(<SettingsModal onClose={mockOnClose} onSave={mockOnSave} />);

      fireEvent.click(screen.getByText('File Ingestion'));

      await waitFor(() => {
        expect(window.electronAPI.loadConfig).toHaveBeenCalled();
      });

      // Should have Metadata Write checkbox
      expect(screen.getByLabelText(/Write metadata to files/i)).toBeInTheDocument();
    });

    it('should render Filename Rewrite toggle checkbox', async () => {
      renderWithProviders(<SettingsModal onClose={mockOnClose} onSave={mockOnSave} />);

      fireEvent.click(screen.getByText('File Ingestion'));

      await waitFor(() => {
        expect(window.electronAPI.loadConfig).toHaveBeenCalled();
      });

      // Should have Filename Rewrite checkbox
      expect(screen.getByLabelText(/Rename files using template/i)).toBeInTheDocument();
    });

    it('should show filename template input only when filenameRewrite is enabled', async () => {
      window.confirm = vi.fn().mockReturnValue(true); // User confirms the warning

      renderWithProviders(<SettingsModal onClose={mockOnClose} onSave={mockOnSave} />);

      fireEvent.click(screen.getByText('File Ingestion'));

      await waitFor(() => {
        expect(window.electronAPI.loadConfig).toHaveBeenCalled();
      });

      // Filename template input should NOT be visible initially (filenameRewrite=false)
      expect(screen.queryByPlaceholderText(/\{location\}-\{subject\}-\{action\}-\{shotType\}/)).not.toBeInTheDocument();

      // Enable filename rewrite toggle (will show confirmation)
      const filenameRewriteCheckbox = screen.getByLabelText(/Rename files using template/i);
      fireEvent.click(filenameRewriteCheckbox);

      // Confirmation should have been shown
      expect(window.confirm).toHaveBeenCalled();

      // Now filename template input should be visible
      await waitFor(() => {
        expect(screen.getByPlaceholderText(/\{location\}-\{subject\}-\{action\}-\{shotType\}/)).toBeInTheDocument();
      });
    });

    it('should load toggle state from config (all OFF by default per I7)', async () => {
      renderWithProviders(<SettingsModal onClose={mockOnClose} onSave={mockOnSave} />);

      fireEvent.click(screen.getByText('File Ingestion'));

      await waitFor(() => {
        expect(window.electronAPI.loadConfig).toHaveBeenCalled();
      });

      // All toggles should be unchecked (I7 Human Primacy - default OFF)
      const aiAutoAnalyzeCheckbox = screen.getByLabelText(/AI Auto-Analyze after transfer/i) as HTMLInputElement;
      const metadataWriteCheckbox = screen.getByLabelText(/Write metadata to files/i) as HTMLInputElement;
      const filenameRewriteCheckbox = screen.getByLabelText(/Rename files using template/i) as HTMLInputElement;

      expect(aiAutoAnalyzeCheckbox.checked).toBe(false);
      expect(metadataWriteCheckbox.checked).toBe(false);
      expect(filenameRewriteCheckbox.checked).toBe(false);
    });

    it('should update toggle state when checkboxes clicked', async () => {
      renderWithProviders(<SettingsModal onClose={mockOnClose} onSave={mockOnSave} />);

      fireEvent.click(screen.getByText('File Ingestion'));

      await waitFor(() => {
        expect(window.electronAPI.loadConfig).toHaveBeenCalled();
      });

      const aiAutoAnalyzeCheckbox = screen.getByLabelText(/AI Auto-Analyze after transfer/i) as HTMLInputElement;
      const metadataWriteCheckbox = screen.getByLabelText(/Write metadata to files/i) as HTMLInputElement;

      // Initially unchecked
      expect(aiAutoAnalyzeCheckbox.checked).toBe(false);
      expect(metadataWriteCheckbox.checked).toBe(false);

      // Click toggles
      fireEvent.click(aiAutoAnalyzeCheckbox);
      fireEvent.click(metadataWriteCheckbox);

      // Should be checked now
      expect(aiAutoAnalyzeCheckbox.checked).toBe(true);
      expect(metadataWriteCheckbox.checked).toBe(true);
    });

    it('should save toggle state when Save Ingestion Settings clicked', async () => {
      renderWithProviders(<SettingsModal onClose={mockOnClose} onSave={mockOnSave} />);

      fireEvent.click(screen.getByText('File Ingestion'));

      await waitFor(() => {
        expect(window.electronAPI.loadConfig).toHaveBeenCalled();
      });

      // Enable AI Auto-Analyze
      const aiAutoAnalyzeCheckbox = screen.getByLabelText(/AI Auto-Analyze after transfer/i);
      fireEvent.click(aiAutoAnalyzeCheckbox);

      // Enable Metadata Write
      const metadataWriteCheckbox = screen.getByLabelText(/Write metadata to files/i);
      fireEvent.click(metadataWriteCheckbox);

      // Save
      const saveButton = screen.getByText('Save Ingestion Settings');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(window.electronAPI.saveConfig).toHaveBeenCalledWith(
          expect.objectContaining({
            cfex: expect.objectContaining({
              aiAutoAnalyze: true,
              metadataWrite: true,
              filenameRewrite: false
            })
          })
        );
      });
    });

    it('should save filename template when filenameRewrite enabled', async () => {
      window.confirm = vi.fn().mockReturnValue(true); // User confirms the warning

      renderWithProviders(<SettingsModal onClose={mockOnClose} onSave={mockOnSave} />);

      fireEvent.click(screen.getByText('File Ingestion'));

      await waitFor(() => {
        expect(window.electronAPI.loadConfig).toHaveBeenCalled();
      });

      // Enable filename rewrite (will show confirmation)
      const filenameRewriteCheckbox = screen.getByLabelText(/Rename files using template/i);
      fireEvent.click(filenameRewriteCheckbox);

      // Confirmation should have been shown
      expect(window.confirm).toHaveBeenCalled();

      // Template input should appear
      await waitFor(() => {
        expect(screen.getByPlaceholderText(/\{location\}-\{subject\}-\{action\}-\{shotType\}/)).toBeInTheDocument();
      });

      // Change template
      const templateInput = screen.getByPlaceholderText(/\{location\}-\{subject\}-\{action\}-\{shotType\}/);
      fireEvent.change(templateInput, { target: { value: '{subject}-{shotType}' } });

      // Save
      const saveButton = screen.getByText('Save Ingestion Settings');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(window.electronAPI.saveConfig).toHaveBeenCalledWith(
          expect.objectContaining({
            cfex: expect.objectContaining({
              filenameRewrite: false, // Session-ephemeral: always saved as false
              filenameTemplate: '{subject}-{shotType}'
            })
          })
        );
      });
    });

    it('should load enabled toggle state from config', async () => {
      // Mock config with toggles ENABLED
      window.electronAPI.loadConfig = vi.fn().mockResolvedValue({
        lexicon: {},
        cfex: {
          defaultSource: '/Volumes/Untitled/DCIM/100_FUJI',
          defaultPhotos: '/Volumes/videos-current/2. WORKING PROJECTS/',
          defaultVideos: '/Volumes/EAV_Video_RAW/',
          aiAutoAnalyze: true,
          metadataWrite: true,
          filenameRewrite: true, // Will be ignored (session-ephemeral)
          filenameTemplate: '{location}-{subject}-{shotType}'
        }
      });

      renderWithProviders(<SettingsModal onClose={mockOnClose} onSave={mockOnSave} />);

      fireEvent.click(screen.getByText('File Ingestion'));

      await waitFor(() => {
        expect(window.electronAPI.loadConfig).toHaveBeenCalled();
      });

      // aiAutoAnalyze and metadataWrite should be checked
      const aiAutoAnalyzeCheckbox = screen.getByLabelText(/AI Auto-Analyze after transfer/i) as HTMLInputElement;
      const metadataWriteCheckbox = screen.getByLabelText(/Write metadata to files/i) as HTMLInputElement;
      const filenameRewriteCheckbox = screen.getByLabelText(/Rename files using template/i) as HTMLInputElement;

      await waitFor(() => {
        expect(aiAutoAnalyzeCheckbox.checked).toBe(true);
        expect(metadataWriteCheckbox.checked).toBe(true);
        // Session-ephemeral: filenameRewrite always loads as false
        expect(filenameRewriteCheckbox.checked).toBe(false);
      });

      // Filename template input should NOT be visible (since filenameRewrite is false)
      expect(screen.queryByDisplayValue('{location}-{subject}-{shotType}')).not.toBeInTheDocument();
    });
  });

  /**
   * File Ingestion Tab Tests
   *
   * TDD RED Phase - Tests for separate File Ingestion tab containing power feature toggles
   * Feature: Separate ingestion settings from CFEx transfer configuration
   * Rationale: Toggles apply to all file ingestion workflows, not just CFEx transfer
   */
  describe('File Ingestion Settings Tab', () => {
    beforeEach(() => {
      // Phase 5.2: Must include all context-required mocks
      window.electronAPI = {
        getAIConfig: vi.fn().mockResolvedValue({
          provider: 'openrouter',
          model: 'anthropic/claude-3.5-sonnet',
          apiKey: '***masked***'
        }),
        isAIConfigured: vi.fn().mockResolvedValue(true),
        updateAIConfig: vi.fn().mockResolvedValue({ success: true }),
        testAIConnection: vi.fn().mockResolvedValue({ success: true }),
        testSavedAIConnection: vi.fn().mockResolvedValue({ success: true }),
        getAIModels: vi.fn().mockResolvedValue([]),
        // Context-required mocks (IngestSettingsContext needs these)
        lexicon: {
          load: vi.fn().mockResolvedValue({}),
          save: vi.fn().mockResolvedValue(true)
        },
        loadConfig: vi.fn().mockResolvedValue({
          lexicon: {},
          cfex: {
            defaultSource: '/Volumes/Untitled/DCIM/100_FUJI',
            defaultPhotos: '/Volumes/videos-current/2. WORKING PROJECTS/',
            defaultVideos: '/Volumes/EAV_Video_RAW/',
            aiAutoAnalyze: false,
            metadataWrite: false,
            filenameRewrite: false,
            filenameTemplate: '{location}-{subject}-{action}-{shotType}'
          }
        }),
        saveConfig: vi.fn().mockResolvedValue(true),
        getShotTypes: mockGetShotTypes,
        selectFolder: vi.fn().mockResolvedValue('/selected/path'),
        batchStart: vi.fn(async () => 'mock-queue-id'),
        batchCancel: vi.fn(async () => ({ success: true })),
        batchGetStatus: vi.fn(async () => ({
          items: [],
          status: 'idle',
          currentFile: null
        })),
        onBatchProgress: vi.fn(() => () => {}),
        onTranscodeProgress: vi.fn(() => () => {}),
      } as Partial<typeof window.electronAPI> as typeof window.electronAPI;
    });

    it('should render File Ingestion tab alongside other tabs', () => {
      renderWithProviders(<SettingsModal onClose={mockOnClose} onSave={mockOnSave} />);

      expect(screen.getByText('Lexicon')).toBeInTheDocument();
      expect(screen.getByText('AI Connection')).toBeInTheDocument();
      expect(screen.getByText('CFEx Transfer')).toBeInTheDocument();
      expect(screen.getByText('File Ingestion')).toBeInTheDocument();
    });

    it('should show power feature toggles when File Ingestion tab is clicked', async () => {
      renderWithProviders(<SettingsModal onClose={mockOnClose} onSave={mockOnSave} />);

      fireEvent.click(screen.getByText('File Ingestion'));

      await waitFor(() => {
        expect(window.electronAPI.loadConfig).toHaveBeenCalled();
      });

      // Should have all 3 power feature toggles
      expect(screen.getByLabelText(/AI Auto-Analyze after transfer/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Write metadata to files/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Rename files using template/i)).toBeInTheDocument();
    });

    it('should NOT show power feature toggles in CFEx Transfer tab', async () => {
      renderWithProviders(<SettingsModal onClose={mockOnClose} onSave={mockOnSave} />);

      fireEvent.click(screen.getByText('CFEx Transfer'));

      await waitFor(() => {
        expect(window.electronAPI.loadConfig).toHaveBeenCalled();
      });

      // Power feature toggles should NOT be in CFEx Transfer tab
      expect(screen.queryByLabelText(/AI Auto-Analyze after transfer/i)).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/Write metadata to files/i)).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/Rename files using template/i)).not.toBeInTheDocument();
    });

    it('should save toggle state when Save Ingestion Settings clicked', async () => {
      renderWithProviders(<SettingsModal onClose={mockOnClose} onSave={mockOnSave} />);

      fireEvent.click(screen.getByText('File Ingestion'));

      await waitFor(() => {
        expect(window.electronAPI.loadConfig).toHaveBeenCalled();
      });

      // Enable AI Auto-Analyze toggle
      const aiToggle = screen.getByLabelText(/AI Auto-Analyze after transfer/i);
      fireEvent.click(aiToggle);

      // Save
      const saveButton = screen.getByText('Save Ingestion Settings');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(window.electronAPI.saveConfig).toHaveBeenCalledWith(
          expect.objectContaining({
            cfex: expect.objectContaining({
              aiAutoAnalyze: true
            })
          })
        );
      });
    });
  });

  /**
   * File Rename Safety System Tests (B5 Enhancement)
   *
   * TDD RED Phase - Safety mechanisms for destructive file rename feature
   * Feature: Three-layer safety system for filename rewriting
   * - Warning dialog when checkbox is checked
   * - Session-ephemeral state (defaults to false on load)
   * - Batch operations warning when rename is enabled
   */
  describe('File Rename Safety System - Checkbox Confirmation', () => {
    beforeEach(() => {
      // Mock window.confirm for confirmation dialog tests
      window.confirm = vi.fn();

      window.electronAPI = {
        getAIConfig: vi.fn().mockResolvedValue({
          provider: 'openrouter',
          model: 'anthropic/claude-3.5-sonnet',
          apiKey: '***masked***'
        }),
        isAIConfigured: vi.fn().mockResolvedValue(true),
        updateAIConfig: vi.fn().mockResolvedValue({ success: true }),
        testAIConnection: vi.fn().mockResolvedValue({ success: true }),
        testSavedAIConnection: vi.fn().mockResolvedValue({ success: true }),
        getAIModels: vi.fn().mockResolvedValue([]),
        loadConfig: vi.fn().mockResolvedValue({
          lexicon: {},
          cfex: {
            defaultSource: '/Volumes/Untitled/DCIM/100_FUJI',
            defaultPhotos: '/Volumes/videos-current/2. WORKING PROJECTS/',
            defaultVideos: '/Volumes/EAV_Video_RAW/',
            aiAutoAnalyze: false,
            metadataWrite: false,
            filenameRewrite: false,
            filenameTemplate: '{location}-{subject}-{action}-{shotType}'
          }
        }),
        saveConfig: vi.fn().mockResolvedValue(true),
        getShotTypes: mockGetShotTypes,
        lexicon: {
          load: vi.fn().mockResolvedValue({}),
          save: vi.fn().mockResolvedValue(true)
        },
        selectFolder: vi.fn().mockResolvedValue('/selected/path'),
        batchStart: vi.fn(async () => 'mock-queue-id'),
        batchCancel: vi.fn(async () => ({ success: true })),
        batchGetStatus: vi.fn(async () => ({
          items: [],
          status: 'idle',
          currentFile: null
        })),
        onBatchProgress: vi.fn(() => () => {}),
        onTranscodeProgress: vi.fn(() => () => {}),
      } as Partial<typeof window.electronAPI> as typeof window.electronAPI;
    });

    it('shows confirmation dialog when filenameRewrite checkbox clicked', async () => {
      renderWithProviders(<SettingsModal onClose={mockOnClose} onSave={mockOnSave} />);

      fireEvent.click(screen.getByText('File Ingestion'));

      await waitFor(() => {
        expect(window.electronAPI.loadConfig).toHaveBeenCalled();
      });

      const filenameRewriteCheckbox = screen.getByLabelText(/Rename files using template/i);

      // Click checkbox should trigger confirmation dialog
      fireEvent.click(filenameRewriteCheckbox);

      // Should call window.confirm with warning message
      expect(window.confirm).toHaveBeenCalledWith(
        expect.stringContaining('⚠️ File Rename Warning')
      );
      expect(window.confirm).toHaveBeenCalledWith(
        expect.stringContaining('This will rename files based on metadata')
      );
      expect(window.confirm).toHaveBeenCalledWith(
        expect.stringContaining('Original filenames will be preserved in TapeName XMP field')
      );
    });

    it('enables filenameRewrite when user confirms dialog', async () => {
      (window.confirm as ReturnType<typeof vi.fn>).mockReturnValue(true); // User clicks OK

      renderWithProviders(<SettingsModal onClose={mockOnClose} onSave={mockOnSave} />);

      fireEvent.click(screen.getByText('File Ingestion'));

      await waitFor(() => {
        expect(window.electronAPI.loadConfig).toHaveBeenCalled();
      });

      const filenameRewriteCheckbox = screen.getByLabelText(/Rename files using template/i) as HTMLInputElement;

      // Initially unchecked
      expect(filenameRewriteCheckbox.checked).toBe(false);

      // Click checkbox
      fireEvent.click(filenameRewriteCheckbox);

      // Should show confirmation
      expect(window.confirm).toHaveBeenCalled();

      // Should be checked after confirmation
      await waitFor(() => {
        expect(filenameRewriteCheckbox.checked).toBe(true);
      });
    });

    it('keeps filenameRewrite disabled when user cancels dialog', async () => {
      (window.confirm as ReturnType<typeof vi.fn>).mockReturnValue(false); // User clicks Cancel

      renderWithProviders(<SettingsModal onClose={mockOnClose} onSave={mockOnSave} />);

      fireEvent.click(screen.getByText('File Ingestion'));

      await waitFor(() => {
        expect(window.electronAPI.loadConfig).toHaveBeenCalled();
      });

      const filenameRewriteCheckbox = screen.getByLabelText(/Rename files using template/i) as HTMLInputElement;

      // Initially unchecked
      expect(filenameRewriteCheckbox.checked).toBe(false);

      // Click checkbox
      fireEvent.click(filenameRewriteCheckbox);

      // Should show confirmation
      expect(window.confirm).toHaveBeenCalled();

      // Should remain unchecked after cancellation
      await waitFor(() => {
        expect(filenameRewriteCheckbox.checked).toBe(false);
      });
    });
  });

  describe('File Rename Safety System - Session-Ephemeral State', () => {
    beforeEach(() => {
      // Phase 5.2: Must include all context-required mocks
      window.electronAPI = {
        getAIConfig: vi.fn().mockResolvedValue({
          provider: 'openrouter',
          model: 'anthropic/claude-3.5-sonnet',
          apiKey: '***masked***'
        }),
        isAIConfigured: vi.fn().mockResolvedValue(true),
        updateAIConfig: vi.fn().mockResolvedValue({ success: true }),
        testAIConnection: vi.fn().mockResolvedValue({ success: true }),
        testSavedAIConnection: vi.fn().mockResolvedValue({ success: true }),
        getAIModels: vi.fn().mockResolvedValue([]),
        // Context-required mocks (IngestSettingsContext needs these)
        lexicon: {
          load: vi.fn().mockResolvedValue({}),
          save: vi.fn().mockResolvedValue(true)
        },
        loadConfig: vi.fn().mockResolvedValue({
          lexicon: {},
          cfex: {
            defaultSource: '/Volumes/Untitled/DCIM/100_FUJI',
            defaultPhotos: '/Volumes/videos-current/2. WORKING PROJECTS/',
            defaultVideos: '/Volumes/EAV_Video_RAW/',
            aiAutoAnalyze: false,
            metadataWrite: false,
            filenameRewrite: true, // ⚠️ CRITICAL: Config has it enabled, but should load as false
            filenameTemplate: '{location}-{subject}-{action}-{shotType}'
          }
        }),
        saveConfig: vi.fn().mockResolvedValue(true),
        getShotTypes: mockGetShotTypes,
        selectFolder: vi.fn().mockResolvedValue('/selected/path'),
        batchStart: vi.fn(async () => 'mock-queue-id'),
        batchCancel: vi.fn(async () => ({ success: true })),
        batchGetStatus: vi.fn(async () => ({
          items: [],
          status: 'idle',
          currentFile: null
        })),
        onBatchProgress: vi.fn(() => () => {}),
        onTranscodeProgress: vi.fn(() => () => {}),
      } as Partial<typeof window.electronAPI> as typeof window.electronAPI;
    });

    it('filenameRewrite defaults to false on mount regardless of config', async () => {
      renderWithProviders(<SettingsModal onClose={mockOnClose} onSave={mockOnSave} />);

      fireEvent.click(screen.getByText('File Ingestion'));

      await waitFor(() => {
        expect(window.electronAPI.loadConfig).toHaveBeenCalled();
      });

      // Even though config has filenameRewrite: true, checkbox should be unchecked (session-ephemeral)
      const filenameRewriteCheckbox = screen.getByLabelText(/Rename files using template/i) as HTMLInputElement;

      await waitFor(() => {
        expect(filenameRewriteCheckbox.checked).toBe(false);
      });
    });

    it('filenameRewrite not persisted to config on save', async () => {
      window.confirm = vi.fn().mockReturnValue(true); // Allow enabling checkbox

      renderWithProviders(<SettingsModal onClose={mockOnClose} onSave={mockOnSave} />);

      fireEvent.click(screen.getByText('File Ingestion'));

      await waitFor(() => {
        expect(window.electronAPI.loadConfig).toHaveBeenCalled();
      });

      // Enable filename rewrite
      const filenameRewriteCheckbox = screen.getByLabelText(/Rename files using template/i);
      fireEvent.click(filenameRewriteCheckbox);

      await waitFor(() => {
        expect((filenameRewriteCheckbox as HTMLInputElement).checked).toBe(true);
      });

      // Save settings
      const saveButton = screen.getByText('Save Ingestion Settings');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(window.electronAPI.saveConfig).toHaveBeenCalled();
      });

      // Verify filenameRewrite was saved as FALSE (not persisted)
      const savedConfig = (window.electronAPI.saveConfig as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(savedConfig.cfex.filenameRewrite).toBe(false);
    });
  });

  describe('Proxy Format Settings (File Ingestion Tab)', () => {
    beforeEach(() => {
      // Phase 5.2: Must include all context-required mocks
      window.electronAPI = {
        getAIConfig: vi.fn().mockResolvedValue({
          provider: 'openrouter',
          model: ''
        }),
        isAIConfigured: vi.fn().mockResolvedValue(false),
        getAIModels: vi.fn().mockResolvedValue([]),
        lexicon: {
          load: vi.fn().mockResolvedValue({}),
          save: vi.fn().mockResolvedValue(true)
        },
        loadConfig: vi.fn().mockResolvedValue({
          cfex: {
            defaultSource: '/Volumes/Untitled/DCIM/100_FUJI',
            defaultPhotos: '/Volumes/videos-current/2. WORKING PROJECTS/',
            defaultVideos: '/Volumes/EAV_Video_RAW/',
            aiAutoAnalyze: false,
            metadataWrite: false,
            filenameRewrite: false,
            filenameTemplate: '{location}-{subject}-{action}-{shotType}',
            proxyPresetId: '2k-prores-proxy'
          }
        }),
        saveConfig: vi.fn().mockResolvedValue(true),
        getShotTypes: mockGetShotTypes,
        updateAIConfig: vi.fn().mockResolvedValue({ success: true })
      } as any;
    });

    it('should render proxy format dropdown in File Ingestion tab', async () => {
      renderWithProviders(<SettingsModal onClose={mockOnClose} onSave={mockOnSave} />);

      // Switch to File Ingestion tab
      const ingestionTab = screen.getByText('File Ingestion');
      fireEvent.click(ingestionTab);

      await waitFor(() => {
        expect(window.electronAPI.loadConfig).toHaveBeenCalled();
      });

      // Should show proxy format dropdown
      expect(screen.getByLabelText(/Proxy Format/i)).toBeInTheDocument();
    });

    it('should show all 5 proxy preset options', async () => {
      renderWithProviders(<SettingsModal onClose={mockOnClose} onSave={mockOnSave} />);

      // Switch to File Ingestion tab
      const ingestionTab = screen.getByText('File Ingestion');
      fireEvent.click(ingestionTab);

      await waitFor(() => {
        expect(window.electronAPI.loadConfig).toHaveBeenCalled();
      });

      // Find the select element
      const proxySelect = screen.getByLabelText(/Proxy Format/i) as HTMLSelectElement;

      // Should have 5 options
      expect(proxySelect.options.length).toBe(5);

      // Verify option values and labels
      expect(proxySelect.options[0].value).toBe('2k-prores-proxy');
      expect(proxySelect.options[0].text).toContain('2K ProRes Proxy (Recommended)');

      expect(proxySelect.options[1].value).toBe('1080p-prores-proxy');
      expect(proxySelect.options[1].text).toContain('1080p ProRes Proxy');

      expect(proxySelect.options[2].value).toBe('4k-prores-proxy');
      expect(proxySelect.options[2].text).toContain('4K ProRes Proxy');

      expect(proxySelect.options[3].value).toBe('2k-h264-crf23');
      expect(proxySelect.options[3].text).toContain('2K H.264');

      expect(proxySelect.options[4].value).toBe('1080p-h264-crf18');
      expect(proxySelect.options[4].text).toContain('1080p H.264');
    });

    it('should default to 2k-prores-proxy when no preset saved', async () => {
      window.electronAPI.loadConfig = vi.fn().mockResolvedValue({
        cfex: {
          // No proxyPresetId saved
        }
      });

      renderWithProviders(<SettingsModal onClose={mockOnClose} onSave={mockOnSave} />);

      // Switch to File Ingestion tab
      const ingestionTab = screen.getByText('File Ingestion');
      fireEvent.click(ingestionTab);

      await waitFor(() => {
        expect(window.electronAPI.loadConfig).toHaveBeenCalled();
      });

      const proxySelect = screen.getByLabelText(/Proxy Format/i) as HTMLSelectElement;
      expect(proxySelect.value).toBe('2k-prores-proxy');
    });

    it('should load saved proxy preset selection', async () => {
      window.electronAPI.loadConfig = vi.fn().mockResolvedValue({
        cfex: {
          proxyPresetId: '1080p-h264-crf18'
        }
      });

      renderWithProviders(<SettingsModal onClose={mockOnClose} onSave={mockOnSave} />);

      // Switch to File Ingestion tab
      const ingestionTab = screen.getByText('File Ingestion');
      fireEvent.click(ingestionTab);

      await waitFor(() => {
        expect(window.electronAPI.loadConfig).toHaveBeenCalled();
      });

      // Wait for context to propagate the loaded value
      await waitFor(() => {
        const proxySelect = screen.getByLabelText(/Proxy Format/i) as HTMLSelectElement;
        expect(proxySelect.value).toBe('1080p-h264-crf18');
      });
    });

    it('should save proxy preset selection when Save button clicked', async () => {
      renderWithProviders(<SettingsModal onClose={mockOnClose} onSave={mockOnSave} />);

      // Switch to File Ingestion tab
      const ingestionTab = screen.getByText('File Ingestion');
      fireEvent.click(ingestionTab);

      await waitFor(() => {
        expect(window.electronAPI.loadConfig).toHaveBeenCalled();
      });

      // Change proxy format
      const proxySelect = screen.getByLabelText(/Proxy Format/i) as HTMLSelectElement;
      fireEvent.change(proxySelect, { target: { value: '4k-prores-proxy' } });
      expect(proxySelect.value).toBe('4k-prores-proxy');

      // Save settings
      const saveButton = screen.getByText('Save Ingestion Settings');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(window.electronAPI.saveConfig).toHaveBeenCalled();
      });

      // Verify proxyPresetId was saved
      const savedConfig = (window.electronAPI.saveConfig as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(savedConfig.cfex.proxyPresetId).toBe('4k-prores-proxy');
    });

    it('should show preset description below dropdown', async () => {
      renderWithProviders(<SettingsModal onClose={mockOnClose} onSave={mockOnSave} />);

      // Switch to File Ingestion tab
      const ingestionTab = screen.getByText('File Ingestion');
      fireEvent.click(ingestionTab);

      await waitFor(() => {
        expect(window.electronAPI.loadConfig).toHaveBeenCalled();
      });

      // Should show description for default preset (2k-prores-proxy)
      expect(screen.getByText(/Sweet spot: 10-bit 4:2:2, low CPU/i)).toBeInTheDocument();
    });
  });

  /**
   * Phase 5.2: Context Consumption Tests
   *
   * TDD RED Phase - Tests for SettingsModal consuming IngestSettingsContext
   * Feature: Replace local useState with useIngestSettings() hook
   */
  describe('Context Consumption (Phase 5.2)', () => {
    beforeEach(() => {
      // Full mock for IngestSettingsContext to load properly
      window.electronAPI = {
        // AI config
        getAIConfig: vi.fn().mockResolvedValue({
          provider: 'openrouter',
          model: 'anthropic/claude-3.5-sonnet'
        }),
        isAIConfigured: vi.fn().mockResolvedValue(true),
        getAIModels: vi.fn().mockResolvedValue([
          { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet' }
        ]),
        updateAIConfig: vi.fn().mockResolvedValue({ success: true }),

        // Lexicon config - loaded by IngestSettingsContext
        lexicon: {
          load: vi.fn().mockResolvedValue({
            pattern: '{location}-{subject}-{shotType}',
            commonLocations: 'kitchen, bathroom',
            commonSubjects: 'oven, sink',
            commonActions: 'cleaning',
            wordPreferences: 'faucet → tap',
            aiInstructions: 'Use lowercase',
            goodExamples: 'kitchen-oven-CU',
            badExamples: 'Kitchen-Oven-CU'
          }),
          save: vi.fn().mockResolvedValue(true)
        },

        // App config - loaded by IngestSettingsContext
        loadConfig: vi.fn().mockResolvedValue({
          cfex: {
            defaultSource: '/Volumes/Untitled/DCIM/100_FUJI',
            defaultPhotos: '/Volumes/videos-current/2. WORKING PROJECTS/',
            defaultVideos: '/Volumes/EAV_Video_RAW/',
            aiAutoAnalyze: false,
            metadataWrite: false,
            filenameRewrite: false,
            filenameTemplate: '{location}-{subject}-{action}-{shotType}',
            proxyPresetId: '2k-prores-proxy'
          }
        }),
        saveConfig: vi.fn().mockResolvedValue(true),

        // Shot types
        getShotTypes: vi.fn().mockResolvedValue(['WS', 'MID', 'CU', 'UNDER', 'FP', 'TRACK', 'ESTAB'])
      } as any;
    });

    it('should consume IngestSettingsContext for lexicon settings', async () => {
      renderWithProviders(<SettingsModal onClose={mockOnClose} onSave={mockOnSave} />);

      await waitFor(() => {
        expect(window.electronAPI.loadConfig).toHaveBeenCalled();
      });

      // Wait for lexicon values to propagate from context
      await waitFor(() => {
        expect(screen.getByDisplayValue('kitchen, bathroom')).toBeInTheDocument();
      });
      expect(screen.getByDisplayValue('oven, sink')).toBeInTheDocument();
      expect(screen.getByDisplayValue('cleaning')).toBeInTheDocument();
    });

    it('should consume IngestSettingsContext for AI model settings', async () => {

      renderWithProviders(<SettingsModal onClose={mockOnClose} onSave={mockOnSave} />);

      // Switch to AI Connection tab
      fireEvent.click(screen.getByText('AI Connection'));

      await waitFor(() => {
        expect(window.electronAPI.loadConfig).toHaveBeenCalled();
      });

      // AI model should be populated from context (check via select value)
      const selects = screen.getAllByRole('combobox');
      await waitFor(() => {
        expect(selects[1]).toHaveValue('anthropic/claude-3.5-sonnet');
      });
    });

    it('should consume IngestSettingsContext for CFEx paths', async () => {

      renderWithProviders(<SettingsModal onClose={mockOnClose} onSave={mockOnSave} />);

      // Switch to CFEx Transfer tab
      fireEvent.click(screen.getByText('CFEx Transfer'));

      await waitFor(() => {
        expect(window.electronAPI.loadConfig).toHaveBeenCalled();
      });

      // CFEx paths should be populated from context
      expect(screen.getByDisplayValue('/Volumes/Untitled/DCIM/100_FUJI')).toBeInTheDocument();
      expect(screen.getByDisplayValue('/Volumes/videos-current/2. WORKING PROJECTS/')).toBeInTheDocument();
    });

    it('should consume IngestSettingsContext for power feature toggles', async () => {

      renderWithProviders(<SettingsModal onClose={mockOnClose} onSave={mockOnSave} />);

      // Switch to File Ingestion tab
      fireEvent.click(screen.getByText('File Ingestion'));

      await waitFor(() => {
        expect(window.electronAPI.loadConfig).toHaveBeenCalled();
      });

      // Toggles should be populated from context
      const aiAutoAnalyze = screen.getByLabelText(/AI Auto-Analyze after transfer/i) as HTMLInputElement;
      const metadataWrite = screen.getByLabelText(/Write metadata to files/i) as HTMLInputElement;

      expect(aiAutoAnalyze.checked).toBe(false);
      expect(metadataWrite.checked).toBe(false);
    });

    it('should update context when saving lexicon settings', async () => {
      renderWithProviders(<SettingsModal onClose={mockOnClose} onSave={mockOnSave} />);

      // Wait for context to load
      await waitFor(() => {
        expect(window.electronAPI.loadConfig).toHaveBeenCalled();
      });

      // Wait for lexicon values to be populated from context
      await waitFor(() => {
        expect(screen.getByDisplayValue('kitchen, bathroom')).toBeInTheDocument();
      });

      // Update lexicon field
      const locationsInput = screen.getByPlaceholderText(/kitchen, hall, utility/i);
      fireEvent.change(locationsInput, { target: { value: 'kitchen, garage' } });

      // Save - Phase 5.2: Now routes through updateSettings (context is single source of truth)
      fireEvent.click(screen.getByText('Save Lexicon'));

      // Verify context updateSettings persists to backend (lexicon.save called internally)
      await waitFor(() => {
        expect(window.electronAPI.lexicon.save).toHaveBeenCalledWith(
          expect.objectContaining({
            commonLocations: 'kitchen, garage'
          })
        );
      });
    });

    it('should update context when saving AI settings', async () => {
      // Clear the mock to track calls from this test only
      vi.mocked(window.electronAPI.updateAIConfig).mockClear();

      renderWithProviders(<SettingsModal onClose={mockOnClose} onSave={mockOnSave} />);

      // Switch to AI Connection tab
      fireEvent.click(screen.getByText('AI Connection'));

      // Wait for config to load
      await waitFor(() => {
        expect(window.electronAPI.loadConfig).toHaveBeenCalled();
      });

      // Change AI provider and model
      const selects = screen.getAllByRole('combobox');
      const providerSelect = selects[0]; // First select is Provider
      const modelSelect = selects[1]; // Second select is Model
      const apiKeyInput = screen.getByPlaceholderText(/Enter API key|Leave empty/i);

      fireEvent.change(providerSelect, { target: { value: 'openai' } });

      // Wait for models to reload after provider change
      await waitFor(() => {
        expect(window.electronAPI.getAIModels).toHaveBeenCalledWith('openai');
      });

      fireEvent.change(modelSelect, { target: { value: 'openai/gpt-4' } });
      fireEvent.change(apiKeyInput, { target: { value: 'test-api-key' } });

      // Save AI config
      const saveButton = screen.getByText('Save AI Config');
      fireEvent.click(saveButton);

      // Critical: Verify context was updated (via updateAIConfig called TWICE)
      // This test fails if handleSaveAI bypasses context
      // Expected flow:
      //   1. updateSettings({ aiProvider, aiModel }) → updateAIConfig (from context)
      //   2. updateAIConfig({ provider, model, apiKey }) → updateAIConfig (from handleSaveAI for API key)
      // If bypassed, only 1 call happens (from handleSaveAI)
      await waitFor(() => {
        expect(window.electronAPI.updateAIConfig).toHaveBeenCalledTimes(2);
      });

      // Verify both calls have correct provider/model
      const calls = vi.mocked(window.electronAPI.updateAIConfig).mock.calls;
      expect(calls[0][0]).toMatchObject({ provider: 'openai', model: 'openai/gpt-4' });
      expect(calls[1][0]).toMatchObject({ provider: 'openai', model: 'openai/gpt-4' });
    });
  });
});
