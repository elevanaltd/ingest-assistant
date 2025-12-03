import { useState } from 'react'

/**
 * FolderPicker Component (Extracted Phase 8a)
 *
 * Presentational component for CFEx folder selection UI.
 *
 * Features:
 * - Source folder input with browse button
 * - Three destination inputs (photos, rawVideos, proxies)
 * - Enable/disable checkboxes for each destination
 * - Browse button timeout cleanup (60s) to prevent unhandled rejections
 * - Error display for folder picker failures
 *
 * System Ripples:
 * - Calls window.electronAPI.selectFolder for directory picking
 * - Invokes parent callbacks for path/enabled state changes
 * - No direct context consumption (parent passes all state)
 *
 * MIP Compliance:
 * - ESSENTIAL: Folder selection UI and user interactions
 * - MINIMAL: Local state only for UI concerns (isBrowsing, browseError)
 * - DELEGATED: Path state management to parent component
 */

export interface FolderPickerProps {
  sourcePath: string
  onSourceChange: (path: string) => void
  destinationPaths: {
    photos: string
    rawVideos: string
    proxies: string
  }
  onDestinationChange: (paths: { photos: string; rawVideos: string; proxies: string }) => void
  enabledDestinations: {
    photos: boolean
    rawVideos: boolean
    proxies: boolean
  }
  onEnabledDestinationsChange: (enabled: { photos: boolean; rawVideos: boolean; proxies: boolean }) => void
  disabled: boolean
}

