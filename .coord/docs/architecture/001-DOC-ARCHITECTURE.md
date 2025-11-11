# Ingest Assistant - Architecture Documentation

## Purpose

**Problem Solved:** Manual photo/video organization is tedious. Filenames from cameras (e.g., `EB001537.jpg`) are meaningless, and adding searchable metadata for professional tools like Premiere Pro requires manual EXIF editing.

**Solution:** Desktop app that combines human review with AI assistance to quickly rename files with descriptive names and embed searchable metadata directly into media files.

---

## Core Concept

### The Workflow

```
1. Select folder with photos/videos
2. View media file-by-file
3. Add descriptive name + metadata tags
4. File gets renamed: EB001537.jpg → EB001537-oven-control-panel.jpg
5. Metadata embedded into file (readable by Premiere Pro, other tools)
6. Optional: AI assist suggests names/tags for unlabeled files
```

### The Key Innovation

**Dual Metadata Storage:**
- **External JSON** (`.ingest-metadata.json` in folder): App's working memory, tracks processing state
- **Embedded EXIF/XMP/IPTC** (inside media file): Professional tool compatibility, file metadata travels with the file

This creates **system coherence**: App can track progress + Professional tools can search/filter by metadata.

---

## System Architecture

### Three-Layer Electron Architecture

```
┌─────────────────────────────────────────────────────────┐
│  RENDERER PROCESS (React + Vite)                        │
│  - UI components (App.tsx, ErrorBoundary)               │
│  - User interaction handling                            │
│  - Media display (images/videos)                        │
└─────────────────┬───────────────────────────────────────┘
                  │ IPC (Context Bridge)
                  │ window.electronAPI.*
┌─────────────────┴───────────────────────────────────────┐
│  PRELOAD SCRIPT (preload.ts)                            │
│  - Security boundary (context isolation)                │
│  - Exposes safe IPC methods to renderer                 │
│  - Type-safe API surface                                │
└─────────────────┬───────────────────────────────────────┘
                  │ ipcRenderer ↔ ipcMain
┌─────────────────┴───────────────────────────────────────┐
│  MAIN PROCESS (Electron main.ts)                        │
│  ┌───────────────────────────────────────────────────┐  │
│  │ IPC Handlers (file:*, ai:*)                       │  │
│  └────────────┬──────────────────────────────────────┘  │
│  ┌────────────┴──────────────────────────────────────┐  │
│  │ SERVICE LAYER                                      │  │
│  │ - FileManager: Scan folders, rename files         │  │
│  │ - MetadataStore: JSON persistence (.ingest-*.json)│  │
│  │ - ConfigManager: YAML config + lexicon loading    │  │
│  │ - AIService: OpenAI/Anthropic/OpenRouter client   │  │
│  │ - MetadataWriter: exiftool integration (EXIF/XMP) │  │
│  └────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### Component Relationships (How Parts Connect)

**1. FileManager + MetadataStore → Working Memory**
```
FileManager.scanFolder() → Discovers media files
                         → Extracts ID (first 8 chars)
                         ↓
MetadataStore.getFileMetadata() → Checks for existing metadata
                                → Merges with file list
                                → Returns enriched FileMetadata[]
```

**2. User Edits → Dual Persistence**
```
User saves → Main Process receives IPC call
           ↓
           FileManager.renameFile() → Physical file rename on disk
           ↓
           MetadataStore.updateFileMetadata() → Update .ingest-metadata.json
           ↓
           MetadataWriter.writeMetadataToFile() → Embed EXIF/XMP via exiftool
```

**3. AI Assistance → Lexicon-Guided Analysis**
```
User clicks "AI Assist" → AIService.analyzeImage()
                        ↓
                        ConfigManager.getLexicon() → Loads rules (preferred/excluded terms)
                        ↓
                        Build prompt with lexicon constraints
                        ↓
                        OpenAI/Anthropic vision API → Returns { mainName, metadata, confidence }
                        ↓
                        UI populates fields (user can edit before saving)
