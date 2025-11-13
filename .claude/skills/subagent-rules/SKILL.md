---
name: subagent-rules
description: Proper delegation patterns for Task() invocations with governance context injection
allowed-tools: ["Task", "Read", "Bash"]
---

# Subagent Delegation Rules

**CRITICAL UNDERSTANDING**: When you invoke a subagent via `Task()`, the subagent receives **ONLY** what you put in the `prompt` parameter. There is NO automatic context injection.

## What Subagents DON'T Receive Automatically

❌ TRACED methodology
❌ DOD phase gates
❌ Agent authority matrix
❌ Phase context
❌ Operational skills
❌ Project background

**YOU must include ALL necessary context in your Task() prompt.**

---

## Governance Context Templates (Copy-Paste Ready)

### TRACED Methodology (150 tokens)

```octave
TRACED::[
  T::test_first[RED→GREEN→REFACTOR]→failing_test_before_code,
  R::code_review[every_change]→code-review-specialist_approval,
  A::critical-engineer[production_standards]→final_authority,
  C::domain_specialists[as_needed]→{technical-architect, security-specialist, testguard},
  E::quality_gates[lint+typecheck+test]→ALL_PASS_mandatory,
  D::TodoWrite[track_progress]→visible_accountability
]
```

### DOD Requirements by Phase

**B0 Validation:**
```octave
DOD_B0::[
  North_Star_alignment→validated,
  architecture_sound→scalable+implementable,
  security_addressed→no_blocking_risks,
  assumptions_validated→reality_checked,
  GO/NO-GO_decision→documented
]
```

**B1 Planning:**
```octave
DOD_B1::[
  tasks→atomic+sequenced,
  dependencies→mapped+critical_path,
  workspace→migrated+quality_gates_operational,
  resources→defined+realistic,
  build_plan→approved
]
```

**B2 Implementation:**
```octave
DOD_B2::[
  coverage→80%_guideline[behavior_focused],
  tests→passing_in_CI,
  code_review→approved_every_change,
  vulnerabilities→no_critical,
  performance→benchmarks_met,
  documentation→updated
]
```

**B3 Integration:**
```octave
DOD_B3::[
  components→integrated+compatible,
  E2E_tests→all_journeys_validated,
  performance→under_load_verified,
  security→penetration_tested,
  coherence→system_wide_validated
]
```

**B4 Production:**
```octave
DOD_B4::[
  infrastructure→provisioned+tested,
  deployment→validated+rollback_ready,
  monitoring→active+alerting_configured,
  documentation→complete+approved,
  production_signoff→critical-engineer_authority
]
```

**B5 Enhancement:**
```octave
DOD_B5::[
  North_Star→alignment_maintained,
  stability→preserved,
  backward_compatibility→maintained,
  quality_standards→same_as_original,
  integration→validated
]
```

### Authority Matrix (Agent-Specific)

**implementation-lead:**
```octave
AUTHORITY::[
  R[execute_code, coordinate_development, TDD_enforcement],
  A[critical-engineer:production_standards],
  C[code-review-specialist:every_change, technical-architect:architecture, testguard:methodology],
  DECISION_SCOPE[implementation_approach, task_sequencing, specialist_coordination]
]
```

**error-architect:**
```octave
AUTHORITY::[
  R[diagnose_errors, cascade_resolution, system_analysis],
  A[critical-engineer:system_impact],
  C[technical-architect:architecture_changes, security-specialist:security_implications],
  EMERGENCY[STOP_work, incident_command, stabilization_priority],
  ESCALATION[>4_hours, architectural_changes, high_business_impact]
]
```

**code-review-specialist:**
```octave
AUTHORITY::[
  R[quality_validation, code_standards, approval/rejection],
  A[critical-engineer:architectural_decisions],
  C[security-specialist:security_sensitive, technical-architect:architecture],
  BLOCKING[quality_gate_violations, security_issues, architectural_drift]
]
```

