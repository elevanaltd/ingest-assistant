# ENHANCE Command - Enhancement Orchestration Protocol

## 🚨 COMMAND AUTHORITY NOTICE
**FOR LEADING ROLES ONLY**: This command provides orchestration patterns for agents with execution authority (holistic-orchestrator, implementation-lead, technical-architect). It does NOT invoke other agents - you ARE the orchestrating agent executing these patterns.

**ANTI-PATTERN**: Agent invoking another agent of same type (holistic-orchestrator → holistic-orchestrator)
**CORRECT USAGE**: Leading agent following orchestration patterns directly

## 🎯 E.N.H.A.N.C.E. - Enhancement Execution Mnemonic
**E** - Explore context (understand current system state) ← BLOCKING: No work without system context
**N** - North Star check (alignment with enhancement goals) ← BLOCKING: Must align with project direction  
**H** - Holistic orchestration (execute system-wide coordination) ← REQUIRED: Cross-boundary coherence
**A** - Assess scope (enhancement-specific scope calibration) ← REQUIRED: Proportional effort boundaries
**N** - Navigate dependencies (map system relationships) ← REQUIRED: Impact assessment
**C** - Coordinate execution (direct implementation leadership) ← REQUIRED: Quality gates maintained
**E** - Evaluate outcomes (verify enhancement integration) ← REQUIRED: System coherence validation

⚠️ **PROTOCOL FOUNDATION**: You ARE the orchestrating authority executing enhancement patterns
📋 **ORCHESTRATION DISCIPLINE**: Direct execution of system integration while maintaining system integrity

## 🎯 T.R.A.C.E.D. - Quality Protocol Integration (MANDATORY)
**T** - Test-first (write failing test before code) ← BLOCKING: No enhancement code without test
**R** - Review code changes (after creation) ← BLOCKING: No new code without review  
**A** - Analyze with critical_engineer (architecture decisions) ← REQUIRED: For technical uncertainty
**C** - Consult specialists (mandatory at triggers) ← REQUIRED: Context-specific consultation
**E** - Execute with quality gates (lint + typecheck) ← REQUIRED: Before session end
**D** - Document with TodoWrite (throughout execution) ← REQUIRED: Progress tracking

⚠️ **QUALITY PROTOCOL VIOLATION = IMMEDIATE STOP**: Any enhancement code creation without T→R sequence triggers protocol reset
📋 **TDD DISCIPLINE**: Enhancement work follows same test-first discipline as build work

## QUICK_NAVIGATION_INDEX
**E.N.H.A.N.C.E**: Cognitive anchor → Line 11
**T.R.A.C.E.D**: Quality protocol → Line 23
**TDD_WORKFLOW**: Test-first patterns → Line 45
**CONTEXT_DETECTION**: System state & enhancement readiness → Line 60
**ORCHESTRATION_MODES**: Enhancement execution patterns → Line 94
**SCOPE_CALIBRATION**: Enhancement-specific effort boundaries → Line 128
**EXECUTION_PROTOCOL**: Orchestrated implementation phases → Line 154
**QUALITY_VALIDATION**: Integration and coherence verification → Line 192

## TDD_WORKFLOW_FOR_ENHANCEMENTS

**MANDATORY TDD SEQUENCE** (for new code in enhancements):
```
🔴 RED PHASE (REQUIRED FIRST)
1. WRITE_TEST → Define expected enhancement behavior in test
2. RUN_TEST → Verify test fails (RED phase)
3. TodoWrite: "TDD-ENHANCEMENT-{COMPONENT}: RED phase complete ✅"

🟢 GREEN PHASE (ONLY AFTER RED)
4. WRITE_CODE → Minimal implementation to pass enhancement test
5. RUN_TEST → Verify test passes (GREEN phase)
6. TodoWrite: "TDD-ENHANCEMENT-{COMPONENT}: GREEN phase complete ✅"

🔄 REFACTOR PHASE (QUALITY)
7. REFACTOR → Improve enhancement while keeping tests green
8. REVIEW → code-review-specialist validates enhancement
9. TodoWrite: "TDD-ENHANCEMENT-{COMPONENT}: REFACTOR+REVIEW complete ✅"
```

