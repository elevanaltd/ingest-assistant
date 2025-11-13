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
`fix/ce-issues-2` (JSON v2.0 schema migration + cache invalidation + multi-select)

### Recent Work (Last 10 Commits - November 2025)
1. `28e6827` - fix: resolve all TypeScript build errors for v2.0 schema (Nov 13)
2. `d68685b` - fix: complete metadata→keywords migration in serializer and aiService (Nov 13)
3. `6c0d596` - fix: update Zod schemas and aiService for v2.0 keywords field (Nov 13)
4. `192b71d` - feat: migrate to JSON schema v2.0 (Issue #54 alignment) (Nov 13)
5. `0259309` - feat: fix rename reversion with cache invalidation (GREEN)
6. `2b8f2bc` - test: add cache invalidation tests for rename operations (RED)
7. `5027c8a` - feat: implement 'Process Selected (N files)' button (GREEN)
8. `8a09652` - test: add failing tests for 'Process Selected' button (RED)
9. `655c473` - feat: wire up multi-select state management in App.tsx
10. `842c8b2` - feat: implement Sidebar multi-select (GREEN phase)

### Current Implementation State (2025-11-13)
- **Working Tree:** Clean (all changes committed on fix/ce-issues-2)
- **Development Status:** ACTIVE - Electron app is production path
- **Major Features Completed:**
  - ✅ **JSON Schema v2.0 Migration (Issue #54, Nov 13)** - Complete metadata schema overhaul
    - metadata → keywords field rename (XMP-dc:Description alignment)
    - Audit trail (createdAt, createdBy, modifiedAt, modifiedBy, version)
    - Schema versioning (_schema: "2.0") for future migrations
    - Structured fields required (location, subject, action, shotType)
    - CEP Panel integration ready
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
- **Architecture Status:** Phase 0 prerequisites COMPLETE, Tier 2-3 features IMPLEMENTED

## Quality Gates Status

### ✅ Lint
- **Status:** PASS (0 errors, 49 warnings allowed)
- **Command:** `npm run lint`

### ✅ Typecheck
- **Status:** PASS (0 errors)
- **Command:** `npm run typecheck`

### ✅ Tests
- **Status:** PASS - ALL TESTS PASSING (518 tests, 33 test files)
- **Command:** `npm test` (now uses `vitest run` for single execution)
- **Validated:** 2025-11-13 (JSON v2.0 migration complete)
- **Performance:** ~18s test suite execution (includes rate limiter timing tests)
- **Recent Additions:**
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

## Last Updated
2025-11-13 (JSON v2.0 schema migration complete - implementation-lead + error-architect)
