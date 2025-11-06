import type { FileMetadata } from '../types';
import './Sidebar.css';

interface SidebarProps {
  files: FileMetadata[];
  currentFileIndex: number;
  onSelectFolder: () => void;
  onSelectFile: (index: number) => void;
}

export function Sidebar({ files, currentFileIndex, onSelectFolder, onSelectFile }: SidebarProps) {
  const hasFiles = files.length > 0;
  const isValidIndex = currentFileIndex >= 0 && currentFileIndex < files.length;

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

      {hasFiles && (
        <div className="sidebar-file-list">
          {files.map((file, index) => {
            const isActive = isValidIndex && index === currentFileIndex;

            return (
              <button
                key={file.id}
                className={`sidebar-file-item ${isActive ? 'active' : ''}`}
                onClick={() => onSelectFile(index)}
                aria-current={isActive ? 'true' : undefined}
              >
                <div className="sidebar-file-info">
                  <div className="sidebar-file-name">{file.mainName}</div>
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
          })}
        </div>
      )}
    </aside>
  );
}
