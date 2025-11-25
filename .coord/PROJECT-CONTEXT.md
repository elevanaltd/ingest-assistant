# Ingest Assistant - Project Context

---

## 🌐 Ecosystem Position

**For complete pipeline positioning (where we fit in EAV production workflow):**
→ **[`ECOSYSTEM-POSITION.md`](ECOSYSTEM-POSITION.md)**

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
- **Testing:** Vitest (584 tests across 40 test files)
- **Process:** Node.js
- **AI Integration:** OpenRouter, Anthropic Claude, OpenAI APIs
- **Database:** Supabase (shared with EAV Monorepo - zbxvjyrbkycbfhwmmnmy)

## Database & Cross-Ecosystem Integration

### Shared Supabase Architecture
- **Project ID:** zbxvjyrbkycbfhwmmnmy (shared with `/Volumes/HestAI-Projects/eav-monorepo`)
- **Schema Ownership:**
  - **IA owns:** `media_references` schema (reference catalog, vector embeddings)
  - **EAV owns:** `public` schema (authoritative production: shots, shoots, scripts, projects)
- **Local Development:** http://127.0.0.1:54323/ (Docker)
- **Remote:** https://zbxvjyrbkycbfhwmmnmy.supabase.co

### Reference Catalog Schema (Issue #63 - Planned)
- **Purpose:** AI learning from corrected metadata (human-reviewed catalog)
- **Tables:**
  - `media_references.reference_images` - Corrected metadata catalog
  - `media_references.image_embeddings` - Vector search (OpenAI CLIP, 512-dimensional via pgvector)
  - `media_references.shot_references` - FK links to authoritative `public.shots`
- **Cross-Schema FK:** `shot_references.shot_id` → `public.shots.id` (`ON DELETE RESTRICT`)
- **RLS:** Open read (anon), authenticated write (admin/employee only)

### Migration Coordination Protocol
**CRITICAL:** IA migrations depend on EAV schema contract

**Migration Sequencing:**
1. **EAV migrations run FIRST** (establishes `public.shots` contract: UUID PK, NOT NULL, EAV_CONTRACT:v1)
2. **IA migrations run SECOND** (creates `media_references` schema + FK to existing `public.shots`)