⚠️ **DISCIPLINE CHECKPOINT**: Before writing ANY enhancement code, TodoWrite must show "RED phase complete" for that component.

**SKIP_TDD_ONLY_FOR**:
- Existing code modifications with existing tests
- Pure CSS styling enhancements
- Configuration file updates
- Documentation improvements

## CONTEXT_DETECTION_ENGINE

**SYSTEM_STATE_PATTERNS**:
- **Active Project Context**: `.coord/` exists with current North Star and project context
- **Legacy System Context**: Existing codebase without formal project structure
- **Multi-System Context**: Enhancement spans multiple system boundaries  
- **Standalone Enhancement**: Independent improvement to existing functionality

**CONTEXT_SEARCH_PATHS**:
```
PROJECT_CONTEXT: ./.coord/PROJECT_CONTEXT.md → ./PROJECT_CONTEXT.md → ./README.md
NORTH_STAR: ./.coord/docs/*NORTH_STAR*.md → ./docs/*NORTH_STAR*.md → ./000-*NORTH_STAR*.md
ARCHITECTURE: ./.coord/docs/*VAD*.md → ./docs/*ARCHITECTURE*.md → ./*BLUEPRINT*.md
SYSTEM_DOCS: ./docs/ → ./README.md → ./ARCHITECTURE.md → ./package.json
```

**ENHANCEMENT_READINESS_LOGIC**:
```
ACTIVE_PROJECT → Coordination-aware enhancement (leverage project context)
LEGACY_SYSTEM → System analysis then targeted enhancement
MULTI_SYSTEM → Holistic orchestration across boundaries
STANDALONE → Context establishment then focused enhancement
```

**CONTEXT_RESTORATION**:
- IF .coord/PROJECT_CONTEXT.md EXISTS → Read project context and alignment validation
- IF NO PROJECT_CONTEXT → Establish enhancement context through system analysis
- CREATE enhancement context documentation:
  - Enhancement scope and objectives
  - System impact assessment
  - Success criteria and validation approach
  - Integration requirements and dependencies

## ORCHESTRATION_MODES

### MODE 1: PROJECT_ENHANCEMENT
**Trigger**: Enhancement within active project (`.coord/` exists)
**Context**: Leverage existing project coordination and North Star alignment
**Execution**: Direct orchestration with project context
**Pattern**: B5-style enhancement with full project awareness

```python
# PROJECT_ENHANCEMENT execution pattern
Read(".coord/PROJECT_CONTEXT.md")
Read(".coord/docs/*NORTH_STAR*.md")

# Direct execution - YOU are the orchestrator
# Analyze project context and North Star alignment
# Plan enhancement within project constraints  
# Execute enhancement while maintaining system coherence
# Delegate to specialists as needed with clear context
```

### MODE 2: SYSTEM_ENHANCEMENT  
**Trigger**: Enhancement to existing system without active project context
**Context**: System analysis required before enhancement planning
**Execution**: Direct orchestration with system understanding
**Pattern**: Context establishment → targeted enhancement

```python
# SYSTEM_ENHANCEMENT execution pattern
# First analyze system if needed
Task(subagent_type="mcp__hestai__analyze",
     prompt="SYSTEM ANALYSIS for enhancement planning:
     
     TARGET SYSTEM: {system_description}  
     ENHANCEMENT GOALS: {enhancement_objectives}
     
     T.R.A.C.E.D. PROTOCOL ACTIVE:
     - Test-first required for new code analysis recommendations
     - Review mandatory for all architectural suggestions
     - Quality gates must pass before enhancement execution
     - TodoWrite tracking throughout analysis
     
     Analyze current architecture, patterns, and enhancement readiness with quality protocol awareness.")

# Then execute enhancement directly - YOU are the orchestrator
# Process analysis results for system understanding
# Plan targeted enhancement with scope boundaries
# Execute enhancement while preserving system coherence
# Coordinate specialist involvement as needed
```

