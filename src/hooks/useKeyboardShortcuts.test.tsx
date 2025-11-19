import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';
import type { FileMetadata } from '../types';

// Mock the electron API
const mockElectronAPI = {
  selectFolder: vi.fn(),
  loadFiles: vi.fn(),
  renameFile: vi.fn(),
  updateMetadata: vi.fn(),
  updateStructuredMetadata: vi.fn(),
  isAIConfigured: vi.fn(),
  analyzeFile: vi.fn(),
  batchProcess: vi.fn(),
  loadConfig: vi.fn(),
  saveConfig: vi.fn(),
  getLexicon: vi.fn(),
  getShotTypes: vi.fn(),
  readFileAsDataUrl: vi.fn(),
  lexicon: {
    load: vi.fn(),
    save: vi.fn(),
  },
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
};

const createMockFile = (overrides: Partial<FileMetadata> = {}): FileMetadata => ({
  id: '12345678',
  originalFilename: 'IMG_12345678.mp4',
  currentFilename: 'IMG_12345678.mp4',
  filePath: '/test/path/IMG_12345678.mp4',
  extension: '.mp4',
  shotName: '',
  keywords: [],
  processedByAI: false,
  fileType: 'video',
  location: 'kitchen',
  subject: 'oven',
  action: 'cleaning',
  shotType: 'WS',
  lockedFields: [],
  createdAt: new Date(),
  createdBy: 'ingest-assistant',
  modifiedAt: new Date(),
  modifiedBy: 'ingest-assistant',
  version: '1.1.0',
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperty(window, 'electronAPI', {
    value: mockElectronAPI,
    writable: true,
    configurable: true,
  });
  mockElectronAPI.isAIConfigured.mockResolvedValue(true);
  mockElectronAPI.getShotTypes.mockResolvedValue(['WS', 'MID', 'CU', 'UNDER', 'FP', 'TRACK', 'ESTAB']);
  mockElectronAPI.readFileAsDataUrl.mockResolvedValue('data:image/png;base64,fake');
  mockElectronAPI.updateMetadata.mockResolvedValue(undefined);
  mockElectronAPI.updateStructuredMetadata.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.clearAllTimers();
});

