# Ingest Assistant - Project Context

## Project Identity
**Name:** Ingest Assistant
**Purpose:** AI-powered media file ingestion and metadata assistant for macOS
**Type:** Electron desktop application
**Platform:** macOS (darwin)

## Tech Stack
- **Runtime:** Electron (main + renderer processes)
- **Frontend:** React 18, TypeScript
- **Build:** Vite
- **Testing:** Vitest (259 tests)
- **Process:** Node.js
- **AI Integration:** OpenRouter, Anthropic Claude, OpenAI APIs

## Key Features
- **Manual Mode:** User-driven metadata creation
- **AI Assistance:** Intelligent metadata generation via multiple AI providers
- **Video Support:**
  - Codec detection (H.264, HEVC)
  - Compatibility checking for QuickTime Player
  - Hardware-accelerated H.264 transcoding for incompatible formats
- **Security:** Path traversal validation with macOS symlink resolution
- **EXIF Metadata:** Embedding metadata into media files

## Current State

### Active Branch
`claude/build-video-a-011CUunZ44KwfEYzxEqCb7PL`

### Recent Work (Last 5 Commits)
1. `16f3eb1` - Removed PR comment step (requires write permissions)
2. `bb9b63d` - Fixed fs.open() mock lint errors
3. `f145a11` - Updated test mocks, added coverage dependency
4. `234daf8` - Added user-friendly codec warning for unsupported video formats
5. `e750372` - Removed dependency-review-action (requires GitHub Advanced Security)

### Today's Work
- **Symlink Security Fix:** Implemented `fs.realpathSync()` for resolving macOS symlinks in security validation
- **Quality Gate Compliance:** Fixed lint errors in test mocks
- **Video Feature Progress:** Codec detection and transcoding implementation

## Quality Gates Status

### ✅ Lint
- **Status:** PASS (0 errors, 49 warnings allowed)
- **Command:** `npm run lint`

### ✅ Typecheck
- **Status:** PASS (0 errors)
- **Command:** `npm run typecheck`

### ⚠️ Tests
- **Status:** PARTIAL (259 passing, 18 failing)
- **Command:** `npm test`
- **Failing Tests:**
  - `App.test.tsx`: 16 failures (pre-existing, incomplete video feature)
  - `metadataWriter.test.ts`: 2 failures (pre-existing)

## Known Issues

### Pre-existing Test Failures
- **App.test.tsx:** 16 tests failing due to incomplete video transcoding integration
- **metadataWriter.test.ts:** 2 tests failing (unrelated to recent work)

### Incomplete Features
- **Video Transcoding:** `electron/services/videoTranscoder.ts` created but untracked
- Integration with main App flow incomplete

## Modified Files (Uncommitted)
- README.md
- electron/main.ts
- electron/preload.ts
- electron/schemas/ipcSchemas.ts
- electron/services/metadataWriter.ts
- electron/services/securityValidator.test.ts
- electron/services/securityValidator.ts
- src/App.css
- src/App.tsx
- src/types/electron.d.ts
- src/types/index.ts

## New Files (Untracked)
- .coord/ (coordination structure)
- electron/main.test.ts
- electron/services/videoTranscoder.ts

## Phase Indication
**Current Phase:** B2/B3 (Implementation/Integration)
**Evidence:** Active TDD cycles, feature integration, test failures being addressed

## Last Updated
2025-11-09
