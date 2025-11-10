# TRACED (Orchestration Mode)

## PURPOSE
Orchestrate TRACED workflow through specialist delegation. For **orchestrators only** (holistic-orchestrator, requirements-steward, system-steward). Zero direct implementation.

## INVOCATION
```bash
/traced [context]                    # Delegate TRACED workflow
/traced fix authentication bug       # With specific context
```

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
- ❌ Running commands directly (npm, git, etc.)
- ❌ Fixing bugs personally
- ❌ Doing specialist work themselves

**ORCHESTRATOR MUST ONLY:**
- ✓ Delegate ALL work via Task()
- ✓ Maintain holistic system overview
- ✓ Monitor cross-boundary coherence
- ✓ Ensure RACI compliance
- ✓ Track progress via TodoWrite
- ✓ Validate phase transitions

## EXECUTION PROTOCOL

### STEP 1: Context Preparation (Orchestrator coordinates, doesn't execute)
```
TodoWrite: "Preparing context for specialist delegation"

Task({
  subagent_type: "implementation-lead",
  prompt: `
    CONTEXT PREPARATION NEEDED:
    - Pack codebase: mcp__repomix__pack_codebase
    - Read North Star: .coord/workflow-docs/000-*-D1-NORTH-STAR.md
    - Read context: .coord/PROJECT-CONTEXT.md

    Then report readiness for TRACED execution.
  `
})
```

### STEP 2: TRACED Workflow Delegation (via Task() ONLY)
```
TodoWrite: "Delegating TRACED workflow to specialists"

// T - Test First
Task({
  subagent_type: "implementation-lead",
  prompt: "Execute with TDD: RED→GREEN→REFACTOR for {context}"
})

// R - Review
Task({
  subagent_type: "code-review-specialist",
  prompt: "Review implementation with TRACED compliance check"
})

// A - Analyze (if architectural uncertainty)
IF (architectural_concerns) {
  Task({
    subagent_type: "critical-engineer",
    prompt: "Validate architectural soundness of {decision}"
  })
}

// C - Consult (auto-triggered by specialists)
// Specialists invoke domain experts as needed

// E - Execute Quality Gates
Task({
  subagent_type: "quality-observer",
  prompt: "Execute quality gates: lint + typecheck + test (all must pass)"
})

// D - Document
Task({
  subagent_type: "implementation-lead",
  prompt: "Create atomic commit with conventional format"
})
```

### STEP 3: Convergence Monitoring
```
TodoWrite: "Monitoring specialist work for coherence"

// Orchestrator synthesizes results
// Validates cross-boundary coherence
// Ensures phase transition readiness
// DOES NOT FIX ISSUES (delegates fixes via Task)
```

## RACI ENFORCEMENT

**R (Responsible):** implementation-lead executes work
**A (Accountable):** critical-engineer validates architecture
**C (Consulted):** Specialists provide domain expertise
**I (Informed):** quality-observer monitors throughout

**Orchestrator role:** Coordinate RACI flow, ensure compliance, maintain holistic view

## VIOLATION DETECTION

If orchestrator attempts direct implementation:
- Hook blocks: `enforce-role-boundaries.sh`
- Error: "ROLE VIOLATION: Orchestrators orchestrate, they don't implement"
- Redirect: Use Task() for ALL execution

## CORRECT PATTERNS

**WRONG:**
```javascript
Edit('src/auth.ts', ...)              // Direct implementation
Write('test.ts', ...)                 // Creating files
Bash('npm run test')                  // Running commands
```

**RIGHT:**
```javascript
Task({
  subagent_type: "implementation-lead",
  prompt: "Fix auth bug in src/auth.ts"
})

Task({
  subagent_type: "universal-test-engineer",
  prompt: "Create tests for auth module"
})

Task({
  subagent_type: "quality-observer",
  prompt: "Execute: npm run lint && npm run typecheck && npm run test"
})
```

## USAGE EXAMPLES

```bash
# Basic orchestration
/traced

# With specific context
/traced implement user authentication feature

# At phase boundary
/traced validate B2→B3 transition readiness
```

## INTEGRATION WITH /traced-self

- **/traced**: Orchestrators coordinate, specialists execute
- **/traced-self**: Specialists execute TRACED protocol themselves
- Orchestrators use `/traced` (delegation)
- Implementers use `/traced-self` (self-execution)

## ANTI-PATTERNS PREVENTED

**Orchestrator Becoming Doer:**
- Symptom: Edit(), Write(), Bash() calls from orchestrator
- Prevention: Hooks block, patterns enforce, specialists execute
- Resolution: All actions via Task()

**Role Confusion:**
- Orchestrator implementing → BLOCKED
- Implementer architecting → ESCALATED to architect
- Specialist overreach → RACI enforced

## SUCCESS CRITERIA

- ✓ All work delegated via Task()
- ✓ TRACED protocol followed by specialists
- ✓ Quality gates passing
- ✓ Atomic commits with evidence
- ✓ Cross-boundary coherence maintained
- ✓ Orchestrator maintains holistic view

---

**MISSION:** Systematic multi-agent execution through TRACED+RACI delegation. Orchestrator coordinates, specialists execute.
