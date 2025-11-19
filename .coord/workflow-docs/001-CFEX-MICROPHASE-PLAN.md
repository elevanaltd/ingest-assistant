# CFEx Integration - Microphase Plan

**AUTHORITY:** D1 Execution Plan | Guides D2/D3 Design
**CREATED:** 2025-11-18 | **STATUS:** 🟡 Pending D1 Approval
**GOVERNANCE:** CFEx Feature Development Sequence
**INHERITS:** 000-INGEST_ASSISTANT-D1-NORTH-STAR.md (7 immutables)

---

## MISSION

Integrate CFEx card file transfer + proxy generation into Ingest Assistant through sequential microphases, minimizing risk and maximizing iterative delivery value.

**STRATEGY:** Sequential microphases (1a→1b→1c) instead of monolithic Phase 1
**RATIONALE:** Proxy generation complexity justifies separate phase with independent D2/D3/B2 cycle

---

## MICROPHASE OVERVIEW

```
Phase 1a: Transfer + Integrity (2 weeks)
├─ CFEx card → LucidLink (photos)
├─ CFEx card → Ubuntu (raw videos)
├─ Integrity validation (file count, EXIF timestamps)
└─ Deliverable: Reliable 2-folder transfer

Phase 1b: Proxy Generation (2 weeks)
├─ Raw videos → 4K H.264 proxies (LucidLink)
├─ DateTimeOriginal preservation (MANDATORY I1 compliance)
├─ Integrity validation (timestamp matching)
└─ Deliverable: Production-ready proxy workflow

Phase 1c: Power Features (2-3 weeks)
├─ AI auto-analyze toggle (default: OFF)
├─ Metadata write toggle (shotName, LogComment, TapeName)
├─ Filename rewrite toggle + format template
└─ Deliverable: Advanced user control + workflow flexibility
```

**TOTAL TIMELINE:** 6-7 weeks (sequential, with validation gates)

---

## PHASE 1a: TRANSFER + INTEGRITY

### Scope

**Features:**
1. CFEx card auto-detection (macOS: `/Volumes/NO NAME/`)
2. Destination folder pickers:
   - Photos: `/LucidLink/EAV014/images/shoot1-20251124/`
   - Raw videos: `/Ubuntu/EAV014/videos-raw/shoot1-20251124/`
3. "Process" button → copy with progress tracking
4. Integrity validation:
   - File count match (source vs destination)
   - File size verification
   - EXIF DateTimeOriginal validation (warn if missing/corrupt)
5. Path intelligence:
   - Remember last-used folders
   - Suggest project paths based on naming patterns
   - Platform-aware (macOS LucidLink + Ubuntu NFS mounts)

**Out of Scope (Deferred to 1b/1c):**
- ❌ Proxy generation (Phase 1b)
- ❌ AI auto-analyze toggle (Phase 1c)
- ❌ Metadata write toggle (Phase 1c)
- ❌ Filename rewrite (Phase 1c)

### Architecture Changes

**New Components:**
- `electron/services/cfexTransfer.ts` - Transfer orchestration
- `electron/services/integrityValidator.ts` - File count, size, EXIF validation
- `electron/services/pathIntelligence.ts` - Folder suggestions, recent paths cache
- `electron/ipc/cfexHandlers.ts` - IPC bridge for CFEx operations

**Modified Components:**
- `src/App.tsx` - Add CFEx transfer panel UI
- `electron/main.ts` - Register CFEx IPC handlers

**UI Components:**
- CFEx transfer panel (folder pickers, process button)
- Progress tracking display (file count, current file, percentage)
- Integrity validation warnings (missing timestamps, file count mismatch)

### Deliverables

**D2 Design:**
- CFEx transfer architecture (service layer + IPC)
- Integrity validation protocol (EXIF timestamp checking)
- Path intelligence caching strategy
- Error handling + user warnings

**D3 Blueprint:**
- UI mockups (transfer panel, folder pickers, progress display)
- Settings panel (path suggestions configuration)
- Error states + warning dialogs

**B2 Implementation:**
- Working CFEx transfer (photos → LucidLink, raw → Ubuntu)
- Integrity validation (file count, EXIF warnings)
- Path intelligence (folder suggestions)
- +30 tests (transfer, validation, path intelligence)

**B0 Validation:**
- critical-design-validator: Transfer integrity protocol
- security-specialist: Path validation security