**critical-engineer:**
```octave
AUTHORITY::[
  R[production_readiness, GO/NO-GO_decisions, quality_standards],
  A[self:final_authority],
  C[technical-architect:design, security-specialist:security, principal-engineer:strategic_viability],
  BLOCKING[production_release, phase_transitions, architectural_approval]
]
```

**workspace-architect:**
```octave
AUTHORITY::[
  R[project_migration, workspace_structure, CI/CD_setup, quality_gate_enforcement],
  A[critical-engineer:workspace_approval],
  C[implementation-lead:development_needs, directory-curator:organization],
  MANDATORY[B1_02:quality_gates→npm_run_lint+typecheck+test]
]
```

---

## Phase Detection Logic

Before constructing Task() prompt, detect current phase:

### Detection Steps:
```bash
# 1. Check for project graduation
if [ -L ".coord" ]; then
  # Graduated project - check phase artifacts

  # Check build phase
  if [ -d "@build/reports" ]; then
    # Look for latest B-phase artifact
    if [ -f "@build/reports/B2-IMPLEMENTATION-LOG.md" ]; then
      PHASE="B2"
    elif [ -f "@build/reports/B3-INTEGRATION-REPORT.md" ]; then
      PHASE="B3"
    elif [ -f "@build/reports/B4-HANDOFF.md" ]; then
      PHASE="B4"
    elif [ -f "@build/reports/B1-BUILD-PLAN.md" ]; then
      PHASE="B1"
    elif [ -f "@build/reports/B0-VALIDATION.md" ]; then
      PHASE="B0"
    fi
  fi

  # Check design phase
  if [ -f "@coordination/docs/workflow/D3-BLUEPRINT.md" ]; then
    PHASE="D3"
  elif [ -f "@coordination/docs/workflow/D2_03-DESIGN.md" ]; then
    PHASE="D2"
  elif [ -f "@coordination/docs/workflow/*-NORTH-STAR.md" ]; then
    PHASE="D1"
  fi
else
  # Ideation phase
  if [ -f "manifest.json" ]; then
    PHASE="D0"
  fi
fi
```

### Phase Requirements:

**D0 Ideation:**
- Session structure establishment
- Natural exploration focus
- Graduation assessment

**D1 Understanding:**
- Problem-space focus (NO technical validation)
- North Star creation (system-agnostic)
- Requirements validation

**D2 Ideation:**
- Creative solution exploration
- Constraint application
- Synthesis and unification

**D3 Architecture:**
- Technical blueprint creation
- Visual mockups and validation
- Security review

**B0 Validation:**
- Critical design validation
- GO/NO-GO decision authority
- Production readiness assessment

**B1 Planning:**
- Atomic task decomposition
- Workspace migration (B1_02 GATE)
- **Quality gates MANDATORY**: npm run lint && typecheck && test

**B2 Implementation:**
- **TDD discipline MANDATORY**: RED→GREEN→REFACTOR
- Quality gates: lint + typecheck + test → ALL PASS
- Code review: EVERY change
- Skills: build-execution, test-infrastructure

**B3 Integration:**
- Component integration orchestration
- E2E testing and performance validation
- Security audit and penetration testing
- Skills: build-execution (if code changes)

**B4 Production:**
- Solution packaging and documentation
- Operations runbooks and maintenance guides
- Final security review and hardening
- Deployment phases: B4_D1 (staging) → B4_D2 (live) → B4_D3 (validation)

**B5 Enhancement:**
- Maintain architectural principles from original
- Preserve stability and performance
- Follow same quality protocols
- Validate backward compatibility

---

## Agent-to-Skills Mapping Intelligence

### When invoking these agents, load these operational skills:

