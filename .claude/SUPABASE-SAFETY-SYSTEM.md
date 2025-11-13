# Supabase Safety System - Hybrid Architecture

**Version:** 2.0.0 (Hybrid Global/Project)
**Last Updated:** 2025-11-07

---

## Overview

This project uses a **hybrid** Supabase safety system that combines:
- **Global hooks** (reusable across all Supabase projects)
- **Project-specific configuration** (this project's settings)
- **Project-specific skills** (advisory guidance with project context)

---

## Architecture

```
Global Components (in ~/.claude/):
├── hooks/pre_tool_use/supabase_migration_guard.sh    [ENFORCEMENT]
└── protocols/SUPABASE-EMERGENCY-PROCEDURES.md        [PROCEDURES]

Project Components (in .claude/):
├── supabase.yaml                                      [CONFIG]
├── hooks/pre_tool_use/supabase_migration_guard.yaml  [REFERENCE]
└── skills/supabase-operations/                       [GUIDANCE]

Integration:
Global Hook → Reads Project Config → Enforces Safety Rules
```

---

## How It Works

### 1. Global Hook (Enforcement Layer)

**Location:** `~/.claude/hooks/pre_tool_use/supabase_migration_guard.sh`

**Function:** Intercepts all `mcp__supabase__apply_migration` and `mcp__supabase__execute_sql` calls

**Auto-Detection:** Reads configuration from:
1. `.claude/supabase.yaml` (preferred - project-specific settings)
2. `supabase/config.toml` (fallback - Supabase CLI config)
3. Warns if no config found (limited validation)

**Benefits:**
- ✅ Write once, use in all Supabase projects
- ✅ Consistent safety enforcement across projects
- ✅ Single source of truth for validation logic
- ✅ Easy updates (change one file, affects all projects)

### 2. Project Configuration

**Location:** `.claude/supabase.yaml`

**Contents:**
```yaml
project_id: zbxvjyrbkycbfhwmmnmy
migrations_dir: supabase/migrations
skill_name: supabase-operations

# Optional overrides:
# custom_destructive_patterns:
#   - "CUSTOM_PATTERN"
# disable_checks:
#   - state_sync
#   - concurrent_indexes
```

**Purpose:**
- Tells global hook which Supabase project to validate against
- Allows project-specific customization (patterns, disabled checks)
- Enables state sync validation (local vs remote migrations)

### 3. Project-Specific Skill

**Location:** `.claude/skills/supabase-operations/`

**Function:** Advisory guidance with project-specific documentation

**Why project-specific?**
- References this project's migration history
- Links to project-specific ADR-003 compliance docs
- Provides context-aware recovery workflows

---

## Usage Across Multiple Projects

### Setting Up a New Supabase Project

The global hook is already installed. For each new project:

1. **Create project config:**
   ```bash
   cat > .claude/supabase.yaml <<EOF
   project_id: YOUR_PROJECT_ID_HERE
   migrations_dir: supabase/migrations
   skill_name: supabase-operations
   EOF
   ```

2. **Copy skill (if needed):**
   ```bash
   # Copy from this project or create new
   cp -r /path/to/eav-monorepo/.claude/skills/supabase-operations .claude/skills/
   ```

3. **Hook automatically works!** No additional setup required.

### What Gets Shared vs. Project-Specific

| Component | Shared (Global) | Project-Specific |
|---|---|---|
| Hook validation logic | ✅ | ❌ |
| Emergency procedures protocol | ✅ | ❌ |
| Project ID | ❌ | ✅ |
| Migrations directory | ❌ | ✅ |
| Custom patterns | ❌ | ✅ |
| Disabled checks | ❌ | ✅ |
| Skill (migration workflow) | ❌ | ✅ |

---

## Safety Guarantees

The global hook prevents:

✅ **Local file missing:** Cannot apply migration without local file
✅ **Uncommitted changes:** Cannot apply uncommitted migrations
✅ **State divergence:** Cannot apply when local/remote out of sync
✅ **Destructive operations:** Requires SAFETY_OVERRIDE comment
✅ **DDL bypass:** Cannot use execute_sql for DDL operations
✅ **Table locks:** Blocks non-concurrent index creation
✅ **ADR-003 violations:** Enforces backwards-compatible pattern

---

## Customization

### Disable Specific Checks (Use with Caution)

Edit `.claude/supabase.yaml`:

```yaml
disable_checks:
  - state_sync        # Skip remote sync validation
  - concurrent_indexes # Allow non-concurrent indexes
```

**Warning:** Disabling checks reduces safety guarantees.

### Add Custom Destructive Patterns

Edit `.claude/supabase.yaml`:

```yaml
custom_destructive_patterns:
  - "ALTER TABLE.*OWNER TO"  # Custom pattern to block
  - "GRANT.*TO public"       # Another custom pattern
```

These patterns are added to the default destructive pattern list.

---

## Testing the Hybrid Setup

### Verify Global Hook is Active

```bash
# Check global hook exists
ls -la ~/.claude/hooks/pre_tool_use/supabase_migration_guard.sh

# Should be executable
# Expected: -rwxr-xr-x ... supabase_migration_guard.sh
```

### Verify Project Config

```bash
# Check project config exists
cat .claude/supabase.yaml

# Should show your project_id
```

### Test Hook Interception

```bash
# Create test migration (but don't commit)
echo "CREATE TABLE test (id UUID);" > supabase/migrations/20251107120000_test.sql

# Try to apply via Claude
# Expected: Hook blocks with "not committed to git" error
```

---

## Troubleshooting

### Hook Not Triggering

**Symptoms:** Migrations apply without validation

**Solutions:**
1. Check global hook exists: `ls ~/.claude/hooks/pre_tool_use/supabase_migration_guard.sh`
2. Check hook is executable: `chmod +x ~/.claude/hooks/pre_tool_use/supabase_migration_guard.sh`
3. Restart Claude Code session (hooks load on startup)

### State Sync Validation Skipped

**Symptoms:** Warning: "State sync validation skipped"

**Causes:**
1. `.claude/supabase.yaml` missing or has no `project_id`
2. Supabase CLI not installed
3. Check disabled in config: `disable_checks: [state_sync]`

**Solutions:**
1. Create/fix `.claude/supabase.yaml` with correct `project_id`
2. Install Supabase CLI: `brew install supabase/tap/supabase`
3. Remove `state_sync` from `disable_checks` if present

### Wrong Project Validated

**Symptoms:** Hook validates against wrong Supabase project

**Cause:** Wrong `project_id` in `.claude/supabase.yaml`

**Solution:**
```bash
# Check current project ID
grep project_id .claude/supabase.yaml

# Get correct project ID from Supabase dashboard
# Update .claude/supabase.yaml with correct ID
```

---

## Migration to Global (Already Done)

This project has already migrated to the hybrid architecture:

✅ Global hook installed at `~/.claude/hooks/pre_tool_use/supabase_migration_guard.sh`
✅ Global protocol at `~/.claude/protocols/SUPABASE-EMERGENCY-PROCEDURES.md`
✅ Project config created at `.claude/supabase.yaml`
✅ Project-specific skill remains at `.claude/skills/supabase-operations/`
✅ Old project-specific hook removed (no longer needed)

---

## Related Documentation

**Global Documentation:**
- `~/.claude/protocols/SUPABASE-EMERGENCY-PROCEDURES.md` - Emergency procedures

**Project Documentation:**
- `.claude/skills/supabase-operations/SKILL.md` - Skill overview
- `.claude/skills/supabase-operations/migration-protocols.md` - 7-step workflow
- `.claude/skills/supabase-operations/state-tracking.md` - Sync validation
- `.coord/test-context/SUPABASE-SAFETY-HOOKS.md` - Architecture details

---

## Benefits of Hybrid Architecture

**For Solo Developer:**
- ✅ Write safety rules once, use everywhere
- ✅ Consistent protection across all projects
- ✅ Easy updates (one file to maintain)
- ✅ Project-specific customization when needed

**For Teams:**
- ✅ Global hook can be organization-wide standard
- ✅ Project configs in version control (team shares same rules)
- ✅ Skills can be project-specific (team context)
- ✅ Emergency procedures standardized

**For Multiple Projects:**
- ✅ Add new project = create one config file
- ✅ Hook automatically protects new project
- ✅ No code duplication across projects
- ✅ Update safety rules = affects all projects immediately

---

## Revision History

| Date | Version | Changes |
|---|---|---|
| 2025-11-07 | 2.0.0 | Migrated to hybrid architecture (global hook + project config) |
| 2025-11-07 | 1.0.0 | Initial project-specific implementation |

---

**Questions or Issues?**

Consult:
- `supabase-operations` skill for migration guidance
- `~/.claude/protocols/SUPABASE-EMERGENCY-PROCEDURES.md` for emergency procedures
- `.coord/test-context/SUPABASE-SAFETY-HOOKS.md` for architecture details
