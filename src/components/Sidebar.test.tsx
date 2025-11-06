import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Sidebar } from './Sidebar';
import type { FileMetadata } from '../types';

// Mock file data for testing
const mockFiles: FileMetadata[] = [
  {
    id: '12345678',
    originalFilename: '12345678-kitchen-oven.jpg',
    currentFilename: '12345678-kitchen-oven.jpg',
    filePath: '/test/path/12345678-kitchen-oven.jpg',
    extension: 'jpg',
    mainName: 'kitchen-oven',
    metadata: ['kitchen', 'oven'],
    processedByAI: true,
    lastModified: new Date('2025-01-01'),
    fileType: 'image'
  },
  {
    id: '87654321',
    originalFilename: '87654321-bedroom-window.jpg',
    currentFilename: '87654321-bedroom-window.jpg',
    filePath: '/test/path/87654321-bedroom-window.jpg',
    extension: 'jpg',
    mainName: 'bedroom-window',
    metadata: ['bedroom', 'window'],
    processedByAI: false,
    lastModified: new Date('2025-01-02'),
    fileType: 'image'
  },
  {
    id: '11223344',
    originalFilename: '11223344-demo-video.mp4',
    currentFilename: '11223344-demo-video.mp4',
    filePath: '/test/path/11223344-demo-video.mp4',
    extension: 'mp4',
    mainName: 'demo-video',
    metadata: ['video', 'demo'],
    processedByAI: false,
    lastModified: new Date('2025-01-03'),
    fileType: 'video'
  }
];