### Dependencies

**Requires:**
- ✅ v2.2.0 baseline (rollback capability)
- ✅ North Star approval (7 immutables + microphase structure)

**Enables:**
- Phase 1b (proxy generation needs reliable transfer)

---

## PHASE 1b: PROXY GENERATION

### Scope

**Features:**
1. Automatic proxy generation after raw transfer:
   - Source: Raw videos in `/Ubuntu/EAV014/videos-raw/shoot1/`
   - Destination: Proxies in `/LucidLink/EAV014/videos-proxy/shoot1/`
   - Format: 4K H.264 @ CRF 23 (validated optimal)
2. **MANDATORY DateTimeOriginal preservation:**
   ```bash
   # Step 1: Transcode
   ffmpeg -i raw.MOV -c:v libx264 -preset medium -crf 23 -c:a aac proxy.MOV

   # Step 2: Extract + write timestamp (CRITICAL - I1 compliance)
   ORIG_DATE=$(exiftool -s3 -DateTimeOriginal raw.MOV)
   exiftool -overwrite_original "-QuickTime:DateTimeOriginal=$ORIG_DATE" proxy.MOV

   # Step 3: Validate (halt if mismatch)
   PROXY_DATE=$(exiftool -s3 -DateTimeOriginal proxy.MOV)
   [[ "$ORIG_DATE" == "$PROXY_DATE" ]] || exit 1
   ```
3. Progress tracking:
   - Per-file progress (transcoding + EXIF writing)
   - Overall progress (X of N files complete)
4. Integrity validation:
   - DateTimeOriginal match (raw vs proxy)
   - File count match (all raws have proxies)
   - Halt workflow if any validation fails

**Validated Proxy Quality:**
- **4K H.264 @ CRF 23** automatically upgrades to **H.264 High 4:2:2 Profile**
- **10-bit 4:2:2 color preserved** (professional color)
- **131:1 compression** (1GB raw → 7.8M proxy typical for 24s video)
- **Smaller than 1080p HQ** (7.8M vs 9.4M) despite 4x resolution
- **Timeline performance validated** (M-series MacBooks + modern PCs 2017+)

**Out of Scope (Deferred to 1c):**
- ❌ AI auto-analyze toggle (Phase 1c)
- ❌ Metadata write toggle (Phase 1c)
- ❌ Filename rewrite (Phase 1c)

### Architecture Changes

**New Components:**
- `electron/services/proxyGenerator.ts` - ffmpeg orchestration + EXIF preservation
- `electron/services/exifPreserver.ts` - DateTimeOriginal extraction + validation

**Modified Components:**
- `electron/services/cfexTransfer.ts` - Call proxy generation after raw transfer
- `electron/ipc/cfexHandlers.ts` - Add proxy generation IPC endpoints

**UI Components:**
- Proxy generation progress (per-file + overall)
- EXIF validation warnings (timestamp mismatch, preservation failure)

### Deliverables

**D2 Design:**
- Proxy generation architecture (ffmpeg + exiftool integration)
- DateTimeOriginal preservation protocol (extraction → write → validate)
- Error handling (transcode failures, EXIF validation failures)
- Performance optimization (hardware acceleration detection)

**D3 Blueprint:**
- Progress tracking UI (per-file + overall)
- EXIF validation warning dialogs
- Settings panel (CRF quality, resolution options)

**B2 Implementation:**
- Working proxy generation (4K H.264 @ CRF 23)
- DateTimeOriginal preservation (100% reliability)
- Integrity validation (halt if timestamp mismatch)
- +40 tests (transcode, EXIF preservation, validation)

**B0 Validation:**
- critical-design-validator: DateTimeOriginal preservation protocol
- technical-architect: ffmpeg + exiftool integration architecture

### Dependencies

**Requires:**
- ✅ Phase 1a complete (reliable transfer to Ubuntu)
- ✅ ffmpeg installed (system dependency)
- ✅ exiftool installed (system dependency)

**Enables:**
- Phase 1c (AI auto-analyze needs proxies)
- Core IA workflow (AI analyzes proxies, creates JSON in proxy folder)

---

## PHASE 1c: POWER FEATURES

### Scope

**Features:**
1. **AI Auto-Analyze Toggle:**
   - Settings: "Run AI analysis after transfer" (default: OFF)
   - If enabled: Automatically opens proxy folder and runs batch AI processing
   - If disabled: Manual workflow (existing production method)