### MODE 3: CROSS_SYSTEM_ENHANCEMENT
**Trigger**: Enhancement spanning multiple system boundaries
**Context**: Multi-system coordination and impact assessment required
**Execution**: Direct cross-boundary orchestration
**Pattern**: Boundary analysis → orchestrated cross-system implementation

```python
# CROSS_SYSTEM_ENHANCEMENT execution pattern  
# First assess cross-boundary impact if needed
Task(subagent_type="coherence-oracle",
     prompt="CROSS-SYSTEM ANALYSIS: {enhancement_description}
     
     SYSTEM BOUNDARIES: {system_identifications}
     ENHANCEMENT IMPACT: {cross_system_implications}
     
     T.R.A.C.E.D. PROTOCOL ACTIVE:
     - Test-first required for new code recommendations
     - Review mandatory for cross-boundary changes
     - Quality gates must pass before cross-system execution
     - TodoWrite tracking throughout analysis
     
     Assess cross-boundary patterns and coherence requirements with quality protocol awareness.")

# Then execute cross-system enhancement directly - YOU are the orchestrator
# Process boundary analysis for cross-system understanding
# Plan enhancement across system boundaries with impact assessment
# Execute enhancement with cross-boundary coherence preservation
# Coordinate specialists across system boundaries as constitutional authority
```

## SCOPE_CALIBRATION_MATRIX

**Enhancement-Specific Scope Classification**:

### MICRO Enhancement
**Characteristics**: Single function/component, <2 files affected, minimal dependencies
**Effort Boundary**: 1-2 hours, direct implementation
**Orchestration**: Minimal - focused execution with quality validation
**Pattern**: Direct implementation → code review → integration check

### TARGETED Enhancement  
**Characteristics**: Single feature/module, 2-8 files affected, contained dependencies
**Effort Boundary**: Half-day to 2 days, structured approach  
**Orchestration**: Standard - scoped planning with implementation coordination
**Pattern**: Scope analysis → implementation plan → orchestrated execution → validation

### SYSTEM Enhancement
**Characteristics**: Multiple modules, 8+ files affected, cross-system dependencies
**Effort Boundary**: 2-7 days, comprehensive approach
**Orchestration**: Full - holistic coordination with impact assessment
**Pattern**: System analysis → cross-boundary planning → orchestrated implementation → coherence validation

### ARCHITECTURAL Enhancement  
**Characteristics**: System-wide impact, architectural changes, foundational improvements
**Effort Boundary**: 1+ weeks, architectural review required
**Orchestration**: Comprehensive - full workflow phases with architectural validation
**Pattern**: Architecture analysis → design validation → phased implementation → system integration

**SCOPE_ESCALATION**: Enhancement scope exceeding ARCHITECTURAL triggers full workflow recommendation

## EXECUTION_PROTOCOL

### PHASE 1: CONTEXT_EXPLORATION
**MANDATORY_STEPS**:
1. **System Context Analysis** → Understand current state and dependencies
2. **Enhancement Goal Clarification** → Define specific objectives and success criteria  
3. **Scope Calibration** → Get proportional effort validation from workflow-scope-calibrator
4. **Impact Assessment** → Evaluate enhancement scope and system implications
5. **Mode Selection** → Choose appropriate orchestration mode based on context

**SCOPE_CALIBRATION_REQUIREMENT**:
```python
# MANDATORY for ALL enhancement scopes (MICRO through ARCHITECTURAL)
Task(subagent_type="workflow-scope-calibrator",
     prompt="ENHANCEMENT SCOPE CALIBRATION: {enhancement_description}
     
     CURRENT SYSTEM: {system_context}
     ENHANCEMENT GOALS: {enhancement_objectives}
     ESTIMATED SCOPE: {scope_classification}
     
     T.R.A.C.E.D. PROTOCOL ACTIVE:
     - Validate effort boundaries align with enhancement scope
     - Confirm quality gates appropriate for scope level
     - Ensure proportional approach prevents over/under-engineering
     
     Provide scope-calibrated approach with effort boundaries and reality check.")
```

