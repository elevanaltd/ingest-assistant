# Ingest Assistant UXP Panel - Architecture Documentation

## Purpose

**Problem Solved:** Video editors need to enrich footage metadata during the editing process, but:
- Raw files are offline/unmounted (stored on restricted NAS)
- File-based metadata tools require direct file access
- Editors work in Premiere Pro 90% of the time
- Context switching to external tools creates friction

**Solution:** Premiere Pro UXP panel that writes metadata to project database, enabling:
- Metadata editing on offline clips (no file access needed)
- Immediate searchability in Premiere bins
- AI assistance from current timeline frame
- Zero tool-switching workflow

---

## Core Concept

### The Workflow

```
1. Editor imports footage into Premiere Pro (raw files may be offline)
2. Editor selects clip in Project Panel or Timeline
3. Ingest Assistant panel shows clip metadata fields
4. Editor adds description/keywords (manual or AI-assisted)
5. Panel writes to PP project metadata (stored in .prproj file)
6. Metadata immediately searchable in bins/columns
7. Editor continues working (no file operations, no delays)
```

### The Key Innovation

**Premiere Pro Project Metadata Integration:**
- **PP Project Database** (`.prproj` file): Fast, accessible, works offline
- **Searchable in Bins**: Immediate availability in project panels
- **No File Access Required**: Bypasses organizational boundary constraints
- **Timeline Frame Analysis**: AI analyzes exact frame editor is viewing

This creates **workflow coherence**: Editors never leave Premiere Pro, metadata enrichment happens naturally during review process.

---

## System Architecture

### UXP Panel Architecture

```
┌──────────────────────────────────────────────────────────┐
│  PREMIERE PRO HOST APPLICATION                           │
│  ┌────────────────────────────────────────────────────┐  │
│  │  UXP PANEL (React + Modern JavaScript)            │  │
│  │                                                    │  │
│  │  ┌──────────────────────────────────────────┐    │  │
│  │  │ UI Layer (React Components)              │    │  │
│  │  │ - ClipMetadataForm                       │    │  │
│  │  │ - AIAssistButton                         │    │  │
│  │  │ - SettingsPanel                          │    │  │
│  │  │ - BatchOperations                        │    │  │
│  │  └────────────┬─────────────────────────────┘    │  │
│  │               │                                   │  │
│  │  ┌────────────┴─────────────────────────────┐    │  │
│  │  │ Business Logic Layer                     │    │  │
│  │  │ - AIService (API integration)            │    │  │
│  │  │ - ConfigManager (lexicon loading)        │    │  │
│  │  │ - MetadataFormatter (parsing/validation) │    │  │
│  │  └────────────┬─────────────────────────────┘    │  │
│  │               │                                   │  │
│  │  ┌────────────┴─────────────────────────────┐    │  │
│  │  │ UXP API Layer                            │    │  │
│  │  │ - app.project.activeSequence             │    │  │
│  │  │ - clip.projectMetadata                   │    │  │
│  │  │ - sequence.exportFramePNG()              │    │  │
│  │  └──────────────────────────────────────────┘    │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
                      │
                      │ HTTPS (AI API calls)
                      ↓
┌──────────────────────────────────────────────────────────┐
│  EXTERNAL SERVICES                                       │
│  - OpenRouter / OpenAI / Anthropic (Vision APIs)        │
│  - Shared config files (lexicon.yaml on network)        │
└──────────────────────────────────────────────────────────┘
```

### Component Relationships

**1. Clip Selection → Metadata Display**
```
User selects clip in PP
    ↓
Panel detects selection change (UXP event listener)
    ↓
Read current project metadata (clip.projectMetadata)
    ↓
Populate UI form fields
    ↓
User edits fields
```

**2. AI Assistance → Frame Analysis**
```
User positions playhead on representative frame
    ↓
User clicks "AI Assist" button
    ↓
Panel exports current frame (sequence.exportFramePNG)
    ↓
Read frame file, encode to base64
    ↓
Load lexicon configuration
    ↓
Build AI prompt with lexicon constraints
    ↓
Call AI API (fetch to OpenRouter/OpenAI)
    ↓
Parse response (JSON extraction)
    ↓
Populate form fields with suggestions
    ↓
User reviews, edits, saves
```

