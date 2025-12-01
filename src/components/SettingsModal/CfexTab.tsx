interface CfexTabProps {
  cfexSource: string;
  setCfexSource: (value: string) => void;
  cfexPhotos: string;
  setCfexPhotos: (value: string) => void;
  cfexVideos: string;
  setCfexVideos: (value: string) => void;
  onBrowse: (field: 'source' | 'photos' | 'videos') => Promise<void>;
  onSave: () => Promise<void>;
  onClose: () => void;
  isSaving: boolean;
  saveSuccess: boolean;
  error: string;
}

export function CfexTab({
  cfexSource,
  setCfexSource,
  cfexPhotos,
  setCfexPhotos,
  cfexVideos,
  setCfexVideos,
  onBrowse,
  onSave,
  onClose,
  isSaving,
  saveSuccess,
  error
}: CfexTabProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <p style={{ color: '#666', marginTop: 0 }}>
        Configure default paths for CFEx card file transfers.
      </p>

      <div>
        <label htmlFor="cfexSource" style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
          Default Source Folder
        </label>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            id="cfexSource"
            type="text"
            value={cfexSource}
            onChange={(e) => setCfexSource(e.target.value)}
            placeholder="/Volumes/Untitled/DCIM/100_FUJI"
            style={{ flex: 1, padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
          />
          <button
            onClick={() => onBrowse('source')}
            style={{
              padding: '8px 16px',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Browse
          </button>
        </div>
        <small style={{ color: '#666' }}>CFEx card mount location (e.g., /Volumes/Untitled/DCIM/100_FUJI)</small>
      </div>

      <div>
        <label htmlFor="cfexPhotos" style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
          Default Photos Destination
        </label>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            id="cfexPhotos"
            type="text"
            value={cfexPhotos}
            onChange={(e) => setCfexPhotos(e.target.value)}
            placeholder="/Volumes/videos-current/2. WORKING PROJECTS/"
            style={{ flex: 1, padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
          />
          <button
            onClick={() => onBrowse('photos')}
            style={{
              padding: '8px 16px',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Browse
          </button>
        </div>
        <small style={{ color: '#666' }}>LucidLink folder for photos (subfolders created per project)</small>
      </div>

      <div>
        <label htmlFor="cfexVideos" style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
          Default Raw Videos Destination
        </label>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            id="cfexVideos"
            type="text"
            value={cfexVideos}
            onChange={(e) => setCfexVideos(e.target.value)}
            placeholder="/Volumes/EAV_Video_RAW/"
            style={{ flex: 1, padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
          />
          <button
            onClick={() => onBrowse('videos')}
            style={{
              padding: '8px 16px',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Browse
          </button>
        </div>
        <small style={{ color: '#666' }}>Ubuntu NFS mount for raw video archival</small>
      </div>

      {error && <div style={{ color: 'red' }}>{error}</div>}
      {saveSuccess && <div style={{ color: 'green' }}>✓ CFEx settings saved successfully!</div>}

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
        <button onClick={onClose} style={{ padding: '8px 16px' }}>
          Close
        </button>
        <button
          onClick={onSave}
          disabled={isSaving}
          style={{
            padding: '8px 16px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isSaving ? 'not-allowed' : 'pointer',
          }}
        >
          {isSaving ? 'Saving...' : 'Save CFEx Settings'}
        </button>
      </div>
    </div>
  );
}
