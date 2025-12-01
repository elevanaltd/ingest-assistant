import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { IngestionTab } from './IngestionTab';

// Mock PROXY_PRESETS
vi.mock('../../../electron/services/proxyPresets', () => ({
  PROXY_PRESETS: [
    { id: '1080p-h264', name: '1080p H.264', description: 'Standard 1080p' },
    { id: '2k-prores-proxy', name: '2K ProRes Proxy', description: 'Professional 2K' }
  ]
}));

const defaultProps = {
  aiAutoAnalyze: false,
  setAiAutoAnalyze: vi.fn(),
  metadataWrite: false,
  setMetadataWrite: vi.fn(),
  filenameRewrite: false,
  onFilenameRewriteChange: vi.fn(),
  filenameTemplate: '{location}-{subject}-{action}-{shotType}',
  setFilenameTemplate: vi.fn(),
  proxyPresetId: '2k-prores-proxy',
  setProxyPresetId: vi.fn(),
  onSave: vi.fn(),
  onClose: vi.fn(),
  isSaving: false,
  saveSuccess: false,
  error: ''
};

describe('IngestionTab', () => {
  it('renders power features section', () => {
    render(<IngestionTab {...defaultProps} />);
    expect(screen.getByText(/power features/i)).toBeInTheDocument();
  });

  it('renders AI auto-analyze checkbox', () => {
    render(<IngestionTab {...defaultProps} />);
    expect(screen.getByText(/ai auto-analyze after transfer/i)).toBeInTheDocument();
  });

  it('renders metadata write checkbox', () => {
    render(<IngestionTab {...defaultProps} />);
    expect(screen.getByText(/write metadata to files/i)).toBeInTheDocument();
  });

  it('renders filename rewrite checkbox', () => {
    render(<IngestionTab {...defaultProps} />);
    expect(screen.getByText(/rename files using template/i)).toBeInTheDocument();
  });

  it('renders proxy format select', () => {
    render(<IngestionTab {...defaultProps} />);
    expect(screen.getByLabelText(/proxy format/i)).toBeInTheDocument();
  });

  it('shows filename template input when filenameRewrite is true', () => {
    render(<IngestionTab {...defaultProps} filenameRewrite={true} />);
    expect(screen.getByLabelText(/filename template/i)).toBeInTheDocument();
  });

  it('hides filename template input when filenameRewrite is false', () => {
    render(<IngestionTab {...defaultProps} filenameRewrite={false} />);
    expect(screen.queryByLabelText(/filename template/i)).not.toBeInTheDocument();
  });

  it('renders save and close buttons', () => {
    render(<IngestionTab {...defaultProps} />);
    expect(screen.getByText('Save Ingestion Settings')).toBeInTheDocument();
    expect(screen.getByText('Close')).toBeInTheDocument();
  });

  it('shows saving state when isSaving is true', () => {
    render(<IngestionTab {...defaultProps} isSaving={true} />);
    expect(screen.getByText('Saving...')).toBeInTheDocument();
  });

  it('shows success message when saveSuccess is true', () => {
    render(<IngestionTab {...defaultProps} saveSuccess={true} />);
    expect(screen.getByText(/saved successfully/i)).toBeInTheDocument();
  });

  it('shows error message when error is provided', () => {
    render(<IngestionTab {...defaultProps} error="Test error" />);
    expect(screen.getByText('Test error')).toBeInTheDocument();
  });
});
