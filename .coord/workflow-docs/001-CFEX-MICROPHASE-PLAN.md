# CFEx Integration - Microphase Plan

**AUTHORITY:** D1 Execution Plan | **CREATED:** 2025-11-18 | **STATUS:** 🟡 Pending D1 Approval
**GOVERNANCE:** CFEx Feature Development Sequence
**INHERITS:** 000-INGEST_ASSISTANT-D1-NORTH-STAR.md (7 immutables)

---

## MISSION

Integrate CFEx card file transfer + proxy generation through sequential microphases (1a→1b→1c) → Minimize risk, maximize iterative delivery

**STRATEGY:** Sequential microphases ≠ monolithic Phase 1
**RATIONALE:** Proxy generation complexity justifies separate phase + independent D2/D3/B2 cycle

---

## MICROPHASE OVERVIEW

```
Phase 1a: Transfer + Integrity (2 weeks)
SCOPE::[CFEx_card → LucidLink{photos}, CFEx_card → Ubuntu{raw_videos}, integrity_validation{file_count, EXIF_timestamps}]
DELIVERABLE::reliable_2-folder_transfer

Phase 1b: Proxy Generation (2 weeks)
SCOPE::[raw_videos → 2K_ProRes_proxies{LucidLink}, DateTimeOriginal_preservation → MANDATORY_I1, integrity_validation{timestamp_matching}]
DELIVERABLE::production-ready_proxy_workflow

Phase 1c: Power Features (2-3 weeks)
SCOPE::[AI_auto-analyze_toggle{default:OFF}, metadata_write_toggle{shotName,LogComment,TapeName}, filename_rewrite_toggle + format_template]
DELIVERABLE::advanced_user_control + workflow_flexibility
```

**TOTAL TIMELINE:** 6-7 weeks (sequential, with validation gates)

---

## PHASE 1a: TRANSFER + INTEGRITY

### Scope

**FEATURES:**
1. CFEx auto-detection (macOS: `/Volumes/NO NAME/`)
2. Destination folder pickers::[photos: `/LucidLink/`, raw_videos: `/Ubuntu/`]
3. "Process" button → copy + progress tracking
4. Integrity validation::[file_count_match, file_size_verification, EXIF_DateTimeOriginal_validation → warn_if_missing]
5. Path intelligence::[remember_last-used, suggest_project_paths, platform-aware{macOS_LucidLink + Ubuntu_NFS}]

**OUT OF SCOPE (Deferred):**
- Proxy generation (Phase 1b)
- AI auto-analyze toggle (Phase 1c)
- Metadata write toggle (Phase 1c)
- Filename rewrite (Phase 1c)

### Architecture Changes

**NEW:**
- `electron/services/cfexTransfer.ts` - Transfer orchestration
- `electron/services/integrityValidator.ts` - File count, size, EXIF validation
- `electron/services/pathIntelligence.ts` - Folder suggestions, recent paths cache
- `electron/ipc/cfexHandlers.ts` - IPC bridge for CFEx operations

**MODIFIED:**
- `src/App.tsx` - Add CFEx transfer panel UI
- `electron/main.ts` - Register CFEx IPC handlers

**UI:**
- CFEx transfer panel (folder pickers, process button)
- Progress tracking display (file count, current file, percentage)
- Integrity validation warnings (missing timestamps, file count mismatch)

### Deliverables

**D2 Design:** CFEx transfer architecture, integrity protocol, path intelligence caching, error handling + warnings
**D3 Blueprint:** UI mockups (transfer panel, folder pickers, progress), settings panel (path suggestions), error states + dialogs
**B2 Implementation:** Working transfer (photos → LucidLink, raw → Ubuntu), integrity validation (file count, EXIF warnings), path intelligence (folder suggestions), +30 tests
**B0 Validation:** critical-design-validator (transfer integrity), security-specialist (path validation security)

### Dependencies

**REQUIRES:**
- v2.2.0 baseline (rollback capability)
- North Star approval (7 immutables + microphase structure)

**ENABLES:** Phase 1b (proxy generation needs reliable transfer)

---

## PHASE 1b: PROXY GENERATION

### Scope

**FEATURES:**
1. Automatic proxy generation after raw transfer:
   - Source: `/Ubuntu/EAV014/videos-raw/shoot1/`
   - Destination: `/LucidLink/EAV014/videos-proxy/shoot1/`
   - Format: 2560×1440 ProRes Proxy (validated optimal)
2. **MANDATORY DateTimeOriginal preservation:**
   ```bash
   # Step 1: Transcode
   ffmpeg -i raw.MOV -vf "scale=2560:1440" -c:v prores_ks -profile:v 0 -vendor apl0 -pix_fmt yuv422p10le -c:a pcm_s16le proxy.MOV

   # Step 2: Extract + write timestamp (CRITICAL - I1 compliance)
   ORIG_DATE=$(exiftool -s3 -DateTimeOriginal raw.MOV)
   exiftool -overwrite_original "-QuickTime:DateTimeOriginal=$ORIG_DATE" proxy.MOV

   # Step 3: Validate (halt if mismatch)
   PROXY_DATE=$(exiftool -s3 -DateTimeOriginal proxy.MOV)
   [[ "$ORIG_DATE" == "$PROXY_DATE" ]] || exit 1
   ```
