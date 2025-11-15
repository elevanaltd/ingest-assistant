# Ingest Assistant

AI-powered media file ingestion and metadata assistant for MacOS.

## Features

- **Manual Mode**: View photos/videos and add descriptive names and metadata tags
- **Batch Processing**: AI-analyze multiple files automatically (Issue #24)
  - Process up to 100 files per batch with progress tracking
  - Rate limiting: 100 files/minute (burst then throttle)
  - Queue persistence survives app restarts
  - Graceful cancellation (finishes current file)
  - Same metadata storage as manual processing
  - See: [Batch Processing Documentation](.coord/docs/guides/implementation/007-DOC-BATCH-PROCESSING-IMPLEMENTATION.md)
- **Auto-Rename**: Files automatically renamed to `{ID}-{kebab-case-name}.{ext}`
  - **Photos**: 3-part naming `{location}-{subject}-{shotType}`
  - **Videos**: 4-part naming `{location}-{subject}-{action}-{shotType}`
- **AI Assistance**: Analyze images with AI to suggest names and metadata
  - **OpenRouter** (recommended): Access to 100+ models with one API key
  - Direct APIs: OpenAI, Anthropic
  - Structured output with versioned schemas (V1/V2 compatibility)
- **Lexicon System**: Configure preferred/excluded terms to guide AI analysis
- **Keyboard Shortcuts**: Power user workflow (3× faster than mouse)
  - **Cmd+S**: Save metadata
  - **Cmd+I**: AI assist current file
  - **Cmd+K**: Open command palette
  - **Arrow Keys**: Navigate files
  - **Escape**: Close modals
- **Command Palette**: VS Code-style command interface (Cmd+K)
- **Performance Optimizations**:
  - Virtual scrolling for large folders (1000+ files at 60fps)
  - Paginated file loading (<300ms initial, <50ms cached)
  - LRU cache for folder scans
- **Video Support**:
  - Hardware-accelerated transcoding (ProRes, HEVC → H.264)
  - On-the-fly preview generation with VideoToolbox (macOS)
  - Disk-based caching for optimal performance
  - 4-part naming with action field (e.g., kitchen-mixer-whipping-CU)
- **Security**: Defense-in-depth validation
  - Path traversal protection with symlink resolution
  - Content validation (magic bytes)
  - File size limits (100MB images, configurable)
  - Rate limiting for batch operations (100 files/min)
  - Batch IPC security validation
- **Simple Storage**: Metadata stored in JSON, easy to backup and version control

## Ecosystem Integration

**Part of EAV Operations Suite:** Ingest Assistant is Step 6 of 10 in a complete video production pipeline.

**Workflow Position:**
1. Pre-Production apps (script planning, shot breakdown, field capture)
2. **→ Ingest Assistant** (this app): AI pre-tagging with XMP metadata
3. CEP Panel: Premiere Pro metadata import
4. Post-Production apps (editing, voice-over, translation)

**Metadata Strategy:**
- Writes structured XMP to files (location, subject, action, shotType, date)
- CEP Panel reads XMP and imports to Premiere Pro with field mapping
- Shared metadata ensures consistency across production pipeline
- See: [Shared Metadata Strategy](.coord/docs/000001-DOC-METADATA-STRATEGY-SHARED.md)

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Install exiftool (Required)

Metadata is embedded directly into files using exiftool:

```bash
brew install exiftool  # macOS
```

**Why needed:** Embedded metadata is readable by Premiere Pro, Lightroom, and other professional tools.

**Metadata Strategy:** This project uses a **shared XMP metadata strategy** with `eav-cep-assist` (Premiere Pro panel). Both tools write identical XMP fields to video files, ensuring consistency across the video production workflow.

See: [Shared Metadata Strategy](.coord/docs/000001-DOC-METADATA-STRATEGY-SHARED.md) for complete field specifications, namespace rationale, and implementation details.

**Key XMP Fields Written:**
- `xmpDM:shotName` - Combined entity mapping to PP Shot field (survives proxy workflows)
- `xmpDM:LogComment` - Structured key=value pairs for CEP panel parsing
- `dc:description` - Human description or keywords (universal compatibility)

**Technology:** exiftool CLI (Perl-based XMP library) via `electron/services/metadataWriter.ts`

### 3. Configure API Keys

Create a `.env` file from the example:

```bash
cp .env.example .env
```

**⭐ RECOMMENDED: Use OpenRouter** (one key, access to all models):

```env
AI_PROVIDER=openrouter
OPENROUTER_API_KEY=your_key_here
AI_MODEL=anthropic/claude-3.5-sonnet
```

Get your key from: https://openrouter.ai/keys

**Popular models:**
- `anthropic/claude-3.5-sonnet` - Best balance
- `openai/gpt-4o` - OpenAI latest
- `google/gemini-pro-vision` - Google vision
- See all: https://openrouter.ai/models

**Alternative: Direct API keys:**

```env
AI_PROVIDER=openai  # or anthropic
OPENAI_API_KEY=your_key_here
AI_MODEL=gpt-4-vision-preview
```

**⚠️ Security Note:** API keys are stored in `.env` which is gitignored. Never commit API keys to version control!

### 4. Customize Lexicon (Optional - Can Also Use Settings UI)

Copy the example config:

```bash
cp config/config.yaml.example config/config.yaml
```

Edit the lexicon in `config/config.yaml`:

```yaml
lexicon:
  preferredTerms:
    - tap
    - sink
  excludedTerms:
    - faucet
    - basin
  synonymMapping:
    faucet: tap
```

## Development

### Run in Development Mode

```bash
npm run dev
```

### Run Tests

```bash
npm test
```

### Type Check

```bash
npm run typecheck
```

### Build for Production

```bash
npm run build
npm run package
```

## Usage

### Manual Processing

1. **Select Folder**: Click "Select Folder" to choose a directory with images/videos
2. **Configure Lexicon** (Optional): Click ⚙️ Settings button
   - Define term preferences (e.g., "bin" instead of "trash")
   - Add custom AI instructions
   - Save changes
3. **View Files**: Navigate through files using Previous/Next buttons
4. **Manual Entry**:
   - ID field is auto-populated (first 8 characters of filename)
   - Enter a Main Name (e.g., "Oven Control Panel")
   - Add metadata tags (comma-separated, e.g., "oven, control panel, kitchen")
   - Click "Save" to rename the file and store metadata
5. **AI Assistance**:
   - Click "AI Assist" to analyze the current file
   - Review the suggested name and metadata
   - Edit if needed, then Save

### Batch Processing (NEW - Issue #24)

Process multiple files automatically with AI analysis:

1. **Open folder** with unprocessed media files
2. **Batch Operations panel** shows: "68 files available"
3. **Click "Process 68 Files"** button
   - If >100 files: "Process First 100 Files" (batch limit)
   - Remaining files can be processed in subsequent batches
4. **Monitor progress**:
   - Progress bar shows percentage complete
   - Current file being processed
   - Completed/Failed counts update in real-time
5. **Processing completes**:
   - All files have AI-generated names and metadata
   - Metadata saved to `.ingest-metadata.json` (same as manual)
   - Files marked as processed (`processedByAI: true`)

**Rate Limiting:**
- First ~100 files process immediately (burst)
- Subsequent files: ~600ms delay each (100 files/minute)
- Console shows: `[RateLimiter] Waiting 598ms for 1 token(s)...`

**Cancellation:**
- Click "Cancel" button during processing
- Finishes current file, then stops
- Cancelled files can be reprocessed later

**Detailed Documentation:** See [Batch Processing Implementation](.coord/docs/guides/implementation/007-DOC-BATCH-PROCESSING-IMPLEMENTATION.md)

## File Naming Convention

Files are renamed using structured naming patterns:

### Photos (3-part naming)
Format: `{ID}-{location}-{subject}-{shotType}.{ext}`

Example:
- Original: `EB001537.jpg`
- After AI analysis: `EB001537-kitchen-oven-WS.jpg`
  - Location: kitchen
  - Subject: oven
  - Shot Type: WS (Wide Shot)

### Videos (4-part naming)
Format: `{ID}-{location}-{subject}-{action}-{shotType}.{ext}`

Example:
- Original: `VID_0042.mov`
- After AI analysis: `VID_0042-kitchen-mixer-whipping-CU.mov`
  - Location: kitchen
  - Subject: mixer
  - Action: whipping
  - Shot Type: CU (Close-Up)

### Shot Type Vocabulary
- **Static Shots**: WS (Wide Shot), MS (Medium Shot), CU (Close-Up), ECU (Extreme Close-Up), OTS (Over The Shoulder)
- **Moving Shots**: PAN, TILT, DOLLY, TRACK, ZOOM, CRANE

## Architecture

### Core Services (Electron Main Process)

**File Management:**
- **FileManager**: Scans folders, manages file operations, handles renaming with pagination support
- **MetadataStore**: JSON-based metadata persistence with range queries for pagination

**AI & Configuration:**
- **AIService**: Multi-format AI response parser with versioned schemas (V1/V2)
  - Supports OpenAI, Anthropic, OpenRouter
  - Structured output parsing for photo/video naming
  - Result type validation with Zod schemas
- **ConfigManager**: YAML configuration management for lexicon system

**Media Processing:**
- **VideoTranscoder**: Hardware-accelerated video transcoding with caching
- **VideoFrameExtractor**: Generates thumbnails from video files
- **MetadataWriter**: Embeds metadata into files via exiftool (EXIF/XMP/IPTC)

**Performance & Security:**
- **SecurityValidator**: Defense-in-depth security layer
  - Path traversal protection with symlink resolution
  - Content validation (magic bytes)
  - File size limits and rate limiting
  - Batch operation validation
- **BatchQueueManager**: Task queue for batch AI processing with progress tracking
- **LRU Cache**: Least Recently Used cache for folder scans (5 folders, <50ms cached access)

### UI (React)

- Single-page app with image/video viewer
- Form for ID, Main Name, and Metadata (photos: 3-part, videos: 4-part with action)
- Settings Modal for lexicon configuration (⚙️ button)
- **Command Palette**: VS Code-style command interface (Cmd+K)
  - Quick access to all commands
  - Keyboard-first workflow
  - Fuzzy search for actions
- **Virtual Scrolling**: Performance-optimized file list (react-window)
  - Smooth 60fps scrolling for 1000+ files
  - Only renders visible items (~15 DOM nodes)
- Navigation with keyboard shortcuts (arrow keys, Cmd+S, Cmd+I)
- AI assistance button with structured analysis

## Testing

Comprehensive TDD implementation with **527 tests** (34 test files) covering:
- Settings Modal and lexicon management
- Multi-format AI response parsing with versioned schemas (V1/V2)
- Metadata storage, EXIF embedding, and pagination
- File operations and configuration management
- Security validation (path traversal, content validation, rate limiting)
- **Batch operations and queue management** (Issue #24)
  - Queue clearing on folder changes
  - Rate limiter waiting behavior
  - Metadata entry creation for new files
  - Queue persistence and restoration
- Type definitions and integration
- Component tests (ErrorBoundary, SettingsModal, keyboard shortcuts)
- XMP metadata writing with CEP Panel date field integration

Run tests: `npm test`

**Test Coverage Areas:**
- **Service Layer**: High coverage (business logic critical)
- **Security**: Comprehensive tests for SecurityValidator, batch IPC validation
- **Batch Processing**: Queue management, rate limiting, folder-scoped clearing
- **AI Integration**: Multi-provider parsing, result schema validation
- **Performance**: Pagination, caching, virtual scrolling integration
- **UI Components**: React component behavior, accessibility
- **Metadata**: XMP writing, JSON schema v2.0, timestamp handling, CEP Panel integration

## Version History

### v1.1.0 (November 2025) - Performance & Usability Release
**Major Features:**
- ✅ Keyboard shortcuts & command palette (Cmd+K) - 3× faster workflow
- ✅ Virtual scrolling for large folders (1000+ files at 60fps)
- ✅ Paginated file loading (<300ms initial, <50ms cached)
- ✅ Video 4-part naming with action field (location-subject-action-shotType)
- ✅ **Batch Processing** (Issue #24) - AI-analyze multiple files automatically
  - Process up to 100 files per batch with progress tracking
  - Rate limiting: 100 files/minute (burst then throttle)
  - Queue persistence with folder-scoped clearing
  - Three critical bugs fixed (stale queue, missing metadata, rate limiter)
- ✅ Security hardening: batch IPC validation, rate limiting, content validation
- ✅ Result type schemas with versioning (ADR-008, Zod validation)
- ✅ **JSON Schema v2.0 Migration** (Issue #54) - Complete metadata overhaul
  - metadata → keywords field rename (XMP-dc:Description alignment)
  - Audit trail fields (createdAt, createdBy, modifiedAt, modifiedBy, version)
  - Schema versioning for future migrations
- ✅ **CEP Panel Date Field Integration** (eav-cep-assist Issue #31)
  - LogComment date field: yyyymmddhhmm format
  - Timestamp extraction from EXIF (5-field fallback chain)
  - All 3 IPC handlers wired (rename, update, batch AI)

**Quality Improvements:**
- ✅ TypeScript strict mode - all `any` types eliminated (Issue #41)
- ✅ ESLint v9 migration with flat config (Issue #45)
- ✅ Comprehensive test coverage (527 tests, 34 files, all passing)
- ✅ Batch processing fixes validated with TDD (RED→GREEN→REFACTOR)
- ✅ JSON schema v2.0 migration complete with backward compatibility
- ✅ CEP Panel integration validated end-to-end

**Bug Fixes (Issue #24):**
- ✅ Fixed: Stale queue persistence across folder changes (99/100 failures)
- ✅ Fixed: Missing metadata entries for unprocessed files (68/69 skipped)
- ✅ Fixed: Rate limiter throwing errors instead of waiting
- Documentation: [Batch Processing Implementation](.coord/docs/007-DOC-BATCH-PROCESSING-IMPLEMENTATION.md)

**Architecture:**
- Phase 0 prerequisites complete (security, pagination, schemas)
- Tier 2-3 features implemented (virtual scrolling, keyboard shortcuts)
- Batch processing production-ready with comprehensive testing
- EAV ecosystem integration documented (Step 6 of 10 in production pipeline)
- Shared Supabase architecture designed for Reference Image Lookup (Issue #63)

**Upcoming Enhancements (Roadmap):**
- **Reference Image Lookup (Issue #63)**: AI learning from human corrections
  - Vector similarity search for visually similar reference images
  - Integration with EAV production database for shot lookup
  - Incremental learning: 70% → 85%+ cataloging accuracy over time
  - Status: D1 North Star approved, ready for D2 Design phase

### v1.0.0 (January 2025) - Initial Release
- Core manual workflow (view, rename, tag, save)
- Dual metadata storage (JSON + embedded EXIF)
- AI assist (single file, OpenAI/Anthropic/OpenRouter)
- Lexicon-based AI guidance
- Error boundary for UI resilience
- CI/CD pipeline with quality gates
- Settings modal with lexicon editor
- Video transcoding with hardware acceleration

## License

MIT
