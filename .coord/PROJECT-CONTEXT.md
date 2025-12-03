# Ingest Assistant - Project Context

**Last Updated:** 2025-12-03 | **Version:** v2.3.0 | **Branch:** main (Proxy Filename Resolution Fix)

---

## Project Identity

| Attribute | Value |
|-----------|-------|
| **Name** | Ingest Assistant |
| **Purpose** | AI-powered media file ingestion and metadata assistant |
| **Type** | Electron desktop application |
| **Platform** | macOS (darwin) + Ubuntu (linux) |
| **Pipeline Position** | Step 6 of 10 (field capture → post-production gateway) |
| **Downstream** | CEP Panel (Premiere Pro ingestion) |

**Ecosystem:** [`ECOSYSTEM-POSITION.md`](ECOSYSTEM-POSITION.md)

---

## Tech Stack

- **Runtime:** Electron (main + renderer)
- **Frontend:** React 18, TypeScript
- **Build:** Vite
- **Testing:** Vitest (1251 tests, 88 files)
- **AI:** OpenRouter, Anthropic Claude, OpenAI APIs
- **Database:** Supabase (shared with EAV Monorepo)

---

## Current State

### Branch Status
```
Branch: main (v2.3.0 + Proxy Filename Resolution)
Tests:  1251 passing (+10 from proxy filename fix)
Lint:   0 errors
Types:  0 errors
Security: 6 moderate vulns (HIGH eliminated)
```

### Phase Progression
```
D0→D1→D2→D3→B0(Phase 1a)→B2(1a COMPLETE)→1c COMPLETE→Phase 1b(B2.1-B2.8 COMPLETE)→B3 VALIDATED→✅ RELEASE READY
```

### CFEx Phase 1a Implementation

**Week 1:** COMPLETE (100%)
- Transfer mechanism (scanSourceFiles, transferFile, startTransfer)
- Integrity validation (integrityValidator, EXIF preservation)
- IPC handlers (cfexTransferHandlers)
- Renderer UI (CfexTransferWindow)

**Week 2:** COMPLETE (100%)
- Priority 1 (Error Handling): COMPLETE
- Priority 2 (Auto-Detection service): COMPLETE (IPC+UI deferred - not needed for current workflow)
- Priority 3 (Integration Testing): SKIPPED (risk-accepted, fix-in-production approach)
- Priority 4 (Settings Tab): COMPLETE
- UX Enhancements: COMPLETE

**Phase 1a-CORE:** ✅ COMPLETE (Risk-Accepted 2025-11-26)
- Decision: Skip empirical integration testing, address issues in production
- Rationale: Error handling comprehensive (47 tests, exponential backoff), real-world feedback faster
- Risk: I4 (Zero Data Loss) remains 🟡 Partial until production validation
- Commitment: First failure = BLOCKING priority fix

---

## Quality Gates

| Gate | Status | Command |
|------|--------|---------|
| Lint | PASS (0 errors) | `npm run lint` |
| Typecheck | PASS (0 errors) | `npm run typecheck` |
| Tests | PASS (1251 passing) | `npm test` |

---

## Database Integration

### Shared Supabase Architecture
- **Project ID:** zbxvjyrbkycbfhwmmnmy
- **IA Schema:** `media_references` (reference catalog, vector embeddings)
- **EAV Schema:** `public` (authoritative: shots, shoots, scripts, projects)
- **Local:** http://127.0.0.1:54323/
- **Remote:** https://zbxvjyrbkycbfhwmmnmy.supabase.co

### Cross-Ecosystem (Issue #63 - DEFERRED)
- **Status:** Deferred 4-6 weeks (after CFEx Phase 1)
- **Guardrails Required:** Contract spec, compatibility tests, SLO observability

---

## Testing Paths

**LucidLink (Cloud Storage):**
- Path: `/Volumes/videos-current/2. WORKING PROJECTS`
- Status: ACCESSIBLE

**Ubuntu NFS (Raw Storage):**
- Path: `/Volumes/EAV_Video_RAW/`
- Status: ACCESSIBLE

---

## Active Work

### ✅ Phase 1c: Power Features - COMPLETE (PR #88 merged 2025-11-26)