**3. Metadata Save → PP Project Update**
```
User clicks "Save" button
    ↓
Validate form inputs
    ↓
Format metadata (keywords array, description text)
    ↓
Write to PP project metadata:
  - clip.setProjectMetadata(value, "Description")
  - clip.setProjectMetadata(value, "LogNote")
  - clip.setProjectMetadata(keywords, "Keywords")
    ↓
Update PP bin display (automatic refresh)
    ↓
Show success message in panel
```

**Emergent Property:** The system enables **contextual enrichment** - editors add metadata when they're actively reviewing footage, at the exact moment they understand what they're seeing.

---

## Key Technical Decisions

### 1. UXP vs CEP (Modern Platform)

**Decision:** Use UXP (Unified Extensibility Platform), not CEP

**Rationale:**
- UXP is Adobe's current platform (CEP is deprecated)
- Native React support (vs HTML5 panels in CEP)
- Better performance (no ExtendScript bridge overhead)
- Future-proof (Adobe's roadmap direction)
- Modern JavaScript (ES6+, async/await)

**Trade-off:** Requires Premiere Pro 2021+ (acceptable - current industry standard)

### 2. PP Project Metadata Only (No File Writes)

**Decision:** Write to Premiere project database, NOT to file metadata

**Rationale:**
- Works with offline/unmounted files (solves core constraint)
- Immediate availability (no relink required)
- Faster writes (in-memory database vs file I/O)
- No file access permissions needed
- Simpler architecture (no server/queue infrastructure)

**Trade-off:** Metadata doesn't travel between projects (mitigated by PP's export/import feature)

**Why This is Acceptable:**
- Editors confirmed: "We search old project files, not file system"
- Project files are the archival unit (not individual video files)
- PP's metadata export/import handles cross-project needs

### 3. Timeline Frame Export for AI Analysis

**Decision:** Export current frame from timeline, not scan files

**Rationale:**
- Editor chooses which frame to analyze (curated selection)
- Works with offline files (PP generates frame from cached preview)
- Smaller data transfer (single PNG vs full video file)
- Faster analysis (no need to load large video files)
- Better results (editor scrubs to representative frame first)

**Implementation:**
```javascript
// UXP API call
const framePath = await app.project.activeSequence.exportFramePNG(
  app.project.activeSequence.getPlayerPosition(),
  "/tmp/frame_" + Date.now() + ".png"
);
```

**Trade-off:** Requires clips to be imported to PP first (but this is always true in editing workflow)

### 4. Direct AI API Calls (No SDK Dependency)

**Decision:** Use browser `fetch()` for AI APIs, not official SDKs

**Rationale:**
- UXP panels run in browser context (fetch available)
- SDKs require Node.js (not available in UXP)
- HTTP APIs are simple and well-documented
- Reduces bundle size (no large SDK dependencies)
- More control over request/response handling

**Implementation:**
```javascript
// Direct OpenRouter API call
const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'anthropic/claude-3.5-sonnet',
    messages: [...]
  })
});
```

**Trade-off:** Manual HTTP implementation vs SDK convenience (minimal impact, APIs are straightforward)

### 5. Shared Lexicon Configuration

**Decision:** Read lexicon from network share (LucidLink), not embedded in panel

**Rationale:**
- Team-wide consistency (all editors use same terms)
- Updates without panel reinstall
- Version control via Git (config stored with project files)
- Easy editing (YAML file, any text editor)

**Configuration Path:**
```
/Volumes/videos-current/config/lexicon.yaml
```

**Trade-off:** Requires network mount (acceptable - LucidLink already mounted for workflow)

### 6. TypeScript Throughout

**Decision:** Full TypeScript with strict compiler options

**Rationale:**
- Type safety across UXP API boundaries
- Catch errors at compile time
- Self-documenting interfaces
- Better IDE support (autocomplete, refactoring)

**Reusable from Electron App:**
- Type definitions (FileMetadata → ClipMetadata with minimal changes)
- Interface patterns (AIAnalysisResult, Lexicon types)

---

## Data Flow

### Panel Initialization
```
PP starts → Panel loads
    ↓
Load plugin manifest (manifest.json)
    ↓
Initialize React app
    ↓
Register UXP event listeners:
  - app.onProjectChanged
  - app.onSequenceSelectionChanged
    ↓
Load configuration (API keys, lexicon path)
    ↓
Ready for user interaction
```

