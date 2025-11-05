# Agent Creation Workflow

Complete 7-step pipeline for creating production-ready OCTAVE agents.

## Overview

**CREATION_FLOW**: REQUIREMENTS → TIER_CLASSIFICATION → COGNITIVE_MAPPING → CONSTITUTIONAL_GROUNDING → OCTAVE_SYNTHESIS → VALIDATION → DEPLOYMENT

## Step 1: Requirements Gathering

**INPUT_EXPECTATION**:
- PURPOSE: "What must this agent do?"
- DOMAIN: "Where does it operate?"
- CONSTRAINTS: "Must/never rules"
- STAKEHOLDERS: "Who consumes outputs?"
- SIGNALS: "Keywords that map to cognition/archetypes"
- GOVERNANCE_FLAGS: "validation, compliance, security"
- FREQUENCY: "How often invoked per project?"
- COMPLEXITY: "Simple execution vs strategic methodology?"

**PREP_ACTIONS**:
- READ_PROJECT_NORTH_STAR: Locate and read "0xx-PROJECT[-{NAME}]-NORTH-STAR.md" fully
- CLASSIFY_TIER: Determine appropriate tier based on purpose, complexity, and frequency
- GATHER_INPUTS: PURPOSE+DOMAIN+CONSTRAINTS+STAKEHOLDERS+SIGNALS+GOVERNANCE_FLAGS

## Step 2: Cognitive Architecture

**COGNITION_SELECTION**:
- IF involves [validation|compliance|standards|governance] → **ETHOS**
- IF involves [integration|synthesis|structure|relational_order] → **LOGOS**
- IF involves [exploration|creativity|possibility|inspiration] → **PATHOS**

**COGNITIVE_ALIGNMENT** (per Constitutional Foundation):
- **ETHOS** = CONSTRAINT force (deductive validation, boundary enforcement)
- **LOGOS** = STRUCTURE force (convergent synthesis, relational order, integration)
- **PATHOS** = VISION force (divergent exploration, possibility space)

**ARCHETYPE_SELECTION** (2-3 maximum with behavioral emphasis):
See [archetype-database.md](archetype-database.md) for complete archetype definitions and selection guide.

**COGNITION_SHANK_ENFORCEMENT** (MANDATORY):
Every agent declaring `COGNITION::X` MUST include corresponding `X_SHANK` behavioral overlay immediately after COGNITIVE_FOUNDATION section.

**SHANK_SOURCE_LOCATIONS**:
- ETHOS_SHANK: `/Volumes/HestAI/library/02-cognitions/111-SYSTEM-COGNITION-ETHOS.oct.md`
- LOGOS_SHANK: `/Volumes/HestAI/library/02-cognitions/110-SYSTEM-COGNITION-LOGOS.oct.md`
- PATHOS_SHANK: `/Volumes/HestAI/library/02-cognitions/112-SYSTEM-COGNITION-PATHOS.oct.md`

## Step 3: Tier Classification

**DETERMINE_TIER**:
- IF simple_utility_task + high_frequency → **Tier 1** (90-130 lines)
- IF specialist_expertise + quality_enforcement → **Tier 2** (130-250 lines)
- IF strategic_methodology + (rare_invocation OR high_stakes_impact OR blocking_authority) → **Tier 3** (250-400 lines)
- IF ultimate_authority + system_orchestration → **Tier 4** (400-600 lines)

**TIER DETAILS**:

### TIER 1: UTILITY AGENTS (90-130 lines)
- **Purpose**: Simple, focused execution tasks
- **Examples**: sessions-manager, directory-curator
- **Structure**: 4-5 sections (COGNITIVE, OPERATIONAL, DOMAIN, CONSTRAINTS)
- **Characteristics**: Straightforward workflows, limited decision-making, minimal methodology

### TIER 2: SPECIALIST AGENTS (130-250 lines)
- **Purpose**: Domain expertise with quality enforcement
- **Examples**: implementation-lead, code-review-specialist, security-specialist, validator
- **Structure**: 6-9 sections + domain methodology or philosophy
- **Characteristics**: Complex decision-making, anti-pattern prevention, synthesis required, evidence-based verification
- **Note**: Complete SHANK_OVERLAY (~40 lines) + VERIFICATION_PROTOCOL (~25 lines) naturally extends specialists to 200-250 lines

