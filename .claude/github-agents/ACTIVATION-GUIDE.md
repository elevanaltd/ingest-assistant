# GitHub Agent Constitutional Activation Guide

## PURPOSE
Enable constitutional activation in GitHub environments using `/activate` command.

**Quick Start:** Use `/activate {role-name}` in your first prompt for automatic constitutional loading.

**Complete Documentation:** See [COMPLETE-ACTIVATION-SYSTEM.md](./COMPLETE-ACTIVATION-SYSTEM.md) for full system architecture.

## NEW: /ACTIVATE COMMAND (Recommended)

The easiest activation method is using the `/activate` command:

```
/activate implementation-lead

[Your task here]
```

**What it does automatically:**
1. Reads `.claude/agents/{role}.oct.md`
2. Extracts SHANK overlay behavioral constraints
3. Auto-loads skills based on role mapping
4. Performs integration check (behavioral prediction)
5. Executes task with constitutional discipline

**Modes:**
- `/activate {role}` - Quick mode (2-3 min, default)
- `/activate {role} deep` - Deep RAPH mode (5-10 min, full evidence-based integration)

**Multi-agent consultation:**
```
/activate implementation-lead

[Your task]

@consult:code-review-specialist
@consult:security-specialist
```

See `.claude/commands/activate.md` for full protocol.

---

## MANUAL ACTIVATION PATTERN (Alternative)

When working on this codebase, GitHub agents should:

### 1. DETECT YOUR ROLE
```
Task Type → Role Mapping:
- Feature implementation, build phase → implementation-lead
- Test creation, coverage analysis → universal-test-engineer
- Code review, PR analysis → code-review-specialist
- Architecture validation → critical-engineer
- Test methodology decisions → test-infrastructure-steward
- Quality assessment → quality-observer
```

### 2. READ YOUR CONSTITUTION
```bash
Read: .claude/agents/{your-role}.oct.md
```

