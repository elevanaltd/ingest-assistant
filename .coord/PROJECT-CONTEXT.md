# Ingest Assistant - Project Context

**Last Updated:** 2025-12-02 | **Version:** v2.3.0 | **Branch:** feat/issue-102-phase-8-presentational-cleanup (Phase 8 IN PROGRESS)

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
- **Testing:** Vitest (1162 tests, 78 files)
- **AI:** OpenRouter, Anthropic Claude, OpenAI APIs
- **Database:** Supabase (shared with EAV Monorepo)

---

## Current State

### Branch Status
```
Branch: main (v2.3.0 release)
Tests:  1162/1177 passing (15 skipped)
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
| Tests | PASS (1162/1177) | `npm test` |

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

### ✅ Feature-Context Architecture (Issue #102) - Phase 7 COMPLETE

**Status:** Phase 7 COMPLETE (2025-12-01)
**GitHub:** https://github.com/elevanaltd/ingest-assistant/issues/102
**Code Review:** code-review-specialist: 8/10 GO

**Problem Solved:** God components with scattered state
- App.tsx: 875 LOC → 242 LOC (72% reduction)
- SettingsModal: 1077 LOC (monolithic) → modular directory (5 components)
- Tests: 1034 → 1162 (+128 new tests)

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
  ├─ LexiconTab.tsx (189 LOC) - presentational
  ├─ AITab.tsx (157 LOC) - presentational
  ├─ CfexTab.tsx (150 LOC) - presentational
  └─ IngestionTab.tsx (169 LOC) - presentational

src/components/
  ├─ IngestTabContent.tsx (591 LOC) - ingest tab UI
  └─ MediaViewer.tsx (137 LOC) - media preview
```

**Phases Completed:**
- ✅ Phase 1: Scaffold - AppProviders + test-utils (PR #104)
- ✅ Phase 5.1-5.7: Context extractions (IngestSettings, BatchQueue, CfexTransfer, FileList, MetadataForm)
- ✅ Phase 5.8: App.tsx cleanup (875→242 LOC)
- ✅ Phase 7: SettingsModal decomposition (1077 LOC → 5 tab components)

### 🔄 Phase 8: Presentational Cleanup - IN PROGRESS (2025-12-02)

**Status:** IN PROGRESS
**Branch:** feat/issue-102-phase-8-presentational-cleanup
**GitHub:** https://github.com/elevanaltd/ingest-assistant/issues/102

**Targets:**
| Component | Current | Target | Reduction | Risk |
|-----------|---------|--------|-----------|------|
| CfexTransferWindow.tsx | 614 LOC | ~341 LOC | 45% | LOW |
| BatchOperationsPanel.tsx | 595 LOC | ~315 LOC | 47% | MEDIUM |

**Phase 8a: CfexTransferWindow Decomposition (LOW RISK)**
- [ ] Extract FolderPicker.tsx (~231 LOC) - already defined inline L64-295
- [ ] Extract TransferProgress.tsx (~14 LOC) - already defined inline L308-322
- [ ] Extract ValidationResults.tsx (~28 LOC) - already defined inline L329-357
- [ ] Create directory structure src/components/CfexTransferWindow/

**Phase 8b: BatchOperationsPanel Decomposition (MEDIUM RISK)**
- [ ] Extract BatchActionButtons.tsx (~150 LOC) - button group L319-437
- [ ] Extract BatchProgressDetails.tsx (~100 LOC) - expanded view L493-567
- [ ] Extract ProxyProgressCard.tsx (~30 LOC) - proxy progress L569-592
- [ ] Create directory structure src/components/BatchOperationsPanel/

**TDD Evidence:** RED→GREEN commits throughout all phases
**QG:** Tests 1162✅ Lint 0✅ Types 0✅

**Tech Debt Created (deferred to future issues):**
- Issue #105: Centralize Proxy Progress Listener
- Issue #106: Implement IPC-level CFEx Cancellation

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
e32680e Merge pull request #109 from elevanaltd/feat/issue-102-phase-7-settings-decomposition
91569ae fix: align SettingsModal test assertions with async context loading
fa36bbd refactor(settings): decompose SettingsModal into tab components (Phase 7)
4a92d97 fix: prevent stale media from rendering on rapid navigation
1d4a3f5 Merge pull request #108 from elevanaltd/docs/sync-coord-issue-102
10c55e0 chore: Add /sync-coord command for clean docs PRs
a6bed1c docs: sync-coord Issue #102 complete (FOUR-LAYER pattern)
e689c76 Merge pull request #107 from elevanaltd/feat/issue-102-context-architecture-phase5
f2d4172 fix: re-throw folder lock/unlock errors for UI feedback (PR #107 review)
74690f3 fix: add getShotTypes mock to test files for MetadataFormContext
```
