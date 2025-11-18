#!/bin/bash
# Cross-Schema Validation Script
# Purpose: Verify EAV public.shots contract + IA media_references integration
# Usage: ./scripts/check_cross_schema.sh [SUPABASE_URL]
#
# Prerequisites:
# 1. Local Supabase running (supabase start)
# 2. EAV migration 20250116090000_shots_contract_v1.sql applied
# 3. IA migration 20250116100000_media_references_schema.sql applied
#
# Exit codes:
# 0 = All validations passed
# 1 = Validation failed

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get Supabase URL (default to local)
SUPABASE_URL="${1:-$(supabase status 2>/dev/null | grep 'DB URL' | awk '{print $3}')}"

if [ -z "$SUPABASE_URL" ]; then
  echo -e "${RED}❌ SUPABASE_URL not provided and supabase not running${NC}"
  echo "Usage: ./scripts/check_cross_schema.sh [SUPABASE_URL]"
  exit 1
fi

echo "=================================================="
echo "Cross-Schema Validation Script"
echo "=================================================="
echo "Supabase URL: $SUPABASE_URL"
echo ""

# Track validation results
FAILED=0

# Helper function to run validation
run_validation() {
  local name="$1"
  local query="$2"
  local expected="$3"

  echo -n "Checking $name... "

  result=$(psql "$SUPABASE_URL" -t -c "$query" 2>&1)
  exit_code=$?

  if [ $exit_code -ne 0 ]; then
    echo -e "${RED}❌ FAILED${NC}"
    echo "  Error: $result"
    FAILED=$((FAILED + 1))
    return 1
  fi

  # Trim whitespace
  result=$(echo "$result" | tr -d '[:space:]')

  if [ "$result" = "$expected" ]; then
    echo -e "${GREEN}✓ PASSED${NC}"
    return 0
  else
    echo -e "${RED}❌ FAILED${NC}"
    echo "  Expected: $expected"
    echo "  Got: $result"
    FAILED=$((FAILED + 1))
    return 1
  fi
}

# ============================================================================
# VALIDATION 1: EAV Contract Established
# ============================================================================

echo "=== EAV Contract Validation ==="

run_validation "EAV contract comment exists" \
  "SELECT obj_description('public.shots'::regclass) LIKE '%EAV_CONTRACT:v1%';" \
  "t"

run_validation "notify_shot_change function exists" \
  "SELECT EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'notify_shot_change');" \
  "t"

run_validation "notify_shot_change_trigger exists" \
  "SELECT EXISTS(SELECT 1 FROM pg_trigger WHERE tgname = 'notify_shot_change_trigger');" \
  "t"

echo ""

# ============================================================================
# VALIDATION 2: IA Schema Created
# ============================================================================

echo "=== IA Schema Validation ==="

run_validation "media_references schema exists" \
  "SELECT EXISTS(SELECT 1 FROM information_schema.schemata WHERE schema_name = 'media_references');" \
  "t"

run_validation "pgvector extension enabled" \
  "SELECT EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'vector');" \
  "t"

run_validation "reference_images table exists" \
  "SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema = 'media_references' AND table_name = 'reference_images');" \
  "t"

run_validation "image_embeddings table exists" \
  "SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema = 'media_references' AND table_name = 'image_embeddings');" \
  "t"

run_validation "shot_references table exists" \
  "SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema = 'media_references' AND table_name = 'shot_references');" \
  "t"

echo ""

# ============================================================================
# VALIDATION 3: Cross-Schema FK Constraint
# ============================================================================

echo "=== Cross-Schema FK Validation ==="

run_validation "FK constraint fk_shot_id exists" \
  "SELECT EXISTS(SELECT 1 FROM pg_constraint WHERE conname = 'fk_shot_id');" \
  "t"

run_validation "FK references public.shots" \
  "SELECT confrelid::regclass::text FROM pg_constraint WHERE conname = 'fk_shot_id';" \
  "public.shots"

run_validation "FK is ON DELETE RESTRICT" \
  "SELECT confdeltype FROM pg_constraint WHERE conname = 'fk_shot_id';" \
  "r"

echo ""

# ============================================================================
# VALIDATION 4: RLS Policies
# ============================================================================

echo "=== RLS Policy Validation ==="

run_validation "reference_images has RLS enabled" \
  "SELECT relrowsecurity FROM pg_class WHERE oid = 'media_references.reference_images'::regclass;" \
  "t"

run_validation "reference_images has read policy" \
  "SELECT EXISTS(SELECT 1 FROM pg_policies WHERE schemaname = 'media_references' AND tablename = 'reference_images' AND cmd = 'SELECT');" \
  "t"

run_validation "reference_images has write policy" \
  "SELECT EXISTS(SELECT 1 FROM pg_policies WHERE schemaname = 'media_references' AND tablename = 'reference_images' AND cmd = 'ALL');" \
  "t"

echo ""

# ============================================================================
# VALIDATION 5: SECURITY DEFINER View
# ============================================================================

echo "=== SECURITY DEFINER View Validation ==="

run_validation "reference_images_with_shot view exists" \
  "SELECT EXISTS(SELECT 1 FROM information_schema.views WHERE table_schema = 'media_references' AND table_name = 'reference_images_with_shot');" \
  "t"

run_validation "View owner is postgres" \
  "SELECT c.relowner::regrole::text FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'media_references' AND c.relname = 'reference_images_with_shot';" \
  "postgres"

echo ""

# ============================================================================
# VALIDATION 6: Vector Index
# ============================================================================

echo "=== Vector Index Validation ==="

run_validation "Vector index exists" \
  "SELECT EXISTS(SELECT 1 FROM pg_indexes WHERE schemaname = 'media_references' AND tablename = 'image_embeddings' AND indexname = 'idx_image_embeddings_vector');" \
  "t"

echo ""

# ============================================================================
# SUMMARY
# ============================================================================

echo "=================================================="
if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}✅ ALL VALIDATIONS PASSED ($FAILED failures)${NC}"
  echo "=================================================="
  exit 0
else
  echo -e "${RED}❌ VALIDATION FAILED ($FAILED failures)${NC}"
  echo "=================================================="
  exit 1
fi