describe('Keyboard Shortcuts', () => {
  describe('Cmd+S - Save shortcut', () => {
    it('should trigger save when Cmd+S is pressed with valid data', async () => {
      const file = createMockFile();
      mockElectronAPI.loadFiles.mockResolvedValue([file]);
      mockElectronAPI.selectFolder.mockResolvedValue('/test/folder');

      render(<App />);

      // Load files
      const selectButton = screen.getByRole('button', { name: /select folder/i });
      await userEvent.click(selectButton);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/kitchen/i)).toBeInTheDocument();
      });

      // Press Cmd+S
      await userEvent.keyboard('{Meta>}s{/Meta}');

      // Verify save was called
      await waitFor(() => {
        expect(mockElectronAPI.updateStructuredMetadata).toHaveBeenCalled();
      });
    });

    it('should not save when fields are invalid', async () => {
      const file = createMockFile({ location: '', subject: '', shotType: undefined });
      mockElectronAPI.loadFiles.mockResolvedValue([file]);
      mockElectronAPI.selectFolder.mockResolvedValue('/test/folder');

      render(<App />);

      const selectButton = screen.getByRole('button', { name: /select folder/i });
      await userEvent.click(selectButton);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/kitchen/i)).toBeInTheDocument();
      });

      // Press Cmd+S
      await userEvent.keyboard('{Meta>}s{/Meta}');

      // Verify save was NOT called (invalid data)
      await waitFor(() => {
        expect(mockElectronAPI.updateStructuredMetadata).not.toHaveBeenCalled();
      });
    });

    it('should not trigger save when typing in input field', async () => {
      const file = createMockFile();
      mockElectronAPI.loadFiles.mockResolvedValue([file]);
      mockElectronAPI.selectFolder.mockResolvedValue('/test/folder');

      render(<App />);

      const selectButton = screen.getByRole('button', { name: /select folder/i });
      await userEvent.click(selectButton);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/kitchen/i)).toBeInTheDocument();
      });

      // Focus on input field
      const locationInput = screen.getByPlaceholderText(/kitchen/i);
      await userEvent.click(locationInput);

      // Press Cmd+S while focused on input (should not trigger save)
      await userEvent.keyboard('{Meta>}s{/Meta}');

      // Brief wait to ensure no save is triggered
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(mockElectronAPI.updateStructuredMetadata).not.toHaveBeenCalled();
    });
  });

  describe('Cmd+I - AI Assist shortcut', () => {
    it('should trigger AI assist when Cmd+I is pressed', async () => {
      const file = createMockFile();
      mockElectronAPI.loadFiles.mockResolvedValue([file]);
      mockElectronAPI.selectFolder.mockResolvedValue('/test/folder');
      mockElectronAPI.analyzeFile.mockResolvedValue({
        shotName: 'kitchen-oven-cleaning-WS',
        keywords: ['appliance', 'cooking'],
        confidence: 0.95,
        location: 'kitchen',
        subject: 'oven',
        action: 'cleaning',
        shotType: 'WS',
      });

      render(<App />);

      const selectButton = screen.getByRole('button', { name: /select folder/i });
      await userEvent.click(selectButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /ai assist/i })).toBeInTheDocument();
      });

      // Press Cmd+I
      await userEvent.keyboard('{Meta>}i{/Meta}');

      // Verify AI analysis was called
      await waitFor(() => {
        expect(mockElectronAPI.analyzeFile).toHaveBeenCalledWith('/test/path/IMG_12345678.mp4');
      });
    });

    it('should not trigger AI assist when isLoading is true', async () => {
      const file = createMockFile();
      mockElectronAPI.loadFiles.mockResolvedValue([file]);
      mockElectronAPI.selectFolder.mockResolvedValue('/test/folder');

      // Make analyzeFile take a long time
      mockElectronAPI.analyzeFile.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 5000))
      );

      render(<App />);

      const selectButton = screen.getByRole('button', { name: /select folder/i });
      await userEvent.click(selectButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /ai assist/i })).toBeInTheDocument();
      });

      // Start AI analysis
      await userEvent.keyboard('{Meta>}i{/Meta}');

      // Wait for loading state
      await waitFor(() => {
        expect(screen.getByText(/analyzing/i)).toBeInTheDocument();
      });

      // Try to trigger again while loading
      await userEvent.keyboard('{Meta>}i{/Meta}');

      // Should only be called once
      expect(mockElectronAPI.analyzeFile).toHaveBeenCalledTimes(1);
    });
  });

  describe('Arrow keys - Navigation shortcuts', () => {
    it('should navigate to next file with ArrowDown', async () => {
      const files = [
        createMockFile({ id: '1', originalFilename: 'file1.mp4', currentFilename: 'file1.mp4' }),
        createMockFile({ id: '2', originalFilename: 'file2.mp4', currentFilename: 'file2.mp4' }),
      ];
      mockElectronAPI.loadFiles.mockResolvedValue(files);
      mockElectronAPI.selectFolder.mockResolvedValue('/test/folder');

      render(<App />);

      const selectButton = screen.getByRole('button', { name: /select folder/i });
      await userEvent.click(selectButton);

      await waitFor(() => {
        const folderInfo = screen.getByText(/Folder:/i).closest('.folder-info');
        expect(folderInfo?.textContent).toMatch(/Current:\s*1/);
      });

      // Press ArrowDown
      await userEvent.keyboard('{ArrowDown}');

      // Verify we moved to next file
      await waitFor(() => {
        const folderInfo = screen.getByText(/Folder:/i).closest('.folder-info');
        expect(folderInfo?.textContent).toMatch(/Current:\s*2/);
      });
    });

    it('should navigate to next file with ArrowRight', async () => {
      const files = [
        createMockFile({ id: '1', originalFilename: 'file1.mp4', currentFilename: 'file1.mp4' }),
        createMockFile({ id: '2', originalFilename: 'file2.mp4', currentFilename: 'file2.mp4' }),
      ];
      mockElectronAPI.loadFiles.mockResolvedValue(files);
      mockElectronAPI.selectFolder.mockResolvedValue('/test/folder');

      render(<App />);

      const selectButton = screen.getByRole('button', { name: /select folder/i });
      await userEvent.click(selectButton);

      await waitFor(() => {
        const folderInfo = screen.getByText(/Folder:/i).closest('.folder-info');
        expect(folderInfo?.textContent).toMatch(/Current:\s*1/);
      });

      // Press ArrowRight
      await userEvent.keyboard('{ArrowRight}');

      // Verify we moved to next file
      await waitFor(() => {
        const folderInfo = screen.getByText(/Folder:/i).closest('.folder-info');
        expect(folderInfo?.textContent).toMatch(/Current:\s*2/);
      });
    });

    it('should navigate to previous file with ArrowUp', async () => {
      const files = [
        createMockFile({ id: '1', originalFilename: 'file1.mp4', currentFilename: 'file1.mp4' }),
        createMockFile({ id: '2', originalFilename: 'file2.mp4', currentFilename: 'file2.mp4' }),
      ];
      mockElectronAPI.loadFiles.mockResolvedValue(files);
      mockElectronAPI.selectFolder.mockResolvedValue('/test/folder');

      render(<App />);

      const selectButton = screen.getByRole('button', { name: /select folder/i });
      await userEvent.click(selectButton);

      await waitFor(() => {
        const folderInfo = screen.getByText(/Folder:/i).closest('.folder-info');
        expect(folderInfo?.textContent).toMatch(/Current:\s*1/);
      });

      // Move to second file first
      await userEvent.keyboard('{ArrowDown}');

      await waitFor(() => {
        const folderInfo = screen.getByText(/Folder:/i).closest('.folder-info');
        expect(folderInfo?.textContent).toMatch(/Current:\s*2/);
      });

      // Press ArrowUp to go back
      await userEvent.keyboard('{ArrowUp}');

      // Verify we moved back to first file
      await waitFor(() => {
        const folderInfo = screen.getByText(/Folder:/i).closest('.folder-info');
        expect(folderInfo?.textContent).toMatch(/Current:\s*1/);
      });
    });

    it('should navigate to previous file with ArrowLeft', async () => {
      const files = [
        createMockFile({ id: '1', originalFilename: 'file1.mp4', currentFilename: 'file1.mp4' }),
        createMockFile({ id: '2', originalFilename: 'file2.mp4', currentFilename: 'file2.mp4' }),
      ];
      mockElectronAPI.loadFiles.mockResolvedValue(files);
      mockElectronAPI.selectFolder.mockResolvedValue('/test/folder');

      render(<App />);

      const selectButton = screen.getByRole('button', { name: /select folder/i });
      await userEvent.click(selectButton);

      await waitFor(() => {
        const folderInfo = screen.getByText(/Folder:/i).closest('.folder-info');
        expect(folderInfo?.textContent).toMatch(/Current:\s*1/);
      });

      // Move to second file first
      await userEvent.keyboard('{ArrowDown}');

      await waitFor(() => {
        const folderInfo = screen.getByText(/Folder:/i).closest('.folder-info');
        expect(folderInfo?.textContent).toMatch(/Current:\s*2/);
      });

      // Press ArrowLeft to go back
      await userEvent.keyboard('{ArrowLeft}');

      // Verify we moved back to first file
      await waitFor(() => {
        const folderInfo = screen.getByText(/Folder:/i).closest('.folder-info');
        expect(folderInfo?.textContent).toMatch(/Current:\s*1/);
      });
    });

    it('should not navigate when at boundaries', async () => {
      const files = [
        createMockFile({ id: '1', originalFilename: 'file1.mp4', currentFilename: 'file1.mp4' }),
      ];
      mockElectronAPI.loadFiles.mockResolvedValue(files);
      mockElectronAPI.selectFolder.mockResolvedValue('/test/folder');

      render(<App />);

      const selectButton = screen.getByRole('button', { name: /select folder/i });
      await userEvent.click(selectButton);

      await waitFor(() => {
        const folderInfo = screen.getByText(/Folder:/i).closest('.folder-info');
        expect(folderInfo?.textContent).toMatch(/Current:\s*1/);
      });

      // Press ArrowUp when at first file (should do nothing)
      await userEvent.keyboard('{ArrowUp}');

      // Still on first file
      await waitFor(() => {
        const folderInfo = screen.getByText(/Folder:/i).closest('.folder-info');
        expect(folderInfo?.textContent).toMatch(/Current:\s*1/);
      });

      // Press ArrowDown when at last file (should do nothing)
      await userEvent.keyboard('{ArrowDown}');

      // Still on first file
      await waitFor(() => {
        const folderInfo = screen.getByText(/Folder:/i).closest('.folder-info');
        expect(folderInfo?.textContent).toMatch(/Current:\s*1/);
      });
    });
  });

  describe('Cmd+K - Command palette shortcut', () => {
    it('should open command palette when Cmd+K is pressed', async () => {
      const file = createMockFile();
      mockElectronAPI.loadFiles.mockResolvedValue([file]);
      mockElectronAPI.selectFolder.mockResolvedValue('/test/folder');

      render(<App />);

      const selectButton = screen.getByRole('button', { name: /select folder/i });
      await userEvent.click(selectButton);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/kitchen/i)).toBeInTheDocument();
      });

      // Press Cmd+K
      await userEvent.keyboard('{Meta>}k{/Meta}');

      // Verify command palette opens
      await waitFor(() => {
        expect(screen.getByRole('dialog', { name: /command palette/i })).toBeInTheDocument();
      });
    });

    it('should close command palette when Escape is pressed', async () => {
      const file = createMockFile();
      mockElectronAPI.loadFiles.mockResolvedValue([file]);
      mockElectronAPI.selectFolder.mockResolvedValue('/test/folder');

      render(<App />);

      const selectButton = screen.getByRole('button', { name: /select folder/i });
      await userEvent.click(selectButton);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/kitchen/i)).toBeInTheDocument();
      });

      // Open command palette
      await userEvent.keyboard('{Meta>}k{/Meta}');

      await waitFor(() => {
        expect(screen.getByRole('dialog', { name: /command palette/i })).toBeInTheDocument();
      });

      // Press Escape
      await userEvent.keyboard('{Escape}');

      // Verify command palette closes
      await waitFor(() => {
        expect(screen.queryByRole('dialog', { name: /command palette/i })).not.toBeInTheDocument();
      });
    });

    it('should list available commands in command palette', async () => {
      const file = createMockFile();
      mockElectronAPI.loadFiles.mockResolvedValue([file]);
      mockElectronAPI.selectFolder.mockResolvedValue('/test/folder');

      render(<App />);

      const selectButton = screen.getByRole('button', { name: /select folder/i });
      await userEvent.click(selectButton);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/kitchen/i)).toBeInTheDocument();
      });

      // Open command palette
      await userEvent.keyboard('{Meta>}k{/Meta}');

      let dialog: HTMLElement;
      await waitFor(() => {
        dialog = screen.getByRole('dialog', { name: /command palette/i });
        expect(dialog).toBeInTheDocument();
      });

      // Verify commands are listed within the dialog
      const commandLabels = dialog!.querySelectorAll('.command-palette-command-label');
      const commandTexts = Array.from(commandLabels).map(el => el.textContent);

      expect(commandTexts).toContain('Save metadata');
      expect(commandTexts).toContain('AI assist');
      expect(commandTexts).toContain('Next file');
      expect(commandTexts).toContain('Previous file');
      expect(commandTexts).toContain('Settings');
    });
  });

  describe('Escape - Close modals', () => {
    it('should close settings modal when Escape is pressed', async () => {
      mockElectronAPI.lexicon.load.mockResolvedValue({
        locations: [],
        subjects: [],
        actions: [],
      });

      render(<App />);

      // Open settings (button has emoji so search by title)
      const settingsButton = screen.getByTitle(/settings/i);
      await userEvent.click(settingsButton);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /settings/i })).toBeInTheDocument();
      });

      // Press Escape
      await userEvent.keyboard('{Escape}');

      // Verify settings modal closes
      await waitFor(() => {
        expect(screen.queryByRole('heading', { name: /settings/i })).not.toBeInTheDocument();
      });
    });
  });
});
