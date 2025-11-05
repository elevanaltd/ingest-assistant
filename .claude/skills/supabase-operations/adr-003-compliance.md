# ADR-003 Compliance Checklist

## Overview

Architecture Decision Record 003 (ADR-003) governs schema migration standards for the 7-app ecosystem, ensuring backwards-compatible, additive patterns that prevent breaking changes across applications.

## Core Principles

### 1. Backwards-Compatible Additive Pattern
**Rule:** Schema changes must be additive only - new applications can use new features while old applications continue functioning.

**Allowed:**
- ADD COLUMN with DEFAULT value
- CREATE TABLE (new tables don't break old apps)
- CREATE INDEX (performance improvement, no schema impact)
- ADD CONSTRAINT (if doesn't conflict with existing data)

**Prohibited Without Deprecation:**
- ALTER COLUMN (changing type, removing DEFAULT)
- DROP COLUMN (removes data old apps expect)
- DROP TABLE (catastrophic for old apps)
- RENAME COLUMN (breaks old apps expecting old name)
- RENAME TABLE (breaks all references)

### 2. Component FK Integrity
**Rule:** All component tables must reference component_id foreign key pattern for ecosystem consistency.

**Validation:**
```sql
-- Check: Do all component tables have component_id FK?
SELECT table_name
FROM information_schema.tables
WHERE table_name LIKE '%_component%'
  AND table_name NOT IN (
    SELECT table_name
    FROM information_schema.columns
    WHERE column_name = 'component_id'
  );
```

**Expected:** Empty result (all component tables have component_id)

### 3. Multi-App Testing
**Rule:** Schema changes validated across all 7 apps before production deployment.

**Required Apps:**
1. scripts-web (main application)
2. admin-dashboard
3. client-portal
4. reporting-engine
5. integration-service
6. analytics-pipeline
7. mobile-api

**Testing Checklist:**
- [ ] New columns have DEFAULT or are nullable (old apps won't provide values)
- [ ] New tables don't conflict with existing table names
- [ ] FK constraints reference existing tables
- [ ] No breaking changes to existing columns
- [ ] Triggers/functions don't break old query patterns

### 4. Deprecation Cycle
**Rule:** Breaking changes require 14-day deprecation period with fallback compatibility.

**Process:**
1. **Day 0:** Add new column/table (additive change)
2. **Day 0-14:** Dual-write pattern (write to both old and new)
3. **Day 14:** Notify all teams of upcoming deprecation
4. **Day 14-28:** Monitor old column usage (should decrease to 0)
5. **Day 28:** Remove old column (if usage = 0)

**Example: Renaming Column**
```sql
-- Day 0: Add new column
ALTER TABLE users ADD COLUMN email_address VARCHAR(255);
UPDATE users SET email_address = email; -- Backfill

-- Day 0-14: Dual-write pattern in application code
-- Insert: Write to both email and email_address
-- Update: Update both columns

-- Day 28: Drop old column
ALTER TABLE users DROP COLUMN email; -- After verification
```

### 5. Emergency Rollback
**Rule:** Migration reversal procedure documented for production incidents.

**Rollback Template:**
```sql
-- Rollback for: [Migration Description]
-- Created: [Timestamp]
-- Author: [Developer]

-- Step 1: Verify current state
SELECT column_name FROM information_schema.columns
WHERE table_name = 'table_name';

-- Step 2: Reverse migration
[REVERSE DDL STATEMENTS]

-- Step 3: Verify rollback success
SELECT column_name FROM information_schema.columns
WHERE table_name = 'table_name';

-- Step 4: Document incident
-- [What went wrong, why rollback was needed, lessons learned]
```

## Compliance Validation Checklist

Before applying any migration:

### Schema Change Type
- [ ] Identify change type (ADD COLUMN, CREATE TABLE, ALTER COLUMN, etc.)
- [ ] Verify it's additive OR has 14-day deprecation plan
- [ ] Document rationale for breaking changes (if any)

### Backwards Compatibility
- [ ] New columns have DEFAULT values OR are nullable
- [ ] New tables don't use names conflicting with existing tables
- [ ] Renamed columns use deprecation cycle (dual-write pattern)
- [ ] Dropped columns verified as unused (0 queries in logs)

### Component FK Integrity
- [ ] If creating component table → includes component_id FK
- [ ] If adding FK → references existing table
- [ ] If modifying FK → doesn't break existing references

### Multi-App Impact Analysis
- [ ] List all 7 apps potentially affected
- [ ] For each app: Will old version break? (Should be NO)
- [ ] If YES → implement compatibility layer or dual-write
- [ ] Test each app with new schema in staging

### Rollback Preparation
- [ ] Write reverse migration SQL
- [ ] Test rollback in staging
- [ ] Document rollback procedure
- [ ] Identify rollback trigger conditions (errors, performance degradation)

### Documentation
- [ ] Migration file has descriptive name
- [ ] Comments explain WHY (not just WHAT)
- [ ] Breaking changes documented in ADR-003 exceptions log
- [ ] Team notified via communication channel

## Common Violations

### Violation 1: ALTER COLUMN Without Deprecation
```sql
-- ❌ VIOLATION: Changes column type without deprecation
ALTER TABLE users ALTER COLUMN age TYPE VARCHAR(10);
```

**Fix:**
```sql
-- ✅ COMPLIANT: Add new column, dual-write, deprecate old
ALTER TABLE users ADD COLUMN age_text VARCHAR(10);
UPDATE users SET age_text = age::VARCHAR;
-- [14-day deprecation cycle]
-- ALTER TABLE users DROP COLUMN age; -- After verification
```

### Violation 2: Missing DEFAULT on New Column
```sql
-- ❌ VIOLATION: New column without DEFAULT
ALTER TABLE users ADD COLUMN subscription_tier VARCHAR(50) NOT NULL;
```

**Fix:**
```sql
-- ✅ COMPLIANT: New column with DEFAULT
ALTER TABLE users ADD COLUMN subscription_tier VARCHAR(50) NOT NULL DEFAULT 'free';
```

### Violation 3: Dropping Column Without Verification
```sql
-- ❌ VIOLATION: Dropping column without usage check
ALTER TABLE users DROP COLUMN legacy_id;
```

**Fix:**
```sql
-- ✅ COMPLIANT: Verify usage before drop
-- Step 1: Check application logs for queries using legacy_id
-- Step 2: If usage = 0 for 14 days, proceed
-- Step 3: Document verification in migration comment
ALTER TABLE users DROP COLUMN legacy_id; -- Verified 0 usage in logs
```

### Violation 4: Missing Component FK
```sql
-- ❌ VIOLATION: Component table without component_id
CREATE TABLE video_component (
  id UUID PRIMARY KEY,
  video_url TEXT
);
```

**Fix:**
```sql
-- ✅ COMPLIANT: Includes component_id FK
CREATE TABLE video_component (
  id UUID PRIMARY KEY,
  component_id UUID NOT NULL REFERENCES components(id),
  video_url TEXT
);
```

## ADR-003 Exceptions Log

When breaking changes are unavoidable, document here:

**Template:**
```
### Exception: [Description]
- **Date:** [Timestamp]
- **Migration:** [Migration file name]
- **Violation:** [Which ADR-003 rule violated]
- **Justification:** [Why exception is necessary]
- **Mitigation:** [How breaking change was handled]
- **Impact:** [Which apps affected, how tested]
- **Approval:** [Who approved exception]
```

## Enforcement

**Pre-Migration:**
- ADR-003 checklist must be completed
- Breaking changes require exception approval
- Multi-app testing required for all schema changes

**Post-Migration:**
- get_advisors validation (0 errors/warnings)
- Monitor application logs for errors
- Track old column usage during deprecation cycle

**Violations:**
- Rollback non-compliant migrations immediately
- Document violation in lessons learned
- Update checklist to prevent recurrence
