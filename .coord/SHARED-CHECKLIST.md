# Ingest Assistant - Shared Checklist

## Current Status (2025-12-03 Updated)

### ✅ Issue #113: BatchOperationsPanel bypasses context - COMPLETE (PR #127 merged)

**Resolution:**
- Refactored 4 handlers to use `useBatchQueue()` context actions
- Removed all direct `window.electronAPI.batchStart/batchCancel` calls
- Added 5 new tests verifying context usage pattern
- Tests: 1257 passing (+6 from fix)

---

### ✅ Issue #116: Reset transfer counters - COMPLETE (PR #130 merged 2025-12-03)

**Resolution:**
- `resetTransfer()` now called from `startTransfer()` (L242) and both `cancelTransfer()` paths (L305, L309)
- All 9 counters reset: `isTransferring`, `transferProgress`, `transferStatus`, `currentFile`, `filesCompleted`, `filesTotal`, `bytesTransferred`, `bytesTotal`, `lastError`
- 3 new tests verify counter reset behavior (success path, error path, stale state cleanup)
- TDD compliance: df234b2 (RED) → d9cd575 (GREEN) → cd67879 (merge)
- Tests: 1268 passing (+3 from fix)

---

### 🟡 Active Tech Debt - Prioritized

**Issue #117: main.ts tech debt extraction** - **LOW**
- **Status:** NOT FIXED - main.ts now 1458 LOC (grew +13 lines since issue created)
- **Problem:** Embedded utilities (RateLimiter, timestamp helpers, media server) + inline IPC handlers
- **Impact:** Integration debt accumulating; cognitive load navigating 1458 LOC file
- **Fix:** Extract to `utils/rateLimiter.ts`, `utils/timestampUtils.ts`, following `cfexTransferHandlers.ts` pattern
- **Owner:** technical-architect (spike)
- **Success Criterion:** main.ts < 1400 LOC; extracted utilities have unit tests
- **Est. Cost:** 2-4 hours per extraction target

**Backlog Cleanup (2025-12-03):**
- ✅ #21: Closed as RESOLVED (tier mapping doc complete)
- ✅ #26: Closed as SUPERSEDED by #102 (Feature-Context Architecture delivered scope)
- ✅ #25: Closed as WONTFIX (Result/Either - no ROI, current error handling works)
- ✅ #28: Closed as WONTFIX (State machine - no undo/redo requirement)

---

### ✅ Proxy Filename Resolution Fix - COMPLETE (PR #123 merged 2025-12-03)

**Problem:** ENOENT error when AI processing proxy files (`EA002033_proxy.mov`) because stale `.ingest-metadata.json` stored raw filename (`EA002033.MOV`).

**Solution:**
- Created `metadataReconciler.ts` with `reconcileMetadata()` helper
- Returns `{ metadata, updated }` flag for conditional persistence
- Applied to both `file:list-all` and `file:list-range` IPC handlers

**Quality Gates:**
- CRS (Codex): GO (9/10)
- CE (Gemini): GO (Approved)
- Tests: 1251 passing (+10 new)
- TDD: 5 commits (RED→GREEN pattern)

**Enables Option B Workflow:**
1. Export files off CFEx card
2. Create proxies (`{name}_proxy.mov`)
3. AI process proxy files → JSON in proxy folder ✅

---

### ✅ ExifPreserver I1 Bug Fix - COMPLETE (PR #122 merged 2025-12-03)

**Problem:** All proxy files received SAME DateTimeOriginal timestamp instead of individual chronological timestamps. Root cause: `exiftool` command syntax doesn't support per-file tag values in single invocation.

**Fix Applied (6 commits, TDD pattern):**
- [x] Per-file timestamp preservation (separate exiftool call per file)
- [x] Concurrency limiting (CONCURRENCY_LIMIT=8 prevents EMFILE)
- [x] Fail-continue behavior (Promise.allSettled ensures all files attempted)

**Quality Gates:**
- code-review-specialist (Codex): GO (9/10)
- critical-engineer (Gemini): GO (9/10) - MERGE_APPROVED
- Tests: 1245 passing (+4 new ExifPreserver tests)

---

### ✅ Feature-Context Architecture (Issue #102) - COMPLETE