```

**Emergent Property:** The system enables **progressive enhancement** - manual first, AI-assisted optionally, always with human review before commitment.

---

## Key Technical Decisions

### 1. Electron + React (vs. Native macOS)

**Decision:** Electron with Vite + React
**Rationale:**
- Cross-platform foundation (macOS first, but Windows/Linux possible)
- Rapid UI development with React ecosystem
- Vite provides fast dev experience
- Node.js access for file operations + AI SDK integration

**Trade-off:** Larger bundle size vs native, but acceptable for productivity tool

### 2. File ID = First 8 Characters (Immutable Reference)

**Decision:** Extract camera-generated prefix (e.g., `EB001537`) as permanent ID
**Rationale:**
- Cameras use consistent prefixes for file sequences
- Immutable reference survives renames
- Enables metadata lookup after file moves/renames

**Implementation:**
```typescript
// fileManager.ts:getFileId()
const nameWithoutExt = path.basename(filePath, ext);
const fileId = nameWithoutExt.substring(0, 8);
```

**Trade-off:** Assumes 8-character camera prefixes (works for most cameras, might need config for others)

### 3. Dual Metadata Storage (JSON + Embedded EXIF)

**Decision:** Store metadata in BOTH `.ingest-metadata.json` AND embedded in files
**Rationale:**
- **JSON:** Fast lookup, tracks AI processing state, app-specific metadata
- **EXIF/XMP:** Professional tool compatibility (Premiere Pro, Lightroom, etc.)

**Why Both?**
```
JSON alone → Fast but doesn't travel with file
EXIF alone → No processing state, slower to query en masse
Both together → Best of both worlds
```

**Implementation:** MetadataWriter uses `exiftool` to write:
- `Title/XMP:Title/IPTC:ObjectName` → Main descriptive name
- `Keywords/XMP:Subject/IPTC:Keywords` → Comma-separated tags
- `Description` → Combined searchable text

### 4. exiftool Dependency (External Binary)

**Decision:** Use `exiftool` via child process instead of pure JavaScript EXIF library
**Rationale:**
- exiftool is industry standard (comprehensive format support)
- Handles edge cases (video metadata, XMP namespaces, IPTC)
- Reliable metadata preservation

**Trade-off:** Requires exiftool installation on user's system (documented in setup)

### 5. AI Provider Abstraction (OpenAI | Anthropic | OpenRouter)

**Decision:** Single AIService class with provider switching
**Rationale:**
- Future-proof: Easy to add new providers (YOLOv8 mentioned in original brief)
- Cost optimization: Switch between providers based on pricing
- Vendor independence

**Configuration:**
```typescript
// Environment variables or config.yaml
AI_PROVIDER=openrouter
AI_MODEL=anthropic/claude-3.5-sonnet
AI_API_KEY=sk-...
```

**Why OpenRouter?** Unified API for multiple models (Anthropic, OpenAI, others) via single key

### 6. Lexicon-Based AI Guidance (YAML Config)

**Decision:** User-editable YAML file with preferred/excluded terms + synonym mapping
**Rationale:**
- Domain-specific vocabulary control (e.g., "tap" not "faucet")
- Consistent naming across large ingestion batches
- Learning: User refines lexicon over time based on AI suggestions

**Example:**
```yaml
lexicon:
  preferredTerms: [tap, sink, oven]
  excludedTerms: [faucet, basin]
  synonymMapping:
    faucet: tap
    basin: sink
```

### 7. TypeScript Throughout (Strict Mode)

**Decision:** Full TypeScript with strict compiler options
**Rationale:**
- Type safety across IPC boundaries (main ↔ renderer)
- Catch errors at compile time
- Self-documenting interfaces (`FileMetadata`, `AIAnalysisResult`)

**IPC Type Safety:**
```typescript
// src/types/electron.d.ts
interface ElectronAPI {
  selectFolder(): Promise<string | null>;
  loadFiles(folderPath: string): Promise<FileMetadata[]>;
  renameFile(id: string, name: string, path: string): Promise<boolean>;
  // ... fully typed
}
```

---

## Data Flow

### Initial Folder Load
```
User clicks "Select Folder"
  ↓