export function FolderPicker({
  sourcePath,
  onSourceChange,
  destinationPaths,
  onDestinationChange,
  enabledDestinations,
  onEnabledDestinationsChange,
  disabled
}: FolderPickerProps) {
  const [isBrowsing, setIsBrowsing] = useState(false)
  const [browseError, setBrowseError] = useState<string | null>(null)
  const [createFolderError, setCreateFolderError] = useState<string | null>(null)

  async function handleBrowseWithTimeout(onSelect: (path: string) => void, startPath?: string) {
    setIsBrowsing(true)
    setBrowseError(null)

    // Track timeout ID for cleanup
    let timeoutId: NodeJS.Timeout | null = null

    try {
      // Race between folder selection and 60-second timeout
      const path = await Promise.race([
        window.electronAPI.selectFolder(startPath), // Pass current path as defaultPath
        new Promise<null>((_, reject) => {
          timeoutId = setTimeout(() => {
            reject(new Error('Folder picker timeout (60s). Disconnected volumes may cause delays.'))
          }, 60000)
        })
      ])

      // SUCCESS: Clean up timeout to prevent unhandled rejection
      if (timeoutId !== null) {
        clearTimeout(timeoutId)
      }

      if (path) {
        onSelect(path)
        setBrowseError(null)
      }
    } catch (error) {
      // ERROR: Clean up timeout before handling error
      if (timeoutId !== null) {
        clearTimeout(timeoutId)
      }

      const message = error instanceof Error ? error.message : 'Folder picker failed'
      setBrowseError(message)
      console.error('[FolderPicker] Browse failed:', error)
    } finally {
      setIsBrowsing(false)
    }
  }

  async function handleBrowseSource() {
    await handleBrowseWithTimeout(onSourceChange, sourcePath)
  }

  async function handleBrowsePhotos() {
    await handleBrowseWithTimeout((path) => onDestinationChange({ ...destinationPaths, photos: path }), destinationPaths.photos)
  }

  async function handleBrowseVideos() {
    await handleBrowseWithTimeout((path) => onDestinationChange({ ...destinationPaths, rawVideos: path }), destinationPaths.rawVideos)
  }

  async function handleBrowseProxies() {
    await handleBrowseWithTimeout((path) => onDestinationChange({ ...destinationPaths, proxies: path }), destinationPaths.proxies)
  }

  async function handleCreateFolder(
    basePath: string,
    onPathUpdate: (newPath: string) => void
  ) {
    setCreateFolderError(null)

    // Prompt user for folder name
    const folderName = window.prompt('Enter folder name:')

    // User cancelled
    if (!folderName) {
      return
    }

    try {
      const result = await window.electronAPI.createFolder(basePath, folderName)

      if (result.success && result.path) {
        // Success: Update the destination path to the newly created folder
        onPathUpdate(result.path)
        setCreateFolderError(null)
      } else {
        // Failed: Display error
        setCreateFolderError(result.error || 'Unknown error')
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create folder'
      setCreateFolderError(message)
    }
  }

  return (
    <div style={{ marginBottom: '20px' }}>
      {browseError && (
        <div style={{ marginBottom: '12px', padding: '8px', backgroundColor: '#f8d7da', borderRadius: '4px', fontSize: '13px', color: '#721c24' }}>
          <strong>Browse failed:</strong> {browseError}<br />
          <span style={{ fontSize: '12px' }}>Please type the path manually instead.</span>
        </div>
      )}
      {createFolderError && (
        <div style={{ marginBottom: '12px', padding: '8px', backgroundColor: '#f8d7da', borderRadius: '4px', fontSize: '13px', color: '#721c24' }}>
          <strong>Create folder failed:</strong> {createFolderError}
        </div>
      )}
      <div style={{ marginBottom: '12px' }}>
        <label htmlFor="source-folder" style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: 500 }}>
          Source Folder (CFEx Card)
        </label>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            id="source-folder"
            type="text"
            value={sourcePath}
            onChange={(e) => onSourceChange(e.target.value)}
            disabled={disabled}
            placeholder="/Volumes/CFExpress"
            style={{ flex: 1, padding: '6px 8px', fontSize: '13px' }}
          />
          <button
            onClick={handleBrowseSource}
            disabled={disabled || isBrowsing}
            style={{
              padding: '6px 16px',
              fontSize: '13px',
              backgroundColor: isBrowsing ? '#ffc107' : '#f0f0f0',
              border: '1px solid #ccc',
              borderRadius: '4px',
              cursor: (disabled || isBrowsing) ? 'not-allowed' : 'pointer'
            }}
          >
            {isBrowsing ? 'Opening...' : 'Browse...'}
          </button>
        </div>
      </div>

      <div style={{ marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px', gap: '8px' }}>
          <input
            id="photos-enabled"
            type="checkbox"
            checked={enabledDestinations.photos}
            onChange={(e) => onEnabledDestinationsChange({ ...enabledDestinations, photos: e.target.checked })}
            disabled={disabled}
            aria-label="Photos Destination (LucidLink)"
            style={{ cursor: disabled ? 'not-allowed' : 'pointer' }}
          />
          <label htmlFor="photos-dest" style={{ fontSize: '13px', fontWeight: 500 }}>
            Photos Destination (LucidLink)
          </label>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            id="photos-dest"
            type="text"
            value={destinationPaths.photos}
            onChange={(e) => onDestinationChange({ ...destinationPaths, photos: e.target.value })}
            disabled={disabled || !enabledDestinations.photos}
            placeholder="/Volumes/LucidLink/photos"
            style={{ flex: 1, padding: '6px 8px', fontSize: '13px', opacity: enabledDestinations.photos ? 1 : 0.6 }}
            aria-label="Photos destination path"
          />
          <button
            onClick={handleBrowsePhotos}
            disabled={disabled || isBrowsing || !enabledDestinations.photos}
            style={{
              padding: '6px 16px',
              fontSize: '13px',
              backgroundColor: isBrowsing ? '#ffc107' : '#f0f0f0',
              border: '1px solid #ccc',
              borderRadius: '4px',
              cursor: (disabled || isBrowsing || !enabledDestinations.photos) ? 'not-allowed' : 'pointer',
              opacity: enabledDestinations.photos ? 1 : 0.6
            }}
          >
            {isBrowsing ? 'Opening...' : 'Browse...'}
          </button>
          <button
            onClick={() => handleCreateFolder(destinationPaths.photos, (path) => onDestinationChange({ ...destinationPaths, photos: path }))}
            disabled={disabled || !enabledDestinations.photos}
            style={{
              padding: '6px 16px',
              fontSize: '13px',
              backgroundColor: '#e0f7fa',
              border: '1px solid #00acc1',
              borderRadius: '4px',
              cursor: (disabled || !enabledDestinations.photos) ? 'not-allowed' : 'pointer',
              opacity: enabledDestinations.photos ? 1 : 0.6
            }}
          >
            Create Folder
          </button>
        </div>
      </div>

      <div style={{ marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px', gap: '8px' }}>
          <input
            id="videos-enabled"
            type="checkbox"
            checked={enabledDestinations.rawVideos}
            onChange={(e) => onEnabledDestinationsChange({ ...enabledDestinations, rawVideos: e.target.checked })}
            disabled={disabled}
            aria-label="Raw Videos Destination (Ubuntu)"
            style={{ cursor: disabled ? 'not-allowed' : 'pointer' }}
          />
          <label htmlFor="videos-dest" style={{ fontSize: '13px', fontWeight: 500 }}>
            Raw Videos Destination (Ubuntu)
          </label>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            id="videos-dest"
            type="text"
            value={destinationPaths.rawVideos}
            onChange={(e) => onDestinationChange({ ...destinationPaths, rawVideos: e.target.value })}
            disabled={disabled || !enabledDestinations.rawVideos}
            placeholder="/Volumes/Ubuntu/videos-raw"
            style={{ flex: 1, padding: '6px 8px', fontSize: '13px', opacity: enabledDestinations.rawVideos ? 1 : 0.6 }}
          />
          <button
            onClick={handleBrowseVideos}
            disabled={disabled || isBrowsing || !enabledDestinations.rawVideos}
            style={{
              padding: '6px 16px',
              fontSize: '13px',
              backgroundColor: isBrowsing ? '#ffc107' : '#f0f0f0',
              border: '1px solid #ccc',
              borderRadius: '4px',
              cursor: (disabled || isBrowsing || !enabledDestinations.rawVideos) ? 'not-allowed' : 'pointer',
              opacity: enabledDestinations.rawVideos ? 1 : 0.6
            }}
          >
            {isBrowsing ? 'Opening...' : 'Browse...'}
          </button>
          <button
            onClick={() => handleCreateFolder(destinationPaths.rawVideos, (path) => onDestinationChange({ ...destinationPaths, rawVideos: path }))}
            disabled={disabled || !enabledDestinations.rawVideos}
            style={{
              padding: '6px 16px',
              fontSize: '13px',
              backgroundColor: '#e0f7fa',
              border: '1px solid #00acc1',
              borderRadius: '4px',
              cursor: (disabled || !enabledDestinations.rawVideos) ? 'not-allowed' : 'pointer',
              opacity: enabledDestinations.rawVideos ? 1 : 0.6
            }}
          >
            Create Folder
          </button>
        </div>
      </div>

      <div style={{ marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px', gap: '8px' }}>
          <input
            id="proxies-enabled"
            type="checkbox"
            checked={enabledDestinations.proxies}
            onChange={(e) => onEnabledDestinationsChange({ ...enabledDestinations, proxies: e.target.checked })}
            disabled={disabled}
            aria-label="Proxy Videos Destination (LucidLink)"
            style={{ cursor: disabled ? 'not-allowed' : 'pointer' }}
          />
          <label htmlFor="proxies-dest" style={{ fontSize: '13px', fontWeight: 500 }}>
            Proxy Videos Destination (LucidLink)
          </label>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            id="proxies-dest"
            type="text"
            value={destinationPaths.proxies}
            onChange={(e) => onDestinationChange({ ...destinationPaths, proxies: e.target.value })}
            disabled={disabled || !enabledDestinations.proxies}
            placeholder="/Volumes/LucidLink/videos-proxy"
            style={{ flex: 1, padding: '6px 8px', fontSize: '13px', opacity: enabledDestinations.proxies ? 1 : 0.6 }}
          />
          <button
            onClick={handleBrowseProxies}
            disabled={disabled || isBrowsing || !enabledDestinations.proxies}
            style={{
              padding: '6px 16px',
              fontSize: '13px',
              backgroundColor: isBrowsing ? '#ffc107' : '#f0f0f0',
              border: '1px solid #ccc',
              borderRadius: '4px',
              cursor: (disabled || isBrowsing || !enabledDestinations.proxies) ? 'not-allowed' : 'pointer',
              opacity: enabledDestinations.proxies ? 1 : 0.6
            }}
          >
            {isBrowsing ? 'Opening...' : 'Browse...'}
          </button>
          <button
            onClick={() => handleCreateFolder(destinationPaths.proxies, (path) => onDestinationChange({ ...destinationPaths, proxies: path }))}
            disabled={disabled || !enabledDestinations.proxies}
            style={{
              padding: '6px 16px',
              fontSize: '13px',
              backgroundColor: '#e0f7fa',
              border: '1px solid #00acc1',
              borderRadius: '4px',
              cursor: (disabled || !enabledDestinations.proxies) ? 'not-allowed' : 'pointer',
              opacity: enabledDestinations.proxies ? 1 : 0.6
            }}
          >
            Create Folder
          </button>
        </div>
      </div>
    </div>
  )
}