**QUALITY_GATES**:
- Context understanding verified through system analysis
- Enhancement goals clearly defined and validated  
- **Scope boundaries validated by workflow-scope-calibrator**
- **Effort proportionality confirmed with reality check**
- Orchestration mode selected with rationale

### PHASE 2: ORCHESTRATION_ACTIVATION
**DIRECT_ORCHESTRATION_AUTHORITY**:
- Constitutional authority for system-wide coherence
- Cross-boundary coordination capability
- Prophetic insight for failure prevention
- Buck-stops-here accountability

**ORCHESTRATION_EXECUTION**:
```python
# YOU execute orchestration directly - no agent invocation
# Apply constitutional authority for system coherence
# Execute cross-boundary coordination as needed
# Use prophetic insight to prevent failures
# Take buck-stops-here accountability for enhancement success

# Example direct orchestration pattern:
# 1. Analyze system context and enhancement requirements
# 2. Plan enhancement approach with scope boundaries  
# 3. Coordinate specialist involvement with clear delegation
# 4. Monitor system coherence throughout implementation
# 5. Validate enhancement integration and success criteria
```

### PHASE 3: COORDINATED_IMPLEMENTATION
**DIRECT_COORDINATION_RESPONSIBILITY**:
- Direct specialist delegation with clear context and boundaries
- Domain expertise consultation for informed decisions
- Quality gate enforcement throughout implementation
- System coherence monitoring during changes
- **ERROR_RESOLUTION protocol invocation** when implementation errors occur

**SPECIALIST_DELEGATION_PATTERNS**:
- **technical-architect**: Architecture decisions and system design
- **implementation-lead**: B2-phase implementation coordination (if not you)
- **critical-engineer**: Technical validation and failure prevention
- **code-review-specialist**: Code quality assurance
- **completion-architect**: Integration and system unification
- **edge-optimizer**: Boundary exploration and breakthrough optimization (optional)
- **requirements-steward**: North Star alignment validation
- **error-resolver/error-architect**: Systematic error resolution via ERROR_RESOLUTION protocol

**DELEGATION_PRINCIPLE**: Delegate with clear context, maintain orchestration responsibility

**MANDATORY DELEGATION CONTEXT** (for all Task invocations):
```python
# TEMPLATE for all specialist delegations
Task(subagent_type="{specialist-agent}",
     prompt="{task-description}
     
     T.R.A.C.E.D. PROTOCOL ACTIVE: 
     - Test-first required for new code
     - Review mandatory for all changes  
     - Quality gates must pass before completion
     - TodoWrite tracking throughout execution
     
     ENHANCEMENT CONTEXT: {enhancement-scope}
     SYSTEM COHERENCE: Maintain throughout changes")
```

⚠️ **DELEGATION RULE**: Every Task invocation MUST include T.R.A.C.E.D. context to prevent quality protocol bypassing

### PHASE 4: COHERENCE_VALIDATION
**INTEGRATION_VERIFICATION**:
1. **System Coherence Check** → Verify enhancement integrates without breaking system patterns
2. **Cross-Boundary Impact** → Validate no unintended side effects across system boundaries
3. **Quality Standards** → Ensure enhancement meets established quality gates
4. **Success Criteria** → Confirm enhancement objectives achieved

**FINAL_VALIDATION**:
- **coherence-oracle**: Cross-boundary pattern validation
- **requirements-steward**: Goal achievement confirmation (if North Star exists)
- **system-steward**: Pattern preservation and documentation

## QUALITY_VALIDATION_FRAMEWORK

### ENHANCEMENT_QUALITY_GATES
- **Context Gate**: System understanding verified before implementation
- **Scope Gate**: Enhancement boundaries clear and effort-appropriate  
- **Implementation Gate**: Quality standards maintained throughout changes
- **Integration Gate**: System coherence preserved after enhancement
- **Validation Gate**: Success criteria achieved with no regression

