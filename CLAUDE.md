# Ingest Assistant - Project Guide for Claude Code

## Project Identity

**Name:** Ingest Assistant
**Purpose:** AI-powered media file ingestion and metadata assistant
**Type:** Electron desktop application
**Platform:** Cross-platform (macOS darwin + Ubuntu linux)
**Phase:** B4 (Production Ready + Security Hardened)

## EAV Ecosystem Integration

**Position:** Step 6 of 10 in complete production pipeline
**Ecosystem:** Part of EAV Operations Suite (10-app video production system)
**Related Project:** `/Volumes/HestAI-Projects/eav-monorepo/` (9 production apps)

### Production Workflow Position

```
COMPLETE PIPELINE (10 Steps):

1-5: Pre-Production (EAV Monorepo)
  ├─ scripts-web: Script planning
  ├─ scenes-web: Shot breakdown
  ├─ cam-op-pwa: Field capture
  └─ data-entry-web: Client specs

→ 6: INGEST ASSISTANT (THIS APP) ← YOU ARE HERE
     Role: AI pre-tagging gateway
     Input: Raw media files (photos/videos)
     Output: XMP-embedded metadata
     Metadata: location, subject, action, shotType
     Enhancement: Reference lookup (#63 - planned)

7: CEP Panel (Adobe Premiere Pro extension)
  └─ Reads XMP → Imports to Premiere Pro

8-10: Post-Production (EAV Monorepo)
  ├─ copy-editor: TEXT library management
  ├─ library-manager: Catalog approved content
  ├─ edit-web: Edit guidance
  ├─ vo-web: Voice-over generation
  └─ translations-web: Subtitle translation
```

### Coherence Loop (Reference Catalog Integration)

```
1. IA Catalogs (Initial):
   - AI analyzes: kitchen-hob-cover-CU
   - XMP writes: location=kitchen, subject=hob-cover, shotType=CU

2. CEP Panel Imports:
   - Reads XMP from files
   - Imports to Premiere Pro with metadata

3. EAV Production (Shoots Table):
   - Scripts app plans: kitchen-oven-steam-tray-CU
   - Shoots table stores planned shots
   - Cam-op app references during field capture

4. QC & Correction (Human Review):
   - Original: kitchen-hob-cover-CU (IA initial)
   - Corrected: kitchen-oven-steam-tray-CU (human review)
   - Thumbnail generated and stored

5. Reference Catalog (Proposed #63):
   - Stores corrected: EA001668.JPG → kitchen-oven-steam-tray-CU
   - Vector embedding: OpenAI CLIP embedding(512)
   - Links to public.shots: Authoritative metadata source

6. Future IA (Enhanced):
   - AI analyzes new photo
   - Vector search → finds EA001668.JPG reference
   - Agent context: "Looks like oven + sees kitchen-oven-steam-tray-CU"
   - Dropdown shows: All shots from shoots table
   - Result: Better initial cataloging from learned references
```

### Shared Supabase Architecture

**Project:** EAV Monorepo Supabase (zbxvjyrbkycbfhwmmnmy)
**Schema Separation:** Domain isolation through PostgreSQL schemas

```
public schema (EAV Production):
├─ shots (shoot planning: location_start_point, subject, action, shot_type)
├─ shoots (production management)
├─ scripts (content creation)
├─ projects (client work)
└─ RLS: Project-based access control (admin/employee/client roles)

media_references schema (IA Reference Catalog):
├─ reference_images (corrected metadata catalog)
├─ image_embeddings (vector similarity search via pgvector)
├─ shot_references (FK links to public.shots)
└─ RLS: Open read access, authenticated write (admin/employee only)

Cross-Schema Integration (PostgreSQL Native):
SELECT r.*, s.*
FROM media_references.reference_images r
JOIN public.shots s ON r.shot_id = s.id
WHERE r.corrected_subject = 'oven-steam-tray';
```

**Why Separate Schemas:**
- Domain isolation: AI/ML training ≠ Production tracking
- Evolution independence: Reference catalog changes don't impact production
- Access pattern coherence: Vector search ≠ CRUD operations
- Blast radius minimization: Migrations isolated to domain boundaries

