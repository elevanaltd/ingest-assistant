# Hooks Sync

Bidirectional sync of Claude Code hooks infrastructure with execution validation.

## Usage

```
/hs-hooks-sync [mode] [project]
```

**Modes:**
- `audit` (default) - Show differences with execution risk assessment
- `test` - Validate hooks execute without errors (dry-run)
- `diff` - Show content changes for critical/high-risk files before deployment
- `push` - Copy global → project (with safety gates and pre-deployment testing)
- `pull` - Copy project → global (with validation)
- `sync` - Interactive bidirectional with execution verification

**Push Safety Gates:**
- Blocks deployment of CRITICAL/HIGH risk changes without explicit confirmation
- Requires test validation to pass before deployment
- Shows which files will be deployed

**Example Workflow for High-Risk Push:**
```bash
/hs-hooks-sync audit hestai              # Review what's changing
/hs-hooks-sync diff hestai enforce-doc-naming.sh  # See content changes
/hs-hooks-sync test hestai               # Run validation
/hs-hooks-sync push hestai --confirmed   # Deploy after validation passes
```

**Projects:**
- `hestai` - /Volumes/HestAI/.claude/hooks/
- `eav` - /Volumes/EAV/.claude/hooks/
- `eav-monorepo` - /Volumes/HestAI-Projects/eav-monorepo/.claude/hooks/
- `ingest` - /Volumes/HestAI-Projects/ingest-assistant/.claude/hooks/
- `cep` - /Volumes/HestAI-Projects/eav-cep-assist/.claude/hooks/
- `tests` - /Volumes/HestAI-old/hestai-tests/.claude/hooks/
- `research` - /Volumes/HestAI-old/hestai-research/.claude/hooks/
- `all` - All registered projects

---

## EXECUTION PROTOCOL

When this command is invoked, execute the following steps:

### Step 1: Parse Arguments

```bash
MODE="${1:-audit}"
PROJECT="${2:-all}"

GLOBAL_DIR="$HOME/.claude/hooks"
PROJECTS=(
  "hestai:/Volumes/HestAI/.claude/hooks"
  "eav:/Volumes/EAV/.claude/hooks"
  "eav-monorepo:/Volumes/HestAI-Projects/eav-monorepo/.claude/hooks"
  "ingest:/Volumes/HestAI-Projects/ingest-assistant/.claude/hooks"
  "cep:/Volumes/HestAI-Projects/eav-cep-assist/.claude/hooks"
  "tests:/Volumes/HestAI-old/hestai-tests/.claude/hooks"
  "research:/Volumes/HestAI-old/hestai-research/.claude/hooks"
)

# Hook categories by risk level
CRITICAL_HOOKS=(
  "pre_tool_use/*.ts"
  "user_prompt_submit/*.ts"
  "session_start/*.sh"
)

INFRASTRUCTURE_FILES=(
  "lib/*.ts"
  "config/*"
  "package.json"
  "package-lock.json"
  "tsconfig.json"
  ".env.example"
  "README.md"
)

EXCLUDE_PATTERNS=(
  "*.log"
  "state/*"
  ".DS_Store"
  ".env"
  "node_modules/*"
  ".cache/*"
  "registry.db"
  "registry.db.bak"
)
```

### Step 2: Run Audit with Execution Risk Assessment

For each project, analyze hooks infrastructure:

```bash
# For each file category:
# 1. Compute SHA256 hash (like config-sync)
# 2. Categorize differences
# 3. ADDITIONAL: Assess execution risk

CATEGORIES:
  SAME               - Hashes match (no action needed)
  GLOBAL_ONLY        - File exists only in global (push candidate)
  PROJECT_ONLY       - File exists only in project (pull candidate)
  GLOBAL_NEWER       - Different hashes, global mtime > project mtime
  PROJECT_NEWER      - Different hashes, project mtime > global mtime
  CONFLICT           - Different hashes, mtimes within 60 seconds

RISK_ASSESSMENT:
  CRITICAL           - pre_tool_use/user_prompt_submit execution hooks
  HIGH               - Infrastructure lib/ changes affecting execution
  MODERATE           - Config changes (config/*, tsconfig.json)
  LOW                - Documentation, examples (.env.example, README.md)
```