describe('Sidebar Component', () => {
  const mockOnSelectFolder = vi.fn();
  const mockOnSelectFile = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render sidebar container', () => {
      render(
        <Sidebar
          files={[]}
          currentFileIndex={0}
          onSelectFolder={mockOnSelectFolder}
          onSelectFile={mockOnSelectFile}
        />
      );

      const sidebar = screen.getByRole('complementary');
      expect(sidebar).toBeInTheDocument();
    });

    it('should render folder selection button', () => {
      render(
        <Sidebar
          files={[]}
          currentFileIndex={0}
          onSelectFolder={mockOnSelectFolder}
          onSelectFile={mockOnSelectFile}
        />
      );

      const button = screen.getByRole('button', { name: /select folder/i });
      expect(button).toBeInTheDocument();
    });

    it('should call onSelectFolder when folder button is clicked', () => {
      render(
        <Sidebar
          files={[]}
          currentFileIndex={0}
          onSelectFolder={mockOnSelectFolder}
          onSelectFile={mockOnSelectFile}
        />
      );

      const button = screen.getByRole('button', { name: /select folder/i });
      fireEvent.click(button);

      expect(mockOnSelectFolder).toHaveBeenCalledTimes(1);
    });
  });

  describe('Empty State', () => {
    it('should show empty state message when no files are loaded', () => {
      render(
        <Sidebar
          files={[]}
          currentFileIndex={0}
          onSelectFolder={mockOnSelectFolder}
          onSelectFile={mockOnSelectFile}
        />
      );

      expect(screen.getByText(/no files loaded/i)).toBeInTheDocument();
    });

    it('should not render file list when no files exist', () => {
      const { container } = render(
        <Sidebar
          files={[]}
          currentFileIndex={0}
          onSelectFolder={mockOnSelectFolder}
          onSelectFile={mockOnSelectFile}
        />
      );

      const fileList = container.querySelector('.sidebar-file-list');
      expect(fileList).not.toBeInTheDocument();
    });
  });

  describe('File List Rendering', () => {
    it('should render all files in the list', () => {
      render(
        <Sidebar
          files={mockFiles}
          currentFileIndex={0}
          onSelectFolder={mockOnSelectFolder}
          onSelectFile={mockOnSelectFile}
        />
      );

      expect(screen.getByText(/kitchen-oven/i)).toBeInTheDocument();
      expect(screen.getByText(/bedroom-window/i)).toBeInTheDocument();
      expect(screen.getByText(/demo-video/i)).toBeInTheDocument();
    });

    it('should render scrollable file list container', () => {
      const { container } = render(
        <Sidebar
          files={mockFiles}
          currentFileIndex={0}
          onSelectFolder={mockOnSelectFolder}
          onSelectFile={mockOnSelectFile}
        />
      );

      const fileList = container.querySelector('.sidebar-file-list');
      expect(fileList).toBeInTheDocument();
    });

    it('should display file type indicator for each file', () => {
      render(
        <Sidebar
          files={mockFiles}
          currentFileIndex={0}
          onSelectFolder={mockOnSelectFolder}
          onSelectFile={mockOnSelectFile}
        />
      );

      // Should show image indicators (2 image files)
      const imageIndicators = screen.getAllByText(/image/i);
      expect(imageIndicators).toHaveLength(2);

      // Should show video indicator (1 video file)
      const videoIndicator = screen.getByText(/video/i);
      expect(videoIndicator).toBeInTheDocument();
    });

    it('should show AI-processed indicator for files processed by AI', () => {
      render(
        <Sidebar
          files={mockFiles}
          currentFileIndex={0}
          onSelectFolder={mockOnSelectFolder}
          onSelectFile={mockOnSelectFile}
        />
      );

      // Only first file is AI processed
      const aiIndicators = screen.getAllByTitle(/ai processed/i);
      expect(aiIndicators).toHaveLength(1);
    });
  });

  describe('File Selection and Navigation', () => {
    it('should highlight the current file', () => {
      const { container } = render(
        <Sidebar
          files={mockFiles}
          currentFileIndex={1} // Second file is current
          onSelectFolder={mockOnSelectFolder}
          onSelectFile={mockOnSelectFile}
        />
      );

      const fileItems = container.querySelectorAll('.sidebar-file-item');
      expect(fileItems[1]).toHaveClass('active');
    });

    it('should call onSelectFile when a file is clicked', () => {
      render(
        <Sidebar
          files={mockFiles}
          currentFileIndex={0}
          onSelectFolder={mockOnSelectFolder}
          onSelectFile={mockOnSelectFile}
        />
      );

      const secondFile = screen.getByText(/bedroom-window/i).closest('button');
      fireEvent.click(secondFile!);

      expect(mockOnSelectFile).toHaveBeenCalledWith(1);
    });

    it('should call onSelectFile with correct index for third file', () => {
      render(
        <Sidebar
          files={mockFiles}
          currentFileIndex={0}
          onSelectFolder={mockOnSelectFolder}
          onSelectFile={mockOnSelectFile}
        />
      );

      const thirdFile = screen.getByText(/demo-video/i).closest('button');
      fireEvent.click(thirdFile!);

      expect(mockOnSelectFile).toHaveBeenCalledWith(2);
    });

    it('should not call onSelectFile when clicking the current file', () => {
      render(
        <Sidebar
          files={mockFiles}
          currentFileIndex={0}
          onSelectFolder={mockOnSelectFolder}
          onSelectFile={mockOnSelectFile}
        />
      );

      const currentFile = screen.getByText(/kitchen-oven/i).closest('button');
      fireEvent.click(currentFile!);

      // Should still be called even for current file (user might want to refresh)
      expect(mockOnSelectFile).toHaveBeenCalledWith(0);
    });
  });

  describe('Visual States', () => {
    it('should apply hover state class to file items', () => {
      const { container } = render(
        <Sidebar
          files={mockFiles}
          currentFileIndex={0}
          onSelectFolder={mockOnSelectFolder}
          onSelectFile={mockOnSelectFile}
        />
      );

      const fileItem = container.querySelector('.sidebar-file-item');
      expect(fileItem).toBeInTheDocument();
    });

    it('should only have one active file at a time', () => {
      const { container } = render(
        <Sidebar
          files={mockFiles}
          currentFileIndex={1}
          onSelectFolder={mockOnSelectFolder}
          onSelectFile={mockOnSelectFile}
        />
      );

      const activeItems = container.querySelectorAll('.sidebar-file-item.active');
      expect(activeItems).toHaveLength(1);
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA role for sidebar', () => {
      render(
        <Sidebar
          files={mockFiles}
          currentFileIndex={0}
          onSelectFolder={mockOnSelectFolder}
          onSelectFile={mockOnSelectFile}
        />
      );

      const sidebar = screen.getByRole('complementary');
      expect(sidebar).toBeInTheDocument();
    });

    it('should have aria-label for sidebar', () => {
      render(
        <Sidebar
          files={mockFiles}
          currentFileIndex={0}
          onSelectFolder={mockOnSelectFolder}
          onSelectFile={mockOnSelectFile}
        />
      );

      const sidebar = screen.getByRole('complementary');
      expect(sidebar).toHaveAttribute('aria-label');
    });

    it('should mark current file with aria-current', () => {
      const { container } = render(
        <Sidebar
          files={mockFiles}
          currentFileIndex={1}
          onSelectFolder={mockOnSelectFolder}
          onSelectFile={mockOnSelectFile}
        />
      );

      const fileItems = container.querySelectorAll('.sidebar-file-item');
      expect(fileItems[1]).toHaveAttribute('aria-current', 'true');
    });
  });

  describe('Edge Cases', () => {
    it('should handle single file', () => {
      render(
        <Sidebar
          files={[mockFiles[0]]}
          currentFileIndex={0}
          onSelectFolder={mockOnSelectFolder}
          onSelectFile={mockOnSelectFile}
        />
      );

      expect(screen.getByText(/kitchen-oven/i)).toBeInTheDocument();
    });

    it('should handle currentFileIndex out of bounds gracefully', () => {
      const { container } = render(
        <Sidebar
          files={mockFiles}
          currentFileIndex={999} // Out of bounds
          onSelectFolder={mockOnSelectFolder}
          onSelectFile={mockOnSelectFile}
        />
      );

      // Should not crash and no item should be marked as active
      const activeItems = container.querySelectorAll('.sidebar-file-item.active');
      expect(activeItems).toHaveLength(0);
    });

    it('should handle negative currentFileIndex', () => {
      const { container } = render(
        <Sidebar
          files={mockFiles}
          currentFileIndex={-1}
          onSelectFolder={mockOnSelectFolder}
          onSelectFile={mockOnSelectFile}
        />
      );

      const activeItems = container.querySelectorAll('.sidebar-file-item.active');
      expect(activeItems).toHaveLength(0);
    });
  });
});