**Related Documentation:**
- EAV Context: `/Volumes/HestAI-Projects/eav-monorepo/.coord/PROJECT-CONTEXT.md`
- Production Pipeline: `/Volumes/HestAI-Projects/eav-monorepo/.coord/workflow-docs/002-EAV-PRODUCTION-PIPELINE.md`

## Production Workflow

**Overview:** Ingest Assistant handles Steps 1-2 (CFex file transfer + AI cataloging). Steps 3-5 (Premiere Pro import, batch processing, QC) handled by CEP Panel.

### Step 1: CFex File Transfer ⚠️ NEW FEATURE (Future Implementation)

**Purpose:** Extract media files from CFex card and embed Tape Name metadata

**Current State:** Uses external app (`/Applications/%-SystemApps/CFEx File Transfer.app`)
**Future State:** Built into Ingest Assistant for integrated workflow

**Process:**
1. **Select Destination Folders:**
   - Images: Navigate to project image folder (e.g., `/LucidLink/EAV014/images/shoot1-20251124/`)
   - Raw Video: Navigate to raw video folder (e.g., `/Ubuntu/EAV014/videos-raw/shoot1-20251124/`)

2. **Press "Process" Button:**
   - Copies all files from CFex card to selected folders
   - Runs integrity checks (verify file count, sizes match, no corruption)
   - Writes Tape Name metadata to each file: `-XMP-xmpDM:TapeName={original-filename}`
     - Example: `EA001621.MOV` → TapeName=EA001621
     - Example: `EA001622.JPG` → TapeName=EA001622

3. **Validation:**
   - Confirms all files transferred successfully
   - Reports any errors (missing files, checksum failures)
   - Green checkmark on completion

**Why Tape Name Matters:**
Premiere Pro Tape Name field is **immutable** after import. This becomes the permanent ID for metadata lookup in CEP Panel, even if PP Clip Name changes.

**Status:** Not implemented yet - uses external transfer app currently

---

### Step 2: AI Cataloging (Current Production Feature)

**Purpose:** Analyze media files with AI and generate JSON sidecar metadata

**When:** After files transferred to folders (can be immediate or delayed)

**Process:**
1. **Open Folder:** Navigate to folder containing transferred files (raw OR proxy)
   - **Images (macOS):** `/LucidLink/EAV014/images/shoot1-20251124/`
   - **Raw Video (Ubuntu):** `/Ubuntu/EAV014/videos-raw/shoot1-20251124/`
   - **Proxies (macOS):** `/LucidLink/EAV014/videos-proxy/shoot1-20251124/` (after proxy generation)
   - **Note:** App runs on both macOS and Ubuntu - folder paths adapt to platform

2. **Batch AI Processing:**
   - Select all files (or use "Reprocess First 100 Files" button)
   - Click "AI Assist" → Batch processing begins
   - AI analyzes each file and suggests: location, subject, action, shotType
   - Metadata auto-populated if confidence > 0.7

3. **Sequential Shot Numbers:**
   - Files sorted **chronologically by EXIF DateTimeOriginal** (camera capture time)
   - Shot numbers assigned sequentially: #1, #2, #3... #N
   - Shot numbers **immutable** after folder marked COMPLETE

4. **JSON Sidecar Creation:**
   - IA writes `.ingest-metadata.json` to same folder as media files
   - Format: Schema 2.0 (see CEP Panel North Star for full spec)
   - Contains all metadata: location, subject, action, shotType, shotNumber, keywords
   - Lock mechanism: `lockedFields: []` (unlocked for QC edits)

5. **Mark Folder COMPLETE:**
   - Click "COMPLETE" button in Batch Operations panel
   - **Effect:**
     - All metadata fields become read-only
     - Save and AI Assist buttons disabled
     - Prevents chronological re-sorting (shot numbers frozen)
     - JSON `_completed: true` flag set
   - **Reopen:** Click "REOPEN" if corrections needed (unlocks folder)

