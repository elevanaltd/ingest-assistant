# Ingest Assistant - Project Context

**Last Updated:** 2025-11-30 | **Version:** v2.3.0 | **Branch:** main (Phase 1b COMPLETE)

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
- **Testing:** Vitest (1034 tests, 64 files)
- **AI:** OpenRouter, Anthropic Claude, OpenAI APIs
- **Database:** Supabase (shared with EAV Monorepo)

---

## Current State

### Branch Status
```
Branch: main (v2.3.0 release)
Tests:  1034/1042 passing + 8 skipped
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
| Tests | PASS (1034/1042) | `npm test` |

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

### 🔄 Active Work: Feature-Context Architecture (Issue #102)

**Status:** Phases 5.2-5.4 COMPLETE → Phase 5 (App.tsx Cleanup) + Phase 6 (Validation) REMAINING
**GitHub:** https://github.com/elevanaltd/ingest-assistant/issues/102
**Last Session:** 2025-11-30 (holistic-orchestrator: 98/100 reliability, APPROVED)

**Problem:** God components with scattered state
- SettingsModal.tsx: 1146 LOC (37 useState)
- App.tsx: 1077 LOC (28 useState)
- Cross-tab coupling, CFEx config drift risk

**Solution:** Feature-Context Architecture
```
src/contexts/     → IngestSettings, CfexTransfer, BatchQueue
src/providers/    → AppProviders.tsx (composition point)
src/hooks/        → useIngestSettings, useCfexTransfer, useBatchQueue
```

**Phases:**
- ✅ Phase 1: Scaffold - AppProviders + test-utils (COMPLETE - PR #104)
- ✅ Phase 5.1: AppProviders integration at App root (COMPLETE)
- ✅ Phase 5.2: SettingsModal → useIngestSettings (7 commits, +7 tests)
- ✅ Phase 5.3: BatchOperationsPanel → useBatchQueue (1 commit, +3 tests)
- ✅ Phase 5.4: CfexTransferWindow → useCfexTransfer (3 commits, +10 tests)
- [ ] Phase 5: App.tsx Cleanup (4-6h) - pure tab router (~200 LOC target)
- [ ] Phase 6: Validation (4-6h) - all 1081+ tests + code review

**Achievements (2025-11-30):**
- Tab persistence verified (state survives tab switches)
- IPC subscriptions centralized (no duplication for main features)
- TDD discipline maintained (RED→GREEN commits: 16c30d1→c04d105, 3438d47→36ffd16)
- Architecture: AppProviders (root singleton) → IngestSettingsProvider + BatchQueueProvider + CfexTransferProvider

**Tech Debt Identified (non-blocking):**
- A: Proxy progress duplication → create ProxyProvider (future Phase 6+)
- B: UI-only cancellation → implement IPC cancel (feature card)

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
760b97b test: add HIGH priority validation tests for Phase 1b proxy generation (GREEN)
bdae1ed Merge pull request #99 from elevanaltd/feat/b2.7-proxy-ui-and-presets
3386874 fix: show EXIF verification failures in proxy result message (GREEN)
4695bd6 test: add failing tests for proxy result messages (RED)
a6f594f feat: implement proxy progress UI in BatchOperationsPanel and CfexTransferWindow (GREEN)
aa24169 test: add failing tests for proxy progress UI (RED)
379f8d6 fix: use path module for cross-platform proxy matching (GREEN)
c1ee176 test: add failing tests for proxy path matching edge cases (RED)
5a1c600 docs: update PROJECT-HISTORY with B2.7 session and known EXIF issue
149af45 fix: set percentComplete to 100 on successful transfer completion
```
