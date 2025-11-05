# Migration Validation Protocols

## 7-Step Migration Workflow

### Step 1: Validate Local Migrations Exist
```bash
# Check for migration files in local directory
ls supabase/migrations/*.sql
```

**Validation:**
- Migration files present with timestamp naming: `YYYYMMDDHHMMSS_description.sql`
- File names are descriptive and indicate purpose
- No conflicting timestamps with remote migrations

### Step 2: Query Remote Migration State
```bash
# Use MCP tool to get remote migrations
mcp__supabase__list_migrations(project_id)
```

**Expected Response:**
- List of applied migrations with timestamps
- Migration names and descriptions
- Application timestamps

### Step 3: Compare Local vs Remote State
**Divergence Detection:**
- Local migrations NOT in remote = pending migrations
- Remote migrations NOT in local = state drift (requires investigation)
- Matching migrations = synchronized state

**Common Divergence Patterns:**
- Developer applied migrations directly without committing to git
- Multiple developers created migrations simultaneously
- Migration rollback without removing file

### Step 4: Validate ADR-003 Compliance
**See [adr-003-compliance.md](adr-003-compliance.md) for complete checklist**

Before applying migrations, verify:
- Backwards-compatible additive pattern (ADD COLUMN, not ALTER/DROP)
- Component FK integrity preserved
- Multi-app compatibility maintained
- Deprecation cycle followed for breaking changes (14 days)

### Step 5: Execute Migration
**Tool Selection:**
- **Use apply_migration**: DDL operations (CREATE, ALTER, DROP with deprecation)
- **Use execute_sql**: DML operations, data migrations, temporary operations

**Dry-Run Consideration:**
- Test complex migrations in staging environment first
- Verify rollback procedures exist
- Document expected schema changes

### Step 6: Verify with Advisors
```bash
# Run security and performance validation
mcp__supabase__get_advisors(project_id, type: "security")
mcp__supabase__get_advisors(project_id, type: "performance")
```

**Zero-Tolerance Gate:**
- 0 errors required
- 0 warnings required
- Any violations = investigate and remediate

**Common Issues Detected:**
- Missing RLS policies on new tables
- Index opportunities for foreign keys
- Permission issues
- Column type mismatches

### Step 7: Update Living Protocol
**Document:**
- Current schema version (latest migration timestamp)
- Last sync timestamp
- Active RLS policies
- Any novel patterns discovered during migration

**Living Protocol Location:**
`/Users/shaunbuswell/.claude/protocols/SUPABASE-OPERATIONS.md`

## Migration Types

### DDL Operations (Use apply_migration)
- CREATE TABLE
- ALTER TABLE ADD COLUMN (with DEFAULT for backwards compatibility)
- CREATE INDEX
- ALTER TABLE ADD CONSTRAINT (FK, CHECK)
- CREATE FUNCTION
- CREATE TRIGGER

**Benefits:**
- Tracked in migration history
- Reversible through rollback procedures
- Auditable

### DML Operations (Use execute_sql)
- INSERT data migrations
- UPDATE existing records
- DELETE cleanup operations
- Complex transformations

**Caution:**
- Not automatically reversible
- Document rollback SQL separately
- Test with small batches first

## Emergency Rollback Procedure

**Scenario:** Migration causes production issues

**Steps:**
1. Assess impact (tables affected, data integrity)
2. Create reverse migration SQL
3. Test reverse migration in staging
4. Apply reverse migration via apply_migration
5. Document incident in living protocol
6. Add preventive validation to Step 4

**Rollback Patterns:**
- DROP COLUMN → requires data backup first (destructive)
- ADD COLUMN → DROP COLUMN (safe if no data written)
- CREATE INDEX → DROP INDEX (always safe)
- ALTER COLUMN → Complex (may require data migration)

## Best Practices

**Before Migration:**
- ✓ Read ADR-003 compliance requirements
- ✓ Verify local/remote sync
- ✓ Test in staging environment
- ✓ Document rollback procedure
- ✓ Notify team of pending schema change

**During Migration:**
- ✓ Use apply_migration for DDL (trackable)
- ✓ Monitor execution time (timeout risk)
- ✓ Watch for lock conflicts

**After Migration:**
- ✓ Run get_advisors for validation
- ✓ Verify 0 errors/warnings
- ✓ Update living protocol
- ✓ Generate TypeScript types if applicable
- ✓ Test affected applications

## Anti-Patterns to Avoid

**Never:**
- ❌ Skip local/remote sync validation (Step 2)
- ❌ Apply migrations without ADR-003 compliance check
- ❌ Ignore advisor warnings/errors
- ❌ Apply breaking changes without 14-day deprecation cycle
- ❌ Bypass migration protocol for "urgent" changes (rollback exists for emergencies)
- ❌ Modify production schema directly without migration files
