---
name: documentation-placement
description: Document placement rules, visibility protocols, and timeline test (before-code vs after-code). Defines where documentation belongs (dev/docs/ vs coordination/), documentation-first PR protocol, and phase artifact placement. Critical for documentation organization and visibility.
allowed-tools: Read, Write, Bash
---

# Documentation Placement Skill

## Purpose

Provides rules for document placement across repository boundaries, ensures documentation visibility through timeline-based logic, and enforces documentation-first workflow.

## When to Use This Skill

Auto-activates when:
- Creating new documentation ("document this", "write docs")
- Deciding where documentation belongs ("where should this go")
- Phase artifact placement (D1, D2, D3, B0-B4 reports)
- Documentation-first PR workflow
- Coordinating documentation across dev/ and coordination/ repos

---

## Core Principle: Timeline Test

**DOCUMENT_PLACEMENT_LOGIC**:
```
IF document_created_before_code_exists:
  THEN: coordination/workflow-docs/

IF document_describes_actual_implementation:
  THEN: dev/docs/

IF document_guides_implementation:
  THEN: dev/docs/ (e.g., D3-BLUEPRINT-ORIGINAL.md)
```

**Why**: Timeline determines placement - planning docs go in coordination/, implementation docs go in dev/.

---

## Repository Structure

### Coordination Repository (`coordination/`)
**Purpose**: Planning, phase artifacts, project management

```
coordination/
├── workflow-docs/
│   ├── D1-NORTH-STAR.md           # Requirements (phase artifact)
│   ├── D2-DESIGN.md               # Design approach
│   └── B0-VALIDATION.md           # Gate decision
├── phase-reports/
│   ├── B1-BUILD-PLAN.md           # Planning report
│   ├── B2-IMPLEMENTATION.md       # Build report
│   ├── B3-INTEGRATION.md          # Integration report
│   └── B4-DELIVERY.md             # Delivery report
├── planning-docs/
│   ├── CHARTER.md                 # Project charter
│   ├── ASSIGNMENTS.md             # Agent assignments
│   └── PROJECT-CONTEXT.md         # Current status
└── ACTIVE-WORK.md                 # Status board
```

### Dev Repository (`dev/`)
**Purpose**: Implementation documentation, technical guides, API docs

```
dev/docs/
├── architecture/
│   ├── D3-BLUEPRINT-ORIGINAL.md   # The contract (from D3)
│   ├── ARCHITECTURE-AS-BUILT.md   # Implementation reality
│   └── ARCHITECTURE-DEVIATIONS.md # Explained differences
├── adr/
│   └── ADR-XXXX-{decision}.md     # Implementation decisions
├── api/
│   └── {endpoint}-api.md          # API documentation
└── guides/
    └── {feature}-guide.md         # Technical guides
```

---

## Phase Artifact Placement Rules

```
D1_NORTH_STAR    → coordination/workflow-docs/
D2_DESIGN        → coordination/workflow-docs/
D3_BLUEPRINT     → dev/docs/architecture/D3-BLUEPRINT-ORIGINAL.md
B0_VALIDATION    → coordination/workflow-docs/
B1-B4_REPORTS    → coordination/phase-reports/
```

**Critical**: D3 Blueprint moves FROM coordination TO dev/ at B1 migration gate.

---

## Documentation-First PR Protocol

### Core Principle
**"Documentation isn't a side effect of code, it's a prerequisite for code."**

### Workflow Sequence
```bash
# 1. Create and merge documentation FIRST
git checkout -b docs/adr-001
echo "# ADR-001: CQRS Implementation" > docs/adr/ADR-001.md
git add docs/adr/ADR-001.md
git commit -m "docs: Add ADR-001 for CQRS implementation"
git push origin docs/adr-001
gh pr create --title "docs: ADR-001 CQRS Implementation"
gh pr merge --merge

# 2. Implementation PR references merged docs
git checkout -b feat/cqrs-implementation
# ... implement code ...
git commit -m "feat: Implement CQRS per ADR-001

Implements decision from docs/adr/ADR-001.md (merged in PR #123)"
```

### PR Merge Strategy
```
DOCUMENT_TYPE         MERGE_STRATEGY
D3-BLUEPRINT         → Immediate merge before B0
ADRs                 → Immediate merge before implementation
API_DOCS             → Merge with or before implementation
ARCHITECTURE_AS_BUILT → Merge with implementation
DEVIATIONS           → Update as discovered
```

---

## B1 Migration Gate Enforcement

### Directory Context Requirements
```
B1_EXECUTION_FLOW:
  B1_01[task-decomposer]     → EXECUTE_IN[ideation_directory]
  B1_02[workspace-architect]  → EXECUTE_IN[ideation_directory]

  MIGRATION_GATE:
    ⚠️ STOP - Human checkpoint
    - Verify D3-BLUEPRINT moved to dev/docs/architecture/
    - Confirm coordination structure updated
    - cd /Volumes/HestAI-Projects/{PROJECT}/dev/

  B1_03[workspace-architect]  → VALIDATE_IN[dev_directory]
  B1_04[implementation-lead]  → EXECUTE_IN[dev_directory]
  B1_05[build-plan-checker]   → EXECUTE_IN[dev_directory]
```

