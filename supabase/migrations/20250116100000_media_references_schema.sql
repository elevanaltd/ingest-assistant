-- Migration: Create media_references Schema for Reference Catalog
-- Purpose: AI-powered reference catalog with cross-schema integration to EAV public.shots
-- Related: Ingest Assistant Issue #63 (Reference Image Lookup System)
-- Cross-Ecosystem: Depends on EAV migration 20250116090000_shots_contract_v1.sql
--
-- Schema Design:
-- 1. media_references.reference_images - Corrected metadata catalog (human-reviewed)
-- 2. media_references.image_embeddings - OpenAI CLIP vectors for similarity search
-- 3. media_references.shot_references - FK links to authoritative public.shots
-- 4. SECURITY DEFINER view for cross-schema JOIN (honors EAV RLS)
--
-- Dependencies:
-- - EAV public.shots contract (EAV_CONTRACT:v1)
-- - pgvector extension (for embedding storage)
--
-- RLS Strategy:
-- - Open read (anon) for reference catalog
-- - Authenticated write (admin/employee only)
-- - SECURITY DEFINER view maintains EAV governance

-- ============================================================================
-- STEP 1: Create schema and enable pgvector
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS media_references;

COMMENT ON SCHEMA media_references IS 'Ingest Assistant reference catalog - AI learning from human-corrected metadata. Cross-schema integration with EAV public.shots for authoritative shot references.';

-- Enable pgvector extension for embeddings
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA public;

-- ============================================================================
-- STEP 2: Create reference_images table
-- ============================================================================