### COHERENCE_PRESERVATION
- **Pattern Consistency**: Enhancement follows established system patterns
- **Architectural Integrity**: No violation of system design principles
- **Cross-System Impact**: Enhancement doesn't break system boundaries
- **Future Maintainability**: Enhancement supports long-term system evolution

### FAILURE_PREVENTION
- **Prophetic Analysis**: holistic-orchestrator prevents systemic failures
- **Impact Assessment**: Cross-boundary effects identified and mitigated
- **Quality Enforcement**: Code review and testing maintained throughout
- **Rollback Planning**: Clear reversion path if enhancement causes issues

## EXECUTION_PATTERNS

### Quick Enhancement (MICRO scope):
```python  
# 1. Context check
Read("README.md") or Read("docs/ARCHITECTURE.md")

# 2. MANDATORY scope calibration  
Task(subagent_type="workflow-scope-calibrator",
     prompt="ENHANCEMENT SCOPE CALIBRATION: {enhancement_description}
     
     CURRENT SYSTEM: {basic_context}
     ENHANCEMENT GOALS: {enhancement_objectives}
     ESTIMATED SCOPE: MICRO (single component, <2 files)
     
     T.R.A.C.E.D. PROTOCOL ACTIVE:
     - Validate MICRO scope is appropriate (prevent over-engineering)
     - Confirm minimal effort boundaries and quality gates
     - Reality check: 'Would senior engineer laugh at this approach?'")

# 3. TDD-First enhancement execution - YOU orchestrate  
# Write failing test for enhancement behavior (RED phase)
# TodoWrite: "TDD-ENHANCEMENT-{COMPONENT}: RED phase complete ✅"
# Implement minimal code to pass test (GREEN phase) 
# TodoWrite: "TDD-ENHANCEMENT-{COMPONENT}: GREEN phase complete ✅"
# Refactor and validate changes maintain system consistency

# 4. Mandatory quality validation
Task(subagent_type="code-review-specialist",
     prompt="Review enhancement changes for quality and system consistency
     
     T.R.A.C.E.D. PROTOCOL ACTIVE:
     - Verify test-first compliance in enhancement code
     - Confirm quality gates passed before review
     - Validate TodoWrite tracking shows TDD discipline")
# TodoWrite: "TDD-ENHANCEMENT-{COMPONENT}: REFACTOR+REVIEW complete ✅"
```

### Standard Enhancement (TARGETED scope):
```python
# 1. Context analysis  
Task(subagent_type="mcp__hestai__analyze",
     prompt="Analyze system for targeted enhancement readiness
     
     T.R.A.C.E.D. PROTOCOL ACTIVE:
     - Test-first required for new code analysis recommendations
     - Review mandatory for all architectural suggestions
     - Quality gates must pass before enhancement execution
     - TodoWrite tracking throughout analysis")

# 2. MANDATORY scope calibration
Task(subagent_type="workflow-scope-calibrator",
     prompt="ENHANCEMENT SCOPE CALIBRATION: {enhancement_description}
     
     SYSTEM ANALYSIS: {analysis_results}
     ENHANCEMENT GOALS: {enhancement_objectives}
     ESTIMATED SCOPE: TARGETED (single feature, 2-8 files)
     
     T.R.A.C.E.D. PROTOCOL ACTIVE:
     - Validate TARGETED scope boundaries prevent scope creep
     - Confirm structured approach with proportional effort
     - Reality check: 'Is this appropriate for deployment model?'")

# 3. TDD-First orchestrated implementation - YOU execute
# Process analysis and calibration results for enhancement planning
# Plan targeted enhancement with validated scope boundaries
# FOR EACH NEW COMPONENT:
#   Write failing test (RED) → TodoWrite: "RED phase complete ✅"
#   Implement minimal code (GREEN) → TodoWrite: "GREEN phase complete ✅" 
#   Refactor with review → TodoWrite: "REFACTOR+REVIEW complete ✅"
# Monitor system coherence during implementation

# 4. Integration validation
Task(subagent_type="coherence-oracle",
     prompt="Validate enhancement integration and system coherence
     
     T.R.A.C.E.D. PROTOCOL ACTIVE:
     - Test-first compliance verified in enhancement
     - Review completion confirmed for all changes
     - Quality gates passed throughout implementation
     - TodoWrite tracking complete")
```

