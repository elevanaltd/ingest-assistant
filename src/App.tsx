import { useState, useCallback } from 'react';
import { SettingsModal } from './components/SettingsModal';
import { CommandPalette, type Command } from './components/CommandPalette';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { CfexTransferWindow } from './components/CfexTransferWindow';
import { IngestTabContent } from './components/IngestTabContent';
import { useIngestSettings } from './contexts/IngestSettingsContext';
import { useFileList } from './contexts/FileListContext';
import { useMetadataForm } from './contexts/MetadataFormContext';
import './App.css';

function App() {
  // Consume contexts for keyboard shortcuts
  const { lexiconConfig, filenameRewrite, setFilenameRewrite } = useIngestSettings();
  const { folderPath, isFolderLoading, handleNext, handlePrevious, setFiles } = useFileList();
  const {
    location,
    subject,
    shotType,
    isLoading: isFormLoading,
    handleSave: handleFormSave,
    handleAIAssist: handleFormAIAssist,
  } = useMetadataForm();

  // Tab navigation state
  const [currentTab, setCurrentTab] = useState<'ingest' | 'cfex'>('ingest');
  const [showSettings, setShowSettings] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);

  const canSave = Boolean(location && subject && shotType);

  // Wrapper handlers for keyboard shortcuts
  const handleSave = async () => {
    await handleFormSave();
  };

  const handleAIAssist = async () => {
    await handleFormAIAssist();
  };

  const handleOpenSettings = () => {
    setShowSettings(true);
  };

  const handleSaveLexicon = async (config: import('./types').LexiconConfig) => {
    await window.electronAPI.lexicon.save(config);
  };

  const handleSettingsClose = () => {
    setShowSettings(false);
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
  }, [folderPath, setFiles]);

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
    isLoading: isFormLoading,
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
          {/* Tab Navigation */}
          <div style={{ display: 'flex', gap: '8px', marginRight: '12px' }}>
            <button
              onClick={() => setCurrentTab('ingest')}
              style={{
                padding: '6px 16px',
                fontSize: '13px',
                borderRadius: '4px',
                border: currentTab === 'ingest' ? '2px solid var(--color-accent)' : '1px solid var(--color-border)',
                backgroundColor: currentTab === 'ingest' ? 'var(--color-accent)' : 'var(--color-surface)',
                color: currentTab === 'ingest' ? 'white' : 'var(--color-text)',
                fontWeight: currentTab === 'ingest' ? 600 : 400,
                cursor: 'pointer'
              }}
            >
              File Ingestion
            </button>
            <button
              onClick={() => setCurrentTab('cfex')}
              style={{
                padding: '6px 16px',
                fontSize: '13px',
                borderRadius: '4px',
                border: currentTab === 'cfex' ? '2px solid var(--color-accent)' : '1px solid var(--color-border)',
                backgroundColor: currentTab === 'cfex' ? 'var(--color-accent)' : 'var(--color-surface)',
                color: currentTab === 'cfex' ? 'white' : 'var(--color-text)',
                fontWeight: currentTab === 'cfex' ? 600 : 400,
                cursor: 'pointer'
              }}
            >
              CFEx Transfer
            </button>
          </div>
          <button onClick={handleOpenSettings} className="settings-icon" title="Settings">
            ⚙️
          </button>
        </div>
      </header>

      {/* Conditional rendering based on current tab */}
      {currentTab === 'ingest' ? (
        <IngestTabContent
          onBatchComplete={handleBatchComplete}
        />
      ) : (
        <CfexTransferWindow />
      )}

      {showSettings && (
        <SettingsModal
          onClose={handleSettingsClose}
          onSave={handleSaveLexicon}
          initialConfig={lexiconConfig}
          filenameRewrite={filenameRewrite}
          onFilenameRewriteChange={setFilenameRewrite}
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
