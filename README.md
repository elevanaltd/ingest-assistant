# Ingest Assistant

AI-powered media file ingestion and metadata assistant for MacOS.

## Features

- **Manual Mode**: View photos/videos and add descriptive names and metadata tags
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

Comprehensive TDD implementation with **424 tests** covering:
- Settings Modal and lexicon management
- Multi-format AI response parsing with versioned schemas (V1/V2)
- Metadata storage, EXIF embedding, and pagination
- File operations and configuration management
- Security validation (path traversal, content validation, rate limiting)
- Batch operations and queue management
- Type definitions and integration
- Component tests (ErrorBoundary, SettingsModal, keyboard shortcuts)

Run tests: `npm test`

**Test Coverage Areas:**
- **Service Layer**: High coverage (business logic critical)
- **Security**: Comprehensive tests for SecurityValidator, batch IPC validation
- **AI Integration**: Multi-provider parsing, result schema validation
- **Performance**: Pagination, caching, virtual scrolling integration
- **UI Components**: React component behavior, accessibility

## Version History

### v1.1.0 (November 2025) - Performance & Usability Release
**Major Features:**
- ✅ Keyboard shortcuts & command palette (Cmd+K) - 3× faster workflow
- ✅ Virtual scrolling for large folders (1000+ files at 60fps)
- ✅ Paginated file loading (<300ms initial, <50ms cached)
- ✅ Video 4-part naming with action field (location-subject-action-shotType)
- ✅ Security hardening: batch IPC validation, rate limiting, content validation
- ✅ Result type schemas with versioning (ADR-008, Zod validation)

**Quality Improvements:**
- ✅ TypeScript strict mode - all `any` types eliminated (Issue #41)
- ✅ ESLint v9 migration with flat config (Issue #45)
- ✅ Comprehensive test coverage (424 tests, all passing)

**Architecture:**
- Phase 0 prerequisites complete (security, pagination, schemas)
- Tier 2-3 features implemented (virtual scrolling, keyboard shortcuts)

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
