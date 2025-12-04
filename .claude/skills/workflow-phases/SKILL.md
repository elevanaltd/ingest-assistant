---
name: workflow-phases
description: HestAI workflow phase execution including D0→D1→D2→D3→B0→B1→B2→B3→B4→B5 sequence, agent assignments per phase, phase transition validation, and deliverable requirements. Use when starting new phase, determining next steps, or validating phase completion.
allowed-tools: Read
---

# Workflow Phases Skill

## Purpose

Provides HestAI workflow phase sequence, agent assignments, entry requirements, and deliverables for D0→D1→D2→D3→B0→B1→B2→B3→B4→B5 phases. Essential for phase navigation and transition validation.

## When to Use This Skill

Auto-activates when:
- Starting new phase (D1, D2, D3, B0-B5)
- Determining next steps in workflow
- Phase transition validation
- "What phase am I in?"
- "What comes after B2?"
- Workflow sequence questions

---

## Phase Execution Map

### D-PHASES (Design)

| Phase | Lead Agent | Entry Requirement | Deliverable |
|-------|------------|-------------------|-------------|
| **D0** | sessions-manager | New idea | Graduation package |
| **D1** | idea-clarifier | Graduated idea | 2xx-PROJECT-NORTH-STAR.md |
| **D2** | ideator → validator → synthesizer | D1 complete | 2xx-PROJECT-D2-DESIGN.md |
| **D3** | design-architect → visual-architect | D2 complete | 2xx-PROJECT-D3-BLUEPRINT.md |

### B-PHASES (Build)

| Phase | Lead Agent | Entry Requirement | Deliverable |
|-------|------------|-------------------|-------------|
| **B0** | critical-design-validator | D3 complete | GO/NO-GO decision |
| **B1** | task-decomposer → workspace-architect | B0 GO | Build plan + workspace |
| **B2** | implementation-lead | B1 complete | Working code + tests |
| **B3** | completion-architect | B2 complete | Integrated system |
| **B4** | solution-steward | B3 complete | Production package |

### B4_DEPLOY PHASES

| Phase | Lead Agent | Entry Requirement | Deliverable |
|-------|------------|-------------------|-------------|
| **B4_D1** | system-steward | B4 complete | Staging deployment |
| **B4_D2** | solution-steward | Staging validated | Production deployment |
| **B4_D3** | system-steward | Production deployed | Operational confirmation |

### B5 (Enhancement)

**Scope**: ≤3 days work, triggered by GitHub issue or user feedback
**Process**: Follow B4_DEPLOY for deployment
**Protocol**: `/Users/shaunbuswell/.claude/protocols/ENHANCEMENT_LIFECYCLE.md`

---

## Phase Descriptions

### D0: Ideation Setup
**Purpose**: Capture raw idea, explore possibilities, determine viability
**Lead**: sessions-manager
**Entry**: New idea or concept
**Deliverable**: Graduation package with manifest.json
**Location**: `/Volumes/HestAI-Projects/0-ideation/{topic}/`

**Key Activities**:
- Create session directory structure
- Exploration and research
- Feasibility assessment
- Graduation decision

### D1: North Star Definition
**Purpose**: Define problem, requirements, success criteria
**Lead**: idea-clarifier
**Entry**: Graduated D0 package
**Deliverable**: `2xx-PROJECT-NORTH-STAR.md`
**Location**: `coordination/workflow-docs/`

**Key Activities**:
- Problem statement clarity
- Success criteria definition
- Constraint identification
- North Star documentation

#### D1 PARALLEL EXPLORATION PATTERN (RECOMMENDED)

**Purpose**: Accelerate D1 understanding through parallel codebase exploration

**When to Use**:
- D1 phase for projects involving existing codebase
- Understanding patterns, architecture, or prior art needed
- Multiple aspects require investigation

**Pattern**:
```python
# Launch 2-3 agents in parallel (max 3 for context overhead)
Task(subagent_type='Explore', prompt="Find similar features/patterns in codebase relevant to [problem]")
Task(subagent_type='Explore', prompt="Map high-level architecture relevant to [problem area]")
Task(subagent_type='research-analyst', prompt="Investigate external solutions/prior art for [problem type]")

# After all return:
# 1. Collect findings from all agents
# 2. Read key files identified by explorers
# 3. Synthesize into comprehensive picture for idea-clarifier
```

**Agent Prompts (Examples)**:
- "Find features similar to [feature] and trace their implementation comprehensively"
- "Map the architecture and abstractions for [feature area], tracing through the code comprehensively"
- "Analyze the current implementation of [existing feature/area], tracing through the code comprehensively"
- "Identify UI patterns, testing approaches, or extension points relevant to [feature]"

