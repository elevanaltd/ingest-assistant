# Ingest Assistant - Project Context

---

## 🌐 Ecosystem Position

**For complete pipeline positioning (where we fit in EAV production workflow):**
→ **[`.coord/ECOSYSTEM-POSITION.md`](.coord/ECOSYSTEM-POSITION.md)**

**Pipeline Step:** 6 of 10 | **Role:** AI pre-tagging gateway | **Downstream:** CEP Panel (Premiere Pro ingestion)

---

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
`main` (production baseline)

### Recent Work (Last 5 Commits)
1. `3d691be` - Merge pull request #17 (video feature integration)
2. `d0982cf` - Merge branch 'claude/build-video-a-011CUunZ44KwfEYzxEqCb7PL'
3. `fbaac69` - docs: establish coordination foundation
4. `fc7bf10` - test: update obsolete test expectations
5. `dfdf4b5` - fix: quality gate compliance and async race condition

### Current State
- **Working Tree:** Clean (all changes committed)
- **Last Merge:** Video transcoding feature integrated from feature branch
- **Coordination:** Established .coord/ structure for project management

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
  - `App.test.tsx`: 17 failures (Action field feature - placeholder mismatch)
  - `metadataWriter.test.ts`: 1 failure (assertion argument type error)

## Known Issues

### Test Failures Requiring Resolution
1. **App.test.tsx (17 failures):**
   - Root cause: Test expects placeholder `/cleaning, installing/i` but actual is `"cleaning"`
   - Pattern: Action field feature tests using wrong placeholder pattern matching
   - Impact: Blocks quality gate compliance

2. **metadataWriter.test.ts (1 failure):**
   - Error: "the given combination of arguments (undefined and string) is invalid"
   - Test: "should write title without tags"
   - Likely: Assertion syntax error in test code

## Phase Indication
**Current Phase:** B3 (Integration/Quality Gate Compliance)
**Evidence:**
- Feature work merged to main
- 18 test failures blocking phase completion
- Quality gates: Lint ✅, Typecheck ✅, Tests ⚠️

## Last Updated
2025-11-09