### Clip Selection Workflow
```
User selects clip in Project Panel/Timeline
    ↓
UXP fires selection change event
    ↓
Panel reads selected clip:
  const selection = app.project.activeSequence.getSelection();
  const clip = selection[0];
    ↓
Read existing metadata:
  const desc = clip.getProjectMetadata().getMetadata("Description");
  const keywords = clip.getProjectMetadata().getMetadata("Keywords");
    ↓
Populate form fields in UI
    ↓
Extract Asset ID from clip name (first 8 chars)
    ↓
Display current status
```

### AI Assist Workflow
```
User scrubs to representative frame
    ↓
User clicks "AI Assist" button
    ↓
Show loading indicator
    ↓
Export current frame:
  const time = app.project.activeSequence.getPlayerPosition();
  const framePath = await sequence.exportFramePNG(time, tmpPath);
    ↓
Read frame file (UXP uxp.storage.localFileSystem)
    ↓
Convert to base64:
  const entry = await fs.getEntryWithUrl(framePath);
  const file = await entry.read();
  const base64 = arrayBufferToBase64(file);
    ↓
Load lexicon from shared location:
  const lexiconEntry = await fs.getEntryForPersistentToken(token);
  const lexicon = parseYAML(await lexiconEntry.read());
    ↓
Build AI prompt with lexicon constraints
    ↓
Call AI API (OpenRouter):
  const response = await fetch(apiUrl, { ... });
  const result = await response.json();
    ↓
Parse response:
  const parsed = extractJSON(result.choices[0].message.content);
    ↓
Populate form fields:
  setDescription(parsed.description);
  setKeywords(parsed.keywords.join(', '));
    ↓
Hide loading, enable editing
```

### Save Workflow
```
User reviews/edits metadata → Clicks "Save"
    ↓
Validate inputs:
  - Description not empty
  - Keywords properly formatted
    ↓
Get selected clip:
  const clip = app.project.activeSequence.getSelection()[0];
    ↓
Write project metadata:
  clip.setProjectMetadata(description, "Description");
  clip.setProjectMetadata(description, "LogNote"); // Fallback field
  clip.setProjectMetadata(keywords, "Keywords");
    ↓
Optional: Update clip name:
  clip.name = assetId + " - " + shortTitle;
    ↓
Refresh PP UI (automatic)
    ↓
Show success message:
  "✓ Metadata saved to project"
    ↓
Clear form or auto-advance to next clip
```

---

## Technology Stack

### Core Framework
- **UXP (Adobe)**: Plugin platform (Premiere Pro 2021+)
- **React 18**: UI rendering with hooks
- **TypeScript 5.x**: Strict type safety
- **Webpack 5**: Build tooling for UXP

### UXP APIs Used
- **app.project**: Project access, clip selection
- **ProjectItem**: Clip metadata read/write
- **Sequence**: Timeline operations, frame export
- **uxp.storage**: File system access (local/network)

### External Services
- **OpenRouter API**: Multi-model AI access (primary)
- **OpenAI API**: Direct access (fallback)
- **Anthropic API**: Direct access (fallback)

### Development Tools
- **UXP Developer Tool**: Live reload, debugging
- **React DevTools**: Component inspection
- **TypeScript Compiler**: Type checking
- **ESLint**: Code quality

### Testing Strategy
- **Unit Tests**: Business logic (AI service, formatters)
- **Integration Tests**: UXP API mocks
- **Manual Testing**: In Premiere Pro (primary validation)

---

## Project Structure