| Agent Type | Primary Skills | When | Why |
|-----------|---------------|------|-----|
| **implementation-lead** | build-execution, test-infrastructure | B2, B5 | TDD discipline, test setup patterns |
| **error-architect** | error-triage, ci-error-resolution | Any phase (errors) | ERROR TRIAGE LOOP, CI/CD patterns |
| **workspace-architect** | workspace-setup | B1_02 only | npm outdated, audit, TypeScript validation |
| **code-review-specialist** | code-review-specialist | B2, B3 | Review standards, quality enforcement |
| **universal-test-engineer** | test-infrastructure | B2, B3 | Test setup, mocking patterns, frameworks |
| **critical-engineer** | (phase-dependent) | B0, B1, B3, B4 | Production validation, authority enforcement |
| **technical-architect** | supabase-operations | When DB work | Database patterns, RLS, migrations |
| **security-specialist** | smartsuite-patterns | When SmartSuite | UUID corruption prevention, field formats |
| **task-decomposer** | (none usually) | B1_01 | Uses planning, not operational skills |
| **design-architect** | (none usually) | D3_01 | Uses Context7 for research |

### Conditional Skill Loading:

**If security-focused work:**
- Add: `Skill(command:"security-specialist")` (even for non-security agents)

**If database/Supabase work:**
- Add: `Skill(command:"supabase-operations")`
- Add: `Skill(command:"supabase-test-harness")` (if testing)

**If SmartSuite integration:**
- Add: `Skill(command:"smartsuite-patterns")` (UUID corruption critical)

**If documentation work:**
- Add: `Skill(command:"documentation-placement")` (placement rules)

**If CI/CD issues:**
- Add: `Skill(command:"ci-error-resolution")` (pipeline patterns)

---

## Task() Invocation Template

### Standard Pattern:

```typescript
// 1. Detect current phase (use bash detection above)
const currentPhase = detectPhase();

// 2. Determine required skills (use mapping table above)
const requiredSkills = getSkillsForAgent(subagent_type, currentPhase);

// 3. Construct enriched prompt
Task({
  subagent_type: "agent-name",
  description: "Brief 1-sentence summary",
  prompt: `
## GOVERNANCE CONTEXT
${TRACED_methodology}
${DOD_for_current_phase}
${authority_matrix_for_agent}

## PHASE: ${currentPhase}
${phase_specific_requirements}

## OPERATIONAL SKILLS
Load these for this task:
${requiredSkills.map(s => `- Skill(command:"${s.name}") // ${s.why}`).join('\n')}

## YOUR TASK
${detailed_task_description}

## DECISION AUTHORITY
You have authority over: ${scope}
You must consult: ${required_consultations}

## SUCCESS CRITERIA
${specific_deliverables}
${phase_DOD_requirements}
  `
})
```

---

## Practical Examples

### Example 1: B2 Implementation Delegation

**Scenario:** Holistic orchestrator needs to implement authentication feature

```typescript
Task({
  subagent_type: "implementation-lead",
  description: "Implement JWT authentication with TDD",
  prompt: `
## GOVERNANCE CONTEXT
TRACED::[
  T::test_first[RED→GREEN→REFACTOR]→failing_test_before_code,
  R::code_review[every_change]→code-review-specialist_approval,
  A::critical-engineer[production_standards]→final_authority,
  C::domain_specialists→{code-review-specialist, security-specialist, testguard},
  E::quality_gates[lint+typecheck+test]→ALL_PASS_mandatory,
  D::TodoWrite[track_progress]→visible_accountability
]

DOD_B2::[
  coverage→80%_guideline[behavior_focused],
  tests→passing_in_CI,
  code_review→approved_every_change,
  vulnerabilities→no_critical,
  performance→benchmarks_met
]

AUTHORITY::[
  R[execute_code, coordinate_development, TDD_enforcement],
  A[critical-engineer:production_standards],
  C[code-review-specialist:every_change, security-specialist:crypto_choices, testguard:methodology],
  DECISION_SCOPE[implementation_approach, task_sequencing]
]

## PHASE: B2 Implementation
- TDD discipline MANDATORY (RED→GREEN→REFACTOR)
- Quality gates: npm run lint && npm run typecheck && npm run test
- Code review required for EVERY change
- Test coverage 80% guideline (behavior-focused, not line-focused)

