# FIX (Holistic Fix Orchestration)

## PURPOSE
Meta-orchestrator combining error investigation, TRACED execution, quality validation, and documentation. For **orchestrator roles ONLY** - coordinates specialists through delegation.

## TARGET ROLES
- holistic-orchestrator (primary)
- requirements-steward
- system-steward
- Any coordinator role

## CRITICAL: ORCHESTRATOR BOUNDARIES

**ABSOLUTELY FORBIDDEN:**
- ❌ Writing ANY code (TypeScript, JavaScript, Python, etc.)
- ❌ Editing implementation files directly
- ❌ Creating tests themselves
- ❌ Running commands directly (npm, git, Bash)
- ❌ Investigating errors personally (use tools directly)
- ❌ Fixing bugs themselves
- ❌ Doing specialist work

**ORCHESTRATOR MUST ONLY:**
- ✓ Delegate ALL work via Task()
- ✓ Maintain holistic system overview
- ✓ Monitor specialist progress
- ✓ Ensure TRACED compliance
- ✓ Track progress via TodoWrite
- ✓ Validate cross-boundary coherence
- ✓ Coordinate phase transitions

## INVOCATION
```bash
/fix [context]                              # Holistic fix orchestration
/fix security definer views                 # Natural language description
/fix <paste error logs>                     # Direct error context
/fix highlights moving on typing            # UX regression
/fix test failures in auth module           # Test issues
```

## COMMAND RELATIONSHIP

**Role-Based Selection:**
- **Orchestrator roles** (holistic-orchestrator, requirements-steward, system-steward) → `/fix` (this command)
- **Implementer roles** (implementation-lead, error-architect, completion-architect) → `/fix-self`

**Key Difference:**
- `/fix` → Coordinates via Task() delegation (zero direct implementation)
- `/fix-self` → Executes work directly (investigation + implementation + validation)

## ARCHITECTURAL PATTERN

**Meta-Orchestration Flow**:
```
Investigation → Planning → TRACED Execution → Validation → Documentation
     ↓              ↓              ↓              ↓              ↓
error-architect  task-decomp  implementation  quality-gates  atomic-commit
                              + specialists
```

## EXECUTION PROTOCOL

### STEP 0: Context Analysis & Agent Selection (Intelligence Layer)

```
TodoWrite: "Analyzing issue context for intelligent agent delegation"

# Pattern-based first responder selection
ISSUE_CONTEXT="$ARGUMENTS"

# Delegation Intelligence Matrix
IF (security|vulnerability|RLS|auth|SECURITY_DEFINER|search_path) THEN
  PRIMARY_INVESTIGATOR="critical-engineer"
  SECONDARY_SPECIALIST="security-specialist"
  REVIEW_AUTHORITY="critical-engineer"

ELSE IF (test failures|regression|failing tests) THEN
  PRIMARY_INVESTIGATOR="error-architect-surface"
  ESCALATION_TRIGGER="systemic_issues"
  REVIEW_AUTHORITY="test-methodology-guardian"

ELSE IF (performance|memory|race condition|leak) THEN
  PRIMARY_INVESTIGATOR="critical-engineer"
  SECONDARY_SPECIALIST="technical-architect"
  REVIEW_AUTHORITY="critical-engineer"

ELSE IF (UX|positioning|highlight|rendering|visual) THEN
  PRIMARY_INVESTIGATOR="technical-architect"
  SECONDARY_SPECIALIST="implementation-lead"
  REVIEW_AUTHORITY="code-review-specialist"

ELSE IF (branch|merge|conflict|regression between branches) THEN
  PRIMARY_INVESTIGATOR="technical-architect-sonnet"
  ANALYSIS_TYPE="branch_comparison"
  REVIEW_AUTHORITY="technical-architect"

ELSE IF (architecture|design|system integration) THEN
  PRIMARY_INVESTIGATOR="critical-engineer"
  SECONDARY_SPECIALIST="technical-architect"
  REVIEW_AUTHORITY="critical-engineer"

ELSE
  # Default: error-architect with auto-classification
  PRIMARY_INVESTIGATOR="error-architect"
  SELF_CLASSIFY="simple|complex|escalation"
FI

# Context Sufficiency Check
IF (context_too_vague) THEN
  ASK_USER: "What specifically? (examples: positioning, saving, loading, realtime, security?)"
  WAIT_FOR_CLARIFICATION
FI
```