dialog.showOpenDialog() → Returns folder path
  ↓
FileManager.scanFolder() → Reads directory
  ↓
  Filter: .jpg, .jpeg, .png, .gif, .webp, .mp4, .mov, .avi, .webm
  ↓
  For each file:
    - Extract ID (first 8 chars)
    - Get file stats (size, mtime)
    - Create FileMetadata object
  ↓
MetadataStore.getFileMetadata(id) → Load existing metadata if any
  ↓
Merge: File system data + Stored metadata
  ↓
Return FileMetadata[] to renderer
  ↓
Renderer displays: Media viewer + Form fields
```

### Save Workflow
```
User edits "Main Name" + "Metadata" → Clicks Save
  ↓
IPC: file:rename + file:update-metadata
  ↓
1. FileManager.renameFile()
   - Build new filename: [id]-[kebab-case-name].[ext]
   - fs.rename() on disk
  ↓
2. MetadataStore.updateFileMetadata()
   - Update JSON object in memory
   - Write to .ingest-metadata.json
  ↓
3. MetadataWriter.writeMetadataToFile()
   - Build exiftool command with -Title, -Keywords, -Description
   - exec() exiftool with metadata flags
   - Embedded metadata now in file
  ↓
Reload file list (to reflect new filename)
  ↓
Update UI with success message
```

### AI Assist Workflow
```
User clicks "AI Assist"
  ↓
ConfigManager.getLexicon() → Load rules from config.yaml
  ↓
AIService.buildPrompt(lexicon) → Construct system prompt:
  "Preferred terms: X, Y, Z"
  "Excluded terms: A, B"
  "Return JSON: { mainName, metadata }"
  ↓
fs.readFile(imagePath) → Read image as buffer
  ↓
buffer.toString('base64') → Encode for API
  ↓
API call (OpenAI/Anthropic):
  {
    messages: [{
      role: 'user',
      content: [prompt, base64_image]
    }]
  }
  ↓
Parse JSON response → { mainName, metadata, confidence }
  ↓
Populate UI fields (NOT saved automatically)
  ↓