```
ingest-assistant-uxp/
├── src/
│   ├── components/              # React UI components
│   │   ├── MetadataForm.tsx     # Main form (description, keywords)
│   │   ├── AIAssistButton.tsx   # AI analysis trigger
│   │   ├── SettingsPanel.tsx    # Configuration UI
│   │   ├── BatchPanel.tsx       # Multi-clip operations
│   │   └── StatusBar.tsx        # Feedback messages
│   ├── services/                # Business logic
│   │   ├── aiService.ts         # AI API integration
│   │   ├── configManager.ts     # Lexicon loading
│   │   ├── metadataFormatter.ts # PP metadata helpers
│   │   └── frameExporter.ts     # Timeline frame export
│   ├── hooks/                   # React custom hooks
│   │   ├── useClipSelection.ts  # Track selected clips
│   │   ├── useAIAssist.ts       # AI analysis state
│   │   └── useProjectMetadata.ts # PP metadata read/write
│   ├── types/                   # TypeScript definitions
│   │   ├── index.ts             # Core types
│   │   ├── uxp.d.ts             # UXP API types
│   │   └── premiere.d.ts        # PP-specific types
│   ├── utils/                   # Utilities
│   │   ├── base64.ts            # Image encoding
│   │   ├── yaml.ts              # Config parsing
│   │   └── assetId.ts           # ID extraction
│   ├── App.tsx                  # Root component
│   └── index.tsx                # Entry point
├── public/
│   ├── icons/                   # Panel icons
│   └── manifest.json            # UXP plugin manifest
├── config/
│   └── lexicon.example.yaml     # Lexicon template
├── tests/
│   ├── services/                # Service tests
│   └── utils/                   # Utility tests
├── .env.example                 # API key template
├── package.json                 # Dependencies
├── tsconfig.json                # TypeScript config
├── webpack.config.js            # UXP build config
├── ARCHITECTURE.md              # This file
└── README.md                    # Setup instructions
```

---

## Code Reusability from Electron App

### ✅ Highly Reusable (80-100%)

**AIService** (`electron/services/aiService.ts`):
```typescript
// Almost identical implementation
async analyzeImage(imageBase64: string, lexicon: Lexicon) {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    // Same HTTP calls work in UXP!
  });
  return this.parseResponse(response);
}
```

**Lexicon Types** (`src/types/index.ts`):
```typescript
// Exact same interfaces
interface Lexicon {
  preferredTerms: string[];
  excludedTerms: string[];
  synonymMapping: Record<string, string>;
}
```

**UI Components** (`src/App.tsx`):
```typescript
// React code ports directly
const [description, setDescription] = useState('');
const [keywords, setKeywords] = useState('');
// Same state management patterns
```

### ⚠️ Adaptable (50-80%)

**ConfigManager** (`electron/services/configManager.ts`):
```typescript
// Adapt for UXP file system
// OLD: fs.readFile(path)
// NEW: uxp.storage.localFileSystem.getEntryWithUrl(url)
```

**Type Definitions**:
```typescript
// Minor renaming
// OLD: FileMetadata
// NEW: ClipMetadata
// Same structure, different source
```

### ❌ Not Reusable (Different Paradigm)

**FileManager**: File scanning not needed (PP provides clips)
**MetadataStore**: PP project database replaces JSON persistence
**MetadataWriter**: No file writes (PP metadata only)

**Estimated Overall Code Reuse: 60-70%**

---

## Development Phases

### Phase 1: Proof of Concept (POC) - Week 1

**Goal:** Validate UXP integration and core workflow

**Deliverables:**
1. Basic panel structure (loads in PP)
2. Select clip → Read metadata
3. Edit single field (Description)
4. Save → Write to PP project metadata
5. Verify searchability in PP bins

**Success Criteria:**
- Panel docks successfully in PP workspace
- Can read/write Description field
- Search in PP finds updated metadata
- No crashes or errors

**Technical Validation:**
- UXP manifest configuration correct
- PP API calls work as expected
- React rendering performs well
- TypeScript compilation clean

### Phase 2: Core Features - Week 2

**Deliverables:**
1. Full form (Name, Description, Keywords)
2. Asset ID extraction from clip name
3. Batch operations (apply to multiple clips)
4. Settings panel (API key configuration)
5. Error handling and validation

**Success Criteria:**
- All metadata fields editable
- Batch operations work on selection
- Settings persist between sessions
- User-friendly error messages

### Phase 3: AI Integration - Week 3

**Deliverables:**
1. Frame export from timeline
2. AI API integration (OpenRouter primary)
3. Lexicon loading from shared config
4. Response parsing (JSON extraction)
5. Loading states and progress indicators

**Success Criteria:**
- AI suggestions populate fields
- Lexicon constraints honored
- Frame analysis works on offline clips
- Graceful fallback if API unavailable

### Phase 4: Polish & Testing - Week 4

