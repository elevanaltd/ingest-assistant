# GitHub Issue Draft: Cross-Ecosystem Schema Integration for Reference Catalog

**Repository:** https://github.com/elevanaltd/eav-monorepo/issues
**Labels:** cross-ecosystem, database, schema
**Related IA Issue:** #63 (Reference Image Lookup System)

---

## Schema Change Overview

**Affected Schema(s):**
- [x] `public` (EAV Production)
- [x] `media_references` (Ingest Assistant Reference Catalog)
- [x] Both schemas (cross-schema FK or RLS changes)

**Change Type:**
- [ ] New table creation
- [x] Table modification (columns, constraints)
- [x] FK relationship (cross-schema)
- [x] RLS policy changes
- [ ] Index creation/modification
- [x] Database trigger
- [ ] Other: SECURITY DEFINER view, vector search extension

## Downstream Dependencies

**Projects Affected:**
- [x] EAV Monorepo (this project)
- [x] Ingest Assistant (`/Volumes/HestAI-Projects/ingest-assistant`)

**Dependent Tables/Features:**
- **EAV:** `public.shots` (authoritative catalog of video shots)
- **IA:** `media_references.reference_images` (corrected metadata from human review)
- **IA:** `media_references.image_embeddings` (OpenAI CLIP vectors for similarity search)
- **IA:** `media_references.shot_references` (links reference images to authoritative shots)

**Workflow Impact:**
- IA AI assistant will reference `public.shots` for dropdown suggestions
- Future: CEP Panel imports will benefit from AI-improved initial cataloging
- EAV shot deletion workflow must verify no IA references exist

## Migration Order

**Required Migration Sequence:**
- [x] EAV migration must run FIRST (establishes contract)
- [x] IA migration depends on EAV (references EAV schema)
- [ ] Simultaneous (independent changes)
- [ ] Other sequence: N/A

**Migration Files:**
- **EAV:** `supabase/migrations/20250116090000_shots_contract_v1.sql` (establishes authoritative contract)
- **IA:** `supabase/migrations/20250116100000_media_references_schema.sql` (creates schema + FK)

## RLS Impact Analysis

**Current RLS Policies Affected:**
- **EAV `public.shots`:** Admin/Employee-only policies (no client access)
- **Existing behavior:** Clients cannot view shots table directly

**New/Modified Policies:**
- **IA `media_references.reference_images`:** Open read (anon), authenticated write (admin/employee)
- **IA `media_references.shot_references`:** Same as reference_images
- **NEW: SECURITY DEFINER view** `media_references.reference_images_with_shot` for cross-schema JOIN

**Cross-Schema Access:**
- [x] IA needs to read EAV schema (`public.shots`)
- [ ] EAV needs to read IA schema (`media_references`)
- [x] Requires SECURITY DEFINER view
- [ ] No cross-schema access needed

**Policy Coordination:**
The SECURITY DEFINER view will be owned by `postgres` role with `SET row_security = OFF` for `public.shots`, allowing IA to expose combined data (reference_images + shot metadata) while respecting EAV's project-scoped governance. The view will NOT bypass RLS - it honors EAV policies but elevates privileges for the JOIN operation only.

**Governance Maintained:**
- IA anon users can read reference catalog (public AI learning data)
- IA anon users CANNOT directly query `public.shots` (EAV governance preserved)
- View provides curated access path with audit logging

## Rollback Plan

**Rollback Strategy:**
1. Drop IA FK constraint first (allows independent schema removal)
2. Drop IA `media_references` schema entirely
3. Remove EAV trigger and contract comment
4. Restore from nightly backup if data corruption occurs

**Rollback Commands:**
```sql
-- IA Rollback (run FIRST)
BEGIN;
ALTER TABLE media_references.shot_references DROP CONSTRAINT IF EXISTS fk_shot_id;
DROP SCHEMA IF EXISTS media_references CASCADE;
COMMIT;

-- EAV Rollback (run SECOND)
BEGIN;
DROP TRIGGER IF EXISTS notify_shot_change_trigger ON public.shots;
DROP FUNCTION IF EXISTS notify_shot_change();
COMMENT ON TABLE public.shots IS NULL; -- Remove contract marker
COMMIT;
```

**Data Recovery:**
- [x] No data loss risk (new schema, no existing data migration)
- [ ] Backup required before migration
- [ ] Custom recovery script needed: N/A

## Validation

**Local Supabase Testing:**
```bash
# 1. Start local Supabase
cd /Volumes/HestAI-Projects/eav-monorepo
supabase start

# 2. Apply EAV migrations
supabase db reset  # Fresh start with all migrations
supabase db push   # Or apply new migration only

# 3. Verify EAV contract
psql $(supabase status | grep 'DB URL' | awk '{print $3}') -c "
  SELECT obj_description('public.shots'::regclass);
  SELECT proname FROM pg_proc WHERE proname = 'notify_shot_change';
"

# 4. Apply IA migrations
cd /Volumes/HestAI-Projects/ingest-assistant
supabase db push

# 5. Verify FK constraint
psql $(supabase status | grep 'DB URL' | awk '{print $3}') -c "
  SELECT conname, conrelid::regclass, confrelid::regclass
  FROM pg_constraint
  WHERE conname = 'fk_shot_id';
"

# 6. Run cross-schema integration tests
npm run supabase:test

# 7. Stop Supabase
cd /Volumes/HestAI-Projects/eav-monorepo
supabase stop
```

