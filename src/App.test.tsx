import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import type { FileMetadata, AIAnalysisResult } from './types';

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

beforeEach(() => {
  vi.clearAllMocks();
  // Extend window with electronAPI for testing
  Object.defineProperty(window, 'electronAPI', {
    value: mockElectronAPI,
    writable: true,
    configurable: true,
  });
  mockElectronAPI.isAIConfigured.mockResolvedValue(false);
  mockElectronAPI.getShotTypes.mockResolvedValue(['WS', 'MID', 'CU', 'UNDER', 'FP', 'TRACK', 'ESTAB']);
  mockElectronAPI.readFileAsDataUrl.mockResolvedValue('data:image/png;base64,fake');
});

afterEach(() => {
  vi.clearAllTimers();
});

describe('App', () => {
  it('should render the app header', async () => {
    render(<App />);
    await waitFor(() => {
      expect(screen.getByText('Ingest Assistant')).toBeInTheDocument();
    });
  });

  it('should render sidebar with folder selection button', async () => {
    render(<App />);
    // Wait for async effects to complete
    await waitFor(() => {
      // Folder selection button is now in the sidebar
      expect(screen.getByRole('complementary')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /select folder/i })).toBeInTheDocument();
    });
  });

  it('should show empty state when no folder selected', async () => {
    render(<App />);
    await waitFor(() => {
      expect(screen.getByText(/Select a folder to get started/i)).toBeInTheDocument();
    });
  });
});

