import { useState, useEffect } from 'react';
import type { FileMetadata, LexiconConfig } from './types';
import { SettingsModal } from './components/SettingsModal';
import './App.css';

function App() {
  const [folderPath, setFolderPath] = useState<string>('');
  const [files, setFiles] = useState<FileMetadata[]>([]);
  const [currentFileIndex, setCurrentFileIndex] = useState<number>(0);
  const [mainName, setMainName] = useState<string>('');
  const [metadata, setMetadata] = useState<string>('');
  const [isAIConfigured, setIsAIConfigured] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [mediaDataUrl, setMediaDataUrl] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [showSettings, setShowSettings] = useState(false);
  const [lexiconConfig, setLexiconConfig] = useState<LexiconConfig | undefined>();

  const currentFile = files[currentFileIndex];

  // Auto-dismiss status message after 3 seconds
  useEffect(() => {
    if (statusMessage) {
      const timer = setTimeout(() => setStatusMessage(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [statusMessage]);

  // Check if AI is configured on mount
  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.isAIConfigured().then(setIsAIConfigured);
    }
  }, []);

  // Update form and load media when current file changes
  useEffect(() => {
    if (!window.electronAPI) return;

    if (currentFile) {
      setMainName(currentFile.mainName);
      setMetadata(currentFile.metadata.join(', '));

      // Load file as data URL
      window.electronAPI.readFileAsDataUrl(currentFile.filePath)
        .then(setMediaDataUrl)
        .catch(error => {
          console.error('Failed to load media:', error);
          setMediaDataUrl('');
        });
    } else {
      setMediaDataUrl('');
    }
  }, [currentFile]);

  // Check if running in Electron (user-friendly UI check)
  if (!window.electronAPI) {
    return (
      <div className="app" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: '16px' }}>
        <h2>⚠️ Electron API not available</h2>
        <p>This app must be run in Electron, not in a browser.</p>
        <p>Run: <code>npm run dev</code></p>
      </div>
    );
  }

  const handleSelectFolder = async () => {
    const path = await window.electronAPI.selectFolder();
    if (path) {
      setFolderPath(path);
      // CRITICAL-1 FIX: loadFiles() no longer accepts path parameter
      const loadedFiles = await window.electronAPI.loadFiles();
      setFiles(loadedFiles);
      setCurrentFileIndex(0);
    }
  };

  const handleSave = async () => {
    if (!currentFile) return;

    setIsLoading(true);
    const currentFileId = currentFile.id; // Remember the current file ID

    try {
      // Save main name (and rename file)
      if (mainName && mainName !== currentFile.mainName) {
        await window.electronAPI.renameFile(currentFile.id, mainName, currentFile.filePath);
      }

      // Save metadata
      const metadataTags = metadata
        .split(',')
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0);

      await window.electronAPI.updateMetadata(currentFile.id, metadataTags);

      // Reload files to reflect changes
      // CRITICAL-1 FIX: loadFiles() no longer accepts path parameter
      const updatedFiles = await window.electronAPI.loadFiles();
      setFiles(updatedFiles);

      // Find the file we just saved by ID and update the index
      const newIndex = updatedFiles.findIndex(f => f.id === currentFileId);
      if (newIndex !== -1) {
        setCurrentFileIndex(newIndex);
      }

      setStatusMessage('✓ Saved successfully');
    } catch (error) {
      console.error('Save failed:', error);
      setStatusMessage('✗ Save failed: ' + (error instanceof Error ? error.message : error));
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
      setStatusMessage(`✓ AI Analysis complete! Confidence: ${(result.confidence * 100).toFixed(0)}%`);
    } catch (error) {
      console.error('AI analysis failed:', error);
      setStatusMessage('✗ AI analysis failed: ' + (error instanceof Error ? error.message : error));
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenSettings = async () => {
    try {
      const config = await window.electronAPI.lexicon.load();
      setLexiconConfig(config);
      setShowSettings(true);
    } catch (error) {
      console.error('Failed to load lexicon:', error);
      setStatusMessage('✗ Failed to load settings');
    }
  };

  const handleSaveLexicon = async (config: LexiconConfig) => {
    await window.electronAPI.lexicon.save(config);
    setStatusMessage('✓ Lexicon settings saved');
  };

  return (
    <div className="app">
      <header className="header">
        <h1>Ingest Assistant</h1>
        <div className="header-buttons">
          <button onClick={handleSelectFolder} className="btn-primary">
            Select Folder
          </button>
          <button onClick={handleOpenSettings} className="btn" title="Settings">
            ⚙️
          </button>
        </div>
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
            {mediaDataUrl ? (
              currentFile.fileType === 'image' ? (
                <img
                  src={mediaDataUrl}
                  alt={currentFile.currentFilename}
                  className="media-preview"
                />
              ) : (
                <video
                  src={mediaDataUrl}
                  controls
                  className="media-preview"
                />
              )
            ) : (
              <div style={{ color: '#999' }}>Loading media...</div>
            )}
          </div>

          <div className="form">
            <div className="form-row">
              <div className="form-group">
                <label>ID (8 Digits - Read Only)</label>
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

              <div className="form-group">
                <label>&nbsp;</label>
                <button
                  onClick={handleSave}
                  disabled={isLoading || !mainName}
                  className="btn-primary"
                >
                  {isLoading ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>

            {statusMessage && (
              <div className={`status-message ${statusMessage.startsWith('✗') ? 'error' : 'success'}`}>
                {statusMessage}
              </div>
            )}

            <div className="button-group">

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

      {showSettings && (
        <SettingsModal
          onClose={() => setShowSettings(false)}
          onSave={handleSaveLexicon}
          initialConfig={lexiconConfig}
        />
      )}
    </div>
  );
}

export default App;