## OPERATIONAL SKILLS
Load these for TDD implementation:
- Skill(command:"build-execution") // TDD discipline, MIP, RED→GREEN→REFACTOR cycle
- Skill(command:"test-infrastructure") // Test setup, mocking patterns, Vitest configuration

## YOUR TASK
Implement JWT-based authentication service with the following requirements:

**Core Features:**
- Email/password authentication flow
- bcrypt password hashing (salt rounds: 10)
- JWT access token generation (15min expiration)
- Refresh token logic (7 day expiration)
- Token validation middleware
- Logout and token revocation

**Technical Constraints:**
- Use @supabase/supabase-js for database operations
- Store hashed passwords only (never plaintext)
- Use environment variables for JWT secrets
- Rate limiting on auth endpoints (5 req/min)

**Testing Requirements:**
- Test password hashing/verification
- Test token generation/validation
- Test token expiration handling
- Test invalid credentials rejection
- Test middleware authorization

## DECISION AUTHORITY
You have full authority over:
- Implementation approach and code structure
- Test suite design and coverage strategy
- Task sequencing and development flow

You MUST consult:
- security-specialist: Before finalizing crypto choices (bcrypt rounds, JWT algorithm)
- code-review-specialist: After each component completion
- testguard: If test methodology questions arise

## SUCCESS CRITERIA
- All authentication flows implemented with failing tests FIRST
- Code review approved for each component
- All quality gates passing (lint, typecheck, test)
- Security specialist approval on crypto implementation
- TodoWrite tracking shows RED→GREEN→REFACTOR cycle evidence
- DOD_B2 criteria met
  `
})
```

---

### Example 2: Error Resolution Delegation

**Scenario:** CI pipeline failing with cascading type errors

```typescript
Task({
  subagent_type: "error-architect",
  description: "Resolve cascading CI type errors",
  prompt: `
## GOVERNANCE CONTEXT
TRACED::[
  T::systematic_investigation[step_by_step],
  R::document_findings[evidence_based],
  A::critical-engineer[system_impact_authority],
  C::specialists[technical-architect, security-specialist],
  E::validation[fix_verified_in_CI],
  D::resolution_log[track_investigation]
]

AUTHORITY::[
  R[diagnose_errors, cascade_resolution, system_analysis],
  A[critical-engineer:system_impact],
  C[technical-architect:architecture_changes, implementation-lead:fix_coordination],
  EMERGENCY[STOP_work, incident_command, stabilization_priority],
  ESCALATION[>4_hours, architectural_changes, high_business_impact]
]

## PHASE: B2 (Disrupted by Errors)
- Normal B2 workflow suspended due to CI failures
- Priority: Restore green CI state
- Then: Resume normal TDD workflow

## OPERATIONAL SKILLS
Load these for systematic error resolution:
- Skill(command:"error-triage") // ERROR TRIAGE LOOP protocol: Build→Types→Unused→Async→Logic→Tests
- Skill(command:"ci-error-resolution") // CI/CD patterns, proven resolution workflows

## YOUR TASK
CI pipeline is failing with cascading type errors across multiple files.

**Current State:**
- 47 TypeScript errors across 12 files
- Tests cannot run due to build failures
- Last successful build: commit abc123 (3 commits ago)
- Recent changes: Added new database schema types

