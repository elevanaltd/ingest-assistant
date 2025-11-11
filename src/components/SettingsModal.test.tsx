import { describe, it, expect, vi, beforeEach } from 'vitest';
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

    // Modal should NOT auto-close
    expect(mockOnClose).not.toHaveBeenCalled();
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

      // Modal should NOT auto-close
      expect(mockOnClose).not.toHaveBeenCalled();
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
});
