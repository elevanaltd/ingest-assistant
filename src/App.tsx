import { useState, useEffect } from 'react';
import type { FileMetadata } from './types';
import './App.css';

function App() {
  const [folderPath, setFolderPath] = useState<string>('');
  const [files, setFiles] = useState<FileMetadata[]>([]);
  const [currentFileIndex, setCurrentFileIndex] = useState<number>(0);
  const [mainName, setMainName] = useState<string>('');
  const [metadata, setMetadata] = useState<string>('');
  const [isAIConfigured, setIsAIConfigured] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const currentFile = files[currentFileIndex];

  // Check if AI is configured on mount
  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.isAIConfigured().then(setIsAIConfigured);
    } else {
      console.error('Electron API not available. Make sure the app is running in Electron.');
    }
  }, []);

  // Update form when current file changes
  useEffect(() => {
    if (currentFile) {
      setMainName(currentFile.mainName);
      setMetadata(currentFile.metadata.join(', '));
    }
  }, [currentFile]);

  const handleSelectFolder = async () => {
    const path = await window.electronAPI.selectFolder();
    if (path) {
      setFolderPath(path);
      const loadedFiles = await window.electronAPI.loadFiles(path);
      setFiles(loadedFiles);
      setCurrentFileIndex(0);
    }
  };

  const handleSave = async () => {
    if (!currentFile) return;

    setIsLoading(true);
    try {
      // Save main name (and rename file)
      if (mainName && mainName !== currentFile.mainName) {
        await window.electronAPI.renameFile(currentFile.id, mainName);
      }

      // Save metadata
      const metadataTags = metadata
        .split(',')
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0);

      await window.electronAPI.updateMetadata(currentFile.id, metadataTags);

      // Reload files to reflect changes
      const updatedFiles = await window.electronAPI.loadFiles(folderPath);
      setFiles(updatedFiles);

      alert('Saved successfully!');
    } catch (error) {
      console.error('Save failed:', error);
      alert('Save failed: ' + error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNext = () => {
    if (currentFileIndex < files.length - 1) {
      setCurrentFileIndex(currentFileIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentFileIndex > 0) {
      setCurrentFileIndex(currentFileIndex - 1);
    }
  };

  const handleAIAssist = async () => {
    if (!currentFile) return;

    setIsLoading(true);
    try {
      const result = await window.electronAPI.analyzeFile(currentFile.filePath);
      setMainName(result.mainName);
      setMetadata(result.metadata.join(', '));
      alert(`AI Analysis complete! Confidence: ${(result.confidence * 100).toFixed(0)}%`);
    } catch (error) {
      console.error('AI analysis failed:', error);
      alert('AI analysis failed: ' + error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="app">
      <header className="header">
        <h1>Ingest Assistant</h1>
        <button onClick={handleSelectFolder} className="btn-primary">
          Select Folder
        </button>
      </header>

      {folderPath && (
        <div className="folder-info">
          <strong>Folder:</strong> {folderPath} | <strong>Files:</strong> {files.length} |
          <strong> Current:</strong> {currentFileIndex + 1}
        </div>
      )}

      {currentFile && (
        <div className="content">
          <div className="viewer">
            {currentFile.fileType === 'image' ? (
              <img
                src={`file://${currentFile.filePath}`}
                alt={currentFile.currentFilename}
                className="media-preview"
              />
            ) : (
              <video
                src={`file://${currentFile.filePath}`}
                controls
                className="media-preview"
              />
            )}
          </div>

          <div className="form">
            <div className="form-group">
              <label>ID (First 8 Digits - Read Only)</label>
              <input
                type="text"
                value={currentFile.id}
                readOnly
                className="input-readonly"
              />
            </div>

            <div className="form-group">
              <label>Main Name</label>
              <input
                type="text"
                value={mainName}
                onChange={(e) => setMainName(e.target.value)}
                placeholder="e.g., Oven Control Panel"
                className="input"
              />
            </div>

            <div className="form-group">
              <label>Metadata (comma-separated tags)</label>
              <input
                type="text"
                value={metadata}
                onChange={(e) => setMetadata(e.target.value)}
                placeholder="e.g., oven, control panel, kitchen"
                className="input"
              />
            </div>

            <div className="button-group">
              <button
                onClick={handleSave}
                disabled={isLoading || !mainName}
                className="btn-primary"
              >
                {isLoading ? 'Saving...' : 'Save'}
              </button>

              {isAIConfigured && (
                <button
                  onClick={handleAIAssist}
                  disabled={isLoading}
                  className="btn-secondary"
                >
                  {isLoading ? 'Analyzing...' : 'AI Assist'}
                </button>
              )}
            </div>

            <div className="navigation">
              <button onClick={handlePrevious} disabled={currentFileIndex === 0} className="btn">
                Previous
              </button>
              <button
                onClick={handleNext}
                disabled={currentFileIndex === files.length - 1}
                className="btn"
              >
                Next
              </button>
            </div>

            <div className="file-info">
              <small>
                Current file: {currentFile.currentFilename}
                {currentFile.processedByAI && ' (AI Processed)'}
              </small>
            </div>
          </div>
        </div>
      )}

      {!currentFile && folderPath && (
        <div className="empty-state">
          <p>No media files found in this folder.</p>
        </div>
      )}

      {!folderPath && (
        <div className="empty-state">
          <p>Select a folder to get started.</p>
        </div>
      )}
    </div>
  );
}

export default App;
