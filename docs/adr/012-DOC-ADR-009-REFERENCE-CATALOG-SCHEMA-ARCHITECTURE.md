---
adr_number: 009
title: Reference Catalog Schema Architecture
status: ACCEPTED
decision_date: 2025-11-15
implements: 000-INGEST_ASSISTANT-D1-NORTH-STAR.md#I7
deviates_from: null
---

# ADR-009: Reference Catalog Schema Architecture

**Status:** ACCEPTED
**Date:** 2025-11-15
**Deciders:** holistic-orchestrator, Shaun Buswell
**Implements:** North Star I7 (Domain-Isolated Storage)
**Related:** Issue #63 (Reference Image Lookup System)

---

## Context and Problem Statement

Ingest Assistant (IA) needs to build a reference catalog of human-corrected image metadata to improve AI cataloging accuracy over time. This catalog must integrate with the EAV Operations Suite's production database (Supabase project zbxvjyrbkycbfhwmmnmy) while maintaining domain isolation between AI/ML training data and production tracking data.

**Key Questions:**
1. Should we create a separate Supabase project for IA, or use the shared EAV project?
2. If shared project, how do we isolate AI/ML domain from production domain?
3. How do we maintain referential integrity between reference catalog and authoritative shot metadata?
4. What are the RLS (Row-Level Security) implications of cross-domain access?

## Decision Drivers

### Architectural Principles
- **Domain Isolation:** AI/ML training data should not couple with production tracking data
- **Evolution Independence:** Schema changes in one domain shouldn't cascade to other domain
- **Single Source of Truth:** public.shots in EAV remains authoritative for shot metadata
- **Loose Coupling:** IA must operate independently of EAV system availability
- **Blast Radius Minimization:** Migrations isolated to domain boundaries

### Operational Constraints
- **Shared Infrastructure:** EAV monorepo already has Supabase project (zbxvjyrbkycbfhwmmnmy)
- **Local Development:** Docker Supabase at http://127.0.0.1:54323/ (eav-orchestrator)
- **Cross-Project Integration:** IA needs to query EAV's shots table for dropdown
- **RLS Complexity:** Adding another project doubles RLS policy management

### Cost Considerations
- **New Supabase Project:** $25/month minimum + separate management overhead
- **Shared Project with Separate Schema:** $0 additional + unified management
- **Migration Coordination:** Separate projects require synchronized deployments

---

## Considered Options

### Option 1: Dedicated Supabase Project for IA
**Structure:**
```
IA Supabase Project (new):
└─ public schema
   ├─ reference_images
   ├─ image_embeddings
   └─ shot_cache (denormalized copy of EAV shots)

EAV Supabase Project (existing):
└─ public schema
   ├─ shots (authoritative)
   ├─ shoots
   └─ ...
```

**Pros:**
- ✅ Complete isolation between projects
- ✅ Independent deployment cadence
- ✅ Separate billing/monitoring
- ✅ No schema collision risk

**Cons:**
- ❌ Requires denormalized shot_cache (stale data risk)
- ❌ Additional $25/month cost
- ❌ No direct FK to authoritative shots table
- ❌ Synchronized deployment complexity
- ❌ Duplicate RLS policy management

### Option 2: Shared Project, Single Schema (public)
**Structure:**
```
EAV Supabase Project:
└─ public schema
   ├─ shots (EAV production)
   ├─ shoots (EAV production)
   ├─ reference_images (IA catalog)
   ├─ image_embeddings (IA catalog)
   └─ ...
```

**Pros:**
- ✅ Direct FK to shots table (referential integrity)
- ✅ No denormalization needed
- ✅ Single migration coordination
- ✅ $0 additional cost

**Cons:**
- ❌ Domain boundaries unclear (production + AI/ML mixed)
- ❌ Migration blast radius high (changes affect all tables)
- ❌ RLS policies complex (mixed concerns)
- ❌ Difficult to reason about domain ownership

### Option 3: Shared Project, Separate Schemas ✅ CHOSEN
**Structure:**
```
EAV Supabase Project:
├─ public schema (EAV production domain)
│  ├─ shots (authoritative shot metadata)
│  ├─ shoots (production management)
│  ├─ scripts (content creation)
│  └─ ... (other EAV tables)
│
└─ media_references schema (IA AI/ML domain)
   ├─ reference_images (corrected metadata catalog)
   ├─ image_embeddings (vector similarity search)
   └─ shot_references (FK to public.shots)

Cross-Schema FK:
ALTER TABLE media_references.reference_images
ADD CONSTRAINT fk_shot_id
FOREIGN KEY (shot_id) REFERENCES public.shots(id);
```

**Pros:**
- ✅ **Domain Isolation:** Clear schema boundaries (public = production, media_references = AI/ML)
- ✅ **Evolution Independence:** media_references migrations don't affect public schema
- ✅ **Direct Integration:** Cross-schema FK maintains referential integrity
- ✅ **Blast Radius Minimization:** Schema isolation limits migration impact
- ✅ **Single Project Cost:** $0 additional infrastructure cost
- ✅ **Unified Management:** One Supabase project, one local Docker instance
- ✅ **Clear RLS Boundaries:** public (project-based) vs media_references (open read, auth write)

