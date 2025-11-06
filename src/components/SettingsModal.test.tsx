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

  it('renders empty table with one row by default', () => {
    render(<SettingsModal onClose={mockOnClose} onSave={mockOnSave} />);

    const preferredInputs = screen.getAllByPlaceholderText(/bin/i);
    expect(preferredInputs).toHaveLength(1);

    const excludedInputs = screen.getAllByPlaceholderText(/trash, garbage/i);
    expect(excludedInputs).toHaveLength(1);
  });

  it('loads initial config data', () => {
    const initialConfig: LexiconConfig = {
      termMappings: [
        { preferred: 'bin', excluded: 'trash, garbage' },
        { preferred: 'tap', excluded: 'faucet' },
      ],
      alwaysInclude: ['manufacturer', 'model'],
      customInstructions: 'Always include manufacturer',
    };

    render(
      <SettingsModal
        onClose={mockOnClose}
        onSave={mockOnSave}
        initialConfig={initialConfig}
      />
    );

    expect(screen.getByDisplayValue('bin')).toBeInTheDocument();
    expect(screen.getByDisplayValue('trash, garbage')).toBeInTheDocument();
    expect(screen.getByDisplayValue('tap')).toBeInTheDocument();
    expect(screen.getByDisplayValue('faucet')).toBeInTheDocument();
    expect(screen.getByDisplayValue('manufacturer, model')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Always include manufacturer')).toBeInTheDocument();
  });

  it('adds new empty row when user types in last row', () => {
    render(<SettingsModal onClose={mockOnClose} onSave={mockOnSave} />);

    const preferredInputs = screen.getAllByPlaceholderText(/bin/i);
    expect(preferredInputs).toHaveLength(1);

    // Type in the first (and only) row
    fireEvent.change(preferredInputs[0], { target: { value: 'bin' } });

    // Should now have 2 rows (original + new empty)
    const updatedInputs = screen.getAllByPlaceholderText(/bin/i);
    expect(updatedInputs).toHaveLength(2);
  });

  it('removes row when delete button clicked', () => {
    const initialConfig: LexiconConfig = {
      termMappings: [
        { preferred: 'bin', excluded: 'trash' },
        { preferred: 'tap', excluded: 'faucet' },
      ],
      alwaysInclude: [],
      customInstructions: '',
    };

    render(
      <SettingsModal
        onClose={mockOnClose}
        onSave={mockOnSave}
        initialConfig={initialConfig}
      />
    );

    // Should have 2 delete buttons (not on empty row)
    const deleteButtons = screen.getAllByTitle('Remove row');
    expect(deleteButtons.length).toBeGreaterThan(0);

    // Click first delete button
    fireEvent.click(deleteButtons[0]);

    // 'bin' should be gone
    expect(screen.queryByDisplayValue('bin')).not.toBeInTheDocument();
    expect(screen.getByDisplayValue('tap')).toBeInTheDocument();
  });

  it('calls onClose when cancel button clicked', () => {
    render(<SettingsModal onClose={mockOnClose} onSave={mockOnSave} />);

    fireEvent.click(screen.getByText('Cancel'));
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when X button clicked', () => {
    render(<SettingsModal onClose={mockOnClose} onSave={mockOnSave} />);

    fireEvent.click(screen.getByTitle('Close'));
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when overlay clicked', () => {
    render(<SettingsModal onClose={mockOnClose} onSave={mockOnSave} />);

    const overlay = screen.getByText('Settings').closest('.modal-overlay');
    expect(overlay).toBeInTheDocument();

    fireEvent.click(overlay!);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('does not close when modal content clicked', () => {
    render(<SettingsModal onClose={mockOnClose} onSave={mockOnSave} />);

    const modal = screen.getByText('Settings').closest('.modal');
    expect(modal).toBeInTheDocument();

    fireEvent.click(modal!);
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('saves lexicon config when save button clicked', async () => {
    const initialConfig: LexiconConfig = {
      termMappings: [
        { preferred: 'bin', excluded: 'trash, garbage' },
      ],
      alwaysInclude: ['manufacturer'],
      customInstructions: 'Include model numbers',
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
    expect(savedConfig.termMappings).toHaveLength(1);
    expect(savedConfig.termMappings[0]).toEqual({ preferred: 'bin', excluded: 'trash, garbage' });
    expect(savedConfig.alwaysInclude).toEqual(['manufacturer']);
    expect(savedConfig.customInstructions).toBe('Include model numbers');
  });

  it('filters out empty rows when saving', async () => {
    render(<SettingsModal onClose={mockOnClose} onSave={mockOnSave} />);

    // Default has one empty row
    fireEvent.click(screen.getByText('Save Lexicon'));

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledTimes(1);
    });

    const savedConfig = mockOnSave.mock.calls[0][0] as LexiconConfig;
    expect(savedConfig.termMappings).toHaveLength(0);
  });

  it('parses comma-separated alwaysInclude terms', async () => {
    render(<SettingsModal onClose={mockOnClose} onSave={mockOnSave} />);

    const alwaysIncludeInput = screen.getByPlaceholderText(/manufacturer, model/i);
    fireEvent.change(alwaysIncludeInput, {
      target: { value: 'manufacturer, model, brand, category' }
    });

    fireEvent.click(screen.getByText('Save Lexicon'));

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledTimes(1);
    });

    const savedConfig = mockOnSave.mock.calls[0][0] as LexiconConfig;
    expect(savedConfig.alwaysInclude).toEqual(['manufacturer', 'model', 'brand', 'category']);
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

  it('disables buttons while saving', async () => {
    mockOnSave.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

    render(<SettingsModal onClose={mockOnClose} onSave={mockOnSave} />);

    const saveButton = screen.getByText('Save Lexicon');
    const cancelButton = screen.getByText('Cancel');

    fireEvent.click(saveButton);

    // Buttons should be disabled during save
    expect(saveButton).toBeDisabled();
    expect(cancelButton).toBeDisabled();
    expect(screen.getByText('Saving...')).toBeInTheDocument();
  });

  it('closes modal after successful save', async () => {
    render(<SettingsModal onClose={mockOnClose} onSave={mockOnSave} />);

    fireEvent.click(screen.getByText('Save Lexicon'));

    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
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
        updateAIConfig: vi.fn().mockResolvedValue({ success: true }),
        testAIConnection: vi.fn().mockResolvedValue({ success: true }),
      } as any;
    });

    it('should render tabs for Lexicon and AI Configuration', () => {
      render(<SettingsModal onClose={mockOnClose} onSave={mockOnSave} />);

      expect(screen.getByText('Lexicon')).toBeInTheDocument();
      expect(screen.getByText('AI Configuration')).toBeInTheDocument();
    });

    it('should switch to AI Configuration tab when clicked', () => {
      render(<SettingsModal onClose={mockOnClose} onSave={mockOnSave} />);

      const aiTab = screen.getByText('AI Configuration');
      fireEvent.click(aiTab);

      // Should show AI config form elements
      expect(screen.getByLabelText(/AI Provider/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Model/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/API Key/i)).toBeInTheDocument();
    });

    it('should load existing AI config when switching to AI tab', async () => {
      render(<SettingsModal onClose={mockOnClose} onSave={mockOnSave} />);

      const aiTab = screen.getByText('AI Configuration');
      fireEvent.click(aiTab);

      await waitFor(() => {
        expect(window.electronAPI.getAIConfig).toHaveBeenCalled();
      });

      // Should populate form with loaded config
      expect(screen.getByDisplayValue('anthropic/claude-3.5-sonnet')).toBeInTheDocument();
    });

    it('should test connection successfully', async () => {
      render(<SettingsModal onClose={mockOnClose} onSave={mockOnSave} />);

      fireEvent.click(screen.getByText('AI Configuration'));

      // Wait for config to load
      await waitFor(() => {
        expect(window.electronAPI.getAIConfig).toHaveBeenCalled();
      });

      const apiKeyInput = screen.getByLabelText(/API Key/i);
      fireEvent.change(apiKeyInput, { target: { value: 'test-api-key' } });

      const testButton = screen.getByText('Test Connection');
      fireEvent.click(testButton);

      await waitFor(() => {
        expect(screen.getByText(/Connection successful/i)).toBeInTheDocument();
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

      fireEvent.click(screen.getByText('AI Configuration'));

      const apiKeyInput = screen.getByLabelText(/API Key/i);
      fireEvent.change(apiKeyInput, { target: { value: 'bad-key' } });

      const testButton = screen.getByText('Test Connection');
      fireEvent.click(testButton);

      await waitFor(() => {
        expect(screen.getByText(/Invalid API key/i)).toBeInTheDocument();
      });
    });

    it('should save AI configuration successfully', async () => {
      render(<SettingsModal onClose={mockOnClose} onSave={mockOnSave} />);

      fireEvent.click(screen.getByText('AI Configuration'));

      const providerSelect = screen.getByLabelText(/AI Provider/i);
      const modelInput = screen.getByLabelText(/Model/i);
      const apiKeyInput = screen.getByLabelText(/API Key/i);

      fireEvent.change(providerSelect, { target: { value: 'openai' } });
      fireEvent.change(modelInput, { target: { value: 'gpt-4-vision-preview' } });
      fireEvent.change(apiKeyInput, { target: { value: 'sk-test-key' } });

      const saveButton = screen.getByText('Save Configuration');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(window.electronAPI.updateAIConfig).toHaveBeenCalledWith({
          provider: 'openai',
          model: 'gpt-4-vision-preview',
          apiKey: 'sk-test-key'
        });
      });

      // Modal should close after successful save
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should show error when save fails', async () => {
      window.electronAPI.updateAIConfig = vi.fn().mockResolvedValue({
        success: false,
        error: 'Failed to save configuration'
      });

      render(<SettingsModal onClose={mockOnClose} onSave={mockOnSave} />);

      fireEvent.click(screen.getByText('AI Configuration'));

      // Wait for config to load
      await waitFor(() => {
        expect(window.electronAPI.getAIConfig).toHaveBeenCalled();
      });

      const apiKeyInput = screen.getByLabelText(/API Key/i);
      fireEvent.change(apiKeyInput, { target: { value: 'test-key' } });

      const saveButton = screen.getByText('Save Configuration');
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

    it('should require API key before testing connection', () => {
      render(<SettingsModal onClose={mockOnClose} onSave={mockOnSave} />);

      fireEvent.click(screen.getByText('AI Configuration'));

      const testButton = screen.getByText('Test Connection');
      expect(testButton).toBeDisabled();
    });

    it('should require API key before saving', () => {
      render(<SettingsModal onClose={mockOnClose} onSave={mockOnSave} />);

      fireEvent.click(screen.getByText('AI Configuration'));

      const saveButton = screen.getByText('Save Configuration');
      expect(saveButton).toBeDisabled();
    });

    it('should update help text based on provider selection', () => {
      render(<SettingsModal onClose={mockOnClose} onSave={mockOnSave} />);

      fireEvent.click(screen.getByText('AI Configuration'));

      const providerSelect = screen.getByLabelText(/AI Provider/i);

      // OpenRouter help text
      expect(screen.getByText(/openrouter\.ai\/keys/i)).toBeInTheDocument();

      // Switch to OpenAI
      fireEvent.change(providerSelect, { target: { value: 'openai' } });
      expect(screen.getByText(/platform\.openai\.com\/api-keys/i)).toBeInTheDocument();

      // Switch to Anthropic
      fireEvent.change(providerSelect, { target: { value: 'anthropic' } });
      expect(screen.getByText(/console\.anthropic\.com/i)).toBeInTheDocument();
    });

    it('should disable buttons while testing connection', async () => {
      window.electronAPI.testAIConnection = vi.fn().mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ success: true }), 100))
      );

      render(<SettingsModal onClose={mockOnClose} onSave={mockOnSave} />);

      fireEvent.click(screen.getByText('AI Configuration'));

      const apiKeyInput = screen.getByLabelText(/API Key/i);
      fireEvent.change(apiKeyInput, { target: { value: 'test-key' } });

      const testButton = screen.getByText('Test Connection');
      fireEvent.click(testButton);

      expect(screen.getByText('Testing...')).toBeInTheDocument();
      expect(testButton).toBeDisabled();
    });

    it('should disable buttons while saving', async () => {
      window.electronAPI.updateAIConfig = vi.fn().mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ success: true }), 100))
      );

      render(<SettingsModal onClose={mockOnClose} onSave={mockOnSave} />);

      fireEvent.click(screen.getByText('AI Configuration'));

      const apiKeyInput = screen.getByLabelText(/API Key/i);
      fireEvent.change(apiKeyInput, { target: { value: 'test-key' } });

      const saveButton = screen.getByText('Save Configuration');
      fireEvent.click(saveButton);

      expect(screen.getByText('Saving...')).toBeInTheDocument();
      expect(saveButton).toBeDisabled();
    });
  });
});
