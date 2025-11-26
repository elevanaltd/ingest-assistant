# Ingest Assistant - Project Roadmap

**Last Updated:** 2025-11-26 | **Current Phase:** CFEx Phase 1a B2 (Week 2)

---

## Completed Phases (Summary)

| Phase | Milestone | Date |
|-------|-----------|------|
| D3 | Video Feature Design | Oct 2025 |
| B0 | Foundation (Electron/React/TypeScript) | Oct 2025 |
| B1 | Workspace Setup | Oct 2025 |
| B2/B3 | Video Transcoding + Integration | Nov 2025 |
| B4 | Production Readiness (v2.2.0) | Nov 18, 2025 |

**Full history:** [`PROJECT-HISTORY.md`](PROJECT-HISTORY.md)

---

## Current Phase: CFEx Integration

### Phase 1a: Transfer + Integrity (Week 2 Active)

**Timeline:** 2 weeks (started Nov 20)

| Priority | Status | Description |
|----------|--------|-------------|
| P1 | COMPLETE | Error Handling (errorHandler.ts, retryStrategy.ts, 47 tests) |
| P2 | COMPLETE | Auto-Detection service (IPC+UI deferred - single-card workflow) |
| P3 | NEXT | Integration Testing (4 days - LucidLink + NFS empirical) |
| P4 | COMPLETE | Settings Tab + Browse (60s timeout, defaultPath) |
| UX | COMPLETE | Destination checkboxes, canStart bugfix |

**Remaining Work (Phase 1a-CORE):**
1. [ ] LucidLink cache eviction testing
2. [ ] NFS stale handle testing
3. [ ] Performance baselines documentation
4. [ ] Risk scenario testing

**Deferred (Phase 1a-POLISH → parallel to Phase 1b):**
- [ ] Auto-detection IPC + UI (service ready, activate when multi-card needed)
- [ ] Path Intelligence (MRU, smart defaults, pinned folders) - 5 days
- [ ] Enhanced error log UI (real-time stream, history, export) - 5 days

---

### Phase 1b: Proxy Generation (NOT STARTED)

**Timeline:** 2 weeks | **Blocked by:** Phase 1a-CORE completion

**Scope:**
1. [ ] D2 Design: ffmpeg + exiftool integration architecture
2. [ ] D3 Blueprint: Progress UI, EXIF validation dialogs
3. [ ] B0 Validation: DateTimeOriginal preservation protocol
4. [ ] B2 Implementation:
   - [ ] proxyGenerator.ts (2560x1440 ProRes Proxy)
   - [ ] exifPreserver.ts (DateTimeOriginal extraction)
   - [ ] Integration with cfexTransfer.ts
   - [ ] Per-file + overall progress tracking
   - [ ] Integrity validation (timestamp match)
   - [ ] +40 tests (transcode, EXIF, validation)

**Technical Specification:**
```bash
# Transcode command (validated optimal)
ffmpeg -i raw.MOV -vf "scale=2560:1440" -c:v prores_ks -profile:v 0 \
  -vendor apl0 -pix_fmt yuv422p10le -c:a pcm_s16le proxy.MOV

# MANDATORY: DateTimeOriginal preservation (I1 compliance)
ORIG_DATE=$(exiftool -s3 -DateTimeOriginal raw.MOV)
exiftool -overwrite_original "-QuickTime:DateTimeOriginal=$ORIG_DATE" proxy.MOV
```

**Dependencies:**
- ffmpeg (system)
- exiftool (system)

---

### Phase 1c: Power Features (NOT STARTED)

**Timeline:** 2-3 weeks | **Blocked by:** Phase 1b completion

**Scope:**
1. [ ] D2 Design: Toggle architecture, template parser
2. [ ] D3 Blueprint: Settings panel UI, filename preview
3. [ ] B0 Validation: Toggle defaults (all OFF = I7 compliance)
4. [ ] B2 Implementation:
   - [ ] AI Auto-Analyze Toggle (default: OFF)
   - [ ] Metadata Write Toggle (shotName, LogComment, TapeName)
   - [ ] Filename Rewrite Toggle + Template parser
   - [ ] Settings persistence
   - [ ] +50 tests (toggles, template, TapeName logic)

**TapeName Logic:**
- Written when: metadata write toggle ON OR filename rewrite toggle ON
- NOT written when: Both toggles OFF (JSON-only workflow)

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
Phase 1a CORE:    ~4 days remaining (Integration Testing only)
Phase 1a POLISH:  5-10 days (parallel to 1b, includes auto-detection IPC+UI if needed)
Phase 1b:         ~2 weeks
Phase 1c:         ~2-3 weeks
Issue #63:        3-6 months (after CFEx complete + guardrails)
```

**Total CFEx Integration:** ~6-7 weeks

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