### Step 3: Generate Risk-Assessed Report

Output format:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CLAUDE HOOKS SYNC AUDIT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📁 PROJECT: {project_name} ({project_path})

✅ SYNCHRONIZED ({count})
   lib/intent-analyzer.ts
   config/intent-analysis-prompt.txt
   ...

⬇️ GLOBAL → PROJECT ({count}) [push candidates]
   🔴 CRITICAL:
      pre_tool_use/skill-activation.ts (global newer by 2 hours)
      → Execution hook modification - REQUIRES TESTING

   🟠 HIGH:
      lib/anthropic-client.ts (global only)
      → Core infrastructure - validate API compatibility

   🟡 MODERATE:
      config/intent-analysis-prompt.txt (global newer by 1 day)
      → Prompt template change - review behavior impact

   🟢 LOW:
      README.md (global newer by 3 days)
      → Documentation update

⬆️ PROJECT → GLOBAL ({count}) [pull candidates]
   🟠 HIGH:
      lib/cache-manager.ts (project newer by 5 hours)
      → Infrastructure improvement - test before global deploy

   🟢 LOW:
      .env.example (project only)
      → Template update

⚠️ CONFLICTS ({count}) [manual review required]
   🔴 CRITICAL:
      user_prompt_submit/skill-activation-prompt.ts
        Global: 2024-12-03 10:30:00 (abc123...)
        Project: 2024-12-03 10:32:00 (def456...)
        → EXECUTION HOOK CONFLICT - manual merge required

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EXECUTION RISK SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔴 CRITICAL risks: {N} (execution hooks modified)
🟠 HIGH risks: {N} (infrastructure changes)
🟡 MODERATE risks: {N} (config/behavior changes)
🟢 LOW risks: {N} (documentation only)

⚠️  RECOMMENDATION:
- Run `/hs-hooks-sync test {project}` BEFORE pushing critical changes
- Review {N} conflicts manually
- Test execution in isolated environment first
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

RECOMMENDED ACTIONS:
1. /hs-hooks-sync test {project}  → Validate hooks execute
2. /hs-hooks-sync push {project}  → Deploy after validation
3. Manual review of {N} CRITICAL conflicts required
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Step 4: Test Mode - Execution Validation

**For `test` mode:**

