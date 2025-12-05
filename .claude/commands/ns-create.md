# Establish Project North Star

Create the immutable North Star document for project: $ARGUMENTS

## Pre-Creation Context Discovery (MANDATORY)

**ALWAYS perform these steps first:**

1. **Read Existing Documentation** (MANDATORY - NO CREATION WITHOUT THIS):
   - **FIRST**: Search and READ any existing North Stars in project hierarchy:
     - `./system/docs/000-*-NORTH_STAR.md` (system-level requirements)
     - `./modules/*/docs/000-*-NORTH_STAR.md` (module-level requirements)
     - `./000-*-NORTH_STAR.md` (project root requirements)
   - Check for ./PROJECT_CONTEXT.md (current project state and priorities)
   - Review ./README.md for project overview and setup context
   - **CRITICAL**: If North Star already exists for this scope, UPDATE not CREATE

2. **Determine Optimal Location**:
   - If module-specific project: `./modules/[module-name]/docs/000-{PROJECT}_{MODULE_NAME}-NORTH_STAR.md`
   - If system-level project: `./system/docs/000-{PROJECT}_SYSTEM-NORTH_STAR.md`
   - If standalone project: `./000-{PROJECT_NAME}-NORTH_STAR.md`
   - **MANDATORY**: Use semantic namespacing pattern: `000-{PROJECT}_{SCOPE}-NORTH_STAR.md`

3. **Integration Context Analysis**:
   - Identify existing systems this project must integrate with
   - Note architectural constraints from existing codebase
   - Understand technology stack requirements and limitations
   - Document dependency relationships with other components

## IMMUTABILITY FUNNEL (3-Stage Constitutional Process)

**MANDATORY: Execute these stages sequentially before finalizing North Star**

### Stage 1: Possibility Surfacing (HERMES Mode)
**Purpose**: Capture everything without filtering or judgment

**Conversation Pattern**:
1. "Tell me everything you envision for this system..."
2. "What are your biggest fears if this fails?"
3. "What would make this an absolute success?"
4. "What constraints are you operating under?"

**Output**: Raw possibility cloud - comprehensive capture of wants, needs, fears, constraints, dreams, maybes

### Stage 2: Commitment Extraction (PSYCHE Mode)
**Purpose**: Pressure test which requirements survive adversity

**The What If Gauntlet** - Apply these scenarios to each requirement:
1. "What if [technology X] becomes obsolete?"
2. "What if budget is cut 50%?"
3. "What if timeline doubles?"
4. "What if your primary user persona changes?"
5. "What if [competitor] launches this feature first?"

**Observation**: Mark requirements that SURVIVE all scenarios as commitment candidates

**Output**: Commitment-tested requirements with evidence of what flexed vs. what held firm

### Stage 3: Immutability Crystallization (APOLLO Mode)
**Purpose**: Apply The Immutability Oath to verify true unchangeables

**The Immutability Oath** - For each commitment candidate, ask:
1. "You said X survives all scenarios. Are you willing to commit this as IMMUTABLE for the entire project?"
2. "If I told you I could deliver faster/cheaper by changing X, would you allow it?"
3. "Three years from now, when technology has evolved, will X still be true?"

**Pass Criteria**: ALL THREE questions answered: 'yes, immutable' / 'no, cannot change' / 'yes, still true'

