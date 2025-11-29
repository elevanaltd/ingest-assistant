# Ingest Assistant - Project History

**Purpose:** Archive of completed work, major milestones, and historical decisions. Consult when needing context on past implementations.

**Last Updated:** 2025-11-29

---

## 2025-11-29 Session: B2.7 Proxy UI + Configurable Presets + Bug Fixes
**Status:** COMPLETE | **Tests:** 1017/1025 | **PR:** #98

### Completed
- B2.7_00::main.ts_registration→proxy_IPC_handlers_callable
- B2.7_03::BatchPanel_button_rename→"AI Process"/"AI Reprocess"_clarity
- B2.7_04::proxy_button→"Generate Proxies for X Videos"+selection_aware
- B2.7_01::CFEx_proxy_destination_UI→checkbox+input+browse
- B2.7_02::CFEx_backend_integration→proxy_triggers_after_transfer
- B2.7_05::configurable_proxy_presets→5_formats_in_Settings

### Bug Fixes (Same Session)
- FIX::proxy_folder_paths→currentFolderPath_prop+folder_picker→ZodError_eliminated
- FIX::extension_bug→.MOV_for_ProRes,.mp4_for_H264→tied_to_codec
- FIX::transferredFiles_missing→added_tracking_to_TransferResult→proxy_gets_video_paths
- FIX::99.95%_progress→percentComplete:100_on_success

### Proxy Format Presets (User-Validated)
| Preset | Codec | Resolution | Container | ~Size/24s |
|--------|-------|------------|-----------|-----------|
| 2K ProRes Proxy ⭐ | prores_ks -profile:v 0 | 2560×1440 | .MOV | 175 MB |
| 1080p ProRes Proxy | prores_ks -profile:v 0 | 1920×1080 | .MOV | 78 MB |
| 4K ProRes Proxy | prores_ks -profile:v 0 | 3840×2160 | .MOV | 363 MB |
| 2K H.264 CRF 23 | libx264 -crf 23 | 2560×1440 | .mp4 | ~25 MB |
| 1080p H.264 CRF 18 | libx264 -crf 18 | 1920×1080 | .mp4 | ~15 MB |

### Known Issue (Deferred)
**P1: EXIF verification misses most proxy files** (electron/services/exifPreserver.ts:170-174)
- Current code: `rawPath.split('/').pop()?.replace('.MOV', '')`
- Only strips uppercase ".MOV" - misses .mov/.mp4/Windows paths
- Impact: EXIF verification silently skipped, I1 compliance gap for non-.MOV sources
- Status: DEFERRED to next session (see continuation prompt below)

### Quality
TRACED: T✅ R✅ E✅ D✅
QG: Lint✅(0/0) Typecheck✅ Tests1017/1025✅

---

## 2025-11-28 Session: Proxy Folder Path Wiring (Bug Fix)
**Status:** COMPLETE | **Tests:** 994/1002 (+67)

### Completed
- BUG_FIX::proxy_folder_paths→currentFolderPath_prop+selectFolder_dialog→ZodError_eliminated
- TDD::RED→GREEN→5_tests→folder_selection+path_wiring+cancellation→all_passing

### Implementation
- BatchOperationsPanel::currentFolderPath_prop→rawVideoFolder_population
- selectFolder_dialog→proxyOutputFolder_user_selection→defaultPath=currentFolderPath
- App.tsx::folderPath→BatchOperationsPanel[wiring]→paths_properly_populated

### Problem Solved
- ZodError[rawVideoFolder='',proxyOutputFolder='']⇒user_folder_selection⇒valid_paths_passed_to_IPC
- Button_click_failure⇒async_folder_selection+await⇒graceful_cancellation

### Quality
TRACED: T✅ R✅ E✅ D✅
QG: Lint✅(0/0) Typecheck✅ Tests994/1002✅

---

## 2025-11-27 Session: Phase 1b D2-B0 Orchestration + B2.1 Implementation
**Status:** COMPLETE | **Tests:** 927/929 (+21)

### Completed
- ORCHESTRATION::D2.1→D2.2→D2.3→D3.1→D3.2→B0→Progressive_Fidelity_Architecture
- B2.1::ProxyGenerator→21_tests→ffmpeg_stderr_time=_parsing→GREEN

### Decisions
- [2025-11-27] progress→ffmpeg_stderr_parsing[vs_file_size_17.5%]→accuracy⊗variable_raw_sizes
- [2025-11-27] architecture→Profile_0_first[vs_parallel_immediately]→additive_complexity⊗simplicity_first

### Problems Solved
- validator_rejected_17.5%_heuristic⇒ffmpeg_time=_parsing⇒accurate_progress
- technical-architect_identified_error_gap⇒fail-log-continue⇒batch_resilience

### Quality
TRACED: T✅ R✅ A✅ C✅ E✅ D✅
QG: TypeScript✅ ESLint✅(0/0) Tests927/929✅ Build✅