**B2 Implementation Complete (6 of 6 phases):**
- ✅ **Phase 1:** Security Foundation - FilenameTemplateParser (54 tests)
  - Command injection prevention, path traversal blocking, whitelist sanitization
- ✅ **Phase 2:** TapeName Logic - MetadataToggleService (10 tests)
  - Conditional metadata writing (I3 compliance)
- ✅ **Phase 3:** Settings Persistence - CfexConfig extension (6 tests)
  - getCfexToggles/setCfexToggles methods
- ✅ **Phase 4:** UI Implementation - SettingsModal toggles (9 tests)
  - 3 toggle checkboxes + conditional filename template input
- ✅ **Phase 5:** AI Auto-Analyze Integration (5 tests)
  - Event emission: `cfex:trigger-ai-analysis`
- ✅ **Phase 6:** Security Fix + Code Review (10 tests + 10 tests)
  - Template static text validation (BLOCKING issue resolved)
  - Optional field handling (photos without action field)
  - code-review-specialist: GO verdict

**3 Toggles Delivered (all default OFF per I7):**
- AI Auto-Analyze Toggle - triggers after transfer if enabled
- Metadata Write Toggle (shotName, LogComment, TapeName)
- Filename Rewrite Toggle + Template parser with security hardening

### ✅ Filename ID Stability Fix - COMPLETE (PR #93 merged 2025-11-27)

**Architectural Gap Resolved:**
- **Problem:** File IDs derived from filenames broke metadata lookup after filename rewrite
- **Root Cause:** `extractFileId()` used first 8 chars of current filename → changed after rename
- **Solution:** Use `cameraId` as stable anchor with polymorphic lookup strategy

**Changes (3 files, +352 lines, 5 new tests):**
- ✅ `metadataStore.ts` - 4-strategy polymorphic lookup (direct key → cameraId → currentFilename → originalFilename)
- ✅ `fileManager.ts` - cameraId hydration in scanFolder(), defensive null check on load failure
- ✅ `main.ts` - Double extension fix using cameraId before rename

**Validation:**
- code-review-specialist: GO (8/10 reliability)
- TDD: RED→GREEN commits visible (06ed7ac → 5c3ddca → 291b28a)
- Quality gates: All passing

### ✅ File Rename Safety System - COMPLETE (Branch: fix/batch-operations-and-lint)
**I7 Human Primacy Enforcement:**
- ✅ Checkbox warning dialog when enabling filenameRewrite
- ✅ Session-ephemeral state (resets to false on app open)
- ✅ Batch operations warning dialog before destructive operations
- ✅ Backend/frontend coherence (both reset on startup)

**Quality Improvements:**
- ✅ Lint warnings: 153→0 (100% elimination)
- ✅ Test file exemption for `any` types configured
- ✅ Production code properly typed (`unknown` with guards)
- ✅ Security: HIGH vulnerability eliminated (glob, js-yaml patched)

**UI Enhancements:**
- ✅ Select All/Deselect All buttons in sidebar
- ✅ App opens at full screen width
- ✅ Checkbox inline with filename (improved layout)

**Commits:** e091fb6→3757275→56d2cc8→1e65d78→ab13473→5d36403→d3232f2→91cae52→d498693

### ✅ Phase 1b: Proxy Generation - COMPLETE (v2.3.0)

**D2-B0 Orchestration (2025-11-27):** COMPLETE
- D2.1::ideator→22_alternatives[5_dimensions]
- D2.2::validator(codex)→CONDITIONAL[file_size_heuristic_rejected]
- D2.3::synthesizer→Progressive_Fidelity_Architecture[Profile_0_first]
- D3.1::design-architect→1800_line_blueprint[9_sections]
- D3.2::technical-architect(gemini)→CONDITIONAL_GO[8/10][2_critical_fixes]
- B0::critical-design-validator(codex)→CONDITIONAL_GO[7/10][5_conditions]

**B2 Implementation (ALL COMPLETE):**
- ✅ B2.1::ProxyGenerator→21_tests→ffmpeg_stderr_progress_parsing→GREEN
- ✅ B2.2::ExifPreserver→19_tests→3-phase_workflow+cross_platform_matching+ENOENT→GREEN
- ✅ B2.3::ProxyOrchestrator→11_tests→fail-log-continue→GREEN
- ✅ B2.4::Security+Validation→4_tests→SecurityValidator_integration→GREEN
- ✅ B2.5::Cleanup→4_tests→partial_proxy_deletion+disk_space_exhaustion→GREEN
- ✅ B2.6::IPC_Handlers→8_tests→proxyGenerationHandlers.ts→GREEN
- ✅ B2.7::UI_Components→proxy_progress_UI+result_messages→COMPLETE
- ✅ B2.8::Integration_Tests→5_test_plans_documented[skipped_pending_fixtures]