```bash
# Create temporary test environment
TEST_DIR=$(mktemp -d)
TEST_HOOKS_DIR="$TEST_DIR/.claude/hooks"

# Copy hooks to test environment
cp -R {source_hooks_dir}/* "$TEST_HOOKS_DIR/"

# Install dependencies
cd "$TEST_HOOKS_DIR"
npm install --silent 2>&1 | tee test-install.log

# Run TypeScript compilation check
npx tsc --noEmit 2>&1 | tee test-compile.log
COMPILE_EXIT=$?

# Test each hook with synthetic input
HOOKS_TO_TEST=(
  "user_prompt_submit:skill-activation-prompt.ts"
  "pre_tool_use:*.ts"
  "session_start:*.sh"
)

for HOOK_SPEC in "${HOOKS_TO_TEST[@]}"; do
  HOOK_DIR="${HOOK_SPEC%%:*}"
  HOOK_PATTERN="${HOOK_SPEC##*:}"

  for HOOK_FILE in "$TEST_HOOKS_DIR/$HOOK_DIR"/$HOOK_PATTERN; do
    [ -f "$HOOK_FILE" ] || continue

    echo "Testing: $HOOK_FILE"

    # Generate appropriate synthetic input
    case "$HOOK_DIR" in
      "user_prompt_submit")
        SYNTHETIC_INPUT='{"session_id":"test-sync","prompt":"test validation"}'
        ;;
      "pre_tool_use")
        SYNTHETIC_INPUT='{"tool":"Read","arguments":{"file_path":"test.md"}}'
        ;;
      "session_start")
        SYNTHETIC_INPUT='{"session_id":"test-sync"}'
        ;;
    esac

    # Execute hook with timeout
    if [[ "$HOOK_FILE" == *.ts ]]; then
      timeout 10s bash -c "echo '$SYNTHETIC_INPUT' | npx tsx '$HOOK_FILE'" \
        > "$TEST_DIR/hook-output-$(basename $HOOK_FILE).log" 2>&1
      EXIT_CODE=$?
    elif [[ "$HOOK_FILE" == *.sh ]]; then
      timeout 10s bash "$HOOK_FILE" \
        > "$TEST_DIR/hook-output-$(basename $HOOK_FILE).log" 2>&1
      EXIT_CODE=$?
    fi

    # Record result
    if [ $EXIT_CODE -eq 0 ]; then
      echo "✅ PASS: $(basename $HOOK_FILE)"
    elif [ $EXIT_CODE -eq 124 ]; then
      echo "⏱️  TIMEOUT: $(basename $HOOK_FILE) (exceeded 10s)"
      TEST_FAILURES+=("$(basename $HOOK_FILE): timeout")
    else
      echo "❌ FAIL: $(basename $HOOK_FILE) (exit code: $EXIT_CODE)"
      TEST_FAILURES+=("$(basename $HOOK_FILE): exit $EXIT_CODE")
    fi
  done
done

# Generate test report
cat <<EOF

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
HOOKS EXECUTION VALIDATION REPORT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 TypeScript Compilation: $([ $COMPILE_EXIT -eq 0 ] && echo "✅ PASS" || echo "❌ FAIL")
🧪 Hooks Tested: ${#HOOKS_TO_TEST[@]}
✅ Passed: $((${#HOOKS_TO_TEST[@]} - ${#TEST_FAILURES[@]}))
❌ Failed: ${#TEST_FAILURES[@]}

$(if [ ${#TEST_FAILURES[@]} -gt 0 ]; then
  echo "FAILURES:"
  for FAILURE in "${TEST_FAILURES[@]}"; do
    echo "  - $FAILURE"
  done
fi)

📁 Test artifacts: $TEST_DIR
   - test-compile.log (TypeScript compilation)
   - hook-output-*.log (Individual hook execution)

$(if [ ${#TEST_FAILURES[@]} -eq 0 ] && [ $COMPILE_EXIT -eq 0 ]; then
  echo "🎉 ALL TESTS PASSED - Safe to deploy"
  echo "   Run: /hs-hooks-sync push $PROJECT"
else
  echo "⚠️  DEPLOYMENT BLOCKED - Fix failures before pushing"
  echo "   Review: $TEST_DIR/*.log"
fi)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EOF

# Cleanup (optional - keep for debugging)
# rm -rf "$TEST_DIR"
```

### Step 5: Execute Sync (if mode != audit && mode != test)

**For `push` mode:**