User reviews → Edits if needed → Clicks Save (triggers Save Workflow)
```

---

## Technology Stack

### Core Framework
- **Electron 28**: Desktop app framework (macOS first, cross-platform capable)
- **React 18**: UI rendering with hooks
- **TypeScript 5.3**: Strict type safety
- **Vite 5**: Fast dev server + production builds

### Main Process (Node.js)
- **fs/promises**: Async file operations
- **child_process**: exiftool integration
- **js-yaml**: Config file parsing
- **OpenAI SDK**: OpenAI/OpenRouter API client
- **Anthropic SDK**: Claude API client

### Testing & Quality
- **Vitest**: Unit testing (Jest-compatible, Vite-native)
- **@testing-library/react**: Component testing
- **ESLint**: Code linting (@typescript-eslint)
- **GitHub Actions**: CI/CD pipeline (typecheck → lint → test → build)

### Build & Packaging
- **electron-builder**: macOS app packaging (DMG/ZIP)
- **concurrently**: Parallel dev server + electron process
- **Vite**: Renderer build optimization

---

## Project Structure

```
ingest-assistant/
├── electron/                  # Main process code
│   ├── services/              # Business logic layer
│   │   ├── fileManager.ts     # File operations, scanning, renaming
│   │   ├── metadataStore.ts   # JSON persistence layer
│   │   ├── configManager.ts   # YAML config + lexicon loading
│   │   ├── aiService.ts       # AI provider abstraction
│   │   └── metadataWriter.ts  # exiftool integration (EXIF/XMP)
│   ├── main.ts                # Electron entry point + IPC handlers
│   └── preload.ts             # Context bridge (security boundary)
├── src/                       # Renderer process (React)
│   ├── components/
│   │   └── ErrorBoundary.tsx  # React error handling
│   ├── types/
│   │   ├── index.ts           # Shared type definitions
│   │   └── electron.d.ts      # IPC API types
│   ├── App.tsx                # Main application component
│   └── main.tsx               # React entry point
├── config/
│   └── config.yaml.example    # Lexicon configuration template
├── .github/workflows/
│   └── ci.yml                 # Quality gates (typecheck, lint, test, build)
├── package.json               # Dependencies + scripts
├── vite.config.ts             # Renderer build config
├── vitest.config.ts           # Test configuration
└── ARCHITECTURE.md            # This file
```

---

## Known Trade-offs & Design Constraints

### 1. exiftool Dependency
**Trade-off:** Requires external binary installation
**Mitigation:** Documented in README, could bundle with app in future
**Why Acceptable:** Industry-standard tool, reliable, comprehensive format support

### 2. App.tsx Component Size (~270 lines)
**Trade-off:** Single large component vs decomposed smaller components
**Current State:** All UI logic in one file
**Future:** Extract sub-components (MediaViewer, MetadataForm, Navigation)
**Why Acceptable for v1:** Rapid development, clear logic flow, works well

### 3. Security Hardening Needed
**Current State:** Basic context isolation, but missing:
- Input validation on IPC boundaries
- Path traversal protection
- File size limits
- Sanitized error messages

**Priority:** Critical before production release (see REPO_REVIEW.md)

### 4. Batch AI Processing
**Current State:** Code exists in `aiService.ts` (batch-process handler) but not exposed in UI
**Why:** Focus on manual workflow first, validate single-file AI before scaling
**Future:** Add batch mode UI (process all unlabeled files in background)

### 5. No Undo/Redo
**Current State:** File renames are immediate and irreversible
**Trade-off:** Simplicity vs safety
**Mitigation:** Could add rename history or trash/archive feature
**Why Acceptable:** Manual review before save, target users are careful

### 6. Single Folder at a Time
**Current State:** User selects one folder, no multi-folder support
**Trade-off:** Simple mental model vs power user efficiency
**Future:** Could add folder queue or recursive subfolder support

---

## Future Considerations

### Near-term Enhancements (Next 3-6 months)
1. **Batch AI Processing UI**: Process all unlabeled files with progress indicator
2. **Keyboard Shortcuts**: Next/Previous (arrow keys), Save (Cmd+S), AI Assist (Cmd+I)
3. **Component Decomposition**: Extract MediaViewer, MetadataForm, Navigation components
4. **Security Hardening**: Input validation, path traversal protection, file size limits
5. **Error Handling**: User-friendly error messages with recovery guidance

### Medium-term Features (6-12 months)
1. **Undo/Redo**: Rename history with rollback capability
2. **Drag-and-Drop**: Drop folder onto window to load
3. **Preview Caching**: Cache thumbnails for faster navigation
4. **Export Report**: CSV/JSON export of all metadata for analysis
5. **Custom Lexicon UI**: In-app lexicon editor (no manual YAML editing)

### Long-term Vision (12+ months)
1. **YOLOv8 Integration**: Local object detection (mentioned in original brief)
2. **Plugin System**: Community-contributed lexicons or custom AI models
3. **Cloud Sync**: Optional metadata backup to cloud storage
4. **Collaborative Workflows**: Multi-user metadata review
5. **Video Frame Analysis**: AI analysis of specific video frames, not just thumbnails

### Technology Evolution
- **Electron Updates**: Stay current with Electron releases (security patches)
- **AI Model Improvements**: Leverage better vision models as they release
- **TypeScript**: Migrate to TS 5.x features as ecosystem stabilizes
- **Testing**: Increase coverage to 80%+ with E2E tests (Playwright)

---

## Testing Strategy

### Current Coverage
- **Unit Tests**: Service layer (fileManager, metadataStore, configManager, aiService)
- **Component Tests**: ErrorBoundary.tsx
- **CI Pipeline**: typecheck → lint → test → build on every push

### Test Philosophy
- **Service layer**: High coverage (business logic critical)
- **React components**: Focus on user-facing behavior, not implementation details
- **Integration tests**: Validate IPC communication (main ↔ renderer)
- **E2E tests**: Planned (full user workflows)

### Quality Gates (CI Enforcement)
```bash
npm run typecheck  # TypeScript compilation check (0 errors)
npm run lint       # ESLint code quality (0 errors)
npm test           # Vitest unit tests (all passing)
npm run build      # Production build (must succeed)
```

**Philosophy:** All gates must pass before merge. No exceptions.

---

## Configuration & Setup

### Environment Variables (Optional)
```bash
# AI provider config (overrides config.yaml)
AI_PROVIDER=openrouter
AI_MODEL=anthropic/claude-3.5-sonnet
AI_API_KEY=sk-or-v1-...
```

### Config File (Recommended)
```yaml
# ~/Library/Application Support/ingest-assistant/config.yaml
lexicon:
  preferredTerms: [tap, sink, oven, counter, cabinet]
  excludedTerms: [faucet, basin]
  synonymMapping:
    faucet: tap
    basin: sink
  categories:
    kitchen: [oven, sink, tap, counter, cabinet]
    bathroom: [shower, toilet, mirror, bath]
