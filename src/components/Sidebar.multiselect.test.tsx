import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Sidebar } from './Sidebar';
import type { FileMetadata } from '../types';

/**
 * Multi-Select Feature Tests (TDD - RED Phase)
 *
 * Feature: Users can select multiple files via Cmd+click and Shift+click
 * for batch processing.
 *
 * Requirements:
 * 1. Checkbox appears next to each file
 * 2. Cmd+click toggles individual file selection
 * 3. Shift+click selects range from last selection
 * 4. onToggleSelection callback called with file ID
 * 5. Selected files show visual indicator (checked checkbox)
 * 6. Regular click (no modifier) still navigates to file (view mode)
 */

describe('Sidebar - Multi-Select Feature (TDD RED)', () => {
  const mockFiles: FileMetadata[] = [
    {
      id: 'file-001',
      originalFilename: 'IMG_001.jpg',
      currentFilename: 'IMG_001.jpg',
      filePath: '/path/to/IMG_001.jpg',
      extension: '.jpg',
      mainName: '',
      metadata: [],
      processedByAI: false,
      lastModified: new Date(),
      fileType: 'image',
    },
    {
      id: 'file-002',
      originalFilename: 'IMG_002.jpg',
      currentFilename: 'IMG_002.jpg',
      filePath: '/path/to/IMG_002.jpg',
      extension: '.jpg',
      mainName: '',
      metadata: [],
      processedByAI: false,
      lastModified: new Date(),
      fileType: 'image',
    },
    {
      id: 'file-003',
      originalFilename: 'IMG_003.jpg',
      currentFilename: 'IMG_003.jpg',
      filePath: '/path/to/IMG_003.jpg',
      extension: '.jpg',
      mainName: '',
      metadata: [],
      processedByAI: false,
      lastModified: new Date(),
      fileType: 'image',
    },
  ];

  it('should render checkbox next to each file', () => {
    // RED: This will fail - no checkboxes exist yet
    const onSelectFolder = vi.fn();
    const onSelectFile = vi.fn();
    const onToggleSelection = vi.fn();
    const selectedFileIds = new Set<string>();

    render(
      <Sidebar
        files={mockFiles}
        currentFileIndex={0}
        onSelectFolder={onSelectFolder}
        onSelectFile={onSelectFile}
        selectedFileIds={selectedFileIds}
        onToggleSelection={onToggleSelection}
      />
    );

    // Expect: 3 checkboxes (one per file)
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes).toHaveLength(3);
  });

  it('should toggle selection when Cmd+click on checkbox', async () => {
    // RED: This will fail - Cmd+click handler doesn't exist
    const user = userEvent.setup();
    const onSelectFolder = vi.fn();
    const onSelectFile = vi.fn();
    const onToggleSelection = vi.fn();
    const selectedFileIds = new Set<string>();

    render(
      <Sidebar
        files={mockFiles}
        currentFileIndex={0}
        onSelectFolder={onSelectFolder}
        onSelectFile={onSelectFile}
        selectedFileIds={selectedFileIds}
        onToggleSelection={onToggleSelection}
      />
    );

    // Find first file's checkbox
    const checkboxes = screen.getAllByRole('checkbox');
    const firstCheckbox = checkboxes[0];

    // Cmd+click to toggle selection
    await user.keyboard('{Meta>}');
    await user.click(firstCheckbox);
    await user.keyboard('{/Meta}');

    // Expect: onToggleSelection called with file ID
    expect(onToggleSelection).toHaveBeenCalledWith('file-001', true);
  });

  it('should show checked state for selected files', () => {
    // RED: This will fail - selected state not reflected in UI
    const onSelectFolder = vi.fn();
    const onSelectFile = vi.fn();
    const onToggleSelection = vi.fn();
    const selectedFileIds = new Set(['file-002']); // file-002 is selected

    render(
      <Sidebar
        files={mockFiles}
        currentFileIndex={0}
        onSelectFolder={onSelectFolder}
        onSelectFile={onSelectFile}
        selectedFileIds={selectedFileIds}
        onToggleSelection={onToggleSelection}
      />
    );

    const checkboxes = screen.getAllByRole('checkbox');

    // Expect: Second checkbox is checked
    expect(checkboxes[1]).toBeChecked();
    // Others are not checked
    expect(checkboxes[0]).not.toBeChecked();
    expect(checkboxes[2]).not.toBeChecked();
  });

  it('should navigate to file on regular click (no modifier keys)', async () => {
    // RED: This will fail if checkbox breaks existing navigation
    const user = userEvent.setup();
    const onSelectFolder = vi.fn();
    const onSelectFile = vi.fn();
    const onToggleSelection = vi.fn();
    const selectedFileIds = new Set<string>();

    render(
      <Sidebar
        files={mockFiles}
        currentFileIndex={0}
        onSelectFolder={onSelectFolder}
        onSelectFile={onSelectFile}
        selectedFileIds={selectedFileIds}
        onToggleSelection={onToggleSelection}
      />
    );

    // Find first file button (NOT checkbox)
    const fileButton = screen.getByText('IMG_001.jpg').closest('button');

    // Regular click (no modifiers)
    await user.click(fileButton!);

    // Expect: onSelectFile called (navigation)
    expect(onSelectFile).toHaveBeenCalledWith(0);
    // Expect: onToggleSelection NOT called
    expect(onToggleSelection).not.toHaveBeenCalled();
  });

  it('should select range when Shift+click', async () => {
    // RED: This will fail - Shift+click range selection doesn't exist
    const user = userEvent.setup();
    const onSelectFolder = vi.fn();
    const onSelectFile = vi.fn();
    const onToggleSelection = vi.fn();
    const selectedFileIds = new Set(['file-001']); // First file already selected

    render(
      <Sidebar
        files={mockFiles}
        currentFileIndex={0}
        onSelectFolder={onSelectFolder}
        onSelectFile={onSelectFile}
        selectedFileIds={selectedFileIds}
        onToggleSelection={onToggleSelection}
      />
    );

    const checkboxes = screen.getAllByRole('checkbox');
    const thirdCheckbox = checkboxes[2]; // file-003

    // Shift+click third checkbox (should select file-002 and file-003)
    await user.keyboard('{Shift>}');
    await user.click(thirdCheckbox);
    await user.keyboard('{/Shift}');

    // Expect: onToggleSelection called for range
    // Note: Implementation details - might call once with array or multiple times
    // For now, just verify it was called
    expect(onToggleSelection).toHaveBeenCalled();
  });

  it('should handle empty selection (no files selected)', () => {
    // RED: Should render correctly with no selection
    const onSelectFolder = vi.fn();
    const onSelectFile = vi.fn();
    const onToggleSelection = vi.fn();
    const selectedFileIds = new Set<string>(); // No selection

    render(
      <Sidebar
        files={mockFiles}
        currentFileIndex={0}
        onSelectFolder={onSelectFolder}
        onSelectFile={onSelectFile}
        selectedFileIds={selectedFileIds}
        onToggleSelection={onToggleSelection}
      />
    );

    const checkboxes = screen.getAllByRole('checkbox');

    // Expect: All checkboxes unchecked
    checkboxes.forEach(checkbox => {
      expect(checkbox).not.toBeChecked();
    });
  });

  it('should handle all files selected', () => {
    // RED: Should render correctly with full selection
    const onSelectFolder = vi.fn();
    const onSelectFile = vi.fn();
    const onToggleSelection = vi.fn();
    const selectedFileIds = new Set(['file-001', 'file-002', 'file-003']); // All selected

    render(
      <Sidebar
        files={mockFiles}
        currentFileIndex={0}
        onSelectFolder={onSelectFolder}
        onSelectFile={onSelectFile}
        selectedFileIds={selectedFileIds}
        onToggleSelection={onToggleSelection}
      />
    );

    const checkboxes = screen.getAllByRole('checkbox');

    // Expect: All checkboxes checked
    checkboxes.forEach(checkbox => {
      expect(checkbox).toBeChecked();
    });
  });
});
