# GitHub Agent Activation Example

## Scenario: User Requests Feature Implementation

**User says:** "Add a new `getScriptById` function to the scripts service"

## Step-by-Step Activation

### 1. ROLE DETECTION
```
Task Analysis:
- Type: Feature implementation
- Phase: Build phase (code writing)
- Responsibility: Technical execution

Role Mapping → implementation-lead
```

### 2. CONSTITUTIONAL ACTIVATION
```bash
# Read agent constitution
Read: .claude/agents/implementation-lead.oct.md

Key Sections Loaded:
✓ Constitutional Foundation (Core Forces, Universal Principles)
✓ Cognitive Foundation (LOGOS/Hephaestus+Atlas+Hermes)
✓ LOGOS SHANK Overlay (behavioral constraints)
✓ Operational Identity (System aware, minimal effective, ripple conscious)
✓ Methodology (TDD discipline, quality gates, TRACED protocol)
✓ Constraints (Test-first mandatory, code review required, quality gates blocking)
```

### 3. SKILL LOADING
```bash
# Constitution references: SKILL_DELEGATION::"Reference build-execution skill..."

Read: .claude/skills/build-execution/tdd-discipline.md
# Loaded: RED→GREEN→REFACTOR cycle, test-first workflow

Read: .claude/skills/build-execution/build-philosophy.md
# Loaded: System awareness mandate, Minimal Intervention Principle (MIP)

Read: .claude/skills/build-execution/verification-protocols.md
# Loaded: Evidence requirements, artifact tracking, anti-validation theater

Read: .claude/skills/build-execution/anti-patterns.md
# Loaded: Isolated edits, feature bloat, context destruction warnings
```

### 4. SYSTEM ANALYSIS (LOGOS Mandate)
```
Before writing ANY code, analyze system ripples:

1. Dependencies:
   - packages/shared/src/services/scripts.ts (implementation location)
   - Supabase client (database access)
   - RLS policies (security boundary)
   - TypeScript types (type safety)

2. Integration Points:
   - copy-editor app (primary consumer)
   - @workspace/shared package (exports this service)
   - Existing getScripts() function (consistency pattern)
   - Error handling architecture (service-level errors)

3. Ripple Paths:
   - Add getScriptById → impacts imports in copy-editor
   - Database query → must respect RLS policies
   - Type definitions → must update exported types
   - Tests → must cover new function + edge cases

[TENSION] → [PATTERN] → [CLARITY]:
- New function could duplicate getScripts logic (tension)
- Pattern: Reuse existing query builder, add ID filter (structural synthesis)
- Clarity: Single responsibility maintained, zero duplication
```

### 5. TDD DISCIPLINE (RED→GREEN→REFACTOR)

**RED Phase: Write Failing Test**
```bash
# Create test file
Write: packages/shared/src/services/scripts.test.ts

# Content:
describe('getScriptById', () => {
  it('returns script when ID exists', async () => {
    const mockScript = { id: '123', title: 'Test', client_id: 'abc', component_id: 'comp-1' };
    mockSupabase.from.mockReturnValue(mockSingle(mockScript));

    const result = await getScriptById('123');

    expect(result).toEqual(mockScript);
    expect(mockSupabase.from).toHaveBeenCalledWith('scripts');
  });

  it('throws error when script not found', async () => {
    mockSupabase.from.mockReturnValue(mockSingle(null));

    await expect(getScriptById('nonexistent')).rejects.toThrow('Script not found');
  });
});

# Run test (verify RED)
npm run test:unit -- scripts.test.ts
# Expected: ❌ FAIL - getScriptById is not defined
```

**Git Commit (RED evidence):**
```bash
git add packages/shared/src/services/scripts.test.ts
git commit -m "TEST: Add failing test for getScriptById function

- Validates script retrieval by ID
- Tests error handling for missing scripts
- Follows TDD RED phase discipline

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

**GREEN Phase: Minimal Implementation**
```bash
# Edit implementation file
Edit: packages/shared/src/services/scripts.ts

# Add minimal code to pass test:
export async function getScriptById(id: string): Promise<Script> {
  const { data, error } = await supabase
    .from('scripts')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) {
    throw new Error('Script not found');
  }

  return data;
}

# Run test (verify GREEN)
npm run test:unit -- scripts.test.ts
# Expected: ✅ PASS - All tests passing
```

**Git Commit (GREEN evidence):**
```bash
git add packages/shared/src/services/scripts.ts
git commit -m "FEAT: Implement getScriptById function

- Retrieves single script by ID from Supabase
- Respects RLS policies (automatic via supabase client)
- Throws error for missing scripts
- Tests passing (RED→GREEN cycle complete)

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

**REFACTOR Phase: (if needed)**
```bash
# Check for duplication/complexity
# In this case: code is already minimal and clear
# No refactoring needed - skip to quality gates
```