### TIER 3: STRATEGIC ARCHITECTS (250-400 lines)
- **Purpose**: High-stakes strategic work with comprehensive methodology
- **Examples**: north-star-architect, critical-design-validator, technical-architect, test-methodology-guardian
- **Structure**: 8-11 sections + extensive methodology + decision frameworks
- **Characteristics**: High-stakes impact or rare invocations, complex multi-stage processes, teaching materials critical for quality, BLOCKING authority

### TIER 4: ULTIMATE AUTHORITY (400-600 lines) - RARE
- **Purpose**: Constitutional orchestrators with cross-system responsibilities
- **Examples**: holistic-orchestrator, requirements-steward
- **Structure**: 11-12 sections + prophetic intelligence + full integration frameworks
- **Characteristics**: System-wide coordination, ultimate authority, comprehensive oversight

## Step 4: Section Selection

**MANDATORY** (all tiers):
1. COGNITIVE_FOUNDATION
2. OPERATIONAL_IDENTITY
3. DOMAIN_CAPABILITIES
4. OPERATIONAL_CONSTRAINTS

**ADD_BASED_ON_TIER**:
- Tier 1: Usually just mandatory sections (4 total)
- Tier 2: Add METHODOLOGY + VERIFICATION_PROTOCOL (6-8 sections)
- Tier 3: Add CONSTITUTIONAL_FOUNDATION + extensive METHODOLOGY + OUTPUT_CONFIGURATION (8-11 sections)
- Tier 4: Full constitutional stack + PROPHETIC_INTELLIGENCE (11-12 sections)

**CONDITIONAL SECTIONS** (Include When Justified):
5. ⚖️ UNIVERSAL_CONSTRAINTS - Strong anti-pattern prevention needed (Tier 2+)
6. ⚖️ CONSTITUTIONAL_FOUNDATION - Philosophical grounding critical (Tier 2+, recommended all tiers)
7. ⚖️ METHODOLOGY/PHILOSOPHY - Complex multi-stage processes (Tier 2-4)
8. ⚖️ AUTHORITY_MODEL - Governance or blocking authority (governance roles)
9. ⚖️ VERIFICATION_PROTOCOL - Anti-validation-theater critical (quality/governance roles)
10. ⚖️ OUTPUT_CONFIGURATION - Complex multi-stakeholder outputs (strategic roles)
11. ⚖️ INTEGRATION_FRAMEWORK - Complex handoffs/coordination (orchestration roles)
12. ⚖️ PROPHETIC_INTELLIGENCE - Early warning systems (ultimate authority only)

## Step 5: Agent Structure

**SECTION_ORDER**:
```
## 1. UNIVERSAL_CONSTRAINTS ## (Tier 2+, optional)
## 2. CONSTITUTIONAL_FOUNDATION ## (Tier 2+, recommended all)
## 3. COGNITIVE_FOUNDATION ## (MANDATORY)
## {COGNITION}_SHANK_OVERLAY ## (MANDATORY - immediately after COGNITIVE_FOUNDATION)
## 4. OPERATIONAL_IDENTITY ## (MANDATORY)
## 5. METHODOLOGY/PHILOSOPHY ## (Tier 2+)
## 6. AUTHORITY_MODEL ## (if governance)
## 7. DOMAIN_CAPABILITIES ## (MANDATORY)
## 8. VERIFICATION_PROTOCOL ## (if quality/governance)
## 9. OUTPUT_CONFIGURATION ## (if complex outputs)
## 10. INTEGRATION_FRAMEWORK ## (if coordination)
## 11. OPERATIONAL_CONSTRAINTS ## (MANDATORY)
## 12. PROPHETIC_INTELLIGENCE ## (Tier 4 only)
```

See [constitutional-patterns.md](constitutional-patterns.md) for complete section templates.

## Step 6: Validation Checklist

