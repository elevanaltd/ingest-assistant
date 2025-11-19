# Ingest Assistant - North Star (OCTAVE)

**AUTHORITY:** D1 Phase Deliverable | Project-Level Immutables
**CREATED:** 2025-11-18 | **APPROVAL:** 🟡 Pending
**GOVERNANCE:** ALL features (Core IA v2.2.0, CFEx Integration, Reference Catalog #63)
**SUPERSEDES:** Feature-specific North Star (Issue #63 only)

---

## MISSION

Transform raw media files into cataloged assets through AI-augmented metadata creation, maintaining temporal integrity + human oversight while feeding structured metadata to downstream production tools.

**POSITION:** Step 6 of 10 in EAV production pipeline (field capture → post-production gateway)

---

## IMMUTABLES (7 Total)

### I1: Chronological Temporal Ordering

**PRINCIPLE:** Media assets ordered by capture timestamp → immutable temporal sequence reflects original recording chronology

**WHY IMMUTABLE:**
Sequential shot numbers (#1, #2, #3...) derive meaning from chronological ordering. If temporal sequence changes → shot numbers become arbitrary → downstream references break → production continuity fails. **Project restarts if violated.**

**VALIDATION::**
- Files sortable by capture timestamp before shot number assignment
- Warn if timestamps missing/corrupt
- Fallback timestamp mechanism (EXIF → filesystem → manual)
- TEST: "Two sessions order same files differently?" → workflow breaks = failure

**STATUS:** 🟢 Proven (EXIF DateTimeOriginal validation operational)

---

### I2: Human Oversight Authority

**PRINCIPLE:** Human judgment has final authority over all metadata decisions → AI systems serve as augmentation tools (not autonomous decision-makers)

**WHY IMMUTABLE:**
Production media has legal/contractual implications → client deliverables require human accountability → AI errors propagating to final deliverables create liability. If humans cannot override AI → project fails core mission of "assisted" cataloging. **Project restarts if violated.**

**VALIDATION::**
- AI suggestions marked provisional until human approval
- Humans can edit any metadata field after AI processing
- Audit trail captures human corrections vs. AI suggestions
- TEST: "System commits metadata without human interaction?" → YES = violation

**STATUS:** 🟢 Proven (manual edit always available, AI suggestions never locked)

---

### I3: Single Source of Truth

**PRINCIPLE:** Each metadata attribute has exactly one authoritative source → prevents divergence, conflicts, synchronization failures

**WHY IMMUTABLE:**
If metadata exists in multiple places (file XMP + JSON + database) → conflicts inevitable → "file says kitchen, JSON says bathroom" breaks downstream workflows → CEP Panel needs ONE source. **Project restarts if metadata duplication allowed.**

**VALIDATION::**
- Document authoritative source for each metadata attribute
- Derived copies marked as cache (not source of truth)
- Update flows unidirectional (source → derived, never reverse)
- TEST: "File XMP and JSON conflict, which wins?" → must have clear answer

**CURRENT:** `.ingest-metadata.json` = single source (all cataloging metadata)

**LOCATION:** JSON co-located with analyzed files
- Videos: Proxy folder (e.g., `/LucidLink/EAV014/videos-proxy/shoot1/.ingest-metadata.json`)
- Photos: Image folder (e.g., `/LucidLink/EAV014/images/shoot1/.ingest-metadata.json`)
- Rationale: Editors work with proxies (not raw), JSON must be where editors access files

**FILE METADATA (Optional):**
- TapeName written ONLY when file modification enabled (metadata write toggle OR filename rename toggle)
- Purpose: Preserves original filename when files are modified
- Not written in JSON-only workflow (current default)

**CEP PANEL CONTRACT:**
- Reads JSON from proxy folder (videos) or image folder (photos)
- Uses filename as immutable reference (camera_id/unique_ref deterministic)
- Proxy matching: `{filename}_proxy.MOV` → `{filename}.MOV` (removes "_proxy" suffix)

**STATUS:** 🟢 Proven (JSON Schema v2.0 established as source of truth)

---

### I4: Zero Data Loss Guarantee

**PRINCIPLE:** No media file content or metadata may be lost, corrupted, or degraded during any system operation involving authoritative assets

**WHY IMMUTABLE:**
Media files represent field capture investment (crew time, location access, talent cost) → losing even one file or corrupting metadata renders project incomplete. If system cannot guarantee data integrity → professional production teams cannot trust it. **Project restarts if data loss acceptable.**

**VALIDATION::**
- Integrity checks before declaring transfer complete (file count, sizes, checksums)
- Atomic metadata updates (all-or-nothing, no partial writes)
- Error reporting halts workflow (not silent continuation)
- TEST: "Transfer reports success but files missing?" → NO = correct behavior

**STATUS:** 🟡 Partial (lacks comprehensive integrity validation for CFex workflow)

---

### I5: Ecosystem Contract Coherence

**PRINCIPLE:** Metadata format and content contracts with downstream systems remain stable and backwards-compatible → prevents pipeline fragmentation

**WHY IMMUTABLE:**
Ingest Assistant = Step 6 of 10 → CEP Panel (Step 7) expects specific JSON schema → breaking contract renders CEP Panel unable to import → halts entire production workflow. If contract coherence negotiable → ecosystem fragments. **Project restarts if unilateral breaking changes allowed.**

**VALIDATION::**
- Document contract specifications (JSON Schema v2.0)
- JSON location contract: Proxy folder for videos, image folder for photos
- Filename immutability: Camera ID/unique ref preserved (CEP Panel matching)
- Version changes with migration paths
- Integration tests against downstream consumers
- TEST: "IA changes JSON schema without CEP Panel update?" → import breaks = violation

**STATUS:** 🟢 Proven (Schema v2.0 established, CEP Panel compatibility tested)

---

### I6: Committed Identifier Immutability

**PRINCIPLE:** Once identifiers are externally referenced (committed state) → never change → preserves referential integrity across systems and time

**WHY IMMUTABLE:**
Shot #25 referenced in CEP Panel, Premiere Pro timeline, EAV production tracking. If IA renumbers shots after commitment → all downstream references break → "Find shot #25" returns wrong content. If identifier mutability acceptable → referential integrity impossible. **Project restarts if post-commitment changes allowed.**

**VALIDATION::**
- Define commitment boundary (COMPLETE folder state)
- Prevent identifier mutation after commitment (UI disabled, API rejects)
- Warn before commitment ("shot numbers become immutable")
- TEST: "After marking COMPLETE, can shot numbers change?" → YES = violation

**STATUS:** 🟢 Proven (COMPLETE folder locking prevents re-sorting)

---

### I7: Human Primacy Over Automation

**PRINCIPLE:** Automation optimizes human workflows (not replaces human judgment) → preserves user agency and decision-making authority

**WHY IMMUTABLE:**
"Ingest Assistant" name reflects philosophy: AI assists humans, not replaces → removing human agency creates "black box" where errors propagate invisibly → professional workflows require human checkpoint authority. If automation becomes mandatory/non-overridable → project fails assistive mission. **Restart required if human primacy removed.**

**VALIDATION::**
- All automation provides manual override/intervention points
- Users can disable automation features without breaking workflow
- Automated decisions visible and reviewable
- TEST: "Users complete workflow without any AI/automation?" → NO = violation

**STATUS:** 🟢 Proven (manual workflow fully supported, AI optional)

---

## CONSTRAINED VARIABLES

### Metadata Storage Format
- **IMMUTABLE:** Single source of truth (I3) + Downstream contract coherence (I5)
- **FLEXIBLE:** JSON → Protocol Buffers | database records | embedded metadata
- **NEGOTIABLE:** Field names | nesting structure | serialization format

### AI Provider Integration
- **IMMUTABLE:** Human oversight authority (I2) + Human primacy (I7)
- **FLEXIBLE:** Multi-provider (OpenRouter, Anthropic, OpenAI) | confidence thresholds | sequential vs. parallel
- **NEGOTIABLE:** Specific models (Claude, GPT, Gemini) | prompt engineering | frame sampling

### Chronological Ordering Mechanism
- **IMMUTABLE:** Temporal ordering principle (I1) + Committed identifier immutability (I6)
- **FLEXIBLE:** EXIF DateTimeOriginal → filesystem timestamps → manual timestamps | fallback hierarchy | timezone handling
- **NEGOTIABLE:** Timestamp format parsing | missing timestamp UX | manual override mechanisms

### Platform Support
- **IMMUTABLE:** Zero data loss (I4) cross-platform | Ecosystem contracts (I5) platform-independent
- **FLEXIBLE:** macOS + Ubuntu (current) | Windows + Linux variants (future) | platform-specific optimizations
- **NEGOTIABLE:** Hardware acceleration | filesystem conventions | UI framework choices

### Transfer Integrity Validation
- **IMMUTABLE:** Zero data loss guarantee (I4)
- **FLEXIBLE:** Checksum algorithms (MD5, SHA256, xxHash) | validation depth | error recovery strategies
- **NEGOTIABLE:** Progress reporting UX | retry logic | background vs. foreground validation

### File Metadata Writing Strategy
- **IMMUTABLE:** Single source of truth (I3) - JSON always authoritative
- **FLEXIBLE:** Optional file metadata writing (toggles: write metadata ON/OFF, rename file ON/OFF)
- **NEGOTIABLE:** Which fields to write | TapeName inclusion logic | XMP tag selection
- **RULE:** TapeName written when file modification enabled (metadata write toggle OR filename rename toggle)
- **DEFAULT:** JSON-only workflow (no file modification, TapeName not written)

### Proxy Generation Strategy
- **IMMUTABLE:** Proxies must preserve DateTimeOriginal for chronological ordering (I1) | Proxies must be analyzable by AI (visual quality sufficient)
- **FLEXIBLE:** 4K H.264 @ CRF 23 (recommended) | 1080p H.264 @ CRF 23 (extreme compression) | ProRes Proxy (editing-first workflow)
- **NEGOTIABLE:** CRF quality setting (18-28) | Resolution (4K vs 1080p) | Codec (H.264 vs ProRes) | Storage location (LucidLink vs Ubuntu)
- **VALIDATED:** 4K H.264 @ CRF 23 achieves 10-bit 4:2:2 automatically (H.264 High 4:2:2 Profile) | 131:1 compression | Smaller than 1080p HQ despite 4x resolution | Timeline performance validated on M-series + modern PCs
- **MANDATORY:** Post-transcode EXIF copy: `exiftool -overwrite_original "-QuickTime:DateTimeOriginal=$ORIG_DATE" proxy.MOV`

---

## ASSUMPTION REGISTER

**A1::EXIF_TIMESTAMPS_RELIABLE**
- ASSUMPTION: Camera-embedded EXIF DateTimeOriginal accurately reflects capture chronology (95%+ of media files)
- RISK_IF_FALSE: Shot number assignment non-chronological → downstream workflows break → manual timestamp correction needed
- CONFIDENCE: 85% (proven in production, edge cases: wrong camera clock, timezone issues, manual date changes)
- IMPACT: HIGH (I1 Chronological Ordering depends on timestamp reliability)
- VALIDATE: [owner:implementation-lead, method:EXIF_validation_during_CFEx_transfer, timing:before_B1, contingency:fallback_filesystem_timestamps+user_warning]

**A2::CEP_PANEL_CONTRACT_STABILITY**
- ASSUMPTION: CEP Panel maintains JSON Schema v2.0 compatibility for 12+ months (gradual evolution, not breaking changes)
- RISK_IF_FALSE: IA outputs incompatible with CEP Panel → production pipeline breaks Steps 6-7 → emergency migration required
- CONFIDENCE: 90% (CEP Panel under same development control, versioning protocol established)
- IMPACT: CRITICAL (I5 Ecosystem Contract Coherence breaks if false)
- VALIDATE: [owner:requirements-steward, method:integration_tests+contract_spec_docs, timing:before_each_IA_release, contingency:schema_versioning+migration_tooling]

**A3::AI_PRE_ANALYSIS_ACCURACY_SUFFICIENT**
- ASSUMPTION: AI metadata suggestions accurate enough (>60% correct) that zero-click pre-analysis provides net time savings despite correction overhead
- RISK_IF_FALSE: Users spend more time correcting AI errors than manual entry → zero-click workflow rejected → feature adoption fails
- CONFIDENCE: 70% (limited production testing, varies by media type/complexity)
- IMPACT: MEDIUM (affects CFEx Integration value proposition, doesn't break core workflow)
- VALIDATE: [owner:user_research, method:pilot_testing_5+_shoots+measure_correction_time_vs_manual, timing:before_B2, contingency:make_AI_opt-in+tune_confidence_thresholds]

**A4::PARALLEL_IO_AI_SAVES_TIME**
- ASSUMPTION: Running AI analysis during file copy (parallel I/O + compute) provides measurable time savings (4-5 min per shoot) without data integrity risks
- RISK_IF_FALSE: Resource contention slows both operations (net negative) → AI errors from incomplete file writes → users perceive slowness
- CONFIDENCE: 75% (theoretical sound, needs production validation)
- IMPACT: MEDIUM (performance optimization, not functional requirement)
- VALIDATE: [owner:implementation-lead, method:benchmark_sequential_vs_parallel+monitor_file_integrity, timing:during_B1, contingency:sequential_workflow_fallback+make_parallel_opt-in]

**A5::REFERENCE_CATALOG_IMPROVES_ACCURACY**
- ASSUMPTION: Vector similarity search against human-corrected reference images improves AI cataloging accuracy by 15-25% vs. zero-shot analysis
- RISK_IF_FALSE: Reference Catalog (Issue #63) provides minimal accuracy benefit → Supabase integration complexity not justified by ROI
- CONFIDENCE: 60% (hypothesis untested, depends on embedding quality + reference corpus size)
- IMPACT: LOW_IMMEDIATE (deferred feature, doesn't affect v2.2.0 baseline or CFEx Phase 1)
- VALIDATE: [owner:principal-engineer, method:A/B_testing_zero-shot_vs_reference-augmented, timing:before_B0_Reference_Catalog_phase, contingency:defer_indefinitely_if_accuracy_improvement<10%]

**A6::CROSS_SCHEMA_FK_INTEGRITY_MAINTAINABLE**
- ASSUMPTION: PostgreSQL cross-schema foreign keys (`media_references.shot_references` → `public.shots`) remain maintainable with proper guardrails (contracts, compatibility tests, migration sequencing)
- RISK_IF_FALSE: Migration sequencing errors create orphaned FK violations → schema evolution in EAV breaks IA reference catalog → deployment coordination brittle
- CONFIDENCE: 80% (PostgreSQL supports cross-schema FK natively, operational discipline required)
- IMPACT: MEDIUM_FUTURE (affects Reference Catalog Issue #63, not immediate CFEx work)
- VALIDATE: [owner:technical-architect, method:contract_specs_EAV_CONTRACT_v1+compatibility_test_suite+migration_validation_scripts, timing:before_B0_Reference_Catalog_phase, contingency:denormalize_reference_data+accept_eventual_consistency]

**A7::WARM_AI_MODEL_REUSE_VIABLE**
- ASSUMPTION: AI provider configurations loaded during file copy can be reused for zero-click pre-analysis without re-initialization overhead
- RISK_IF_FALSE: Each AI call requires full model reload (negates time savings) → API rate limits triggered → session state complexity increases
- CONFIDENCE: 70% (depends on AI provider implementation, untested in production)
- IMPACT: LOW (performance optimization, fallback is sequential analysis after copy completes)
- VALIDATE: [owner:implementation-lead, method:API_response_time_testing_cold_vs_warm+monitor_rate_limits, timing:during_B1, contingency:disable_AI_pre-analysis_if_warm_reuse_unavailable]

**A8::PROXY_GENERATION_EXIF_PRESERVATION** ✅ VALIDATED
- ASSUMPTION: ~~ffmpeg preserves DateTimeOriginal during transcode~~ **PROVEN FALSE**
- VALIDATION: ✅ COMPLETE - Empirically tested 6 proxy variants (ProRes Proxy, H.264 full/half, CRF 18/23)
- FINDING: ALL transcodes lose EXIF:DateTimeOriginal (stored in embedded still image, not MOV metadata)
- SOLUTION: Manual extraction + write as QuickTime:DateTimeOriginal tag
- WORKFLOW:
  ```bash
  # Step 1: Transcode (4K H.264 @ CRF 23 recommended)
  ffmpeg -i raw.MOV -c:v libx264 -preset medium -crf 23 -c:a aac proxy.MOV

  # Step 2: Extract DateTimeOriginal from source
  ORIG_DATE=$(exiftool -s3 -DateTimeOriginal raw.MOV)

  # Step 3: Write to proxy as QuickTime tag
  exiftool -overwrite_original "-QuickTime:DateTimeOriginal=$ORIG_DATE" proxy.MOV

  # Step 4: Validate timestamps match (MANDATORY)
  PROXY_DATE=$(exiftool -s3 -DateTimeOriginal proxy.MOV)
  [[ "$ORIG_DATE" == "$PROXY_DATE" ]] || exit 1
  ```
- DISCOVERY: 4K H.264 @ CRF 23 automatically upgrades to H.264 High 4:2:2 Profile (10-bit 4:2:2 color preserved)
- EMPIRICAL_RESULTS: 4K proxy achieves 131:1 compression (7.8M for 24s video) while preserving professional color
- COMPARATIVE_ANALYSIS: 4K @ CRF 23 smaller than 1080p @ CRF 18 (7.8M vs 9.4M) despite 4x resolution
- TIMELINE_PERFORMANCE: Validated smooth on M-series MacBooks + modern PCs (2017+)
- CONFIDENCE: 100% (empirically validated, production-tested)
- IMPACT: CRITICAL (I1 violation if skipped, automated workflow must enforce)

---

## SCOPE BOUNDARIES

### WHAT THIS APP IS
**IDENTITY::**
- AI-Augmented Cataloging Tool (humans drive, AI suggests)
- Production Pipeline Gateway (Step 6 of 10: field capture → post-production)
- Temporal Integrity Guardian (chronological ordering camera → downstream)
- Cross-Platform Media Assistant (macOS editors + Ubuntu video servers)

**FUNCTIONAL_SCOPE::**
- Media file transfer (CFEx cards → raw storage + proxy generation)
- Proxy generation (4K H.264 @ CRF 23 with DateTimeOriginal preservation)
- AI metadata generation (multi-provider: location, subject, action, shotType)
- Sequential shot numbering (chronological assignment + immutability after COMPLETE)
- Metadata storage (`.ingest-metadata.json` single source → CEP Panel, located in proxy folder)
- Human QC workflow (review, correct, approve AI suggestions before commitment)
- Ecosystem integration (coordinated contracts: CEP Panel downstream + EAV authoritative)

**FEATURE_INVENTORY::**
1. ✅ Core IA (v2.2.0 baseline): Manual/AI metadata + COMPLETE workflow + JSON Schema v2.0
2. 🚧 CFEx Integration (Microphases - immediate):
   - Phase 1a: Transfer + Integrity (2 weeks) - Photos→LucidLink | Raw→Ubuntu | Validation
   - Phase 1b: Proxy Generation (2 weeks) - 4K H.264 @ CRF 23 | DateTimeOriginal preservation
   - Phase 1c: Power Features (2-3 weeks) - AI auto-analyze toggle | Metadata write toggle | Filename rewrite
3. 📋 Reference Catalog (Issue #63 deferred 3-6 months): Vector search learning from EAV-corrected metadata

### WHAT THIS APP IS NOT
**OUT_OF_SCOPE::**
- ❌ Video Editor (playback for preview only, no editing/trimming/effects)
- ❌ DAM System (cataloging feeds production pipeline, not long-term archival)
- ❌ Premiere Pro Replacement (integration via CEP Panel, not standalone NLE)
- ❌ Client Deliverable Tool (production workflow, not client-facing)
- ❌ Batch Rename Utility (metadata in JSON, not filename-based)
- ❌ Cloud Storage Manager (local/network filesystems LucidLink+Ubuntu mounts, not cloud sync)

**BOUNDARIES::**
- Transcoding: 4K H.264 proxy generation @ CRF 23 (not full transcoding suite with multiple format outputs)
- Metadata Formats: JSON Schema v2.0 contract (not XMP-everything or proprietary)
- AI Providers: Multi-provider support for resilience (not building custom AI models)
- Platform Support: macOS + Ubuntu production environments (not iOS, Android, Windows unless justified)
- Upstream Integration: Receives files from CFEx cards (not camera remote control, live capture)
- Downstream Integration: Feeds CEP Panel via JSON contract (not direct Premiere Pro API)

**FUTURE_CONSIDERATIONS_DEFERRED::**
- Windows support (if client workflows require)
- Custom AI model training (if multi-provider insufficient)
- Real-time field capture integration (if cam-op PWA workflow changes)
- Advanced search/filtering (if cataloging volume justifies)
- Collaborative QC workflows (if multi-user editing needed)

---

## PROTECTION CLAUSE

**MISALIGNMENT_PROTOCOL::**
IF agent detects work contradicting this North Star (D2-B5):
1. **STOP** current work immediately
2. **CITE** specific North Star requirement violated (I1-I7)
3. **ESCALATE** to requirements-steward for resolution

**RESOLUTION_OPTIONS::**
- **CONFORM** (typical): Modify work to align with North Star
- **AMEND** (rare): User formally amends North Star via requirements-steward (requires re-approval)
- **ABANDON** (blocked): Incompatible path abandoned, alternative approach required

**AUTHORITY_CHAIN::**
North Star (this document) > Feature designs (D2/D3) > Implementation code (B0-B5)
Immutables override all downstream decisions
Changes to immutables require re-execution of approval process

**ESCALATION_FORMAT::**
`NORTH_STAR_VIOLATION: Current work [description] violates [I#] because [evidence] → requirements-steward`

---

## APPROVAL STATUS

**IMMUTABILITY_OATH_PASSED::**
- Q1: "Commit as IMMUTABLE for entire project?" → YES (all 7)
- Q2: "Deliver faster/cheaper by changing this?" → NO (all 7)
- Q3: "Still true in 3 years?" → YES (all 7)

**APPROVAL:** 🟡 Pending User Approval

**NEXT_STEPS_AFTER_APPROVAL::**
1. North Star gains binding authority (all agents reference this document)
2. Requirements Steward validates completeness at D1_04 gate
3. Critical Engineer validates against production codebase reality
4. CFEx Phase 1 design (D2) inherits these immutables
5. Reference Catalog design (D2 - deferred) inherits these immutables

---

**DOCUMENT_VERSION:** 2.0-OCTAVE (Project-Level Consolidation)
**COMPRESSION_RATIO:** 689→248 lines (64% reduction, 2.8:1 ratio)
**FIDELITY:** 100% decision logic + 7 immutables + 7 assumptions + validation plans preserved
**PREVIOUS_VERSION:** 1.0 (Reference Catalog Feature-Specific, superseded 2025-11-18)
**NEXT_REVIEW:** D1_04 validation gate (requirements-steward)
