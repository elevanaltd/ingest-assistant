# Design Command

Execute D0→D3 design workflow phases.

## Usage

```bash
# Simple case - provide project description
/design Build a task management app with team collaboration

# With specific phase
/design --phase=D1 "Build a task management app with team collaboration"

# Other operations
/design --status          # Check current design phase status
/design --validate        # Validate design completeness

# Full examples
/design Web-based inventory system for retail chain
/design --phase=D0 "Mobile app for fitness tracking"
/design --phase=D3 "Continue architecture for task manager"
```

## Context Passing

The command accepts project context in three ways:

1. **Everything after command** (simplest, most common):
   ```bash
   /design Build a collaborative documentation platform
   ```

2. **Quoted when using flags**:
   ```bash
   /design --phase=D2 "Build a collaborative documentation platform"
   ```

3. **After separator for complex cases**:
   ```bash
   /design --phase=D1 -- Build a platform with: real-time editing, version control, and team permissions
   ```

## Design Phases

### D0: IDEATION SETUP → SESSION ESTABLISHMENT
**Lead Agent**: sessions-manager
**Purpose**: Create ideation session structure and exploration framework

**Sub-phases**:
1. **D0_01**: sessions-manager - Create session in `/Volumes/HestAI-Projects/0-ideation/sessions/`
2. **D0_02**: sessions-manager - Establish exploration framework
3. **D0_03**: sessions-manager - Prepare graduation package for workspace-architect

**Deliverable**: Complete ideation session ready for graduation

### D1: NATURAL UNDERSTANDING FLOW → NORTH STAR ESTABLISHMENT
**Lead Agent**: idea-clarifier (natural conversational entry point)
**Purpose**: Natural conversational flow to establish project understanding through problem-focused synthesis

**Natural D1 Conversation Flow**:
1. **Idea Exploration** (natural dialogue continuation):
   - Asks clarifying questions in natural dialogue
   - Identifies assumptions and scope boundaries
   - Documents evolving understanding throughout conversation
   - Validates understanding with user iteratively

2. **Autonomous Research Integration** (if needed for problem understanding):
   - Uses `mcp__deep-research__deep-research` for autonomous market and problem research
   - Calls `mcp__Context7__resolve-library-id` and `mcp__Context7__get-library-docs` for domain knowledge
   - Uses `WebSearch` for existing solutions and market landscape
   - Research focuses on PROBLEM SPACE (who else has this problem, current solutions, why they fail)
   - NO technical feasibility analysis at this stage
   - Integrates research findings naturally into conversation flow

3. **Problem-Space Requirements Synthesis** (NO technical validation):
   - Synthesizes user needs + research into CORE REQUIREMENTS (WHAT, not HOW)
   - Focuses on problem definition, user value, and success outcomes
   - Creates SYSTEM-AGNOSTIC requirements (capabilities, not implementations)
   - NO technical validation at this stage (no architects, no engineers)
   - Only validates with user: "Does this capture the problem you want solved?"
   - Creates problem statement through natural conversation

4. **North Star Creation** (Problem-focused, not solution-focused):
   - Creates `200-PROJECT-{TOPIC}-D1-NORTH-STAR.md`
   - Documents PROBLEM STATEMENT, TARGET USERS, CORE REQUIREMENTS (system-agnostic)
   - Defines VALUE PROPOSITIONS and SUCCESS CRITERIA (user outcomes, not technical metrics)

5. **Requirements Validation** (Problem-space validation only):
   - Calls `requirements-steward` via Task tool for problem clarity validation
   - Requirements-steward validates PROBLEM is well-defined (not solution)
   - Confirms North Star captures user need and business value

**Deliverable**: `200-PROJECT-{TOPIC}-D1-NORTH-STAR.md` (PROBLEM-FOCUSED, SYSTEM-AGNOSTIC)