**Cons:**
- ⚠️ Cross-schema queries slightly more verbose (media_references.table vs table)
- ⚠️ Requires PostgreSQL schema understanding (mitigated by documentation)

---

## Decision

**We will use Option 3: Shared Supabase Project with Separate Schemas**

### Rationale

1. **Domain Isolation Without Infrastructure Overhead:**
   - PostgreSQL schemas provide namespace isolation within a single database
   - Clear domain boundaries: `public` (EAV production) vs `media_references` (IA AI/ML)
   - Migration files can target specific schemas, limiting blast radius

2. **Referential Integrity Preserved:**
   - Cross-schema FK from `media_references.reference_images.shot_id` to `public.shots.id`
   - Single source of truth: public.shots remains authoritative
   - No denormalization, no stale data risk

3. **Evolution Independence:**
   - `media_references` schema can evolve AI/ML capabilities independently
   - `public` schema evolves with EAV production requirements independently
   - Schema separation enables parallel evolution without coupling

4. **Cost Efficiency:**
   - $0 additional infrastructure cost
   - Unified local development (single Docker instance)
   - Single set of credentials to manage

5. **Operational Simplicity:**
   - One Supabase project: zbxvjyrbkycbfhwmmnmy
   - One local Docker: http://127.0.0.1:54323/
   - One migration coordination strategy (per schema)

6. **RLS Clarity:**
   ```sql
   -- Public schema: Existing EAV RLS policies (project-based access)
   ALTER TABLE public.shots ENABLE ROW LEVEL SECURITY;
   -- (Existing policies unchanged)

   -- Media references schema: Open read, authenticated write
   ALTER TABLE media_references.reference_images ENABLE ROW LEVEL SECURITY;

   CREATE POLICY "Public read access"
     ON media_references.reference_images
     FOR SELECT
     USING (true); -- Anyone can search references

   CREATE POLICY "Authenticated write access"
     ON media_references.reference_images
     FOR INSERT
     WITH CHECK (auth.role() IN ('admin', 'employee')); -- Only staff can add references
   ```

---

## Consequences

### Positive

**For Development:**
- ✅ Local development simplified: `supabase start` → both schemas available
- ✅ Migration testing: Test media_references migrations without affecting public
- ✅ Cross-schema queries in SQL: Easy to join reference catalog with authoritative shots

**For Production:**
- ✅ Single deployment target: Deploy both schemas to zbxvjyrbkycbfhwmmnmy
- ✅ Unified monitoring: One Supabase dashboard for all metrics
- ✅ Simplified credentials: One publishable key, one service key

**For Architecture:**
- ✅ Clear domain boundaries: Schema names declare domain ownership
- ✅ Independent evolution: Change media_references without touching public
- ✅ FK enforcement: Database guarantees reference integrity

### Negative

**Tradeoffs Accepted:**
- ⚠️ Slightly more verbose SQL: `media_references.reference_images` vs `reference_images`
- ⚠️ Schema awareness required: Developers must understand schema namespacing
- ⚠️ Migration coordination: Both schemas in same project require deployment coordination

**Mitigations:**
- 📚 Documentation: CLAUDE.md documents schema separation clearly
- 📚 Examples: North Star includes cross-schema query examples
- 📚 Migration naming: Prefix with schema (e.g., `20251115_media_references_initial_schema.sql`)

### Risks

**Risk 1: Migration Conflicts**
- **Description:** Public and media_references migrations could conflict if deployed out of order
- **Likelihood:** Low (separate schemas, no shared tables)
- **Mitigation:** Migration naming convention includes schema prefix
- **Fallback:** Schema isolation limits blast radius to domain boundary

**Risk 2: RLS Complexity**
- **Description:** Two sets of RLS policies (public + media_references) could cause confusion
- **Likelihood:** Medium (different access patterns per schema)
- **Mitigation:**
  - Public schema: Existing EAV RLS policies unchanged
  - Media references schema: Simple open-read + authenticated-write policies
  - Documentation: RLS strategy documented in North Star
- **Fallback:** RLS can be disabled per schema without affecting other schema

**Risk 3: Cross-Schema Query Performance**
- **Description:** Joins across schemas could be slower than within-schema joins
- **Likelihood:** Low (PostgreSQL optimizes cross-schema queries well)
- **Mitigation:**
  - Benchmark: Test cross-schema JOIN performance during D2 (Design phase)
  - Indexing: Proper indexes on FK columns (reference_images.shot_id, shots.id)
  - Caching: IA can cache reference results locally
- **Fallback:** Denormalize if proven slow (unlikely, but measurable)

---

## Implementation Plan

