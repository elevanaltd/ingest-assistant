---
name: agent-creation
description: Comprehensive agent creation reference including YAML frontmatter requirements, tier classification, cognitive architecture, constitutional patterns, and archetype selection. Use when creating or validating HestAI agents, ensuring proper structure and discovery. Triggers on create agent, agent structure, YAML frontmatter, agent validation, tier classification, archetype selection, OCTAVE agents.
allowed-tools: Read
---

# Agent Creation Skill

AGENT_CREATION_MASTERY::[YAML_FRONTMATTER+TIER_CLASSIFICATION+COGNITIVE_ARCHITECTURE+CONSTITUTIONAL_PATTERNS+ARCHETYPE_SELECTION]→PRODUCTION_READY_OCTAVE_AGENTS

## CRITICAL_REQUIREMENTS[SUPPORTING_DOCUMENTATION]

YAML_FRONTMATTER::yaml-frontmatter.md[MANDATORY]::[
  syntax_requirements,
  required_fields,
  character_limits,
  CRITICAL::"Every agent MUST start with YAML frontmatter - breaks discovery if missing"
]

CREATION_WORKFLOW::creation-workflow.md::[
  7_step_methodology::Requirements→Cognition→Tier→Sections→Structure→Validation→Deployment
]

CONSTITUTIONAL_PATTERNS::constitutional-patterns.md::[
  Core_Forces,
  Universal_Principles,
  Cognitive_Foundation,
  SHANK_overlays
]

ARCHETYPE_DATABASE::archetype-database.md::[
  archetype_definitions,
  behavioral_emphasis,
  role_pattern_matching
]

## PRE_CREATION_CHECKLIST

BEFORE_CREATING_ANY_AGENT::[
  1→YAML_frontmatter_is_first_thing_in_file,
  2→classify_tier[Utility/Specialist/Strategic/Authority],
  3→select_single_cognition[ETHOS/LOGOS/PATHOS],
  4→choose_2-3_archetypes_with_behavioral_emphasis,
  5→include_corresponding_SHANK_overlay,
  6→validate_against_checklist
]

## HISTORICAL_BUG_FIX

SKILLS_EXPERT_ISSUE::"skills-expert agent created without YAML frontmatter"

MANDATORY_PATTERN::[
  ```yaml
  ---
  name: skills-expert
  description: Skills creation and validation specialist for Claude Code. Ensures correct directory structure (skill-name/SKILL.md), YAML frontmatter compliance (name, description, allowed-tools), discovery optimization, and tool restriction patterns. BLOCKING authority for structural violations preventing Skill discovery.
  ---
  ```
]

ENFORCEMENT::"Every future agent creation MUST include frontmatter"

## INTEGRATION

WHEN_CREATING_AGENTS_REFERENCE::[
  YAML_requirements::syntax+fields+character_limits,
  Workflow_steps::tier_classification+section_selection+validation,
  Constitutional_templates::Core_Forces+Universal_Principles+SHANK_overlays,
  Archetype_selection::role_patterns+behavioral_emphasis+application_contexts
]

PROVIDES::"Operational knowledge preventing structural bugs and ensuring discoverability"