3. Progress tracking::[per-file{transcoding + EXIF_writing}, overall{X_of_N_complete}]
4. Integrity validation::[DateTimeOriginal_match{raw_vs_proxy}, file_count_match, halt_if_validation_fails]

**VALIDATED PROXY QUALITY:**
```
2560×1440 ProRes Proxy = goldilocks_resolution (1.78x pixels vs 1080p)
10-bit 4:2:2 color preserved (professional grading capability)
Low CPU decode (intra-frame codec → smooth timeline playback)
~6 MB/sec file size (~175 MB for 24s typical)
Smaller than 1080p HQ (7.8M vs 9.4M) despite 4x resolution
Timeline performance validated (M-series MacBooks + modern PCs 2017+)
```

**OUT OF SCOPE (Deferred):** AI auto-analyze, metadata write, filename rewrite (Phase 1c)

### Architecture Changes

**NEW:**
- `electron/services/proxyGenerator.ts` - ffmpeg orchestration + EXIF preservation
- `electron/services/exifPreserver.ts` - DateTimeOriginal extraction + validation

**MODIFIED:**
- `electron/services/cfexTransfer.ts` - Call proxy generation after raw transfer
- `electron/ipc/cfexHandlers.ts` - Add proxy generation IPC endpoints

**UI:**
- Proxy generation progress (per-file + overall)
- EXIF validation warnings (timestamp mismatch, preservation failure)

### Deliverables

**D2 Design:** Proxy generation architecture (ffmpeg + exiftool), DateTimeOriginal protocol (extraction → write → validate), error handling (transcode failures, EXIF validation failures), performance optimization (hardware acceleration)
**D3 Blueprint:** Progress tracking UI (per-file + overall), EXIF validation warning dialogs, settings panel (CRF quality, resolution options)
**B2 Implementation:** Working proxy generation (2560×1440 ProRes Proxy), DateTimeOriginal preservation (100% reliability), integrity validation (halt timestamp mismatch), +40 tests
**B0 Validation:** critical-design-validator (DateTimeOriginal protocol), technical-architect (ffmpeg + exiftool integration)

### Dependencies

**REQUIRES:**
- Phase 1a complete (reliable transfer to Ubuntu)
- ffmpeg installed (system dependency)
- exiftool installed (system dependency)

**ENABLES:** Phase 1c (AI auto-analyze needs proxies), Core IA workflow (AI analyzes proxies → creates JSON in proxy folder)

---

## PHASE 1c: POWER FEATURES

### Scope

**FEATURES:**
1. **AI Auto-Analyze Toggle:**
   - Settings: "Run AI analysis after transfer" (default: OFF)
   - Enabled: Automatically opens proxy folder + runs batch AI processing
   - Disabled: Manual workflow (existing production method)

2. **Metadata Write Toggle:**
   - Settings: "Write metadata to files" (default: OFF)
   - Enabled: Writes shotName, LogComment, Description, **TapeName** to file XMP
   - Disabled: JSON-only workflow (current recommended)
   - **TapeName Logic:** Written when metadata write toggle ON (preserves original filename)

3. **Filename Rewrite Toggle + Format:**
   - Settings: "Rename files" (default: OFF)
   - Template field: `{subject}-{shotNumber}` (customizable)
   - Examples::[
       `{subject}-{shotNumber}` → `oven-#5.MOV`,
       `{cameraID}-{subject}-{shotType}-{shotNumber}` → `EA001621-oven-CU-#5.MOV`
     ]
   - Preview before commit (show filename changes)
   - **TapeName Logic:** Written when rename toggle ON (preserves original before rename)

