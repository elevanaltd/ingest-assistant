import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AITab } from './AITab';

const defaultProps = {
  aiProvider: 'openrouter' as const,
  setAiProvider: vi.fn(),
  aiModel: 'gpt-4',
  setAiModel: vi.fn(),
  aiApiKey: '',
  setAiApiKey: vi.fn(),
  hasSavedKey: false,
  testStatus: 'idle' as const,
  availableModels: [
    { id: 'gpt-4', name: 'GPT-4' },
    { id: 'claude-3', name: 'Claude 3' }
  ],
  loadingModels: false,
  onTestConnection: vi.fn(),
  onTestSavedConnection: vi.fn(),
  onSave: vi.fn(),
  onClose: vi.fn(),
  isSaving: false,
  saveSuccess: false,
  error: ''
};

describe('AITab', () => {
  it('renders provider select with value', () => {
    render(<AITab {...defaultProps} />);
    const select = screen.getByLabelText(/provider/i);
    expect(select).toHaveValue('openrouter');
  });

  it('renders model input with value', () => {
    render(<AITab {...defaultProps} />);
    const input = screen.getByLabelText(/model/i);
    expect(input).toHaveValue('gpt-4');
  });

  it('renders API key input', () => {
    render(<AITab {...defaultProps} />);
    const input = screen.getByLabelText(/api key/i);
    expect(input).toBeInTheDocument();
  });

  it('shows saved key indicator when hasSavedKey is true', () => {
    render(<AITab {...defaultProps} hasSavedKey={true} />);
    expect(screen.getByText(/saved in keychain/i)).toBeInTheDocument();
  });

  it('shows test saved connection button when key is saved', () => {
    render(<AITab {...defaultProps} hasSavedKey={true} />);
    expect(screen.getByText('Test Saved Connection')).toBeInTheDocument();
  });

  it('renders save and close buttons', () => {
    render(<AITab {...defaultProps} />);
    expect(screen.getByText('Save AI Config')).toBeInTheDocument();
    expect(screen.getByText('Close')).toBeInTheDocument();
  });

  it('shows saving state when isSaving is true', () => {
    render(<AITab {...defaultProps} isSaving={true} />);
    expect(screen.getByText('Saving...')).toBeInTheDocument();
  });

  it('shows success message when saveSuccess is true', () => {
    render(<AITab {...defaultProps} saveSuccess={true} />);
    expect(screen.getByText(/saved successfully/i)).toBeInTheDocument();
  });

  it('shows error message when error is provided', () => {
    render(<AITab {...defaultProps} error="Test error" />);
    expect(screen.getByText('Test error')).toBeInTheDocument();
  });

  it('shows loading state when loadingModels is true', () => {
    render(<AITab {...defaultProps} loadingModels={true} />);
    const input = screen.getByLabelText(/model/i);
    expect(input).toBeDisabled();
  });
});
