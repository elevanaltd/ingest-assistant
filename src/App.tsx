import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import type { FileMetadata, LexiconConfig, ShotType } from './types';
import { SettingsModal } from './components/SettingsModal';
import { Sidebar } from './components/Sidebar';
import { CommandPalette, type Command } from './components/CommandPalette';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { BatchOperationsPanel } from './components/BatchOperationsPanel';
import './App.css';

function App() {
  const [folderPath, setFolderPath] = useState<string>('');
  const [files, setFiles] = useState<FileMetadata[]>([]);
  const [currentFileIndex, setCurrentFileIndex] = useState<number>(0);
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(new Set());
  const skipNextVideoLoadRef = useRef<boolean>(false);

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
  const [keywords, setKeywords] = useState<string>('');
  const [isAIConfigured, setIsAIConfigured] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMedia, setIsLoadingMedia] = useState(false);
  const [transcodeProgress, setTranscodeProgress] = useState<string>('');
  const [transcodePercentage, setTranscodePercentage] = useState<number>(0);
  const [mediaDataUrl, setMediaDataUrl] = useState<string>('');
  const [codecWarning, setCodecWarning] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [showSettings, setShowSettings] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [lexiconConfig, setLexiconConfig] = useState<LexiconConfig | undefined>();
  const [isFolderCompleted, setIsFolderCompleted] = useState(false);
  const [isFolderLoading, setIsFolderLoading] = useState(false);

  // Force re-render on window resize to ensure UI layout recalculates
  // Fixes issue where batch processing causes UI to stop responding to window resize
  const [, forceUpdate] = useState(0);

  // Memoize currentFile to stabilize dependencies for useEffect hooks
  // Prevents infinite loops while ensuring effects re-run when file data actually changes
  const currentFile = useMemo(() => files[currentFileIndex], [files, currentFileIndex]);
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

      // Listen for transcode progress events
      const cleanup = window.electronAPI.onTranscodeProgress((progress) => {
        setTranscodeProgress(progress.time);
        setTranscodePercentage(progress.percentage);
      });

      return cleanup;
    }
  }, []);

  // Handle window resize events to force React layout recalculation
  // This ensures UI responds to window resize after batch processing
  useEffect(() => {
    const handleResize = () => {
      // Force component re-render to recalculate layout
      forceUpdate(prev => prev + 1);
    };

    window.addEventListener('resize', handleResize);

    // Cleanup listener on unmount
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Effect 1: Update form fields when current file data changes
  // Memoized currentFile ensures this re-runs on cache reload (new file objects, same index)
  useEffect(() => {
    if (!currentFile) {
      setLocation('');
      setSubject('');
      setAction('');
      setShotType('');
      setMainName('');
      setKeywords('');
      return;
    }

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

    setKeywords(currentFile.keywords?.join(', ') || '');
  }, [currentFile, shotTypes]);

  // Effect 2: Load media preview when file changes
  // Depends on currentFile to handle cache reload scenario (new file objects, same index)
  // Separated from form sync to prevent unnecessary media reloads when only form data updates
  useEffect(() => {
    if (!window.electronAPI || !currentFile) return;

    // Skip video reload after save to prevent unnecessary re-transcoding
    if (skipNextVideoLoadRef.current) {
      skipNextVideoLoadRef.current = false;
      return;
    }

    // Start loading
    setIsLoadingMedia(true);
    setTranscodeProgress('');
    setTranscodePercentage(0);

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

        // Done loading
        setIsLoadingMedia(false);
        setTranscodeProgress('');
        setTranscodePercentage(0);
      })
      .catch(error => {
        console.error('Failed to load media:', error);
        setMediaDataUrl('');
        setCodecWarning('');
        setIsLoadingMedia(false);
        setTranscodeProgress('');
        setTranscodePercentage(0);
      });
  }, [currentFile]);

  const handleSelectFolder = async () => {
    if (!window.electronAPI) return;
    const path = await window.electronAPI.selectFolder();
    if (path) {
      setIsFolderLoading(true);
      try {
        setFolderPath(path);
        const loadedFiles = await window.electronAPI.loadFiles();
        setFiles(loadedFiles);
        setCurrentFileIndex(0);
        // Clear selection when switching folders
        setSelectedFileIds(new Set());

        // Load folder completion status
        try {
          const completed = await window.electronAPI.getFolderCompleted();
          setIsFolderCompleted(completed);
        } catch (error) {
          console.error('Failed to load folder completion status:', error);
          // Default to false (editable) if there's an error
          setIsFolderCompleted(false);
        }
      } finally {
        setIsFolderLoading(false);
      }
    }
  };

  const handleToggleSelection = (fileId: string, selected: boolean) => {
    setSelectedFileIds(prev => {
      const newSelection = new Set(prev);
      if (selected) {
        newSelection.add(fileId);
      } else {
        newSelection.delete(fileId);
      }
      return newSelection;
    });
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
      const metadataTags = keywords
        .split(',')
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0);

      // Save title and metadata with structured components
      const structuredData = location && subject && shotType ? { location, subject, action, shotType } : undefined;

      // Save everything via updateStructuredMetadata (file renaming disabled)
      if (structuredData) {
        console.log('[App] Saving title and metadata as XMP only (file not renamed)');
        await window.electronAPI.updateStructuredMetadata(
          currentFile.id,
          structuredData,
          currentFile.filePath,
          currentFile.fileType as 'image' | 'video'
        );
        // Update metadata tags
        await window.electronAPI.updateMetadata(currentFile.id, metadataTags);
      } else {
        // Legacy path: Just update metadata if no structured data
        await window.electronAPI.updateMetadata(currentFile.id, metadataTags);
      }

      // File not renamed - update in place without reloading to avoid re-transcoding video
      {
        skipNextVideoLoadRef.current = true;

        const updatedFiles = files.map(f => {
          if (f.id === currentFileId) {
            return {
              ...f,
              // Preserve mainName with timestamp (backend is authoritative source)
              // Backend adds timestamp during save, don't overwrite with client-side generatedTitle
              keywords: metadataTags,
              location,
              subject,
              action: action || '',
              shotType: shotType as ShotType || '',
            };
          }
          return f;
        });
        setFiles(updatedFiles);
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

  const handleCompleteFolder = async () => {
    if (!folderPath) return;

    try {
      await window.electronAPI.setFolderCompleted(true);
      setIsFolderCompleted(true);
      setStatusMessage('✓ Folder marked as COMPLETED (locked)');
    } catch (error) {
      console.error('Failed to complete folder:', error);
      setStatusMessage('✗ Failed to lock folder: ' + (error instanceof Error ? error.message : error));
    }
  };

  const handleReopenFolder = async () => {
    if (!folderPath) return;

    try {
      await window.electronAPI.setFolderCompleted(false);
      setIsFolderCompleted(false);
      setStatusMessage('✓ Folder reopened for editing');
    } catch (error) {
      console.error('Failed to reopen folder:', error);
      setStatusMessage('✗ Failed to unlock folder: ' + (error instanceof Error ? error.message : error));
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

      setKeywords(result.keywords?.join(', ') || '');
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

  const handleBatchComplete = useCallback(async () => {
    // Reload files after batch completion
    if (folderPath && window.electronAPI) {
      try {
        const updatedFiles = await window.electronAPI.loadFiles();
        setFiles(updatedFiles);
      } catch (error) {
        console.error('Failed to reload files after batch:', error);
      }
    }
  }, [folderPath]); // Only recreate if folderPath changes

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

  return (
    <div className="app">
      {/* Folder loading overlay */}
      {isFolderLoading && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '20px',
          zIndex: 9999
        }}>
          {/* Spinner */}
          <div style={{
            border: '6px solid rgba(255, 255, 255, 0.3)',
            borderTop: '6px solid #fff',
            borderRadius: '50%',
            width: '60px',
            height: '60px',
            animation: 'spin 1s linear infinite'
          }} />

          {/* Loading message */}
          <div style={{
            color: '#fff',
            fontSize: '18px',
            fontWeight: 600,
            textShadow: '0 2px 4px rgba(0,0,0,0.5)'
          }}>
            Loading folder and sorting files...
          </div>

          <div style={{
            color: '#ccc',
            fontSize: '14px',
            textAlign: 'center',
            maxWidth: '400px'
          }}>
            Reading EXIF timestamps and assigning sequential shot numbers
          </div>
        </div>
      )}

      <header className="header">
        <h1>Ingest Assistant</h1>
        <div className="header-buttons">
          <button onClick={handleOpenSettings} className="settings-icon" title="Settings">
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
          selectedFileIds={selectedFileIds}
          onToggleSelection={handleToggleSelection}
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

            {/* Loading overlay with dim effect and progress */}
            {isLoadingMedia && (
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)', // Safari support
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '16px',
                zIndex: 10
              }}>
                {/* Spinner */}
                <div style={{
                  border: '4px solid rgba(255, 255, 255, 0.3)',
                  borderTop: '4px solid #fff',
                  borderRadius: '50%',
                  width: '48px',
                  height: '48px',
                  animation: 'spin 1s linear infinite'
                }} />

                {/* Progress text */}
                <div style={{
                  color: '#fff',
                  fontSize: '14px',
                  fontWeight: 500,
                  textShadow: '0 1px 3px rgba(0,0,0,0.5)'
                }}>
                  {transcodeProgress ? `Transcoding: ${transcodePercentage}%` : 'Loading...'}
                </div>

                {/* Progress bar */}
                {transcodeProgress && (
                  <div style={{
                    width: '200px',
                    height: '4px',
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    borderRadius: '2px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      height: '100%',
                      backgroundColor: '#fff',
                      width: '100%',
                      animation: 'progress-slide 1.5s ease-in-out infinite'
                    }} />
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="form">
            {/* Row 1: ID, Shot#, Location, Subject, Action, Shot Type */}
            <div className="form-row" style={{ display: 'flex', gap: '8px', flexWrap: 'nowrap' }}>
              <div className="form-group" style={{ flex: '0 0 77px', minWidth: 0 }}>
                <label style={{ fontSize: '13px' }}>ID</label>
                <input
                  type="text"
                  value={currentFile.id}
                  readOnly
                  className="input-readonly"
                  style={{ fontSize: '12px', padding: '4px 6px' }}
                />
              </div>

              <div className="form-group" style={{ flex: '0 0 60px', minWidth: 0 }}>
                <label style={{ fontSize: '13px' }}>Shot #</label>
                <input
                  type="text"
                  value={currentFile.shotNumber !== undefined ? `#${currentFile.shotNumber}` : ''}
                  readOnly
                  className="input-readonly"
                  style={{ fontSize: '12px', padding: '4px 6px', textAlign: 'center' }}
                  title={currentFile.shotNumber !== undefined ? `Sequential shot number: ${currentFile.shotNumber}` : 'No shot number assigned'}
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
                  readOnly={isFolderCompleted}
                  disabled={isFolderCompleted}
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
                  readOnly={isFolderCompleted}
                  disabled={isFolderCompleted}
                />
              </div>

              <div className="form-group" style={{ flex: '1 1 0', minWidth: 0 }}>
                <label style={{ fontSize: '13px' }}>Action</label>
                <input
                  type="text"
                  value={action}
                  onChange={(e) => setAction(e.target.value)}
                  placeholder="cleaning"
                  disabled={currentFile.fileType === 'image' || isFolderCompleted}
                  className="input"
                  style={{
                    fontSize: '13px',
                    padding: '4px 8px',
                    opacity: (currentFile.fileType === 'image' || isFolderCompleted) ? 0.5 : 1,
                    cursor: (currentFile.fileType === 'image' || isFolderCompleted) ? 'not-allowed' : 'text'
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
                  disabled={isFolderCompleted}
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

            {/* Row 2: Generated Title, Metadata, Save, AI Assist */}
            <div className="form-row" style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'nowrap' }}>
              <div className="form-group" style={{ flex: '0 0 360px', minWidth: 0 }}>
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
                    ? (
                      <>
                        <span>{`${location}-${subject}-${currentFile.fileType === 'video' && action ? `${action}-` : ''}${shotType}`}</span>
                        {currentFile.shotNumber !== undefined ? (
                          <span style={{ color: '#0066cc', fontWeight: 'bold' }}>-#{currentFile.shotNumber}</span>
                        ) : (
                          <span style={{ color: '#999', fontWeight: 'normal' }}>-[timestamp]</span>
                        )}
                      </>
                    )
                    : <span style={{ color: '#999', fontFamily: 'sans-serif' }}>Fill fields above...</span>
                  }
                </div>
              </div>

              <div className="form-group" style={{ flex: '1 1 0', minWidth: '200px' }}>
                <label style={{ fontSize: '13px' }}>Metadata</label>
                <input
                  type="text"
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                  placeholder="built-in, wine cooler, bar-area"
                  className="input"
                  style={{ fontSize: '13px', padding: '4px 8px' }}
                  readOnly={isFolderCompleted}
                  disabled={isFolderCompleted}
                />
              </div>

              <div className="form-group" style={{ flex: '0 0 80px', minWidth: 0 }}>
                <label style={{ fontSize: '13px' }}>&nbsp;</label>
                <button
                  onClick={handleSave}
                  disabled={isLoading || (!location || !subject || !shotType) || isFolderCompleted}
                  className="btn-primary"
                  style={{ width: '100%', fontSize: '13px', padding: '5px 8px' }}
                  title={isFolderCompleted ? 'Folder is locked - click REOPEN to edit' : ''}
                >
                  {isLoading ? 'Saving...' : 'Save'}
                </button>
              </div>

              {isAIConfigured && (
                <div className="form-group" style={{ flex: '0 0 95px', minWidth: 0 }}>
                  <label style={{ fontSize: '13px' }}>&nbsp;</label>
                  <button
                    onClick={handleAIAssist}
                    disabled={isLoading || isFolderCompleted}
                    className="btn-secondary"
                    style={{ width: '100%', fontSize: '13px', padding: '5px 8px' }}
                    title={isFolderCompleted ? 'Folder is locked - click REOPEN to edit' : ''}
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

              {/* Center: Filename and status messages */}
              <div style={{
                flex: '1 1 auto',
                display: 'flex',
                gap: '12px',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: 0
              }}>
                {/* Current filename */}
                <div style={{
                  fontSize: '13px',
                  color: '#333',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  {currentFile.currentFilename}
                  {currentFile.processedByAI && <span style={{ color: '#666', marginLeft: '4px' }}>(AI)</span>}
                </div>

                {/* Status messages */}
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

        {/* Batch Operations Panel - Right Side */}
        {folderPath && isAIConfigured && (
          <div className="batch-panel-right">
            <BatchOperationsPanel
              availableFiles={files.map(f => ({
                id: f.id,
                filename: f.currentFilename,
                processedByAI: f.processedByAI,
              }))}
              selectedFileIds={selectedFileIds}
              onBatchComplete={handleBatchComplete}
            />

            {/* Folder completion controls */}
            <div style={{
              marginTop: '16px',
              padding: '12px',
              borderTop: '1px solid #ddd',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              <div style={{ fontSize: '13px', color: '#666', textAlign: 'center' }}>
                {isFolderCompleted ? (
                  <span style={{ fontWeight: 500 }}>
                    🔒 Folder COMPLETED (locked)
                  </span>
                ) : (
                  <span>Folder open for editing</span>
                )}
              </div>
              <div>
                {isFolderCompleted ? (
                  <button
                    onClick={handleReopenFolder}
                    className="btn"
                    style={{
                      width: '100%',
                      fontSize: '13px',
                      padding: '8px 12px',
                      backgroundColor: '#28a745',
                      color: 'white',
                      border: 'none'
                    }}
                    title="Unlock folder for editing"
                  >
                    REOPEN for Editing
                  </button>
                ) : (
                  <button
                    onClick={handleCompleteFolder}
                    className="btn"
                    style={{
                      width: '100%',
                      fontSize: '13px',
                      padding: '8px 12px',
                      backgroundColor: '#007bff',
                      color: 'white',
                      border: 'none'
                    }}
                    title="Mark folder as complete and lock for editing"
                  >
                    COMPLETE (Lock Folder)
                  </button>
                )}
              </div>
            </div>
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
