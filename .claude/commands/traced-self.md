# TRACED-SELF (Self-Execution Mode)

## PURPOSE
Execute work yourself following TRACED discipline. For **implementers and specialists** who do actual work. Follow T→R→A→C→E→D protocol while implementing.

## INVOCATION
```bash
/traced-self [context]                    # Execute TRACED protocol yourself
/traced-self fix authentication bug       # With specific task
```

## TARGET ROLES
- implementation-lead (primary)
- error-architect
- completion-architect
- universal-test-engineer
- Any agent executing actual work

## SELF-EXECUTION MANDATE

**YOU ARE IMPLEMENTING** following TRACED discipline:
- ✓ Write code, tests, documentation yourself
- ✓ Follow T→R→A→C→E→D sequence
- ✓ Use TodoWrite to track each phase
- ✓ Invoke specialists via Task() when domain expertise needed
- ✓ Execute quality gates yourself

**NOT orchestrating** - you're doing the work with discipline enforcement.

## TRACED PROTOCOL (Self-Execution)

### T - TEST FIRST (TDD Discipline)
```javascript
TodoWrite([
  {content: "T: Write failing test (RED)", status: "in_progress", activeForm: "Writing failing test"},
  {content: "T: Minimal implementation (GREEN)", status: "pending", activeForm: "Implementing minimal code"},
  {content: "T: Refactor (maintain GREEN)", status: "pending", activeForm: "Refactoring"}
])

// RED Phase
Write('src/__tests__/auth.test.ts', `
  test('should authenticate valid user', () => {
    const result = authenticate('user', 'pass')
    expect(result).toBe(true)  // Will fail - not implemented yet
  })
`)

Bash('npm test')  // Verify it fails (RED)
TodoWrite: Mark "T: RED ✓" complete

// GREEN Phase
Write('src/auth.ts', `
  export function authenticate(user: string, pass: string) {
    return true  // Minimal implementation to pass
  }
`)

Bash('npm test')  // Verify it passes (GREEN)
TodoWrite: Mark "T: GREEN ✓" complete

// REFACTOR Phase (if needed)
// Improve code while maintaining green tests
TodoWrite: Mark "T: REFACTOR ✓" complete
```

### R - REVIEW (Code Review)
```javascript
TodoWrite([
  {content: "R: Request code review", status: "in_progress", activeForm: "Requesting review"}
])

Task({
  subagent_type: "code-review-specialist",
  prompt: "Review auth implementation for quality, security, TRACED compliance"
})

// Wait for review feedback
// Incorporate suggestions
TodoWrite: Mark "R: Review complete ✓" complete
```

### A - ANALYZE (Architecture Validation)
```javascript
// Only if architectural uncertainty exists
IF (architectural_concerns || design_decisions) {
  TodoWrite([
    {content: "A: Validate architecture", status: "in_progress", activeForm: "Validating architecture"}
  ])

  Task({
    subagent_type: "critical-engineer",
    prompt: "Validate architectural approach for authentication system"
  })

  TodoWrite: Mark "A: Architecture validated ✓" complete
} ELSE {
  // Skip if no architectural concerns
}
```

### C - CONSULT (Domain Specialists)
```javascript
TodoWrite([
  {content: "C: Consult specialists", status: "in_progress", activeForm: "Consulting specialists"}
])

// Auto-invoke based on domain triggers
IF (security_concerns) {
  Task({
    subagent_type: "security-specialist",
    prompt: "Review auth security: password handling, session management"
  })
}

IF (test_methodology_concerns) {
  Task({
    subagent_type: "test-methodology-guardian",
    prompt: "Validate test approach for auth system"
  })
}

TodoWrite: Mark "C: Specialists consulted ✓" complete
```

### E - EXECUTE (Quality Gates)
```javascript
TodoWrite([
  {content: "E: Execute quality gates (lint+typecheck+test)", status: "in_progress", activeForm: "Running quality gates"}
])

// ALL THREE MUST PASS
Bash('npm run lint')        // Must have 0 errors
Bash('npm run typecheck')   // Must have 0 errors
Bash('npm run test')        // All tests must pass

// Verify all passed
IF (any_failed) {
  // Fix issues and retry
  // DO NOT proceed until all pass
}

TodoWrite: Mark "E: Quality gates ✓" complete
```

