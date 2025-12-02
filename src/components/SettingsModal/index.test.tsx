import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../../test/test-utils';
import { SettingsModal } from './index';

// Shared mock for getShotTypes (required by MetadataFormContext)
const mockGetShotTypes = vi.fn().mockResolvedValue(['WS', 'MID', 'CU', 'UNDER', 'FP', 'TRACK', 'ESTAB']);

/**
 * Modal Shell Tests (index.tsx)
 *
 * RED Phase: Test for modal shell component with tab navigation
 * Verifies: Modal overlay, header, tab buttons, close button, Escape key handling
 */
describe('SettingsModal Shell (index.tsx)', () => {
  const mockOnClose = vi.fn();
  const mockOnSave = vi.fn();

  beforeEach(() => {
    mockOnClose.mockClear();
    mockOnSave.mockClear();
    mockOnSave.mockResolvedValue(undefined);

    // Minimal electronAPI mocks for context provider
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

  it('renders modal shell with title', () => {
    renderWithProviders(<SettingsModal onClose={mockOnClose} onSave={mockOnSave} />);
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('renders all four tab buttons', () => {
    renderWithProviders(<SettingsModal onClose={mockOnClose} onSave={mockOnSave} />);

    expect(screen.getByText('Lexicon')).toBeInTheDocument();
    expect(screen.getByText('AI Connection')).toBeInTheDocument();
    expect(screen.getByText('CFEx Transfer')).toBeInTheDocument();
    expect(screen.getByText('File Ingestion')).toBeInTheDocument();
  });

  it('renders close button (X)', () => {
    renderWithProviders(<SettingsModal onClose={mockOnClose} onSave={mockOnSave} />);

    const closeButton = screen.getByLabelText('Close settings');
    expect(closeButton).toBeInTheDocument();
    expect(closeButton.textContent).toBe('×');
  });

  it('calls onClose when close button clicked', () => {
    renderWithProviders(<SettingsModal onClose={mockOnClose} onSave={mockOnSave} />);

    const closeButton = screen.getByLabelText('Close settings');
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when Escape key pressed', () => {
    renderWithProviders(<SettingsModal onClose={mockOnClose} onSave={mockOnSave} />);

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('switches to Lexicon tab when Lexicon button clicked', () => {
    renderWithProviders(<SettingsModal onClose={mockOnClose} onSave={mockOnSave} />);

    const lexiconButton = screen.getByText('Lexicon');

    // Lexicon tab should be active by default (verify bold font weight)
    expect(lexiconButton).toHaveStyle({ fontWeight: 'bold' });
  });

  it('switches to AI Connection tab when AI Connection button clicked', async () => {
    renderWithProviders(<SettingsModal onClose={mockOnClose} onSave={mockOnSave} />);

    const aiButton = screen.getByText('AI Connection');
    fireEvent.click(aiButton);

    // AI tab should now be active (verify bold font weight)
    await waitFor(() => {
      expect(aiButton).toHaveStyle({ fontWeight: 'bold' });
    });

    // Lexicon tab should no longer be bold
    const lexiconButton = screen.getByText('Lexicon');
    expect(lexiconButton).toHaveStyle({ fontWeight: 'normal' });
  });

  it('switches to CFEx Transfer tab when CFEx Transfer button clicked', async () => {
    renderWithProviders(<SettingsModal onClose={mockOnClose} onSave={mockOnSave} />);

    const cfexButton = screen.getByText('CFEx Transfer');
    fireEvent.click(cfexButton);

    // CFEx tab should now be active
    await waitFor(() => {
      expect(cfexButton).toHaveStyle({ fontWeight: 'bold' });
    });
  });

  it('switches to File Ingestion tab when File Ingestion button clicked', async () => {
    renderWithProviders(<SettingsModal onClose={mockOnClose} onSave={mockOnSave} />);

    const ingestionButton = screen.getByText('File Ingestion');
    fireEvent.click(ingestionButton);

    // Ingestion tab should now be active
    await waitFor(() => {
      expect(ingestionButton).toHaveStyle({ fontWeight: 'bold' });
    });
  });

  it('has modal backdrop with semi-transparent black background', () => {
    renderWithProviders(<SettingsModal onClose={mockOnClose} onSave={mockOnSave} />);

    const backdrop = screen.getByText('Settings').closest('.modal-backdrop');
    expect(backdrop).toHaveStyle({ backgroundColor: 'rgba(0, 0, 0, 0.5)' });
  });

  it('does not close when backdrop clicked', () => {
    renderWithProviders(<SettingsModal onClose={mockOnClose} onSave={mockOnSave} />);

    const backdrop = screen.getByText('Settings').closest('.modal-backdrop');
    expect(backdrop).toBeTruthy();

    fireEvent.click(backdrop!);

    // Modal should NOT close when clicking outside
    expect(mockOnClose).not.toHaveBeenCalled();
  });
});
