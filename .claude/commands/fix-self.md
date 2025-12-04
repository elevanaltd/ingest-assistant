# FIX-SELF (Self-Execution Fix Mode)

## PURPOSE
Execute fix work yourself following TRACED discipline with investigation. For **implementers and specialists** who do actual debugging and fixing. You investigate, implement, test, and validate yourself.

## INVOCATION
```bash
/fix-self [context]                              # Execute fix yourself with TRACED
/fix-self security definer views                 # Natural language description
/fix-self <paste error logs>                     # Direct error context
/fix-self auth tests failing                     # Test issues
```

## TARGET ROLES
- implementation-lead (primary)
- error-architect (when implementing fixes)
- completion-architect (when fixing integration issues)
- universal-test-engineer (when fixing test infrastructure)
- Any agent executing actual fix work

## SELF-EXECUTION MANDATE

**YOU ARE IMPLEMENTING THE FIX** following investigation + TRACED discipline:
- ✓ Investigate root cause yourself (use tools directly)
- ✓ Write failing tests yourself (RED state)
- ✓ Implement fixes yourself (GREEN state)
- ✓ Run quality gates yourself (lint+typecheck+test)
- ✓ Create atomic commits yourself
- ✓ Invoke specialists via Task() ONLY for domain expertise (security, architecture review)
- ✓ Use TodoWrite to track investigation and TRACED phases

**NOT orchestrating** - you're doing the investigative and implementation work with discipline enforcement.

## FIX-SELF PROTOCOL (Self-Execution)

### PHASE 0: SAFETY BACKUP (Before Investigation)

```javascript
TodoWrite([
  {content: "Safety: Create backup branches", status: "in_progress", activeForm: "Creating safety backups"},
  {content: "Investigation: Root cause analysis", status: "pending", activeForm: "Investigating root cause"},
  {content: "T: TDD cycle (RED→GREEN→REFACTOR)", status: "pending", activeForm: "Executing TDD"},
  {content: "R: Code review", status: "pending", activeForm: "Requesting review"},
  {content: "A: Architecture validation (if needed)", status: "pending", activeForm: "Validating architecture"},
  {content: "C: Specialist consultation", status: "pending", activeForm: "Consulting specialists"},
  {content: "E: Quality gates", status: "pending", activeForm: "Running quality gates"},
  {content: "D: Atomic commit", status: "pending", activeForm: "Creating commit"},
  {content: "Validation: User testing", status: "pending", activeForm: "User validation"}
])

// Create safety branches automatically
Bash(`
  CURRENT_BRANCH=$(git branch --show-current)
  FIX_NAME=$(echo "$ARGUMENTS" | sed 's/[^a-zA-Z0-9]/-/g' | cut -c1-50)
  TIMESTAMP=$(date +%Y%m%d-%H%M%S)

  git branch "backup-${FIX_NAME}-${TIMESTAMP}" 2>/dev/null || true
  git checkout -b "fix-${FIX_NAME}-${TIMESTAMP}" 2>/dev/null || true

  echo "✓ Backup: backup-${FIX_NAME}-${TIMESTAMP}"
  echo "✓ Work branch: fix-${FIX_NAME}-${TIMESTAMP}"
`)

TodoWrite: Mark "Safety: Create backup branches ✓" complete
```

### PHASE 1: INVESTIGATION (Root Cause Analysis)