```bash
# MANDATORY: Block push if CRITICAL/HIGH risks without prior test validation
echo "🔍 Evaluating risk level for push operation..."

# Count risk levels from audit
CRITICAL_COUNT=$(audit_output | grep "🔴 CRITICAL:" | wc -l)
HIGH_COUNT=$(audit_output | grep "🟠 HIGH:" | wc -l)

if [ $CRITICAL_COUNT -gt 0 ] || [ $HIGH_COUNT -gt 0 ]; then
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "⚠️  SAFETY GATE: CRITICAL/HIGH RISK DEPLOYMENT DETECTED"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "🔴 CRITICAL risks: $CRITICAL_COUNT files"
  echo "🟠 HIGH risks: $HIGH_COUNT files"
  echo ""

  # Show critical files being deployed
  echo "FILES TO DEPLOY:"
  audit_output | grep -E "(🔴 CRITICAL|🟠 HIGH):" | head -10
  [ $(audit_output | grep -E "(🔴 CRITICAL|🟠 HIGH):" | wc -l) -gt 10 ] && echo "   ... and more"
  echo ""

  echo "MANDATORY SAFETY STEPS:"
  echo "1. Review content changes:"
  echo "   /hs-hooks-sync diff $PROJECT {critical-file-name}"
  echo ""
  echo "2. Run test validation (MANDATORY):"
  echo "   /hs-hooks-sync test $PROJECT"
  echo ""
  echo "3. After test passes, confirm deployment:"
  echo "   /hs-hooks-sync push $PROJECT --confirmed"
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  # Check if --confirmed flag was provided (requires user acknowledgment)
  if [[ "$*" != *"--confirmed"* ]]; then
    echo ""
    echo "❌ DEPLOYMENT BLOCKED"
    echo "   This is a safety gate for high-risk deployments."
    echo "   Follow the steps above to proceed."
    exit 1
  fi

  # If --confirmed provided, run test validation
  echo ""
  echo "⏳ Running pre-deployment test validation..."
  echo ""

  run_test_mode
  TEST_EXIT=$?

  if [ $TEST_EXIT -ne 0 ]; then
    echo ""
    echo "❌ PRE-DEPLOYMENT TEST FAILED - ABORTING PUSH"
    echo "   Review test artifacts and fix issues before re-attempting"
    exit 1
  fi

  echo "✅ Pre-deployment validation passed - proceeding with deployment"
  echo ""
fi

# HESTAI-only governance hooks (do not distribute to other projects)
# Reference: /Volumes/HestAI/reports/813-REPORT-HOOKS-GOVERNANCE-SCOPE-ANALYSIS.md
HESTAI_ONLY_PATTERNS=(
  "enforce-*.sh"
  "*GOVERNANCE*.md"
  "*STEWARDSHIP*.md"
  "AGENT_STEWARDSHIP_*.md"
  "context7_enforcement_gate.sh"
  "activate-anti-manipulation.sh"
  "manipulation-patterns.yml"
)

# Copy global → project for:
# - GLOBAL_ONLY files
# - GLOBAL_NEWER files
# Skip CONFLICT files (require manual resolution)
# Skip HESTAI-only governance for non-HESTAI projects

for file in "${GLOBAL_ONLY[@]}" "${GLOBAL_NEWER[@]}"; do
  # Check if file matches HESTAI-only pattern
  is_hestai_only=false
  for pattern in "${HESTAI_ONLY_PATTERNS[@]}"; do
    if [[ "$file" == $pattern ]]; then
      is_hestai_only=true
      break
    fi
  done

  # Skip governance hooks for non-HESTAI projects
  if [ "$is_hestai_only" = true ] && [ "$PROJECT" != "hestai" ]; then
    echo "   ⚠️  Skipping HESTAI-only governance: $file"
    continue
  fi

  # Proceed with copy
  echo "   Copying: $file"
  cp "$GLOBAL_DIR/$file" "$PROJECT_PATH/$file"
done

# Post-deployment verification
echo "🔍 Verifying deployment..."
cd {project_hooks_dir}
npm install --silent
npx tsc --noEmit

if [ $? -eq 0 ]; then
  echo "✅ Deployment verified - hooks functional"
else
  echo "❌ DEPLOYMENT VERIFICATION FAILED"
  echo "   Hooks may not execute correctly"
  echo "   Review compilation errors and fix"
fi
```

**For `pull` mode:**

```bash
# MANDATORY: Validate project hooks before pulling to global
echo "⚠️  Validating project hooks before global deployment..."

run_test_mode_on_project

if [ $TEST_EXIT_CODE -ne 0 ]; then
  echo "❌ PROJECT HOOKS VALIDATION FAILED"
  echo "   Cannot pull broken hooks to global"
  echo "   Fix project issues first"
  exit 1
fi

echo "✅ Project hooks validated"

# Copy project → global for:
# - PROJECT_ONLY files (after validation)
# - PROJECT_NEWER files (after validation)
# Skip CONFLICT files

# Post-pull: Test global hooks
echo "🔍 Verifying global hooks after pull..."
cd "$GLOBAL_DIR"
npm install --silent
npx tsc --noEmit

if [ $? -eq 0 ]; then
  echo "✅ Global hooks verified"
  echo "📢 REMINDER: Push to other projects with /hs-hooks-sync push all"
else
  echo "❌ GLOBAL VERIFICATION FAILED"
  echo "   May need to revert pull"
fi
```

**For `sync` mode:**