**Output**: Verified immutables (5-9 maximum per Miller's Law) with conversation citations

**CONSTITUTIONAL REQUIREMENT**: Document the Oath Q&A passage for EVERY immutable in Evidence field

## Document Creation Requirements

Create the North Star with comprehensive context integration:

### **YAML Front-Matter (MANDATORY)**
Every North Star document MUST begin with YAML metadata block:

```yaml
---
project: [PROJECT_NAME]
scope: [system|module|standalone]
phase: D1_03
created: YYYY-MM-DD
status: [pending_approval|approved]
approved_by: [stakeholder_name_and_role]
approved_date: YYYY-MM-DD HH:MM
parent_north_star: [path_to_parent_NS] # if applicable
---
```

### **Core Content (REQUIRED)**
1. **Project Name**: $ARGUMENTS with full context
2. **Core Requirements**: What MUST this deliver? (grounded in existing system reality)
3. **Essential Functionality**: Non-negotiable features (validated against technical constraints)
4. **Value Propositions**: Primary value creation (aligned with system objectives)
5. **Success Criteria**: Measurable outcomes (testable and realistic)
6. **Constraints**: Boundaries that must be respected (technical + business + timeline)

### **Miller's Law Enforcement (CONSTITUTIONAL REQUIREMENT)**
**MATHEMATICAL CONSTRAINT**: 5-9 immutables maximum (cognitive limit)

**Enforcement Protocol**:
- **MINIMUM**: 5 immutables (project lacks clarity if fewer)
- **TARGET**: 7 immutables (optimal cognitive load)
- **MAXIMUM**: 9 immutables (cognitive overload if more)
- **FORCED RANKING**: When user attempts >9 immutables → MUST reduce to 7 through prioritization

**Rationale**: Constraint pain reveals what's TRULY immutable vs 'strongly preferred'

**BLOCKING**: Document cannot be finalized with <5 or >9 immutables without explicit escalation to critical-engineer

### **Enhanced Sections (MANDATORY)**
7. **Inheritance Chain** (NEW): Explicit immutable inheritance from parent/universal North Stars
   - If this is a module/sub-project: Which immutables are inherited from system-level North Star?
   - List inherited immutables by reference: `INHERITS::[I#_name[parent_NS], I#_name[parent_NS]]`
   - Document which inherited immutables are MODIFIED (adjusted for this project's context)
   - Document which inherited immutables are OPTIONAL (can be disabled in this project)
   - Example: "CEP Panel inherits I7 (TDD) + I8 (Production Grade) from EAV Universal; I5 is OPTIONAL"

8. **Integration Requirements**: How this fits with existing systems and workflows
9. **Technical Dependencies**: Required infrastructure, libraries, services, APIs
10. **Architectural Alignment**: Consistency with existing system patterns and principles
11. **Timeline & Milestones**: Realistic development phases and checkpoints
12. **Risk Assessment**: Known technical, business, and timeline risks with mitigation strategies

### **Assumptions Register (PROPHETIC_VIGILANCE - CONSTITUTIONAL REQUIREMENT)**
**MINIMUM REQUIREMENT**: 6+ assumptions with comprehensive validation plans

**Coverage Categories** (must span multiple):
- Integration assumptions
- Performance assumptions
- Security assumptions
- User behavior assumptions
- Technical debt assumptions
- Organizational assumptions

**Risk Assessment Matrix** - For EACH assumption document:
1. **Confidence**: 0-100% (how sure are we this is true?)
2. **Impact**: Low/Medium/High/Critical (what happens if false?)
3. **Validation Cost**: Trivial/Easy/Moderate/Expensive
4. **Validation Plan**: Specific steps to verify assumption
5. **Owner**: Who is accountable for validation
6. **Validation Timing**: Before B0 / Before B1 / During B2 / Document only

**Validation Prioritization**:
- **CRITICAL + Low Confidence** → Validate BEFORE B0 (blocking gate)
- **HIGH IMPACT + Low Confidence** → Validate BEFORE B1 (risk mitigation)
- **MEDIUM IMPACT** → Validate DURING B2 (parallel exploration)
- **LOW IMPACT + High Confidence** → Document only (monitoring)

**BLOCKING**: Document cannot be finalized with <6 assumptions - this violates PROPHETIC_VIGILANCE constitutional requirement

### **Context Validation (ENFORCE)**
- **Reality Grounding**: All requirements must be achievable within existing constraints
- **Integration Feasibility**: Verify compatibility with existing architecture
- **Resource Validation**: Confirm timeline and complexity are realistic for available resources
- **Stakeholder Alignment**: Ensure requirements serve actual business needs from context

## Quality Standards (NON-NEGOTIABLE)

- **Specificity**: All requirements must be concrete and measurable, not abstract
- **Traceability**: Every requirement must trace back to discovered context or business need
- **Testability**: Success criteria must be objectively verifiable
- **Completeness**: All integration points and dependencies must be explicitly documented
- **Immutability**: Mark as IMMUTABLE with explicit change approval requirement
- **Inheritance Clarity** (NEW): If this project is part of a larger system/ecosystem:
  - MUST explicitly document which immutables are inherited vs new
  - MUST list parent North Stars this document depends on
  - MUST identify which assumptions depend on parent project assumptions passing first
  - FAILS QUALITY GATE if inheritance relationships are unclear or missing

### **Technology Change Test (SYSTEM-AGNOSTIC VALIDATION)**
**Purpose**: Ensure requirements are technology-neutral and survive platform changes

**The Test Process** - Apply to EVERY immutable requirement:
1. **STEP 1**: "If I implemented this with technology A, would it satisfy requirement X?"
2. **STEP 2**: "If I implemented this with technology B, would it satisfy requirement X?"
3. **VALIDATION**: If BOTH technologies satisfy → system-agnostic ✓ | If ONLY ONE → retranslate

**Translation Examples**:
- ❌ "PostgreSQL" → ✅ "Structured persistence with ACID"
- ❌ "Users click button" → ✅ "Users initiate process"
- ❌ "Real-time dashboard" → ✅ "Negligible latency performance observation"
- ❌ "iOS/Android app" → ✅ "Platform-agnostic personal mobile device access"

**Translation Rules**:
- **Technology Neutrality**: Replace named technologies with capability descriptions
- **Implementation Abstraction**: Remove verbs tied to specific interfaces
- **Outcome Focus**: Focus on user capability achieved, not implementation details
- **Constraint Elevation**: Express performance as user-observable outcome with scale context

**BLOCKING**: Requirements with technology-specific language must be retranslated before document finalization

## COMMITMENT CEREMONY (CONSTITUTIONAL REQUIREMENT - BLOCKING)

**Purpose**: Create binding North Star authority through explicit user consent with timestamp

**The Ceremony Protocol** - Execute these steps IN ORDER:

### 1. SETUP (Establish Stakes)
Present this statement to user:
> "I'm about to show you the immutable requirements that will guide this entire project. Once you approve these, I'll use them as my North Star - meaning I will actively PREVENT any work that contradicts them, even if you ask me to do it later. Are you ready?"

Wait for affirmative response before proceeding.

### 2. PRESENTATION (Display Verified Immutables)
Display 5-9 verified immutables with:
- Full requirement statement (system-agnostic language)
- Evidence from Immutability Oath passage (Q1, Q2, Q3 responses)
- Rationale for why this is immutable
- Validation plan for implementation phase

### 3. THE OATH (Binding Commitment)
Present this oath to user:
> "These are your North Star. If you approve, I commit to defending them throughout this project. Future-you may want to change these, but present-you is making a commitment to future-you. Do you approve?"

Wait for explicit approval (yes/approve/confirmed).

### 4. DOCUMENTATION (Timestamp Authority)
Record in North Star document:
```markdown
## COMMITMENT CEREMONY

**Approved**: [YYYY-MM-DD HH:MM]
**Approved By**: [Stakeholder Name and Role]
**Commitment Statement**:
This North Star document represents the immutable requirements for [Project Name].
All work must align with these requirements. Any detected misalignment will trigger escalation.
Changes to immutables require formal amendment process via requirements-steward.

**Protection Clause**:
If ANY agent detects misalignment between work and North Star (phases B0-B4):
1. STOP current work immediately
2. CITE specific North Star requirement being violated
3. ESCALATE to requirements-steward for resolution
Options: CONFORM to North Star | USER AMENDS (rare) | ABANDON incompatible path
```

### 5. AUTHORITY (Grant Binding Status)
Once ceremony is complete, North Star gains binding authority. All downstream agents reference it as immutable constraints.

**BLOCKING**: Document cannot be finalized without completed Commitment Ceremony with timestamped approval.

## Evidence Summary Section (VALIDATION METRICS)

**MANDATORY**: Include this section at end of North Star document for quick validation reference

```markdown
## EVIDENCE SUMMARY

### Constitutional Compliance
- **Total Immutables**: [count] (✓ within 5-9 range | ❌ violation)
- **Pressure Tested**: [X/X] passed Immutability Oath (Q1, Q2, Q3)
- **System-Agnostic**: [X/X] passed Technology Change Test
- **Assumptions Tracked**: [count] (✓ 6+ required | ❌ violation)
- **Critical Assumptions**: [count] requiring pre-B0 validation
- **Commitment Ceremony**: [✓ Completed YYYY-MM-DD HH:MM | ❌ Pending]

### Quality Gates
- **YAML Front-Matter**: [✓ Present | ❌ Missing]
- **Inheritance Chain**: [✓ Documented | N/A | ❌ Missing]
- **Miller's Law**: [✓ 5-9 immutables | ❌ Violation]
- **PROPHETIC_VIGILANCE**: [✓ 6+ assumptions | ❌ Violation]
- **Technology-Neutral**: [✓ All translated | ❌ Contains tech-specific language]
- **Evidence Trail**: [✓ All Oath passages documented | ❌ Missing evidence]

### Readiness Status
- **D1_04 Gate**: [✓ Ready for requirements-steward validation | ❌ Blocks remain]
- **Critical Blockers**: [None | List specific violations]
```

## Constitutional Validation Checklist (PRE-FINALIZATION)

**MANDATORY**: Before declaring North Star complete, verify ALL checkpoints

### Process Compliance
- [ ] **Immutability Funnel**: All 3 stages executed (Surfacing → Extraction → Crystallization)
- [ ] **Possibility Surfacing**: Comprehensive capture performed (HERMES mode)
- [ ] **Commitment Extraction**: What If Gauntlet applied to all candidates (PSYCHE mode)
- [ ] **Immutability Crystallization**: Immutability Oath applied to all immutables (APOLLO mode)

### Content Requirements
- [ ] **Oath Evidence**: Conversation citations showing Q1, Q2, Q3 passage for EVERY immutable
- [ ] **Miller's Law**: 5-9 immutables enforced (forced ranking if >9 attempted)
- [ ] **Technology-Neutral**: All requirements passed Technology Change Test
- [ ] **System-Agnostic**: No technology-specific language in immutables
- [ ] **Assumptions**: 6+ identified with risk assessment and validation plans
- [ ] **Assumption Coverage**: Multiple categories covered (integration, performance, security, user, etc.)
- [ ] **Risk Assessment**: Every assumption rated for Confidence + Impact with owner assigned
- [ ] **Validation Plans**: Critical/High impact assumptions have pre-B0 validation plans

### Document Structure
- [ ] **YAML Front-Matter**: Metadata block present with all required fields
- [ ] **Inheritance Chain**: Parent North Stars documented (if applicable)
- [ ] **Constrained Variables**: Immutable/Flexible/Negotiable categorized
- [ ] **Boundary Clarity**: "What This IS / What This is NOT" sections present
- [ ] **Evidence Summary**: Validation metrics section included
- [ ] **Commitment Ceremony**: Complete with timestamp and approval

### Constitutional Validation
- [ ] **NO CASUAL IMMUTABLES**: Every immutable has Oath passage evidence
- [ ] **NO UNTESTED TRANSLATIONS**: Every system-agnostic requirement passed Technology Change Test
- [ ] **NO UNTRACKED ASSUMPTIONS**: All assumptions documented with validation plans
- [ ] **MINIMUM ASSUMPTIONS**: 6+ assumptions present (PROPHETIC_VIGILANCE)
- [ ] **CEREMONY COMPLETE**: Timestamped user approval recorded

**BLOCKING**: Document MUST pass all checkpoints before submission to requirements-steward for D1_04 validation.

## Output Requirements

After creation:
1. **Confirm North Star establishment** with file location and key requirements summary
2. **Display Evidence Summary** showing constitutional compliance metrics
3. **Report Commitment Ceremony** status with approval timestamp
4. **Validate readiness** for D1_04 gate (requirements-steward validation)
5. **Highlight critical integration points** that will drive implementation decisions
6. **Identify critical assumptions** requiring pre-B0 validation
7. **Recommend next step**: "Invoke requirements-steward for D1_04 North Star validation"

**CRITICAL**: Never create a North Star in isolation - always ground it in discovered project context and existing system reality. Constitutional compliance is MANDATORY, not optional.