### Complex Enhancement (SYSTEM+ scope):
```python
# 1. Comprehensive analysis
Task(subagent_type="mcp__hestai__analyze", 
     prompt="Full system analysis for complex enhancement planning
     
     T.R.A.C.E.D. PROTOCOL ACTIVE:
     - Test-first required for new code analysis recommendations
     - Review mandatory for all architectural suggestions
     - Quality gates must pass before enhancement execution
     - TodoWrite tracking throughout analysis")

# 2. Scope calibration
Task(subagent_type="workflow-scope-calibrator",
     prompt="Calibrate enhancement effort and approach boundaries
     
     T.R.A.C.E.D. PROTOCOL ACTIVE:
     - Test-first discipline applies to all scope recommendations
     - Review requirements scale with enhancement complexity
     - Quality gates must align with scope boundaries
     - TodoWrite tracking proportional to effort estimation")

# 3. TDD-First orchestrated execution - YOU execute with full authority
# Process analysis and scope calibration results
# Plan system-wide enhancement with cross-boundary awareness
# FOR EACH NEW COMPONENT ACROSS SYSTEMS:
#   Write failing test (RED) → TodoWrite: "RED phase complete ✅"
#   Implement minimal code (GREEN) → TodoWrite: "GREEN phase complete ✅"
#   Refactor with specialist review → TodoWrite: "REFACTOR+REVIEW complete ✅"
# Coordinate across system boundaries with prophetic insight
# Monitor system coherence throughout complex implementation
# Execute quality gates (lint + typecheck) before completion

# 4. System validation
Task(subagent_type="coherence-oracle", 
     prompt="Comprehensive system coherence and cross-boundary impact validation
     
     T.R.A.C.E.D. PROTOCOL ACTIVE:
     - Test-first compliance verified across all enhanced components
     - Review completion confirmed for all cross-boundary changes
     - Quality gates passed throughout complex implementation
     - TodoWrite tracking demonstrates complete TDD discipline")
```

## ANTI_PATTERNS_PREVENTION

**AVOID**:
- Enhancement without context understanding (violates EXPLORE)
- Agent-invoking-agent recursion (holistic-orchestrator → holistic-orchestrator)
- Code before failing test (violates TDD discipline)
- Enhancement code without review (violates T.R.A.C.E.D.)
- Task delegation without T.R.A.C.E.D. context (enables quality bypassing)
- Scope creep without recalibration (violates ASSESS boundaries)
- Changes without coherence validation (breaks system integrity)

**ENFORCE**:
- Context-first approach for all enhancements
- Direct orchestration authority without self-invocation
- TDD discipline: RED → GREEN → REFACTOR for all new enhancement code
- Mandatory code review for all enhancement changes
- T.R.A.C.E.D. context in every Task delegation to specialists
- **ERROR_RESOLUTION protocol** for systematic error handling during enhancement work
- Scope boundaries with effort proportionality  
- Quality gates and coherence validation throughout

## ESCALATION_PATHS

**SCOPE_ESCALATION**: Enhancement exceeding ARCHITECTURAL scope → Recommend full `/workflow` execution
**COMPLEXITY_ESCALATION**: Multi-system impact beyond orchestrator authority → Recommend architectural review
**QUALITY_ESCALATION**: Quality gate failures → Invoke critical-engineer for validation
**COHERENCE_ESCALATION**: System boundary violations → Invoke coherence-oracle for resolution
**ERROR_ESCALATION**: Enhancement errors encountered → Multiple resolution paths available:
  - **ERROR_RESOLUTION protocol**: Self-invoke systematic error handling (testguard → fix → commit → review → PR → CI)
  - **`/errors` command**: Leader-orchestrated error resolution with intelligent routing
  - **Direct specialists**: error-resolver (component) or error-architect (system-wide) with full context

## COMMAND_MODES