```bash
# Interactive: for each difference, show:
# - File path and risk level
# - Diff preview (for code changes)
# - Execution impact description

for DIFF_FILE in "${DIFF_FILES[@]}"; do
  RISK_LEVEL=$(assess_risk "$DIFF_FILE")

  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "File: $DIFF_FILE"
  echo "Risk: $RISK_LEVEL"
  echo ""
  echo "Diff preview:"
  diff -u "global/$DIFF_FILE" "project/$DIFF_FILE" | head -20
  echo ""
  echo "Actions:"
  echo "  [p] Push global → project"
  echo "  [u] Pull project → global (upstream)"
  echo "  [d] Show full diff"
  echo "  [t] Test this change"
  echo "  [s] Skip"
  echo ""
  read -p "Choose action: " ACTION

  case "$ACTION" in
    p)
      if [[ "$RISK_LEVEL" =~ CRITICAL|HIGH ]]; then
        echo "⚠️  Testing before push..."
        test_single_file "$DIFF_FILE" "global"
        [ $? -eq 0 ] && copy_file "global" "project" "$DIFF_FILE"
      else
        copy_file "global" "project" "$DIFF_FILE"
      fi
      ;;
    u)
      echo "⚠️  Testing before pull..."
      test_single_file "$DIFF_FILE" "project"
      [ $? -eq 0 ] && copy_file "project" "global" "$DIFF_FILE"
      ;;
    d)
      diff -u "global/$DIFF_FILE" "project/$DIFF_FILE" | less
      ;;
    t)
      test_single_file "$DIFF_FILE" "both"
      ;;
    s)
      echo "Skipped"
      ;;
  esac
done
```

### Step 5b: Diff Mode - Content Review

**For `diff` mode:**

```bash
# Show content changes for critical/high-risk files before deployment
# Usage: /hs-hooks-sync diff {project} {filename}

GLOBAL_DIR="$HOME/.claude/hooks"
PROJECT_DIR="{project_path}/.claude/hooks"

TARGET_FILE="$1"  # e.g., "enforce-doc-naming.sh"

if [ -z "$TARGET_FILE" ]; then
  echo "❌ Usage: /hs-hooks-sync diff {project} {filename}"
  echo ""
  echo "Examples:"
  echo "  /hs-hooks-sync diff hestai enforce-doc-naming.sh"
  echo "  /hs-hooks-sync diff eav lib/registry-helpers.sh"
  exit 1
fi

GLOBAL_FILE="$GLOBAL_DIR/$TARGET_FILE"
PROJECT_FILE="$PROJECT_DIR/$TARGET_FILE"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "CONTENT DIFF: $TARGET_FILE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ -f "$GLOBAL_FILE" ] && [ -f "$PROJECT_FILE" ]; then
  # Show file stats
  GLOBAL_SIZE=$(stat -f %z "$GLOBAL_FILE" 2>/dev/null)
  PROJECT_SIZE=$(stat -f %z "$PROJECT_FILE" 2>/dev/null)
  GLOBAL_DATE=$(stat -f "%Sm" -t "%Y-%m-%d %H:%M:%S" "$GLOBAL_FILE")
  PROJECT_DATE=$(stat -f "%Sm" -t "%Y-%m-%d %H:%M:%S" "$PROJECT_FILE")

  echo "Global:  $GLOBAL_DATE ($GLOBAL_SIZE bytes)"
  echo "Project: $PROJECT_DATE ($PROJECT_SIZE bytes)"
  echo ""

  # Show diff
  if diff -q "$GLOBAL_FILE" "$PROJECT_FILE" > /dev/null 2>&1; then
    echo "✅ FILES ARE IDENTICAL - No changes to deploy"
  else
    echo "❌ FILES DIFFER - Showing changes:"
    echo ""
    diff -u "$PROJECT_FILE" "$GLOBAL_FILE" | head -100

    DIFF_LINES=$(diff -u "$PROJECT_FILE" "$GLOBAL_FILE" | wc -l)
    if [ $DIFF_LINES -gt 100 ]; then
      echo ""
      echo "... (diff continues, showing first 100 lines)"
      echo ""
      echo "Total diff lines: $DIFF_LINES"
    fi
  fi
elif [ -f "$GLOBAL_FILE" ]; then
  echo "⚠️  File exists in global only - will be ADDED to project"
  echo ""
  echo "Global size: $GLOBAL_SIZE bytes"
elif [ -f "$PROJECT_FILE" ]; then
  echo "⚠️  File exists in project only - will be REMOVED during push"
  echo ""
  echo "Project size: $PROJECT_SIZE bytes"
else
  echo "❌ File not found in either location"
  exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
```

