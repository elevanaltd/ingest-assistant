# Sync Coordination Docs: $ARGUMENTS

Synchronize coordination/governance documentation using a dedicated worktree to avoid contaminating feature branches with docs changes.

## Overview

This command creates documentation PRs from a clean main base, regardless of your current branch state. Uses git worktree to avoid stash/checkout dance.

## STEP 1: Setup Docs Worktree (One-Time)

```bash
DOCS_WORKTREE="/Volumes/HestAI-docs"
MAIN_REPO="/Volumes/HestAI"

# Check if worktree already exists
if [ -d "$DOCS_WORKTREE" ]; then
  echo "✓ Docs worktree exists at $DOCS_WORKTREE"
else
  echo "Creating docs worktree..."
  cd "$MAIN_REPO"
  git worktree add "$DOCS_WORKTREE" main
  echo "✓ Created docs worktree at $DOCS_WORKTREE"
fi
```

## STEP 2: Prepare Clean Branch

```bash
cd "$DOCS_WORKTREE"

# Ensure we're on latest main
git checkout main
git pull origin main

# Create timestamped docs branch
BRANCH_NAME="docs/sync-$(date +%Y-%m-%d-%H%M)"
git checkout -b "$BRANCH_NAME"
echo "✓ Created branch: $BRANCH_NAME"
```

## STEP 3: Determine Sync Scope

Parse `$ARGUMENTS` to determine what to sync:

| Argument | Scope |
|----------|-------|
| `all` | Full docs/ directory sync |
| `guides` | docs/guides/ only |
| `workflow` | docs/workflow/ only |
| `standards` | docs/standards/ only |
| `agents` | Agent constitutions (.claude/agents/) |
| `templates` | templates/ directory |
| (empty) | Interactive - ask what to sync |

```bash
SYNC_SCOPE="$ARGUMENTS"

if [ -z "$SYNC_SCOPE" ]; then
  echo "No scope specified. Options:"
  echo "  all       - Full documentation sync"
  echo "  guides    - Workflow guides only"
  echo "  workflow  - Workflow definitions only"
  echo "  standards - Standards docs only"
  echo "  agents    - Agent constitutions"
  echo "  templates - Templates"
  echo ""
  echo "Usage: /sync-coord <scope>"
  exit 0
fi

echo "Sync scope: $SYNC_SCOPE"
```

## STEP 4: Make Documentation Changes

**IMPORTANT**: All changes happen in the docs worktree (`/Volumes/HestAI-docs/`), NOT your current working directory.

The agent should now:
1. Navigate to `/Volumes/HestAI-docs/`
2. Make the required documentation changes based on scope
3. Stage changes with `git add`

```bash
cd /Volumes/HestAI-docs

# Example: If scope is "guides"
# Edit files in docs/guides/
# git add docs/guides/

# Example: If scope is "all"
# Edit files across docs/
# git add docs/
```

## STEP 5: Commit and Push

```bash
cd /Volumes/HestAI-docs

# Check for changes
if git diff --cached --quiet; then
  echo "No changes to commit"
  git checkout main
  git branch -d "$BRANCH_NAME"
  exit 0
fi

# Commit with conventional format
git commit -m "docs: Sync $SYNC_SCOPE documentation

Synchronized via /sync-coord command.
Scope: $SYNC_SCOPE
Source: Clean main base

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"

# Push to origin
git push -u origin "$BRANCH_NAME"
echo "✓ Pushed branch: $BRANCH_NAME"
```

## STEP 6: Create Pull Request

```bash
cd /Volumes/HestAI-docs

gh pr create \
  --title "docs: Sync $SYNC_SCOPE documentation" \
  --body "$(cat <<'EOF'
## Summary
Documentation synchronization from `/sync-coord` command.

**Scope:** $SYNC_SCOPE
**Base:** Clean main branch (via worktree)

## Changes
<!-- Agent will list specific changes here -->

## Verification
- [ ] No code changes included
- [ ] Documentation renders correctly
- [ ] Links are valid

---
🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"

echo "✓ PR created"
```

## STEP 7: Return to Original Work

```bash
# The docs worktree stays on the docs branch for any follow-up
# Your original working directory is unchanged

echo ""
echo "=== Sync Complete ==="
echo "Docs PR created from: $DOCS_WORKTREE"
echo "Your working directory is unchanged"
echo ""
echo "To make follow-up changes: cd /Volumes/HestAI-docs"
echo "To clean up after merge: git worktree remove /Volumes/HestAI-docs"
```

## Worktree Management Commands

```bash
# List all worktrees
git worktree list

# Remove docs worktree (after PR merged)
git worktree remove /Volumes/HestAI-docs

# Re-create if needed
git worktree add /Volumes/HestAI-docs main
```

## Usage Examples

```bash
# Sync all documentation
/sync-coord all

# Sync only workflow guides
/sync-coord guides

# Sync agent constitutions
/sync-coord agents

# Interactive (shows options)
/sync-coord
```

## Why Worktree?

| Problem | Worktree Solution |
|---------|-------------------|
| Feature branch has uncommitted code | Docs worktree is independent |
| Don't want to stash/checkout | No context switching needed |
| CI failing on feature branch | Docs PR from clean main |
| Multiple docs updates needed | Worktree persists between syncs |

---

**Execute sync for scope: $ARGUMENTS**