```javascript
TodoWrite: Mark "Investigation: Root cause analysis" in_progress

// Read context files yourself
Read('.coord/PROJECT-CONTEXT.md')
Read('.coord/workflow-docs/000-*-D1-NORTH-STAR.md')  // Use Glob if needed

// Investigate using appropriate tools
// For errors: Read error logs, trace stack traces
// For security: Check Supabase advisors, review RLS policies
// For tests: Run tests, read failure output
// For UX: Examine relevant components, check recent changes

// Example investigation patterns:

// Security investigation
IF (issue_type === "security") {
  Bash('supabase db advisors')  // Check Supabase security warnings
  Grep('SECURITY DEFINER', pattern: 'SECURITY DEFINER', path: 'supabase/migrations/')
  Read('supabase/migrations/<relevant-migration>')  // Examine specific migrations
}

// Test failure investigation
IF (issue_type === "test_failure") {
  Bash('npm test -- --verbose')  // Run tests with detailed output
  Read('src/__tests__/<failing-test>')  // Read failing test
  Grep('error pattern', path: 'src/')  // Find error patterns in code
}

// UX regression investigation
IF (issue_type === "ux_regression") {
  Bash('git log --oneline -10')  // Recent commits
  Bash('git diff main..HEAD -- src/components/<component>')  // Compare branches
  Read('src/components/<component>')  // Examine component
}

// Performance investigation
IF (issue_type === "performance") {
  Grep('useEffect|subscription|listener', path: 'src/')  // Find effect hooks
  Read('relevant files with potential loops')
}

// Document findings
/**
 * ROOT CAUSE IDENTIFIED:
 * Issue: <specific technical finding>
 * Location: <file:line>
 * Impact: <what breaks in production>
 * Severity: CRITICAL/HIGH/MEDIUM/LOW
 *
 * Fix Strategy:
 * 1. <specific action>
 * 2. <specific action>
 * 3. <specific action>
 */

TodoWrite: Mark "Investigation: Root cause analysis ✓" complete
```

### PHASE 2: T - TEST FIRST (TDD Discipline)

```javascript
TodoWrite: Mark "T: TDD cycle (RED→GREEN→REFACTOR)" in_progress

// RED Phase - Write failing test that reproduces the issue
Write('src/__tests__/<test-file>', `
  import { describe, it, expect } from 'vitest'
  import { functionToFix } from '../module'

  describe('Fix for: ${ISSUE_CONTEXT}', () => {
    it('should handle ${specific_case}', () => {
      // Arrange: Set up test conditions that expose the bug
      const input = <problematic_input>

      // Act: Execute the buggy behavior
      const result = functionToFix(input)

      // Assert: Expect correct behavior (will fail with current bug)
      expect(result).toBe(<expected_correct_value>)
    })
  })
`)

// Verify test FAILS (proves bug exists)
Bash('npm test -- <test-file>')
// Output should show: ❌ Test failed (RED state confirmed)

// Commit failing test separately (constitutional requirement)
Bash(`
  git add src/__tests__/<test-file>
  git commit -m "TEST: failing test for ${FIX_NAME}

  Reproduces: ${ISSUE_CONTEXT}
  Expected: ${expected_behavior}
  Actual: ${current_buggy_behavior}

  🤖 Generated with Claude Code
  Co-Authored-By: Claude <noreply@anthropic.com>"
`)

// GREEN Phase - Minimal implementation to fix
Edit('src/<module>', `
  OLD_CODE: <buggy implementation>
  NEW_CODE: <minimal fix>
`)

// Verify test PASSES (fix works)
Bash('npm test -- <test-file>')
// Output should show: ✅ Test passed (GREEN state confirmed)

// REFACTOR Phase (if needed)
// Improve implementation while keeping tests green
// Clean up code, improve readability, optimize

TodoWrite: Mark "T: TDD cycle ✓" complete
```

### PHASE 3: R - REVIEW (Code Review)

```javascript
TodoWrite: Mark "R: Code review" in_progress

// Request code review from specialist
Task({
  subagent_type: "code-review-specialist",
  prompt: `
    CODE REVIEW REQUIRED:

    **Fix**: ${ISSUE_CONTEXT}
    **Root Cause**: ${investigation.root_cause}
    **Files Modified**:
    - ${files_changed}

    **Test Coverage**: ${test_file_path}

    Review for:
    1. Fix correctness (will this actually work?)
    2. Code quality (clean, maintainable)
    3. Security implications (any new vulnerabilities?)
    4. TRACED compliance (test-first followed?)
    5. Edge cases (what else could break?)

    Provide GO/NO-GO with specific feedback.
  `
})

// Wait for review feedback
// Incorporate suggestions

// If feedback requires changes:
Edit('files per review feedback')
Bash('npm test')  // Ensure still passing

TodoWrite: Mark "R: Code review ✓" complete
```