### Step 6: Post-Sync Actions

After any sync:

```bash
# 1. Show what was changed
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "CHANGES APPLIED"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
for CHANGE in "${APPLIED_CHANGES[@]}"; do
  echo "$CHANGE"
done
echo ""

# 2. Remind to commit
echo "📝 NEXT STEPS:"
echo ""
echo "1. Review changes and commit in affected repositories:"
for REPO in "${AFFECTED_REPOS[@]}"; do
  echo "   cd $REPO"
  echo "   git status"
  echo "   git add .claude/hooks/"
  echo "   git commit -m 'chore(hooks): Sync hooks infrastructure'"
  echo ""
done

# 3. If pulled to global, remind to push to other projects
if [ "$MODE" = "pull" ]; then
  echo "2. Distribute to other projects:"
  echo "   /hs-hooks-sync push all"
  echo ""
fi

# 4. Execution verification reminder
echo "3. Verify hooks execute correctly:"
echo "   - Start new Claude Code session"
echo "   - Test with simple prompt"
echo "   - Check hook output appears"
echo ""

# 5. Risk-specific reminders
if [[ "${APPLIED_CHANGES[*]}" =~ CRITICAL|HIGH ]]; then
  echo "⚠️  CRITICAL/HIGH RISK CHANGES APPLIED"
  echo "   - Test in isolated environment first"
  echo "   - Monitor for execution errors"
  echo "   - Have rollback plan ready"
  echo ""
fi
```

---

## HOOK DISTRIBUTION RULES

Not all hooks should go to all projects. Use this matrix:

```
UNIVERSAL (all projects):
  Infrastructure:
    - lib/*.ts (all infrastructure modules)
    - config/* (configuration templates)
    - package.json, package-lock.json, tsconfig.json
    - .env.example
    - README.md

  Core Hooks:
    - user_prompt_submit/skill-activation-prompt.ts
    - session_start/install-deps.sh

PROJECT-SPECIFIC (Never Sync):
  - .env (contains API keys - NEVER sync)
  - state/* (session-specific runtime state)
  - .cache/* (cached intent analysis)
  - registry.db (project-specific registry)
  - *.log files
  - node_modules/ (installed dependencies)

HESTAI-ONLY:
  - enforcement hooks (enforce-*.sh)
  - governance hooks (enforce-doc-governance.sh, etc.)
  - HOOK-SYSTEM-SUMMARY.md
  - INFRASTRUCTURE-EXEMPTIONS.md

CONDITIONAL (based on project needs):
  - Custom pre_tool_use hooks
  - Project-specific validation hooks
```

---

## SAFETY CONSTRAINTS

### Critical Safety Rules

1. **NEVER sync `.env` files** - Contains API keys
2. **NEVER sync `state/` directories** - Session-specific data
3. **NEVER sync `node_modules/`** - Installed dependencies
4. **ALWAYS test CRITICAL/HIGH changes** before deployment
5. **ALWAYS validate TypeScript compilation** after sync
6. **ALWAYS preserve project-specific hooks**

### Pre-Deployment Validation Requirements

```
RISK_LEVEL          VALIDATION_REQUIRED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CRITICAL            - Full test suite execution
                    - Manual execution verification
                    - Rollback plan documented

HIGH                - TypeScript compilation
                    - Synthetic input testing
                    - Execution timeout check

MODERATE            - TypeScript compilation
                    - Syntax validation

LOW                 - None (documentation/examples)
```

### Rollback Protocol

If hooks break after sync:

```bash
# 1. Immediate rollback from git
cd {affected_project}/.claude/hooks
git checkout HEAD~1 -- .

# 2. Reinstall dependencies
npm install

# 3. Verify rollback
npx tsc --noEmit

# 4. Test execution
echo '{"session_id":"rollback-test","prompt":"test"}' | \
  npx tsx user_prompt_submit/skill-activation-prompt.ts

# 5. Report issue
echo "Hooks sync caused failure - rolled back to previous version"
echo "Investigation required before re-attempting sync"
```