### STEP 1: Rollback Safety & Preparation

```bash
TodoWrite: "Creating safety backups and preparing workspace"

# Automatic backup before ANY changes
CURRENT_BRANCH=$(git branch --show-current)
FIX_NAME=$(echo "$ISSUE_CONTEXT" | sed 's/[^a-zA-Z0-9]/-/g' | cut -c1-50)
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

# Safety branches
git branch "backup-${FIX_NAME}-${TIMESTAMP}" 2>/dev/null || true
git checkout -b "fix-${FIX_NAME}-${TIMESTAMP}" 2>/dev/null || git checkout "fix-${FIX_NAME}-${TIMESTAMP}"

echo "✓ Safety backup created: backup-${FIX_NAME}-${TIMESTAMP}"
echo "✓ Work branch: fix-${FIX_NAME}-${TIMESTAMP}"

# Rollback procedure documentation
cat > /tmp/fix_rollback_${TIMESTAMP}.md <<EOF
# Rollback Procedure for: $ISSUE_CONTEXT

**Backup Branch**: backup-${FIX_NAME}-${TIMESTAMP}
**Work Branch**: fix-${FIX_NAME}-${TIMESTAMP}
**Original Branch**: ${CURRENT_BRANCH}

**To Rollback**:
\`\`\`bash
git checkout ${CURRENT_BRANCH}
git branch -D fix-${FIX_NAME}-${TIMESTAMP}
git checkout backup-${FIX_NAME}-${TIMESTAMP}
\`\`\`

**Created**: $(date -Iseconds)
EOF

echo "📋 Rollback procedure: /tmp/fix_rollback_${TIMESTAMP}.md"
```

### STEP 2: Investigation (Intelligent Delegation)

```
TodoWrite: "Delegating investigation to ${PRIMARY_INVESTIGATOR}"

Task({
  subagent_type: "${PRIMARY_INVESTIGATOR}",
  prompt: `
    INVESTIGATION REQUIRED:

    **Issue Context**: ${ISSUE_CONTEXT}

    **Your Role**: Root cause analysis and architectural assessment

    **Required Output**:
    1. Root Cause: Specific technical finding
    2. Threat Assessment: Production risk level (CRITICAL/HIGH/MEDIUM/LOW)
    3. Scope: Components/files/systems affected
    4. Fix Complexity: Simple fix vs architectural change
    5. Escalation Needed: holistic-orchestrator required? (yes/no)

    **Context Files** (auto-loaded):
    - .coord/PROJECT-CONTEXT.md
    - .coord/workflow-docs/000-*-D1-NORTH-STAR.md
    - Recent git history (last 10 commits)

    If investigation reveals:
    - Cross-boundary issue → Recommend holistic-orchestrator
    - Architectural change → Recommend technical-architect consultation
    - Constitutional violation → Recommend requirements-steward

    Provide specific, actionable findings (not vague assessments).
  `
})

# Wait for investigation results
# User will see: "🔍 Investigating: {issue_description}"
```

### STEP 3: Escalation Decision Point

```
# Based on investigation results:

IF (investigation.escalation_needed === "holistic-orchestrator") THEN
  echo "⬆️  ESCALATION: Cross-boundary issue detected"
  echo "Delegating to holistic-orchestrator for system-wide coordination..."

  Task({
    subagent_type: "holistic-orchestrator",
    prompt: `
      SYSTEM-WIDE FIX ORCHESTRATION NEEDED:

      **Investigation Results**: ${investigation.findings}
      **Cross-Boundary Impact**: ${investigation.scope}

      Please coordinate fix across affected boundaries using /traced protocol.
      Ensure RACI compliance and phase transition validation.
    `
  })

  EXIT_FIX_COMMAND  # holistic-orchestrator takes over
FI

# Otherwise, continue with local fix orchestration
```

### STEP 4: Constitutional Compliance Gates

