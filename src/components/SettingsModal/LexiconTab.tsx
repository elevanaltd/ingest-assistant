interface LexiconTabProps {
  pattern: string;
  setPattern: (value: string) => void;
  commonLocations: string;
  setCommonLocations: (value: string) => void;
  commonSubjects: string;
  setCommonSubjects: (value: string) => void;
  commonActions: string;
  setCommonActions: (value: string) => void;
  wordPreferences: string;
  setWordPreferences: (value: string) => void;
  aiInstructions: string;
  setAiInstructions: (value: string) => void;
  goodExamples: string;
  setGoodExamples: (value: string) => void;
  badExamples: string;
  setBadExamples: (value: string) => void;
  onSave: () => Promise<void>;
  onClose: () => void;
  isSaving: boolean;
  saveSuccess: boolean;
  error: string;
}

export function LexiconTab({
  pattern,
  setPattern,
  commonLocations,
  setCommonLocations,
  commonSubjects,
  setCommonSubjects,
  commonActions,
  setCommonActions,
  wordPreferences,
  setWordPreferences,
  aiInstructions,
  setAiInstructions,
  goodExamples,
  setGoodExamples,
  badExamples,
  setBadExamples,
  onSave,
  onClose,
  isSaving,
  saveSuccess,
  error
}: LexiconTabProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <label htmlFor="pattern" style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
          Pattern
        </label>
        <input
          id="pattern"
          type="text"
          value={pattern}
          onChange={(e) => setPattern(e.target.value)}
          placeholder="{location}-{subject}-{shotType}"
          style={{ width: '100%', padding: '8px', border: '1px solid var(--color-border)', borderRadius: '4px' }}
        />
        <small style={{ color: 'var(--color-text-secondary)' }}>
          Photos: {'{location}-{subject}-{shotType}'} • Videos: {'{location}-{subject}-{action}-{shotType}'}
        </small>
      </div>

      <div>
        <label htmlFor="commonLocations" style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
          Common Locations (comma-separated)
        </label>
        <input
          id="commonLocations"
          type="text"
          value={commonLocations}
          onChange={(e) => setCommonLocations(e.target.value)}
          placeholder="kitchen, hall, utility, bath, building"
          style={{ width: '100%', padding: '8px', border: '1px solid var(--color-border)', borderRadius: '4px' }}
        />
      </div>

      <div>
        <label htmlFor="commonSubjects" style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
          Common Subjects (comma-separated)
        </label>
        <input
          id="commonSubjects"
          type="text"
          value={commonSubjects}
          onChange={(e) => setCommonSubjects(e.target.value)}
          placeholder="oven, sink, tap, dishwasher, shower"
          style={{ width: '100%', padding: '8px', border: '1px solid var(--color-border)', borderRadius: '4px' }}
        />
      </div>

      <div>
        <label htmlFor="commonActions" style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
          Common Actions (comma-separated, for videos)
        </label>
        <input
          id="commonActions"
          type="text"
          value={commonActions}
          onChange={(e) => setCommonActions(e.target.value)}
          placeholder="cleaning, installing, replacing, inspecting"
          style={{ width: '100%', padding: '8px', border: '1px solid var(--color-border)', borderRadius: '4px' }}
        />
      </div>

      <div>
        <label htmlFor="wordPreferences" style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
          Word Preferences (one per line: "from → to")
        </label>
        <textarea
          id="wordPreferences"
          value={wordPreferences}
          onChange={(e) => setWordPreferences(e.target.value)}
          placeholder={"faucet → tap\nstove → hob\ntrash → bin"}
          rows={3}
          style={{ width: '100%', padding: '8px', border: '1px solid var(--color-border)', borderRadius: '4px', fontFamily: 'monospace' }}
        />
      </div>

      <div>
        <label htmlFor="aiInstructions" style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
          AI Instructions
        </label>
        <textarea
          id="aiInstructions"
          value={aiInstructions}
          onChange={(e) => setAiInstructions(e.target.value)}
          placeholder="Use lowercase. Hyphens for multi-word terms. Photos use 3-part pattern. Videos use 4-part pattern with action."
          rows={3}
          style={{ width: '100%', padding: '8px', border: '1px solid var(--color-border)', borderRadius: '4px' }}
        />
      </div>

      <div>
        <label htmlFor="goodExamples" style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
          ✅ Good Examples (one per line)
        </label>
        <textarea
          id="goodExamples"
          value={goodExamples}
          onChange={(e) => setGoodExamples(e.target.value)}
          placeholder={"kitchen-oven-CU\nbath-shower-MID\nkitchen-dishwasher-cleaning-MID"}
          rows={3}
          style={{ width: '100%', padding: '8px', border: '1px solid var(--color-border)', borderRadius: '4px', fontFamily: 'monospace' }}
        />
      </div>

      <div>
        <label htmlFor="badExamples" style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
          ❌ Bad Examples (one per line: "wrong-example (reason)")
        </label>
        <textarea
          id="badExamples"
          value={badExamples}
          onChange={(e) => setBadExamples(e.target.value)}
          placeholder={"Kitchen-Oven-CU (mixed case)\nkitchen_oven_CU (underscores)\nkitchen-fridge freezer-CU (missing hyphen)"}
          rows={3}
          style={{ width: '100%', padding: '8px', border: '1px solid var(--color-border)', borderRadius: '4px', fontFamily: 'monospace' }}
        />
      </div>

      {error && <div style={{ color: 'var(--color-danger-text)' }}>{error}</div>}
      {saveSuccess && <div style={{ color: 'var(--color-success-text)' }}>✓ Lexicon settings saved successfully!</div>}

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
        <button onClick={onClose} style={{ padding: '8px 16px' }}>
          Cancel
        </button>
        <button
          onClick={onSave}
          disabled={isSaving}
          style={{
            padding: '8px 16px',
            backgroundColor: 'var(--color-accent)',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isSaving ? 'not-allowed' : 'pointer',
          }}
        >
          {isSaving ? 'Saving...' : 'Save Lexicon'}
        </button>
      </div>
    </div>
  );
}
