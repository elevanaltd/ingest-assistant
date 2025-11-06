import { useState, useEffect } from 'react';
import type { LexiconConfig, TermMapping } from '../types';

interface SettingsModalProps {
  onClose: () => void;
  onSave: (config: LexiconConfig) => Promise<void>;
  initialConfig?: LexiconConfig;
}

export function SettingsModal({ onClose, onSave, initialConfig }: SettingsModalProps) {
  const [mappings, setMappings] = useState<TermMapping[]>([]);
  const [alwaysInclude, setAlwaysInclude] = useState<string>('');
  const [customInstructions, setCustomInstructions] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string>('');

  // Load initial config
  useEffect(() => {
    if (initialConfig) {
      setMappings(initialConfig.termMappings);
      setAlwaysInclude(initialConfig.alwaysInclude.join(', '));
      setCustomInstructions(initialConfig.customInstructions);
    } else {
      // Start with one empty row
      setMappings([{ preferred: '', excluded: '' }]);
    }
  }, [initialConfig]);

  const handleMappingChange = (index: number, field: 'preferred' | 'excluded', value: string) => {
    const newMappings = [...mappings];
    newMappings[index][field] = value;
    setMappings(newMappings);

    // If user is typing in the last row, add a new empty row
    if (index === mappings.length - 1 && value.trim()) {
      setMappings([...newMappings, { preferred: '', excluded: '' }]);
    }
  };

  const handleRemoveRow = (index: number) => {
    // Don't allow removing the last empty row
    if (mappings.length === 1) return;

    const newMappings = mappings.filter((_, i) => i !== index);
    setMappings(newMappings);
  };

  const handleSave = async () => {
    setError('');

    // Validate: Remove empty rows
    const validMappings = mappings.filter(
      m => m.preferred.trim() || m.excluded.trim()
    );

    // Parse alwaysInclude
    const alwaysIncludeArray = alwaysInclude
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0);

    const config: LexiconConfig = {
      termMappings: validMappings,
      alwaysInclude: alwaysIncludeArray,
      customInstructions: customInstructions.trim(),
    };

    setIsSaving(true);
    try {
      await onSave(config);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save lexicon');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>AI Lexicon Settings</h2>
          <button onClick={onClose} className="modal-close" title="Close">
            ×
          </button>
        </div>

        <div className="modal-body">
          <section className="settings-section">
            <h3>Word Preferences (what to call things)</h3>
            <p className="section-help">
              Define preferred terms and their alternatives to avoid
            </p>

            <table className="term-mapping-table">
              <thead>
                <tr>
                  <th>Use This</th>
                  <th>Don't Use (avoid)</th>
                  <th style={{ width: '40px' }}></th>
                </tr>
              </thead>
              <tbody>
                {mappings.map((mapping, index) => (
                  <tr key={index}>
                    <td>
                      <input
                        type="text"
                        value={mapping.preferred}
                        onChange={(e) => handleMappingChange(index, 'preferred', e.target.value)}
                        placeholder="e.g., bin"
                        className="input"
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        value={mapping.excluded}
                        onChange={(e) => handleMappingChange(index, 'excluded', e.target.value)}
                        placeholder="e.g., trash, garbage"
                        className="input"
                      />
                    </td>
                    <td>
                      {index < mappings.length - 1 && (
                        <button
                          onClick={() => handleRemoveRow(index)}
                          className="btn-icon"
                          title="Remove row"
                        >
                          ×
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="settings-section">
            <h3>Additional Terms (always good to use)</h3>
            <p className="section-help">
              Comma-separated list of generally preferred terms
            </p>
            <input
              type="text"
              value={alwaysInclude}
              onChange={(e) => setAlwaysInclude(e.target.value)}
              placeholder="e.g., manufacturer, model, category, brand"
              className="input input-wide"
            />
          </section>

          <section className="settings-section">
            <h3>AI Instructions (free-form guidance)</h3>
            <p className="section-help">
              Additional instructions for how AI should analyze images
            </p>
            <textarea
              value={customInstructions}
              onChange={(e) => setCustomInstructions(e.target.value)}
              placeholder="e.g., Always include 'oven' for oven items&#10;Add manufacturer to metadata&#10;Include model number if visible"
              className="textarea"
              rows={5}
            />
          </section>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button onClick={onClose} className="btn" disabled={isSaving}>
            Cancel
          </button>
          <button onClick={handleSave} className="btn-primary" disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Lexicon'}
          </button>
        </div>
      </div>
    </div>
  );
}