```
TodoWrite: "Validating constitutional compliance requirements"

# MANDATORY Pre-Fix Checklist
COMPLIANCE_CHECKLIST="
- [ ] TDD: Failing test will be written FIRST (testguard consultation)
- [ ] Review: Code review specialist scheduled for post-implementation
- [ ] Consult: Required specialists identified (RACI matrix)
- [ ] Quality: All gates configured (lint+typecheck+tests)
- [ ] Documentation: Update plan for CLAUDE.md, PROJECT-CONTEXT.md
"

echo "${COMPLIANCE_CHECKLIST}"

# Check for TDD violations
IF (fix_type !== "configuration_only") THEN
  Task({
    subagent_type: "test-methodology-guardian",
    prompt: `
      TDD COMPLIANCE CHECK:

      **Fix Context**: ${ISSUE_CONTEXT}
      **Investigation**: ${investigation.findings}

      Before implementation proceeds:
      1. Confirm failing test strategy (RED state first)
      2. Validate test reproduces the issue
      3. Ensure test intent is meaningful (not coverage theater)

      BLOCK implementation if TDD protocol not followed.
    `
  })
FI
```

### STEP 5: Fix Planning (Task Decomposition)

```
TodoWrite: "Creating detailed fix plan with atomic steps"

Task({
  subagent_type: "task-decomposer",
  prompt: `
    FIX PLANNING REQUIRED:

    **Issue**: ${ISSUE_CONTEXT}
    **Root Cause**: ${investigation.root_cause}
    **Scope**: ${investigation.scope}

    Create atomic task breakdown following TRACED protocol:

    T - Test First:
      - [ ] Write failing test reproducing issue
      - [ ] Verify test fails (RED state)
      - [ ] Document test intent

    R - Review:
      - [ ] Schedule code-review-specialist for implementation
      - [ ] ${REVIEW_AUTHORITY} for architectural validation

    A - Analyze:
      - [ ] Impact assessment (${SECONDARY_SPECIALIST})
      - [ ] Complexity guard check (if >3 layers)

    C - Consult:
      - [ ] ${PRIMARY_INVESTIGATOR} (already consulted)
      - [ ] requirements-steward (if North Star affected)
      - [ ] testguard (for test modifications)

    E - Execute:
      - [ ] Implementation via implementation-lead
      - [ ] Quality gates: lint → typecheck → tests
      - [ ] Manual UX validation checkpoint

    D - Document:
      - [ ] Update CLAUDE.md (Resolved Issues)
      - [ ] Update PROJECT-CONTEXT.md (Latest Work)
      - [ ] Atomic commit with TRACED evidence

    Provide specific file paths, line numbers, and concrete steps.
  `
})

# Plan output visible to user:
# "📋 Fix Plan (7 steps):"
# "  1. [pending] Write failing test for {issue}"
# "  2. [pending] Implement {solution}"
# ...
```

### STEP 6: TRACED Execution (T→R→A→C→E→D)

