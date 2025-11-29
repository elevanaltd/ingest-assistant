# Ingest Assistant - Project Roadmap

**Last Updated:** 2025-11-29 | **Current Phase:** CFEx Phase 1 COMPLETE (v2.3.0)

---

## Completed Phases (Summary)

| Phase | Milestone | Date |
|-------|-----------|------|
| D3 | Video Feature Design | Oct 2025 |
| B0 | Foundation (Electron/React/TypeScript) | Oct 2025 |
| B1 | Workspace Setup | Oct 2025 |
| B2/B3 | Video Transcoding + Integration | Nov 2025 |
| B4 | Production Readiness (v2.2.0) | Nov 18, 2025 |
| Phase 1a | CFEx Transfer + Integrity | Nov 26, 2025 |
| Phase 1c | CFEx Power Features (+104 tests) | Nov 26, 2025 |
| Bug Fix | Filename ID Stability (PR #93, +5 tests) | Nov 27, 2025 |
| Phase 1b | CFEx Proxy Generation (B3 validated, +80 tests) | Nov 29, 2025 |

**Full history:** [`PROJECT-HISTORY.md`](PROJECT-HISTORY.md)

---

## Current Phase: CFEx Integration

### Phase 1a: Transfer + Integrity - ✅ COMPLETE (Risk-Accepted)

**Timeline:** 2 weeks (Nov 20 - Nov 26)

| Priority | Status | Description |
|----------|--------|-------------|
| P1 | ✅ COMPLETE | Error Handling (errorHandler.ts, retryStrategy.ts, 47 tests) |
| P2 | ✅ COMPLETE | Auto-Detection service (IPC+UI deferred - single-card workflow) |
| P3 | ⚠️ SKIPPED | Integration Testing (risk-accepted: fix-in-production) |
| P4 | ✅ COMPLETE | Settings Tab + Browse (60s timeout, defaultPath) |
| UX | ✅ COMPLETE | Destination checkboxes, canStart bugfix |

**Risk-Accepted Decision (2025-11-26):**
- Skip empirical integration testing, fix issues in production
- Rationale: Error handling comprehensive, real-world feedback faster
- I4 (Zero Data Loss) remains 🟡 Partial until production validation
- Commitment: First LucidLink/NFS failure = BLOCKING priority fix

**Deferred (Phase 1a-POLISH → parallel to Phase 1b):**
- [ ] Auto-detection IPC + UI (service ready, activate when multi-card needed)
- [ ] Path Intelligence (MRU, smart defaults, pinned folders) - 5 days
- [ ] Enhanced error log UI (real-time stream, history, export) - 5 days
- [ ] Integration testing (address issues as encountered in production)

---

### Phase 1b: Proxy Generation - ✅ COMPLETE (v2.3.0 - Nov 29, 2025)

**Timeline:** Completed Nov 29, 2025 | **Tests:** +80 new tests (1034 total)

**B2 Implementation (ALL COMPLETE):**
- [x] B2.1: ProxyGenerator (21 tests) - ffmpeg stderr progress parsing
- [x] B2.2: ExifPreserver (19 tests) - 3-phase workflow + cross-platform + ENOENT
- [x] B2.3: ProxyOrchestrator (11 tests) - fail-log-continue
- [x] B2.4: SecurityValidator integration (4 tests)
- [x] B2.5: Cleanup on failure (4 tests) - partial proxy deletion + disk space
- [x] B2.6: IPC Handlers (8 tests)
- [x] B2.7: UI Components - proxy progress + result messages
- [x] B2.8: Integration test plans documented (8 skipped pending fixtures)

**B3 Validation (ALL GO):**
- test-methodology-guardian: TDD 9/10, Quality 8/10 → GO
- code-review-specialist: 9.2/10 → GO
- quality-observer: 8.5/10 → CONDITIONAL GO (conditions met)
- universal-test-engineer: +2 HIGH priority tests added

**Features Delivered:**
- 2560×1440 ProRes Proxy generation (10-bit 4:2:2)
- DateTimeOriginal EXIF preservation (I1 compliance)
- Real-time progress UI (ffmpeg time= parsing)
- Fail-log-continue architecture
- 5 proxy presets: ProRes 2K/1080p/4K, H.264 2K/1080p

---

### Phase 1c: Power Features - ✅ COMPLETE (PR #88 merged Nov 26, 2025)

**Timeline:** Completed Nov 26, 2025 | **Tests:** +104 new tests (871 total)

**Deliverables:**
- [x] FilenameTemplateParser with security hardening (54 tests)
- [x] MetadataToggleService for conditional TapeName writing (10 tests)
- [x] CfexConfig extension with toggle persistence (6 tests)
- [x] SettingsModal UI with 3 toggle checkboxes (9 tests)
- [x] AI Auto-Analyze event emission integration (5 tests)
- [x] Security fix: template static text validation (10 tests)
- [x] Edge case: optional action field handling (10 tests)

**3 Toggles (all default OFF per I7):**
- AI Auto-Analyze Toggle - triggers batch AI after transfer
- Metadata Write Toggle (shotName, LogComment, TapeName)
- Filename Rewrite Toggle + Template parser

**Code Review:** GO verdict (code-review-specialist via Codex)

---

## Future Work

### Issue #63: Reference Catalog (DEFERRED)

**Timeline:** 3-6 months | **Blocked by:** CFEx Phase 1 + Guardrails

**Prerequisites (MANDATORY):**
- [ ] Formalize EAV_CONTRACT:v1 spec (YAML + machine-readable)
- [ ] Contract compatibility tests (CI in both repos)
- [ ] SLO observability (p95 <150ms alerts, CPU <70%)
- [ ] Deletion workflow tool (admin panel feature)
- [ ] Local Supabase validation (EAV → IA migration sequencing)
- [ ] Principal-engineer re-validation (target: 7→9/10 viability)

**Implementation:**
- [ ] media_references schema (3 tables)
- [ ] Vector embeddings (OpenAI CLIP, 512-dimensional)
- [ ] Cross-schema FK to public.shots
- [ ] SECURITY DEFINER view for RLS
- [ ] Quarterly FK audit automation

---

### Tier 4 Enhancements (Backlog)

**Component Decomposition:**
- [ ] Extract App.tsx into smaller components (currently 800+ lines)
- [ ] Create domain-specific components (MetadataForm, FileViewer)
- [ ] Improve component testability

**Error Handling:**
- [ ] Standardize error boundaries
- [ ] Implement retry logic for transient failures
- [ ] Improve user-facing error messages

**Performance Optimization:**
- [ ] Profile batch processing performance
- [ ] Optimize large folder scanning
- [ ] Reduce memory footprint for 1000+ file lists

**Documentation:**
- [ ] User guide for keyboard shortcuts
- [ ] Batch processing workflow documentation
- [ ] Troubleshooting guide

**Platform Support:**
- [ ] Windows support (if client workflows require)

---

## Outstanding Checklist Items

### From SHARED-CHECKLIST.md (Verified Nov 26)

**Phase 1a Remaining:**
- [ ] Integration testing (LucidLink + NFS)

**Phase 1a Deferred:**
- [~] Auto-detection IPC + UI (service complete, activate when multi-card workflow needed)

**From PR #68 Session (Low Priority):**
- [ ] 3 tests for cache reload scenario
- [ ] skipNextVideoLoadRef implementation
- [ ] Form independence tests

**Cross-Ecosystem (Deferred):**
- [ ] Guardrails implementation (4-6 weeks)
- [ ] Local Supabase validation
- [ ] Principal-engineer re-validation

---

## Timeline Summary

```
Phase 1a CORE:    ✅ COMPLETE (Nov 26, 2025)
Phase 1c:         ✅ COMPLETE (Nov 26, 2025 - +104 tests)
Phase 1b:         ✅ COMPLETE (Nov 29, 2025 - +80 tests, v2.3.0)
Phase 1a POLISH:  5-10 days (NEXT - auto-detection IPC+UI, path intelligence)
Issue #63:        3-6 months (after CFEx complete + guardrails)
```

**CFEx Integration Progress:** Phase 1a ✅ + Phase 1b ✅ + Phase 1c ✅ → **CORE COMPLETE**

---

## Strategic Goals

1. **Reliability:** All features fully tested and validated
2. **Security:** Command injection prevention, media server auth, path traversal protection
3. **Usability:** Clear error messages, intuitive workflows
4. **Performance:** Hardware-accelerated transcoding, efficient metadata embedding
5. **Maintainability:** Clean architecture, comprehensive test coverage, TDD discipline

---

## Key References

| Document | Purpose |
|----------|---------|
| [`PROJECT-CONTEXT.md`](PROJECT-CONTEXT.md) | Current state |
| [`PROJECT-HISTORY.md`](PROJECT-HISTORY.md) | Completed work |
| [`SHARED-CHECKLIST.md`](SHARED-CHECKLIST.md) | Immediate tasks |
| [`workflow-docs/001-CFEX-MICROPHASE-PLAN.md`](workflow-docs/001-CFEX-MICROPHASE-PLAN.md) | Phase structure |
| [`workflow-docs/003-CFEX-D3-BLUEPRINT.md`](workflow-docs/003-CFEX-D3-BLUEPRINT.md) | Implementation specs |
