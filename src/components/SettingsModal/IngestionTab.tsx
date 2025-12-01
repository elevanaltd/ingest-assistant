import { PROXY_PRESETS } from '../../../electron/services/proxyPresets';

interface IngestionTabProps {
  aiAutoAnalyze: boolean;
  setAiAutoAnalyze: (value: boolean) => void;
  metadataWrite: boolean;
  setMetadataWrite: (value: boolean) => void;
  filenameRewrite: boolean;
  onFilenameRewriteChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  filenameTemplate: string;
  setFilenameTemplate: (value: string) => void;
  proxyPresetId: string;
  setProxyPresetId: (value: string) => void;
  onSave: () => Promise<void>;
  onClose: () => void;
  isSaving: boolean;
  saveSuccess: boolean;
  error: string;
}

export function IngestionTab({
  aiAutoAnalyze,
  setAiAutoAnalyze,
  metadataWrite,
  setMetadataWrite,
  filenameRewrite,
  onFilenameRewriteChange,
  filenameTemplate,
  setFilenameTemplate,
  proxyPresetId,
  setProxyPresetId,
  onSave,
  onClose,
  isSaving,
  saveSuccess,
  error
}: IngestionTabProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <p style={{ color: '#666', marginTop: 0 }}>
        Configure automation for file ingestion operations. These settings apply to all ingestion workflows.
      </p>

      {/* Power Features - Toggles */}
      <div>
        <h3 style={{ marginTop: 0, marginBottom: '16px', fontSize: '16px' }}>Power Features</h3>
        <p style={{ color: '#666', fontSize: '14px', marginBottom: '16px' }}>
          All features default to OFF (I7 Human Primacy - human judgment has final authority).
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* AI Auto-Analyze Toggle */}
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={aiAutoAnalyze}
              onChange={(e) => setAiAutoAnalyze(e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
            <span style={{ fontSize: '14px' }}>AI Auto-Analyze after transfer</span>
          </label>
          <small style={{ color: '#666', marginLeft: '24px', marginTop: '-8px', display: 'block' }}>
            Automatically run AI analysis on transferred files
          </small>

          {/* Metadata Write Toggle */}
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={metadataWrite}
              onChange={(e) => setMetadataWrite(e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
            <span style={{ fontSize: '14px' }}>Write metadata to files (shotName, LogComment, Description, TapeName)</span>
          </label>
          <small style={{ color: '#666', marginLeft: '24px', marginTop: '-8px', display: 'block' }}>
            Embed XMP metadata directly into file headers
          </small>

          {/* Filename Rewrite Toggle */}
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={filenameRewrite}
              onChange={onFilenameRewriteChange}
              style={{ cursor: 'pointer' }}
            />
            <span style={{ fontSize: '14px' }}>Rename files using template</span>
          </label>
          <small style={{ color: '#666', marginLeft: '24px', marginTop: '-8px', display: 'block' }}>
            Rename files based on metadata template (preserves original via TapeName)
          </small>

          {/* Filename Template Input (conditional) */}
          {filenameRewrite && (
            <div style={{ marginLeft: '24px', marginTop: '8px' }}>
              <label htmlFor="filenameTemplateIngestion" style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: 'bold' }}>
                Filename Template
              </label>
              <input
                id="filenameTemplateIngestion"
                type="text"
                value={filenameTemplate}
                onChange={(e) => setFilenameTemplate(e.target.value)}
                placeholder="{location}-{subject}-{action}-{shotType}"
                style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', fontFamily: 'monospace' }}
              />
              <small style={{ color: '#666', display: 'block', marginTop: '4px' }}>
                Available tokens: {'{location}'}, {'{subject}'}, {'{action}'}, {'{shotType}'}
              </small>
            </div>
          )}
        </div>
      </div>

      {/* Proxy Format Selection */}
      <div>
        <h3 style={{ marginTop: 0, marginBottom: '16px', fontSize: '16px' }}>Proxy Format</h3>
        <p style={{ color: '#666', fontSize: '14px', marginBottom: '16px' }}>
          Select the format for generated proxy files (used for editing workflow).
        </p>

        <div>
          <label htmlFor="proxyFormat" style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
            Proxy Format
          </label>
          <select
            id="proxyFormat"
            value={proxyPresetId}
            onChange={(e) => setProxyPresetId(e.target.value)}
            style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
          >
            {PROXY_PRESETS.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.name}
              </option>
            ))}
          </select>
          <small style={{ color: '#666', display: 'block', marginTop: '4px' }}>
            {PROXY_PRESETS.find(p => p.id === proxyPresetId)?.description}
          </small>
        </div>
      </div>

      {error && <div style={{ color: 'red' }}>{error}</div>}
      {saveSuccess && <div style={{ color: 'green' }}>✓ Ingestion settings saved successfully!</div>}

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
          {isSaving ? 'Saving...' : 'Save Ingestion Settings'}
        </button>
      </div>
    </div>
  );
}