```
TodoWrite: "Executing TRACED protocol with specialist delegation"

# T - Test First (RED State Enforcement)
Task({
  subagent_type: "universal-test-engineer",
  prompt: `
    WRITE FAILING TEST (RED STATE):

    **Issue**: ${ISSUE_CONTEXT}
    **Root Cause**: ${investigation.root_cause}
    **Test Strategy**: ${fix_plan.test_strategy}

    Requirements:
    1. Test MUST fail before implementation (prove issue exists)
    2. Assert meaningful behavior (not implementation details)
    3. Document test intent in comments
    4. Use existing test framework patterns

    After writing test:
    - Run test suite to confirm RED state
    - Commit test separately: "TEST: failing test for ${FIX_NAME}"

    Do NOT implement fix yet (RED state required first).
  `
})

# R - Review (Architecture + Implementation)
Task({
  subagent_type: "${REVIEW_AUTHORITY}",
  prompt: `
    ARCHITECTURAL REVIEW (Pre-Implementation):

    **Issue**: ${ISSUE_CONTEXT}
    **Proposed Fix**: ${fix_plan.implementation_strategy}
    **Test Written**: ${test_file_path}

    Review:
    1. Will this fix actually work in production?
    2. Are there hidden failure modes?
    3. Is the approach architecturally sound?
    4. Should we use a simpler solution?

    BLOCK if architectural concerns exist.
    Provide GO/NO-GO with reasoning.
  `
})

# A - Analyze (Impact Assessment)
IF (fix_plan.requires_impact_analysis) THEN
  Task({
    subagent_type: "${SECONDARY_SPECIALIST}",
    prompt: `
      IMPACT ANALYSIS:

      **Fix Scope**: ${fix_plan.affected_components}
      **Proposed Changes**: ${fix_plan.file_modifications}

      Assess:
      1. Breaking changes for existing features?
      2. Performance implications?
      3. Security considerations?
      4. Regression risk areas?

      Provide impact report with risk mitigation strategies.
    `
  })
FI

# C - Consult (Specialist Coordination)
# Auto-triggered by specialists as needed
# complexity-guard if >3 layers
# requirements-steward if North Star affected

# E - Execute Implementation
Task({
  subagent_type: "implementation-lead",
  prompt: `
    IMPLEMENT FIX (GREEN State):

    **Issue**: ${ISSUE_CONTEXT}
    **Failing Test**: ${test_file_path} (currently RED)
    **Fix Plan**: ${fix_plan.implementation_steps}
    **Architectural Approval**: ${review_decision}

    Implementation Requirements:
    1. Make failing test pass (RED → GREEN)
    2. Follow fix plan exactly (no scope creep)
    3. Maintain code quality standards
    4. Add inline comments for complex logic

    After implementation:
    - Run full test suite (must pass)
    - Run lint + typecheck (must pass)
    - Document any deviations from plan

    Commit: "FEAT: ${FIX_NAME}"
  `
})

# E - Execute Quality Gates
Task({
  subagent_type: "quality-observer",
  prompt: `
    QUALITY GATE EXECUTION (ALL must pass):

    1. Lint: npm run lint
    2. TypeCheck: npm run typecheck
    3. Tests: npm run test

    BLOCKING: Any failure stops the process.

    Report:
    - ✅/❌ for each gate
    - Error details if failures
    - Evidence links (CI job, terminal output)

    No shortcuts. No suppression without justification.
  `
})

# D - Document with Evidence
Task({
  subagent_type: "implementation-lead",
  prompt: `
    DOCUMENTATION UPDATE:

    **Fix Completed**: ${FIX_NAME}
    **Files Modified**: ${implementation.files_changed}
    **Quality Gates**: ${quality_gates.results}

    Update (with evidence):

    1. CLAUDE.md → "Resolved Issues" section:
       - Issue: ${ISSUE_CONTEXT}
       - Root Cause: ${investigation.root_cause}
       - Solution: ${fix_plan.summary}
       - Commit: ${git_commit_hash}
       - Tests: ${test_file_path}

    2. PROJECT-CONTEXT.md → "Latest Work" section:
       - Date: $(date -Iseconds)
       - Work: Fixed ${ISSUE_CONTEXT}
       - Agents: ${agents_consulted}
       - Evidence: ${commit_hash}

    3. Atomic Commit Message:
       \`\`\`
       fix: ${FIX_NAME}

       - Root cause: ${investigation.root_cause}
       - Test: ${test_file_path}
       - Quality gates: ✅ lint ✅ typecheck ✅ tests
       - Reviewed by: ${REVIEW_AUTHORITY}

       TRACED compliance:
       T: ${test_commit_hash}
       R: ${review_approval}
       A: ${impact_analysis}
       C: ${specialists_consulted}
       E: ${quality_gates_evidence}
       D: This commit

       🤖 Generated with [Claude Code](https://claude.com/claude-code)

       Co-Authored-By: Claude <noreply@anthropic.com>
       \`\`\`
  `
})
```

### STEP 7: User Validation Loop (Critical Pattern)

```
TodoWrite: "Requesting user validation (trust UX observations)"

# CRITICAL: Tests passing ≠ Fix complete
echo "⏸️  USER VALIDATION CHECKPOINT"
echo ""
echo "Quality Gates Status:"
echo "  ✅ Lint passing"
echo "  ✅ TypeCheck passing"
echo "  ✅ Tests passing (${test_count} tests)"
echo ""
echo "Fix Implementation:"
echo "  - ${fix_plan.summary}"
echo "  - Files modified: ${implementation.files_changed}"
echo "  - Commit: ${git_commit_hash}"
echo ""
echo "🧪 PLEASE TEST THE FIX:"
echo "   ${user_validation_instructions}"
echo ""
echo "Does the fix work correctly? (y/n/needs-work)"

# Wait for user response
READ user_validation