**Benefits**:
- **Breadth**: Multiple perspectives simultaneously
- **Speed**: Parallel ≠ sequential exploration
- **Coverage**: Architecture + patterns + external prior art

**Constraint**: Max 3 parallel agents (context overhead)

**Output**: Each agent should return list of 5-10 key files to read for deep understanding

### D2: Design Generation
**Purpose**: Generate solution alternatives, evaluate options
**Lead**: ideator → validator → synthesizer
**Entry**: D1 North Star complete
**Deliverable**: `2xx-PROJECT-D2-DESIGN.md`
**Location**: `coordination/workflow-docs/`

**Key Activities**:
- Solution brainstorming (ideator)
- Option validation (validator)
- Approach synthesis (synthesizer)
- Design documentation

### D3: Blueprint Creation
**Purpose**: Detailed technical design, architecture specification
**Lead**: design-architect → visual-architect
**Entry**: D2 Design complete
**Deliverable**: `2xx-PROJECT-D3-BLUEPRINT.md`
**Location**: `coordination/workflow-docs/` → moves to `dev/docs/architecture/` at B1 gate

**Key Activities**:
- Architecture design (design-architect)
- Visual mockups (visual-architect)
- Technical specification
- Blueprint documentation

### B0: Design Validation
**Purpose**: GO/NO-GO gate, validate D3 Blueprint before build
**Lead**: critical-design-validator
**Entry**: D3 Blueprint complete
**Deliverable**: GO/NO-GO decision document
**Location**: `coordination/workflow-docs/`

**Key Activities**:
- Technical feasibility validation
- Architecture review
- Risk assessment
- GO/NO-GO decision

### B1: Build Planning
**Purpose**: Decompose work, setup workspace, create build plan
**Lead**: task-decomposer → workspace-architect
**Entry**: B0 GO decision
**Deliverable**: Build plan + workspace infrastructure
**Location**: `coordination/phase-reports/`

**Key Activities**:
- Task decomposition (task-decomposer)
- Workspace setup (workspace-architect)
- Quality gates configuration
- B1 migration gate (D3 Blueprint → dev/)

**Critical**: B1_02 completes in ideation/, B1_03 starts in dev/ after manual migration

### B2: Implementation
**Purpose**: Write code, implement features, create tests
**Lead**: implementation-lead
**Entry**: B1 complete, workspace ready
**Deliverable**: Working code + passing tests
**Location**: `dev/`

**Key Activities**:
- TDD implementation (test first)
- Feature development
- Code review (code-review-specialist)
- Quality gate validation

**Hub Pattern**: implementation-lead coordinates specialist agents

### B3: Integration
**Purpose**: System integration, end-to-end testing, polish
**Lead**: completion-architect
**Entry**: B2 complete, features implemented
**Deliverable**: Integrated, tested system
**Location**: `dev/`

**Key Activities**:
- Component integration
- System testing (universal-test-engineer)
- Bug fixes and polish
- Integration documentation

### B4: Delivery
**Purpose**: Package solution, documentation, handoff preparation
**Lead**: solution-steward
**Entry**: B3 complete, system integrated
**Deliverable**: Production-ready package
**Location**: `dev/` + `coordination/`

**Key Activities**:
- Documentation finalization
- User guides creation
- Handoff preparation
- Success metrics definition

### B4_D1: Staging Deployment
**Purpose**: Deploy to staging, validate configuration
**Lead**: system-steward
**Entry**: B4 complete
**Deliverable**: Staging deployment validated
**Location**: `staging/`

**Key Activities**:
- Staging configuration
- Deployment validation
- Environment testing
- Configuration documentation

### B4_D2: Production Deployment
**Purpose**: Deploy to production, operational handoff
**Lead**: solution-steward
**Entry**: Staging validated
**Deliverable**: Production deployment
**Location**: `production/`

**Key Activities**:
- Production deployment
- Smoke testing
- Operational confirmation
- User notification

### B4_D3: Operational Confirmation
**Purpose**: Verify production operation, monitoring setup
**Lead**: system-steward
**Entry**: Production deployed
**Deliverable**: Operational confirmation
**Location**: `production/`

**Key Activities**:
- Production monitoring
- Issue tracking setup
- Documentation final review
- Operational handoff complete

### B5: Enhancement
**Purpose**: Small improvements, bug fixes, feature enhancements
**Scope**: ≤3 days work
**Entry**: GitHub issue or user feedback
**Deliverable**: Enhancement deployed
**Location**: `dev/` + deployment via B4_DEPLOY