### D2: SYNTHESIS TRIANGLE → BREAKTHROUGH INNOVATION
**Pattern**: Ideator (possibilities) ↔ Validator (constraints) → Synthesiser (breakthrough innovation from tension)
**Purpose**: Generate breakthrough solutions through creative tension and synthesis

**The Innovation Triangle**:
1. **D2_01**: ideator (with edge-optimizer enhancement)
   - **Lead Agent**: `ideator`
   - Reads approved North Star from D1 (problem-focused requirements)
   - Calls `edge-optimizer` via Task tool for breakthrough creative exploration
   - Generates multiple creative approaches that solve the core problem in unexpected ways
   - Challenges conventional solution patterns
   - Explores edges of what's possible
   - Documents innovative enhancements beyond minimum requirements
   - Creates wild, ambitious solutions without constraint consideration
   - **Output**: `D2_01-IDEAS.md` - Creative solutions focused on possibility

2. **D2_02**: validator (brutal reality check)
   - **Lead Agent**: `validator` 
   - Reads creative solutions from D2_01
   - Calls `mcp__Context7__resolve-library-id` and `mcp__Context7__get-library-docs` for implementation reality
   - Uses `mcp__hestai__critical-engineer` for technical feasibility validation
   - **DIRECTLY CHALLENGES** ideator's solutions with harsh constraints
   - Applies real-world limitations, resource constraints, technical boundaries
   - Documents what WON'T work and why
   - **Creates productive conflict** with ideator vision
   - **Output**: `D2_02-CONSTRAINTS.md` - Brutal reality constraints

3. **D2_02B**: edge-optimizer (OPTIONAL breakthrough exploration)
   - **Lead Agent**: `edge-optimizer` (triggered if validator identifies untapped potential)
   - Explores specific constraint boundaries identified by validator
   - Focuses on turning constraints into opportunities
   - Documents edge discoveries and optimization beyond standard constraints
   - **Output**: `D2_02B-EDGE_DISCOVERIES.md` (if triggered)

4. **D2_03**: synthesiser (breakthrough from tension)
   - **Lead Agent**: `synthesiser`
   - Reads the **TENSION** between D2_01 wild possibilities and D2_02 harsh constraints
   - Uses `mcp__hestai__consensus` for multi-perspective synthesis
   - **Finds the breakthrough innovation** in the conflict between vision and reality
   - Creates "third way" solutions that transcend either/or limitations
   - Merges best elements while honoring both possibility and constraint
   - **REQUIRES APPROVAL** from both ideator and validator (synthesis consensus)
   - **Output**: `D2_03-DESIGN.md` - Breakthrough design from synthesis

**The Key Innovation**: Solutions emerge from the **creative tension** between unlimited possibility (ideator) and harsh reality (validator), synthesized into breakthrough approaches that honor both.

**Deliverables**: 
- `D2_01-IDEAS.md` (wild creative possibilities)
- `D2_02-CONSTRAINTS.md` (brutal reality check) 
- `D2_02B-EDGE_DISCOVERIES.md` (breakthrough boundary exploration - optional)
- `D2_03-DESIGN.md` (breakthrough synthesis from tension)

### D3: ARCHITECTURE → TECHNICAL BLUEPRINT
**Lead Agents**: design-architect → visual-architect → technical-architect → security-specialist
**Purpose**: Transform design into buildable architecture

**Sub-phases**:
1. **D3_01**: design-architect - Create technical architecture
2. **D3_02**: visual-architect - Create mockups and validate with user
3. **D3_03**: technical-architect - Validate scalability/maintainability
4. **D3_04**: security-specialist - Review security considerations

**Deliverables**: 
- `2xx-PROJECT[-{NAME}]-D3-BLUEPRINT.md`
- `2xx-PROJECT[-{NAME}]-D3-MOCKUPS.md`
- `2xx-PROJECT[-{NAME}]-D3-VISUAL-DECISIONS.md`

## Execution Pattern

