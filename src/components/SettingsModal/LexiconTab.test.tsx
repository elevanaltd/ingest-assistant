import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LexiconTab } from './LexiconTab';

const defaultProps = {
  pattern: '{location}-{subject}-{shotType}',
  setPattern: vi.fn(),
  commonLocations: 'kitchen, bath',
  setCommonLocations: vi.fn(),
  commonSubjects: 'oven, sink',
  setCommonSubjects: vi.fn(),
  commonActions: 'cleaning, installing',
  setCommonActions: vi.fn(),
  wordPreferences: 'faucet → tap',
  setWordPreferences: vi.fn(),
  aiInstructions: 'Use lowercase',
  setAiInstructions: vi.fn(),
  goodExamples: 'kitchen-oven-CU',
  setGoodExamples: vi.fn(),
  badExamples: 'Kitchen-Oven-CU (mixed case)',
  setBadExamples: vi.fn(),
  onSave: vi.fn(),
  onClose: vi.fn(),
  isSaving: false,
  saveSuccess: false,
  error: ''
};

describe('LexiconTab', () => {
  it('renders pattern input with value', () => {
    render(<LexiconTab {...defaultProps} />);
    const input = screen.getByLabelText(/pattern/i);
    expect(input).toHaveValue('{location}-{subject}-{shotType}');
  });

  it('renders common locations input with value', () => {
    render(<LexiconTab {...defaultProps} />);
    const input = screen.getByLabelText(/common locations/i);
    expect(input).toHaveValue('kitchen, bath');
  });

  it('renders save and cancel buttons', () => {
    render(<LexiconTab {...defaultProps} />);
    expect(screen.getByText('Save Lexicon')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('shows saving state when isSaving is true', () => {
    render(<LexiconTab {...defaultProps} isSaving={true} />);
    expect(screen.getByText('Saving...')).toBeInTheDocument();
  });

  it('shows success message when saveSuccess is true', () => {
    render(<LexiconTab {...defaultProps} saveSuccess={true} />);
    expect(screen.getByText(/saved successfully/i)).toBeInTheDocument();
  });

  it('shows error message when error is provided', () => {
    render(<LexiconTab {...defaultProps} error="Test error" />);
    expect(screen.getByText('Test error')).toBeInTheDocument();
  });
});
