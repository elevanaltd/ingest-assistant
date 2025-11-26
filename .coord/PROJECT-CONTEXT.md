# Ingest Assistant - Project Context

**Last Updated:** 2025-11-26 | **Version:** v2.2.0 baseline | **Branch:** main (includes PR #88 Phase 1c)

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
- **Testing:** Vitest (871 tests, 56 files)
- **AI:** OpenRouter, Anthropic Claude, OpenAI APIs
- **Database:** Supabase (shared with EAV Monorepo)

---

## Current State

### Branch Status
```
Branch: main (includes PR #88 Phase 1c Power Features)
Tests:  871/873 passing + 2 skipped (+104 new Phase 1c tests)
Lint:   0 errors, 153 warnings
Types:  0 errors
```

### Phase Progression
```
D0→D1→D2→D3(v1.1+OCTAVE)→B0(FINAL GO)→B2(Phase 1a COMPLETE)→Phase 1c COMPLETE→Phase 1b NEXT
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
| Tests | PASS (871/873) | `npm test` |

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

### Immediate (Phase 1b: Proxy Generation) - NEXT
1. **D2 Design:** ffmpeg + exiftool integration architecture
2. **D3 Blueprint:** Progress UI, EXIF validation dialogs
3. **B0 Validation:** DateTimeOriginal preservation protocol
4. **B2 Implementation:** proxyGenerator.ts, exifPreserver.ts

### Deferred (Phase 1a-POLISH → parallel to Phase 1b/1c)
- Auto-detection IPC + UI (service layer complete, IPC+multi-card dialog when needed)
- Path Intelligence (MRU, smart defaults, pinned folders)
- Enhanced error log UI
- Integration testing (risk-accepted: fix-in-production)

### Future Phases
- **Issue #63:** Reference Catalog (3-6 months)

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

## Recent Commits (Last 5)

```
da92ab5 Merge pull request #88 from elevanaltd/feat/phase-1c-power-features
b5cb698 feat: implement optional field handling in filename template parser (GREEN)
1e9a512 test: add failing tests for optional field handling in filename templates (RED)
01e659c fix: validate template static text for security vulnerabilities (GREEN)
e130e91 test: add template string security validation tests (RED)
```
