import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CfexTab } from './CfexTab';

const defaultProps = {
  cfexSource: '/Volumes/Untitled/DCIM/100_FUJI',
  setCfexSource: vi.fn(),
  cfexPhotos: '/Volumes/videos-current/2. WORKING PROJECTS/',
  setCfexPhotos: vi.fn(),
  cfexVideos: '/Volumes/EAV_Video_RAW/',
  setCfexVideos: vi.fn(),
  onBrowse: vi.fn(),
  onSave: vi.fn(),
  onClose: vi.fn(),
  isSaving: false,
  saveSuccess: false,
  error: ''
};

describe('CfexTab', () => {
  it('renders source folder input with value', () => {
    render(<CfexTab {...defaultProps} />);
    const input = screen.getByLabelText(/default source folder/i);
    expect(input).toHaveValue('/Volumes/Untitled/DCIM/100_FUJI');
  });

  it('renders photos destination input with value', () => {
    render(<CfexTab {...defaultProps} />);
    const input = screen.getByLabelText(/default photos destination/i);
    expect(input).toHaveValue('/Volumes/videos-current/2. WORKING PROJECTS/');
  });

  it('renders videos destination input with value', () => {
    render(<CfexTab {...defaultProps} />);
    const input = screen.getByLabelText(/default raw videos destination/i);
    expect(input).toHaveValue('/Volumes/EAV_Video_RAW/');
  });

  it('renders browse buttons for each path', () => {
    render(<CfexTab {...defaultProps} />);
    const browseButtons = screen.getAllByText('Browse');
    expect(browseButtons).toHaveLength(3);
  });

  it('renders save and close buttons', () => {
    render(<CfexTab {...defaultProps} />);
    expect(screen.getByText('Save CFEx Settings')).toBeInTheDocument();
    expect(screen.getByText('Close')).toBeInTheDocument();
  });

  it('shows saving state when isSaving is true', () => {
    render(<CfexTab {...defaultProps} isSaving={true} />);
    expect(screen.getByText('Saving...')).toBeInTheDocument();
  });

  it('shows success message when saveSuccess is true', () => {
    render(<CfexTab {...defaultProps} saveSuccess={true} />);
    expect(screen.getByText(/saved successfully/i)).toBeInTheDocument();
  });

  it('shows error message when error is provided', () => {
    render(<CfexTab {...defaultProps} error="Test error" />);
    expect(screen.getByText('Test error')).toBeInTheDocument();
  });
});
