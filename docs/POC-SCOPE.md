# Ingest Assistant UXP Panel - POC Scope & Success Criteria

## Purpose

Validate the core UXP→Premiere Pro integration with **minimal features** before committing to full development.

**Goal:** Prove that UXP panel can solve the core workflow problem (editing metadata on offline clips).

**Timeline:** 1-2 days maximum

---

## What's IN Scope (POC)

### Feature 1: Panel Loads in Premiere Pro
```
✓ UXP manifest configured correctly
✓ Panel appears in Window → Extensions menu
✓ Panel docks in PP workspace
✓ Basic UI renders (React component)
```

### Feature 2: Read Selected Clip
```
✓ Detect clip selection in Project Panel/Timeline
✓ Extract clip name (for Asset ID display)
✓ Read existing Description metadata
✓ Display in text field
```

### Feature 3: Edit & Save Description
```
✓ User edits Description text field
✓ Click "Save" button
✓ Write to PP project metadata (Description field)
✓ Show success message
```

### Feature 4: Verify Searchability
```
✓ Edit Description: "TEST: Guest Arrival Podium"
✓ Save metadata
✓ Open PP search (Cmd+F)
✓ Search for "arrival"
✓ Confirm clip appears in results
✓ Confirm Description shows in bin column
```

---

## What's OUT of Scope (POC)

### Deferred to Full Build:
- ❌ AI assistance (no API calls yet)
- ❌ Keywords field (Description only)
- ❌ Batch operations
- ❌ Settings panel
- ❌ Lexicon integration
- ❌ Error handling (basic only)
- ❌ Keyboard shortcuts
- ❌ UI polish (functional, not beautiful)

---

## Technical Requirements

### Minimum Viable Implementation:

**File: `src/App.tsx` (~100 lines)**
```typescript
import React, { useState, useEffect } from 'react';

export function App() {
  const [selectedClip, setSelectedClip] = useState(null);
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    // Listen for clip selection changes
    const handleSelectionChange = () => {
      const selection = app.project.activeSequence?.getSelection();
      if (selection && selection.length > 0) {
        const clip = selection[0];
        setSelectedClip(clip);

        // Read existing metadata
        const desc = clip.getProjectMetadata()?.getMetadata("Description") || '';
        setDescription(desc);
      }
    };

    // Register listener
    app.onSequenceSelectionChanged = handleSelectionChange;

    return () => {
      app.onSequenceSelectionChanged = null;
    };
  }, []);

  const handleSave = async () => {
    if (!selectedClip) return;

    try {
      // Write to PP project metadata
      selectedClip.setProjectMetadata(description, "Description");
      setStatus('✓ Saved to project');

      setTimeout(() => setStatus(''), 3000);
    } catch (error) {
      setStatus('✗ Error: ' + error.message);
    }
  };

  return (
    <div style={{ padding: 16 }}>
      <h2>Ingest Assistant (POC)</h2>

      {selectedClip ? (
        <>
          <p><strong>Clip:</strong> {selectedClip.name}</p>

          <label>
            Description:
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              style={{ width: '100%', marginTop: 8 }}
            />
          </label>

          <button onClick={handleSave} style={{ marginTop: 8 }}>
            Save
          </button>

          {status && <p style={{ marginTop: 8 }}>{status}</p>}
        </>
      ) : (
        <p>Select a clip in the Project Panel or Timeline</p>
      )}
    </div>
  );
}
```

**File: `public/manifest.json`**
```json
{
  "id": "com.yourdomain.ingest-assistant-poc",
  "name": "Ingest Assistant POC",
  "version": "0.1.0",
  "host": {
    "app": "PP",
    "minVersion": "22.0"
  },
  "entrypoints": [
    {
      "type": "panel",
      "id": "main-panel",
      "label": "Ingest Assistant POC"
    }
  ],
  "requiredPermissions": [
    "clipboard",
    "webview",
    "network"
  ]
}
```

**File: `package.json` (minimal)**
```json
{
  "name": "ingest-assistant-poc",
  "version": "0.1.0",
  "scripts": {
    "build": "webpack",
    "watch": "webpack --watch"
  },
  "dependencies": {
    "react": "^18.0.0",
    "react-dom": "^18.0.0"
  },
  "devDependencies": {
    "@types/react": "^18.0.0",
    "typescript": "^5.0.0",
    "webpack": "^5.0.0",
    "webpack-cli": "^5.0.0"
  }
}
```

---

## Success Criteria (GO/NO-GO Decision)

### ✅ GO Signals (Proceed with Full Build):

1. **Panel loads successfully**
   - No errors in UXP Developer Tool console
   - Panel appears in Extensions menu
   - UI renders correctly

2. **Clip selection works**
   - Panel updates when different clips selected
   - Clip name displays correctly
   - Existing metadata reads successfully

3. **Metadata write succeeds**
   - Save button writes Description
   - No errors thrown
   - PP project file updated

4. **Search validation passes**
   - PP search finds updated metadata
   - Description appears in bin column
   - Works with offline clips

5. **Editor feedback positive**
   - "This workflow makes sense"
   - "I would use this daily"
   - "Faster than current process"

### ❌ NO-GO Signals (Rethink Approach):

1. **UXP API limitations discovered**
   - Can't write project metadata
   - Can't detect clip selection
   - Critical API missing