**Output Files:**
- `.ingest-metadata.json` (in same folder as media files) - **Single source of truth**
  - Contains all metadata: location, subject, action, shotType, shotNumber, keywords
  - Schema 2.0 format
  - `_completed: true/false` flag controls folder lock status
  - **Files are NOT modified** - JSON is the authoritative metadata store

**⚠️ Important:**
- Do NOT re-catalog a folder after marking COMPLETE - shot numbers will change if files re-sorted chronologically
- Metadata corrections are made in JSON, not in file metadata
- Files retain only TapeName metadata (immutable anchor for CEP Panel matching)

---

### Steps 3-5: Premiere Pro & QC Workflow (CEP Panel)

**Brief Overview (IA perspective):**

**Step 3: Import to Premiere Pro**
- Import raw footage + proxies to Premiere Pro
- PP Tape Name = original filename (EA001621)
- Proxy attachment (raw linked to proxy)

**Step 4: Batch Clip Name Update (CEP Panel)**
- CEP Panel reads `.ingest-metadata.json`
- Updates PP Clip Name to shotName format: `{location}-{subject}-{action}-{shotType}-#{shotNumber}`
- Example: `kitchen-oven-cleaning-ESTAB-#25`

**Step 5: QC Review (CEP Panel)**
- QC person reviews AI-generated metadata
- Corrects any errors (wrong location, subject, etc.)
- CEP Panel updates `.ingest-metadata.json` with corrections
- Writes back to JSON (not XMP - JSON is source of truth)

**For detailed CEP Panel workflow, see:** `/Volumes/HestAI-Projects/eav-cep-assist/CLAUDE.md`

---

### Future Enhancement: Supabase Shot List Reference (3-6 months)

**Current State:** AI analyzes images in isolation (no context from shoot planning)

**Future State:** AI references Supabase `public.shots` table during analysis
- Shoot planning creates expected shot list (kitchen-oven-cleaning-ESTAB)
- IA pulls shot list via Supabase during batch processing
- AI matches image content to expected shots
- Improves accuracy (AI knows "this should be oven cleaning ESTAB" vs. guessing)

**Implementation:** Issue #63 Reference Catalog + Supabase shot list integration

**Status:** Deferred 3-6 months (see GitHub Issue for Supabase guardrails)

## Tech Stack

- **Runtime:** Electron (main + renderer processes)
- **Frontend:** React 18, TypeScript
- **Build:** Vite
- **Testing:** Vitest (499 tests across 29 test files)
- **Process:** Node.js
- **AI Integration:** OpenRouter, Anthropic Claude, OpenAI APIs
- **Metadata:** exiftool for XMP/EXIF writing
- **Database:** Supabase (shared with EAV Monorepo - zbxvjyrbkycbfhwmmnmy)
  - Schema: `media_references` (reference image catalog, isolated from production)
  - Local: http://127.0.0.1:54323/ (Docker)
  - Remote: https://zbxvjyrbkycbfhwmmnmy.supabase.co

## ⚠️ MANDATORY SKILLS - NO EXCEPTIONS ⚠️

### BEFORE ANY BUILD/IMPLEMENTATION WORK

```bash
REQUIRED: Skill(command:"build-execution")
```

**Why:** Constitutional requirement enforcing:
- TDD discipline (RED→GREEN→REFACTOR)
- Minimal Intervention Principle (MIP)
- System awareness (ripple analysis)
- Verification protocols (evidence-based)

**Violation Consequences:**
- Technical debt accumulation
- Validation theater risk
- System coherence degradation
- Constitutional breach

### ERROR RESOLUTION WORK

```bash
REQUIRED: Skill(command:"error-triage")
```

**Why:** Systematic error resolution preventing:
- Cascade failures
- Type safety theater
- Premature fixes
- Root cause masking

### WHEN WORKING WITH TESTS

```bash
RECOMMENDED: Skill(command:"test-infrastructure")
RECOMMENDED: Skill(command:"supabase-test-harness") # If Supabase involved
```

