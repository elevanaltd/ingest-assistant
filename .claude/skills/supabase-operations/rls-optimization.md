# RLS Optimization Patterns

## Performance Targets

**Query Performance with RLS:**
- Simple SELECT: <50ms with RLS enforcement
- Complex JOINs: <200ms with multi-table RLS
- Write operations: <500ms including triggers and RLS validation

## Proven Optimization Patterns

### 1. InitPlan Optimization (50-100ms improvement)

**Problem:** RLS policies using `auth.uid()` in subqueries cause sequential scans

**Solution:** Structure policies to enable InitPlan optimization

**Bad Pattern (Sequential Scan):**
```sql
CREATE POLICY "client_select" ON records
FOR SELECT USING (
  user_id IN (
    SELECT user_id FROM client_assignments WHERE client_id = auth.uid()
  )
);
```

**Good Pattern (InitPlan):**
```sql
CREATE POLICY "client_select" ON records
FOR SELECT USING (
  user_id = auth.uid()
);
```

**Performance Impact:**
- Before: 150ms (sequential scan over client_assignments)
- After: 45ms (index lookup on user_id)
- Improvement: ~70% faster

**When to Use:**
- Admin/client access pattern separation
- Direct user ownership relationships
- Simple authorization rules

### 2. Policy Consolidation (50% reduction in evaluation overhead)

**Problem:** Multiple overlapping policies create redundant authorization checks

**Bad Pattern (3 separate policies):**
```sql
CREATE POLICY "admin_select" ON records FOR SELECT USING (is_admin());
CREATE POLICY "owner_select" ON records FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "public_select" ON records FOR SELECT USING (is_public = true);
```

**Good Pattern (1 unified policy):**
```sql
CREATE POLICY "unified_select" ON records
FOR SELECT USING (
  is_admin() OR user_id = auth.uid() OR is_public = true
);
```

**Performance Impact:**
- Before: 3 policy evaluations per row
- After: 1 policy evaluation per row
- Improvement: 50% reduction in RLS overhead

**When to Use:**
- Multiple authorization rules for same operation
- Performance-critical queries
- High-frequency access patterns

### 3. Security Definer Protection

**Problem:** SECURITY DEFINER functions vulnerable to search_path injection

**Bad Pattern (Vulnerable):**
```sql
CREATE FUNCTION get_user_records()
RETURNS SETOF records
SECURITY DEFINER
AS $$
  SELECT * FROM records WHERE user_id = current_user_id();
$$;
```

**Good Pattern (Protected):**
```sql
CREATE FUNCTION get_user_records()
RETURNS SETOF records
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT * FROM records WHERE user_id = current_user_id();
$$;
```

**Security Impact:**
- Prevents function injection attacks via malicious search_path manipulation
- Ensures function operates in controlled schema namespace

**When to Use:**
- Always when using SECURITY DEFINER
- Functions that bypass RLS
- Functions with elevated privileges

### 4. Role-Based Pattern Separation

**Admin Pattern (Full Access):**
```sql
CREATE POLICY "admin_all" ON records
FOR ALL USING (
  is_admin() -- Custom function checking auth.jwt() claims
);
```

**Client Pattern (Scoped Access):**
```sql
CREATE POLICY "client_select" ON records
FOR SELECT USING (
  user_id = auth.uid()
);
```

**Benefits:**
- Clear authorization boundaries
- Easy to audit access patterns
- Performance-optimized for each role
- Simple mental model

## RLS Design Principles

### 1. Performance First
Design policies for query planner optimization:
- Prefer direct equality checks: `user_id = auth.uid()`
- Use indexes on RLS columns
- Avoid subqueries when possible (InitPlan pattern)
- Test with EXPLAIN ANALYZE

### 2. Consolidation Over Duplication
Unified policies reduce evaluation overhead:
- Combine similar policies with OR conditions
- Use role-based functions for complex logic
- Avoid redundant authorization checks

### 3. Explicit Security
SECURITY DEFINER functions require protection:
- Always SET search_path
- Document privilege elevation
- Audit bypass scenarios

### 4. Testability
RLS policies must be testable:
- Test with anon key (enforces RLS)
- Test with service key (bypasses RLS)
- Verify both access grant AND denial

## Common Anti-Patterns

### Anti-Pattern 1: Complex Subqueries in RLS
```sql
-- DON'T: Nested subqueries kill performance
CREATE POLICY "complex" ON records
FOR SELECT USING (
  id IN (
    SELECT record_id FROM permissions
    WHERE user_id IN (
      SELECT id FROM users WHERE team_id = get_team()
    )
  )
);
```

**Fix:** Flatten with JOINs or use materialized views

### Anti-Pattern 2: Missing Indexes
```sql
-- DON'T: RLS columns without indexes
CREATE POLICY "select" ON records
FOR SELECT USING (user_id = auth.uid());
-- Missing: CREATE INDEX idx_records_user_id ON records(user_id);
```

**Fix:** Create indexes on ALL RLS filter columns

### Anti-Pattern 3: Overly Permissive Policies
```sql
-- DON'T: Security theater
CREATE POLICY "everyone" ON records
FOR SELECT USING (true);
```

**Fix:** Implement actual authorization logic or disable RLS if truly public

## Performance Benchmarking

### Baseline Measurement
```sql
-- Disable RLS to get baseline
ALTER TABLE records DISABLE ROW LEVEL SECURITY;
EXPLAIN ANALYZE SELECT * FROM records WHERE user_id = 'uuid';
-- Note baseline time

-- Enable RLS to measure overhead
ALTER TABLE records ENABLE ROW LEVEL SECURITY;
EXPLAIN ANALYZE SELECT * FROM records WHERE user_id = 'uuid';
-- Compare to baseline
```

**Target:** RLS overhead should be <20% of baseline query time

### InitPlan Detection
```sql
EXPLAIN ANALYZE SELECT * FROM records;
```

**Look for:**
- "InitPlan" in query plan = Good (constant-time auth check)
- "Seq Scan" on auth tables = Bad (linear-time auth check)

### Policy Evaluation Count
```sql
-- Check number of policies evaluated
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE tablename = 'records';
```

**Target:** 1-2 policies per operation (more = overhead)

## RLS + Application Patterns

### Pattern 1: Admin Dashboard
- Use service role key to bypass RLS
- Implement application-level authorization
- Log all admin operations

### Pattern 2: Multi-Tenant SaaS
- RLS enforces tenant isolation
- Use tenant_id in all policies
- Index tenant_id columns

### Pattern 3: Public + Private Data
- Separate policies for public vs authenticated
- Use is_public column for public data
- Cache public data aggressively (no RLS overhead)

## Troubleshooting RLS Performance

**Symptom:** Slow queries with RLS enabled

**Diagnosis Steps:**
1. Compare baseline (RLS disabled) vs actual (RLS enabled)
2. Check EXPLAIN ANALYZE for Sequential Scans
3. Verify indexes exist on RLS filter columns
4. Count number of policies evaluated
5. Look for InitPlan optimization opportunities

**Common Fixes:**
- Add indexes to RLS columns
- Consolidate multiple policies
- Restructure for InitPlan pattern
- Cache auth.uid() calls in policy functions