**Build Output:**
\`\`\`
src/auth/service.ts:45:12 - error TS2322: Type 'UserProfile | null' is not assignable to type 'UserProfile'.
src/auth/middleware.ts:89:5 - error TS2345: Argument of type 'string | undefined' is not assignable to parameter of type 'string'.
src/db/types.ts:23:3 - error TS2304: Cannot find name 'DatabaseSchema'.
[... 44 more errors ...]
\`\`\`

**Investigation Required:**
1. Apply ERROR TRIAGE LOOP protocol (Build→Types→Unused→Async→Logic→Tests)
2. Identify cascade pattern (likely one root cause affecting multiple files)
3. Determine if architectural change required
4. Coordinate fixes with implementation-lead if code changes needed

## DECISION AUTHORITY
You have full authority over:
- Error diagnosis and classification (SIMPLE/COMPLEX/ESCALATION)
- ERROR TRIAGE LOOP execution
- Emergency protocol invocation if critical

You MUST consult:
- technical-architect: If architectural changes required to resolve
- critical-engineer: If resolution will take >4 hours
- implementation-lead: To coordinate fix implementation

## ESCALATION TRIGGERS (Automatic)
- Resolution time exceeds 4 hours → Escalate to critical-engineer
- Architectural changes required → Consult technical-architect immediately
- High business impact → Invoke emergency protocol (STOP all work)

## SUCCESS CRITERIA
- ERROR TRIAGE LOOP protocol applied systematically
- Root cause identified with evidence
- All 47 TypeScript errors resolved
- CI pipeline green (all checks passing)
- Resolution documented with lessons learned
- Preventive measures identified
  `
})
```

---

### Example 3: Workspace Setup Delegation (B1_02)

**Scenario:** Project ready for graduation from ideation to formal structure

```typescript
Task({
  subagent_type: "workspace-architect",
  description: "Execute B1_02 project graduation and workspace setup",
  prompt: `
## GOVERNANCE CONTEXT
TRACED::[
  T::validation_first[test_workspace_setup],
  R::checklist_review[validate_structure],
  A::critical-engineer[workspace_approval],
  C::implementation-lead:development_needs, directory-curator:organization],
  E::quality_gates[MANDATORY_enforcement],
  D::migration_log[document_process]
]

DOD_B1::[
  workspace→migrated+quality_gates_operational,
  CI/CD→configured+tested,
  quality_gates→lint+typecheck+test_ALL_PASS,
  structure→validated+documented
]

AUTHORITY::[
  R[project_migration, workspace_structure, CI/CD_setup, quality_gate_enforcement],
  A[critical-engineer:workspace_approval],
  C[implementation-lead:development_needs, directory-curator:final_organization],
  MANDATORY[quality_gates→npm_run_lint+typecheck+test]
]

## PHASE: B1_02 Workspace Setup (CRITICAL MIGRATION GATE)
- Execute project graduation: 0-ideation/ → {project-name}/
- Create two-repository structure (coordination + build)
- Set up CI/CD pipeline with quality gates
- **QUALITY GATES MANDATORY**: npm run lint && npm run typecheck && npm run test
- Validate workspace before resuming B1_03

## OPERATIONAL SKILLS
Load workspace setup protocol:
- Skill(command:"workspace-setup") // B1_02 validation, npm outdated/audit, TypeScript version matching, quality gate enforcement

## YOUR TASK
Execute B1_02 project graduation for "task-management-system" project.

**Graduation Assessment (from sessions-manager):**
- D0→D3 phases complete
- North Star validated
- Blueprint approved (B0 GO decision)
- Build plan created (B1_01 complete)
- Ready for formal project structure

**Migration Steps Required:**
1. Create project structure: /Volumes/HestAI-Projects/task-management-system/
2. Create coordination repository with git init
3. Create build repository with git init
4. Set up worktree symlinks (.coord → coordination)
5. Migrate session history: 0-ideation/YYYY-MM-DD-TOPIC/ → {project}/sessions/
6. Distribute artifacts:
   - D-phase → @coordination/docs/workflow/
   - B-phase → @build/reports/
7. Set up CI/CD pipeline (GitHub Actions or similar)
8. Configure quality gates: npm run lint, typecheck, test
9. Create CLAUDE.md with project-specific standards
10. Validate workspace setup (run quality gates to ensure operational)

**MANDATORY Quality Gate Validation:**
\`\`\`bash
npm run lint      # Must pass
npm run typecheck # Must pass
npm run test      # Must pass
\`\`\`

**NO src/ files allowed without passing quality gates.**

## DECISION AUTHORITY
You have full authority over:
- Project structure creation and organization
- CI/CD pipeline configuration
- Quality gate enforcement mechanisms
- Workspace validation approach

You MUST consult:
- implementation-lead: For development workflow preferences
- directory-curator: For final organization validation (via Task tool)

## SUCCESS CRITERIA
- Project structure created: coordination/ and build/ repositories
- Session history migrated completely
- Artifacts distributed correctly (D-phase → coordination, B-phase → build)
- CI/CD pipeline operational with quality gates
- Quality gates validated (all passing)
- Workspace documented in B1-WORKSPACE.md
- MIGRATION GATE passed → ready for human directory change
- B1_02 DOD criteria met

## MIGRATION GATE PROTOCOL
After B1_02 completion:
1. **STOP** - Human intervention required
2. Human changes directory: cd /Volumes/HestAI-Projects/task-management-system/build/
3. Human verifies pwd shows new location
4. **RESUME** B1_03 in new workspace
  `
})
```

---

### Example 4: Code Review Delegation

**Scenario:** Implementation complete, needs quality validation

```typescript
Task({
  subagent_type: "code-review-specialist",
  description: "Review authentication module implementation",
  prompt: `
## GOVERNANCE CONTEXT
TRACED::[
  R::code_review[comprehensive_analysis]→approval/rejection,
  A::critical-engineer[architectural_decisions],
  C::security-specialist[security_concerns], technical-architect[architecture]],
  E::quality_standards[no_compromises],
  D::review_documentation[findings_and_recommendations]
]

AUTHORITY::[
  R[quality_validation, code_standards_enforcement, approval/rejection],
  A[critical-engineer:architectural_decisions],
  C[security-specialist:security_sensitive, technical-architect:architecture],
  BLOCKING[quality_gate_violations, security_issues, architectural_drift]
]

## PHASE: B2 Implementation
- Code review is MANDATORY for every change
- Quality gates must pass: lint, typecheck, test
- Security validation required for auth code

## OPERATIONAL SKILLS
Load review standards:
- Skill(command:"code-review-specialist") // Review standards, anti-patterns, quality enforcement

## YOUR TASK
Review the authentication module implementation for production readiness.

**Code Changes:**
- Files: src/auth/service.ts, src/auth/middleware.ts, src/auth/types.ts
- Lines: +347 / -12
- Tests: tests/auth/service.test.ts (+289 lines)

**Review Scope:**
1. **Code Quality:**
   - TypeScript usage (no `any` types)
   - Error handling patterns
   - Code organization and readability
   - Naming conventions

2. **Architecture:**
   - Follows established patterns
   - Proper separation of concerns
   - Integration with existing codebase
   - No architectural drift

3. **Security:**
   - Password hashing implementation (bcrypt)
   - JWT token handling
   - Input validation
   - Secret management
   - Rate limiting

4. **Testing:**
   - Test coverage 80%+ (behavior-focused)
   - Tests assert meaningful behavior (not just coverage theater)
   - Edge cases covered
   - Error paths tested

5. **TRACED Compliance:**
   - Tests written FIRST (evidence in git history)
   - Quality gates passing
   - Documentation updated

**Files to Review:**
[Provide git diff or file contents here]

## DECISION AUTHORITY
You have full authority over:
- Code quality assessment and approval/rejection
- Quality standard enforcement
- Review comments and requested changes

You MUST consult:
- security-specialist: For final security approval on auth implementation
- technical-architect: If architectural concerns identified

## SUCCESS CRITERIA
- Comprehensive review completed
- All quality criteria assessed
- Security validation confirmed (via security-specialist consultation)
- Approval/rejection decision documented
- Review comments actionable and specific
- If approved: cleared for merge
- If rejected: specific remediation items provided
  `
})
```

---

## Anti-Patterns (What NOT to Do)

### ❌ **Anti-Pattern 1: Minimal Context**

```typescript
// WRONG - Subagent has no governance, no phase, no skills
Task({
  subagent_type: "implementation-lead",
  prompt: "Implement authentication"
})
```

**Problem:** Subagent doesn't know:
- What methodology to follow (TRACED?)
- What phase requirements apply
- What skills/patterns to use
- What quality gates to meet
- Who to consult for what

---

### ❌ **Anti-Pattern 2: Assuming Auto-Injection**

```typescript
// WRONG - Subagent doesn't know what TRACED means
Task({
  subagent_type: "implementation-lead",
  prompt: "Follow TRACED and implement authentication with TDD"
})
```

**Problem:** "TRACED" and "TDD" are just words without the actual definitions/protocols.

---

### ❌ **Anti-Pattern 3: Incomplete Governance**

```typescript
// WRONG - Partial governance, missing critical elements
Task({
  subagent_type: "implementation-lead",
  prompt: `
Use TDD to implement authentication.

## Your Task:
- Email/password auth
- JWT tokens
  `
})
```

**Problem:** Missing:
- DOD requirements
- Authority matrix
- Phase context
- Required skills
- Consultation requirements
- Success criteria

---

### ✅ **Correct Pattern: Complete Enrichment**

```typescript
// RIGHT - Complete governance + phase + skills + task
Task({
  subagent_type: "implementation-lead",
  description: "Implement authentication with TDD",
  prompt: `
## GOVERNANCE CONTEXT
[Full TRACED definition with all components]
[DOD B2 requirements with specific criteria]
[Authority matrix with R/A/C/D breakdown]

## PHASE: B2 Implementation
[Phase-specific requirements and constraints]

## OPERATIONAL SKILLS
- Skill(command:"build-execution") // TDD discipline
- Skill(command:"test-infrastructure") // Test setup

## YOUR TASK
[Detailed task description with technical requirements]

## DECISION AUTHORITY
[Scope + consultation requirements]

## SUCCESS CRITERIA
[Specific deliverables + DOD alignment]
  `
})
```

---

## Quick Reference Checklist

Before calling `Task()`, ensure your prompt includes:

- [ ] **TRACED methodology** (full definition, not just acronym)
- [ ] **DOD requirements** (for current phase)
- [ ] **Authority matrix** (R/A/C for this agent)
- [ ] **Phase context** (current phase + requirements)
- [ ] **Operational skills** (with Skill(command:"...") invocations)
- [ ] **Task description** (detailed requirements)
- [ ] **Decision authority** (scope + consultations)
- [ ] **Success criteria** (deliverables + DOD)

---

## Reference Files for Full Governance Content

When constructing Task() prompts, you can read these files for complete governance definitions:

- **TRACED methodology**: `/Users/shaunbuswell/.claude/instructions/RULES.oct.md`
- **DOD requirements**: `/Users/shaunbuswell/.claude/instructions/DOD.oct.md`
- **Authority matrix**: `/Users/shaunbuswell/.claude/protocols/AGENT_AUTHORITY_MATRIX.md`
- **Agent capabilities**: `/Volumes/HestAI/docs/guides/102-DOC-AGENT-CAPABILITY-LOOKUP.oct.md`
- **Workflow patterns**: `/Volumes/HestAI/docs/workflow/001-WORKFLOW-NORTH-STAR.oct.md`

---

## Summary: Your Responsibility as Main Agent

When delegating via `Task()`:

1. **Detect** current phase
2. **Determine** required skills (using mapping table)
3. **Construct** enriched prompt with:
   - Governance context (TRACED + DOD + Authority)
   - Phase context and requirements
   - Operational skills to load
   - Detailed task description
   - Decision authority boundaries
   - Success criteria
4. **Invoke** Task() with complete context
5. **Monitor** subagent execution
6. **Validate** deliverables against criteria

**Remember:** Subagents are powerful, but they need complete context. Your job as the delegating agent is to ensure they have everything they need to succeed.