### WHEN DEALING WITH CI/CD

```bash
RECOMMENDED: Skill(command:"ci-error-resolution")
RECOMMENDED: Skill(command:"test-ci-pipeline")
```

## Quality Gates (MANDATORY - All Must Pass)

```bash
✓ Lint:      npm run lint      # 0 errors, 0 warnings
✓ Typecheck: npm run typecheck # 0 errors
✓ Tests:     npm test          # All passing (currently 504/504)
```

**⚠️ CRITICAL: RUN LOCALLY BEFORE EVERY COMMIT ⚠️**

```bash
# REQUIRED before git add:
npm run lint && npm run typecheck && npm test
```

**Why This Matters:**
- CI failures waste time and block deployments
- Type errors caught locally = faster development
- Lint errors indicate code quality issues
- Test failures reveal regressions immediately

**NO COMMIT WITHOUT ALL THREE GREEN**
**NO MERGE WITHOUT CI GREEN**

## Architecture Overview

### Electron Architecture

```
Main Process (electron/main.ts)
├─ IPC Handlers (file operations, AI processing, batch queue)
├─ Services
│  ├─ aiService.ts          # Multi-provider AI analysis
│  ├─ metadataWriter.ts     # XMP/EXIF writing via exiftool
│  ├─ securityValidator.ts  # Path traversal prevention
│  ├─ batchQueueManager.ts  # Batch processing with rate limiting
│  ├─ videoTranscoder.ts    # H.264 hardware-accelerated transcoding
│  └─ referenceLookup.ts    # Supabase reference catalog (planned #63)
└─ Security: execFile() NOT exec(), Zod validation, path normalization

Renderer Process (src/App.tsx)
├─ React UI with virtual scrolling (1000+ files at 60fps)
├─ Keyboard shortcuts (Cmd+K palette, Cmd+S save, Cmd+I AI assist)
├─ Batch operations panel
└─ Settings modal (AI provider configuration)
```

### Critical Security Implementations

1. **Command Injection Prevention (Security Report 007)**
   - Uses `spawn({shell: false})` instead of `exec()`
   - Shell metacharacter validation
   - Flag injection protection

2. **Media Server Authentication (Security Report 007)**
   - Capability token (32-byte crypto.randomBytes)
   - Token validation before path validation
   - Cross-origin localhost probing prevented

3. **Path Traversal Protection**
   - Platform-agnostic symlink resolution (macOS + Ubuntu)
   - Allowed path enforcement
   - Batch IPC validation with Zod schemas

## Key Features

### Manual Mode
- User-driven metadata creation
- Structured fields: location, subject, action (videos only), shotType
- Naming patterns: `{location}-{subject}-{shotType}` OR `{location}-{subject}-{action}-{shotType}`

### AI Assistance
- Multi-provider support (OpenRouter, Anthropic, OpenAI)
- Sequential frame analysis for videos (rate limit compliant)
- Confidence thresholds (auto-update if > 0.7)
- Batch processing with rate limiting

### Video Support
- Codec detection (H.264, HEVC)
- QuickTime Player compatibility checking
- Hardware-accelerated H.264 transcoding
- Sequential frame analysis (prevents API rate limit failures)

### Metadata Storage Strategy (Issue #54)

**IA Metadata Architecture:**
- **Single Source of Truth:** `.ingest-metadata.json` file (Schema 2.0)
  - Stores all metadata: location, subject, action, shotType, shotNumber, keywords, processedByAI, audit trail
  - Can be edited/corrected without touching media files
  - Portable and version-controllable
  - CEP Panel reads JSON, not file metadata

**File Metadata (Minimal):**
- **XMP-xmpDM:TapeName** = Original filename (immutable anchor)
  - Written during Step 1 (CFex transfer)
  - Used by CEP Panel to match JSON entries to PP clips
  - Never modified after initial transfer

**Why This Approach:**
- JSON is easily correctable (no file I/O required)
- TapeName is immutable (safe anchor for cross-references)
- Avoids duplicating metadata in both files and JSON
- Simplifies QC workflow (edit JSON only)
- Prevents metadata divergence (file vs JSON conflicts)