IF (user_validation === "n" || user_validation === "needs-work") THEN
  echo "⚠️  User reports issue not resolved (trusting UX observation)"
  echo "Re-investigating with user feedback..."

  # Trust user over passing tests (learned from branch merge incident)
  Task({
    subagent_type: "error-architect",
    prompt: `
      USER VALIDATION FAILED (tests passing but UX broken):

      **Original Issue**: ${ISSUE_CONTEXT}
      **Fix Applied**: ${fix_plan.summary}
      **Quality Gates**: All passing ✅
      **User Feedback**: Issue not resolved

      CRITICAL: Trust user UX observation over test results.

      Investigate:
      1. What are tests missing?
      2. Is there a regression in related areas?
      3. Branch comparison analysis (if applicable)

      Provide revised fix strategy.
    `
  })

  # Restart fix process with new findings
  GOTO STEP_5  # Re-plan with new information
FI

echo "✅ User validation successful"
```

### STEP 8: Cleanup & Merge

```
TodoWrite: "Merging fix and cleaning up branches"

# User confirmed fix works
echo "🎯 Fix validated. Merging to original branch..."

git checkout ${CURRENT_BRANCH}
git merge "fix-${FIX_NAME}-${TIMESTAMP}" --no-ff -m "Merge fix: ${FIX_NAME}"

# Keep backup for 7 days, delete work branch
git branch -d "fix-${FIX_NAME}-${TIMESTAMP}"
echo "✓ Work branch merged and deleted"
echo "✓ Backup preserved: backup-${FIX_NAME}-${TIMESTAMP} (delete after verification)"
echo ""
echo "To remove backup: git branch -D backup-${FIX_NAME}-${TIMESTAMP}"
```

### STEP 9: Completion Summary

```
TodoWrite: "Fix complete - generating summary"

cat <<SUMMARY
✅ FIX COMPLETE: ${FIX_NAME}

📊 Summary:
   Issue: ${ISSUE_CONTEXT}
   Root Cause: ${investigation.root_cause}
   Solution: ${fix_plan.summary}

🔬 Evidence Trail:
   Investigation: ${PRIMARY_INVESTIGATOR}
   Test: ${test_commit_hash}
   Implementation: ${fix_commit_hash}
   Quality Gates: ✅ lint ✅ typecheck ✅ tests
   User Validation: ✅ Confirmed working

📝 Documentation Updated:
   - CLAUDE.md (Resolved Issues)
   - PROJECT-CONTEXT.md (Latest Work)
   - Atomic commit with TRACED evidence

🎯 Agents Consulted:
   ${agents_consulted_list}

🔄 Rollback Available:
   Branch: backup-${FIX_NAME}-${TIMESTAMP}
   Procedure: /tmp/fix_rollback_${TIMESTAMP}.md

---
Next: Continue with project work or address additional issues.
SUMMARY
```

## ANTI-PATTERNS PREVENTED

**Orchestrator Becoming Doer:**
- Symptom: Edit(), Write(), Bash(), Read() calls from orchestrator
- Prevention: Constitutional boundaries enforced
- Resolution: ALL work delegated via Task()

**Role Confusion:**
- Symptom: Orchestrator trying to implement fixes themselves
- Prevention: ABSOLUTELY FORBIDDEN list at top of command
- Resolution: Use /fix-self if you ARE the implementer

**Skipping TDD:**
- Symptom: Implementation before failing test
- Prevention: Delegate to implementation-lead with TDD mandate
- Resolution: testguard consultation enforced by implementer

**Test Passing ≠ Fix Complete:**
- Symptom: Quality gates pass but UX broken
- Prevention: Mandatory user validation checkpoint
- Resolution: Trust user observations, delegate re-investigation

**Vague Error Context:**
- Symptom: "Something's wrong"
- Prevention: Context sufficiency check (STEP 0)
- Resolution: Ask clarifying questions before delegation

**Insufficient Review:**
- Symptom: Skipping architectural validation
- Prevention: TRACED protocol enforced via specialist delegation
- Resolution: critical-engineer/technical-architect consultation mandatory

**Documentation Debt:**
- Symptom: Fix merged without doc updates
- Prevention: TRACED "D" step delegated to implementation-lead
- Resolution: Auto-update CLAUDE.md, PROJECT-CONTEXT.md via specialist

## USAGE EXAMPLES

**For Orchestrator Roles:**
```bash
# Security vulnerability fix (orchestrator coordinates)
/fix security definer views bypass RLS