### Standard Mode (New Enhancement):
```bash
/enhance "add user authentication to profile module"       # TARGETED enhancement
/enhance "optimize database queries across user services"  # SYSTEM enhancement  
/enhance "improve error handling in checkout flow"         # MICRO enhancement
/enhance "integrate new payment provider with validation"   # SYSTEM enhancement
```

### Continuation Mode (Resume Enhancement):
```bash
/enhance --continue                                         # Resume interrupted enhancement work
/enhance --continue "address PR feedback on auth module"   # Continue with specific context
/enhance --continue --scope-check                          # Resume with scope recalibration
```

## CONTINUATION_FUNCTIONALITY

### Enhancement Context Detection
**ARTIFACT_PATTERNS** (Enhancement Resumption):
- **Enhancement Context**: `ENHANCEMENT_CONTEXT.md`, `*ENHANCEMENT*.md`
- **Work-in-Progress**: Uncommitted changes, feature branches, draft PRs
- **Scope Documentation**: Enhancement scope and objectives from previous session
- **Progress Tracking**: TodoWrite completion status, phase indicators
- **Error Context**: Previous error resolutions and iterations

**CONTEXT_SEARCH_PATHS**:
```
ENHANCEMENT_CONTEXT: ./ENHANCEMENT_CONTEXT.md → ./docs/*ENHANCEMENT*.md → ./.coord/ENHANCEMENT_WORK.md
SCOPE_HISTORY: ./SCOPE_CALIBRATION.md → ./docs/*SCOPE*.md → previous workflow-scope-calibrator outputs
PROGRESS_STATE: TodoWrite history → git status → feature branch analysis → draft PR status
ERROR_HISTORY: ERROR_RESOLUTION_LOG.md → previous error specialist work → CI failure history
```

### Resumption Logic
```python
# Enhancement continuation decision matrix
if enhancement_context_exists:
    if scope_evolution_detected:
        resumption_mode = "SCOPE_RECALIBRATION_FIRST"
    elif pr_feedback_pending:
        resumption_mode = "FEEDBACK_INTEGRATION" 
    elif ci_failures_outstanding:
        resumption_mode = "ERROR_RESOLUTION_CONTINUATION"
    elif work_in_progress:
        resumption_mode = "DIRECT_CONTINUATION"
    else:
        resumption_mode = "CONTEXT_REFRESH_AND_CONTINUE"
else:
    # No continuation context found
    echo "No enhancement work found to continue. Use standard /enhance mode."
```

### PHASE 1: CONTINUATION_CONTEXT_ANALYSIS
**MANDATORY_STEPS**:
```python
# 1. Detect enhancement continuation context
Read("ENHANCEMENT_CONTEXT.md") or search for enhancement artifacts
Read("SCOPE_CALIBRATION.md") or previous scope decisions
Check git status for work-in-progress indicators
Analyze TodoWrite history for completion status

# 2. Assess continuation requirements  
if scope_recalibration_needed:
    continuation_requirements.append("SCOPE_CALIBRATION")
if pr_feedback_integration:
    continuation_requirements.append("FEEDBACK_PROCESSING")
if ci_failure_outstanding:
    continuation_requirements.append("ERROR_RESOLUTION")
if context_refresh_needed:
    continuation_requirements.append("CONTEXT_RESTORATION")

# 3. Select appropriate continuation mode
continuation_mode = determine_continuation_approach(requirements, context)
```

### PHASE 2: CONTINUATION_EXECUTION

#### Mode: SCOPE_RECALIBRATION_FIRST
```python
# When enhancement scope evolved or context changed
Task(subagent_type="workflow-scope-calibrator",
     prompt="ENHANCEMENT CONTINUATION SCOPE RECALIBRATION:
     
     ORIGINAL ENHANCEMENT: {previous_enhancement_description}
     CURRENT CONTEXT: {updated_system_context} 
     WORK COMPLETED: {progress_summary}
     SCOPE EVOLUTION: {scope_changes_detected}
     
     T.R.A.C.E.D. PROTOCOL ACTIVE:
     - Recalibrate effort boundaries for remaining work
     - Validate scope changes don't violate proportional effort
     - Reality check: 'Is continuation approach still appropriate?'
     
     PROVIDE: Updated scope boundaries and continuation approach")

# Continue with recalibrated scope
continue_enhancement_with_updated_scope()
```