**B3 Validation (2025-11-29):**
- ✅ test-methodology-guardian(codex)::TDD_9/10+Quality_8/10→GO
- ✅ code-review-specialist::9.2/10→GO[no_blocking_issues]
- ✅ quality-observer(gemini)::8.5/10→CONDITIONAL_GO[conditions_met]
- ✅ universal-test-engineer::2_HIGH_tests_added[ENOENT+disk_space]
- ✅ Quality gates: 1034/1042 tests, 0 lint, 0 type errors

**Features Delivered:**
- 2560×1440 ProRes Proxy generation (10-bit 4:2:2)
- DateTimeOriginal EXIF preservation (I1 compliance)
- Real-time progress UI (ffmpeg time= parsing)
- Fail-log-continue architecture (single failure doesn't halt batch)
- Proxy presets: ProRes 2K, ProRes 1080p, H.264 1080p, H.264 720p
- EXIF verification with I1 violation detection

### Deferred (Phase 1a-POLISH → parallel to Phase 1b/1c)
- Auto-detection IPC + UI (service layer complete, IPC+multi-card dialog when needed)
- Path Intelligence (MRU, smart defaults, pinned folders)
- Enhanced error log UI
- Integration testing (risk-accepted: fix-in-production)

### Future Phases
- **Issue #63:** Reference Catalog (3-6 months)

### ✅ Feature-Context Architecture (Issue #102) - COMPLETE (2025-12-02)

**Status:** ALL PHASES COMPLETE (PR #110 merged)
**GitHub:** https://github.com/elevanaltd/ingest-assistant/issues/102
**Architectural Review:** code-review-specialist: CONDITIONAL (6/10) - pre-existing gaps identified

**Problem Solved:** God components with scattered state
- App.tsx: 875 LOC → 242 LOC (72% reduction)
- SettingsModal: 1077 LOC → modular directory (5 components)
- CfexTransferWindow: 614 LOC → 304 LOC (51% reduction)
- BatchOperationsPanel: 595 LOC → 403 LOC (32% reduction)
- Tests: 1034 → 1233 (+199 new tests)

**Architecture Delivered:**
```
main.tsx → AppProviders (root singleton)
  ├─ IngestSettingsProvider (config)
  ├─ BatchQueueProvider (volatile)
  ├─ CfexTransferProvider (transfer + tab persistence)
  ├─ FileListProvider (file navigation)
  └─ MetadataFormProvider (form state)
       └─ App.tsx (pure tab router, 242 LOC)

src/components/SettingsModal/
  ├─ index.tsx (640 LOC) - state container + tab shell
  ├─ LexiconTab.tsx, AITab.tsx, CfexTab.tsx, IngestionTab.tsx

src/components/CfexTransferWindow/
  ├─ index.tsx (304 LOC) - state + handlers
  ├─ FolderPicker.tsx, TransferProgress.tsx, ValidationResults.tsx

src/components/BatchOperationsPanel/
  ├─ index.tsx (403 LOC) - state + handlers
  ├─ BatchActionButtons.tsx, BatchProgressDetails.tsx, ProxyProgressCard.tsx

src/components/
  ├─ IngestTabContent.tsx (591 LOC) - ingest tab UI
  └─ MediaViewer.tsx (137 LOC) - media preview
```

**All Phases Completed:**
- ✅ Phase 1: Scaffold - AppProviders + test-utils (PR #104)
- ✅ Phase 5.1-5.7: Context extractions (5 contexts)
- ✅ Phase 5.8: App.tsx cleanup (875→242 LOC)
- ✅ Phase 7: SettingsModal decomposition (PR #109)
- ✅ Phase 8a: CfexTransferWindow decomposition (+29 tests)
- ✅ Phase 8b: BatchOperationsPanel decomposition (+31 tests)

**QG:** Tests 1241✅ Lint 0✅ Types 0✅

**Issues Closed (2025-12-02):**
- ✅ #102: Feature-Context Architecture (COMPLETE)
- ✅ #105: Centralize Proxy Progress Listener → `useProxyProgress` hook
- ✅ #106: IPC-level CFEx Cancellation → `cfex:cancel` handler
- ✅ #111: CFEx Cancel button (resolved via #106)
- ✅ #112: CFEx Proxy settings propagation (PR #118)

### ✅ Proxy Filename Resolution Fix - COMPLETE (2025-12-03)

**Problem:** ENOENT error when AI processing proxy files (e.g., `EA002033_proxy.mov`) because stale metadata stored raw filename (`EA002033.MOV`).

**Root Cause:** When opening proxy folder with existing `.ingest-metadata.json` from previous raw scan, stored `currentFilename` wasn't updated to match actual disk filename.

**Solution:**
- Created `metadataReconciler.ts` with `reconcileMetadata()` helper
- Returns `{ metadata, updated }` flag to enable conditional persistence
- Applied to both `file:list-all` and `file:list-range` IPC handlers
- Stale metadata auto-corrected when disk filename differs

**Commits:** 5 (TDD discipline: RED→GREEN pattern)
**Tests:** +10 new tests (3 unit + 7 integration)
**Quality Gates:** CRS GO (9/10), CE GO (Approved)

**Enables Option B Workflow:**
1. Export files off CFEx card
2. Create proxies (`{name}_proxy.mov`)
3. AI process proxy files → JSON in proxy folder ✅

**Remaining Open Issues:**
- Issue #113: BatchOperationsPanel bypasses context (MEDIUM)
- Issue #116: Reset transfer counters on cancel/start (LOW)
- Issue #117: main.ts tech debt extraction (LOW)

---

## Assumptions to Validate

| ID | Assumption | Method | Priority |
|----|------------|--------|----------|
| A1 | pgvector p95 <150ms at 10k shots | Load test harness | HIGH |
| A2 | FK RESTRICT acceptable for EAV deletion | Production patterns | HIGH |
| A3 | Quarterly FK audit sufficient cadence | Schema change frequency | MEDIUM |

---

## Unresolved Questions

| Question | Validate By |
|----------|-------------|
| Principal-engineer re-validation after guardrails? | 4-6 weeks |
| EAV_CONTRACT:v2 versioning strategy? | Before first change |

---

## Key References

| Document | Purpose |
|----------|---------|
| [`PROJECT-HISTORY.md`](PROJECT-HISTORY.md) | Completed work archive |
| [`PROJECT-ROADMAP.md`](PROJECT-ROADMAP.md) | Future work planning |
| [`SHARED-CHECKLIST.md`](SHARED-CHECKLIST.md) | Immediate tasks |
| [`workflow-docs/000-INGEST_ASSISTANT-D1-NORTH-STAR.md`](workflow-docs/000-INGEST_ASSISTANT-D1-NORTH-STAR.md) | 7 Immutables |
| [`workflow-docs/001-CFEX-MICROPHASE-PLAN.md`](workflow-docs/001-CFEX-MICROPHASE-PLAN.md) | Phase 1a/1b/1c structure |
| [`workflow-docs/003-CFEX-D3-BLUEPRINT.md`](workflow-docs/003-CFEX-D3-BLUEPRINT.md) | Implementation specs (OCTAVE) |

---

## Recent Commits (Last 10)

```
5cc7495 fix: return updated flag from reconcileMetadata to enable persistence (GREEN)
b1af676 test: add failing tests for reconcileMetadata updated flag (RED)
3681e86 refactor: extract reconcileMetadata helper and fix pagination handler
c11eb93 fix: update currentFilename when disk filename differs from stored metadata (GREEN)
9264770 test: add test for stale currentFilename update
6e6b883 Merge pull request #122 from elevanaltd/fix/exif-preserver-i1-violation
3e67540 feat: fix ExifPreserver fail-fast bug with Promise.allSettled (GREEN)
51be02d test: add failing test for I1 best-effort fail-continue behavior (RED)
3c761ce feat: implement concurrency limiting in ExifPreserver.writeBatch (GREEN)
85c7306 test: add failing test for concurrency limiting in ExifPreserver.writeBatch (RED)
```