**OUT OF SCOPE:** Zero-click AI during transfer (deferred - Option A complexity), Reference Catalog (Issue #63 - separate 3-6 month cycle)

### Architecture Changes

**NEW:**
- `electron/services/filenameTemplate.ts` - Template parser + substitution
- `electron/services/metadataToggle.ts` - Conditional XMP writing logic

**MODIFIED:**
- `electron/services/metadataWriter.ts` - Add TapeName field writing
- `electron/services/batchQueueManager.ts` - Optional AI auto-analyze after transfer
- `src/components/SettingsModal.tsx` - Add toggle controls + template field

**UI:**
- Settings panel (AI toggle, metadata toggle, rename toggle)
- Template editor (syntax help, field autocomplete)
- Filename preview (before/after rename)

### Deliverables

**D2 Design:** Template parser architecture (field substitution + validation), TapeName writing logic (conditional toggles), AI auto-analyze integration (optional batch processing), settings persistence
**D3 Blueprint:** Settings panel UI (toggles + template editor), filename preview display (before/after), toggle state indicators (ON/OFF feedback)
**B2 Implementation:** Working AI auto-analyze toggle (optional batch), working metadata write toggle (shotName, LogComment, TapeName), working filename rewrite toggle + template parser, settings persistence, +50 tests
**B0 Validation:** critical-design-validator (TapeName logic correctness), requirements-steward (toggle default states all OFF)

### Dependencies

**REQUIRES:**
- Phase 1b complete (proxies available for AI analysis)
- Core IA workflow operational (AI batch processing)

**ENABLES:** Advanced user workflows (power users), workflow flexibility (JSON-only vs file modification)

---

## SEQUENTIAL EXECUTION RATIONALE

### Why Microphases?

**RISK MITIGATION:** Each phase → independent D2/D3/B0 gates | Failures isolated to specific phase ≠ entire CFEx | Rollback to previous stable if critical issues

**ITERATIVE VALUE:**
- Phase 1a: Immediate value (reliable transfer replaces external app)
- Phase 1b: Core workflow unlocked (proxies enable AI analysis)
- Phase 1c: Power features for advanced users (optional enhancements)

**COMPLEXITY MANAGEMENT:** Proxy generation (1b) complex → justifies separate design cycle | DateTimeOriginal preservation → careful B0 validation | Template parser (1c) benefits from proven proxy foundation

### Integration Points

**1a → 1b:** Phase 1a delivers reliable raw transfer to Ubuntu | Phase 1b consumes raw → produces proxies on LucidLink
**1b → 1c:** Phase 1b delivers proxies + DateTimeOriginal preserved | Phase 1c consumes proxies for AI auto-analyze
**1c → Core IA:** Phase 1c enables optional AI auto-analyze after transfer | Core IA workflow unchanged (manual trigger still supported)

---

## VALIDATION GATES

### Phase 1a GO/NO-GO (B0)

**critical-design-validator:** Transfer integrity sound? | EXIF validation catches missing timestamps? | Path validation security adequate?
**security-specialist:** Path traversal protection (LucidLink + Ubuntu mounts)? | CFEx auto-detection safe?
**GO Criteria:** All validation protocols proven | Security vulnerabilities addressed | Transfer reliability 100% (no silent failures)

### Phase 1b GO/NO-GO (B0)

**critical-design-validator:** DateTimeOriginal preservation 100% reliable? | Validation halts workflow on mismatch? | Proxy quality meets production?
**technical-architect:** ffmpeg + exiftool integration sound? | Hardware acceleration detection reliable? | Error recovery adequate?
**GO Criteria:** DateTimeOriginal proven (I1 compliance) | Proxy quality validated (2560×1440 ProRes Proxy) | Integrity validation catches all failures

### Phase 1c GO/NO-GO (B0)

**requirements-steward:** Toggle defaults correct (all OFF)? | TapeName logic aligns immutables (I3)? | AI auto-analyze optional (I7 Human Primacy)?
**critical-design-validator:** Template parser security (no injection)? | Filename rewrite atomic (no partial renames)? | Settings persistence reliable?
**GO Criteria:** Toggles optional (users disable without breaking workflow) | TapeName logic correct (write when file modification enabled) | Template parser safe (no security vulnerabilities)

---

## TIMELINE ESTIMATE

```
Phase 1a: Transfer + Integrity
DURATION::[D2:2-3_days, D3:1-2_days, B0:1_day, B2:6-8_days{TDD}] → Total:~2_weeks

Phase 1b: Proxy Generation
DURATION::[D2:3-4_days{ffmpeg+exiftool}, D3:1-2_days, B0:1_day{DateTimeOriginal_critical}, B2:7-9_days{TDD+validation}] → Total:~2_weeks

Phase 1c: Power Features
DURATION::[D2:3-4_days{template_parser+toggle_architecture}, D3:2-3_days{settings_panel}, B0:1_day, B2:8-10_days{TDD+integration}] → Total:~2-3_weeks

Total: 6-7 weeks (sequential)
```

**ASSUMPTIONS:** Quality gates pass without major rework | No critical architecture changes during validation | TDD discipline maintained (RED→GREEN→REFACTOR)

---

## SUCCESS CRITERIA

### Phase 1a Success
- CFEx → LucidLink (photos) 100% reliable
- CFEx → Ubuntu (raw) 100% reliable
- Integrity validation catches missing files/timestamps
- Path intelligence suggests correct folders 90%+ time
- Zero data loss (I4 compliance)

### Phase 1b Success
- Proxies generated 2560×1440 ProRes Proxy quality
- DateTimeOriginal preserved 100% time (I1 compliance)
- Validation halts workflow timestamp mismatch
- Proxy quality validated (10-bit 4:2:2 color, low CPU intra-frame decode)
- Timeline performance smooth (M-series + modern PCs)

### Phase 1c Success
- AI auto-analyze toggle works (optional batch)
- Metadata write toggle writes TapeName + shotName + LogComment
- Filename rewrite toggle + template parser functional
- All toggles default OFF (manual control preserved - I7)
- Settings persist across sessions

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
