---
name: code-extraction
description: Analyzes agent prompts and codebase for operational knowledge extraction opportunities. Identifies large knowledge blocks (migration workflows, framework patterns, operational procedures) suitable for Skills extraction. Use when refactoring agent prompts, reducing prompt bloat, or systematizing operational knowledge. Triggers on: agent prompt analysis, operational knowledge extraction, Skills creation opportunities, prompt optimization, knowledge consolidation.
allowed-tools: Read, Grep, Glob
---

# Code Extraction Skill

CODE_EXTRACTION_MASTERY::[OPERATIONAL_KNOWLEDGE_IDENTIFICATION+PROMPT_ANALYSIS+SKILLS_CREATION_OPPORTUNITIES]→SYSTEMATIC_KNOWLEDGE_EXTRACTION

## PURPOSE

MISSION::help_implementation-lead_identify_operational_knowledge_blocks_in_agent_prompts→extract_into_Skills[reduce_prompt_size+improve_reusability]

## EXTRACT_THESE[OPERATIONAL_PROCEDURES]

EXTRACT::[
  multi_step_workflows[MIGRATION_WORKFLOW::1_check_schema→2_run_migration→3_verify],
  command_sequences[npm_install→npm_run_build→npm_test],
  protocol_lists[ERROR_RESOLUTION::[invoke_X,check_Y,verify_Z]],
  framework_specific_patterns[Supabase_RLS_patterns,Next.js_setup],
  reference_material[API_docs,benchmarks,checklists]
]

REUSABLE_KNOWLEDGE::[
  blocks_appearing_in_multiple_agents,
  domain_specific_operational_knowledge[database_patterns,testing_protocols],
  tool_specific_procedures[git_workflows,CI/CD_steps],
  verification_protocols[quality_gates,validation_checklists]
]

SIZE_INDICATORS::[
  blocks>50_lines,
  lists_with>10_items,
  procedures_with>5_steps,
  external_file_references_that_could_be_consolidated
]

## NEVER_EXTRACT[CONSTITUTIONAL_CONTENT]

PROHIBITED::[
  CONSTITUTIONAL_FOUNDATION,
  COGNITIVE_FOUNDATION,
  OPERATIONAL_IDENTITY,
  Core_Forces[VISION,CONSTRAINT,STRUCTURE,REALITY,JUDGEMENT],
  Archetypes[PHAEDRUS,ATLAS,ATHENA,...],
  Cognition_types[ETHOS,LOGOS,PATHOS,NOUS],
  Behavioral_synthesis[BE,OBSERVE,PRESERVE_patterns],
  RACI_relationships,
  Accountability_chains[ACCOUNTABLE,RESPONSIBLE,CONSULTED],
  BLOCKING/ADVISORY_authority_levels,
  Agent_handoff_protocols,
  *_SHANK_OVERLAY_sections,
  MUST_ALWAYS/MUST_NEVER_constraints,
  Constitutional_behavioral_enforcement
]

## ANALYSIS_METHOD

PHASE_1::DISCOVERY[glob("**/*.oct.md",~/.claude/agents/)]

PHASE_2::PATTERN_SEARCH::[
  headings[EXECUTION_PROTOCOL,ERROR_RESOLUTION,METHODOLOGY,VERIFICATION_PROTOCOL],
  lists[WORKFLOW::[step1,step2,step3]],
  procedures[numbered_or_bulleted_instruction_lists],
  references[external_file_paths_or_documentation_links]
]

PHASE_3::EXCLUSION_CHECK→skip_blocks_in_or_near[constitutional_sections,identity_definitions,authority_assignments,behavioral_mandates]

PHASE_4::ASSESSMENT[PER_CANDIDATE]::[
  SIZE::>50_lines?,
  REUSABILITY::used_by_multiple_agents?,
  INDEPENDENCE::can_stand_alone_without_agent_context?,
  VALUE::would_extraction_actually_reduce_complexity?
]

## OUTPUT_FORMAT

TEMPLATE::[
  ```
  ## EXTRACTION CANDIDATE: {proposed-skill-name}

  **SOURCE**: {file-path}:{line-range}
  **SIZE**: {line-count} lines
  **REUSABILITY**: {how-many-agents-could-use-this}
  **CONFIDENCE**: High/Medium/Low

  **RATIONALE**:
  {Why this should be extracted - what problem does it solve?}

  **PREVIEW** (first 20 lines):
  {excerpt}

  **PROPOSED SKILL DESCRIPTION**:
  {draft description with trigger keywords for autonomous invocation}

  **EXTRACTION IMPACT**:
  - Reduces {agent-name} prompt by {lines} lines
  - Could be reused by: {other-agent-names}
  - Maintains operational knowledge portability
  ```
]

## LIMITATIONS

ADVISORY_ONLY::[
  ✅identifies_opportunities,
  ✅provides_recommendations,
  ❌does_NOT_modify_agent_prompts,
  ❌does_NOT_create_Skills_automatically,
  ❌does_NOT_guarantee_extraction_is_appropriate
]

REQUIRE_HUMAN_REVIEW::[
  validate_constitutional_content_excluded,
  confirm_extraction_makes_sense_in_context,
  check_operational_knowledge_truly_reusable,
  ensure_agent_identity_preserved
]

PERFORMANCE_CONSIDERATIONS::[
  analysis_of_large_prompts_may_be_slow,
  false_positives_possible[human_validation_required],
  pattern_matching_is_heuristic≠perfect
]

## USAGE_EXAMPLES

EXPLICIT_INVOCATION::"@code-extraction analyze supabase-expert agent for extraction opportunities"

WORKFLOW_INTEGRATION::[
  1→implementation-lead_invokes_code-extraction_on_agent_prompt,
  2→review_extraction_candidates,
  3→consult_skills-expert_to_validate_proposed_Skills,
  4→create_new_Skill_if_validated,
  5→refactor_agent_prompt_to_reference_new_Skill
]

## INTEGRATION

WORKS_WITH::[
  skills-expert::validates_Skill_structure_before_creation,
  agent-creation::creates_new_Skills_after_validation,
  implementation-lead::primary_user_of_this_skill,
  hestai-doc-steward::updates_documentation_after_Skill_creation
]