---

## EXAMPLE INVOCATIONS

```bash
# Audit all projects (default)
/hs-hooks-sync

# Audit specific project with risk assessment
/hs-hooks-sync audit eav

# Test hooks execution before deployment
/hs-hooks-sync test hestai

# Push global to project (with pre-deployment testing)
/hs-hooks-sync push eav-monorepo

# Pull upstream improvements from project (with validation)
/hs-hooks-sync pull hestai

# Interactive sync with execution verification
/hs-hooks-sync sync ingest

# Push to all projects (with testing for each)
/hs-hooks-sync push all
```

---

## TROUBLESHOOTING

### Sync Failures

**TypeScript compilation errors after sync:**
```bash
# Check what changed
cd {project}/.claude/hooks
git diff HEAD~1

# Review compilation errors
npx tsc --noEmit

# Rollback if needed
git checkout HEAD~1 -- .
npm install
```

**Hooks not executing after sync:**
```bash
# Verify dependencies installed
cd {project}/.claude/hooks
npm install

# Test manually
echo '{"session_id":"debug","prompt":"test"}' | \
  npx tsx user_prompt_submit/skill-activation-prompt.ts

# Check permissions
ls -la user_prompt_submit/*.ts
```

**Conflicts during sync:**
```bash
# View both versions
diff -u ~/.claude/hooks/{file} {project}/.claude/hooks/{file}

# Manual merge required - pick best of both
# Then mark as resolved and re-sync
```

### Test Mode Failures

**Hook execution timeout:**
- Hook may have infinite loop or blocking operation
- Review hook logic before deploying
- Consider adding timeout protection in hook itself

**Synthetic input rejected:**
- Hook may require more complex/realistic input
- Adjust SYNTHETIC_INPUT in test protocol
- Test with actual session data

**Dependencies missing:**
- Ensure package.json includes all required deps
- Run `npm install` in test environment
- Check for peer dependency issues

---

## DESIGN RATIONALE

### Why Separate from Config-Sync?

**BLAST_RADIUS**:
- Config errors → suboptimal agent performance
- Hook errors → system-wide execution failure

**TESTING_REQUIREMENTS**:
- Agents/skills → file comparison sufficient
- Hooks → execution validation mandatory

**RISK_PROFILE**:
- Config → declarative, low risk
- Hooks → imperative, high risk

**RECOVERY_COMPLEXITY**:
- Config → easy to revert/fix
- Hooks → harder to diagnose corruption

### Safety-First Design

Every sync operation includes:
1. Risk assessment before action
2. Execution validation for critical changes
3. Rollback documentation
4. Post-deployment verification
5. Project-specific preservation

**PRINCIPLE**: "Hooks modify system behavior - treat with surgical precision"

---

## INTEGRATION WITH CONFIG-SYNC

These commands work together:

```bash
# Full infrastructure sync workflow:

# 1. Sync declarative config (agents/skills/commands)
/config-sync audit all
/config-sync push all

# 2. Sync imperative infrastructure (hooks)
/hs-hooks-sync audit all
/hs-hooks-sync test all          # ⚠️ MANDATORY before push
/hs-hooks-sync push all

# 3. Verify complete system
cd {project}
git status
# Review all changes together before committing
```

**Separation maintains clarity**: Config vs behavior changes are distinct concerns.

---

## HOOKS WIRING: Setting Up Hooks After Sync

After pushing hooks to a project, you must register them in `.claude/settings.json` for them to actually fire. This is a **separate manual step** - syncing files doesn't automatically activate them.

### Why Separate Step Required?

- **Execution control**: Projects only run hooks they explicitly register
- **Selective activation**: Different projects may need different subsets of hooks
- **Safety**: Prevents accidentally activating experimental/broken hooks
- **Version control**: Hook registration is project config, not global infrastructure

### Hook Categories and Registration

**SessionStart hooks** (fire when session begins):
```json
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/session_start/setup-dependencies.sh"
          }
        ]
      }
    ]
  }
}
```

