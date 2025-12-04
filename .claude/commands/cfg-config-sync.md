# Config Sync

Bidirectional sync between global `~/.claude/` and project `.claude/` directories.

## Usage

```
/config-sync [mode] [project]
```

**Modes:**
- `audit` (default) - Show differences without changes
- `push` - Copy global → project (distribute canonical)
- `pull` - Copy project → global (upstream discoveries)
- `sync` - Interactive bidirectional

**Projects:**
- `hestai` - /Volumes/HestAI/.claude/
- `eav` - /Volumes/EAV/.claude/
- `eav-monorepo` - /Volumes/HestAI-Projects/eav-monorepo/.claude/
- `ingest` - /Volumes/HestAI-Projects/ingest-assistant/.claude/
- `cep` - /Volumes/HestAI-Projects/eav-cep-assist/.claude/
- `tests` - /Volumes/HestAI-old/hestai-tests/.claude/
- `research` - /Volumes/HestAI-old/hestai-research/.claude/
- `all` - All registered projects

---

## EXECUTION PROTOCOL

When this command is invoked, execute the following steps:

### Step 1: Parse Arguments

```bash
MODE="${1:-audit}"
PROJECT="${2:-all}"

GLOBAL_DIR="$HOME/.claude"
PROJECTS=(
  "hestai:/Volumes/HestAI/.claude"
  "eav:/Volumes/EAV/.claude"
  "eav-monorepo:/Volumes/HestAI-Projects/eav-monorepo/.claude"
  "ingest:/Volumes/HestAI-Projects/ingest-assistant/.claude"
  "cep:/Volumes/HestAI-Projects/eav-cep-assist/.claude"
  "tests:/Volumes/HestAI-old/hestai-tests/.claude"
  "research:/Volumes/HestAI-old/hestai-research/.claude"
)

SYNC_DIRS=("agents" "skills" "commands")
EXCLUDE_PATTERNS=("*.log" "state/*" "settings*.json" ".DS_Store" "_archive/*")
```

### Step 2: Run Audit for Each Project

For each project, compare files in `agents/`, `skills/`, and `commands/`:

```bash
# For each sync directory and each file:
# 1. Compute SHA256 hash of global version
# 2. Compute SHA256 hash of project version
# 3. Categorize:

CATEGORIES:
  SAME           - Hashes match (no action needed)
  GLOBAL_ONLY    - File exists only in global (push candidate)
  PROJECT_ONLY   - File exists only in project (pull candidate or project-specific)
  GLOBAL_NEWER   - Different hashes, global mtime > project mtime
  PROJECT_NEWER  - Different hashes, project mtime > global mtime (UPSTREAM DISCOVERY)
  CONFLICT       - Different hashes, mtimes within 60 seconds (manual review)
```

### Step 3: Generate Report

Output format:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CLAUDE CONFIG SYNC AUDIT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📁 PROJECT: {project_name} ({project_path})

✅ SYNCHRONIZED ({count})
   agents/implementation-lead.oct.md
   skills/build-execution/SKILL.md
   ...

⬇️ GLOBAL → PROJECT ({count}) [push candidates]
   agents/new-agent.oct.md (global only)
   skills/new-skill/SKILL.md (global newer by 2 days)

⬆️ PROJECT → GLOBAL ({count}) [pull candidates - UPSTREAM DISCOVERIES]
   agents/improved-agent.oct.md (project newer by 3 hours)
   skills/web-discovered/SKILL.md (project only)

⚠️ CONFLICTS ({count}) [manual review required]
   agents/disputed-agent.oct.md
     Global: 2024-12-03 10:30:00 (abc123...)
     Project: 2024-12-03 10:32:00 (def456...)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total files: {N}
Synchronized: {N} ✅
Push candidates: {N} ⬇️
Pull candidates: {N} ⬆️
Conflicts: {N} ⚠️

Recommended actions:
- Run `/config-sync push {project}` to distribute {N} files
- Run `/config-sync pull {project}` to upstream {N} discoveries
- Review {N} conflicts manually before syncing
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Step 4: Execute Sync (if mode != audit)

**For `push` mode:**
```bash
# Copy global → project for:
# - GLOBAL_ONLY files (respecting AGENT_DISTRIBUTION rules)
# - GLOBAL_NEWER files
# Skip CONFLICT files (require manual resolution)
# Skip PROJECT_SPECIFIC agents for that project
```

**For `pull` mode:**
```bash
# Copy project → global for:
# - PROJECT_ONLY files (after confirming not project-specific)
# - PROJECT_NEWER files
# Skip CONFLICT files
```

**For `sync` mode:**
```bash
# Interactive: for each difference, ask user:
# - [p]ush global → project
# - [u]pstream project → global
# - [s]kip
# - [d]iff (show difference)
```

### Step 5: Post-Sync Actions

After any sync:
1. Show what was changed
2. Remind user to commit changes in affected repos
3. If pulled to global, remind to push to OTHER projects

---

## AGENT DISTRIBUTION RULES

Not all agents should go to all projects. Use this matrix:

```
UNIVERSAL (all standard projects - 53 agents):
  Core Workflow:
    - implementation-lead, task-decomposer, task-decomposer-validator
    - workspace-architect, completion-architect, solution-steward
    - idea-clarifier, ideator, ideator-catalyst, synthesizer
    - design-architect, visual-architect, north-star-architect
    - sessions-manager, workflow-scope-calibrator, build-plan-checker

  Quality & Validation:
    - critical-engineer, critical-implementation-validator, critical-design-validator
    - code-review-specialist, validator, edge-optimizer, complexity-guard
    - principal-engineer, requirements-steward

  Testing:
    - universal-test-engineer, test-methodology-guardian, test-infrastructure-steward

  Error & Security:
    - error-architect, error-architect-surface, security-specialist

  System & Documentation:
    - system-steward, directory-curator, surveyor, research-analyst

  Orchestration:
    - holistic-orchestrator, ho-liaison, quality-observer

  Tools & Integrations:
    - smartsuite-expert, supabase-expert, vibe-coder
    - octave-specialist, documentation-compressor, semantic-optimizer
    - technical-architect

EAV-ONLY (eav only - 1 agent):
  - accounting-partner

EAV-SHARED (eav, eav-monorepo - 2 agents):
  - eav-admin
  - eav-coherence-oracle

HESTAI-ONLY (hestai only - 8 agents):
  Governance:
    - hestai-doc-steward, coherence-oracle, skills-expert, session-briefer
  Agent Creation:
    - octave-validator, octave-forge-master, subagent-creator
    - compression-fidelity-validator

HESTAI-TESTS-ONLY (tests only - 4 agents):
  - blind-assessor
  - test-curator
  - test-execution-manager
  - test-setup-coordinator

HESTAI-RESEARCH-ONLY (research only - 1 agent):
  - research-curator

PROJECT-SPECIFIC FILES (Never Sync):
  - SUPABASE-SAFETY-SYSTEM.md
  - supabase.yaml
  - settings*.json
  - Project-specific skills (e.g., github-issue-creation, skill-invocation-test)
```

---

## EXAMPLE INVOCATIONS

```bash
# Audit all projects (default)
/config-sync

# Audit specific project
/config-sync audit eav

# Push global to all projects
/config-sync push all

# Pull upstream discoveries from eav-monorepo
/config-sync pull eav-monorepo

# Interactive sync with hestai
/config-sync sync hestai
```