**Deliverables:**
1. Keyboard shortcuts (Cmd+S save, etc.)
2. Templates/presets
3. UI refinements (icons, spacing, feedback)
4. Documentation (README, setup guide)
5. Testing with actual editors

**Success Criteria:**
- Editor feedback incorporated
- Workflow feels natural
- No rough edges
- Ready for production use

---

## Configuration & Setup

### Environment Variables
```bash
# .env file (stored in panel directory)
OPENROUTER_API_KEY=sk-or-v1-...
AI_PROVIDER=openrouter
AI_MODEL=anthropic/claude-3.5-sonnet
LEXICON_PATH=/Volumes/videos-current/config/lexicon.yaml
```

### Lexicon Configuration
```yaml
# /Volumes/videos-current/config/lexicon.yaml
lexicon:
  preferredTerms:
    - podium
    - wide shot
    - detail shot
  excludedTerms:
    - faucet
    - basin
  synonymMapping:
    faucet: tap
    basin: sink
  customInstructions: |
    Focus on architectural elements and spatial relationships.
    Use professional video production terminology.
```

### UXP Manifest
```json
{
  "id": "com.yourdomain.ingest-assistant",
  "name": "Ingest Assistant",
  "version": "1.0.0",
  "host": {
    "app": "PP",
    "minVersion": "22.0"
  },
  "entrypoints": [
    {
      "type": "panel",
      "id": "ingest-assistant-panel"
    }
  ]
}
```

---

## Security Considerations

### API Key Storage
- **Option 1:** UXP secure storage (recommended)
- **Option 2:** Environment variables (development)
- **Option 3:** Shared config file (team key, encrypted)

### Network Access
- HTTPS only for AI API calls
- Validate SSL certificates
- No remote code execution

### File System Access
- Read-only access to lexicon config
- Temporary frame exports only
- No arbitrary file writes

---

## Deployment

### Development
```bash
# Install dependencies
npm install

# Build panel
npm run build

# Watch mode (live reload)
npm run watch

# Load in PP via UXP Developer Tool
```

### Distribution
```bash
# Create .ccx package
npm run package

# Users install via:
# Extensions → Manage Extensions → Install from file
```

---

## Success Metrics

### Technical Metrics
- Panel load time: <2 seconds
- Metadata write time: <500ms
- AI response time: <5 seconds
- Zero crashes in 1-hour session

### User Experience Metrics
- Editors use panel daily (adoption)
- Reduces metadata enrichment time by 50%
- Zero training required (intuitive UI)
- Positive feedback from editors

### Business Metrics
- Footage findability improved
- Reduced time searching for clips
- Better project documentation
- Archival search effectiveness

---

## Future Enhancements

### Near-term (3 months)
1. Multi-clip review mode (gallery view)
2. Metadata templates by project type
3. Bulk export to CSV
4. Integration with project naming standards

### Medium-term (6 months)
1. Video thumbnail scrubbing in panel
2. Metadata validation rules
3. Team collaboration features
4. Analytics dashboard (metadata coverage)

### Long-term (12+ months)
1. After Effects integration
2. DaVinci Resolve version
3. Machine learning model training on team lexicon
4. Auto-tagging based on project patterns

---

## Questions for Development

1. **Premiere Pro Version:** What version(s) do editors use? (Affects API availability)
2. **Network Setup:** Is LucidLink reliably mounted? (For lexicon config access)
3. **API Keys:** Team key or individual keys? (Affects settings UI)
4. **Clip Naming:** Consistent Asset ID format across projects? (8-char assumption)
5. **Metadata Fields:** Any custom PP metadata fields to support beyond Description/Keywords?

---

## References

- **UXP Documentation:** https://developer.adobe.com/photoshop/uxp/
- **Premiere Pro API:** https://ppro-scripting.docsforadobe.dev/
- **OpenRouter API:** https://openrouter.ai/docs
- **Electron App (Lessons Learned):** `../ingest-assistant/ARCHITECTURE.md`

---

## Changelog

### v0.1.0 (Planning - November 2025)
- Architecture documented
- POC scope defined
- Code reuse strategy identified
- Fresh project structure planned

---

**Document Version:** 0.1.0
**Last Updated:** 2025-11-06
**Author:** Holistic Orchestrator (Claude Code)
**Status:** Blueprint for new project - ready for implementation
