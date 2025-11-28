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
      // Mock window.electronAPI.proxy for proxy generation tests
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).electronAPI = {
        ...(window as any).electronAPI,
        proxy: {
          generateProxies: mockGenerateProxies,
          onProxyProgress: vi.fn().mockReturnValue(() => {}),
        },
      };
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

      // Should call generateProxies with video filenames
      expect(mockGenerateProxies).toHaveBeenCalledWith(
        expect.objectContaining({
          videoFilenames: ['video1.mov', 'video2.mp4'],
        })
      );
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
});