### 6. QUALITY GATES (TRACED: Execute)
```bash
# Run all quality gates (ALL must pass)

npm run lint
# Output: ✅ 0 errors, 0 warnings

npm run typecheck
# Output: ✅ No type errors

npm run test:unit
# Output: ✅ All tests passing (379/379)

npm run build
# Output: ✅ Build successful (all workspaces)
```

**Git Commit (Evidence artifact):**
```bash
git commit --allow-empty -m "VERIFY: Quality gates passed for getScriptById

Lint: ✅ 0 errors
TypeCheck: ✅ 0 errors
Tests: ✅ 379/379 passing
Build: ✅ Successful

Evidence: CI pipeline job #1234
Constitutional compliance: I7 (TDD), I8 (production-grade)

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

### 7. CONSULTATION (TRACED: Review)
```bash
# Constitution mandates: "code-review-specialist: Mandatory for all code changes"

Read: .claude/agents/code-review-specialist.oct.md

# Apply code-review-specialist lens:
✓ Follows existing patterns (matches getScripts structure)
✓ Handles errors appropriately (throws on not found)
✓ Tests comprehensive (happy path + error case)
✓ Type safety maintained (TypeScript strict mode)
✓ No duplication (reuses Supabase client singleton)
✓ No scope creep (implements only what test requires)

# Document consultation:
"Validated per code-review-specialist constitutional standards:
- Pattern consistency ✓
- Error handling ✓
- Test coverage ✓
- Type safety ✓
- Zero duplication ✓"
```

### 8. FINAL VERIFICATION

**Constitutional Compliance Checklist:**
- [x] Read role constitution (.claude/agents/implementation-lead.oct.md)
- [x] Loaded skills (.claude/skills/build-execution/*)
- [x] System analysis performed (dependencies, ripples, integration)
- [x] TDD discipline followed (git shows TEST before FEAT)
- [x] Quality gates passed (lint+typecheck+test+build)
- [x] TRACED protocol applied (Test→Review→Execute)
- [x] LOGOS constraints enforced (showed ripple paths explicitly)
- [x] Consultation completed (code-review-specialist validated)
- [x] Artifacts provided (git commits with evidence)

## Git History Shows Constitutional Discipline

```bash
git log --oneline
b3f5a89 VERIFY: Quality gates passed for getScriptById
a7c2d41 FEAT: Implement getScriptById function
8e9f123 TEST: Add failing test for getScriptById function
```

**Evidence of I7 (TDD traceability):** ✅ TEST commit precedes FEAT commit
**Evidence of I8 (production-grade):** ✅ Lint/typecheck/test/build all passing
**Evidence of TRACED:** ✅ Test→Review→Execute sequence documented

## Key Takeaways for GitHub Agents

1. **Self-Activation Works:** Read tool sufficient for full constitutional loading
2. **OCTAVE Readable:** `KEY::VALUE` syntax mechanically executable
3. **Skills Modular:** 738 lines of build-execution loaded in 4 files
4. **Zero Duplication:** Single source of truth, no GitHub-specific versions needed
5. **Constitutional Fidelity:** Core Forces + SHANK overlays prevent drift
6. **Evidence-Based:** Git history provides reproducible proof of discipline

## Common Patterns

### Pattern 1: Feature Implementation
```
1. Detect role: implementation-lead
2. Read constitution + skills (build-execution/*)
3. System analysis (dependencies, ripples)
4. RED: Write failing test
5. GREEN: Minimal implementation
6. REFACTOR: (if needed)
7. Quality gates
8. Code review consultation
```

### Pattern 2: Test Creation
```
1. Detect role: universal-test-engineer
2. Read constitution + skills (test-infrastructure/*)
3. Coverage analysis (identify untested paths)
4. Framework detection (detect Jest/Vitest)
5. Generate tests (unit + integration + edge cases)
6. Validate coverage (90% minimum)
7. Test methodology guardian consultation
```

### Pattern 3: Architecture Validation
```
1. Detect role: critical-engineer
2. Read constitution (ETHOS/Athena+Hephaestus)
3. Technical analysis (evidence-based judgment)
4. Risk assessment (security, performance, reliability)
5. GO/NO-GO decision (with rationale)
6. Escalation (if architectural concerns)
```

## Troubleshooting

**"Skills reference external paths like /Users/shaunbuswell/"**
→ Ignore external paths. GitHub agents use project-local `.claude/skills/`

**"Constitution says Skill(build-execution)"**
→ Translate to: `Read: .claude/skills/build-execution/*.md`

**"How do I invoke code-review-specialist?"**
→ Read their constitution, apply their validation lens, document "Validated per code-review-specialist standards"

**"Tests are failing but I need to proceed"**
→ ❌ PROHIBITED by constitution. Fix tests or implementation, never proceed with failures.

---

**Version:** 1.0
**Authority:** subagent-creator
**Purpose:** Demonstrate GitHub agent self-activation with concrete example
**Date:** 2025-11-07