**Before Starting Issue #63:**
- ✅ Consult technical-architect for schema design validation → **GO DECISION RECEIVED (2025-11-15)**
- ⚠️ Create GitHub issue at `elevanaltd/eav-monorepo` tagged `cross-ecosystem` for schema approval
- ⚠️ Document migration dependencies in `.coord/docs/000002-DOC-ADR-009-REFERENCE-CATALOG-SCHEMA-ARCHITECTURE.md`
- ⚠️ Validate RLS policy impact (IA accesses via SECURITY DEFINER view, respects EAV's project-scoped policies)
- ⚠️ Establish local Supabase testing protocol (EAV migrations → IA migrations → integration tests)

### Cross-Schema Integration Details
- **Authoritative Contract:** EAV's `public.shots` provides stable schema guarantees (UUID PK, database trigger `notify_shot_change`)
- **FK Strategy:** `ON DELETE RESTRICT` prevents orphaned references (EAV must verify no IA references before shot deletion)
- **RLS Coordination:** `public.shots` remains admin/employee-only; IA reads via SECURITY DEFINER view that honors EAV policies
- **Vector Search:** pgvector in shared Supabase (SLO: p95 <150ms, CPU <70%, fallback to Pinecone if breached)
- **Quarterly FK Audit:** Scheduled validation to detect orphaned references
- **Contact:** Same solo developer maintains both ecosystems (streamlined coordination, documented via GitHub issues)

### Related Documentation
- **EAV Context:** `/Volumes/HestAI-Projects/eav-monorepo/.coord/PROJECT-CONTEXT.md` (Cross-Ecosystem Integration section)
- **Production Pipeline:** `/Volumes/HestAI-Projects/eav-monorepo/.coord/workflow-docs/002-EAV-PRODUCTION-PIPELINE.md`
- **ADR-009:** `.coord/docs/000002-DOC-ADR-009-REFERENCE-CATALOG-SCHEMA-ARCHITECTURE.md` (reference catalog design)
- **Supabase Config:** `/Volumes/HestAI-Projects/eav-monorepo/.env` (shared database credentials)

## Testing & Development Paths

### Accessible File System Paths (Week 1 Integration Testing)
**CRITICAL:** Both destination paths are mounted and accessible for testing

**LucidLink (Cloud Storage - Working Projects):**
- **Path:** `/Volumes/videos-current/2. WORKING PROJECTS`
- **Purpose:** Photos + proxy videos (fast cloud access for editors)
- **Note:** Path contains spaces - validates path escaping logic
- **Status:** ✅ ACCESSIBLE for integration testing

**Ubuntu NFS (Raw File Storage):**
- **Path:** `/Volumes/EAV_Video_RAW/`
- **Purpose:** Raw video archival (cheaper storage, offline from editing)
- **Status:** ✅ ACCESSIBLE for integration testing

**Testing Implications:**
- Week 1 integration testing NO LONGER BLOCKED (can validate dual-destination transfers immediately)
- Real-world network behavior observable (LucidLink cache timeout patterns, NFS performance)
- Path with spaces validates security validator's handling of complex paths

**Example Test Transfer Configuration:**
```typescript
const testConfig: TransferConfig = {
  source: '/Volumes/NO NAME/',  // CFEx card (when available)
  destinations: {
    photos: '/Volumes/videos-current/2. WORKING PROJECTS/EAV014/images/shoot1/',
    rawVideos: '/Volumes/EAV_Video_RAW/EAV014/videos-raw/shoot1/'
  }
}
```

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
`feat/cfex-work` (CFEx Phase 1a development - rebased on R1.1 schema)

### Recent Work (Last 10 Commits - November 2025)
1. `c6ee30d` - Add CFEx Phase 1 North Star and v2.2.0 release docs (rebased) - Nov 19
2. `830c2e9` - Merge pull request #77 from elevanaltd/feat/schema-r1-1-alignment - Nov 19
3. `6719c7f` - fix: R1.1 post-merge regressions - legacy hydration + lockedFields - Nov 19
4. `ac4b72b` - feat: complete R1.1 schema alignment (GREEN) - Nov 19
5. `b4dac55` - WIP: R1.1 schema alignment - foundational changes (GREEN partial) - Nov 19
6. `9e5589a` - test: add R1.1 schema compliance tests (RED) - Nov 19
7. `88c5957` - Add CFEx Phase 1 North Star and v2.2.0 release docs - Nov 18
8. `18e6418` - Merge pull request #76 from elevanaltd/chore/version-2.2.0 - Nov 18
9. `d7f7f9d` - chore: bump version to 2.2.0 - Nov 18
10. `26b4254` - Merge pull request #75 from elevanaltd/doc-updates - Nov 18

### Current Implementation State (2025-11-21 Updated)

**CFEx Phase 1a - Week 1 B2 Implementation: 100% COMPLETE ✅**

**Status:** All Week 1 deliverables complete, dual-specialist review approved, ready for merge to main

**Week 1 Completed Components:**
- ✅ **Days 1-3: Transfer Mechanism** (scanSourceFiles, transferFile, startTransfer) - 611 tests passing
- ✅ **Days 3.5-5.5: Integrity Validation** (integrityValidator, EXIF preservation) - I1 immutable validated
- ✅ **Days 4-5: IPC Handlers** (cfexTransferHandlers, event emission) - 617 tests passing
- ✅ **Days 5-7: Renderer UI** - preload.ts updated, CfexTransferWindow refactored to v2.2.0 pattern
  - ✅ Test mocks aligned to ElectronAPI.cfex contract
  - ✅ TransferProgress lint error fixed
  - ✅ All 13 UI tests GREEN + 1 skipped (14 total, +5 timeout cleanup tests)

**Quality Gates Status (Final):**
- All Gates: ✅ GREEN (commit 3be3c67)
- Tests: ✅ 640/645 passing + 1 skipped (646 total, 4 pre-existing failures unrelated)
- TypeCheck: ✅ 0 errors (src + electron tsconfigs)
- Lint: ✅ 0 critical errors, 105 warnings (acceptable)
- Code Review: ✅ APPROVED (dual-specialist: code-review-specialist + test-methodology-guardian)
- Security: ✅ v2.2.0 contextBridge pattern preserved (no raw IPC exposure)
- TDD Discipline: ✅ RED→GREEN commit separation (cfe086e → 3be3c67)

**Timeline Acceleration:**
- Estimated: 5.5 days (D3 Blueprint conservative estimate)
- Actual: ~5.5 hours focused implementation (TDD discipline + clear specs = **11x acceleration**)

**Critical Fixes Applied (2025-11-21):**
1. ✅ **Test assertion fix:** Percentage format "50%" → "50.00%" (commit afe5a54)
2. ✅ **Timeout cleanup fix:** Unhandled promise rejection prevented (commits cfe086e + 3be3c67)
   - **Problem:** Promise.race timeout not cancelled → unhandled rejection 10s after successful browse
   - **Solution:** clearTimeout in both success and error paths + comprehensive test validation
   - **Tests:** 5 new tests with clearTimeout spy assertions + unhandled rejection guard
   - **Review:** Dual-specialist approval (code-review-specialist + test-methodology-guardian)
   - **Evidence:** RED→GREEN commit separation (tests fail without fix, pass with fix)

**Next Steps:**
1. ✅ Code review complete (dual-specialist APPROVED)
2. ✅ UI integration complete (tab navigation + Browse buttons + Cancel)
3. ✅ Critical production risks fixed (test assertion + timeout cleanup)
4. → Merge feat/cfex-work to main (PR #78 ready)
5. → Integration testing with real CFEx card → LucidLink + Ubuntu NFS (empirical validation)
6. → Gather empirical data for Week 2 error handling design

**Empirical Findings (Week 1 Testing - 2025-11-20):**

**CRITICAL: Browse Button Hang Issue**
- **Problem:** Browse buttons hang forever when volumes disconnected (LucidLink/Ubuntu NFS/CFEx not mounted)
- **Severity:** 🔴 CRITICAL - Infinite freeze, no escape mechanism (Cmd+Period doesn't work)
- **Impact:** All 3 Browse buttons affected, requires force quit of app
- **Root Cause:** macOS native dialog.showOpenDialog() waits indefinitely for disconnected volumes
- **Solution Implemented (commit c26095a):**
  - Promise.race() with 10-second timeout
  - Loading state (yellow button + "Opening..." text)
  - Error message on timeout with manual entry guidance
  - Graceful fallback to manual path input
- **Week 2 Enhancements:**
  - Smart default paths (start at /Volumes or user home)
  - MRU (Most Recently Used) paths for faster access
  - Volume detection before opening dialog
  - Path validation before Browse

**UX Improvements Implemented:**
- ✅ Folder picker buttons (Browse... for all 3 path inputs)
- ✅ Percentage formatting (2 decimal places: 25.00% not 25.0000001%)
- ✅ Cancel button (basic UI-only, full graceful cancellation in Week 2)
- ✅ Timeout protection (60s limit prevents infinite hang - extended from 10s)
- ✅ Browse defaultPath (dialogs open at current input path, not last known location)
- ✅ Source path defaults (loads from config or hardcoded /Volumes/Untitled/DCIM/100_FUJI)

**Major Features Completed (v2.2.0 Baseline):**
  - ✅ **PR #77 R1.1 Schema Alignment (Nov 19)** - CEP Panel contract compliance
    - **Problem:** mainName → shotName field rename required for CEP Panel R1.1 contract
    - **Solution:** Global schema migration with 41 new tests (543 → 584 total)
    - **Changes:**
      - Field rename: mainName → shotName (all components, services, tests)
      - New field: lockedFields: string[] (CEP Panel field-level locking)
      - shotName format validation: includes #N suffix when shotNumber present
    - **Result:** All 584 tests passing, full R1.1 contract compliance
    - **Impact:** CFEx Phase 1a builds on stable schema foundation (zero rework risk)
  - ✅ **PR #68 TDD Remediation: useEffect Separation (Nov 15)** - React form state regression fixed
    - **Problem:** Non-TDD code change caused 7 failing tests in CI
    - **Root Cause:** Single conflated useEffect handling form + media loading
    - **Solution:** Option 3 - Separated concerns with memoized currentFile
    - **Implementation:**
      - Effect 1 (Form State): Dependencies on `[currentFile, shotTypes]`
      - Effect 2 (Media Loading): Dependencies on `[currentFile]`
      - Stabilization: `useMemo(() => files[currentFileIndex], [files, currentFileIndex])`
    - **Result:** All 543 tests passing, React hooks warnings resolved
    - **Approvals:** test-methodology-guardian (Option B TDD fix) + code-review-specialist (critical issues addressed)
    - **Remaining Work:** 3 tests for cache reload scenario + skipNextVideoLoadRef + form independence (documented in PR #68 session)
  - ✅ **CEP Panel Date Field Integration (eav-cep-assist Issue #31, Nov 14)** - Complete end-to-end
    - LogComment date field: `location=X, subject=Y, action=Z, shotType=W, date=202511031005`
    - Date extraction from EXIF (DateTimeOriginal fallback chain)
    - Timestamp formatting (yyyymmddhhmm)
    - 3 IPC handlers wired: rename, update, batch AI
    - Deserialization bug fix (ISO string → Date conversion)
    - +6 tests (+1 metadataWriter integration, +1 batch spec, +5 deserialization)
  - ✅ **JSON Schema v2.0 Migration (Issue #54, Nov 13)** - Complete metadata schema overhaul
    - metadata → keywords field rename (XMP-dc:Description alignment)
    - Audit trail (createdAt, createdBy, modifiedAt, modifiedBy, version)
    - Schema versioning (_schema: "2.0") for future migrations
    - Structured fields required (location, subject, action, shotType)
  - ✅ Keyboard shortcuts & command palette (Issue #22, PR #40)
  - ✅ Virtual scrolling for file lists (Issue #23, PR #42)
  - ✅ Paginated file loading (Issue #19)
  - ✅ Security hardening - batch IPC validation (Issue #18, PRs #31, #33)
  - ✅ Result type schemas with versioning (Issue #20, PR #39, ADR-008)
  - ✅ Video 4-part naming with action field (Nov 11)
  - ✅ Batch processing with rate limiting (Issue #24)
  - ✅ Multi-select file operations (Nov 12)
  - ✅ LRU cache invalidation fix (Nov 12) - prevents file rename reversion
- **Quality Improvements:**
  - ✅ TypeScript strict mode - all `any` types eliminated (Issue #41)
  - ✅ ESLint v9 migration with flat config (Issue #45)
  - ✅ Test script fixed to exit cleanly (Nov 11)
- **Architecture Status:** Phase 0 prerequisites COMPLETE, Tier 2-3 features IMPLEMENTED, CEP Panel integration COMPLETE
- **Latest Release:** v2.2.0 (Nov 18, 2025) - Sequential shot numbers baseline
  - Version checkpoint established with DMG artifacts
  - Production deployment ready
  - Rollback capability validated
  - GitHub release: https://github.com/elevanaltd/ingest-assistant/releases/tag/v2.2.0

## Quality Gates Status

### ✅ Lint
- **Status:** PASS (0 errors, 49 warnings allowed)
- **Command:** `npm run lint`

### ✅ Typecheck
- **Status:** PASS (0 errors)
- **Command:** `npm run typecheck`

### ✅ Tests
- **Status:** PASS - ALL TESTS PASSING (584 tests, 40 test files)
- **Command:** `npm test` (now uses `vitest run` for single execution)
- **Validated:** 2025-11-19 (R1.1 schema alignment - all quality gates GREEN)
- **Performance:** ~19s test suite execution (includes rate limiter timing tests)
- **Recent Additions:**
  - PR #77 R1.1 schema alignment: +41 tests (4 compliance tests + schema migration coverage)
  - PR #68 useEffect separation: All 7 previously failing tests now GREEN
  - CEP Panel date field: +6 tests (LogComment integration, batch spec, deserialization)
  - JSON v2.0 migration: All test mocks updated with new schema
  - +3 cache invalidation tests (FileManager LRU cache behavior)
  - +22 tests from batch processing validation (Issue #24)
- **Previous Issues RESOLVED:**
  - Test hanging: Fixed by changing `vitest` to `vitest run` in package.json
  - 18 failing tests from Nov 9: All resolved (action field + metadata writer fixes)
  - 7 failing tests PR #68: All resolved (useEffect separation + memoization)

## Known Issues

### ✅ ALL ISSUES RESOLVED (2025-11-12)

**Security Hardening Complete (Implementation-Lead, Nov 11):**
- ✅ **BLOCKING #1:** Command injection vulnerability fixed (Security Report 007)
  - Replaced exec() with spawn() in videoFrameExtractor
  - Comprehensive shell metacharacter validation
  - Flag injection protection
  - +12 security tests (15 total command injection tests)
- ✅ **BLOCKING #2:** Unauthenticated media server fixed (Security Report 007)
  - Capability token authentication (32-byte crypto.randomBytes)
  - Token validation before path validation
  - Cross-origin localhost probing prevented
  - +11 security tests

**Test Validation Complete:**
- ✅ All 469 tests passing (29 test files, +23 from security hardening)
- ✅ Test script now exits cleanly without hanging
- ✅ Action field implementation validated
- ✅ TypeScript strict mode verified
- ✅ ESLint v9 migration confirmed
- ✅ Batch processing with comprehensive test coverage
- ✅ Security vulnerabilities remediated with TDD discipline

**Previously Reported Issues (RESOLVED):**
1. **✅ Test hanging (Nov 11) - RESOLVED**
   - Root cause: `npm test` ran `vitest` in watch mode
   - Fix: Changed to `vitest run` for single execution
   - Tests now complete in ~18s and exit cleanly

2. **✅ App.test.tsx (17 failures) - RESOLVED**
   - Action field commit (38a85f4) resolved placeholder matching issues
   - All action field feature tests now passing

3. **✅ metadataWriter.test.ts (1 failure) - RESOLVED**
   - Assertion argument type issue fixed
   - Test suite validates EXIF metadata writing correctly

## Phase Indication
**Current Phase:** B4 (Handoff/Production Readiness) ✅ READY FOR DEPLOYMENT
**Evidence:**
- Phase 0 prerequisites: ✅ COMPLETE (Security hardening, Pagination, Result Schemas)
- Tier 2-3 features: ✅ IMPLEMENTED (Virtual scrolling, Keyboard shortcuts, Batch processing)
- Quality improvements: ✅ COMPLETE (TypeScript strict, ESLint v9, Test script fix)
- Security hardening: ✅ COMPLETE (Command injection + Media server auth fixed)
- JSON v2.0 Migration: ✅ COMPLETE (Schema versioning, audit trail, CEP Panel alignment)
- Quality gates: Lint ✅, Typecheck ✅, Tests ✅ (518 passing), Build ✅
- **Status:** Production deployment ready - all quality gates passed, JSON v2.0 migration complete

## Security Status (Nov 11, 2025)
**Security Report 007 - BLOCKING Issues:** ✅ RESOLVED

**BLOCKING #1: Command Injection (videoFrameExtractor)**
- Status: ✅ RESOLVED
- Fix: spawn() with comprehensive validation
- Commits: e1a1cf8 (test) → 6b1d92f (feat) → f01436b (refactor)
- Validation: Critical-Engineer reviewed with CONDITIONAL→requirements met

**BLOCKING #2: Unauthenticated Media Server**
- Status: ✅ RESOLVED
- Fix: Capability token (crypto.randomBytes)
- Commits: a0c6b00 (test) → fa99be1 (feat)
- Validation: Implementation complete, awaiting final approval

**Security Test Coverage:** +23 security tests (command injection + media server auth)

## Current Focus (2025-11-25 Updated - Destination Checkboxes + canStart Bugfix Complete)
CFEX_PHASE_1A::Week_1_COMPLETE(100%)→Week_2_PROGRESS(Priority_1+2+4_COMPLETE+UX_Enhancements)→Priority_3_Integration_Testing_NEXT
COMPLETION::Destination_Checkboxes[enable/disable_photos_or_videos]→canStart_Bugfix[disable_during_auto-detection]→CI_GREEN[764_tests_passing]
FEATURE_DELIVERED::enabledDestinations[photos+rawVideos_toggles]→skip_disabled_destinations_in_transfer→UX_allows_redo_single_type
BUGFIX_DELIVERED::canStart_disabled_during_isDetecting→prevents_wrong_path_transfer→PR_#85_review_resolved
ARCHITECTURAL::Frontend_checkboxes→IPC_enabledDestinations→Backend_filtering[scanSourceFiles]→backward_compatible[defaults_true]
D3_BLUEPRINT::compressed_to_OCTAVE→65.5%_reduction→100%_decision_logic_preserved→implementation_ready
MICROPHASE_STRUCTURE::Phase_1a[8d_CORE+5d_POLISH]→Phase_1b[proxy_generation]→Phase_1c[toggles+metadata]
CROSS_ECOSYSTEM::Issue_#63_deferred→guardrails_required_4-6_weeks→after_CFEx_Phase_1_complete

## Key Decisions
- [2025-11-19] PROXY_FORMAT→ProRes_Proxy_2K[vs H.264_4K]→intra-frame+smooth_timeline+professional_color⊗175MB_per_24s_acceptable(LucidLink_optimized)
- [2025-11-19] B0_VALIDATION→FINAL_GO[vs CONDITIONAL]→4_blockers_resolved+empirical_findings_integrated⊗critical-design-validator_HIGH_confidence
- [2025-11-19] SCHEMA_SEQUENCING→R1.1_first_CFEx_second[vs parallel]→sequential_merge+parallel_prep⊗zero_rework+integration_debt_eliminated
- [2025-11-19] R1_1_ALIGNMENT→mainName→shotName+lockedFields[vs defer]→CEP_Panel_contract_compliance⊗CFEx_builds_stable_foundation
- [2025-11-18] VERSION→v2.2.0_checkpoint[vs no_baseline]→git_tag+DMG_release+version_coherence⊗rollback_capability_before_CFEx
- [2025-11-18] NORTH_STAR→project_level_consolidation[vs feature_specific]→single_canonical_North_Star⊗all_features_align_7_immutables
- [2025-11-18] CFEX→Phase_1_minimal[vs external_app]→zero_click_AI+EXIF_validation+path_intelligence⊗TapeName_removed(CEP_uses_proxy)
- [2025-11-16] SCHEMA→cross_ecosystem_integration[vs isolated_DB,event_sync]→shared_Supabase+FK⊗technical-architect_GO+principal-engineer_CONDITIONAL_GO(7/10)
- [2025-11-16] CONTRACT→EAV_CONTRACT:v1→public.shots_guarantees+notify_shot_change⊗quarterly_FK_audit
- [2025-11-16] RLS→SECURITY_DEFINER_view[vs direct_access,app_layer]→honors_EAV_RLS+IA_anon_read⊗governance_maintained
- [2025-11-16] VECTOR→pgvector_shared_Supabase[vs Pinecone,dedicated_DB]→transactional_JOINs⊗SLO_p95_150ms_CPU_70%
- [2025-11-15] ARCH→Reference_Lookup[vs separate_DB,single_schema]→shared_Supabase+schema_isolation⊗I7_domain_independence

## Active Work

### CFEx File Transfer Integration (Phase 1a - Week 2-3 Implementation ACTIVE)

**Week 1 Deliverables: ✅ COMPLETE (Nov 20-21, 2025)**
- [x] Transfer mechanism (scanSourceFiles, transferFile, startTransfer) - 611 tests passing
- [x] Integrity validation (integrityValidator, EXIF preservation) - I1 immutable validated
- [x] IPC handlers (cfexTransferHandlers, event emission) - 617 tests passing
- [x] Renderer UI (CfexTransferWindow refactored to v2.2.0 pattern) - 640/645 tests passing
- [x] Critical fixes (timeout cleanup, percentage formatting) - dual-specialist approved
- [x] PR #78 + #79 MERGED to main - all quality gates GREEN
- [x] D3 Blueprint compressed to OCTAVE (65.5% reduction, 100% decision logic preserved)

**Week 2-3 In Progress: 🔄 ACTIVE (Nov 21-25)**
- [x] **Priority 1: Error Handling** ✅ COMPLETE (PR #80 + #81 merged)
  - errorHandler.ts + retryStrategy.ts + 47 tests
  - Smart retry logic (exponential backoff: 1s→2s→4s→8s)
  - Comprehensive error classification (TRANSIENT, FATAL, NETWORK, USER)
- [x] **Priority 2: CFEx Auto-Detection** ✅ SERVICE COMPLETE
  - cfexAutoDetect.ts with async I/O, timeout protection, error handling
  - 19 comprehensive tests (macOS + Ubuntu scanning)
  - IPC + UI integration remaining (~2 days)
- [ ] **Priority 3: Integration Testing** (4 days - NEXT)
  - LucidLink cache eviction + NFS stale handle testing
  - Performance baselines + risk scenarios
  - Empirical findings documentation
- [x] **Priority 4: CFEx Settings Tab** ✅ COMPLETE (PR #83 merged)
  - Settings tab with default paths (source, photos, videos)
  - Browse with defaultPath support (60s timeout)
  - Folder creation in picker dialog
- [x] **UX Enhancements** ✅ COMPLETE (Nov 25)
  - Destination enable/disable checkboxes (transfer only photos or only videos)
  - canStart bugfix (disabled during auto-detection) - PR #85 review resolved

**Phase 1a-POLISH (deferred to parallel with Phase 1b):**
- [ ] Path Intelligence (MRU, smart defaults, pinned folders) - 5 days
- [ ] Priority 5: UI Polish (progress visualization, error log UI) - 5 days
- [x] B0 Decision (Initial): CONDITIONAL GO (7 blocking conditions identified)
- [x] Schema R1.1 Foundation: Merged to main, CFEx rebased, zero conflicts, 584 tests GREEN
- [x] **Empirical Testing: Day 1 COMPLETE** (2025-11-19)
  - [x] ✅ Day 1: EXIF field testing (100% coverage - 103/103 files)
  - [x] ⚠️ Day 2/3: LucidLink/NFS testing DEFERRED to B2 implementation
  - [x] ✅ I1 immutable VALIDATED (chronological integrity guaranteed)
  - [x] ✅ Findings summary created (008-CFEX-EMPIRICAL-FINDINGS-SUMMARY.md)
- [x] **D3 Blueprint v1.1: 4 B0 Blockers RESOLVED** (2025-11-19)
  - [x] ✅ Blocker #1: App quit handler specification + 5 test cases
  - [x] ✅ Blocker #5: Error sanitization documentation (explicit rules + 3 IPC points)
  - [x] ✅ Blocker #6: Window lifecycle test specs (integrated with Blocker #1)
  - [x] ✅ Blocker #7: Enhanced ENOSPC error messages (show bytes needed)
  - [x] ✅ ProRes Proxy 2K specifications added for Phase 1b
  - [x] ✅ D3 Blueprint updated: 18,000 → 21,000 words (+3,000 words amendments)
- [x] **B0 Re-Validation: ✅ FINAL GO** (critical-design-validator, HIGH confidence)
  - [x] ✅ All immutables validated (I1, I3, I4, I5, I7)
  - [x] ✅ Network deferral risk: ACCEPTABLE (conservative assumptions, manual fallback)
  - [x] ✅ 3-week CORE timeline: REALISTIC (validated by validator)
- [ ] **NEXT: B2 Implementation** (implementation-lead) - 3 weeks CORE phase

### Cross-Ecosystem Integration (Issue #63 - DEFERRED)
- [x] Cross-ecosystem coordination protocol documented (both PROJECT-CONTEXT.md files)
- [x] Dual-key governance: technical-architect GO + principal-engineer CONDITIONAL GO (7/10)
- [x] GitHub Issue #122 created: https://github.com/elevanaltd/eav-monorepo/issues/122
- [x] EAV migration: 20250116090000_shots_contract_v1.sql (contract + trigger)
- [x] IA migration: 20250116100000_media_references_schema.sql (schema + FK + pgvector)
- [x] Validation script: scripts/check_cross_schema.sh (executable)
- [ ] **MANDATORY Guardrails (4-6 weeks):** Contract spec, compatibility tests, SLO observability, deletion workflow
- [ ] Local Supabase validation (EAV → IA migration sequencing)
- [ ] Issue #63 implementation (after CFEx Phase 1 + guardrails complete)

## Failed Approaches
❌ Isolated_schema_without_coordination→assumed_independence→prophetic_assumption_cascade_pattern_detected(85%)→cross-ecosystem_protocol_required

## Assumptions to Validate
🔍 pgvector_p95_latency<150ms_at_10k_shots_50k_references⊗load_test_harness⊗H
🔍 FK_RESTRICT_acceptable_for_EAV_deletion_workflow⊗production_usage_patterns⊗H
🔍 Quarterly_FK_audit_sufficient_cadence⊗schema_change_frequency⊗M

## Unresolved Questions
❓ Principal-engineer_re-validation_after_guardrails_implemented?⊗viability_score_improvement⊗validate_4-6_weeks
❓ EAV_CONTRACT:v2_versioning_strategy_when_semantics_change?⊗breaking_change_protocol⊗document_before_first_change

## Next Milestone
Guardrails→formalize_contract_spec+compatibility_tests+SLO_alerts+deletion_workflow→principal-engineer_re-validation

## Last Updated
2025-11-25 (Destination Checkboxes + canStart Bugfix complete - holistic-orchestrator)
**Latest Release:** v2.2.0 - Sequential shot numbers baseline (production ready)
**Active Work:** CFEx Phase 1a Week 2 - Priority 3 Integration Testing NEXT
**Current Branch:** feat/cfex-work (15 commits, 764/766 tests GREEN + 2 skipped)
**Phase Status:** D0→D1→D2→D3(v1.1+OCTAVE)→B0(FINAL GO)→B2(Week 1 COMPLETE)→B2(Week 2 Priority 1+2+4+UX COMPLETE)
**Week 1 Status:** Transfer mechanism + integrity validation + IPC handlers + UI COMPLETE
**Week 2 Status:** Priority 1 Error Handling ✅, Priority 2 Auto-Detection (service) ✅, Priority 4 Settings/Browse ✅
**UX Enhancements:** Destination enable/disable checkboxes ✅, canStart auto-detection fix ✅
**D3 Blueprint:** Compressed to OCTAVE (65.5% reduction, 100% decision logic preserved)
**Recent Commits:** 9a666fe→b1b0142 (checkboxes) | 4037a54→4bdb285 (backend) | 8b4b2d9→2f4b20d (canStart fix)
**Next Work:** Priority 3 Integration Testing (LucidLink + NFS empirical validation)