```

### External Dependencies
- **exiftool**: Must be installed on system
  ```bash
  brew install exiftool  # macOS
  ```

---

## Security Model

### Current Implementation
- ✅ Context isolation enabled (renderer can't access Node.js APIs directly)
- ✅ Node integration disabled (renderer runs in sandboxed environment)
- ✅ Preload script sandboxed (only exposes whitelisted IPC methods)
- ✅ No remote content loading (app is fully local)

### Critical Improvements Needed (Before Production)
- ❌ Input validation on IPC handlers (prevent malicious file paths)
- ❌ Path traversal protection (restrict file access to selected folder)
- ❌ File type validation (verify extensions match content)
- ❌ File size limits (prevent memory exhaustion)
- ❌ API key protection (secure storage, not in config files)
- ❌ Error message sanitization (don't leak file paths in UI)

**Reference:** See REPO_REVIEW.md for detailed security checklist

---

## Deployment

### Development
```bash
npm run dev          # Start Vite dev server + Electron
npm test             # Run unit tests
npm run typecheck    # Verify TypeScript
npm run lint         # Check code quality
```

### Production Build
```bash
npm run build        # Compile TypeScript + Vite build
npm run package      # Create macOS DMG/ZIP (electron-builder)
```

### Distribution
- **Output:** `release/` directory with DMG and ZIP
- **Signing:** Not yet configured (required for macOS Gatekeeper bypass)
- **Updates:** Manual download (auto-update not implemented)

---

## Questions for Ongoing Development

1. **Target Users:** Internal tool or public release? (Affects security priority)
2. **Compliance:** Any GDPR/HIPAA requirements for metadata storage?
3. **Scale:** Expected file volumes? (Optimize for 100s or 10,000s of files?)
4. **AI Providers:** Preferred default? Cost vs quality trade-off?
5. **Batch Operations:** Should batch AI processing be async with job queue?

---

## Changelog

### v1.0.0 (Current - January 2025)
- ✅ Core manual workflow (view, rename, tag, save)
- ✅ Dual metadata storage (JSON + embedded EXIF)
- ✅ AI assist (single file, OpenAI/Anthropic/OpenRouter)
- ✅ Lexicon-based AI guidance
- ✅ Error boundary for UI resilience
- ✅ CI/CD pipeline with quality gates

### Recent Enhancements (November 6, 2025)
- ✅ **Settings Modal** - In-app lexicon editor with table-based term mapping (⚙️ button)
- ✅ **Robust AI Parsing** - Handles multiple response formats (JSON, markdown, prose)
- ✅ **dotenv Integration** - Automatic .env loading for API keys
- ✅ **Custom AI Instructions** - Free-form guidance field in lexicon
- ✅ **Test Coverage** - Increased from 43 to 100+ passing tests

### Initial Release Fixes
- Fixed critical console error (window.electronAPI undefined)
- Added ErrorBoundary for graceful error handling
- Fixed package.json main entry point
- Comprehensive repo review and security assessment

---

## References

- **Original Brief:** See project setup notes (provided by user)
- **Security Review:** REPO_REVIEW.md
- **Quick Start:** QUICK_START.md
- **Dependencies:** package.json
- **CI Pipeline:** .github/workflows/ci.yml

---

## Architectural Evolution & Strategic Exploration

### November 2025: Concurrent Development Paths

**CURRENT STATUS (2025-11-11): Electron App is ACTIVE Production Path**

**Active Development Evidence:**
- Recent commits through November 11, 2025 (action field, keyboard shortcuts, virtual scrolling)
- Phase 0 prerequisites completed (Issues #18, #19, #20)
- Tier 2-3 features implemented (Issues #22, #23)
- Version 1.1.0 release (November 2025)
- Quality improvements ongoing (TypeScript strict mode, ESLint v9)

**Strategic Alternative Explored: UXP Panel**

### Critical Discovery - Premiere Pro Workflow Integration

**Context:** During production use validation (November 6, 2025), a workflow analysis revealed potential architectural alternatives.

**Discovery:** Premiere Pro displays **master file metadata only** when proxies are attached. Metadata written to proxy files is invisible in the editing workflow. This means:
1. Metadata must be written to RAW files (stored on restricted-access NAS)
2. Editors work with offline/proxy files (accessible on LucidLink)
3. File system access creates organizational boundary conflicts

**Workflow Reality Check:**
```
ASSUMED WORKFLOW (Tool designed for):
Camera Cards → Ingest Assistant → Renamed files → Import to PP