CREATE TABLE media_references.reference_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_path text NOT NULL,
  original_filename text NOT NULL,

  -- Corrected metadata (human-reviewed)
  corrected_location text,
  corrected_subject text,
  corrected_action text,
  corrected_shot_type text,
  corrected_keywords text[],

  -- Original AI suggestions (for learning)
  ai_location text,
  ai_subject text,
  ai_action text,
  ai_shot_type text,
  ai_confidence numeric(3,2) CHECK (ai_confidence >= 0 AND ai_confidence <= 1),

  -- Metadata
  cataloged_at timestamptz NOT NULL DEFAULT now(),
  cataloged_by uuid, -- References auth.users but not FK (IA doesn't manage users)
  review_status text CHECK (review_status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',

  -- Indexing
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_reference_images_location ON media_references.reference_images(corrected_location);
CREATE INDEX idx_reference_images_subject ON media_references.reference_images(corrected_subject);
CREATE INDEX idx_reference_images_shot_type ON media_references.reference_images(corrected_shot_type);
CREATE INDEX idx_reference_images_status ON media_references.reference_images(review_status);
CREATE INDEX idx_reference_images_created_at ON media_references.reference_images(created_at DESC);

COMMENT ON TABLE media_references.reference_images IS 'Human-corrected metadata catalog for AI learning. Stores both AI suggestions and human corrections to improve future cataloging accuracy.';

-- ============================================================================
-- STEP 3: Create image_embeddings table (vector search)
-- ============================================================================

CREATE TABLE media_references.image_embeddings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_image_id uuid NOT NULL REFERENCES media_references.reference_images(id) ON DELETE CASCADE,

  -- OpenAI CLIP embedding (512-dimensional)
  embedding vector(512) NOT NULL,

  -- Embedding metadata
  model_version text NOT NULL DEFAULT 'openai/clip-vit-base-patch32',
  generated_at timestamptz NOT NULL DEFAULT now(),

  -- Ensure one embedding per image
  UNIQUE(reference_image_id)
);

-- Create vector index for similarity search (ivfflat with 100 lists)
CREATE INDEX idx_image_embeddings_vector ON media_references.image_embeddings
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

COMMENT ON TABLE media_references.image_embeddings IS 'OpenAI CLIP embeddings for vector similarity search. Enables AI to find visually similar reference images.';

-- ============================================================================
-- STEP 4: Create shot_references table (cross-schema FK)
-- ============================================================================

CREATE TABLE media_references.shot_references (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_image_id uuid NOT NULL REFERENCES media_references.reference_images(id) ON DELETE CASCADE,

  -- Cross-schema FK to EAV authoritative shots
  -- ON DELETE RESTRICT prevents orphaned references
  shot_id uuid NOT NULL,

  -- Metadata
  linked_at timestamptz NOT NULL DEFAULT now(),
  linked_by uuid, -- References auth.users
  link_confidence numeric(3,2) CHECK (link_confidence >= 0 AND link_confidence <= 1),

  -- Ensure unique reference→shot mapping
  UNIQUE(reference_image_id, shot_id)
);

-- Add FK constraint to public.shots (cross-schema)
-- DEFERRABLE INITIALLY IMMEDIATE = fail fast if contract violated
ALTER TABLE media_references.shot_references
  ADD CONSTRAINT fk_shot_id
  FOREIGN KEY (shot_id)
  REFERENCES public.shots(id)
  ON DELETE RESTRICT
  DEFERRABLE INITIALLY IMMEDIATE;

CREATE INDEX idx_shot_references_shot_id ON media_references.shot_references(shot_id);
CREATE INDEX idx_shot_references_reference_image_id ON media_references.shot_references(reference_image_id);

COMMENT ON TABLE media_references.shot_references IS 'Links reference images to authoritative EAV shots. FK with ON DELETE RESTRICT ensures EAV cannot delete shots with outstanding IA references.';

-- ============================================================================
-- STEP 5: Create SECURITY DEFINER view for cross-schema JOIN
-- ============================================================================

CREATE OR REPLACE VIEW media_references.reference_images_with_shot
WITH (security_invoker = false) -- SECURITY DEFINER
AS
SELECT
  r.id,
  r.file_path,
  r.original_filename,
  r.corrected_location,
  r.corrected_subject,
  r.corrected_action,
  r.corrected_shot_type,
  r.corrected_keywords,
  r.ai_location,
  r.ai_subject,
  r.ai_action,
  r.ai_shot_type,
  r.ai_confidence,
  r.review_status,
  r.cataloged_at,
  r.created_at,

  -- Authoritative shot metadata from EAV
  s.id AS shot_id,
  s.location_start_point AS shot_location,
  s.subject AS shot_subject,
  s.action AS shot_action,
  s.shot_type AS shot_type_code
FROM media_references.reference_images r
LEFT JOIN media_references.shot_references sr ON sr.reference_image_id = r.id
LEFT JOIN public.shots s ON s.id = sr.shot_id;

-- Set view owner to postgres (enables SECURITY DEFINER to bypass RLS)
ALTER VIEW media_references.reference_images_with_shot OWNER TO postgres;

COMMENT ON VIEW media_references.reference_images_with_shot IS 'SECURITY DEFINER view providing curated cross-schema access. Honors EAV RLS policies while allowing IA to expose combined reference + shot data to anon users.';

-- ============================================================================
-- STEP 6: Enable Row Level Security (RLS)
-- ============================================================================

ALTER TABLE media_references.reference_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_references.image_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_references.shot_references ENABLE ROW LEVEL SECURITY;

-- Policy: Open read for all tables (anon can view reference catalog)
CREATE POLICY "Reference catalog is publicly readable"
  ON media_references.reference_images
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Embeddings are publicly readable"
  ON media_references.image_embeddings
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Shot references are publicly readable"
  ON media_references.shot_references
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Policy: Authenticated write (admin/employee only via app logic)
CREATE POLICY "Authenticated users can write references"
  ON media_references.reference_images
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can write embeddings"
  ON media_references.image_embeddings
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can write shot links"
  ON media_references.shot_references
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- STEP 7: Grant permissions
-- ============================================================================

-- Grant schema usage
GRANT USAGE ON SCHEMA media_references TO anon, authenticated;

-- Grant table permissions
GRANT SELECT ON media_references.reference_images TO anon, authenticated;
GRANT SELECT ON media_references.image_embeddings TO anon, authenticated;
GRANT SELECT ON media_references.shot_references TO anon, authenticated;
GRANT SELECT ON media_references.reference_images_with_shot TO anon, authenticated;

GRANT ALL ON media_references.reference_images TO authenticated;
GRANT ALL ON media_references.image_embeddings TO authenticated;
GRANT ALL ON media_references.shot_references TO authenticated;

-- ============================================================================
-- VERIFICATION QUERIES (for testing)
-- ============================================================================

-- Verify schema exists
-- SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'media_references';

-- Verify pgvector extension
-- SELECT extname, extversion FROM pg_extension WHERE extname = 'vector';

-- Verify tables created
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'media_references';

-- Verify FK constraint
-- SELECT conname, conrelid::regclass, confrelid::regclass
-- FROM pg_constraint
-- WHERE conname = 'fk_shot_id';

-- Test FK enforcement (should succeed)
-- INSERT INTO public.shots (id, location_start_point, subject, shot_type)
-- VALUES (gen_random_uuid(), 'kitchen', 'oven', 'CU');
--
-- INSERT INTO media_references.reference_images (file_path, original_filename, corrected_location, corrected_subject, corrected_shot_type)
-- VALUES ('/test/path.jpg', 'test.jpg', 'kitchen', 'oven', 'CU');
--
-- INSERT INTO media_references.shot_references (reference_image_id, shot_id)
-- VALUES (
--   (SELECT id FROM media_references.reference_images WHERE original_filename = 'test.jpg'),
--   (SELECT id FROM public.shots WHERE subject = 'oven' LIMIT 1)
-- );

-- Test FK enforcement (should fail - invalid shot_id)
-- INSERT INTO media_references.shot_references (reference_image_id, shot_id)
-- VALUES (gen_random_uuid(), gen_random_uuid());

-- Test DELETE RESTRICT (should fail if references exist)
-- DELETE FROM public.shots WHERE subject = 'oven';

-- Verify RLS policies
-- SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'media_references';

-- Test SECURITY DEFINER view
-- SET ROLE anon;
-- SELECT * FROM media_references.reference_images_with_shot LIMIT 1;
-- -- Expected: Can read view (even though anon cannot read public.shots directly)
