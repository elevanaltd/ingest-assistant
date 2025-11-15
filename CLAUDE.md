# Ingest Assistant - Project Guide for Claude Code

## Project Identity

**Name:** Ingest Assistant
**Purpose:** AI-powered media file ingestion and metadata assistant for macOS
**Type:** Electron desktop application
**Platform:** macOS (darwin)
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
   - macOS symlink resolution
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

### XMP Metadata Strategy (Issue #54)
- **XMP-xmpDma:shotName** = mainName (maps to PP Shot field)
- **XMP-xmpDma:LogComment** = Structured key=value pairs for CEP panel
  - Format: `location=X, subject=Y, action=Z, shotType=W`
  - Enables CEP Panel parsing of structured components
- **XMP-dc:Description** = Keywords (comma-separated)

## Recent Critical Fixes

### Sequential Video Frame Analysis (2f91dbc)
- **Problem:** Parallel frame analysis (5 simultaneous API calls) bypassed rate limiter
- **Fix:** Sequential frame processing respects rate limits
- **Impact:** 100% reliable batch video processing (+5s per video acceptable)

### LogComment Writing (857ae1a)
- **Problem:** XMP-xmpDma:LogComment not written (missing structured parameter)
- **Fix:** All 3 IPC handlers now pass structured fields to metadataWriter
- **Impact:** CEP Panel can parse structured metadata from embedded XMP

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
- **Platform:** macOS only (uses macOS-specific symlink resolution)

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

**Last Updated:** 2025-11-15 (EAV ecosystem integration documented)
**Maintainer:** Shaun Buswell
**Claude Code Version:** Sonnet 4.5