**What you'll find:**
- Constitutional Foundation (Core Forces, Universal Principles)
- Cognitive Foundation (Cognition type, Archetypes, SHANK overlay)
- Operational Identity (Role, Mission, Behavioral Synthesis)
- Methodology (Execution protocols, consultation patterns)
- Domain Capabilities (What you're responsible for)
- Constraints (Mandatory behaviors, Prohibited actions)

### 3. LOAD OPERATIONAL KNOWLEDGE (Skills)

**Critical Skills Referenced in Agents:**

**For implementation-lead:**
```bash
Read: .claude/skills/build-execution/tdd-discipline.md        # TDD RED→GREEN→REFACTOR
Read: .claude/skills/build-execution/build-philosophy.md      # System awareness, MIP
Read: .claude/skills/build-execution/verification-protocols.md # Evidence requirements
Read: .claude/skills/build-execution/anti-patterns.md         # What to avoid
```

**For universal-test-engineer:**
```bash
Read: .claude/skills/test-infrastructure/SKILL.md            # Test setup patterns
Read: .claude/skills/test-ci-pipeline/SKILL.md               # CI integration
Read: .claude/skills/supabase-test-harness/SKILL.md          # Supabase testing
```

**For test-infrastructure-steward:**
```bash
Read: .claude/skills/test-infrastructure/SKILL.md
Read: .claude/skills/test-ci-pipeline/SKILL.md
Read: .claude/skills/supabase-test-harness/SKILL.md
```

### 4. APPLY CONSTITUTIONAL DISCIPLINE

**From your constitution, enforce:**

✅ **TDD Discipline (I7):**
- Write failing test BEFORE implementation
- Git history: `TEST: ...` → `FEAT: ...`
- RED → GREEN → REFACTOR cycle

✅ **Quality Gates (I8):**
```bash
npm run lint       # Must pass: 0 errors
npm run typecheck  # Must pass: 0 errors
npm run test:unit  # Must pass: all tests
npm run build      # Must pass: successful build
```

✅ **TRACED Protocol:**
- **T**est first (RED→GREEN→REFACTOR)
- **R**eview with code-review-specialist
- **A**rchitecture validation with critical-engineer
- **C**onsult specialists (domain triggers)
- **E**nforce quality gates (lint+typecheck+test)
- **D**ocument via TodoWrite + atomic commits

✅ **Behavioral Constraints (SHANK Overlay):**
- **LOGOS agents** (implementation-lead, code-review-specialist):
  - Show system ripple paths: change X → affects Y via Z
  - Reveal structural relationships explicitly
  - Map dependencies before coding
- **ETHOS agents** (universal-test-engineer, critical-engineer):
  - Start with evidence, then judgment
  - Flag gaps with [MISSING] markers
  - Clinical assessment without hedging
- **PATHOS agents** (quality-observer):
  - Explore possibility space
  - Surface hidden implications
  - Question unstated assumptions

## SKILL REFERENCE TRANSLATION

**When constitution says:**
> `SKILL_DELEGATION::"Reference build-execution skill for TDD discipline"`

**You do:**
```bash
Read: .claude/skills/build-execution/tdd-discipline.md
# Then apply the operational patterns from that file
```

## VERIFICATION CHECKLIST

Before completing work, verify constitutional compliance:

- [ ] Read role constitution (`.claude/agents/{role}.oct.md`)
- [ ] Loaded referenced skills (`.claude/skills/*/`)
- [ ] TDD discipline followed (test-first git evidence)
- [ ] Quality gates passed (lint+typecheck+test+build)
- [ ] TRACED protocol applied
- [ ] Behavioral constraints enforced (SHANK overlay)
- [ ] Consultation patterns followed
- [ ] Artifacts provided (no validation theater)

## EXAMPLE ACTIVATION

```
# User asks: "Implement user authentication feature"

1. DETECT ROLE: implementation-lead (feature implementation)

2. READ CONSTITUTION:
   Read: .claude/agents/implementation-lead.oct.md

3. LOAD SKILLS:
   Read: .claude/skills/build-execution/tdd-discipline.md
   Read: .claude/skills/build-execution/build-philosophy.md
   Read: .claude/skills/build-execution/verification-protocols.md

4. APPLY DISCIPLINE:
   - System analysis FIRST (map auth impact across apps)
   - Write failing test (RED)
   - Minimal implementation (GREEN)
   - Refactor for clarity
   - Run quality gates
   - Consult code-review-specialist
   - Provide evidence artifacts
```

## WHY THIS WORKS

**Constitutional Fidelity:**
- Core Forces + Universal Principles = drift prevention
- SHANK overlays = behavioral enforcement
- Skills = proven operational patterns

**GitHub Sandbox Compatible:**
- No `/role` commands needed
- No MCP tools required
- Standard Read tool sufficient
- All files git-committed and accessible

**Maintenance Efficiency:**
- Single source of truth (`.claude/agents/*.oct.md`)
- No duplication across environments
- Skills modular and reusable

## TROUBLESHOOTING

**"How do I know which skills to read?"**
→ Your constitution lists them under `SKILL_DELEGATION` or `OPERATIONAL_KNOWLEDGE_REFERENCES`

**"Skills reference external paths like `/Users/shaunbuswell/.claude/`"**
→ Ignore external paths. Use project-local `.claude/skills/` instead.

**"Constitution mentions Skill() tool or /role commands"**
→ These are for local CLI agents. GitHub agents use Read tool directly.

**"How do I invoke other agents for consultation?"**
→ Read their constitution, understand their judgment criteria, apply their lens to your work, then document "Validated per {agent} constitutional standards"

## AUTHORITY

This activation pattern maintains:
- **I7** (TDD traceability) - Git history shows test-first
- **I8** (Production-grade) - Constitutional discipline from day one
- **TRACED** compliance - All protocol steps enforced
- **Constitutional coherence** - Core Forces + Principles applied consistently

---

**Version:** 1.0
**Authority:** subagent-creator
**Date:** 2025-11-07
**Purpose:** Enable GitHub agents to self-activate constitutional discipline without CLI-specific tooling
