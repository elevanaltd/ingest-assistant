import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

// Mock the electron API
const mockElectronAPI = {
  selectFolder: vi.fn(),
  loadFiles: vi.fn(),
  renameFile: vi.fn(),
  updateMetadata: vi.fn(),
  isAIConfigured: vi.fn(),
  analyzeFile: vi.fn(),
  batchProcess: vi.fn(),
  loadConfig: vi.fn(),
  saveConfig: vi.fn(),
  getLexicon: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
  // Extend window with electronAPI for testing
  Object.defineProperty(window, 'electronAPI', {
    value: mockElectronAPI,
    writable: true,
    configurable: true,
  });
  mockElectronAPI.isAIConfigured.mockResolvedValue(false);
});

describe('App', () => {
  it('should render the app header', () => {
    render(<App />);
    expect(screen.getByText('Ingest Assistant')).toBeInTheDocument();
  });

  it('should render folder selection button', () => {
    render(<App />);
    expect(screen.getByText('Select Folder')).toBeInTheDocument();
  });

  it('should show empty state when no folder selected', () => {
    render(<App />);
    expect(screen.getByText(/Select a folder to get started/i)).toBeInTheDocument();
  });
});