**COGNITION_AND_ARCHETYPES**:
- [ ] COGNITION_SELECTED: [LOGOS|ETHOS|PATHOS] (single only)
- [ ] SHANK_OVERLAY_INCLUDED: Mandatory behavioral enforcement from corresponding shank
- [ ] ARCHETYPES_CHOSEN: 2-3 MAX aligned to role
- [ ] ARCHETYPE_BEHAVIORAL_EMPHASIS: Each archetype has specific application context (e.g., HERMES::{phase_translation})
- [ ] RATIONALE_NOTED: 1-2 lines explaining cognition and archetype choices
- [ ] CONSTITUTIONAL_ALIGNMENT: Cognition matches force (ETHOS=CONSTRAINT, LOGOS=STRUCTURE, PATHOS=VISION)

**TIER_VALIDATION**:
- [ ] TIER_CLASSIFIED: Based on purpose, complexity, frequency
- [ ] SIZE_APPROPRIATE: Within tier guidelines
- [ ] SECTIONS_JUSTIFIED: Only included sections that add value
- [ ] BLOAT_CHECK: Removed redundancy and unnecessary prose

**QUALITY_GATES**:
- [ ] YAML_FRONTMATTER: Present with name and description
- [ ] OPERATORS: preserve [::, →, ×, _VERSUS_]
- [ ] COGNITION: single_mode_only
- [ ] OUTPUT: behavioral_directives_clear
- [ ] EVIDENCE: constitutional_grounding_present (recommended)
- [ ] ANTI_PATTERNS: prevention_mechanisms_included (Tier 2+)

**NEVER**:
- [ ] COGNITION_MIX
- [ ] ARCHETYPE_BLOAT>3
- [ ] PHILOSOPHICAL_PROSE_WITHOUT_OPERATIONAL_IMPACT
- [ ] REDUNDANT_CAPABILITY_DESCRIPTIONS
- [ ] MISSING_YAML_FRONTMATTER

**ALWAYS**:
- [ ] EVIDENCE_BASED_SECTIONS
- [ ] CLEAR_BEHAVIORAL_SYNTHESIS
- [ ] APPROPRIATE_TIER_CLASSIFICATION
- [ ] QUALITY_OVER_TOKEN_COUNTING

## Step 7: Deployment

**GLOBAL_SCOPE**: `/Users/shaunbuswell/.claude/agents/[agent-name].oct.md`
**PROJECT_SCOPE**: `./.claude/agents/[agent-name].oct.md`
**CLI_DELEGATION**: `/Volumes/HestAI-Tools/hestai-mcp-server/systemprompts/clink/[agent-name].txt`

**AUTHORITY_MARKING**: `<!-- SUBAGENT_AUTHORITY: subagent-creator $(date -Iseconds) -->`

**ECOSYSTEM_INTEGRATION**:
- NOTIFY_STEWARD: hestai-doc-steward for capability matrix update
- MAINTAIN_DISCOVERABILITY: All agents findable via lookup system

**COMPLETION_ACTIONS**:
- [ ] SAVE_AGENT_DEFINITION: Version control
- [ ] VALIDATE_AGAINST_CHECKLIST: Complete validation
- [ ] CLASSIFY_TIER: Appropriate tier assignment
- [ ] DOCUMENT_RATIONALE: Cognition, archetype, and tier choices
- [ ] CREATE_CLI_VERSION: Strip frontmatter for clink delegation

## Anti-Patterns to Avoid

**NEVER**:
- Mix cognitions (single only)
- Component assembly that flattens OCTAVE operators
- Generic modules without semantic weaving
- Arbitrary archetype bloat >3
- Size bloat beyond tier maximum without justification
- Subjective or assumption-based validation
- Philosophical prose without operational impact
- Token counting as primary optimization goal
- Missing YAML frontmatter

**ALWAYS**:
- Preserve OCTAVE operators [::, →, ×, _VERSUS_]
- Reference project North Star when applicable
- Evidence-based sections
- Machine-queryable output structure
- Constitutional grounding to prevent drift
- Quality and alignment over token efficiency
- Include YAML frontmatter for discovery
