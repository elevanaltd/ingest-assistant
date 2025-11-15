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
- **Testing:** Vitest (446 tests)
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
`main` (CEP Panel date field integration complete)

### Recent Work (Last 10 Commits - November 2025)
1. `3fdd5f9` - fix: creationTimestamp deserialization (GREEN) - Nov 14
2. `7c406d2` - test: timestamp deserialization bug tests (RED) - Nov 14
3. `5db22c6` - feat: date field extraction wired to 3 IPC handlers (GREEN) - Nov 14
4. `43a2344` - test: batch processing date field spec (RED) - Nov 14
5. `12f46e0` - feat: date field to LogComment (GREEN) - Nov 14
6. `f1a8943` - test: LogComment date field test (RED) - Nov 14
7. `28e6827` - fix: TypeScript build errors v2.0 schema - Nov 13
8. `d68685b` - fix: metadata→keywords migration - Nov 13
9. `192b71d` - feat: JSON schema v2.0 migration - Nov 13
10. `0259309` - feat: cache invalidation fix (GREEN)

### Current Implementation State (2025-11-15)
- **Working Tree:** Modified (UI improvements in progress)
- **Development Status:** ACTIVE - Electron app is production path
- **Major Features Completed:**
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

## Quality Gates Status

### ✅ Lint
- **Status:** PASS (0 errors, 49 warnings allowed)
- **Command:** `npm run lint`

### ✅ Typecheck
- **Status:** PASS (0 errors)
- **Command:** `npm run typecheck`

### ✅ Tests
- **Status:** PASS - ALL TESTS PASSING (527 tests, 34 test files)
- **Command:** `npm test` (now uses `vitest run` for single execution)
- **Validated:** 2025-11-14 (CEP Panel date field integration complete)
- **Performance:** ~18s test suite execution (includes rate limiter timing tests)
- **Recent Additions:**
  - CEP Panel date field: +6 tests (LogComment integration, batch spec, deserialization)
  - JSON v2.0 migration: All test mocks updated with new schema
  - +3 cache invalidation tests (FileManager LRU cache behavior)
  - +22 tests from batch processing validation (Issue #24)
- **Previous Issues RESOLVED:**
  - Test hanging: Fixed by changing `vitest` to `vitest run` in package.json
  - 18 failing tests from Nov 9: All resolved (action field + metadata writer fixes)

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
DESIGN::Reference_Lookup_System→D2_complete→D3_blueprint_ready

## Key Decisions
- [2025-11-15] ARCH→Reference_Lookup[vs separate_DB,single_schema]→shared_Supabase+schema_isolation⊗I7_domain_independence
- [2025-11-15] VECTOR→OpenCLIP_hybrid[vs API_only,no_cache]→local_ONNX+server_reembed⊗I6_offline_operation
- [2025-11-15] SCHEMA→media_references_domain→pgvector+RLS+cross_FK⊗domain_isolated_evolution
- [2025-11-15] CACHE→SQLite_local[vs no_cache,IndexedDB]→delta_sync⊗offline_resilience
- [2025-11-15] UI→remove_rename_feature→architectural_review_pending⊗path_sync_complexity

## Active Work
- [x] D1::North_Star_approved→7_immutables→technology_proof
- [x] D2::design_document→262_lines→5_critical_decisions_addressed
- [ ] D3::blueprint→API_contracts+UI_wireframes+integration_architecture

## Next Milestone
D3 Blueprint→visual_architect+technical_architect→API_design+UI_mockups+migration_plan

## Last Updated
2025-11-15 (D2 Reference Lookup design complete - holistic-orchestrator)
