import { useRef, useEffect, useState } from 'react';
import { FixedSizeList, type ListChildComponentProps } from 'react-window';
import type { FileMetadata } from '../types';
import './Sidebar.css';

interface SidebarProps {
  files: FileMetadata[];
  currentFileIndex: number;
  onSelectFolder: () => void;
  onSelectFile: (index: number) => void;
  selectedFileIds?: Set<string>;
  onToggleSelection?: (fileId: string, selected: boolean) => void;
}

const ITEM_HEIGHT = 60; // Height of each file item in pixels
const VIRTUAL_SCROLL_THRESHOLD = 50; // Use virtual scrolling when files > this threshold

export function Sidebar({
  files,
  currentFileIndex,
  onSelectFolder,
  onSelectFile,
  selectedFileIds = new Set(),
  onToggleSelection
}: SidebarProps) {
  const hasFiles = files.length > 0;
  const isValidIndex = currentFileIndex >= 0 && currentFileIndex < files.length;
  const listRef = useRef<FixedSizeList>(null);
  const useVirtualScrolling = files.length > VIRTUAL_SCROLL_THRESHOLD;
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);

  // Auto-scroll to selected item when currentFileIndex changes
  useEffect(() => {
    if (listRef.current && isValidIndex && useVirtualScrolling) {
      listRef.current.scrollToItem(currentFileIndex, 'smart');
    }
  }, [currentFileIndex, isValidIndex, useVirtualScrolling]);

  // Handle checkbox click with modifiers
  const handleCheckboxClick = (file: FileMetadata, index: number, event: React.MouseEvent) => {
    if (!onToggleSelection) return;

    const isSelected = selectedFileIds.has(file.id);

    // Shift+click: Select range from last selection
    if (event.shiftKey && lastSelectedIndex !== null) {
      const start = Math.min(lastSelectedIndex, index);
      const end = Math.max(lastSelectedIndex, index);
      for (let i = start; i <= end; i++) {
        onToggleSelection(files[i].id, true);
      }
      setLastSelectedIndex(index);
      return;
    }

    // Cmd/Ctrl+click or regular checkbox click: Toggle individual selection
    onToggleSelection(file.id, !isSelected);
    setLastSelectedIndex(index);
  };

  // Render individual file item
  const renderFileItem = (file: FileMetadata, index: number) => {
    const isActive = isValidIndex && index === currentFileIndex;
    const isSelected = selectedFileIds.has(file.id);

    return (
      <button
        key={file.id}
        className={`sidebar-file-item ${isActive ? 'active' : ''}`}
        onClick={() => onSelectFile(index)}
        aria-current={isActive ? 'true' : undefined}
      >
        {onToggleSelection && (
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => {}} // Controlled by click handler
            onClick={(e) => {
              e.stopPropagation(); // Prevent navigation
              handleCheckboxClick(file, index, e);
            }}
            className="sidebar-file-checkbox"
            aria-label={`Select ${file.currentFilename}`}
          />
        )}
        <div className="sidebar-file-info">
          <div className="sidebar-file-name">{file.currentFilename}</div>
          <div className="sidebar-file-meta">
            <span className="sidebar-file-type">{file.fileType}</span>
            {file.processedByAI && (
              <span className="sidebar-file-ai-badge" title="AI Processed">
                AI
              </span>
            )}
            {file.isOutdated && (
              <span className="sidebar-file-outdated-badge" title="Outdated metadata (legacy v1.0 schema)">
                OUTDATED
              </span>
            )}
          </div>
        </div>
      </button>
    );
  };

  return (
    <aside className="sidebar" role="complementary" aria-label="File navigation">
      <div className="sidebar-header">
        <button onClick={onSelectFolder} className="sidebar-select-folder-btn">
          Select Folder
        </button>
      </div>

      {!hasFiles && (
        <div className="sidebar-empty-state">
          <p>No files loaded</p>
        </div>
      )}

      {hasFiles && useVirtualScrolling && (
        <FixedSizeList
          ref={listRef}
          height={600} // Height of the scrollable area
          itemCount={files.length}
          itemSize={ITEM_HEIGHT}
          width="100%"
          className="sidebar-file-list"
        >
          {({ index, style }: ListChildComponentProps) => (
            <div style={style}>
              {renderFileItem(files[index], index)}
            </div>
          )}
        </FixedSizeList>
      )}

      {hasFiles && !useVirtualScrolling && (
        <div className="sidebar-file-list">
          {files.map((file, index) => renderFileItem(file, index))}
        </div>
      )}
    </aside>
  );
}
