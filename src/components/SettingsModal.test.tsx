import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SettingsModal } from './SettingsModal';
import type { LexiconConfig } from '../types';

describe('SettingsModal', () => {
  const mockOnClose = vi.fn();
  const mockOnSave = vi.fn();

  beforeEach(() => {
    mockOnClose.mockClear();
    mockOnSave.mockClear();
    mockOnSave.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  it('renders modal with title', () => {
    render(<SettingsModal onClose={mockOnClose} onSave={mockOnSave} />);
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('renders lexicon form with all fields', () => {
    render(<SettingsModal onClose={mockOnClose} onSave={mockOnSave} />);

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

  it('loads initial config data', () => {
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

    render(
      <SettingsModal
        onClose={mockOnClose}
        onSave={mockOnSave}
        initialConfig={initialConfig}
      />
    );

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
    render(<SettingsModal onClose={mockOnClose} onSave={mockOnSave} />);

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
    render(<SettingsModal onClose={mockOnClose} onSave={mockOnSave} />);

    fireEvent.click(screen.getByText('Cancel'));
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });


  it('does not close when backdrop clicked', () => {
    render(<SettingsModal onClose={mockOnClose} onSave={mockOnSave} />);

    // Click on the backdrop (not the modal content)
    const backdrop = screen.getByText('Settings').closest('.modal-backdrop');
    expect(backdrop).toBeTruthy();

    fireEvent.click(backdrop!);
    // Modal should NOT close when clicking outside
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('saves lexicon config when save button clicked', async () => {
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

    render(
      <SettingsModal
        onClose={mockOnClose}
        onSave={mockOnSave}
        initialConfig={initialConfig}
      />
    );

    fireEvent.click(screen.getByText('Save Lexicon'));

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledTimes(1);
    });

    const savedConfig = mockOnSave.mock.calls[0][0] as LexiconConfig;
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
    render(<SettingsModal onClose={mockOnClose} onSave={mockOnSave} />);

    const patternInput = screen.getByPlaceholderText(/\{location\}-\{subject\}-\{shotType\}/i);
    const locationsInput = screen.getByPlaceholderText(/kitchen, hall, utility/i);

    fireEvent.change(patternInput, { target: { value: '  {location}-{subject}  ' } });
    fireEvent.change(locationsInput, { target: { value: '  kitchen, bathroom  ' } });

    fireEvent.click(screen.getByText('Save Lexicon'));

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledTimes(1);
    });

    const savedConfig = mockOnSave.mock.calls[0][0] as LexiconConfig;
    expect(savedConfig.pattern).toBe('{location}-{subject}');
    expect(savedConfig.commonLocations).toBe('kitchen, bathroom');
  });


  it('shows error message when save fails', async () => {
    mockOnSave.mockRejectedValue(new Error('Network error'));

    render(<SettingsModal onClose={mockOnClose} onSave={mockOnSave} />);

    fireEvent.click(screen.getByText('Save Lexicon'));

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });

    // Should NOT close modal on error
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('disables save button while saving', async () => {
    mockOnSave.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

    render(<SettingsModal onClose={mockOnClose} onSave={mockOnSave} />);

    const saveButton = screen.getByText('Save Lexicon');

    fireEvent.click(saveButton);

    // Save button should be disabled during save
    expect(saveButton).toBeDisabled();
    expect(screen.getByText('Saving...')).toBeInTheDocument();
  });

  it('shows success message after save', async () => {
    render(<SettingsModal onClose={mockOnClose} onSave={mockOnSave} />);

    fireEvent.click(screen.getByText('Save Lexicon'));

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledTimes(1);
    });

    // Should show success message
    expect(screen.getByText(/Lexicon settings saved successfully/i)).toBeInTheDocument();

    // Modal should auto-close after brief delay (1.5s)
    expect(mockOnClose).not.toHaveBeenCalled(); // Not yet

    // Wait for auto-close delay
    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    }, { timeout: 2000 });
  });

  describe('AI Configuration Tab', () => {
    beforeEach(() => {
      // Mock window.electronAPI
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
      render(<SettingsModal onClose={mockOnClose} onSave={mockOnSave} />);

      expect(screen.getByText('Lexicon')).toBeInTheDocument();
      expect(screen.getByText('AI Connection')).toBeInTheDocument();
    });

    it('should switch to AI Connection tab when clicked', () => {
      render(<SettingsModal onClose={mockOnClose} onSave={mockOnSave} />);

      const aiTab = screen.getByText('AI Connection');
      fireEvent.click(aiTab);

      // Should show AI config form elements
      expect(screen.getByText('Provider')).toBeInTheDocument();
      expect(screen.getByText('Model')).toBeInTheDocument();
      expect(screen.getByText(/API Key/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/Enter API key/i)).toBeInTheDocument();
    });

    it('should load existing AI config when switching to AI tab', async () => {
      render(<SettingsModal onClose={mockOnClose} onSave={mockOnSave} />);

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
      render(<SettingsModal onClose={mockOnClose} onSave={mockOnSave} />);

      fireEvent.click(screen.getByText('AI Connection'));

      // Wait for config to load
      await waitFor(() => {
        expect(window.electronAPI.getAIConfig).toHaveBeenCalled();
      });

      const apiKeyInput = screen.getByPlaceholderText(/Leave empty to keep existing key|Enter API key/i);
      fireEvent.change(apiKeyInput, { target: { value: 'test-api-key' } });

      const testButton = screen.getByText('Test Connection');
      fireEvent.click(testButton);

      await waitFor(() => {
        expect(screen.getByText(/Success/i)).toBeInTheDocument();
      });

      expect(window.electronAPI.testAIConnection).toHaveBeenCalledWith(
        'openrouter',
        'anthropic/claude-3.5-sonnet',
        'test-api-key'
      );
    });

    it('should show error when connection test fails', async () => {
      window.electronAPI.testAIConnection = vi.fn().mockResolvedValue({
        success: false,
        error: 'Invalid API key'
      });

      render(<SettingsModal onClose={mockOnClose} onSave={mockOnSave} />);

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
      render(<SettingsModal onClose={mockOnClose} onSave={mockOnSave} />);

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
      expect(screen.getByText(/AI configuration saved successfully/i)).toBeInTheDocument();

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

      render(<SettingsModal onClose={mockOnClose} onSave={mockOnSave} />);

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
      render(<SettingsModal onClose={mockOnClose} onSave={mockOnSave} />);

      fireEvent.click(screen.getByText('AI Connection'));

      // Wait for models to load
      await waitFor(() => {
        expect(window.electronAPI.getAIModels).toHaveBeenCalled();
      });

      // When saved key exists (hasSavedKey = true), should show "Test Saved Connection"
      const testButton = screen.getByText('Test Saved Connection');
      expect(testButton).toBeInTheDocument();
      expect(testButton).not.toBeDisabled();
    });

    it('should require API key when no saved key exists', async () => {
      // Mock scenario where NO key is saved
      window.electronAPI.isAIConfigured = vi.fn().mockResolvedValue(false);

      render(<SettingsModal onClose={mockOnClose} onSave={mockOnSave} />);

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

      render(<SettingsModal onClose={mockOnClose} onSave={mockOnSave} />);

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

      render(<SettingsModal onClose={mockOnClose} onSave={mockOnSave} />);

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

      render(<SettingsModal onClose={mockOnClose} onSave={mockOnSave} />);

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
      // Mock getAIConfig to reject
      window.electronAPI.getAIConfig = vi.fn().mockRejectedValue(new Error('Failed to load config'));

      render(<SettingsModal onClose={mockOnClose} onSave={mockOnSave} />);

      fireEvent.click(screen.getByText('AI Connection'));

      // Should display error message
      await waitFor(() => {
        expect(screen.getByText(/Failed to load AI configuration: Failed to load config/i)).toBeInTheDocument();
      });
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
      // Mock window.electronAPI with CFEx config methods
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
            defaultVideos: '/Volumes/EAV_Video_RAW/'
          }
        }),
        saveConfig: vi.fn().mockResolvedValue(true),
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
      render(<SettingsModal onClose={mockOnClose} onSave={mockOnSave} />);

      expect(screen.getByText('Lexicon')).toBeInTheDocument();
      expect(screen.getByText('AI Connection')).toBeInTheDocument();
      expect(screen.getByText('CFEx Transfer')).toBeInTheDocument();
    });

    it('should switch to CFEx Transfer tab when clicked', async () => {
      render(<SettingsModal onClose={mockOnClose} onSave={mockOnSave} />);

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
      render(<SettingsModal onClose={mockOnClose} onSave={mockOnSave} />);

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
      render(<SettingsModal onClose={mockOnClose} onSave={mockOnSave} />);

      fireEvent.click(screen.getByText('CFEx Transfer'));

      await waitFor(() => {
        expect(window.electronAPI.loadConfig).toHaveBeenCalled();
      });

      // Should have 3 Browse buttons (one for each path field)
      const browseButtons = screen.getAllByRole('button', { name: /browse/i });
      expect(browseButtons.length).toBe(3);
    });

    it('should open folder picker when Browse button clicked', async () => {
      render(<SettingsModal onClose={mockOnClose} onSave={mockOnSave} />);

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

      render(<SettingsModal onClose={mockOnClose} onSave={mockOnSave} />);

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
      render(<SettingsModal onClose={mockOnClose} onSave={mockOnSave} />);

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
      render(<SettingsModal onClose={mockOnClose} onSave={mockOnSave} />);

      fireEvent.click(screen.getByText('CFEx Transfer'));

      await waitFor(() => {
        expect(window.electronAPI.loadConfig).toHaveBeenCalled();
      });

      const saveButton = screen.getByText('Save CFEx Settings');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/CFEx settings saved successfully/i)).toBeInTheDocument();
      });
    });

    it('should show error message when save fails', async () => {
      window.electronAPI.saveConfig = vi.fn().mockResolvedValue(false);

      render(<SettingsModal onClose={mockOnClose} onSave={mockOnSave} />);

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

      render(<SettingsModal onClose={mockOnClose} onSave={mockOnSave} />);

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
      render(<SettingsModal onClose={mockOnClose} onSave={mockOnSave} />);

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
      // Mock window.electronAPI with CFEx toggle methods
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
      render(<SettingsModal onClose={mockOnClose} onSave={mockOnSave} />);

      fireEvent.click(screen.getByText('File Ingestion'));

      await waitFor(() => {
        expect(window.electronAPI.loadConfig).toHaveBeenCalled();
      });

      // Should have AI Auto-Analyze checkbox
      expect(screen.getByLabelText(/AI Auto-Analyze after transfer/i)).toBeInTheDocument();
    });

    it('should render Metadata Write toggle checkbox', async () => {
      render(<SettingsModal onClose={mockOnClose} onSave={mockOnSave} />);

      fireEvent.click(screen.getByText('File Ingestion'));

      await waitFor(() => {
        expect(window.electronAPI.loadConfig).toHaveBeenCalled();
      });

      // Should have Metadata Write checkbox
      expect(screen.getByLabelText(/Write metadata to files/i)).toBeInTheDocument();
    });

    it('should render Filename Rewrite toggle checkbox', async () => {
      render(<SettingsModal onClose={mockOnClose} onSave={mockOnSave} />);

      fireEvent.click(screen.getByText('File Ingestion'));

      await waitFor(() => {
        expect(window.electronAPI.loadConfig).toHaveBeenCalled();
      });

      // Should have Filename Rewrite checkbox
      expect(screen.getByLabelText(/Rename files using template/i)).toBeInTheDocument();
    });

    it('should show filename template input only when filenameRewrite is enabled', async () => {
      render(<SettingsModal onClose={mockOnClose} onSave={mockOnSave} />);

      fireEvent.click(screen.getByText('File Ingestion'));

      await waitFor(() => {
        expect(window.electronAPI.loadConfig).toHaveBeenCalled();
      });

      // Filename template input should NOT be visible initially (filenameRewrite=false)
      expect(screen.queryByPlaceholderText(/\{location\}-\{subject\}-\{action\}-\{shotType\}/)).not.toBeInTheDocument();

      // Enable filename rewrite toggle
      const filenameRewriteCheckbox = screen.getByLabelText(/Rename files using template/i);
      fireEvent.click(filenameRewriteCheckbox);

      // Now filename template input should be visible
      await waitFor(() => {
        expect(screen.getByPlaceholderText(/\{location\}-\{subject\}-\{action\}-\{shotType\}/)).toBeInTheDocument();
      });
    });

    it('should load toggle state from config (all OFF by default per I7)', async () => {
      render(<SettingsModal onClose={mockOnClose} onSave={mockOnSave} />);

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
      render(<SettingsModal onClose={mockOnClose} onSave={mockOnSave} />);

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
      render(<SettingsModal onClose={mockOnClose} onSave={mockOnSave} />);

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
      render(<SettingsModal onClose={mockOnClose} onSave={mockOnSave} />);

      fireEvent.click(screen.getByText('File Ingestion'));

      await waitFor(() => {
        expect(window.electronAPI.loadConfig).toHaveBeenCalled();
      });

      // Enable filename rewrite
      const filenameRewriteCheckbox = screen.getByLabelText(/Rename files using template/i);
      fireEvent.click(filenameRewriteCheckbox);

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
              filenameRewrite: true,
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
          filenameRewrite: true,
          filenameTemplate: '{location}-{subject}-{shotType}'
        }
      });

      render(<SettingsModal onClose={mockOnClose} onSave={mockOnSave} />);

      fireEvent.click(screen.getByText('File Ingestion'));

      await waitFor(() => {
        expect(window.electronAPI.loadConfig).toHaveBeenCalled();
      });

      // All toggles should be checked
      const aiAutoAnalyzeCheckbox = screen.getByLabelText(/AI Auto-Analyze after transfer/i) as HTMLInputElement;
      const metadataWriteCheckbox = screen.getByLabelText(/Write metadata to files/i) as HTMLInputElement;
      const filenameRewriteCheckbox = screen.getByLabelText(/Rename files using template/i) as HTMLInputElement;

      await waitFor(() => {
        expect(aiAutoAnalyzeCheckbox.checked).toBe(true);
        expect(metadataWriteCheckbox.checked).toBe(true);
        expect(filenameRewriteCheckbox.checked).toBe(true);
      });

      // Filename template input should be visible
      expect(screen.getByDisplayValue('{location}-{subject}-{shotType}')).toBeInTheDocument();
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
      // Mock window.electronAPI with CFEx toggle methods
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
      render(<SettingsModal onClose={mockOnClose} onSave={mockOnSave} />);

      expect(screen.getByText('Lexicon')).toBeInTheDocument();
      expect(screen.getByText('AI Connection')).toBeInTheDocument();
      expect(screen.getByText('CFEx Transfer')).toBeInTheDocument();
      expect(screen.getByText('File Ingestion')).toBeInTheDocument();
    });

    it('should show power feature toggles when File Ingestion tab is clicked', async () => {
      render(<SettingsModal onClose={mockOnClose} onSave={mockOnSave} />);

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
      render(<SettingsModal onClose={mockOnClose} onSave={mockOnSave} />);

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
      render(<SettingsModal onClose={mockOnClose} onSave={mockOnSave} />);

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
});