**Critical**: B1_02 completes in ideation/, B1_03 starts in dev/ after manual migration.

---

## ACTIVE-WORK.md Status Board

### Purpose
Mitigate worktree isolation by maintaining visible status board in coordination/.

### Template
```markdown
# Active Work Status Board
_Last Updated: 2025-11-12 14:30 PST_

## Feature: CQRS Implementation (worktree: feat-cqrs)
- Blueprint: [D3-BLUEPRINT-ORIGINAL.md](../dev/docs/architecture/D3-BLUEPRINT-ORIGINAL.md)
- ADR: [ADR-001](../dev/docs/adr/ADR-001.md) ✅ MERGED
- Status: Implementing (B2_02)
- PR: [#456](link) [WIP]
- Agent: implementation-lead

## Feature: Authentication (worktree: feat-auth)
- ADR: [ADR-002](link) 🔄 IN REVIEW
- Status: Design (awaiting ADR merge)
- Agent: security-specialist
```

### Visibility Rules
1. Check ACTIVE-WORK.md before starting work
2. Update status when creating worktree
3. Link PRs for documentation visibility
4. Mark completion when merging

---

## Front-Matter Requirements

### Architecture Documents
```yaml
---
applies_to_tag: v1.0.0-beta1
supersedes: null
superseded_by: null
schema_version: 1.0
phase: D3
status: ORIGINAL | AS_BUILT | DEVIATION
---
```

### ADR Front-Matter
```yaml
---
adr_number: 001
title: CQRS Four-Tool Pattern
status: ACCEPTED | SUPERSEDED | DEPRECATED
decision_date: 2025-11-12
implements: D3-BLUEPRINT-ORIGINAL.md#section
deviates_from: null
---
```

---

## Phase Transition Cleanup Protocol

### Mandatory Cleanup Points
```
CLEANUP_REQUIRED_AT:
  - B1_02 completion (before migration gate)
  - B2_04 completion (before B3)
  - B3_04 completion (before B4)
  - B4_05 completion (before delivery)
```

### Cleanup Sequence
```
1. holistic-orchestrator → directory-curator[analyze]
2. directory-curator → REPORT[violations]
3. holistic-orchestrator → workspace-architect[fix]
4. workspace-architect → git commit[clean state]
```

---

## Agent Responsibilities

### Agent Boundaries
```
directory-curator:    Reports violations only, never fixes content
workspace-architect:  Fixes placement violations, owns migrations
system-steward:      Documents patterns and wisdom
holistic-orchestrator: Enforces at phase gates
hestai-doc-steward:  Governs /docs/ areas in HestAI repo
```

---

## Common Patterns

### Pattern 1: Creating Phase Artifact
```bash
# Example: D1 North Star creation
cd /Volumes/HestAI-Projects/{project}/coordination/workflow-docs/
echo "# D1-NORTH-STAR" > D1-NORTH-STAR.md
# Add content...
git add workflow-docs/D1-NORTH-STAR.md
git commit -m "docs: Add D1 North Star phase artifact"
```

### Pattern 2: Moving D3 Blueprint at B1 Gate
```bash
# Human checkpoint at B1 migration gate
cd /Volumes/HestAI-Projects/{project}
mv coordination/workflow-docs/D3-BLUEPRINT.md dev/docs/architecture/D3-BLUEPRINT-ORIGINAL.md
git add .
git commit -m "docs: Migrate D3 Blueprint to dev/ at B1 gate"
cd dev/
# Continue with B1_03...
```

### Pattern 3: Documentation-First ADR
```bash
# 1. Write ADR first
cd /Volumes/HestAI-Projects/{project}/dev
git checkout -b docs/adr-005
echo "# ADR-005: Authentication Strategy" > docs/adr/ADR-005.md
# Add content with front-matter...
git add docs/adr/ADR-005.md
git commit -m "docs: Add ADR-005 for authentication strategy"
gh pr create --title "docs: ADR-005 Authentication Strategy"
gh pr merge --merge

# 2. Implement referencing merged ADR
git checkout -b feat/auth-implementation
# Implementation...
git commit -m "feat: Implement authentication per ADR-005"
```

---

## Key Takeaways

1. **Timeline determines placement**: Before code = coordination/, after code = dev/
2. **Documentation-first**: Merge docs before implementation code
3. **Phase artifacts have designated homes**: D1-D2-B0 in coordination/, D3+ in dev/
4. **ACTIVE-WORK.md prevents isolation**: Update status board for visibility
5. **B1 migration gate**: Human checkpoint moves D3 Blueprint to dev/
6. **Front-matter required**: Architecture docs and ADRs need valid YAML
7. **Cleanup at phase gates**: Enforce clean state before transitions
8. **Agent boundaries clear**: directory-curator reports, workspace-architect fixes
