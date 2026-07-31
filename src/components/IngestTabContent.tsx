import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import type { ShotType } from '../types';
import { Sidebar } from './Sidebar';
import { MediaViewer } from './MediaViewer';
import { BatchOperationsPanel } from './BatchOperationsPanel';
import { useIngestSettings } from '../contexts/IngestSettingsContext';
import { useFileList } from '../contexts/FileListContext';
import { useMetadataForm } from '../contexts/MetadataFormContext';

export interface IngestTabContentProps {
  onBatchComplete: () => Promise<void>;
}

export function IngestTabContent({
  onBatchComplete,
}: IngestTabContentProps) {
  // Consume contexts
  const { isAIConfigured, filenameRewrite } = useIngestSettings();

  const {
    folderPath,
    files,
    currentFileIndex,
    selectedFileIds,
    isFolderCompleted,
    handleSelectFolder,
    handleToggleSelection,
    handleNext,
    handlePrevious,
    handleCompleteFolder,
    handleReopenFolder,
    setFiles,
    setCurrentFileIndex,
  } = useFileList();

  const {
    location,
    subject,
    action,
    shotType,
    keywords,
    isLoading: isFormLoading,
    shotTypes,
    setLocation,
    setSubject,
    setAction,
    setShotType,
    setKeywords,
    handleSave: handleFormSave,
    handleAIAssist: handleFormAIAssist,
  } = useMetadataForm();

  // Local state
  const skipNextVideoLoadRef = useRef<boolean>(false);
  const latestRequestedFileRef = useRef<string>('');
  const [isLoadingMedia, setIsLoadingMedia] = useState(false);
  const [transcodeProgress, setTranscodeProgress] = useState<string>('');
  const [transcodePercentage, setTranscodePercentage] = useState<number>(0);
  const [mediaDataUrl, setMediaDataUrl] = useState<string>('');
  const [codecWarning, setCodecWarning] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<string>('');

  // Memoize currentFile
  const currentFile = useMemo(() => files[currentFileIndex], [files, currentFileIndex]);

  // Auto-dismiss status message after 3 seconds
  useEffect(() => {
    if (statusMessage) {
      const timer = setTimeout(() => setStatusMessage(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [statusMessage]);

  // Setup transcode progress listener
  useEffect(() => {
    if (window.electronAPI) {
      const cleanup = window.electronAPI.onTranscodeProgress((progress) => {
        setTranscodeProgress(progress.time);
        setTranscodePercentage(progress.percentage);
      });

      return cleanup;
    }
  }, []);

  // Load media preview when file changes
  useEffect(() => {
    if (!window.electronAPI || !currentFile) return;

    // Skip video reload after save to prevent unnecessary re-transcoding
    if (skipNextVideoLoadRef.current) {
      skipNextVideoLoadRef.current = false;
      return;
    }

    // Start loading
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoadingMedia(true);
    setTranscodeProgress('');
    setTranscodePercentage(0);

    // Capture current file path to guard against stale resolves
    const requestedFilePath = currentFile.filePath;

    // Update ref BEFORE async operation to track latest requested file
    latestRequestedFileRef.current = requestedFilePath;

    // Load file as data URL
    window.electronAPI.readFileAsDataUrl(requestedFilePath)
      .then(url => {
        // Guard against late resolves: check ref (not closure variable) for latest request
        if (latestRequestedFileRef.current !== requestedFilePath) {
          console.log('[IngestTabContent] Stale load detected, ignoring result for:', requestedFilePath);
          return;
        }

        console.log('[IngestTabContent] Received URL from IPC:', url);
        console.log('[IngestTabContent] File type:', currentFile.fileType);

        // Check for codec warning (format: "data:text/plain;base64,XXX|||http://...")
        if (url.includes('|||')) {
          const [warningPart, actualUrl] = url.split('|||');
          if (warningPart.startsWith('data:text/plain;base64,')) {
            const base64 = warningPart.replace('data:text/plain;base64,', '');
            const warning = atob(base64);
            console.warn('[IngestTabContent] Codec warning:', warning);
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
        // Guard against late resolves: check ref (not closure variable) for latest request
        if (latestRequestedFileRef.current !== requestedFilePath) {
          console.log('[IngestTabContent] Stale load detected, ignoring error for:', requestedFilePath);
          return;
        }

        console.error('Failed to load media:', error);
        setMediaDataUrl('');
        setCodecWarning('');
        setIsLoadingMedia(false);
        setTranscodeProgress('');
        setTranscodePercentage(0);
      });
  }, [currentFile]);

  // Wrapper to add status messages and skip video reload
  const handleSave = async () => {
    try {
      skipNextVideoLoadRef.current = true;
      await handleFormSave();
      setStatusMessage('✓ Saved successfully');
    } catch (error) {
      console.error('Save failed:', error);
      setStatusMessage('✗ Save failed: ' + (error instanceof Error ? error.message : error));
    }
  };

  // Wrapped handlers to add status messages
  const handleCompleteFolderWithStatus = async () => {
    try {
      await handleCompleteFolder();
      setStatusMessage('✓ Folder marked as COMPLETED (locked)');
    } catch (error) {
      console.error('Failed to complete folder:', error);
      setStatusMessage('✗ Failed to lock folder: ' + (error instanceof Error ? error.message : error));
    }
  };

  const handleReopenFolderWithStatus = async () => {
    try {
      await handleReopenFolder();
      setStatusMessage('✓ Folder reopened for editing');
    } catch (error) {
      console.error('Failed to reopen folder:', error);
      setStatusMessage('✗ Failed to unlock folder: ' + (error instanceof Error ? error.message : error));
    }
  };

  // Wrapper to add status message
  const handleAIAssist = async () => {
    try {
      await handleFormAIAssist();
      setStatusMessage('✓ AI Analysis complete!');
    } catch (error) {
      console.error('AI analysis failed:', error);
      setStatusMessage('✗ AI analysis failed: ' + (error instanceof Error ? error.message : error));
    }
  };

  const handleBatchCompleteInternal = useCallback(async () => {
    // Reload files after batch completion
    if (folderPath && window.electronAPI) {
      try {
        const updatedFiles = await window.electronAPI.loadFiles();
        setFiles(updatedFiles);

        // Call parent callback if provided
        await onBatchComplete();
      } catch (error) {
        console.error('Failed to reload files after batch:', error);
      }
    }
  }, [folderPath, setFiles, onBatchComplete]);

  return (
    <>
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
            <MediaViewer
              fileType={currentFile.fileType}
              filename={currentFile.currentFilename}
              mediaDataUrl={mediaDataUrl}
              isLoadingMedia={isLoadingMedia}
              codecWarning={codecWarning}
              transcodeProgress={transcodeProgress}
              transcodePercentage={transcodePercentage}
            />

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
                    background: 'var(--color-surface-secondary)',
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
                            <span style={{ color: 'var(--color-accent)', fontWeight: 'bold' }}>-#{currentFile.shotNumber}</span>
                          ) : (
                            <span style={{ color: 'var(--color-text-muted)', fontWeight: 'normal' }}>-[timestamp]</span>
                          )}
                        </>
                      )
                      : <span style={{ color: 'var(--color-text-muted)', fontFamily: 'sans-serif' }}>Fill fields above...</span>
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
                    disabled={isFormLoading || (!location || !subject || !shotType) || isFolderCompleted}
                    className="btn-primary"
                    style={{ width: '100%', fontSize: '13px', padding: '5px 8px' }}
                    title={isFolderCompleted ? 'Folder is locked - click REOPEN to edit' : ''}
                  >
                    {isFormLoading ? 'Saving...' : 'Save'}
                  </button>
                </div>

                {isAIConfigured && (
                  <div className="form-group" style={{ flex: '0 0 95px', minWidth: 0 }}>
                    <label style={{ fontSize: '13px' }}>&nbsp;</label>
                    <button
                      onClick={handleAIAssist}
                      disabled={isFormLoading || isFolderCompleted}
                      className="btn-secondary"
                      style={{ width: '100%', fontSize: '13px', padding: '5px 8px' }}
                      title={isFolderCompleted ? 'Folder is locked - click REOPEN to edit' : ''}
                    >
                      {isFormLoading ? 'Analyzing...' : 'AI Assist'}
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
                    color: 'var(--color-text)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {currentFile.currentFilename}
                    {currentFile.processedByAI && <span style={{ color: 'var(--color-text-secondary)', marginLeft: '4px' }}>(AI)</span>}
                  </div>

                  {/* Status messages */}
                  {statusMessage && (
                    <div className={`status-message ${statusMessage.startsWith('✗') ? 'error' : 'success'}`} style={{ margin: 0 }}>
                      {statusMessage}
                    </div>
                  )}
                  {codecWarning && (
                    <div style={{
                      backgroundColor: 'var(--color-warning-bg)',
                      border: '1px solid var(--color-warning)',
                      borderRadius: '4px',
                      padding: '6px 12px',
                      color: 'var(--color-warning-text)',
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
              filenameRewrite={filenameRewrite}
              currentFolderPath={folderPath}
              onBatchComplete={handleBatchCompleteInternal}
            />

            {/* Folder completion controls */}
            <div style={{
              marginTop: '16px',
              padding: '12px',
              borderTop: '1px solid var(--color-border)',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', textAlign: 'center' }}>
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
                    onClick={handleReopenFolderWithStatus}
                    className="btn"
                    style={{
                      width: '100%',
                      fontSize: '13px',
                      padding: '8px 12px',
                      backgroundColor: 'var(--color-success)',
                      color: 'white',
                      border: 'none'
                    }}
                    title="Unlock folder for editing"
                  >
                    REOPEN for Editing
                  </button>
                ) : (
                  <button
                    onClick={handleCompleteFolderWithStatus}
                    className="btn"
                    style={{
                      width: '100%',
                      fontSize: '13px',
                      padding: '8px 12px',
                      backgroundColor: 'var(--color-accent)',
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
    </>
  );
}
