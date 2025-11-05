# State Tracking Procedures

## Overview

Database state awareness requires continuous validation of local development state vs remote production state to prevent migration divergence and maintain schema synchronization.

## Current State Awareness

### Production Database
- **Project ID:** zbxvjyrbkycbfhwmmnmy
- **Application:** scripts-web
- **Environment:** Production

### State Components

1. **Schema Version:** Latest applied migration timestamp
2. **Migration Sync:** Local files vs remote applied migrations
3. **RLS Policies:** Active policies and performance baselines
4. **Extensions:** Installed Postgres extensions
5. **Performance Metrics:** Query times against RLS targets

## Local ↔ Remote Sync Validation

### Step 1: Read Local Migration Files
```bash
# List local migrations with timestamps
ls -la supabase/migrations/*.sql
```

**Expected Format:**
```
20231201120000_initial_schema.sql
20231205143000_add_users_table.sql
20231210092000_add_rls_policies.sql
```

**Validation:**
- Timestamps in chronological order
- No duplicate timestamps
- Descriptive file names

### Step 2: Query Remote Migrations
```javascript
const remoteMigrations = await mcp__supabase__list_migrations({
  project_id: 'zbxvjyrbkycbfhwmmnmy'
});
```

**Response Format:**
```json
{
  "migrations": [
    {
      "name": "20231201120000_initial_schema",
      "executed_at": "2023-12-01T12:00:00Z"
    },
    {
      "name": "20231205143000_add_users_table",
      "executed_at": "2023-12-05T14:30:00Z"
    }
  ]
}
```

### Step 3: Detect Divergence

**Divergence Patterns:**

**Pattern 1: Pending Migrations (Normal)**
```
Local: [A, B, C, D]
Remote: [A, B, C]
Divergence: D is pending (not yet applied)
Action: Apply D via migration workflow
```

**Pattern 2: Missing Local Migrations (STATE DRIFT)**
```
Local: [A, B, D]
Remote: [A, B, C, D]
Divergence: C is missing from local
Action: INVESTIGATE - someone applied C without committing to git
```

**Pattern 3: Different Migrations (CONFLICT)**
```
Local: [A, B, C_local]
Remote: [A, B, C_remote]
Divergence: Conflicting C migrations (same timestamp, different content)
Action: HALT - resolve conflict before proceeding
```

**Pattern 4: Synchronized (Ideal)**
```
Local: [A, B, C]
Remote: [A, B, C]
Divergence: None
Action: Proceed with new migrations
```

## Sync Guidance by Divergence Pattern

### Pending Migrations (Local > Remote)
**Scenario:** Local has migrations not yet applied to remote

**Validation Steps:**
1. Verify local migrations are in git (committed)
2. Check ADR-003 compliance for pending migrations
3. Run migration workflow from Step 4 onwards
4. Apply pending migrations via apply_migration

**Commands:**
```bash
# Verify git tracking
git log --oneline -- supabase/migrations/

# Apply pending migration
mcp__supabase__apply_migration({
  project_id: 'zbxvjyrbkycbfhwmmnmy',
  name: '20231210092000_add_rls_policies',
  query: '[SQL CONTENT]'
})
```

### Missing Local Migrations (Remote > Local)
**Scenario:** Remote has migrations not in local repository

**Investigation Steps:**
1. Check git history: Was migration intentionally excluded?
2. Check team communication: Did someone apply directly to production?
3. Retrieve migration content from Supabase dashboard
4. Commit missing migration to git
5. Synchronize local state

**Recovery:**
```bash
# Retrieve missing migration SQL from Supabase dashboard
# Export to local file with correct timestamp
# Commit to git

git add supabase/migrations/20231207100000_missing_migration.sql
git commit -m "Recover missing migration from production"
```

### Conflicting Migrations (Timestamp Collision)
**Scenario:** Same timestamp, different content (developer conflict)

**Resolution Steps:**
1. **HALT:** Do not apply either migration
2. Compare migration content:
   - Developer A's migration: What does it do?
   - Developer B's migration: What does it do?
3. Resolve conflict:
   - If independent: Rename one with new timestamp
   - If conflicting: Merge into single migration