### Phase 1: Schema Creation (D2 - Design)
1. Create migration: `20251115000000_media_references_schema_initial.sql`
   ```sql
   CREATE SCHEMA IF NOT EXISTS media_references;

   CREATE TABLE media_references.reference_images (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     file_path TEXT NOT NULL,
     original_catalog JSONB, -- Initial AI analysis
     corrected_metadata JSONB NOT NULL, -- Human-corrected
     shot_id UUID REFERENCES public.shots(id), -- Authoritative source
     thumbnail_url TEXT,
     created_at TIMESTAMPTZ DEFAULT NOW(),
     updated_at TIMESTAMPTZ DEFAULT NOW()
   );

   CREATE TABLE media_references.image_embeddings (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     reference_image_id UUID REFERENCES media_references.reference_images(id) ON DELETE CASCADE,
     embedding vector(512), -- pgvector extension
     model_version TEXT NOT NULL, -- "openai/clip-vit-b-32"
     created_at TIMESTAMPTZ DEFAULT NOW()
   );

   -- Enable pgvector extension if not already enabled
   CREATE EXTENSION IF NOT EXISTS vector;

   -- Index for vector similarity search
   CREATE INDEX ON media_references.image_embeddings
   USING ivfflat (embedding vector_cosine_ops)
   WITH (lists = 100);
   ```

2. RLS policies for media_references schema
3. Test locally: Cross-schema JOIN query works

### Phase 2: IA Integration (B2 - Implementation)
1. SupabaseClient service: Environment detection (local vs remote)
2. ReferenceLookup service: Vector search with cross-schema JOIN
3. Settings Modal: Supabase configuration UI
4. Tests: Unit + integration tests with local Supabase

### Phase 3: EAV Integration (B3 - Integration)
1. Dropdown: Query public.shots for planned shots
2. Reference creation workflow (manual admin action initially)
3. Cross-schema FK validation tests
4. Performance benchmarking: <100ms for 10k references

---

## Validation Criteria

**Schema Isolation:**
- [ ] Migration to media_references doesn't modify public schema
- [ ] RLS policies in media_references don't affect public schema
- [ ] Drop media_references schema doesn't break public tables

**Cross-Schema Integration:**
- [ ] FK constraint enforces: reference_images.shot_id → public.shots.id
- [ ] Cross-schema JOIN returns correct results
- [ ] Performance: <100ms for typical reference lookup queries

**Environment Parity:**
- [ ] Local Supabase: Both schemas available via http://127.0.0.1:54323/
- [ ] Remote Supabase: Both schemas deployed to zbxvjyrbkycbfhwmmnmy
- [ ] Migration files work identically in local and remote environments

---

## Related Documentation

### Architecture
- **North Star:** `.coord/workflow-docs/000-INGEST_ASSISTANT-D1-NORTH-STAR.md` (I7: Domain-Isolated Storage)
- **Tech Stack:** `CLAUDE.md` (Shared Supabase Architecture section)
- **Dependency Roadmap:** `.coord/docs/DEPENDENCY-ROADMAP.md` (Issue #63)

### EAV Ecosystem
- **EAV Context:** `/Volumes/HestAI-Projects/eav-monorepo/.coord/PROJECT-CONTEXT.md`
- **Supabase Config:** `/Volumes/HestAI-Projects/eav-monorepo/.env`
- **Public Schema:** EAV production tables (shots, shoots, scripts, projects)

### Skills
- **Supabase Operations:** Auto-loads for migration validation
- **Supabase Test Harness:** Auto-loads for local Supabase testing
- **Build Execution:** TDD discipline for implementation

---

## Notes

### Alternative Considered: Custom RPC Functions
Instead of direct cross-schema queries in application code, we could create PostgreSQL RPC functions:

```sql
CREATE FUNCTION media_references.get_reference_with_shot_metadata(reference_id UUID)
RETURNS TABLE (
  reference_data JSONB,
  shot_data JSONB
) AS $$
  SELECT
    to_jsonb(r.*) AS reference_data,
    to_jsonb(s.*) AS shot_data
  FROM media_references.reference_images r
  LEFT JOIN public.shots s ON r.shot_id = s.id
  WHERE r.id = reference_id;
$$ LANGUAGE SQL SECURITY DEFINER;
```

**Why Not Chosen:**
- Adds indirection layer (reduces code clarity)
- Supabase auto-generates TypeScript types for tables, not RPC functions
- Cross-schema JOINs are idiomatic PostgreSQL (no performance penalty)
- RPC functions can be added later if needed (not an immutable decision)

### Future Considerations

**Potential Future Schema:**
If IA grows to include other AI/ML features (e.g., scene detection, object tracking), we might create additional schemas:
- `media_references` (reference catalog)
- `media_analysis` (scene detection, object tracking)
- `media_training` (ML model metadata)

This ADR establishes the pattern: **One schema per domain, cross-schema FK for integration.**

---

**Decision:** ✅ ACCEPTED
**Implementation:** D2 (Design) → Schema design finalized → Migration created
**Validation:** B0 (Validation) → critical-design-validator GO/NO-GO
**Architect:** holistic-orchestrator
**Date:** 2025-11-15
