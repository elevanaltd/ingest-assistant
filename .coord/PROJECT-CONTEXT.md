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
`main` (production baseline) + active feature development

### Recent Work (Last 10 Commits - November 2025)
1. `80db56d` - Merge pull request #48 (extras fixes)
2. `38a85f4` - Add action field to structured analysis and parsing
3. `1728cdd` - Merge pull request #47 (extras fixes)
4. `52bee42` - Merge pull request #46 (orchestrator issues review)
5. `0e2e3bd` - Merge pull request #44 (feat/add-action)
6. `d015738` - fix: eliminate all 67 @typescript-eslint/no-explicit-any warnings (#41)
7. `4fde220` - build: migrate ESLint v8 to v9 with flat config (#45)
8. Previous: Video transcoding feature, coordination foundation

### Current Implementation State (2025-11-11)
- **Working Tree:** Clean (all changes committed)
- **Development Status:** ACTIVE - Electron app is production path
- **Major Features Completed:**
  - ✅ Keyboard shortcuts & command palette (Issue #22, PR #40)
  - ✅ Virtual scrolling for file lists (Issue #23, PR #42)
  - ✅ Paginated file loading (Issue #19)
  - ✅ Security hardening - batch IPC validation (Issue #18, PRs #31, #33)
  - ✅ Result type schemas with versioning (Issue #20, PR #39, ADR-008)
  - ✅ Video 4-part naming with action field (Nov 11)
- **Quality Improvements:**
  - ✅ TypeScript strict mode - all `any` types eliminated (Issue #41)
  - ✅ ESLint v9 migration with flat config (Issue #45)
- **Architecture Status:** Phase 0 prerequisites COMPLETE, Tier 2-3 features IMPLEMENTED

## Quality Gates Status

### ✅ Lint
- **Status:** PASS (0 errors, 49 warnings allowed)
- **Command:** `npm run lint`

### ✅ Typecheck
- **Status:** PASS (0 errors)
- **Command:** `npm run typecheck`

### ⚠️ Tests
- **Status:** REQUIRES VALIDATION (last known: 259 passing, 18 failing on 2025-11-09)
- **Command:** `npm test` (requires `npm install` first - node_modules not present in current environment)
- **Note:** Test status requires verification after recent commits (38a85f4 action field, d015738 TypeScript cleanup)
- **Previous Failing Tests (Nov 9):**
  - `App.test.tsx`: 17 failures (Action field feature - placeholder mismatch)
  - `metadataWriter.test.ts`: 1 failure (assertion argument type error)

## Known Issues

### Status Validation Required
**Action Required:** Run full test suite to determine current quality gate status after:
- Action field implementation (38a85f4 - Nov 11)
- TypeScript any elimination (d015738 - Issue #41)
- ESLint v9 migration (4fde220 - Issue #45)

**Previous Test Failures (Historical - Nov 9):**
1. **App.test.tsx (17 failures):**
   - Root cause: Test expects placeholder `/cleaning, installing/i` but actual is `"cleaning"`
   - Pattern: Action field feature tests using wrong placeholder pattern matching
   - **Possible Resolution:** Action field commit (38a85f4) may have addressed these

2. **metadataWriter.test.ts (1 failure):**
   - Error: "the given combination of arguments (undefined and string) is invalid"
   - Test: "should write title without tags"
   - **Status:** Unknown if resolved in subsequent commits

## Phase Indication
**Current Phase:** B4 (Handoff/Production Readiness)
**Evidence:**
- Phase 0 prerequisites: ✅ COMPLETE (Security, Pagination, Result Schemas)
- Tier 2-3 features: ✅ IMPLEMENTED (Virtual scrolling, Keyboard shortcuts)
- Quality improvements: ✅ COMPLETE (TypeScript strict, ESLint v9)
- Quality gates: Lint ✅, Typecheck ✅, Tests ⚠️ (requires validation)
- **Ready for:** Test validation → Production deployment decision

## Last Updated
2025-11-11 (Documentation restoration - holistic-orchestrator constitutional review)