**UserPromptSubmit hooks** (fire after each user message):
```json
{
  "hooks": {
    "UserPromptSubmit": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/user_prompt_submit/skill-activation-hook.sh"
          }
        ]
      }
    ]
  }
}
```

**PreToolUse hooks** (fire before tool execution):
```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Write|Edit|MultiEdit",
        "hooks": [
          {
            "type": "command",
            "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/enforce-doc-naming.sh"
          }
        ]
      },
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/enforce-ci-consistency.sh"
          }
        ]
      }
    ]
  }
}
```

**PostToolUse hooks** (fire after tool execution):
```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write",
        "hooks": [
          {
            "type": "command",
            "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/update-doc-registry.sh"
          }
        ]
      }
    ]
  }
}
```

### Hook Configuration Reference

- **matcher**: Filters by tool name (e.g., "Write", "Bash", "Read|Execute")
  - Empty string = matches all tools
  - Multiple tools = use pipe separator: `"Write|Edit|MultiEdit"`
  - Pattern matching per Claude Code implementation

- **type**: Always "command" for shell-based hooks

- **command**: Full path to hook script
  - Use `"$CLAUDE_PROJECT_DIR"` for project-relative paths
  - Scripts can be `.sh` (shell) or `.ts` (TypeScript)

### Common Hook Patterns

**File modification hooks** (Write/Edit tools):
```json
{
  "matcher": "Write|Edit|MultiEdit",
  "hooks": [
    { "type": "command", "command": ".../.claude/hooks/enforce-doc-naming.sh" },
    { "type": "command", "command": ".../.claude/hooks/validate-file-format.sh" }
  ]
}
```

**Bash execution hooks** (Bash tool):
```json
{
  "matcher": "Bash",
  "hooks": [
    { "type": "command", "command": ".../.claude/hooks/enforce-ci-consistency.sh" }
  ]
}
```

**All-tools hooks** (execution validation):
```json
{
  "matcher": "",  // Empty = all tools
  "hooks": [
    { "type": "command", "command": ".../.claude/hooks/execution-audit.sh" }
  ]
}
```

### After Syncing Hooks: Configuration Checklist

1. **Review new hooks** that were synced:
   ```bash
   git diff .claude/hooks/
   ```

2. **Edit `.claude/settings.json`** to register hooks you want to activate:
   - Add PreToolUse hooks for file writing validation
   - Add SessionStart hooks for initialization
   - Add UserPromptSubmit hooks for intent analysis
   - Add PostToolUse hooks for state updates

3. **Test hook activation**:
   ```bash
   # Start new session
   # Test with a Write operation
   # Verify hook output appears in console
   ```

4. **Commit registration**:
   ```bash
   git add .claude/settings.json
   git commit -m "chore(hooks): Register enforcement and governance hooks"
   ```

### Troubleshooting Hook Registration

**Hooks not firing:**
- Verify hook path in settings.json matches actual file
- Check hook script has execute permissions: `chmod +x .claude/hooks/*.sh`
- Ensure matcher correctly filters target tool
- Restart Claude Code session after editing settings.json

**Hook produces errors:**
- Review hook output in console
- Test hook manually: `bash .claude/hooks/enforce-doc-naming.sh`
- Check hook dependencies are installed: `npm ls` in .claude/hooks/

**Hook timing issues:**
- PreToolUse fires before tool execution
- PostToolUse fires after tool execution
- SessionStart fires once per session
- UserPromptSubmit fires per user message

---

## COMPLETE WORKFLOW: From Sync to Activation

```bash
# Step 1: Audit changes
/hs-hooks-sync audit hestai

# Step 2: Review critical changes (optional)
/hs-hooks-sync diff hestai enforce-doc-naming.sh

# Step 3: Test execution
/hs-hooks-sync test hestai

# Step 4: Deploy with confirmation
/hs-hooks-sync push hestai --confirmed

# Step 5: Register hooks in project
# Edit /Volumes/HestAI/.claude/settings.json
# Add PreToolUse, SessionStart, etc. hook entries

# Step 6: Verify activation
# Start new session
# Test with Write tool
# Check that hooks fire and report output
```