4. Test merged migration in staging
5. Apply to production

**Prevention:**
- Coordinate migration creation with team
- Use timestamp + developer initials in filename
- Pull latest migrations before creating new ones

## State Reporting Format

### Standard State Report
```
═══════════════════════════════════════
SUPABASE STATE REPORT
═══════════════════════════════════════

PROJECT: scripts-web (zbxvjyrbkycbfhwmmnmy)
TIMESTAMP: 2023-12-15 14:30:00 UTC

LOCAL STATE:
  Migrations: 15 files
  Latest: 20231210092000_add_rls_policies.sql

REMOTE STATE:
  Migrations: 14 applied
  Latest: 20231205143000_add_users_table.sql

DIVERGENCE:
  Status: PENDING MIGRATIONS
  Details: 1 local migration not yet applied
  Pending: 20231210092000_add_rls_policies.sql

SYNC GUIDANCE:
  1. Validate ADR-003 compliance for pending migration
  2. Run get_advisors after applying migration
  3. Expected application time: ~500ms
  4. No rollback concerns (additive change)

═══════════════════════════════════════
```

## Living Protocol Updates

After significant database operations, update the living protocol with current state.

**Protocol Location:**
`/Users/shaunbuswell/.claude/protocols/SUPABASE-OPERATIONS.md`

**Update Triggers:**
- After migration application
- After RLS optimization discovery
- After performance validation
- After troubleshooting resolution

**Update Template:**
```markdown
## Current State

**Last Updated:** [Timestamp]
**Schema Version:** [Latest migration timestamp]
**Last Sync:** [When local/remote validated]

**Active RLS Policies:**
- [Table name]: [Policy count] policies
- Performance: [Measured query time vs target]

**Recent Changes:**
- [Migration timestamp]: [Description]
- Impact: [Performance change, security improvement]

**Known Issues:**
- [Issue description]
- Mitigation: [Workaround or fix]
```

## Performance Monitoring

### Query Time Tracking

**Establish Baselines:**
```sql
-- Measure RLS-enabled query performance
SELECT * FROM records WHERE user_id = auth.uid();
-- Expected: <50ms

-- Measure complex JOIN performance
SELECT r.*, u.name FROM records r
JOIN users u ON r.user_id = u.id
WHERE r.user_id = auth.uid();
-- Expected: <200ms
```

**Track Over Time:**
- Baseline: Performance immediately after optimization
- Current: Performance now
- Degradation: If current > baseline + 20%, investigate

### RLS Overhead Measurement

**Compare RLS-enabled vs RLS-disabled:**
```sql
-- Disable RLS (admin/testing only)
ALTER TABLE records DISABLE ROW LEVEL SECURITY;
EXPLAIN ANALYZE SELECT * FROM records WHERE user_id = 'uuid';
-- Note baseline time: X ms

-- Enable RLS
ALTER TABLE records ENABLE ROW LEVEL SECURITY;
EXPLAIN ANALYZE SELECT * FROM records WHERE user_id = 'uuid';
-- Note RLS time: Y ms

-- Calculate overhead: (Y - X) / X * 100%
-- Target: <20% overhead
```

## State Verification Commands

### Quick State Check
```bash
# Local migration count
ls supabase/migrations/*.sql | wc -l

# Remote migration count (via MCP tool)
mcp__supabase__list_migrations({ project_id })
# Count migrations in response

# Compare counts
```

### Detailed State Analysis
```javascript
// Comprehensive state report
const local = await readLocalMigrations();
const remote = await mcp__supabase__list_migrations({ project_id });
const tables = await mcp__supabase__list_tables({ project_id });
const advisors = await mcp__supabase__get_advisors({
  project_id,
  type: 'security'
});

generateStateReport({ local, remote, tables, advisors });
```

## Anti-Patterns to Avoid

**Never:**
- ❌ Assume local/remote sync without validation
- ❌ Apply migrations without checking remote state first
- ❌ Ignore missing migrations in local repository
- ❌ Skip state documentation after operations
- ❌ Apply migrations from multiple developers simultaneously
- ❌ Modify production schema without migration files