2. **Performance issues**
   - Panel sluggish or crashes PP
   - Metadata writes take >3 seconds
   - UI unresponsive

3. **Workflow doesn't fit**
   - Editors confused by paradigm
   - Still need file access anyway
   - PP search doesn't work as expected

4. **Technical blockers**
   - TypeScript compilation fails
   - React doesn't render in UXP
   - Manifest configuration impossible

---

## Testing Checklist

### Pre-Test Setup:
- [ ] Premiere Pro 2021+ installed
- [ ] UXP Developer Tool installed
- [ ] Test project with offline clips ready

### POC Test Sequence:
1. [ ] Load panel in PP via UXP Developer Tool
2. [ ] Verify panel appears in workspace
3. [ ] Select clip (Project Panel) → Panel shows clip name
4. [ ] Select clip (Timeline) → Panel updates
5. [ ] Edit Description: "POC TEST: This is a test description"
6. [ ] Click Save → Success message appears
7. [ ] Right-click bin columns → Enable "Description"
8. [ ] Verify Description appears: "POC TEST: This is a test description"
9. [ ] Press Cmd+F → Search for "test description"
10. [ ] Confirm clip appears in search results
11. [ ] Test with OFFLINE clip → Verify still works
12. [ ] Close/reopen PP → Verify metadata persists

### Additional Validation:
- [ ] Test with multiple clip selection (should show first clip)
- [ ] Test with video clip
- [ ] Test with audio clip
- [ ] Test in different workspace layouts
- [ ] Test after restarting Premiere Pro

---

## Development Time Estimate

### Optimistic: 4-6 hours
- UXP setup: 1 hour
- Basic React app: 1 hour
- PP API integration: 2 hours
- Testing: 1-2 hours

### Realistic: 8-12 hours
- Learning UXP APIs: 2-3 hours
- Debugging manifest issues: 1-2 hours
- Troubleshooting PP integration: 2-3 hours
- Multiple test iterations: 2-3 hours

### Contingency: 16-20 hours
- Unforeseen API limitations
- Complex build configuration
- PP version compatibility issues

**Recommendation:** Block 2 full days for POC development + testing.

---

## Deliverables

### Code:
- [ ] Minimal UXP panel project (~/Desktop/ingest-assistant-poc/)
- [ ] Working manifest.json
- [ ] Single React component (App.tsx)
- [ ] Build configuration (webpack.config.js)

### Documentation:
- [ ] README with setup instructions
- [ ] Test results document (checklist completed)
- [ ] Screenshots of working panel

### Decision Document:
- [ ] GO/NO-GO recommendation
- [ ] List of discovered issues/limitations
- [ ] Recommendations for full build (if GO)

---

## Next Steps After POC

### If GO Decision:

1. **Create production repository:**
   ```bash
   mkdir ~/Projects/ingest-assistant-uxp
   cd ~/Projects/ingest-assistant-uxp
   git init
   # Copy POC code as starting point
   ```

2. **Copy architecture docs:**
   ```bash
   cp /path/to/UXP-PANEL-ARCHITECTURE.md ./ARCHITECTURE.md
   ```

3. **Start Phase 2 development:**
   - Add Keywords field
   - Implement batch operations
   - Build settings panel
   - Add AI integration

### If NO-GO Decision:

1. **Document blockers:**
   - What specific issue prevents UXP approach?
   - Is it solvable with workaround?
   - Does it require Adobe to fix?

2. **Explore alternatives:**
   - Hybrid approach (UXP + external service)?
   - Different PP API usage?
   - Return to file-based workflow with new understanding?

3. **Consult with Adobe:**
   - Post in Adobe forums
   - Contact Adobe support
   - Wait for future UXP updates?

---

## Risk Mitigation

### Risk: UXP APIs don't support project metadata writes
**Mitigation:** Test immediately (hour 1 of POC)
**Fallback:** Use clip name field instead, or explore workarounds

### Risk: PP search doesn't index project metadata
**Mitigation:** Test search ASAP (hour 2 of POC)
**Fallback:** Display metadata in panel only, provide panel-based search

### Risk: Panel performance is poor
**Mitigation:** Profile early, optimize if needed
**Fallback:** Simplify UI, lazy load components

### Risk: Build configuration too complex
**Mitigation:** Use minimal Webpack config, avoid over-engineering
**Fallback:** Copy from Adobe sample projects

---

## Resources

### UXP Documentation:
- https://developer.adobe.com/photoshop/uxp/
- https://developer.adobe.com/photoshop/uxp/guides/

### Premiere Pro Scripting:
- https://ppro-scripting.docsforadobe.dev/
- https://community.adobe.com/t5/premiere-pro/ct-p/ct-premiere-pro

### Sample Projects:
- Adobe UXP Samples: https://github.com/AdobeDocs/uxp-photoshop-plugin-samples
- (Adapt for Premiere Pro)

### Support:
- Adobe Forums: https://community.adobe.com/t5/premiere-pro/ct-p/ct-premiere-pro
- UXP Discord: (check Adobe developer site for invite)

---

**Document Version:** 1.0.0
**Last Updated:** 2025-11-06
**Author:** Holistic Orchestrator (Claude Code)
**Purpose:** POC validation before full commitment