```python
# Execute with context from command
# User runs: /design Build a task management app
Task(subagent_type="sessions-manager",
     prompt="Lead D0 phase to establish ideation session.
     
     PROJECT DESCRIPTION: Build a task management app
     BASE PATH: /Volumes/HestAI-Projects/0-ideation/sessions/
     
     Create session structure and prepare for D1 entry.")

# Read coordination after D0 establishes it
Read(".coord/PROJECT_CONTEXT.md")

# Execute D1 with context
Task(subagent_type="idea-clarifier",
     prompt="Lead D1 phase to establish North Star.
     
     PROJECT DESCRIPTION: Build a task management app
     COORDINATION CONTEXT:
     {coordination_summary}")

# Execute D2 (after D1 complete)
Task(subagent_type="ideator",
     prompt="Lead D2 phase to generate solutions.
     
     PROJECT DESCRIPTION: Build a task management app
     NORTH STAR CONTEXT:
     {north_star_document}")

# Execute D3 (after D2 complete)
Task(subagent_type="design-architect",
     prompt="Lead D3 phase to create blueprint.
     
     PROJECT DESCRIPTION: Build a task management app
     DESIGN APPROACH:
     {d2_design_document}")
```

## Validation Checklist

### D0 Completeness
- [ ] Session created in /Volumes/HestAI-Projects/0-ideation/sessions/
- [ ] Exploration framework established
- [ ] Initial concept documented
- [ ] Graduation criteria assessed
- [ ] Ready for D1 entry

### D1 Completeness
- [ ] Problem clearly understood
- [ ] Requirements documented
- [ ] Constraints identified
- [ ] Success criteria defined
- [ ] North Star immutable

### D2 Completeness
- [ ] Multiple solutions explored
- [ ] Constraints validated
- [ ] Synthesis achieved
- [ ] Rationale documented

### D3 Completeness
- [ ] Technical architecture complete
- [ ] Visual mockups approved
- [ ] Security reviewed
- [ ] Scalability validated
- [ ] Ready for B0 gate

## RACI Framework

### D0 RACI
- **R**: sessions-manager
- **A**: sessions-manager
- **C**: (none - pre-formal workflow)
- **I**: (potential stakeholders)

### D1 RACI
- **R**: idea-clarifier, research-analyst, requirements-steward
- **A**: critical-engineer
- **C**: (none - discovery phase)
- **I**: (none - no implementation yet)

### D2 RACI
- **R**: ideator, validator, synthesizer
- **A**: critical-engineer
- **C**: requirements-steward, technical-architect
- **I**: (none - still in design)

### D3 RACI
- **R**: design-architect, visual-architect, technical-architect, security-specialist
- **A**: critical-engineer
- **C**: requirements-steward
- **I**: implementation-lead

## Design Quality Gates

Before proceeding to B0:
1. North Star approved and immutable
2. Design approach validated
3. Blueprint complete and reviewed
4. User validation obtained (D3_02)
5. Security considerations addressed
6. All assumption audits complete

## Common Patterns

### Starting New Project (with ideation)
```bash
/design --phase=D0
# Complete D0 ideation setup, then:
/design --phase=D1
# Complete D1, then:
/design --phase=D2
# Complete D2, then:
/design --phase=D3
```

### Starting from Existing Ideation
```bash
/design --phase=D1
# If session already exists, start from D1
```

### Full Design Workflow
```bash
/design
# Executes D0→D3 with handoffs (or D1→D3 if session exists)
```

### Check Status
```bash
/design --status
# Shows current phase and deliverables
```

## Protocol References

- Workflow: `/Volumes/HestAI/docs/workflow/001-WORKFLOW-NORTH-STAR.md`
- Standards: `/Volumes/HestAI/docs/standards/101-DOC-STRUCTURE-AND-NAMING-STANDARDS.md`

## Exit Criteria

Design phase complete when:
- All D1-D3 deliverables exist
- User validation obtained
- Ready for B0 validation gate
- No blocking issues identified

---

**REMEMBER**: Design quality determines build success. Take time to get it right!