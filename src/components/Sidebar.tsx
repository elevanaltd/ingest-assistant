import { useRef, useEffect } from 'react';
import { FixedSizeList, type ListChildComponentProps } from 'react-window';
import type { FileMetadata } from '../types';
import './Sidebar.css';

interface SidebarProps {
  files: FileMetadata[];
  currentFileIndex: number;
  onSelectFolder: () => void;
  onSelectFile: (index: number) => void;
}

const ITEM_HEIGHT = 60; // Height of each file item in pixels
const VIRTUAL_SCROLL_THRESHOLD = 50; // Use virtual scrolling when files > this threshold

export function Sidebar({ files, currentFileIndex, onSelectFolder, onSelectFile }: SidebarProps) {
  const hasFiles = files.length > 0;
  const isValidIndex = currentFileIndex >= 0 && currentFileIndex < files.length;
  const listRef = useRef<FixedSizeList>(null);
  const useVirtualScrolling = files.length > VIRTUAL_SCROLL_THRESHOLD;

  // Auto-scroll to selected item when currentFileIndex changes
  useEffect(() => {
    if (listRef.current && isValidIndex && useVirtualScrolling) {
      listRef.current.scrollToItem(currentFileIndex, 'smart');
    }
  }, [currentFileIndex, isValidIndex, useVirtualScrolling]);

  // Render individual file item
  const renderFileItem = (file: FileMetadata, index: number) => {
    const isActive = isValidIndex && index === currentFileIndex;

    return (
      <button
        key={file.id}
        className={`sidebar-file-item ${isActive ? 'active' : ''}`}
        onClick={() => onSelectFile(index)}
        aria-current={isActive ? 'true' : undefined}
      >
        <div className="sidebar-file-info">
          <div className="sidebar-file-name">{file.currentFilename}</div>
          <div className="sidebar-file-meta">
            <span className="sidebar-file-type">{file.fileType}</span>
            {file.processedByAI && (
              <span className="sidebar-file-ai-badge" title="AI Processed">
                AI
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