#### Mode: FEEDBACK_INTEGRATION
```python  
# When continuing after PR feedback or code review
Task(subagent_type="code-review-specialist",
     prompt="ENHANCEMENT CONTINUATION FEEDBACK ANALYSIS:
     
     ORIGINAL ENHANCEMENT: {enhancement_description}
     PR FEEDBACK: {pr_review_comments}
     CURRENT STATUS: {work_status}
     
     T.R.A.C.E.D. PROTOCOL ACTIVE:
     - Analyze feedback for enhancement continuation approach
     - Identify specific changes needed for feedback resolution
     - Maintain enhancement goals while addressing feedback
     
     PROVIDE: Continuation plan addressing feedback systematically")

# Execute feedback-driven continuation
continue_enhancement_with_feedback_integration()
```

#### Mode: ERROR_RESOLUTION_CONTINUATION
```python
# When continuing after error resolution or CI failures
# Automatically invoke ERROR_RESOLUTION protocol with enhancement context
Task(subagent_type="error-resolver", # or error-architect based on error scope
     prompt="ENHANCEMENT ERROR RESOLUTION CONTINUATION:
     
     ORIGINAL ENHANCEMENT: {enhancement_description}
     ERROR CONTEXT: {error_details}
     PREVIOUS ATTEMPTS: {error_resolution_history}
     
     ERROR_RESOLUTION PROTOCOL ACTIVE:
     - testguard consultation → prevent test manipulation
     - Systematic error resolution maintaining enhancement context
     - Commit changes with enhancement continuation messaging
     - Integrate with ongoing enhancement workflow
     
     CONTINUATION REQUIREMENT: Resume enhancement work after error resolution")

# Return to enhancement workflow after error resolution
continue_enhancement_after_error_resolution()
```

#### Mode: DIRECT_CONTINUATION
```python
# When resuming normal enhancement work
# Skip context exploration if sufficient context exists
execute_enhancement_continuation_directly()

# Apply same orchestration patterns with continuation context:
# - Use existing scope calibration if current
# - Continue from last completed phase
# - Maintain enhancement objectives and success criteria
# - Preserve specialist delegation patterns with continuation context
```

### PHASE 3: CONTINUATION_INTEGRATION

**CONTEXT_PRESERVATION**:
- **Original Enhancement Goals**: Maintain original objectives and success criteria
- **Work Completed**: Build upon existing progress without duplication
- **Scope Evolution**: Adapt to any scope changes while maintaining proportionality
- **Quality Standards**: Apply same T.R.A.C.E.D. discipline to continuation work
- **Specialist Context**: Provide continuation context to all specialist delegations

**CONTINUATION_VALIDATION**:
- **Progress Verification**: Confirm previous work status and current requirements
- **Scope Consistency**: Ensure continuation aligns with updated scope boundaries  
- **Quality Continuity**: Maintain quality gates and verification requirements
- **Integration Coherence**: Ensure continuation work integrates with existing changes

---
**MISSION**: Execute enhancements through direct orchestration with context preservation, scope calibration, and system coherence validation for $ARGUMENTS.

Enhancement execution uses leading agent's constitutional authority for cross-boundary coherence while maintaining proportional effort boundaries and quality gates. 

**AUTHORITY REMINDER**: You ARE the orchestrating agent - execute patterns directly without self-invocation.

**ERROR_HANDLING_INTEGRATION**: When errors occur during enhancement work, reference ERROR_RESOLUTION protocol (`/Users/shaunbuswell/.claude/protocols/ERROR_RESOLUTION.md`) for systematic resolution maintaining enhancement context and quality gates.

**CONTINUATION_SUPPORT**: Use `--continue` flag to resume interrupted enhancement work with context preservation, scope recalibration, and progress-aware execution.