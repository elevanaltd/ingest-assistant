import { useState, useEffect } from 'react';
import type { FileMetadata, LexiconConfig, ShotType } from './types';
import { SettingsModal } from './components/SettingsModal';
import { Sidebar } from './components/Sidebar';
import { CommandPalette, type Command } from './components/CommandPalette';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
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

  // Legacy field (still used for backward compatibility when loading existing files)
  // @ts-expect-error - mainName is set but not directly read (used for legacy data migration)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [mainName, setMainName] = useState<string>('');
  const [metadata, setMetadata] = useState<string>('');
  const [isAIConfigured, setIsAIConfigured] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [renameFileEnabled, setRenameFileEnabled] = useState<boolean>(false);
  const [mediaDataUrl, setMediaDataUrl] = useState<string>('');
  const [codecWarning, setCodecWarning] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [showSettings, setShowSettings] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [lexiconConfig, setLexiconConfig] = useState<LexiconConfig | undefined>();

  const currentFile = files[currentFileIndex];
  const canSave = Boolean(location && subject && shotType);

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
        .then(url => {
          console.log('[App] Received URL from IPC:', url);
          console.log('[App] File type:', currentFile.fileType);

          // Check for codec warning (format: "data:text/plain;base64,XXX|||http://...")
          if (url.includes('|||')) {
            const [warningPart, actualUrl] = url.split('|||');
            if (warningPart.startsWith('data:text/plain;base64,')) {
              const base64 = warningPart.replace('data:text/plain;base64,', '');
              const warning = atob(base64);
              console.warn('[App] Codec warning:', warning);
              setCodecWarning(warning);
              setMediaDataUrl(actualUrl);
            } else {
              setCodecWarning('');
              setMediaDataUrl(url);
            }
          } else {
            setCodecWarning('');
            setMediaDataUrl(url);
          }
        })
        .catch(error => {
          console.error('Failed to load media:', error);
          setMediaDataUrl('');
          setCodecWarning('');
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
      // Build title from structured components
      let generatedTitle = '';
      if (location && subject && shotType) {
        // Structured naming: 4-part for videos (with action), 3-part for photos (without action)
        if (currentFile.fileType === 'video' && action) {
          generatedTitle = `${location}-${subject}-${action}-${shotType}`;
        } else {
          generatedTitle = `${location}-${subject}-${shotType}`;
        }
        setMainName(generatedTitle); // Update mainName state for consistency
      }

      // Build metadata tags array
      const metadataTags = metadata
        .split(',')
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0);

      // Save title and metadata with structured components
      const structuredData = location && subject && shotType ? { location, subject, action, shotType } : undefined;

      // Only rename file if toggle is enabled
      if (renameFileEnabled && generatedTitle && generatedTitle !== currentFile.mainName) {
        console.log('[App] Renaming file with:', {
          fileId: currentFile.id,
          generatedTitle,
          structuredData
        });
        await window.electronAPI.renameFile(
          currentFile.id,
          generatedTitle,
          currentFile.filePath,
          structuredData
        );
        // Update metadata tags after renaming
        await window.electronAPI.updateMetadata(currentFile.id, metadataTags);
      } else if (structuredData) {
        // File rename disabled - save everything via updateStructuredMetadata
        console.log('[App] Saving title and metadata as XMP only (file not renamed)');
        await window.electronAPI.updateStructuredMetadata(
          currentFile.id,
          structuredData,
          currentFile.filePath,
          currentFile.fileType as 'image' | 'video'
        );
        // Update metadata tags
        await window.electronAPI.updateMetadata(currentFile.id, metadataTags);
      }

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

  // Define command palette commands (after all handlers are declared)
  const commands: Command[] = [
    {
      id: 'save',
      label: 'Save metadata',
      shortcut: 'Cmd+S',
      action: handleSave,
    },
    {
      id: 'ai-assist',
      label: 'AI assist',
      shortcut: 'Cmd+I',
      action: handleAIAssist,
    },
    {
      id: 'next',
      label: 'Next file',
      shortcut: '→',
      action: handleNext,
    },
    {
      id: 'previous',
      label: 'Previous file',
      shortcut: '←',
      action: handlePrevious,
    },
    {
      id: 'settings',
      label: 'Settings',
      shortcut: '',
      action: handleOpenSettings,
    },
  ];

  // Setup keyboard shortcuts (must be unconditional per React hooks rules)
  useKeyboardShortcuts({
    onSave: handleSave,
    onAIAssist: handleAIAssist,
    onNext: handleNext,
    onPrevious: handlePrevious,
    onCommandPalette: () => setShowCommandPalette(true),
    isLoading,
    canSave,
  });

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
                  onLoadStart={() => console.log('[Video] Load started')}
                  onLoadedMetadata={() => console.log('[Video] Metadata loaded')}
                  onLoadedData={() => console.log('[Video] Data loaded')}
                  onCanPlay={() => console.log('[Video] Can play')}
                  onError={(e) => {
                    console.error('[Video] Error event:', e);
                    const video = e.currentTarget;
                    console.error('[Video] Error details:', {
                      error: video.error,
                      code: video.error?.code,
                      message: video.error?.message,
                      src: video.src,
                      networkState: video.networkState,
                      readyState: video.readyState
                    });
                  }}
                />
              )
            ) : (
              <div style={{ color: '#999' }}>Loading media...</div>
            )}
          </div>

          <div className="form">
            {/* Row 1: ID, Location, Subject, Action, Shot Type */}
            <div className="form-row" style={{ display: 'flex', gap: '8px', flexWrap: 'nowrap' }}>
              <div className="form-group" style={{ flex: '0 0 70px', minWidth: 0 }}>
                <label style={{ fontSize: '13px' }}>ID</label>
                <input
                  type="text"
                  value={currentFile.id}
                  readOnly
                  className="input-readonly"
                  style={{ fontSize: '12px', padding: '4px 6px' }}
                />
              </div>

              <div className="form-group" style={{ flex: '1 1 0', minWidth: 0 }}>
                <label style={{ fontSize: '13px' }}>Location</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="kitchen"
                  className="input"
                  style={{ fontSize: '13px', padding: '4px 8px' }}
                />
              </div>

              <div className="form-group" style={{ flex: '1 1 0', minWidth: 0 }}>
                <label style={{ fontSize: '13px' }}>Subject</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="wine-cooler"
                  className="input"
                  style={{ fontSize: '13px', padding: '4px 8px' }}
                />
              </div>

              <div className="form-group" style={{ flex: '1 1 0', minWidth: 0 }}>
                <label style={{ fontSize: '13px' }}>Action</label>
                <input
                  type="text"
                  value={action}
                  onChange={(e) => setAction(e.target.value)}
                  placeholder="cleaning"
                  disabled={currentFile.fileType === 'image'}
                  className="input"
                  style={{
                    fontSize: '13px',
                    padding: '4px 8px',
                    opacity: currentFile.fileType === 'image' ? 0.5 : 1,
                    cursor: currentFile.fileType === 'image' ? 'not-allowed' : 'text'
                  }}
                />
              </div>

              <div className="form-group" style={{ flex: '0 0 100px', minWidth: 0 }}>
                <label style={{ fontSize: '13px' }}>Shot Type</label>
                <select
                  value={shotType}
                  onChange={(e) => setShotType(e.target.value as ShotType)}
                  className="input"
                  style={{ fontSize: '13px', padding: '4px 6px' }}
                >
                  <option value="">Select...</option>
                  <optgroup label="Static">
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

            {/* Row 2: Generated Title, Metadata, Rename Toggle, Save, AI Assist */}
            <div className="form-row" style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'nowrap' }}>
              <div className="form-group" style={{ flex: '0 0 240px', minWidth: 0 }}>
                <label style={{ fontSize: '13px' }}>Generated Title</label>
                <div style={{
                  padding: '5px 8px',
                  background: '#f5f5f5',
                  borderRadius: '4px',
                  fontFamily: 'monospace',
                  fontSize: '12px',
                  height: '28px',
                  display: 'flex',
                  alignItems: 'center',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {location && subject && shotType
                    ? `${location}-${subject}-${currentFile.fileType === 'video' && action ? `${action}-` : ''}${shotType}`
                    : <span style={{ color: '#999', fontFamily: 'sans-serif' }}>Fill fields above...</span>
                  }
                </div>
              </div>

              <div className="form-group" style={{ flex: '1 1 0', minWidth: 0 }}>
                <label style={{ fontSize: '13px' }}>Metadata</label>
                <input
                  type="text"
                  value={metadata}
                  onChange={(e) => setMetadata(e.target.value)}
                  placeholder="built-in, wine cooler, bar-area"
                  className="input"
                  style={{ fontSize: '13px', padding: '4px 8px' }}
                />
              </div>

              <div className="form-group" style={{ flex: '0 0 110px', minWidth: 0 }}>
                <label style={{ fontSize: '13px' }}>Rename File</label>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  height: '28px',
                  cursor: 'pointer',
                  userSelect: 'none'
                }}>
                  <input
                    type="checkbox"
                    checked={renameFileEnabled}
                    onChange={(e) => setRenameFileEnabled(e.target.checked)}
                    style={{ cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: '12px' }}>Add ID Prefix</span>
                </label>
              </div>

              <div className="form-group" style={{ flex: '0 0 80px', minWidth: 0 }}>
                <label style={{ fontSize: '13px' }}>&nbsp;</label>
                <button
                  onClick={handleSave}
                  disabled={isLoading || (!location || !subject || !shotType)}
                  className="btn-primary"
                  style={{ width: '100%', fontSize: '13px', padding: '5px 8px' }}
                >
                  {isLoading ? 'Saving...' : 'Save'}
                </button>
              </div>

              {isAIConfigured && (
                <div className="form-group" style={{ flex: '0 0 95px', minWidth: 0 }}>
                  <label style={{ fontSize: '13px' }}>&nbsp;</label>
                  <button
                    onClick={handleAIAssist}
                    disabled={isLoading}
                    className="btn-secondary"
                    style={{ width: '100%', fontSize: '13px', padding: '5px 8px' }}
                  >
                    {isLoading ? 'Analyzing...' : 'AI Assist'}
                  </button>
                </div>
              )}
            </div>

            {/* Combined status messages and navigation row */}
            <div style={{
              minHeight: '40px',
              marginTop: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px'
            }}>
              {/* Left: Previous button */}
              <button
                onClick={handlePrevious}
                disabled={currentFileIndex === 0}
                className="btn"
                style={{
                  flex: '0 0 80px',
                  fontSize: '13px',
                  padding: '6px 12px'
                }}
              >
                Previous
              </button>

              {/* Center: Status messages */}
              <div style={{
                flex: '1 1 auto',
                display: 'flex',
                gap: '12px',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: 0
              }}>
                {statusMessage && (
                  <div className={`status-message ${statusMessage.startsWith('✗') ? 'error' : 'success'}`} style={{ margin: 0 }}>
                    {statusMessage}
                  </div>
                )}
                {codecWarning && (
                  <div style={{
                    backgroundColor: '#fff3cd',
                    border: '1px solid #ffc107',
                    borderRadius: '4px',
                    padding: '6px 12px',
                    color: '#856404',
                    fontSize: '13px',
                    display: 'inline-block',
                    whiteSpace: 'nowrap'
                  }}>
                    {codecWarning}
                  </div>
                )}
              </div>

              {/* Right: Next button */}
              <button
                onClick={handleNext}
                disabled={currentFileIndex === files.length - 1}
                className="btn"
                style={{
                  flex: '0 0 80px',
                  fontSize: '13px',
                  padding: '6px 12px'
                }}
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

      <CommandPalette
        isOpen={showCommandPalette}
        onClose={() => setShowCommandPalette(false)}
        commands={commands}
      />
    </div>
  );
}

export default App;
