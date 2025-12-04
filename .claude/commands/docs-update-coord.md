# Sync Coordination: $ARGUMENTS

Update coordination docs with session context and push to remote.

## STEP 1: Detect Context

```bash
REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null)
if [ -z "$REPO_ROOT" ]; then
  echo "❌ Not in a git repository"
  exit 1
fi

REPO_NAME=$(basename "$REPO_ROOT")
CURRENT_BRANCH=$(git branch --show-current)
echo "📁 Repository: $REPO_NAME"
echo "🌿 Branch: $CURRENT_BRANCH"

cd "$REPO_ROOT"

# Detect coordination structure
COORD_DIR=""
[ -d ".coord" ] && COORD_DIR=".coord"
[ -d "coordination" ] && COORD_DIR="${COORD_DIR:-coordination}"
[ -d "docs" ] && COORD_DIR="${COORD_DIR:-docs}"

if [ -z "$COORD_DIR" ]; then
  echo "ℹ️  No coordination directory (.coord/, coordination/, docs/)"
  exit 0
fi
echo "📂 Coordination: $COORD_DIR/"

# Check for protected branch
ON_PROTECTED=false
[ "$CURRENT_BRANCH" = "main" ] || [ "$CURRENT_BRANCH" = "master" ] && ON_PROTECTED=true
[ "$ON_PROTECTED" = true ] && echo "⚠️  On protected branch - will create docs branch"
```

## STEP 2: Analyze Session Work

Review recent work to inform documentation updates.

```bash
echo ""
echo "=== Session Analysis ==="

# Recent commits
echo "Recent commits:"
git log --oneline -5 2>/dev/null || echo "(none)"

# Changed files
echo ""
echo "Changed files (last 5 commits):"
git diff --name-only HEAD~5 2>/dev/null | head -10 || git diff --name-only | head -10
```

## STEP 3: Update Coordination Docs

**Agent Task**: Based on session analysis, update relevant coordination docs.

### Documents to Consider

| Document | When to Update | Limit |
|----------|----------------|-------|
| `*-CONTEXT.md` | Every session | 50 lines |
| `*-CHECKLIST.md` | Tasks completed | Mark [x] |
| `*-HISTORY.md` | Significant work | 15 lines/session |
| `*-ROADMAP.md` | Phase transitions | As needed |

### Compression Patterns

```octave
DECISIONS::"[YYYY-MM-DD] context→choice→rationale"
BLOCKERS::"task⊗blocker⊗resolution"
LEARNINGS::"problem⇒solution⇒wisdom"
WORK_ITEMS::"domain::task→status→next"
QUALITY::"QG: TypeScript✅ Lint✅ Tests✅ Build✅"
```

### Significance Filter

```octave
ALWAYS_DOCUMENT::[
  architectural_decisions,
  security_changes,
  phase_milestones,
  critical_learnings,
  user_validations
]

SKIP::[
  minor_typos,
  formatting_only,
  routine_dependency_updates
]
```

### Size Enforcement

- **CONTEXT docs**: Replace old completed work with new. Max 50 lines.
- **HISTORY docs**: Append new session. Max 15 lines per session.
- **CHECKLIST docs**: Archive when >80% complete. Create fresh.

## STEP 4: Stage Changes

```bash
echo ""
echo "=== Documentation Changes ==="

# Check for changes in coordination directories
COORD_CHANGES=$(git status --porcelain "$COORD_DIR" 2>/dev/null)
ROOT_DOCS=$(git status --porcelain "*.md" 2>/dev/null)

if [ -z "$COORD_CHANGES" ] && [ -z "$ROOT_DOCS" ]; then
  echo "ℹ️  No documentation changes to sync"

  # Check for unpushed commits
  UPSTREAM=$(git rev-parse --abbrev-ref @{upstream} 2>/dev/null)
  if [ -n "$UPSTREAM" ]; then
    UNPUSHED=$(git log "$UPSTREAM"..HEAD --oneline -- "$COORD_DIR" "*.md" 2>/dev/null)
    if [ -n "$UNPUSHED" ]; then
      echo ""
      echo "⬆️  Unpushed doc commits:"
      echo "$UNPUSHED"
    fi
  fi
else
  echo "Changes to commit:"
  [ -n "$COORD_CHANGES" ] && echo "$COORD_CHANGES"
  [ -n "$ROOT_DOCS" ] && echo "$ROOT_DOCS"
fi
```

## STEP 5: Handle Protected Branch

```bash
if [ "$ON_PROTECTED" = true ] && [ -n "$COORD_CHANGES$ROOT_DOCS" ]; then
  DOCS_BRANCH="docs/sync-$(date +%Y%m%d-%H%M)"
  echo ""
  echo "Creating docs branch: $DOCS_BRANCH"
  git checkout -b "$DOCS_BRANCH"
  CURRENT_BRANCH="$DOCS_BRANCH"
fi
```

## STEP 6: Commit and Push

```bash
if [ -n "$COORD_CHANGES$ROOT_DOCS" ]; then
  # Stage docs
  git add "$COORD_DIR/" *.md 2>/dev/null

  # Use argument as summary, or default
  SUMMARY="${ARGUMENTS:-Session documentation sync}"

  git commit -m "docs: $SUMMARY

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"

  echo "✅ Committed"
fi

# Push
UPSTREAM=$(git rev-parse --abbrev-ref @{upstream} 2>/dev/null)
if [ -z "$UPSTREAM" ]; then
  git push -u origin "$CURRENT_BRANCH"
else
  git push
fi
echo "✅ Pushed"

# PR hint for docs branches
if [[ "$CURRENT_BRANCH" == docs/* ]]; then
  echo ""
  echo "📝 Create PR: gh pr create --title 'docs: $SUMMARY'"
fi

echo ""
echo "=== Sync Complete ==="
```

---

## Usage

```bash
# Sync with auto summary
/sync-coord

# Sync with custom summary (becomes commit message)
/sync-coord "Completed auth migration"

# Sync with descriptive summary
/sync-coord "Fixed RLS policies, updated checklist"
```

## Workflow

```
1. Analyze session → git log, diff
2. Update docs → CONTEXT, CHECKLIST, HISTORY
3. Apply compression → 50-line/15-line limits
4. Handle protected branch → create docs/* branch if needed
5. Commit → conventional message with summary
6. Push → to current or new branch
7. Hint PR → if on docs/* branch
```

---

**Execute sync for: $ARGUMENTS**
