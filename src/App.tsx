import { useState, useEffect } from 'react';
import type { FileMetadata, LexiconConfig, ShotType } from './types';
import { SettingsModal } from './components/SettingsModal';
import { Sidebar } from './components/Sidebar';
import './App.css';

function App() {
  const [folderPath, setFolderPath] = useState<string>('');
  const [files, setFiles] = useState<FileMetadata[]>([]);
  const [currentFileIndex, setCurrentFileIndex] = useState<number>(0);

  // Structured naming fields
  const [location, setLocation] = useState<string>('');
  const [subject, setSubject] = useState<string>('');
  const [action, setAction] = useState<string>('');
  const [shotType, setShotType] = useState<ShotType | ''>('');
  const [shotTypes, setShotTypes] = useState<string[]>([]);

  // Legacy field (still used for backward compatibility)
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

  // Check if AI is configured and load shot types on mount
  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.isAIConfigured().then(setIsAIConfigured);

      // Load shot types for dropdown
      window.electronAPI.getShotTypes()
        .then(setShotTypes)
        .catch(error => {
          console.error('Failed to load shot types:', error);
          // Fallback to default shot types
          setShotTypes(['WS', 'MID', 'CU', 'UNDER', 'FP', 'TRACK', 'ESTAB']);
        });
    }
  }, []);

  // Update form and load media when current file changes
  useEffect(() => {
    if (!window.electronAPI) return;

    if (currentFile) {
      // Parse structured naming if available
      if (currentFile.location && currentFile.subject && currentFile.shotType) {
        setLocation(currentFile.location);
        setSubject(currentFile.subject);
        setAction(currentFile.action || '');
        setShotType(currentFile.shotType as ShotType);
        setMainName(currentFile.mainName);
      } else if (currentFile.mainName) {
        // Try parsing mainName pattern: {location}-{subject}-{shotType} or {location}-{subject}-{action}-{shotType}
        const parts = currentFile.mainName.split('-');
        if (parts.length === 4 && shotTypes.includes(parts[3].toUpperCase())) {
          // 4-part video format
          setLocation(parts[0]);
          setSubject(parts[1]);
          setAction(parts[2]);
          setShotType(parts[3].toUpperCase() as ShotType);
          setMainName(currentFile.mainName);
        } else if (parts.length === 3 && shotTypes.includes(parts[2].toUpperCase())) {
          // 3-part photo format
          setLocation(parts[0]);
          setSubject(parts[1]);
          setAction('');
          setShotType(parts[2].toUpperCase() as ShotType);
          setMainName(currentFile.mainName);
        } else {
          // Legacy format - populate mainName directly
          setLocation('');
          setSubject('');
          setAction('');
          setShotType('');
          setMainName(currentFile.mainName);
        }
      } else {
        setLocation('');
        setSubject('');
        setAction('');
        setShotType('');
        setMainName('');
      }

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
  }, [currentFile, shotTypes]);

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
      // Build mainName from structured components or use direct input
      let finalMainName = mainName;
      if (location && subject && shotType) {
        // Structured naming: 4-part for videos (with action), 3-part for photos (without action)
        if (currentFile.fileType === 'video' && action) {
          finalMainName = `${location}-${subject}-${action}-${shotType}`;
        } else {
          finalMainName = `${location}-${subject}-${shotType}`;
        }
        setMainName(finalMainName); // Update mainName state for consistency
      }

      // Save main name (and rename file) with structured components
      const structuredData = location && subject && shotType ? { location, subject, action, shotType } : undefined;

      if (finalMainName && finalMainName !== currentFile.mainName) {
        console.log('[App] Calling renameFile with:', {
          fileId: currentFile.id,
          finalMainName,
          structuredData
        });
        await window.electronAPI.renameFile(
          currentFile.id,
          finalMainName,
          currentFile.filePath,
          structuredData
        );
      } else if (structuredData) {
        // Filename didn't change, but we still need to save structured components
        console.log('[App] Filename unchanged, updating structured metadata only');
        await window.electronAPI.updateStructuredMetadata(
          currentFile.id,
          structuredData
        );
      }

      // Save metadata tags
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
      console.log('[App] AI result received:', result);

      // Populate structured fields if available
      if (result.location && result.subject && result.shotType) {
        console.log('[App] Populating structured fields:', {
          location: result.location,
          subject: result.subject,
          action: result.action,
          shotType: result.shotType
        });
        setLocation(result.location);
        setSubject(result.subject);
        setAction(result.action || '');
        setShotType(result.shotType);
        setMainName(result.mainName);
      } else {
        // Legacy format - populate mainName directly
        console.log('[App] Using legacy format, mainName only:', result.mainName);
        setMainName(result.mainName);
      }

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

  const handleSettingsClose = async () => {
    setShowSettings(false);
    // Refresh AI configuration status
    if (window.electronAPI) {
      const configured = await window.electronAPI.isAIConfigured();
      setIsAIConfigured(configured);
    }
  };

  return (
    <div className="app">
      <header className="header">
        <h1>Ingest Assistant</h1>
        <div className="header-buttons">
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

      <div className="main-container">
        <Sidebar
          files={files}
          currentFileIndex={currentFileIndex}
          onSelectFolder={handleSelectFolder}
          onSelectFile={setCurrentFileIndex}
        />

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
            {/* Structured Naming Row */}
            <div className="form-row">
              <div className="form-group">
                <label>ID (Read Only)</label>
                <input
                  type="text"
                  value={currentFile.id}
                  readOnly
                  className="input-readonly"
                />
              </div>

              <div className="form-group">
                <label>Location</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g., kitchen, bathroom"
                  className="input"
                />
              </div>

              <div className="form-group">
                <label>Subject</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g., oven, sink, window"
                  className="input"
                />
              </div>

              <div className="form-group">
                <label>Action (videos only)</label>
                <input
                  type="text"
                  value={action}
                  onChange={(e) => setAction(e.target.value)}
                  placeholder="e.g., cleaning, installing"
                  disabled={currentFile.fileType === 'image'}
                  className="input"
                  style={{
                    opacity: currentFile.fileType === 'image' ? 0.5 : 1,
                    cursor: currentFile.fileType === 'image' ? 'not-allowed' : 'text'
                  }}
                />
              </div>

              <div className="form-group">
                <label>Shot Type</label>
                <select
                  value={shotType}
                  onChange={(e) => setShotType(e.target.value as ShotType)}
                  className="input"
                >
                  <option value="">Select shot type...</option>
                  <optgroup label="Static (No Movement)">
                    {shotTypes.filter(st => ['WS', 'MID', 'CU', 'UNDER'].includes(st)).map(st => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Movement">
                    {shotTypes.filter(st => ['FP', 'TRACK', 'ESTAB'].includes(st)).map(st => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </optgroup>
                </select>
              </div>
            </div>

            {/* Generated Name Preview */}
            {location && subject && shotType && (
              <div className="form-row" style={{ marginTop: '8px' }}>
                <div className="form-group" style={{ gridColumn: 'span 4' }}>
                  <label style={{ fontSize: '12px', color: '#666' }}>Generated Name:</label>
                  <div style={{ padding: '8px', background: '#f5f5f5', borderRadius: '4px', fontFamily: 'monospace', fontSize: '14px' }}>
                    {currentFile.id}-{location}-{subject}-{currentFile.fileType === 'video' && action ? `${action}-` : ''}{shotType}
                  </div>
                </div>
              </div>
            )}

            {/* Metadata Row */}
            <div className="form-row">
              <div className="form-group" style={{ gridColumn: 'span 3' }}>
                <label>Metadata (comma-separated tags)</label>
                <input
                  type="text"
                  value={metadata}
                  onChange={(e) => setMetadata(e.target.value)}
                  placeholder="e.g., appliance, control-panel, interior"
                  className="input"
                />
              </div>

              <div className="form-group">
                <label>&nbsp;</label>
                <button
                  onClick={handleSave}
                  disabled={isLoading || (!location || !subject || !shotType)}
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
      </div>

      {showSettings && (
        <SettingsModal
          onClose={handleSettingsClose}
          onSave={handleSaveLexicon}
          initialConfig={lexiconConfig}
        />
      )}
    </div>
  );
}

export default App;