---

## 2025-11-27 Session: File Rename Safety + Lint Cleanup
**Status:** COMPLETE | **Tests:** 906/908 (+16)

### Completed
- SAFETY::filenameRewrite_warning_system→3_mechanisms[checkbox+ephemeral+batch]
- LINT::153→0_warnings→test_exemption+proper_types
- SECURITY::HIGH_vuln_eliminated→npm_audit_fix[glob+js-yaml]
- UI::sidebar_improvements→select_all+full_width+checkbox_inline

### Decisions
- [2025-11-27] filenameRewrite→session_ephemeral[vs_persisted]→I7_Human_Primacy⊗explicit_consent_each_session
- [2025-11-27] test_any_types→exemption_config[vs_type_each]→industry_standard⊗test_flexibility

### Problems Solved
- state_isolation⇒lift_to_App.tsx⇒warning_dialogs_work
- backend/frontend_gap⇒reset_on_startup⇒coherence_restored

### Quality
TRACED: T✅ R✅ A✅ C✅ E✅ D✅
QG: TypeScript✅ ESLint✅(0/0) Tests906/908✅ Build✅

---

## Release History

### v2.2.0 (Nov 18, 2025) - Production Baseline
- **Milestone:** Sequential shot numbers baseline
- **Artifacts:** DMG (127M) + ZIP (123M) for macOS ARM64
- **GitHub:** https://github.com/elevanaltd/ingest-assistant/releases/tag/v2.2.0
- **Significance:** Stable foundation before CFEx integration work

### v2.1.0 (Nov 14, 2025) - CEP Panel Integration
- **Milestone:** Date field integration complete
- **Features:** LogComment date field, EXIF timestamp extraction

### v2.0.0 (Nov 13, 2025) - JSON Schema Migration
- **Milestone:** metadata → keywords, audit trail, schema versioning

---

## Major Features Completed

### Sequential Shot Number Feature (Nov 17-18, 2025)
**Phases 1-5, A, B, C - ALL COMPLETE**

- **Phase 1-2:** Chronological sorting by EXIF DateTimeOriginal + shot number assignment
- **Phase 3:** XMP metadata with shot numbers
- **Phase A:** LogComment format aligned with CEP Panel
- **Phase B:** COMPLETED marker system (immutable after commit)
- **Phase C:** UI with COMPLETE/REOPEN buttons, loading spinner

**Critical Bugs Fixed:**
- Metadata filename mismatch (.ingest-metadata.json vs metadata-store.json)
- Wrong timestamp source (stats.mtime → EXIF DateTimeOriginal)
- Missing EXIF fallback handling

**XMP Format:** `shotName=lounge-media-plate-MID-#1`
**LogComment:** `location=X, subject=Y, action=Z, shotType=W, shotNumber=#5`

### PR #77 R1.1 Schema Alignment (Nov 19, 2025)
- **Problem:** mainName → shotName field rename for CEP Panel R1.1 contract
- **Solution:** Global schema migration with 41 new tests (543 → 584 total)
- **Changes:**
  - Field rename: mainName → shotName
  - New field: lockedFields: string[]
  - shotName format validation: includes #N suffix when shotNumber present
- **Impact:** Zero rework risk for CFEx Phase 1a

### PR #68 TDD Remediation (Nov 15, 2025)
- **Problem:** Non-TDD code change caused 7 failing tests
- **Root Cause:** Single conflated useEffect handling form + media loading
- **Solution:** Option 3 - Separated concerns with memoized currentFile
- **Implementation:**
  - Effect 1 (Form State): Dependencies on `[currentFile, shotTypes]`
  - Effect 2 (Media Loading): Dependencies on `[currentFile]`
  - Stabilization: `useMemo(() => files[currentFileIndex], [files, currentFileIndex])`

### CEP Panel Date Field Integration (Nov 14, 2025)
- **Issue:** eav-cep-assist Issue #31
- **Format:** `location=X, subject=Y, action=Z, shotType=W, date=202511031005`
- **Features:**
  - Date extraction from EXIF (DateTimeOriginal fallback chain)
  - Timestamp formatting (yyyymmddhhmm)
  - 3 IPC handlers: rename, update, batch AI
  - Deserialization bug fix (ISO string → Date conversion)
- **Tests:** +6 tests

### JSON Schema v2.0 Migration (Nov 13, 2025)
- **Issue:** #54
- **Changes:**
  - Field rename: metadata → keywords (XMP-dc:Description alignment)
  - Audit trail: createdAt, createdBy, modifiedAt, modifiedBy, version
  - Schema versioning: `_schema: "2.0"`
  - Structured fields required: location, subject, action, shotType

### Security Hardening (Nov 11, 2025)
**Security Report 007 - Both BLOCKING Issues Resolved**