2. **Metadata Write Toggle:**
   - Settings: "Write metadata to files" (default: OFF)
   - If enabled: Writes shotName, LogComment, Description, **TapeName** to file XMP
   - If disabled: JSON-only workflow (current recommended)
   - **TapeName Logic:** Written when metadata write toggle ON (preserves original filename)

3. **Filename Rewrite Toggle + Format:**
   - Settings: "Rename files" (default: OFF)
   - Template field: `{subject}-{shotNumber}` (customizable)
   - Examples:
     - `{subject}-{shotNumber}` → `oven-#5.MOV`
     - `{cameraID}-{subject}-{shotType}-{shotNumber}` → `EA001621-oven-CU-#5.MOV`
   - Preview before commit (show filename changes)
   - **TapeName Logic:** Written when rename toggle ON (preserves original filename before rename)

**Out of Scope:**
- ❌ Zero-click AI during transfer (deferred - Option A complexity)
- ❌ Reference Catalog (Issue #63 - separate 3-6 month cycle)

### Architecture Changes

**New Components:**
- `electron/services/filenameTemplate.ts` - Template parser + substitution
- `electron/services/metadataToggle.ts` - Conditional XMP writing logic

**Modified Components:**
- `electron/services/metadataWriter.ts` - Add TapeName field writing
- `electron/services/batchQueueManager.ts` - Optional AI auto-analyze after transfer
- `src/components/SettingsModal.tsx` - Add toggle controls + template field

**UI Components:**
- Settings panel (AI toggle, metadata toggle, rename toggle)
- Template editor (syntax help, field autocomplete)
- Filename preview (before/after rename)

### Deliverables

**D2 Design:**
- Template parser architecture (field substitution + validation)
- TapeName writing logic (conditional based on toggles)
- AI auto-analyze integration (optional batch processing)
- Settings persistence (user preferences storage)

**D3 Blueprint:**
- Settings panel UI (toggles + template editor)
- Filename preview display (before/after)
- Toggle state indicators (ON/OFF visual feedback)

**B2 Implementation:**
- Working AI auto-analyze toggle (optional batch processing)
- Working metadata write toggle (shotName, LogComment, TapeName)
- Working filename rewrite toggle + template parser
- Settings persistence (user preferences)
- +50 tests (toggles, template parser, TapeName logic, AI integration)

**B0 Validation:**
- critical-design-validator: TapeName logic correctness
- requirements-steward: Toggle default states (all OFF)

### Dependencies

**Requires:**
- ✅ Phase 1b complete (proxies available for AI analysis)
- ✅ Core IA workflow operational (AI batch processing)

**Enables:**
- Advanced user workflows (power users)
- Workflow flexibility (JSON-only vs file modification)

---

## SEQUENTIAL EXECUTION RATIONALE

### Why Microphases?

**Risk Mitigation:**
- Each phase has independent D2/D3/B0 validation gates
- Failures isolated to specific phase (not entire CFEx integration)
- Rollback to previous stable phase if critical issues discovered

**Iterative Value Delivery:**
- Phase 1a: Immediate value (reliable transfer replaces external app)
- Phase 1b: Core workflow unlocked (proxies enable AI analysis)
- Phase 1c: Power features for advanced users (optional enhancements)

**Complexity Management:**
- Proxy generation (1b) is complex enough to justify separate design cycle
- DateTimeOriginal preservation protocol requires careful B0 validation
- Template parser (1c) benefits from proven proxy workflow foundation

### Integration Points

**1a → 1b:**
- Phase 1a delivers reliable raw transfer to Ubuntu
- Phase 1b consumes raw files from Ubuntu, produces proxies on LucidLink

**1b → 1c:**
- Phase 1b delivers proxies with DateTimeOriginal preserved
- Phase 1c consumes proxies for AI auto-analyze workflow

**1c → Core IA:**
- Phase 1c enables optional AI auto-analyze after transfer
- Core IA workflow remains unchanged (manual trigger still supported)

---

## VALIDATION GATES

### Phase 1a GO/NO-GO (B0)

**critical-design-validator:**
- Transfer integrity protocol sound?
- EXIF validation catches missing timestamps?
- Path validation security adequate?

**security-specialist:**
- Path traversal protection (LucidLink + Ubuntu mounts)?
- CFEx card auto-detection safe?

**GO Criteria:**
- All validation protocols proven
- Security vulnerabilities addressed
- Transfer reliability 100% (no silent failures)

### Phase 1b GO/NO-GO (B0)

**critical-design-validator:**
- DateTimeOriginal preservation 100% reliable?
- Validation protocol halts workflow on mismatch?
- Proxy quality meets production requirements?

**technical-architect:**
- ffmpeg + exiftool integration architecture sound?
- Hardware acceleration detection reliable?
- Error recovery strategies adequate?

**GO Criteria:**
- DateTimeOriginal preservation proven (I1 compliance)
- Proxy quality validated (4K H.264 @ CRF 23)
- Integrity validation catches all failures

### Phase 1c GO/NO-GO (B0)

**requirements-steward:**
- Toggle default states correct (all OFF)?
- TapeName logic aligns with immutables (I3)?
- AI auto-analyze optional (I7 Human Primacy)?

**critical-design-validator:**
- Template parser security (no injection vulnerabilities)?
- Filename rewrite atomic (no partial renames)?
- Settings persistence reliable?

**GO Criteria:**
- Toggles optional (users can disable without breaking workflow)
- TapeName logic correct (write when file modification enabled)
- Template parser safe (no security vulnerabilities)

---

## TIMELINE ESTIMATE

```
Phase 1a: Transfer + Integrity
├─ D2 Design: 2-3 days
├─ D3 Blueprint: 1-2 days
├─ B0 Validation: 1 day
├─ B2 Implementation: 6-8 days (TDD)
└─ Total: ~2 weeks

Phase 1b: Proxy Generation
├─ D2 Design: 3-4 days (ffmpeg + exiftool integration)
├─ D3 Blueprint: 1-2 days
├─ B0 Validation: 1 day (DateTimeOriginal preservation critical)
├─ B2 Implementation: 7-9 days (TDD + validation)
└─ Total: ~2 weeks

Phase 1c: Power Features
├─ D2 Design: 3-4 days (template parser + toggle architecture)
├─ D3 Blueprint: 2-3 days (settings panel UI)
├─ B0 Validation: 1 day
├─ B2 Implementation: 8-10 days (TDD + integration)
└─ Total: ~2-3 weeks

Total: 6-7 weeks (sequential)
```

**Assumptions:**
- Quality gates pass without major rework
- No critical architecture changes discovered during validation
- TDD discipline maintained (RED→GREEN→REFACTOR)

---

## SUCCESS CRITERIA

### Phase 1a Success
- ✅ CFEx card → LucidLink (photos) 100% reliable
- ✅ CFEx card → Ubuntu (raw videos) 100% reliable
- ✅ Integrity validation catches missing files/timestamps
- ✅ Path intelligence suggests correct folders 90%+ of time
- ✅ Zero data loss (I4 compliance)

### Phase 1b Success
- ✅ Proxies generated with 4K H.264 @ CRF 23 quality
- ✅ DateTimeOriginal preserved 100% of time (I1 compliance)
- ✅ Validation halts workflow on timestamp mismatch
- ✅ Proxy quality validated (10-bit 4:2:2 color, 131:1 compression)
- ✅ Timeline performance smooth (M-series + modern PCs)

### Phase 1c Success
- ✅ AI auto-analyze toggle works (optional batch processing)
- ✅ Metadata write toggle writes TapeName + shotName + LogComment
- ✅ Filename rewrite toggle + template parser functional
- ✅ All toggles default OFF (manual control preserved - I7)
- ✅ Settings persist across sessions

---

## NEXT STEPS AFTER D1 APPROVAL

1. **D2 Design (Phase 1a)** - design-architect creates transfer architecture
2. **D3 Blueprint (Phase 1a)** - visual-architect creates UI mockups
3. **B0 Validation (Phase 1a)** - critical-design-validator + security-specialist GO/NO-GO
4. **B2 Implementation (Phase 1a)** - implementation-lead builds with TDD
5. **Repeat cycle for Phase 1b** (proxy generation)
6. **Repeat cycle for Phase 1c** (power features)

---

**DOCUMENT_VERSION:** 1.0
**CREATED:** 2025-11-18
**NEXT_REVIEW:** D1 approval → D2 design (Phase 1a)