### PHASE 4: A - ANALYZE (Architecture Validation)

```javascript
// Only if architectural concerns exist

IF (architectural_uncertainty || design_decisions || cross_boundary_impact) {
  TodoWrite: Mark "A: Architecture validation" in_progress

  Task({
    subagent_type: "critical-engineer",
    prompt: `
      ARCHITECTURAL VALIDATION NEEDED:

      **Fix**: ${ISSUE_CONTEXT}
      **Implementation**: ${fix_approach}
      **Concerns**: ${architectural_concerns}

      Questions:
      1. Will this approach work in production?
      2. What will break under load/scale?
      3. Are there hidden failure modes?
      4. Should we use a simpler approach?

      Provide architectural GO/NO-GO.
    `
  })

  // If NO-GO, revise approach and return to Phase 2

  TodoWrite: Mark "A: Architecture validated ✓" complete
} ELSE {
  // Skip if no architectural concerns
  echo "⏭️  A: Skipped (no architectural concerns)"
}
```

### PHASE 5: C - CONSULT (Domain Specialists)

```javascript
TodoWrite: Mark "C: Specialist consultation" in_progress

// Auto-invoke based on domain triggers

IF (security_fix || auth_changes || RLS_changes) {
  Task({
    subagent_type: "security-specialist",
    prompt: `
      SECURITY REVIEW REQUIRED:

      **Fix**: ${ISSUE_CONTEXT}
      **Security Impact**: ${security_changes}

      Review:
      - Authentication changes secure?
      - Authorization bypass risks?
      - SQL injection prevention?
      - Session management correct?

      Security GO/NO-GO with threat assessment.
    `
  })
}

IF (test_methodology_changes || coverage_adjustments) {
  Task({
    subagent_type: "test-methodology-guardian",
    prompt: `
      TEST METHODOLOGY REVIEW:

      **Fix**: ${ISSUE_CONTEXT}
      **Test Changes**: ${test_modifications}

      Validate:
      - TDD discipline followed? (RED→GREEN→REFACTOR)
      - Test intent meaningful? (not coverage theater)
      - No test manipulation? (fixing code, not tests)

      Methodology GO/NO-GO.
    `
  })
}

IF (complexity > 3_layers || pattern_introduction) {
  Task({
    subagent_type: "complexity-guard",
    prompt: `
      COMPLEXITY ASSESSMENT:

      **Fix**: ${ISSUE_CONTEXT}
      **Approach**: ${implementation_strategy}

      Check:
      - Layers of abstraction: ${layer_count}
      - Simpler alternatives exist?
      - Over-engineering risks?

      Complexity GO/NO-GO with simplification suggestions.
    `
  })
}

TodoWrite: Mark "C: Specialists consulted ✓" complete
```

### PHASE 6: E - EXECUTE (Quality Gates)

```javascript
TodoWrite: Mark "E: Quality gates" in_progress

// ALL THREE MUST PASS (constitutional requirement)

echo "⚙️  Running quality gates (all must pass)..."

// Gate 1: Lint
Bash('npm run lint')
// Verify: 0 errors (warnings acceptable)

// Gate 2: TypeCheck
Bash('npm run typecheck')
// Verify: 0 errors

// Gate 3: Tests
Bash('npm run test')
// Verify: All tests passing

// Evidence collection
/**
 * QUALITY GATES EVIDENCE:
 * ✅ Lint: 0 errors
 * ✅ TypeCheck: 0 errors
 * ✅ Tests: X/X passing (100%)
 *
 * Command output:
 * <paste actual terminal output>
 */

IF (any_gate_failed) {
  echo "❌ Quality gate failure - fix issues before proceeding"
  // Fix issues and re-run
  // DO NOT proceed until all pass
  HALT_EXECUTION
}

echo "✅ All quality gates passed"
TodoWrite: Mark "E: Quality gates ✓" complete
```

### PHASE 7: D - DOCUMENT (Atomic Commit)