**BLOCKING #1: Command Injection (videoFrameExtractor)**
- Replaced exec() with spawn({shell: false})
- Comprehensive shell metacharacter validation
- Flag injection protection (leading dash rejection)
- Commits: e1a1cf8 (test) → 6b1d92f (feat) → f01436b (refactor)
- +12 security tests (15 total)

**BLOCKING #2: Unauthenticated Media Server**
- Capability token authentication (32-byte crypto.randomBytes)
- Token validation before path validation
- Cross-origin localhost probing prevented
- Commits: a0c6b00 (test) → fa99be1 (feat)
- +11 security tests

### Cache Directory Registration Race Condition Fix (Nov 22, 2025)
- **Problem:** Unawaited IIFE at main.ts:172-176 created race condition
- **Symptom:** Non-deterministic PATH_TRAVERSAL security violations during batch processing
- **Solution:** Removed unawaited IIFE, added cache registration in app.whenReady()
- **Tests:** 4 baseline tests + 2 error handling tests
- **Timeline:** 97 minutes total (investigation to production-ready)

---

## Phase History

### D3 - Blueprint (Video Feature)
- Codec detection logic
- Compatibility checking for QuickTime Player
- H.264 transcoding specification
- Security validation requirements

### B0 - Foundation
- Electron + React + TypeScript foundation
- Vitest test infrastructure
- AI provider integration (OpenRouter, Anthropic, OpenAI)
- Basic EXIF metadata embedding

### B1 - Workspace Setup
- Quality gates configured (lint, typecheck, test)
- CI/CD pipeline established
- Testing framework validated

### B2/B3 - Video Transcoding Implementation
- Codec detection implemented
- Compatibility warnings added
- Security validator enhanced (symlink resolution)
- Video transcoding service integrated
- All test failures resolved (469/469 passing)

### B4 - Production Readiness (v2.2.0)
- All tests passing (527/527 → 584/584)
- Documentation complete
- Security hardening complete
- Performance optimized (60fps UI with 1000+ files)

---

## Architecture Decisions Record (ADRs)

### ADR-008: Result Type Schemas with Versioning
- Issue #20, PR #39
- Versioned result schemas for IPC communication

### ADR-009: Reference Catalog Schema Architecture
- Shared Supabase + schema separation
- Cross-ecosystem FK strategy (ON DELETE RESTRICT)
- RLS coordination via SECURITY DEFINER view

---

## Quality Milestones

| Date | Tests | Milestone |
|------|-------|-----------|
| Nov 11 | 469 | Security hardening complete |
| Nov 13 | 518 | JSON v2.0 migration |
| Nov 14 | 527 | CEP Panel date field |
| Nov 15 | 543 | PR #68 TDD remediation |
| Nov 19 | 584 | R1.1 schema alignment |
| Nov 21 | 640 | CFEx Week 1 complete |
| Nov 25 | 764 | CFEx Week 2 P1+P2+P4+UX complete |

---

## Key Historical Decisions

| Date | Decision | Rationale |
|------|----------|-----------|
| 2025-11-19 | ProRes Proxy 2K (vs H.264 4K) | Intra-frame + smooth timeline + professional color |
| 2025-11-19 | R1.1 first, CFEx second | Zero rework + integration debt eliminated |
| 2025-11-18 | v2.2.0 checkpoint | Rollback capability before CFEx |
| 2025-11-18 | Project-level North Star | Single canonical North Star for all features |
| 2025-11-16 | Shared Supabase + FK | technical-architect GO + principal-engineer CONDITIONAL GO (7/10) |
| 2025-11-16 | SECURITY DEFINER view | Honors EAV RLS + IA anon read |
| 2025-11-16 | pgvector shared Supabase | Transactional JOINs, SLO p95 <150ms |

---

## Failed Approaches

| Approach | Why Failed | Learning |
|----------|-----------|----------|
| Isolated schema without coordination | Assumed independence | Cross-ecosystem protocol required (prophetic assumption cascade 85%) |
| Single useEffect for form + media | Coupling regression | Separate concerns + memoization |
| exec() for child processes | Security vulnerability | spawn({shell: false}) mandatory |
| Unawaited IIFE for cache registration | Race condition | Deterministic initialization in app.whenReady() |

---

## Tier Completion Summary

### Phase 0 Prerequisites - COMPLETE
- Security Hardening (Issue #18)
- Paginated File Loading (Issue #19)
- Result Type Schemas (Issue #20)

### Tier 2-3 Features - IMPLEMENTED
- Keyboard Shortcuts (Issue #22, PR #40)
- Virtual Scrolling (Issue #23, PR #42)
- Video 4-Part Naming with action field
- Batch Processing with rate limiting (Issue #24)
- Multi-select file operations
- LRU cache invalidation fix

### Quality Improvements - COMPLETE
- TypeScript strict mode (Issue #41)
- ESLint v9 migration (Issue #45)
- Test script fixed (vitest run)
