---
adr_number: 063
title: Reference Image Lookup System
status: APPROVED
decision_date: 2025-11-15
phase: D1
applies_to: Ingest Assistant
schema_version: 1.0
supersedes: null
superseded_by: null
---

# Reference Image Lookup System - North Star

**Project:** Ingest Assistant (Step 6 of 10 in EAV Production Pipeline)
**Feature:** Reference Image Lookup System (#63)
**Phase:** D1 (North Star Definition)
**Last Updated:** 2025-11-15
**Architect:** holistic-orchestrator

---

## Executive Summary

**The Essential Problem:**
AI agents analyzing media files lack learned context from past human corrections. When cataloging `kitchen-hob-cover-CU`, AI doesn't know that humans later corrected it to `kitchen-oven-steam-tray-CU`. Future analysis of similar images repeats the same mistakes because there's no reference memory.

**The System-Agnostic Solution:**
Enable AI agents to search a catalog of human-corrected reference images, find visually similar examples, and learn from authoritative metadata. When analyzing a new oven photo, agents can query "similar images" and discover that past human judgment preferred `oven-steam-tray` over `hob-cover` for this visual pattern.

**The Emergent Value:**
Initial AI cataloging accuracy improves over time through learned references (70% → 85%+ confidence). Humans correct less, AI learns more, system quality compounds. Reference catalog becomes a production asset that accumulates institutional knowledge about visual classification.

---

## Layer 1: Immutables (7±2 Unchangeable Requirements)

These requirements are **technology-proof** - true regardless of implementation technology, AI provider, or database choice.

### I1: VISUAL SIMILARITY SEARCH
**What:** Agents must find visually similar reference images without exact filename matches
**Why:** Same subject appears in different files (`EA001668.JPG` vs `EA002345.JPG`)
**Test:** Agent analyzes oven photo → System returns 5 similar oven reference images
**Immutable:** Visual similarity, not filename similarity

### I2: HUMAN-CORRECTED METADATA AUTHORITY
**What:** Reference catalog stores human-corrected metadata as ground truth, not AI guesses
**Why:** Humans corrected `hob-cover` → `oven-steam-tray` after reviewing actual context
**Test:** Reference catalog entry shows both initial AI analysis AND final human correction
**Immutable:** Human judgment is authoritative source for reference metadata

### I3: CROSS-PROJECT INTEGRATION
**What:** Reference catalog integrates with EAV production system's authoritative shot database
**Why:** Shoot planning in EAV creates authoritative shot list (kitchen-oven-steam-tray-CU exists in shoots table)
**Test:** Reference lookup can query EAV shoots table for dropdown of available shots
**Immutable:** Single source of truth for shot metadata (public.shots in EAV Supabase)

### I4: AGENT CONTEXT ENHANCEMENT
**What:** Reference results provide context to AI agents, not replacement decisions
**Why:** Agent sees "reference suggests oven-steam-tray" but still analyzes current image
**Test:** Agent receives reference context → Makes informed suggestion → Human validates
**Immutable:** References augment agent intelligence, don't override analysis

### I5: INCREMENTAL LEARNING
**What:** Reference catalog grows as humans correct more images over time
**Why:** Zero references at start → 100 references after first project → 1000 after ten projects
**Test:** System works with 0 references (no suggestions) and 10,000 references (rich context)
**Immutable:** Value compounds with usage (production asset accumulation)

### I6: PRODUCTION-INDEPENDENT OPERATION
**What:** IA can catalog images without requiring EAV system to be running
**Why:** IA is standalone desktop app, EAV is web-based production system
**Test:** IA analyzes images with reference lookup even when EAV servers are offline
**Immutable:** Loose coupling between systems (IA ⇄ Supabase ⇄ EAV)

### I7: DOMAIN-ISOLATED STORAGE
**What:** Reference catalog data stored separately from EAV production tables
**Why:** AI/ML training domain ≠ Production tracking domain (evolution independence)
**Test:** Reference catalog schema migrations don't affect EAV production migrations
**Immutable:** Schema separation preserves system boundaries

---

## Layer 2: System Flows (How Immutables Combine)

### Flow 1: Reference Catalog Population (Human Correction Loop)

```
1. IA Initial Cataloging:
   - AI analyzes: kitchen-hob-cover-CU (70% confidence)
   - Writes XMP: location=kitchen, subject=hob-cover, shotType=CU
   - No reference match (catalog empty)

2. CEP Panel Import:
   - Reads XMP from file
   - Imports to Premiere Pro with metadata

3. EAV Production:
   - Human reviews: "That's the oven steam tray, not hob cover"
   - Scripts app: Corrects to kitchen-oven-steam-tray-CU
   - Shoots table: Stores authoritative metadata

4. Reference Catalog Entry Created:
   ↓ Trigger: Human correction detected (hob-cover → oven-steam-tray)
   ├─ File: EA001668.JPG
   ├─ Original AI: location=kitchen, subject=hob-cover, shotType=CU
   ├─ Corrected: location=kitchen, subject=oven-steam-tray, shotType=CU
   ├─ Shot FK: Links to public.shots.id (authoritative source)
   ├─ Embedding: Generate vector(512) from image using OpenAI CLIP
   └─ Thumbnail: Store low-res preview for visual confirmation

5. Reference Available:
   - Next time AI sees similar oven image
   - Vector search finds EA001668.JPG reference
   - Agent context: "Reference suggests oven-steam-tray (human-corrected)"
```

### Flow 2: Enhanced AI Analysis (Reference-Augmented Cataloging)

```
1. Agent Analyzes New Image:
   - Input: kitchen-appliance-unknown.jpg
   - AI initial: "Looks like some kitchen equipment, 60% confidence"

2. Vector Similarity Search:
   - Generate embedding for current image
   - Query: media_references.image_embeddings (cosine similarity)
   - Results: [EA001668.JPG (0.92 similarity), EA002134.JPG (0.88), ...]

3. Reference Context Provided:
   Agent receives:
   {
     "analysis": "kitchen equipment, 60% confidence",
     "references": [
       {
         "file": "EA001668.JPG",
         "similarity": 0.92,
         "corrected_subject": "oven-steam-tray",
         "corrected_location": "kitchen",
         "shot_type": "CU",
         "thumbnail_url": "https://...",
         "correction_reason": "Human QC: oven steam tray, not hob cover"
       }
     ],
     "shoot_shots": [
       { "shot": "kitchen-oven-steam-tray-CU", "status": "planned" },
       { "shot": "kitchen-hob-touch-controls-CU", "status": "planned" }
     ]
   }

4. Agent Enhanced Analysis:
   - Original: "kitchen equipment, 60%"
   - Reference context: "EA001668 looks very similar (92%), human called it oven-steam-tray"
   - Shoot context: "kitchen-oven-steam-tray-CU is in planned shots"
   - Enhanced suggestion: "kitchen-oven-steam-tray-CU, 85% confidence"

5. Human Review:
   - Sees: Agent suggestion + Reference thumbnail + Confidence
   - Validates: "Correct, that's the oven steam tray"
   - OR Corrects: "Actually that's the hob touch controls" (creates new reference)
```

### Flow 3: Cross-Project Coherence (IA ⇄ EAV Integration)

```
Ingest Assistant (Standalone Desktop App):
├─ Analyzes media files locally
├─ Queries Supabase: media_references schema (vector search)
├─ Queries Supabase: public.shots (dropdown of planned shots)
├─ Writes XMP: Metadata embedded in files
└─ Independent: Works offline with cached references

CEP Panel (Premiere Pro Extension):
├─ Reads XMP: Ingests metadata from files
└─ Imports: Sequences to Premiere Pro

EAV Production System (Web Apps):
├─ Scripts: Plans shots (writes to public.shots)
├─ Cam-op: Field capture references planned shots
├─ Human QC: Corrects metadata (triggers reference catalog update)
└─ Library: Stores approved content with corrected metadata

Supabase (Shared Database):
├─ public schema: EAV production tables (shots, shoots, projects)
├─ media_references schema: IA reference catalog (isolated domain)
└─ Cross-schema FK: reference_images.shot_id → public.shots.id
```

---

## Layer 3: Boundaries & Constraints

### What We Will NOT Do

**NOT Building:**
1. **NOT a replacement for AI analysis** - References augment, don't override agent thinking
2. **NOT synchronous coupling with EAV** - IA must work standalone, EAV integration is enhancement
3. **NOT a general-purpose image search** - Specific to production media cataloging use case
4. **NOT automatic catalog population** - Human correction is intentional trigger, not batch import
5. **NOT replacing EAV shoots table** - public.shots remains single source of truth for shot metadata

### Technical Constraints (Technology-Specific, But Important)

**Shared Supabase Project:**
- Project: zbxvjyrbkycbfhwmmnmy (EAV Monorepo)
- Schema: media_references (NEW - isolated from public)
- Local: http://127.0.0.1:54323/ (Docker - dev/test)
- Remote: https://zbxvjyrbkycbfhwmmnmy.supabase.co (production)

**Vector Embedding:**
- Model: OpenAI CLIP (or similar) - 512-dimensional vectors
- Storage: pgvector extension in PostgreSQL
- Search: Cosine similarity (< 100ms for 10k references)

**RLS (Row-Level Security):**
- Reference read: Public (anyone can search references)
- Reference write: Authenticated (admin/employee only can add references)
- Production access: Existing EAV RLS policies (project-based)

**Environment Detection:**
```javascript
// Proven pattern from eav-monorepo
const supabaseUrl =
  process.env.SUPABASE_PREVIEW_URL ||  // CI preview
  'http://127.0.0.1:54323' ||          // Local dev
  process.env.VITE_SUPABASE_URL;       // Production
```

---

## Layer 4: Success Criteria

### Milestone 1: Basic Reference Lookup (MVP)

**Definition of Done:**
- [ ] Supabase schema created: media_references (3 tables: reference_images, image_embeddings, shot_references)
- [ ] IA Settings Modal: Supabase configuration (local/remote toggle, credentials)
- [ ] Manual reference creation: Admin can add reference with corrected metadata
- [ ] Vector search working: Query image → Returns top 5 similar references
- [ ] Agent context: AI receives reference results in analysis context
- [ ] Tests: Unit + integration tests for reference lookup service (TDD discipline)

**Evidence:**
- Migration file: `media_references` schema deployed to local + remote
- Settings UI: Screenshot showing Supabase configuration
- Test coverage: 90%+ for referenceLookup service
- Demo: Analyze oven photo → Shows EA001668.JPG reference (0.92 similarity)

### Milestone 2: EAV Integration (Cross-Project Coherence)

**Definition of Done:**
- [ ] Cross-schema FK: reference_images.shot_id → public.shots.id
- [ ] Dropdown integration: Fetch planned shots from public.shots
- [ ] Agent context enhanced: References + Planned shots combined
- [ ] Offline resilience: Cached references when Supabase unavailable
- [ ] Documentation: EAV integration documented in CLAUDE.md

**Evidence:**
- SQL query: SELECT across schemas works (reference + shot metadata)
- Dropdown populated: Shows all shots from public.shots table
- Offline test: IA works with cached references when network down
- Architecture diagram: Shows IA ⇄ Supabase ⇄ EAV integration

### Milestone 3: Production Learning Loop (Compounding Value)

**Definition of Done:**
- [ ] Correction trigger: Human QC in EAV creates reference catalog entry
- [ ] Incremental growth: Catalog grows from 0 → 100 → 1000 references over time
- [ ] Accuracy improvement: AI confidence increases from 70% → 85%+ with references
- [ ] Performance maintained: <100ms vector search at 10k references
- [ ] Metrics tracked: Reference usage, accuracy improvement, correction rate

**Evidence:**
- Metric dashboard: Shows accuracy improvement over time
- Performance test: 10k reference catalog search < 100ms
- Correction workflow: EAV QC → Reference entry → IA enhanced analysis
- Value proof: Side-by-side comparison (no references vs with references)

---

## Constitutional Compliance

### Workflow Phase Requirements

**D1 (This Document):** ✅ North Star defined
**D2 (Next):** Design approach (vector embedding strategy, schema design)
**D3 (Next):** Blueprint (API design, integration architecture)
**B0 (Next):** Validation (critical-design-validator GO/NO-GO)
**B1-B4:** Implementation with TDD discipline

### Quality Gates (Will Apply During Implementation)

```bash
✅ TDD: Test BEFORE code (RED → GREEN → REFACTOR)
✅ MIP: Essential complexity only (no accumulative bloat)
✅ Quality Gates: lint + typecheck + test (all must pass)
✅ TRACED: test-methodology-guardian + code-review-specialist + critical-engineer
✅ Evidence: Artifacts for all claims (no validation theater)
```

### Mandatory Skills (Will Load During Build)

```bash
BEFORE_IMPLEMENTATION: Skill(command:"build-execution")
WHEN_TESTING: Skill(command:"supabase-test-harness")
WHEN_MIGRATING: Skill(command:"supabase-operations")
```

---

## Architectural Decisions Deferred to D2/D3

**Questions to Answer in Design Phase:**
1. Which vector embedding model? (OpenAI CLIP vs alternatives)
2. Embedding generation: Client-side (Electron) or server-side (Supabase Edge Function)?
3. Reference creation trigger: Manual admin action vs automated EAV webhook?
4. Cache strategy: How long to cache references locally?
5. Thumbnail generation: Where and when?
6. Migration strategy: How to deploy media_references schema alongside EAV migrations?

**These are implementation details, NOT immutables** - Technology choices that serve the immutable requirements above.

---

## Appendix: Related Documentation

### Ingest Assistant (This Project)
- **Roadmap:** `.coord/docs/DEPENDENCY-ROADMAP.md` (Issue #63 analysis)
- **Context:** `.coord/PROJECT-CONTEXT.md` (current state)
- **Tech Stack:** `CLAUDE.md` (EAV ecosystem positioning)

### EAV Ecosystem (Related Project)
- **Production Pipeline:** `/Volumes/HestAI-Projects/eav-monorepo/.coord/workflow-docs/002-EAV-PRODUCTION-PIPELINE.md`
- **Project Context:** `/Volumes/HestAI-Projects/eav-monorepo/.coord/PROJECT-CONTEXT.md`
- **Supabase Config:** `/Volumes/HestAI-Projects/eav-monorepo/.env`

### Constitutional Foundation
- **North Star Principles:** Immutables are technology-proof, flows demonstrate integration, boundaries prevent scope creep
- **Validation:** critical-design-validator will validate at B0 gate
- **Phase Sequence:** D1 → D2 (Design) → D3 (Blueprint) → B0 (Validation) → B1 (Build Plan)

---

**Status:** ✅ APPROVED (D1 Complete)
**Next Phase:** D2 (Design - Vector embedding strategy, schema design, integration architecture)
**Agent:** holistic-orchestrator
**Date:** 2025-11-15