**Validation Checklist:**
- [ ] Local migration succeeds (EAV → IA order)
- [ ] FK constraints enforced correctly
  - [ ] Can insert reference with valid shot_id
  - [ ] Cannot insert reference with invalid shot_id
  - [ ] Cannot delete shot with existing references (RESTRICT enforced)
- [ ] RLS policies tested via role matrix
  - [ ] Anon can read `media_references.reference_images`
  - [ ] Anon CANNOT read `public.shots` directly
  - [ ] Anon CAN read `media_references.reference_images_with_shot` view
  - [ ] Admin/Employee can write to `media_references` tables
- [ ] Integration tests passing
- [ ] Performance benchmarks meet SLO (p95 <150ms for vector queries)
- [ ] Supabase validation log attached

**Supabase Validation Log:**
<!-- Will be attached after local testing -->

## Approvals Required

**Technical Review:**
- [x] Technical Architect (cross-schema architecture validation) - **GO DECISION 2025-11-15** via Codex CLI
- [ ] Principal Engineer (6-month viability) - **RECOMMENDED** for major schema integration

**Domain Review:**
- [ ] Critical Engineer (tactical "ready now?" validation) - **PENDING**
- [ ] Requirements Steward (North Star alignment check) - **PENDING** (new capability = new North Star validation)

**Approval Decision:**
- [x] GO - Approved for implementation (technical-architect)
- [ ] NO-GO - Requires changes (see comments)
- [ ] CONDITIONAL - Approved with modifications

**Awaiting:**
- Principal Engineer validation (6-month viability assessment)
- Critical Engineer tactical validation before production deployment

## Implementation Checklist

**Documentation:**
- [x] EAV PROJECT-CONTEXT.md updated (schema ownership, deletion workflow) - **DONE 2025-11-15**
- [x] IA PROJECT-CONTEXT.md updated (migration dependencies, FK details) - **DONE 2025-11-15**
- [ ] ADR created if architectural decision (`.coord/docs/ADR-XXX.md`) - **Existing ADR-009 covers design**
- [ ] Migration comments include `EAV_CONTRACT:v1` or dependency notes

**Testing:**
- [ ] Unit tests for new schema (EAV repo) - N/A (contract establishment only)
- [ ] Integration tests for cross-schema FK (IA repo) - **Required before merge**
- [ ] RLS policy matrix tests (both repos) - **Required before merge**
- [ ] Performance benchmarks captured (`.coord/benchmarks/pgvector-YYYYMMDD.md` if vector search) - **Required**

**Deployment:**
- [ ] EAV migration deployed to staging
- [ ] Staging validation passed
- [ ] IA migration deployed to staging (after EAV)
- [ ] Production deployment scheduled
- [ ] Quarterly FK audit scheduled (if new FK) - **Required (Q1 2026)**

## References

**Related Issues:**
- Ingest Assistant #63: Reference Image Lookup System
- EAV #TBD: Schema contract establishment

**Related PRs:**
- EAV PR #TBD: Contract migration
- IA PR #TBD: Reference catalog schema

**Documentation:**
- EAV Context: `/Volumes/HestAI-Projects/eav-monorepo/.coord/PROJECT-CONTEXT.md` (Cross-Ecosystem Integration section)
- IA Context: `/Volumes/HestAI-Projects/ingest-assistant/.coord/PROJECT-CONTEXT.md` (Database & Cross-Ecosystem Integration section)
- Pipeline Doc: `.coord/workflow-docs/002-EAV-PRODUCTION-PIPELINE.md`
- ADR-009: `/Volumes/HestAI-Projects/ingest-assistant/.coord/docs/000002-DOC-ADR-009-REFERENCE-CATALOG-SCHEMA-ARCHITECTURE.md`

**Technical Architect Decision:**
- Consultation: 2025-11-15 via Codex CLI (137.7s analysis)
- Decision: GO with guardrails
- Key Guidance:
  - Schema separation approved (domain isolation preserved)
  - FK with `ON DELETE RESTRICT` (prevents orphaned references)
  - SECURITY DEFINER view pattern (maintains RLS governance)
  - Migration sequencing enforced (EAV first, IA second)
  - pgvector in Supabase approved (SLO: p95 <150ms, CPU <70%, fallback to Pinecone)

---

**Next Steps:**
1. Create EAV migration `20250116090000_shots_contract_v1.sql`
2. Create IA migration `20250116100000_media_references_schema.sql`
3. Run local Supabase validation
4. Submit for principal-engineer and critical-engineer review
5. Merge EAV migration first (after approval)
6. Merge IA migration second (after EAV deployed)
