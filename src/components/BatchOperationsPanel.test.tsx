import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BatchOperationsPanel } from './BatchOperationsPanel';

/**
 * Test suite for BatchOperationsPanel component
 * Tests layout, button visibility, and user interactions
 */
describe('BatchOperationsPanel', () => {
  beforeEach(() => {
    // Mock window.electronAPI for batch operations
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).electronAPI = {
      batchGetStatus: vi.fn().mockResolvedValue({
        queueId: null,
        status: 'idle',
        items: [],
      }),
      onBatchProgress: vi.fn().mockReturnValue(() => {}),
      onTranscodeProgress: vi.fn().mockReturnValue(() => {}),
    };
  });

  it('should render batch operations header', () => {
    render(
      <BatchOperationsPanel
        availableFiles={[]}
        onBatchComplete={vi.fn()}
      />
    );

    expect(screen.getByText('Batch Operations')).toBeInTheDocument();
  });

  it('should show file count when files are available', () => {
    render(
      <BatchOperationsPanel
        availableFiles={[
          { id: '1', filename: 'test1.jpg', processedByAI: false },
          { id: '2', filename: 'test2.jpg', processedByAI: false },
        ]}
        onBatchComplete={vi.fn()}
      />
    );

    // Should show count of unprocessed files
    expect(screen.getByText(/2.*ready/i)).toBeInTheDocument();
  });

  it('should show process button when files are available', () => {
    render(
      <BatchOperationsPanel
        availableFiles={[
          { id: '1', filename: 'test1.jpg', processedByAI: false },
        ]}
        onBatchComplete={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: /^AI Process.*file/i })).toBeInTheDocument();
  });

  it('should disable process button when no unprocessed files', () => {
    render(
      <BatchOperationsPanel
        availableFiles={[
          { id: '1', filename: 'test1.jpg', processedByAI: true },
        ]}
        onBatchComplete={vi.fn()}
      />
    );

    const processButton = screen.getByRole('button', { name: /no files to process/i });
    expect(processButton).toBeDisabled();
  });

  it('should have expand/collapse functionality', () => {
    render(
      <BatchOperationsPanel
        availableFiles={[]}
        onBatchComplete={vi.fn()}
      />
    );

    const collapseButton = screen.getByTitle(/expand|collapse/i);
    expect(collapseButton).toBeInTheDocument();
  });

  it('should show reprocess button when files have been processed', () => {
    render(
      <BatchOperationsPanel
        availableFiles={[
          { id: '1', filename: 'test1.jpg', processedByAI: true },
          { id: '2', filename: 'test2.jpg', processedByAI: false },
        ]}
        onBatchComplete={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: /AI Reprocess All/i })).toBeInTheDocument();
  });

  it('should show total file count for reprocess button', () => {
    render(
      <BatchOperationsPanel
        availableFiles={[
          { id: '1', filename: 'test1.jpg', processedByAI: true },
          { id: '2', filename: 'test2.jpg', processedByAI: true },
          { id: '3', filename: 'test3.jpg', processedByAI: false },
        ]}
        onBatchComplete={vi.fn()}
      />
    );

    // Should show reprocess for all 3 files
    expect(screen.getByRole('button', { name: /AI Reprocess.*3.*file/i })).toBeInTheDocument();
  });

  // Phase 3: Multi-select batch processing tests (TDD - RED phase)
  describe('Process Selected Files', () => {
    it('should show "Process Selected" button when files are selected', () => {
      // Arrange: Create selected file IDs
      const selectedIds = new Set(['1', '2']);

      // Act: Render with selectedFileIds prop
      render(
        <BatchOperationsPanel
          availableFiles={[
            { id: '1', filename: 'test1.jpg', processedByAI: false },
            { id: '2', filename: 'test2.jpg', processedByAI: false },
            { id: '3', filename: 'test3.jpg', processedByAI: false },
          ]}
          selectedFileIds={selectedIds}
          onBatchComplete={vi.fn()}
        />
      );

      // Assert: Button with selected count should appear
      expect(screen.getByRole('button', { name: /process selected.*2.*file/i })).toBeInTheDocument();
    });

    it('should hide "Process Selected" button when no files are selected', () => {
      // Arrange: Empty selection
      const selectedIds = new Set<string>();

      // Act
      render(
        <BatchOperationsPanel
          availableFiles={[
            { id: '1', filename: 'test1.jpg', processedByAI: false },
          ]}
          selectedFileIds={selectedIds}
          onBatchComplete={vi.fn()}
        />
      );

      // Assert: No "Process Selected" button should appear
      expect(screen.queryByRole('button', { name: /process selected/i })).not.toBeInTheDocument();
    });

    it('should call batchStart with selected file IDs when clicked', async () => {
      // Arrange
      const selectedIds = new Set(['1', '3']);
      const mockBatchStart = vi.fn().mockResolvedValue(undefined);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).electronAPI = {
        ...((window as any).electronAPI),
        batchStart: mockBatchStart,
      };

      render(
        <BatchOperationsPanel
          availableFiles={[
            { id: '1', filename: 'test1.jpg', processedByAI: false },
            { id: '2', filename: 'test2.jpg', processedByAI: false },
            { id: '3', filename: 'test3.jpg', processedByAI: false },
          ]}
          selectedFileIds={selectedIds}
          onBatchComplete={vi.fn()}
        />
      );

      // Act: Click the "Process Selected" button
      const button = screen.getByRole('button', { name: /process selected.*2.*file/i });
      button.click();

      // Assert: Should call batchStart with array of selected IDs
      expect(mockBatchStart).toHaveBeenCalledWith(['1', '3']);
    });

    it('should prioritize "Process Selected" button over regular batch button', () => {
      // When files are selected, "Process Selected" should appear instead of regular "Process X Files"
      const selectedIds = new Set(['1']);

      render(
        <BatchOperationsPanel
          availableFiles={[
            { id: '1', filename: 'test1.jpg', processedByAI: false },
            { id: '2', filename: 'test2.jpg', processedByAI: false },
          ]}
          selectedFileIds={selectedIds}
          onBatchComplete={vi.fn()}
        />
      );

      // Assert: "Process Selected" should appear
      expect(screen.getByRole('button', { name: /process selected.*1.*file/i })).toBeInTheDocument();

      // Assert: Regular batch button should not appear (replaced by Process Selected)
      expect(screen.queryByRole('button', { name: /^AI Process 2 Files$/i })).not.toBeInTheDocument();
    });
  });

  /**
   * File Rename Safety System - Batch Operations Warning (B5 Enhancement)
   *
   * TDD RED Phase - Safety warning before batch operations when filenameRewrite enabled
   * Feature: Confirmation dialog showing file count before destructive batch rename
   */
  describe('Batch Operations Warning', () => {
    beforeEach(() => {
      // Mock window.confirm for batch confirmation tests
      window.confirm = vi.fn();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).electronAPI = {
        batchGetStatus: vi.fn().mockResolvedValue({
          queueId: null,
          status: 'idle',
          items: [],
        }),
        batchStart: vi.fn().mockResolvedValue('mock-queue-id'),
        onBatchProgress: vi.fn().mockReturnValue(() => {}),
        onTranscodeProgress: vi.fn().mockReturnValue(() => {}),
      };
    });

    it('shows warning dialog before batch operation when filenameRewrite enabled', async () => {
      render(
        <BatchOperationsPanel
          availableFiles={[
            { id: '1', filename: 'test1.jpg', processedByAI: false },
            { id: '2', filename: 'test2.jpg', processedByAI: false },
          ]}
          filenameRewrite={true}
          onBatchComplete={vi.fn()}
        />
      );

      const processButton = screen.getByRole('button', { name: /AI Process 2 Files/i });
      processButton.click();

      // Should call window.confirm with warning message
      expect(window.confirm).toHaveBeenCalledWith(
        expect.stringContaining('⚠️ Batch Rename Active')
      );
      expect(window.confirm).toHaveBeenCalledWith(
        expect.stringContaining('2 files will be renamed')
      );
      expect(window.confirm).toHaveBeenCalledWith(
        expect.stringContaining('Original filenames preserved in TapeName metadata')
      );
    });

    it('proceeds with batch operation when user confirms warning', async () => {
      (window.confirm as ReturnType<typeof vi.fn>).mockReturnValue(true); // User clicks OK

      render(
        <BatchOperationsPanel
          availableFiles={[
            { id: '1', filename: 'test1.jpg', processedByAI: false },
            { id: '2', filename: 'test2.jpg', processedByAI: false },
          ]}
          filenameRewrite={true}
          onBatchComplete={vi.fn()}
        />
      );

      const processButton = screen.getByRole('button', { name: /AI Process 2 Files/i });
      processButton.click();

      // Should show confirmation
      expect(window.confirm).toHaveBeenCalled();

      // Should proceed with batch operation
      const mockBatchStart = (window as any).electronAPI.batchStart;
      expect(mockBatchStart).toHaveBeenCalledWith(['1', '2']);
    });

    it('cancels batch operation when user dismisses warning', async () => {
      (window.confirm as ReturnType<typeof vi.fn>).mockReturnValue(false); // User clicks Cancel

      render(
        <BatchOperationsPanel
          availableFiles={[
            { id: '1', filename: 'test1.jpg', processedByAI: false },
            { id: '2', filename: 'test2.jpg', processedByAI: false },
          ]}
          filenameRewrite={true}
          onBatchComplete={vi.fn()}
        />
      );

      const processButton = screen.getByRole('button', { name: /AI Process 2 Files/i });
      processButton.click();

      // Should show confirmation
      expect(window.confirm).toHaveBeenCalled();

      // Should NOT proceed with batch operation
      const mockBatchStart = (window as any).electronAPI.batchStart;
      expect(mockBatchStart).not.toHaveBeenCalled();
    });

    it('shows file count in warning dialog', async () => {
      render(
        <BatchOperationsPanel
          availableFiles={[
            { id: '1', filename: 'test1.jpg', processedByAI: false },
            { id: '2', filename: 'test2.jpg', processedByAI: false },
            { id: '3', filename: 'test3.jpg', processedByAI: false },
          ]}
          filenameRewrite={true}
          onBatchComplete={vi.fn()}
        />
      );

      const processButton = screen.getByRole('button', { name: /AI Process 3 Files/i });
      processButton.click();

      // Warning should include file count
      expect(window.confirm).toHaveBeenCalledWith(
        expect.stringContaining('3 files will be renamed')
      );
    });

    it('does not show warning when filenameRewrite disabled', async () => {
      render(
        <BatchOperationsPanel
          availableFiles={[
            { id: '1', filename: 'test1.jpg', processedByAI: false },
            { id: '2', filename: 'test2.jpg', processedByAI: false },
          ]}
          filenameRewrite={false}
          onBatchComplete={vi.fn()}
        />
      );

      const processButton = screen.getByRole('button', { name: /AI Process 2 Files/i });
      processButton.click();

      // Should NOT show confirmation
      expect(window.confirm).not.toHaveBeenCalled();

      // Should proceed directly with batch operation
      const mockBatchStart = (window as any).electronAPI.batchStart;
      expect(mockBatchStart).toHaveBeenCalledWith(['1', '2']);
    });
  });

  /**
   * B2.7_03: Button Renaming with AI Prefix (TDD RED Phase)
   *
   * Purpose: Clarify that existing buttons perform AI processing (not proxy generation)
   * Buttons renamed: "Process X Files" → "AI Process X Files"
   *                  "Reprocess All X Files" → "AI Reprocess All X Files"
   */
  describe('AI Button Prefix (B2.7_03)', () => {
    it('should display "AI Process X Files" button with AI prefix', () => {
      render(
        <BatchOperationsPanel
          availableFiles={[
            { id: '1', filename: 'test1.jpg', processedByAI: false },
            { id: '2', filename: 'test2.jpg', processedByAI: false },
          ]}
          onBatchComplete={vi.fn()}
        />
      );

      expect(screen.getByRole('button', { name: /^AI Process 2 Files$/i })).toBeInTheDocument();
    });

    it('should display "AI Reprocess All X Files" button with AI prefix', () => {
      render(
        <BatchOperationsPanel
          availableFiles={[
            { id: '1', filename: 'test1.jpg', processedByAI: true },
            { id: '2', filename: 'test2.jpg', processedByAI: true },
          ]}
          onBatchComplete={vi.fn()}
        />
      );

      expect(screen.getByRole('button', { name: /^AI Reprocess All 2 Files$/i })).toBeInTheDocument();
    });
  });

  /**
   * B2.7_04: Generate Proxies Button (TDD RED Phase)
   *
   * Purpose: Add proxy generation button to batch operations panel
   * Features:
   * - Button displays "Generate Proxies for X Videos"
   * - Only counts video files (.mov, .mp4, .MOV, .MP4)
   * - Disabled when no video files present
   * - Enabled when video files present
   * - Calls proxy:generateProxies IPC with correct parameters
   */
  describe('Generate Proxies Button (B2.7_04)', () => {
    const mockGenerateProxies = vi.fn().mockResolvedValue({
      success: true,
      completedCount: 2,
      failedCount: 0,
      failedFiles: [],
      verificationFailures: [],
    });

    beforeEach(() => {
      // Mock window.electronAPI.proxy and selectFolder for proxy generation tests
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).electronAPI = {
        ...(window as any).electronAPI,
        proxy: {
          generateProxies: mockGenerateProxies,
          onProxyProgress: vi.fn().mockReturnValue(() => {}),
        },
        selectFolder: vi.fn().mockResolvedValue('/mock/proxy/output'),
      };
      window.alert = vi.fn(); // Mock alert for all tests
    });

    it('should render "Generate Proxies for X Videos" button', () => {
      render(
        <BatchOperationsPanel
          availableFiles={[
            { id: '1', filename: 'test1.mov', processedByAI: false },
            { id: '2', filename: 'test2.mp4', processedByAI: false },
          ]}
          onBatchComplete={vi.fn()}
        />
      );

      expect(screen.getByRole('button', { name: /generate proxies for.*videos/i })).toBeInTheDocument();
    });

    it('should only count video files in button label', () => {
      render(
        <BatchOperationsPanel
          availableFiles={[
            { id: '1', filename: 'photo1.jpg', processedByAI: false },
            { id: '2', filename: 'video1.mov', processedByAI: false },
            { id: '3', filename: 'photo2.png', processedByAI: false },
            { id: '4', filename: 'video2.mp4', processedByAI: false },
          ]}
          onBatchComplete={vi.fn()}
        />
      );

      // Should show 2 videos, not 4 files
      expect(screen.getByRole('button', { name: /generate proxies for 2 videos/i })).toBeInTheDocument();
    });

    it('should disable button when no video files present', () => {
      render(
        <BatchOperationsPanel
          availableFiles={[
            { id: '1', filename: 'photo1.jpg', processedByAI: false },
            { id: '2', filename: 'photo2.png', processedByAI: false },
          ]}
          onBatchComplete={vi.fn()}
        />
      );

      const proxyButton = screen.getByRole('button', { name: /no videos to process/i });
      expect(proxyButton).toBeDisabled();
    });

    it('should enable button when video files present', () => {
      render(
        <BatchOperationsPanel
          availableFiles={[
            { id: '1', filename: 'video1.mov', processedByAI: false },
            { id: '2', filename: 'video2.MP4', processedByAI: false },
          ]}
          onBatchComplete={vi.fn()}
        />
      );

      const proxyButton = screen.getByRole('button', { name: /generate proxies for 2 videos/i });
      expect(proxyButton).toBeEnabled();
    });

    it('should call proxy:generateProxies IPC when clicked', async () => {
      render(
        <BatchOperationsPanel
          availableFiles={[
            { id: '/path/to/video1.mov', filename: 'video1.mov', processedByAI: false },
            { id: '/path/to/video2.mp4', filename: 'video2.mp4', processedByAI: false },
          ]}
          onBatchComplete={vi.fn()}
        />
      );

      const proxyButton = screen.getByRole('button', { name: /generate proxies for 2 videos/i });
      proxyButton.click();

      // Wait for async folder selection and proxy generation
      await vi.waitFor(() => {
        expect(mockGenerateProxies).toHaveBeenCalledWith(
          expect.objectContaining({
            videoFilenames: ['video1.mov', 'video2.mp4'],
          })
        );
      });
    });

    it('should recognize all video file extensions (case insensitive)', () => {
      render(
        <BatchOperationsPanel
          availableFiles={[
            { id: '1', filename: 'test1.mov', processedByAI: false },
            { id: '2', filename: 'test2.MOV', processedByAI: false },
            { id: '3', filename: 'test3.mp4', processedByAI: false },
            { id: '4', filename: 'test4.MP4', processedByAI: false },
            { id: '5', filename: 'test5.m4v', processedByAI: false },
            { id: '6', filename: 'photo.jpg', processedByAI: false },
          ]}
          onBatchComplete={vi.fn()}
        />
      );

      // Should count 5 videos (.mov, .MOV, .mp4, .MP4, .m4v)
      expect(screen.getByRole('button', { name: /generate proxies for 5 videos/i })).toBeInTheDocument();
    });
  });

  /**
   * B2.7_04b: Proxy Button Selection-Aware Behavior (TDD RED Phase)
   *
   * Purpose: Make proxy generation button selection-aware (mirrors AI Process pattern)
   * Features:
   * - Button shows ALL video count when no selection
   * - Button shows SELECTED video count when files selected (filtered to videos)
   * - Clicking processes ALL videos when none selected
   * - Clicking processes only SELECTED videos when some selected
   */
  describe('Proxy Button Selection-Aware (B2.7_04b)', () => {
    const mockGenerateProxies = vi.fn().mockResolvedValue({
      success: true,
      completedCount: 2,
      failedCount: 0,
      failedFiles: [],
      verificationFailures: [],
    });

    beforeEach(() => {
      // Mock window.electronAPI.proxy and selectFolder for proxy generation tests
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).electronAPI = {
        ...(window as any).electronAPI,
        proxy: {
          generateProxies: mockGenerateProxies,
          onProxyProgress: vi.fn().mockReturnValue(() => {}),
        },
        selectFolder: vi.fn().mockResolvedValue('/mock/proxy/output'),
      };
      window.alert = vi.fn(); // Mock alert for all tests
    });

    it('should show ALL video count when no files selected', () => {
      render(
        <BatchOperationsPanel
          availableFiles={[
            { id: '1', filename: 'video1.mov', processedByAI: false },
            { id: '2', filename: 'video2.mp4', processedByAI: false },
            { id: '3', filename: 'photo1.jpg', processedByAI: false },
          ]}
          selectedFileIds={new Set()}
          onBatchComplete={vi.fn()}
        />
      );

      // Should show 2 videos (photo excluded)
      expect(screen.getByRole('button', { name: /generate proxies for 2 videos/i })).toBeInTheDocument();
    });

    it('should show SELECTED video count when files selected', () => {
      render(
        <BatchOperationsPanel
          availableFiles={[
            { id: '1', filename: 'video1.mov', processedByAI: false },
            { id: '2', filename: 'video2.mp4', processedByAI: false },
            { id: '3', filename: 'video3.mov', processedByAI: false },
            { id: '4', filename: 'photo1.jpg', processedByAI: false },
          ]}
          selectedFileIds={new Set(['1', '4'])} // 1 video + 1 photo selected
          onBatchComplete={vi.fn()}
        />
      );

      // Should show 1 video (video1.mov selected, photo1.jpg ignored)
      expect(screen.getByRole('button', { name: /generate proxies for 1 video/i })).toBeInTheDocument();
    });

    it('should process ALL videos when no files selected', async () => {
      render(
        <BatchOperationsPanel
          availableFiles={[
            { id: '/path/video1.mov', filename: 'video1.mov', processedByAI: false },
            { id: '/path/video2.mp4', filename: 'video2.mp4', processedByAI: false },
            { id: '/path/photo1.jpg', filename: 'photo1.jpg', processedByAI: false },
          ]}
          selectedFileIds={new Set()}
          onBatchComplete={vi.fn()}
        />
      );

      const proxyButton = screen.getByRole('button', { name: /generate proxies for 2 videos/i });
      proxyButton.click();

      // Wait for async folder selection and proxy generation
      await vi.waitFor(() => {
        expect(mockGenerateProxies).toHaveBeenCalledWith(
          expect.objectContaining({
            videoFilenames: ['video1.mov', 'video2.mp4'],
          })
        );
      });
    });

    it('should process only SELECTED videos when files selected', async () => {
      render(
        <BatchOperationsPanel
          availableFiles={[
            { id: '/path/video1.mov', filename: 'video1.mov', processedByAI: false },
            { id: '/path/video2.mp4', filename: 'video2.mp4', processedByAI: false },
            { id: '/path/video3.mov', filename: 'video3.mov', processedByAI: false },
            { id: '/path/photo1.jpg', filename: 'photo1.jpg', processedByAI: false },
          ]}
          selectedFileIds={new Set(['/path/video1.mov', '/path/photo1.jpg'])} // 1 video + 1 photo
          onBatchComplete={vi.fn()}
        />
      );

      const proxyButton = screen.getByRole('button', { name: /generate proxies for 1 video/i });
      proxyButton.click();

      // Wait for async folder selection and proxy generation
      await vi.waitFor(() => {
        expect(mockGenerateProxies).toHaveBeenCalledWith(
          expect.objectContaining({
            videoFilenames: ['video1.mov'],
          })
        );
      });
    });

    it('should disable button when no videos in selection', () => {
      render(
        <BatchOperationsPanel
          availableFiles={[
            { id: '1', filename: 'video1.mov', processedByAI: false },
            { id: '2', filename: 'photo1.jpg', processedByAI: false },
            { id: '3', filename: 'photo2.jpg', processedByAI: false },
          ]}
          selectedFileIds={new Set(['2', '3'])} // Only photos selected
          onBatchComplete={vi.fn()}
        />
      );

      const proxyButton = screen.getByRole('button', { name: /no videos to process/i });
      expect(proxyButton).toBeDisabled();
    });

    it('should handle singular "Video" when count is 1', () => {
      render(
        <BatchOperationsPanel
          availableFiles={[
            { id: '1', filename: 'video1.mov', processedByAI: false },
            { id: '2', filename: 'photo1.jpg', processedByAI: false },
          ]}
          selectedFileIds={new Set(['1'])} // 1 video selected
          onBatchComplete={vi.fn()}
        />
      );

      // Should show "1 Video" (singular)
      expect(screen.getByRole('button', { name: /generate proxies for 1 video$/i })).toBeInTheDocument();
    });
  });

  /**
   * Proxy Folder Path Wiring (Bug Fix)
   *
   * Purpose: Fix ZodError - rawVideoFolder and proxyOutputFolder are empty strings
   * Solution:
   * 1. Accept currentFolderPath prop for rawVideoFolder
   * 2. Prompt user with selectFolder dialog for proxyOutputFolder
   * 3. Pass both paths to proxy:generateProxies IPC
   */
  describe('Proxy Folder Path Wiring (Bug Fix)', () => {
    const mockGenerateProxies = vi.fn().mockResolvedValue({
      success: true,
      completedCount: 2,
      failedCount: 0,
      failedFiles: [],
      verificationFailures: [],
    });

    const mockSelectFolder = vi.fn();

    beforeEach(() => {
      // Reset mocks
      mockGenerateProxies.mockClear();
      mockSelectFolder.mockClear();

      // Mock window.electronAPI.proxy and selectFolder
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).electronAPI = {
        batchGetStatus: vi.fn().mockResolvedValue({
          queueId: null,
          status: 'idle',
          items: [],
        }),
        onBatchProgress: vi.fn().mockReturnValue(() => {}),
        onTranscodeProgress: vi.fn().mockReturnValue(() => {}),
        proxy: {
          generateProxies: mockGenerateProxies,
          onProxyProgress: vi.fn().mockReturnValue(() => {}),
        },
        selectFolder: mockSelectFolder,
      };
    });

    it('should accept currentFolderPath prop', () => {
      // This test just verifies the component accepts the prop without error
      render(
        <BatchOperationsPanel
          availableFiles={[
            { id: '/path/to/raw/video1.mov', filename: 'video1.mov', processedByAI: false },
          ]}
          currentFolderPath="/path/to/raw"
          onBatchComplete={vi.fn()}
        />
      );

      expect(screen.getByRole('button', { name: /generate proxies for 1 video/i })).toBeInTheDocument();
    });

    it('should prompt for output folder when proxy button clicked', async () => {
      mockSelectFolder.mockResolvedValue('/path/to/proxies');
      window.alert = vi.fn(); // Mock alert

      render(
        <BatchOperationsPanel
          availableFiles={[
            { id: '/path/to/raw/video1.mov', filename: 'video1.mov', processedByAI: false },
          ]}
          currentFolderPath="/path/to/raw"
          onBatchComplete={vi.fn()}
        />
      );

      const proxyButton = screen.getByRole('button', { name: /generate proxies for 1 video/i });
      proxyButton.click();

      // Should show folder picker dialog with currentFolderPath as default
      await vi.waitFor(() => {
        expect(mockSelectFolder).toHaveBeenCalledWith('/path/to/raw');
      });
    });

    it('should pass both rawVideoFolder and proxyOutputFolder to IPC', async () => {
      mockSelectFolder.mockResolvedValue('/path/to/proxies');
      window.alert = vi.fn(); // Mock alert

      render(
        <BatchOperationsPanel
          availableFiles={[
            { id: '/path/to/raw/video1.mov', filename: 'video1.mov', processedByAI: false },
            { id: '/path/to/raw/video2.mp4', filename: 'video2.mp4', processedByAI: false },
          ]}
          currentFolderPath="/path/to/raw"
          onBatchComplete={vi.fn()}
        />
      );

      const proxyButton = screen.getByRole('button', { name: /generate proxies for 2 videos/i });
      proxyButton.click();

      // Wait for folder selection
      await vi.waitFor(() => {
        expect(mockSelectFolder).toHaveBeenCalled();
      });

      // Should call generateProxies with both paths
      await vi.waitFor(() => {
        expect(mockGenerateProxies).toHaveBeenCalledWith({
          rawVideoFolder: '/path/to/raw',
          proxyOutputFolder: '/path/to/proxies',
          videoFilenames: ['video1.mov', 'video2.mp4'],
        });
      });
    });

    it('should cancel operation if user closes folder picker', async () => {
      mockSelectFolder.mockResolvedValue(null); // User cancelled
      window.alert = vi.fn(); // Mock alert

      render(
        <BatchOperationsPanel
          availableFiles={[
            { id: '/path/to/raw/video1.mov', filename: 'video1.mov', processedByAI: false },
          ]}
          currentFolderPath="/path/to/raw"
          onBatchComplete={vi.fn()}
        />
      );

      const proxyButton = screen.getByRole('button', { name: /generate proxies for 1 video/i });
      proxyButton.click();

      // Wait for folder selection
      await vi.waitFor(() => {
        expect(mockSelectFolder).toHaveBeenCalled();
      });

      // Should NOT call generateProxies
      expect(mockGenerateProxies).not.toHaveBeenCalled();
    });

    it('should use empty string for rawVideoFolder if currentFolderPath not provided', async () => {
      mockSelectFolder.mockResolvedValue('/path/to/proxies');
      window.alert = vi.fn(); // Mock alert

      render(
        <BatchOperationsPanel
          availableFiles={[
            { id: 'video1.mov', filename: 'video1.mov', processedByAI: false },
          ]}
          // currentFolderPath NOT provided
          onBatchComplete={vi.fn()}
        />
      );

      const proxyButton = screen.getByRole('button', { name: /generate proxies for 1 video/i });
      proxyButton.click();

      // Wait for folder selection
      await vi.waitFor(() => {
        expect(mockSelectFolder).toHaveBeenCalled();
      });

      // Should call generateProxies with empty rawVideoFolder
      await vi.waitFor(() => {
        expect(mockGenerateProxies).toHaveBeenCalledWith({
          rawVideoFolder: '',
          proxyOutputFolder: '/path/to/proxies',
          videoFilenames: ['video1.mov'],
        });
      });
    });
  });
});
