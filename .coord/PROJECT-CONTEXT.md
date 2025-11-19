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

### Current Implementation State (2025-11-19 Updated)
- **Working Tree:** Clean (PR #68 TDD fix committed)
- **Development Status:** ACTIVE - Electron app is production path
- **Active PR:** #68 TDD remediation for useEffect regression (COMPLETE)
- **Major Features Completed:**
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

## Current Focus
CFEX_INTEGRATION::Phase_1a_testing_complete→I1_validated→D3_fixes_next→B0_revalidation_ready→B2_implementation_pending
EMPIRICAL_TESTING::Day1_100%_EXIF→I1_immutable_validated→Day2/3_deferred_to_B2→conservative_assumptions_acceptable
R1_1_SCHEMA::merged_to_main→584_tests_passing→CFEx_rebased→zero_conflicts→coherence_maintained
CROSS_ECOSYSTEM::Issue_#63_deferred→guardrails_required_4-6_weeks→after_CFEx_Phase_1_complete

## Key Decisions
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

### CFEx File Transfer Integration (Phase 1a - READY FOR B0 RE-VALIDATION)
- [x] v2.2.0 baseline established (rollback capability)
- [x] edge-optimizer analysis: Value validated (parallel execution, EXIF validation, path intelligence)
- [x] D1 North Star: Project-level consolidation (7 immutables extracted + APPROVED)
- [x] D2 Design: 18 alternatives explored, validator reality check, synthesizer breakthrough
- [x] D3 Blueprint: 18,000-word architecture + 6 UI mockup states (implementation-ready)
- [x] B0 Decision: CONDITIONAL GO (7 blocking conditions identified)
- [x] Schema R1.1 Foundation: Merged to main, CFEx rebased, zero conflicts, 584 tests GREEN
- [x] **Empirical Testing: Day 1 COMPLETE** (2025-11-19)
  - [x] ✅ Day 1: EXIF field testing (100% coverage - 103/103 files)
  - [x] ⚠️ Day 2/3: LucidLink/NFS testing DEFERRED to B2 implementation
  - [x] ✅ I1 immutable VALIDATED (chronological integrity guaranteed)
  - [x] ✅ Findings summary created (008-CFEX-EMPIRICAL-FINDINGS-SUMMARY.md)
- [ ] **NEXT:** D3 Blueprint Fixes (1.25 days): 4 blocking conditions
- [ ] B0 Re-Validation: critical-design-validator FINAL GO (ready for invocation)
- [ ] B2 Implementation: TDD (implementation-lead) - 3 weeks CORE

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
2025-11-19 (R1.1 schema merged + CFEx Day 1 empirical testing COMPLETE)
**Latest Release:** v2.2.0 - Sequential shot numbers baseline (production ready)
**Active Work:** CFEx Phase 1a - Day 1 testing complete, ready for B0 re-validation
**Current Branch:** feat/cfex-work (rebased on R1.1 main, 584 tests GREEN, zero conflicts)
**Test Results:** 100% EXIF coverage (103/103 files) - I1 immutable VALIDATED
**Next Steps:** D3 Blueprint fixes (4 blockers) → B0 re-validation → B2 implementation
**Session Documentation:** `.coord/sessions/2025-11-19-CFEX-TESTING-COMPLETE.md` (to be created in new session)