## Recent Critical Fixes

### Sequential Video Frame Analysis (2f91dbc)
- **Problem:** Parallel frame analysis (5 simultaneous API calls) bypassed rate limiter
- **Fix:** Sequential frame processing respects rate limits
- **Impact:** 100% reliable batch video processing (+5s per video acceptable)

### JSON-Only Metadata Storage
- **Architecture Decision:** All metadata except TapeName stored in `.ingest-metadata.json` only
- **Rationale:** Metadata corrections should not require file I/O; JSON is single source of truth
- **Impact:** Simplified QC workflow, prevents file/JSON metadata divergence, easier to fix incorrect AI results
- **Implication:** CEP Panel reads JSON, not embedded XMP LogComment

### Reprocess Button (1b6a3c1)
- **Problem:** "Reprocess First 100 Files" skipped already-processed files
- **Fix:** Removed processedByAI check from batch processor
- **Impact:** Enables fresh reprocessing after prompt updates

## TDD Discipline (Constitutional Requirement)

### MANDATORY Workflow

```bash
1. RED:   Write failing test → Verify fails for RIGHT reason
2. GREEN: Minimal implementation → Verify passes
3. REFACTOR: Improve while green (optional)
4. COMMIT: "test: failing X" → "feat: implement X"
```

### Git Commit Pattern

**REQUIRED:**
```bash
git commit -m "test: add failing test for X (RED)"
git commit -m "feat: implement X (GREEN)"
git commit -m "refactor: simplify X (optional)"
```

**FORBIDDEN:**
```bash
git commit -m "feat: implement X and add tests" # ❌ tests after code
git commit -m "fix: add missing test"            # ❌ retroactive test
```

### Test Organization

```
electron/__tests__/
├─ batch/                 # Batch processing tests
├─ security/             # Security hardening tests
├─ pagination/           # File list pagination tests
└─ (service tests inline with services)

src/
├─ components/*.test.tsx # Component tests
├─ hooks/*.test.tsx      # Hook tests
└─ App.test.tsx          # Main app integration tests
```

## Common Development Tasks

### Adding New Feature

```bash
1. Load build-execution skill FIRST
2. Write failing test (RED)
3. Run test, verify failure reason
4. Implement minimal code (GREEN)
5. Run test, verify passes
6. Refactor if needed (while green)
7. Commit with TEST → FEAT pattern
8. Run all quality gates
9. Update this .claude.md if architectural
```

### Fixing Bug

```bash
1. Load error-triage skill FIRST
2. Write failing test reproducing bug (RED)
3. Verify test fails for right reason
4. Fix bug (GREEN)
5. Verify test passes
6. Run full test suite (no regressions)
7. Commit with TEST → FIX pattern
8. Run all quality gates
```

### Adding Tests Retroactively (DISCOURAGED)

```bash
# If you absolutely must (e.g., legacy code):
1. Frame honestly: "test: add validation for X behavior (retroactive)"
2. Write integration tests (end-to-end behavior)
3. Document why test is retroactive
4. Commit to strict TDD for ALL future work
```

## Project-Specific Conventions

### File Naming
- Kebab-case for media files: `kitchen-oven-cu.jpg`
- Videos with action: `kitchen-oven-cleaning-ws.mov`

### Shot Types (Controlled Vocabulary)
- WS (Wide shot)
- MID (Midshot)
- CU (Close up)
- UNDER (Underneath)
- FP (Focus pull)
- TRACK (Tracking)
- ESTAB (Establishing)

### Metadata Storage
- **JSON Store:** `metadata-store.json` (per folder, gitignored)
- **XMP Metadata:** Embedded in files via exiftool
- **Dual Write:** Both JSON + XMP updated for persistence

## Known Constraints

- **Batch Processing:** Limited to 100 files per batch
- **Rate Limiting:** Configured per AI provider
- **Video Frame Analysis:** 5 frames per video (sequential)
- **Platform:** Cross-platform (macOS darwin + Ubuntu linux)