describe('Action Field Feature', () => {
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
    location: '',
    subject: '',
    action: '',
    shotType: '',
    lockedFields: [],
    createdAt: new Date(),
    createdBy: 'ingest-assistant',
    modifiedAt: new Date(),
    modifiedBy: 'ingest-assistant',
    version: '1.1.0',
    ...overrides,
  });

  describe('Test 1: Action field rendering', () => {
    it('should render action field in structured fields section', async () => {
      const videoFile = createMockFile({ fileType: 'video' });
      mockElectronAPI.loadFiles.mockResolvedValue([videoFile]);
      mockElectronAPI.selectFolder.mockResolvedValue('/test/folder');

      render(<App />);

      // Trigger folder selection
      const selectButton = screen.getByRole('button', { name: /select folder/i });
      await userEvent.click(selectButton);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/cleaning/i)).toBeInTheDocument();
      });
    });

    it('should disable action field when photo is selected', async () => {
      const photoFile = createMockFile({
        fileType: 'image',
        extension: '.jpg',
        originalFilename: 'IMG_12345678.jpg',
        currentFilename: 'IMG_12345678.jpg',
      });
      mockElectronAPI.loadFiles.mockResolvedValue([photoFile]);
      mockElectronAPI.selectFolder.mockResolvedValue('/test/folder');

      render(<App />);

      const selectButton = screen.getByRole('button', { name: /select folder/i });
      await userEvent.click(selectButton);

      await waitFor(() => {
        const actionField = screen.getByPlaceholderText(/cleaning/i) as HTMLInputElement;
        expect(actionField).toBeDisabled();
        expect(actionField).toHaveStyle({ opacity: '0.5' });
      });
    });

    it('should enable action field when video is selected', async () => {
      const videoFile = createMockFile({ fileType: 'video' });
      mockElectronAPI.loadFiles.mockResolvedValue([videoFile]);
      mockElectronAPI.selectFolder.mockResolvedValue('/test/folder');

      render(<App />);

      const selectButton = screen.getByRole('button', { name: /select folder/i });
      await userEvent.click(selectButton);

      await waitFor(() => {
        const actionField = screen.getByPlaceholderText(/cleaning/i) as HTMLInputElement;
        expect(actionField).not.toBeDisabled();
        expect(actionField).toHaveStyle({ opacity: '1' });
      });
    });
  });

  describe('Test 2: Action field state management', () => {
    it('should allow typing in action field for videos', async () => {
      const videoFile = createMockFile({ fileType: 'video' });
      mockElectronAPI.loadFiles.mockResolvedValue([videoFile]);
      mockElectronAPI.selectFolder.mockResolvedValue('/test/folder');

      render(<App />);

      const selectButton = screen.getByRole('button', { name: /select folder/i });
      await userEvent.click(selectButton);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/cleaning/i)).toBeInTheDocument();
      });

      const actionField = screen.getByPlaceholderText(/cleaning/i) as HTMLInputElement;
      await userEvent.type(actionField, 'cleaning');

      expect(actionField.value).toBe('cleaning');
    });

    it('should clear action field when switching from video to photo', async () => {
      const videoFile = createMockFile({
        fileType: 'video',
        shotName: 'kitchen-oven-cleaning-WS',
        location: 'kitchen',
        subject: 'oven',
        action: 'cleaning',
        shotType: 'WS',
      });
      const photoFile = createMockFile({
        id: '87654321',
        fileType: 'image',
        extension: '.jpg',
        originalFilename: 'IMG_87654321.jpg',
        currentFilename: 'IMG_87654321.jpg',
        shotName: 'bathroom-sink-CU',
        location: 'bathroom',
        subject: 'sink',
        shotType: 'CU',
      });

      mockElectronAPI.loadFiles.mockResolvedValue([videoFile, photoFile]);
      mockElectronAPI.selectFolder.mockResolvedValue('/test/folder');

      render(<App />);

      const selectButton = screen.getByRole('button', { name: /select folder/i });
      await userEvent.click(selectButton);

      // Wait for initial video file to load with action
      await waitFor(() => {
        const actionField = screen.getByPlaceholderText(/cleaning/i) as HTMLInputElement;
        expect(actionField.value).toBe('cleaning');
      });

      // Click next to switch to photo
      const nextButton = screen.getByRole('button', { name: /next/i });
      await userEvent.click(nextButton);

      // Action field should be empty and disabled for photo
      await waitFor(() => {
        const actionField = screen.getByPlaceholderText(/cleaning/i) as HTMLInputElement;
        expect(actionField.value).toBe('');
        expect(actionField).toBeDisabled();
      });
    });

    it('should maintain action value when switching between videos', async () => {
      const video1 = createMockFile({
        fileType: 'video',
        shotName: 'kitchen-oven-cleaning-WS',
        location: 'kitchen',
        subject: 'oven',
        action: 'cleaning',
        shotType: 'WS',
      });
      const video2 = createMockFile({
        id: '87654321',
        fileType: 'video',
        originalFilename: 'IMG_87654321.mp4',
        currentFilename: 'IMG_87654321.mp4',
        shotName: 'bathroom-sink-installing-MID',
        location: 'bathroom',
        subject: 'sink',
        action: 'installing',
        shotType: 'MID',
      });

      mockElectronAPI.loadFiles.mockResolvedValue([video1, video2]);
      mockElectronAPI.selectFolder.mockResolvedValue('/test/folder');

      render(<App />);

      const selectButton = screen.getByRole('button', { name: /select folder/i });
      await userEvent.click(selectButton);

      // Verify first video's action
      await waitFor(() => {
        const actionField = screen.getByPlaceholderText(/cleaning/i) as HTMLInputElement;
        expect(actionField.value).toBe('cleaning');
      });

      // Switch to second video
      const nextButton = screen.getByRole('button', { name: /next/i });
      await userEvent.click(nextButton);

      // Verify second video's action is maintained
      await waitFor(() => {
        const actionField = screen.getByPlaceholderText(/cleaning/i) as HTMLInputElement;
        expect(actionField.value).toBe('installing');
      });
    });
  });

  describe('Test 3: AI result population with action', () => {
    it('should populate action field when AI returns result with action (video)', async () => {
      const videoFile = createMockFile({ fileType: 'video' });
      mockElectronAPI.loadFiles.mockResolvedValue([videoFile]);
      mockElectronAPI.selectFolder.mockResolvedValue('/test/folder');
      mockElectronAPI.isAIConfigured.mockResolvedValue(true);

      const aiResult: AIAnalysisResult = {
        shotName: 'kitchen-oven-cleaning-WS',
        keywords: ['appliance', 'cooking'],
        confidence: 0.95,
        location: 'kitchen',
        subject: 'oven',
        action: 'cleaning',
        shotType: 'WS',
      };
      mockElectronAPI.analyzeFile.mockResolvedValue(aiResult);

      render(<App />);

      const selectButton = screen.getByRole('button', { name: /select folder/i });
      await userEvent.click(selectButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /ai assist/i })).toBeInTheDocument();
      });

      const aiButton = screen.getByRole('button', { name: /ai assist/i });
      await userEvent.click(aiButton);

      // Verify action field is populated
      await waitFor(() => {
        const actionField = screen.getByPlaceholderText(/cleaning/i) as HTMLInputElement;
        expect(actionField.value).toBe('cleaning');
      });

      // Verify other fields too
      expect((screen.getByPlaceholderText(/kitchen/i) as HTMLInputElement).value).toBe('kitchen');
      expect((screen.getByPlaceholderText(/wine-cooler/i) as HTMLInputElement).value).toBe('oven');
    });

    it('should leave action empty when AI returns result without action (photo)', async () => {
      const photoFile = createMockFile({
        fileType: 'image',
        extension: '.jpg',
        originalFilename: 'IMG_12345678.jpg',
        currentFilename: 'IMG_12345678.jpg',
      });
      mockElectronAPI.loadFiles.mockResolvedValue([photoFile]);
      mockElectronAPI.selectFolder.mockResolvedValue('/test/folder');
      mockElectronAPI.isAIConfigured.mockResolvedValue(true);

      const aiResult: AIAnalysisResult = {
        shotName: 'kitchen-oven-WS',
        keywords: ['appliance', 'cooking'],
        confidence: 0.95,
        location: 'kitchen',
        subject: 'oven',
        action: '',
        shotType: 'WS',
      };
      mockElectronAPI.analyzeFile.mockResolvedValue(aiResult);

      render(<App />);

      const selectButton = screen.getByRole('button', { name: /select folder/i });
      await userEvent.click(selectButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /ai assist/i })).toBeInTheDocument();
      });

      const aiButton = screen.getByRole('button', { name: /ai assist/i });
      await userEvent.click(aiButton);

      // Verify action field is empty
      await waitFor(() => {
        const actionField = screen.getByPlaceholderText(/cleaning/i) as HTMLInputElement;
        expect(actionField.value).toBe('');
      });
    });

    it('should handle missing action field gracefully', async () => {
      const videoFile = createMockFile({ fileType: 'video' });
      mockElectronAPI.loadFiles.mockResolvedValue([videoFile]);
      mockElectronAPI.selectFolder.mockResolvedValue('/test/folder');
      mockElectronAPI.isAIConfigured.mockResolvedValue(true);

      // AI result without action field
      const aiResult: AIAnalysisResult = {
        shotName: 'kitchen-oven-WS',
        keywords: ['appliance', 'cooking'],
        confidence: 0.95,
        location: 'kitchen',
        subject: 'oven',
        action: '',
        shotType: 'WS',
      };
      mockElectronAPI.analyzeFile.mockResolvedValue(aiResult);

      render(<App />);

      const selectButton = screen.getByRole('button', { name: /select folder/i });
      await userEvent.click(selectButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /ai assist/i })).toBeInTheDocument();
      });

      const aiButton = screen.getByRole('button', { name: /ai assist/i });
      await userEvent.click(aiButton);

      // Should not throw error, action should be empty
      await waitFor(() => {
        const actionField = screen.getByPlaceholderText(/cleaning/i) as HTMLInputElement;
        expect(actionField.value).toBe('');
      });
    });
  });

  // Test 4: Filename generation tests REMOVED
  // These tests validated a "generated name preview" UI feature that no longer exists in the implementation.
  // The implementation now only renames files when the "Rename File" toggle is explicitly enabled by the user.
  // Obsolete tests removed during GAP_4 resolution (Category B: obsolete expectations).

  describe('Test 5: File parsing with action', () => {
    it('should parse 4-part video filename and populate action field', async () => {
      const videoFile = createMockFile({
        fileType: 'video',
        shotName: 'kitchen-oven-cleaning-WS',
        location: 'kitchen',
        subject: 'oven',
        action: 'cleaning',
        shotType: 'WS',
      });
      mockElectronAPI.loadFiles.mockResolvedValue([videoFile]);
      mockElectronAPI.selectFolder.mockResolvedValue('/test/folder');

      render(<App />);

      const selectButton = screen.getByRole('button', { name: /select folder/i });
      await userEvent.click(selectButton);

      // Verify all fields are populated from 4-part filename
      await waitFor(() => {
        expect((screen.getByPlaceholderText(/kitchen/i) as HTMLInputElement).value).toBe('kitchen');
        expect((screen.getByPlaceholderText(/wine-cooler/i) as HTMLInputElement).value).toBe('oven');
        expect((screen.getByPlaceholderText(/cleaning/i) as HTMLInputElement).value).toBe('cleaning');
        expect((screen.getByRole('combobox') as HTMLSelectElement).value).toBe('WS');
      });
    });

    it('should parse 3-part video filename and leave action empty', async () => {
      const videoFile = createMockFile({
        fileType: 'video',
        shotName: 'kitchen-oven-WS',
        location: 'kitchen',
        subject: 'oven',
        shotType: 'WS',
      });
      mockElectronAPI.loadFiles.mockResolvedValue([videoFile]);
      mockElectronAPI.selectFolder.mockResolvedValue('/test/folder');

      render(<App />);

      const selectButton = screen.getByRole('button', { name: /select folder/i });
      await userEvent.click(selectButton);

      // Verify fields are populated but action is empty
      await waitFor(() => {
        expect((screen.getByPlaceholderText(/kitchen/i) as HTMLInputElement).value).toBe('kitchen');
        expect((screen.getByPlaceholderText(/wine-cooler/i) as HTMLInputElement).value).toBe('oven');
        expect((screen.getByPlaceholderText(/cleaning/i) as HTMLInputElement).value).toBe('');
        expect((screen.getByRole('combobox') as HTMLSelectElement).value).toBe('WS');
      });
    });

    it('should parse 3-part photo filename and leave action empty', async () => {
      const photoFile = createMockFile({
        fileType: 'image',
        extension: '.jpg',
        originalFilename: 'IMG_12345678.jpg',
        currentFilename: 'IMG_12345678.jpg',
        shotName: 'bathroom-sink-CU',
        location: 'bathroom',
        subject: 'sink',
        shotType: 'CU',
      });
      mockElectronAPI.loadFiles.mockResolvedValue([photoFile]);
      mockElectronAPI.selectFolder.mockResolvedValue('/test/folder');

      render(<App />);

      const selectButton = screen.getByRole('button', { name: /select folder/i });
      await userEvent.click(selectButton);

      // Verify fields are populated but action is empty and disabled
      await waitFor(() => {
        const actionField = screen.getByPlaceholderText(/cleaning/i) as HTMLInputElement;
        expect((screen.getByPlaceholderText(/kitchen/i) as HTMLInputElement).value).toBe('bathroom');
        expect((screen.getByPlaceholderText(/wine-cooler/i) as HTMLInputElement).value).toBe('sink');
        expect(actionField.value).toBe('');
        expect(actionField).toBeDisabled();
        expect((screen.getByRole('combobox') as HTMLSelectElement).value).toBe('CU');
      });
    });

    it('should handle 4-part parsing by checking shot types', async () => {
      // This test verifies the parsing logic that distinguishes 3-part vs 4-part
      // by checking if the last segment is a valid shot type
      const videoFile = createMockFile({
        fileType: 'video',
        shotName: 'bedroom-window-opening-MID',
        // No structured fields - should be parsed from mainName
      });
      mockElectronAPI.loadFiles.mockResolvedValue([videoFile]);
      mockElectronAPI.selectFolder.mockResolvedValue('/test/folder');

      render(<App />);

      const selectButton = screen.getByRole('button', { name: /select folder/i });
      await userEvent.click(selectButton);

      // Wait for shot types to be loaded and parsing to complete
      await waitFor(() => {
        expect((screen.getByPlaceholderText(/kitchen/i) as HTMLInputElement).value).toBe('bedroom');
        expect((screen.getByPlaceholderText(/wine-cooler/i) as HTMLInputElement).value).toBe('window');
        expect((screen.getByPlaceholderText(/cleaning/i) as HTMLInputElement).value).toBe('opening');
        expect((screen.getByRole('combobox') as HTMLSelectElement).value).toBe('MID');
      });
    });
  });

});