### D - DOCUMENT (Atomic Commit)
```javascript
TodoWrite([
  {content: "D: Create atomic commit", status: "in_progress", activeForm: "Creating commit"}
])

Bash(`
  git add src/auth.ts src/__tests__/auth.test.ts
  git commit -m "feat: implement user authentication

  - Add authenticate function with password validation
  - Add comprehensive test coverage
  - Validate with security-specialist

  🤖 Generated with Claude Code
  Co-Authored-By: Claude <noreply@anthropic.com>"
`)

TodoWrite: Mark "D: Committed ✓" complete
```

## COMPLETE WORKFLOW EXAMPLE

```javascript
// User invokes: /traced-self implement user authentication

// Initialize TodoWrite for TRACED tracking
TodoWrite([
  {content: "T: TDD cycle (RED→GREEN→REFACTOR)", status: "in_progress", activeForm: "Executing TDD"},
  {content: "R: Code review", status: "pending", activeForm: "Requesting review"},
  {content: "A: Architecture validation", status: "pending", activeForm: "Validating architecture"},
  {content: "C: Specialist consultation", status: "pending", activeForm: "Consulting specialists"},
  {content: "E: Quality gates", status: "pending", activeForm: "Running quality gates"},
  {content: "D: Atomic commit", status: "pending", activeForm: "Creating commit"}
])

// T - Test First
Write('test file with failing test')
Bash('npm test')  // Verify RED
Write('minimal implementation')
Bash('npm test')  // Verify GREEN
TodoWrite: Mark T complete

// R - Review
Task(code-review-specialist, "review implementation")
// Incorporate feedback
TodoWrite: Mark R complete

// A - Analyze (if needed)
IF (architectural_uncertainty) {
  Task(critical-engineer, "validate approach")
  TodoWrite: Mark A complete
}

// C - Consult
Task(security-specialist, "review auth security")
TodoWrite: Mark C complete

// E - Execute Gates
Bash('npm run lint && npm run typecheck && npm run test')
// Ensure all pass
TodoWrite: Mark E complete

// D - Document
Bash('git commit with conventional format')
TodoWrite: Mark D complete
```

## SPECIALIST INVOCATION

**When to use Task():**
- Domain expertise needed (security, testing methodology, architecture)
- Code review required (always)
- Architectural validation needed (if uncertainty)
- Quality observation (optional, can do yourself)

**When to do it yourself:**
- Writing code, tests, docs
- Running quality gates
- Creating commits
- TDD cycle execution

## QUALITY GATES ENFORCEMENT

**MANDATORY - ALL MUST PASS:**
```bash
npm run lint        # 0 errors (warnings acceptable)
npm run typecheck   # 0 errors
npm run test        # All tests passing
```

**Evidence Required:**
- Show actual command output
- Not just claims
- All three commands executed
- All three passing

## ANTI-PATTERNS PREVENTED

**Code Before Test:**
- STOPPED: Must write failing test first
- RED phase must fail before GREEN

**Review Skipped:**
- BLOCKED: Code review is mandatory
- R phase cannot be skipped

**Partial Quality Gates:**
- REJECTED: All three must pass (lint+typecheck+test)
- Not just TypeScript passing

**Claims Without Evidence:**
- INVALID: Show command output
- Must prove gates passed

## INTEGRATION WITH /traced

- **/traced**: Orchestrators coordinate, you receive delegation
- **/traced-self**: You execute TRACED yourself without orchestrator
- Use `/traced-self` when you're the implementer doing the work
- Use delegation from `/traced` when orchestrator coordinates

## SUCCESS CRITERIA

- ✓ TDD cycle: RED→GREEN→REFACTOR
- ✓ Code review completed with feedback incorporated
- ✓ Architecture validated if needed
- ✓ Specialists consulted per domain
- ✓ All quality gates passing (lint+typecheck+test)
- ✓ Atomic commit with conventional format
- ✓ TodoWrite tracking throughout

---

**MISSION:** Self-execute work following TRACED discipline. You implement with systematic quality enforcement.