## Security Considerations

- **NO shell execution** - Use spawn({shell: false})
- **Validate all paths** - Use securityValidator.validateFilePath()
- **Sanitize errors** - Use sanitizeError() before sending to renderer
- **Validate IPC** - Use Zod schemas for all IPC messages
- **Check file size** - Prevent memory exhaustion
- **Token authentication** - For media server access

## Documentation References

### Ingest Assistant (This Project)
- **Coordination:** `.coord/PROJECT-CONTEXT.md` (current state)
- **Checklist:** `.coord/SHARED-CHECKLIST.md` (immediate tasks)
- **Roadmap:** `.coord/PROJECT-ROADMAP.md` (phase progression)
- **Architecture:** `.coord/docs/001-DOC-ARCHITECTURE.md`
- **Batch Processing:** `.coord/docs/007-DOC-BATCH-PROCESSING-IMPLEMENTATION.md`
- **Dependency Roadmap:** `.coord/docs/DEPENDENCY-ROADMAP.md` (enhancement planning)

### EAV Ecosystem (Related Project)
- **EAV Context:** `/Volumes/HestAI-Projects/eav-monorepo/.coord/PROJECT-CONTEXT.md`
- **Production Pipeline:** `/Volumes/HestAI-Projects/eav-monorepo/.coord/workflow-docs/002-EAV-PRODUCTION-PIPELINE.md`
- **Supabase Config:** `/Volumes/HestAI-Projects/eav-monorepo/.env` (shared database credentials)

### Cross-Ecosystem Workflow (IA ↔ EAV Coordination)
- **Status Board:** `/Volumes/HestAI-Projects/eav-monorepo/.coord/ACTIVE-WORK.md` (tracks all IA-related work in EAV)
- **Workflow Guide:** `/Volumes/HestAI-Projects/eav-monorepo/.coord/workflow-docs/CROSS-ECOSYSTEM-WORKFLOW.md` (complete process)
- **Contract Spec:** `/Volumes/HestAI-Projects/eav-monorepo/supabase/contracts/shots-v1.yaml` (EAV_CONTRACT:v1)
- **SLO Observability:** `/Volumes/HestAI-Projects/eav-monorepo/docs/103-DOC-SLO-OBSERVABILITY.md` (performance monitoring)
- **Deletion Workflow:** `/Volumes/HestAI-Projects/eav-monorepo/docs/104-DOC-DELETION-WORKFLOW.md` (admin deletion assistant)

**When IA Changes Affect EAV Schema:**
1. Check ACTIVE-WORK.md for ongoing EAV work (avoid conflicts)
2. Create branch in EAV monorepo: `ia/{task-name}` (branch naming convention)
3. Update ACTIVE-WORK.md with new task (status tracking)
4. Follow deployment sequence: **EAV first, IA second** (prevents orphaned IA migrations)
5. Run validation: `./scripts/check_cross_schema.sh` (verify FK constraints)

**GitHub Labels:**
- EAV PRs: `cross-ecosystem:ia` (tags IA-related work)
- IA PRs: `cross-ecosystem:eav` (tags EAV-related work)

## Quick Reference Commands

```bash
# Quality gates
npm run lint && npm run typecheck && npm test

# Run specific test file
npm test -- electron/__tests__/batch/batchIpcHandlers.test.ts

# Run tests in watch mode (development)
npm run test:watch

# Build application
npm run build

# Start dev mode
npm run dev
```

## Constitutional Reminders

1. **Load build-execution skill BEFORE any implementation**
2. **Write failing test BEFORE any code**
3. **Run all quality gates BEFORE any commit**
4. **Provide evidence ALWAYS (no validation theater)**
5. **Think systemically (local change → system ripple)**
6. **Code minimally (essential > accumulative)**
7. **Verify rigorously (claims require artifacts)**

---

**Last Updated:** 2025-11-16 (Cross-ecosystem workflow established)
**Maintainer:** Shaun Buswell
**Claude Code Version:** Sonnet 4.5