# Test failure fix (orchestrator delegates)
/fix auth tests failing with null user error

# UX regression fix (orchestrator coordinates specialists)
/fix highlights moving when typing in comments

# Performance issue fix (orchestrator delegates investigation)
/fix realtime subscription loop causing memory leak

# Branch merge regression (orchestrator coordinates merge)
/fix PR#48 worse than main - missing position fix

# Direct error log paste (orchestrator delegates to error-architect)
/fix "Error: Cannot read property 'id' of undefined at src/auth.ts:123"
```

**For Implementer Roles (use /fix-self instead):**
```bash
# When YOU are the implementer/specialist doing the work:
/fix-self security definer views bypass RLS
/fix-self auth tests failing
/fix-self highlights positioning bug
```

## INTEGRATION WITH EXISTING COMMANDS

**Relationship to /traced:**
- `/fix` = Investigation + Planning + `/traced` execution (orchestrated)
- `/fix` delegates via Task() following `/traced` pattern
- `/fix` adds intelligent delegation layer
- Orchestrators coordinate, specialists execute

**Relationship to /fix-self:**
- `/fix` → Orchestrators coordinate (this command)
- `/fix-self` → Implementers execute (direct work)
- Same workflow, different execution model
- Choose based on YOUR role (coordinator vs implementer)

**Relationship to /error:**
- `/fix` delegates investigation to error-architect via Task()
- `/fix` then orchestrates the actual fix through specialists
- `/error` is for investigation only (no fix orchestration)

**Relationship to /role:**
- `/fix` activates specialists via Task()
- `/role` for manual specialist activation
- `/fix` uses delegation intelligence matrix

## VIOLATION DETECTION

**If orchestrator attempts direct implementation:**
- Hook blocks: `enforce-role-boundaries.sh`
- Error: "ROLE VIOLATION: Orchestrators orchestrate via Task(), they don't implement"
- Redirect: Use Task() for ALL work, or switch to /fix-self if you ARE the implementer

**Correct Patterns:**

**WRONG (Orchestrator doing work):**
```javascript
Edit('src/auth.ts', ...)              // Direct implementation - BLOCKED
Write('test.ts', ...)                 // Creating files - BLOCKED
Bash('npm run test')                  // Running commands - BLOCKED
Read('src/module.ts')                 // Direct investigation - BLOCKED
Grep('pattern', path: 'src/')        // Direct search - BLOCKED
```

**RIGHT (Orchestrator delegating):**
```javascript
Task({
  subagent_type: "implementation-lead",
  prompt: "Fix auth bug in src/auth.ts following TRACED"
})

Task({
  subagent_type: "error-architect",
  prompt: "Investigate root cause of auth failure with logs: ${logs}"
})

Task({
  subagent_type: "quality-observer",
  prompt: "Execute quality gates: npm run lint && typecheck && test"
})

Task({
  subagent_type: "universal-test-engineer",
  prompt: "Write failing test reproducing auth issue"
})
```

## ESCALATION TO HOLISTIC-ORCHESTRATOR

**When /fix escalates:**
- Cross-boundary issues detected
- Architectural changes needed
- Multiple systems affected
- Constitutional violations

**What happens:**
- holistic-orchestrator takes over coordination
- /fix command exits gracefully
- Orchestrator uses /traced for system-wide execution

## CONSTITUTIONAL COMPLIANCE

**TRACED Protocol**: Mandatory for all fixes
**RACI Enforcement**: Specialists accountable for domains
**Quality Gates**: No shortcuts (lint + typecheck + tests)
**TDD Discipline**: RED → GREEN → REFACTOR (testguard enforced)
**Documentation**: Evidence trail required

## SUCCESS CRITERIA

- ✅ Root cause identified (evidence-based)
- ✅ Failing test written first (RED state)
- ✅ Fix implemented (GREEN state)
- ✅ Quality gates passing (all three)
- ✅ User validation successful (UX confirmed)
- ✅ Documentation updated (with evidence)
- ✅ Atomic commit created (TRACED compliance)
- ✅ Rollback procedure documented

---

**MISSION:** Holistic fix orchestration combining investigation, planning, TRACED execution, validation, and documentation. Constitutional compliance enforced. User validation trusted over test results.