**Key Activities**:
- Requirement analysis (requirements-steward)
- Implementation (implementation-lead)
- Testing and validation
- Deployment via B4_DEPLOY process

---

## Coordination Discovery Pattern

**ALWAYS check for coordination first:**
```bash
if [ -e ".coord" ]; then
  COORD=$(readlink .coord)
elif [ -d "coordination" ]; then
  COORD="./coordination"
elif [ -d "../../../coordination" ]; then
  COORD="../../../coordination"
else
  echo "WARNING: No coordination found"
fi
```

**Read status before any work:**
```bash
Read("$COORD/PROJECT_STATUS.md")
# Extract: Current Phase: [phase]
# Extract: Active Issues: [list]
# Extract: Blocking Issues: [list]
```

---

## Project Structure Template

```
{project-name}/
├── build/              # Development (worktree)
│   └── .coord → ../coordination
├── staging/            # Staging deployment
│   ├── claude_desktop_config_staging.json
│   └── .coord → ../coordination
├── production/         # Production deployment
│   ├── claude_desktop_config.json
│   └── .coord → ../coordination
└── coordination/       # All documentation
    ├── workflow-docs/  # Phase deliverables (D1, D2, D3, B0)
    ├── phase-reports/  # Phase reports (B1-B4)
    ├── planning-docs/  # CHARTER, ASSIGNMENTS, PROJECT-CONTEXT
    └── ACTIVE-WORK.md  # Status board
```

---

## Phase Transition Validation

### Before Starting Phase

**Checklist**:
1. ✅ Previous phase deliverable complete
2. ✅ Entry requirements met
3. ✅ Coordination context read
4. ✅ Current phase understood
5. ✅ Lead agent identified

### Before Completing Phase

**Checklist**:
1. ✅ Deliverable created and documented
2. ✅ Quality gates passed (where applicable)
3. ✅ Phase report written
4. ✅ Next phase entry requirements met
5. ✅ Handoff to next lead agent prepared

---

## Common Phase Transitions

### D3 → B0 → B1
```bash
# D3 complete: Blueprint created in coordination/
# B0: Validate blueprint, GO/NO-GO decision
# B1: Create build plan, setup workspace
# B1 Migration Gate: Move D3 Blueprint to dev/docs/architecture/
```

### B1 → B2
```bash
# B1 complete: Workspace ready, quality gates passing
# Verify: npm run lint && npm run typecheck && npm run test → ALL PASSING
# B2: Start implementation with TDD
```

### B2 → B3 → B4
```bash
# B2 complete: Features implemented, tests passing
# B3: Integration and system testing
# B4: Package for delivery, documentation finalized
```

### B4 → B4_D1 → B4_D2 → B4_D3
```bash
# B4 complete: Production-ready package
# B4_D1: Deploy to staging, validate
# B4_D2: Deploy to production
# B4_D3: Operational confirmation
```

---

## Critical Rules

1. **Work stops when user unavailable** (no assumptions)
2. **Read coordination before ANY work**
3. **Phase deliverables are mandatory** (no skipping)
4. **Quality gates must pass** before phase transitions
5. **B1 migration gate** requires human checkpoint
6. **B4_DEPLOY required** for ALL deployments
7. **B5 scope limited** to ≤3 days or new project

---

## Agent Invocation Pattern

**ALWAYS include context:**
```python
Task(subagent_type="agent-name",
     prompt="""
     CONTEXT PATHS:
     - Protocols: /Users/shaunbuswell/.claude/protocols/
     - Workflow: /Volumes/HestAI/docs/workflow/001-WORKFLOW-NORTH-STAR.md
     - Coordination: {readlink .coord || ./coordination}
     - Current Phase: {from PROJECT_STATUS.md}

     TASK: [actual task description]
     """)
```

---

## Key Takeaways

1. **Phase sequence**: D0→D1→D2→D3→B0→B1→B2→B3→B4→B4_D1→B4_D2→B4_D3→B5
2. **Lead agents assigned**: Each phase has designated lead agent
3. **Entry requirements mandatory**: Cannot skip phase prerequisites
4. **Deliverables required**: Each phase produces specific artifact
5. **Coordination first**: Always read PROJECT_STATUS.md before work
6. **B1 migration gate**: Human checkpoint moves D3 Blueprint
7. **Quality gates critical**: B1→B2 requires passing tests
8. **Deployment structured**: B4_DEPLOY phases for all deployments
9. **B5 scope limited**: ≤3 days or start new project
10. **Phase transitions validated**: Checklist before starting/completing