```javascript
TodoWrite: Mark "D: Atomic commit" in_progress

// Create comprehensive atomic commit
Bash(`
  git add <all-modified-files>
  git commit -m "fix: ${FIX_NAME}

  Root Cause: ${investigation.root_cause}
  Location: ${file}:${line}

  Changes:
  - ${change_1}
  - ${change_2}

  Test: ${test_file_path}
  Quality gates: ✅ lint ✅ typecheck ✅ tests

  TRACED compliance:
  T: ${test_commit_hash} (RED→GREEN→REFACTOR)
  R: code-review-specialist (approved)
  A: ${architecture_review_status}
  C: ${specialists_consulted}
  E: All quality gates passing
  D: This commit

  🤖 Generated with [Claude Code](https://claude.com/claude-code)

  Co-Authored-By: Claude <noreply@anthropic.com>"
`)

// Update documentation
Edit('.coord/PROJECT-CONTEXT.md', `
  ## Latest Work (${date})

  **Fixed**: ${ISSUE_CONTEXT}
  - Root cause: ${investigation.root_cause}
  - Solution: ${fix_summary}
  - Commit: ${commit_hash}
  - Test: ${test_file_path}
  - Quality: ✅ All gates passed
`)

TodoWrite: Mark "D: Atomic commit ✓" complete
```

### PHASE 8: VALIDATION (User Testing)

```javascript
TodoWrite: Mark "Validation: User testing" in_progress

// CRITICAL: Tests passing ≠ Fix complete
echo "⏸️  USER VALIDATION CHECKPOINT"
echo ""
echo "Fix Implementation Complete:"
echo "  Root cause: ${investigation.root_cause}"
echo "  Solution: ${fix_summary}"
echo "  Files modified: ${files_changed}"
echo ""
echo "Quality Status:"
echo "  ✅ Lint: 0 errors"
echo "  ✅ TypeCheck: 0 errors"
echo "  ✅ Tests: ${test_count} passing"
echo ""
echo "🧪 PLEASE TEST THE FIX:"
echo "   ${validation_instructions}"
echo ""
echo "Does the fix work correctly? (y/n/needs-work)"

// Wait for user response
// Trust user UX observations over passing tests

IF (user_validation === "needs-work") {
  echo "⚠️  User reports issue not fully resolved"
  echo "Re-investigating with user feedback..."

  // Return to PHASE 1 with new information
  GOTO PHASE_1_INVESTIGATION
}

echo "✅ User validation successful"
TodoWrite: Mark "Validation: User testing ✓" complete
```

### PHASE 9: CLEANUP & MERGE

```javascript
// Merge fix to original branch
Bash(`
  CURRENT_BRANCH=$(git branch --show-current)
  ORIGINAL_BRANCH=$(git rev-parse --abbrev-ref backup-${FIX_NAME}-${TIMESTAMP}@{-1} 2>/dev/null || echo "main")

  git checkout ${ORIGINAL_BRANCH}
  git merge ${CURRENT_BRANCH} --no-ff -m "Merge fix: ${FIX_NAME}"

  # Clean up work branch
  git branch -d ${CURRENT_BRANCH}

  echo "✓ Fix merged to ${ORIGINAL_BRANCH}"
  echo "✓ Backup preserved: backup-${FIX_NAME}-${TIMESTAMP}"
`)

// Completion summary
echo "
✅ FIX COMPLETE: ${FIX_NAME}

📊 Summary:
   Issue: ${ISSUE_CONTEXT}
   Root Cause: ${investigation.root_cause}
   Solution: ${fix_summary}

🔬 Evidence Trail:
   Investigation: Self-executed with ${tools_used}
   Test: ${test_commit_hash} (RED→GREEN)
   Implementation: ${fix_commit_hash}
   Review: code-review-specialist (approved)
   Quality: ✅ lint ✅ typecheck ✅ tests
   Validation: ✅ User confirmed

📝 Documentation Updated:
   - PROJECT-CONTEXT.md
   - Atomic commit with TRACED evidence

🔄 Rollback Available:
   Branch: backup-${FIX_NAME}-${TIMESTAMP}
"
```

## SPECIALIST INVOCATION GUIDELINES

**When to use Task() (domain expertise ONLY):**
- Code review: ALWAYS (code-review-specialist)
- Architecture validation: If uncertainty exists (critical-engineer)
- Security review: For auth/RLS/security changes (security-specialist)
- Test methodology: If test approach uncertain (test-methodology-guardian)
- Complexity check: If >3 layers (complexity-guard)

**When to do it yourself:**
- Investigation (Read, Grep, Bash for logs/errors)
- Writing code (Edit, Write)
- Writing tests (Write test files)
- Running quality gates (Bash npm commands)
- Creating commits (Bash git commands)
- Reading context files (Read)

## INVESTIGATION PATTERNS (Do Yourself)

**Security Issue Investigation:**
```javascript
Bash('supabase db advisors')
Grep('SECURITY DEFINER', path: 'supabase/migrations/')
Read('supabase/migrations/<migration-file>')
// Analyze: Why SECURITY DEFINER used? RLS bypass risk?
```

**Test Failure Investigation:**
```javascript
Bash('npm test -- --verbose <test-name>')
Read('src/__tests__/<failing-test>')
Grep('<error-pattern>', path: 'src/')
// Analyze: Why test failing? Changed behavior? Missing setup?
```

**UX Regression Investigation:**
```javascript
Bash('git diff main..HEAD -- <component-path>')
Read('src/components/<component>')
Grep('useEffect|useState|subscription', path: 'src/components/<component>')
// Analyze: What changed? New effect? State management issue?
```

**Performance Issue Investigation:**
```javascript
Grep('setInterval|subscription|addEventListener', path: 'src/')
Read('files with potential loops')
Bash('git log --oneline --grep="performance|optimization" -10')
// Analyze: Infinite loop? Memory leak? Missing cleanup?
```

## QUALITY GATES ENFORCEMENT

**MANDATORY - ALL MUST PASS:**
```bash
npm run lint        # 0 errors (warnings acceptable with justification)
npm run typecheck   # 0 errors
npm run test        # All tests passing
```

**Evidence Required:**
- Show actual command output (paste terminal results)
- Not just claims ("tests passed")
- All three commands executed
- All three passing

## ANTI-PATTERNS PREVENTED

**Orchestrator Confusion:**
- STOPPED: Don't delegate investigation to error-architect (you ARE the investigator)
- ALLOWED: Delegate code review, architecture validation (domain expertise)

**Code Before Test:**
- BLOCKED: Must write failing test first (RED state)
- Constitutional requirement: TDD discipline

**Test Manipulation:**
- REJECTED: Fix code, not tests
- testguard consultation if test modification needed

**Partial Quality Gates:**
- INVALID: All three must pass (not just one or two)
- No shortcuts allowed

**Claims Without Evidence:**
- REJECTED: Show terminal output
- Must prove gates passed with actual results

## INTEGRATION WITH /fix

**Command Separation:**
- **/fix**: Orchestrators coordinate, delegates to specialists via Task()
- **/fix-self**: Implementers execute fix work themselves (this command)
- Use `/fix-self` when you ARE the implementer/specialist
- Use `/fix` when coordinating multiple agents

**When to Use Each:**
- **Orchestrator role** (holistic-orchestrator, requirements-steward, system-steward) → `/fix`
- **Implementer role** (implementation-lead, error-architect, completion-architect) → `/fix-self`

## SUCCESS CRITERIA

- ✅ Root cause identified with evidence
- ✅ Safety backups created
- ✅ TDD cycle: RED→GREEN→REFACTOR
- ✅ Code review completed (code-review-specialist)
- ✅ Architecture validated if needed (critical-engineer)
- ✅ Specialists consulted per domain
- ✅ All quality gates passing (lint+typecheck+test with evidence)
- ✅ Atomic commit with TRACED compliance
- ✅ User validation successful (UX confirmed)
- ✅ Documentation updated
- ✅ TodoWrite tracking throughout

---

**MISSION:** Self-execute fix work with investigation + TRACED discipline. You investigate root cause, implement fix, validate quality, and document evidence. Delegate ONLY for domain expertise (review, architecture, security). Constitutional compliance enforced.