ACTUAL WORKFLOW (How editors work):
Camera Cards → Copy to NAS → Import to PP → Edit with proxies (offline RAW files)
```

**Strategic Analysis: UXP Panel as Potential Alternative**

The November 6 analysis identified a **Premiere Pro UXP Panel** as a potentially compelling alternative architecture:

**UXP Panel Advantages (If Pursued):**
1. **Access Boundary:** Editors work in PP with offline files → PP metadata doesn't require file access
2. **Search Integration:** PP project metadata is immediately searchable in bins (no relink needed)
3. **Workflow Integration:** Editors never leave PP → Zero tool-switching friction
4. **AI Advantage:** Can analyze exact frame editor is viewing (better than blind file analysis)
5. **Simplicity:** No file access choreography, no server infrastructure, no queue systems

**Code Reusability from Electron App (If UXP Pursued):** 60-70%
- React components (UI layout, forms, state management)
- AIService (HTTP API calls work identically)
- ConfigManager (lexicon loading adaptable)
- Type definitions (interfaces remain valid)

**Electron App Status: ACTIVE - Production Development Continues**

- **Current State:** Production-grade application with v1.1.0 release
- **Recent Accomplishments:**
  - Phase 0 architectural prerequisites completed (security, pagination, schemas)
  - Major UX improvements (keyboard shortcuts, command palette, virtual scrolling)
  - Quality gates strengthened (TypeScript strict, comprehensive tests)
- **Value Delivered:** Full-featured standalone application for file ingestion workflows
- **Use Case:** Ingest-time metadata tagging, batch processing, pre-import organization

**Relationship Between Approaches:**

The Electron app and potential UXP panel serve **complementary workflows**:
- **Electron App (ACTIVE):** Pre-import file organization, batch ingestion, standalone metadata tagging
- **UXP Panel (EXPLORED):** Post-import in-editing metadata enhancement, editor-centric workflow

**Decision Status:**
- Electron app development continues as primary production path
- UXP panel remains strategic option for future evaluation
- Both approaches have distinct value propositions for different workflow stages

**References:**
- UXP Panel Exploration: `.coord/docs/000-DOC-CRITICAL-DISCOVERY-PP-METADATA-BEHAVIOR.md`
- UXP Panel Architecture Analysis: `.coord/docs/004-DOC-UXP-PANEL-ARCHITECTURE.md`
- Strategic Analysis Session: November 6, 2025 (Holistic Orchestrator review)

---

**Document Version:** 1.2.0
**Last Updated:** 2025-11-11
**Author:** Holistic Orchestrator (Claude Code)
**Status:** Living document - Electron app is active production path, architectural options documented for strategic planning
