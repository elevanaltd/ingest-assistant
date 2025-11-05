# MCP Tool Performance Benchmarks

## Tool Performance Characteristics

Performance data from production usage with scripts-web project (zbxvjyrbkycbfhwmmnmy).

### list_migrations
**Purpose:** Retrieve remote migration state for sync validation

**Performance:**
- Typical: 200-400ms
- Operation: Remote API call to Supabase Management API
- Network-dependent: Add ~100ms for slow connections

**When to Use:**
- Step 2 of migration workflow (state validation)
- Debugging migration divergence
- Verifying migration application

**Best Practices:**
- Cache results when checking multiple migrations
- Use at beginning of migration workflow (not per-migration)

### apply_migration
**Purpose:** Execute DDL operations with tracking

**Performance:**
- Simple DDL: 500-800ms (CREATE INDEX, ADD COLUMN)
- Complex DDL: 1000-2000ms (multi-table ALTER, FK constraints)
- Depends on: Table size, existing constraints, lock contention

**When to Use:**
- DDL operations (CREATE, ALTER, DROP)
- Schema changes requiring audit trail
- Operations needing rollback procedures

**Best Practices:**
- Test complex migrations in staging first
- Monitor for lock timeouts (>5s indicates contention)
- Use during low-traffic periods for large tables

**Anti-Pattern:**
- Don't use for DML (data migrations) - use execute_sql instead

### execute_sql
**Purpose:** Run DML queries and complex operations

**Performance:**
- Simple queries: 50-150ms
- Complex JOINs: 150-500ms
- Target: <200ms for production queries

**When to Use:**
- DML operations (INSERT, UPDATE, DELETE)
- Data migrations
- Complex analytical queries
- Temporary operations not requiring migration history

**Best Practices:**
- Parameterize queries to prevent SQL injection
- Use EXPLAIN ANALYZE for performance testing
- Batch large operations (1000 rows at a time)

**Anti-Pattern:**
- Don't use for DDL that should be tracked (use apply_migration)

### get_advisors
**Purpose:** Security and performance validation

**Performance:**
- Security scan: 300-600ms
- Performance scan: 300-600ms
- Full analysis: ~1000ms (both scans)

**When to Use:**
- After schema changes (migration validation)
- Before production deployment
- Debugging security/performance issues
- Regular audits (weekly/monthly)

**Best Practices:**
- Run after every migration (Step 6 validation)
- Treat warnings as errors (zero-tolerance gate)
- Document remediation for each issue

**Common Issues Detected:**
- Missing RLS policies (security)
- Missing indexes on foreign keys (performance)
- Inefficient query patterns (performance)
- Permission gaps (security)

### generate_typescript_types
**Purpose:** Generate TypeScript interfaces from schema

**Performance:**
- Small schema (<20 tables): 1000-1500ms
- Medium schema (20-50 tables): 1500-2500ms
- Large schema (>50 tables): 2500-3500ms

**When to Use:**
- After schema changes
- Before committing migrations
- When TypeScript errors indicate schema drift

**Best Practices:**
- Run as final step after migration validation
- Commit generated types with migration files
- Use in shared library for consistency across apps

**Anti-Pattern:**
- Don't generate manually - automate with migration workflow

### list_tables
**Purpose:** Inspect current schema structure

**Performance:**
- Standard: 150-300ms
- Includes: Table names, schemas, columns

**When to Use:**
- Schema exploration
- Validation of table existence
- Debugging missing tables

**Best Practices:**
- Filter by schema when possible (faster)
- Cache results for multi-query workflows

### list_extensions
**Purpose:** Verify installed Postgres extensions

**Performance:**
- Standard: 100-200ms

**When to Use:**
- Verifying extension installation (uuid-ossp, pg_stat_statements)
- Debugging missing extension functions
- Pre-migration dependency checks

**Best Practices:**
- Check extensions before creating functions that depend on them
- Document required extensions in migration comments

## Tool Selection Matrix

| Operation Type | Recommended Tool | Rationale |
|---------------|------------------|-----------|
| Schema change (DDL) | apply_migration | Trackable, reversible, auditable |
| Data migration (DML) | execute_sql | Flexible, can batch operations |
| State validation | list_migrations | Shows local/remote sync status |
| Security check | get_advisors (security) | Detects RLS gaps, permission issues |
| Performance check | get_advisors (performance) | Identifies missing indexes, slow queries |
| Schema inspection | list_tables | Quick schema overview |
| Type generation | generate_typescript_types | Ensures type safety |
| Extension check | list_extensions | Validates dependencies |

## Performance Optimization Strategies

### 1. Batch Operations
```javascript
// Don't: Execute 1000 queries sequentially
for (let i = 0; i < 1000; i++) {
  await execute_sql(`INSERT INTO records VALUES (${i})`);
}

// Do: Batch into single query
await execute_sql(`
  INSERT INTO records
  SELECT generate_series(1, 1000)
`);
```

**Impact:** 1000× faster (50s → 50ms)

### 2. Cache Migration State
```javascript
// Don't: Query migrations repeatedly
for (let migration of localMigrations) {
  const remote = await list_migrations(); // Repeated API calls
  checkSync(migration, remote);
}

// Do: Query once, cache results
const remoteMigrations = await list_migrations(); // Single API call
for (let migration of localMigrations) {
  checkSync(migration, remoteMigrations);
}
```

**Impact:** N× faster (N = number of migrations)

### 3. Parallel Non-Dependent Operations
```javascript
// Don't: Sequential when operations are independent
await list_tables();
await list_extensions();
await get_advisors('security');

// Do: Parallel execution
await Promise.all([
  list_tables(),
  list_extensions(),
  get_advisors('security')
]);
```

**Impact:** 3× faster (900ms → 300ms)

### 4. Smart Advisor Usage
```javascript
// Don't: Run advisors on every query
await execute_sql(query);
await get_advisors('performance');

// Do: Run advisors after schema changes only
await apply_migration(migration);
await get_advisors('security');
await get_advisors('performance');
```

**Impact:** Reduces unnecessary API calls

## Timeout Recommendations

Based on observed performance:

| Tool | Timeout (seconds) | Rationale |
|------|------------------|-----------|
| list_migrations | 2 | Network-bound, rarely >1s |
| apply_migration | 10 | DDL can be slow on large tables |
| execute_sql | 5 | DML should be fast, timeout if slow |
| get_advisors | 3 | Analysis rarely >1s |
| generate_typescript_types | 5 | Schema traversal takes time |
| list_tables | 2 | Quick metadata query |
| list_extensions | 2 | Quick metadata query |

## Error Patterns

### Connection Timeouts
**Symptom:** Tool hangs, eventually times out

**Common Causes:**
- Network issues
- Supabase service degradation
- Large result sets

**Mitigation:**
- Implement retry with exponential backoff
- Use shorter timeouts for quick-fail
- Check Supabase status page

### Rate Limiting
**Symptom:** 429 Too Many Requests

**Common Causes:**
- Rapid sequential API calls
- Multiple agents calling tools simultaneously

**Mitigation:**
- Batch operations when possible
- Add delays between calls (100ms)
- Use cached results instead of re-querying

### Lock Contention (apply_migration)
**Symptom:** Migration takes >10s, times out

**Common Causes:**
- Altering table with active queries
- Adding constraints to large tables
- Concurrent migrations

**Mitigation:**
- Run during low-traffic periods
- Use CREATE INDEX CONCURRENTLY
- Test in staging first