**Status:** ALL PHASES COMPLETE (PR #110 merged 2025-12-02)
**GitHub:** https://github.com/elevanaltd/ingest-assistant/issues/102
**Architectural Review:** code-review-specialist CONDITIONAL (6/10) - pre-existing gaps identified

**All Phases Completed:**
- [x] **Phase 1: Scaffold** - directories + AppProviders + test-utils (PR #104)
- [x] **Phase 5.1-5.7: Context extractions** - IngestSettings, BatchQueue, CfexTransfer, FileList, MetadataForm
- [x] **Phase 5.8: App.tsx cleanup** - 875→242 LOC (72% reduction)
- [x] **Phase 7: SettingsModal decomposition** - 1077 LOC → 5 tab components (PR #109)
- [x] **Phase 8a: CfexTransferWindow decomposition** - 614→304 LOC (51% reduction, +29 tests)
  - [x] FolderPicker.tsx (283 LOC)
  - [x] TransferProgress.tsx (51 LOC)
  - [x] ValidationResults.tsx (65 LOC)
- [x] **Phase 8b: BatchOperationsPanel decomposition** - 595→403 LOC (32% reduction, +31 tests)
  - [x] BatchActionButtons.tsx (173 LOC)
  - [x] BatchProgressDetails.tsx (117 LOC)
  - [x] ProxyProgressCard.tsx (50 LOC)

**Final Results:**
- App.tsx: 875 → 242 LOC (72% reduction) ✅
- SettingsModal: 1077 → modular directory ✅
- CfexTransferWindow: 614 → 304 LOC (51% reduction) ✅
- BatchOperationsPanel: 595 → 403 LOC (32% reduction) ✅
- Tests: 1034 → 1233 (+199 new tests) ✅
- QG: Tests 1233✅ Lint 0✅ Types 0✅

**Architectural Gaps Discovered (pre-existing, now tracked):**
- Issue #111: CFEx Cancel button is no-op (HIGH) - **RESOLVED via #106**
- Issue #112: CFEx Proxies settings not propagated (HIGH) - **RESOLVED via PR #118**
- Issue #113: BatchOperationsPanel bypasses context - **RESOLVED via PR #127** (2025-12-03)

**Tech Debt Resolved (2025-12-02):**
- ✅ Issue #105: Centralize Proxy Progress Listener → `useProxyProgress` hook
- ✅ Issue #106: Implement IPC-level CFEx Cancellation → `cfex:cancel` handler

---

### ✅ v2.3.0 Released (Nov 30, 2025)

**Phase 1b Proxy Generation: COMPLETE**
- ✅ B2 Implementation: All 8 phases complete (B2.1-B2.8)
- ✅ B3 Validation: 4 specialist reviews passed
  - test-methodology-guardian: TDD 9/10, Quality 8/10 → GO
  - code-review-specialist: 9.2/10 → GO
  - quality-observer: 8.5/10 → CONDITIONAL GO (conditions met)
  - universal-test-engineer: 2 HIGH priority tests added
- ✅ Quality Gates: 1034/1042 tests, 0 lint errors, 0 type errors
- ✅ Features: ProRes 2K proxy, EXIF preservation, progress UI, fail-log-continue
- ✅ GitHub Release: v2.3.0 created

**Issues Closed (Nov 30):**
- ✅ #54 - XMP Field Alignment (SUPERSEDED by JSON architecture)
- ✅ #30 - Lazy Loading/Pagination (COMPLETE - virtual scrolling implemented)

---

### ✅ v2.2.0 Release Complete (Nov 18, 2025)

**Version Checkpoint Established:**
- ✅ **Git Tag:** v2.2.0 (commit d7f7f9d - package.json version bump)
- ✅ **GitHub Release:** https://github.com/elevanaltd/ingest-assistant/releases/tag/v2.2.0
- ✅ **DMG Artifacts:** Ingest Assistant-2.2.0-arm64.dmg (127M)
- ✅ **Version Coherence:** package.json, git tag, DMG filename all aligned at 2.2.0
- ✅ **Rollback Capability:** Validated (git checkout v2.2.0 OR download DMG)
- ✅ **PR #76:** Version bump merged to main after CI GREEN

---

## Last Updated
2025-12-03 (Issue #116 RESOLVED - PR #130 merged)
**Tests:** 1268 passing (+3 from #116)
**Branch:** main (cd67879)
**Lint:** 0 errors, 6 warnings
**Open Issues:** 6 (#116 closed, remaining: #117, #125, #128, #73, #63, #29, #27)
