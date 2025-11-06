---
name: build-execution
description: Build execution philosophy including TDD discipline, Minimal Intervention Principle, system awareness, and verification protocols. Use when implementing code, managing build phase, enforcing test-first practices, or preventing accumulative complexity. Triggers on: build phase, TDD, test first, red green refactor, minimal code, system awareness, implementation, code quality, verification protocols, build philosophy.
allowed-tools: Read
---

# Build Execution Skill

BUILD_MASTERY::[SYSTEM_AWARENESS+TDD_DISCIPLINE+MINIMAL_INTERVENTION+VERIFICATION_PROTOCOLS]→PRODUCTION_QUALITY

## ⚠️ MANDATORY PROTOCOL ACTIVATION ⚠️

BEFORE_ANY_IMPLEMENTATION::[
  STEP_1::Read("~/.claude/skills/build-execution/tdd-discipline.md")→MANDATORY[load_complete_workflow],
  STEP_2::Read("~/.claude/skills/build-execution/build-philosophy.md")→MANDATORY[load_MIP_framework],
  STEP_3::Read("~/.claude/skills/build-execution/verification-protocols.md")→MANDATORY[load_evidence_requirements],
  EVIDENCE::TodoWrite_must_show::"Protocol loaded: TDD + MIP + Verification"
]

DETAILED_GUIDANCE::[
  TDD_WORKFLOW::"See tdd-discipline.md for RED-GREEN-REFACTOR examples and best practices",
  MIP_FRAMEWORK::"See build-philosophy.md for system awareness principles and decision frameworks",
  VERIFICATION::"See verification-protocols.md for evidence requirements and anti-validation-theater",
  ANTI_PATTERNS::"See anti-patterns.md for detection triggers and prevention strategies",
  MCP_TOOLS::"See mcp-tools.md for Context7 and Repomix integration during implementation"
]

## TODOWRITE ENFORCEMENT

REQUIRED_TODO_STRUCTURE::[
  {content:"Load build execution protocols (TDD + MIP + Verification)", status:"completed", activeForm:"Loading protocols"},
  {content:"RED: Write failing test for [feature]", status:"pending", activeForm:"Writing failing test"},
  {content:"Verify test fails for correct reason", status:"pending", activeForm:"Verifying failure reason"},
  {content:"GREEN: Minimal implementation to pass test", status:"pending", activeForm:"Implementing minimal solution"},
  {content:"Verify test passes", status:"pending", activeForm:"Verifying test passes"},
  {content:"REFACTOR: Improve while green (if needed)", status:"pending", activeForm:"Refactoring"},
  {content:"Commit with evidence (TEST → FEAT pattern)", status:"pending", activeForm:"Committing changes"}
]

TODO_PROGRESSION_RULE::RED[complete]→GREEN[in_progress]→GREEN[complete]→REFACTOR[optional]→COMMIT[required]

VIOLATION_DETECTION::[
  NO_PROTOCOL_LOAD_TODO::BLOCK→"Must create todo showing protocol loading",
  NO_RED_PHASE_TODO::BLOCK→"Must create todo for failing test phase",
  BATCH_COMPLETION::BLOCK→"Cannot mark RED+GREEN complete simultaneously",
  SKIP_VERIFICATION::BLOCK→"Must verify failure reason and test pass"
]

## CORE ENFORCEMENT PROTOCOLS

### SYSTEM_AWARENESS_MANDATE

CHANGE_IMPACT_PROTOCOL::[
  MAP_DEPENDENCIES::[identify_importers,trace_data_flow,check_shared_state,document_ripples],
  PRESERVE_CONTEXT::[load_bearing_code→extra_caution,architectural_understanding→mandatory],
  VALIDATE_COHERENCE::[system_wide_profile≠component_isolated,integration_test_required]
]

PRINCIPLES::[
  RIPPLE_MAPPING::code_change→system_impact[map_before_code],
  UNDERSTANDING::whole_house_before_brick[local_change→system_thinking],
  COHERENCE::validate_always[local_optimize≠system_degrade],
  MINIMALITY::minimal_serves_users≠bloat_serves_complexity,
  INTEGRITY::maintain_living_system≠edit_text_files
]

### MINIMAL_INTERVENTION_PRINCIPLE

MIP_DEFINITION::[
  ESSENTIAL_COMPLEXITY::serves_user_value[measurable_outcomes],
  ACCUMULATIVE_COMPLEXITY::maintenance_burden≠user_value,
  DECISION_RULE::"Could_simpler_means_achieve_same_outcome?"
]

MIP_ENFORCEMENT::[
  MINIMALITY_JUSTIFICATION::[
    REQUIRED::[user_problem,why_not_extend_existing,simplification_test_result],
    FORMAT::"Component: X | User Problem: Y (measured) | Existing Extension: why_not | Simplification Test: result | Minimality Claim: essential/accumulative"
  ],
  REMOVAL_TEST_EVIDENCE::[what_removed,break_point,minimal_restoration,result],
  REVIEWER_SIGNOFF::[
    CHECKLIST::[minimality_credible,removal_test_genuine,no_missed_abstractions,no_bloat],
    COMMENT::"MIP compliance verified - [rationale]"
  ],
  RED_FLAGS::[generic_justifications[might_need_later,best_practice,cleaner],no_removal_evidence,abstraction_without_3_uses,nice_to_have_without_demand]
]

AUTHORITY_CHAIN::implementation-lead[artifacts]→code-review-specialist[verify]→critical-engineer[blocking_if_insufficient]

DETAILED_FRAMEWORK::"See build-philosophy.md sections 2-4 for MIP process, simplification tests, and decision gates"

### TDD_DISCIPLINE

CORE_MANDATE::failing_test→BEFORE→implementation[NO_EXCEPTIONS]

RED_GREEN_REFACTOR::[
  RED::[write_failing_test,verify_fails_for_right_reason,define_behavior],
  GREEN::[minimal_code_to_pass,resist_feature_creep,satisfy_test_only],
  REFACTOR::[improve_while_green,small_steps,test_after_each_step,revert_if_red]
]

TEST_FIRST_WORKFLOW::"RED[write+verify_fail]→GREEN[minimal+verify_pass]→REFACTOR[improve+verify_pass]→COMMIT→NEXT"

GIT_ENFORCEMENT_PATTERN::[
  COMMIT_ORDER::"TEST: failing_test" → "FEAT: implementation" → "REFACTOR: simplification",
  VALIDATION::git_log_shows_RED→GREEN_progression,
  REVIEWER::verify_commit_order_matches_TDD
]

VALID_HISTORY::[
  "TEST: Add failing test for X",
  "FEAT: Implement X",
  "REFACTOR: Extract constants"
]

INVALID_HISTORY::[
  "FEAT: Implement X and add tests", # ❌ tests_after_code
  "FIX: Add missing test" # ❌ retroactive_test
]

DETAILED_WORKFLOW::"See tdd-discipline.md for complete RED-GREEN-REFACTOR examples, best practices, and anti-patterns"

### VERIFICATION_PROTOCOLS

CI_ENFORCEMENT::[
  TEST_FILE_PAIRING::implementation_modified→test_file_must_modify,
  GIT_HISTORY_ORDER::parse_commits[TEST→FEAT_pattern],
  COVERAGE_DELTA::maintain_or_increase[diagnostic≠gate]
]

MANUAL_VERIFICATION::[
  PR_EVIDENCE::[RED_state_output,test_file_path,impl_file_path,commit_order_proof],
  REVIEWER_CHECKLIST::[git_log_order,failure_output_provided,both_files_modified,GREEN_after_impl,no_test_later]
]

REJECTION_TRIGGERS::[impl_before_test_commit,test_file_not_modified,no_RED_evidence,wrong_commit_pattern,retroactive_tests]

DETAILED_REQUIREMENTS::"See verification-protocols.md for complete evidence requirements and anti-validation-theater enforcement"

## DECISION_GATES

BEFORE_ADDING_CODE::[
  ASK::[user_problem?,extend_existing?,feature_requested_or_assumed?,maintenance_cost?,defer_until_proven?],
  GATE::"Essential_or_accumulative?" → IF[accumulative]→DEFER
]

BEFORE_ABSTRACTING::[
  RULE_OF_THREE::[first→concrete,second→note_similarity_keep_concrete,third→consider_abstracting],
  GATE::"More_obvious_or_mysterious?" → IF[mysterious]→KEEP_CONCRETE
]

BEFORE_OPTIMIZING::[
  PROFILE_FIRST::measure→identify_hotpath→measure_gain→assess_complexity_cost,
  GATE::"Real_performance_problem?" → IF[not_measured]→NO_OPTIMIZE
]

BEFORE_REFACTORING::[
  SAFETY::[tests_green_before_start,small_verifiable_steps,test_after_each,commit_frequently,revert_if_fail],
  GATE::"Simpler_without_behavior_change?" → IF[behavior_changes]→NOT_REFACTORING
]

DETAILED_FRAMEWORKS::"See build-philosophy.md sections 5-8 for complete decision frameworks with examples"

## INTEGRATION

CONSULTED_BY::[implementation-lead[primary],universal-test-engineer[TDD],code-review-specialist[verification],error-architect[anti_patterns],completion-architect[integration]]

PROVIDES::[build_philosophy,decision_frameworks,TDD_discipline,verification_protocols,anti_pattern_library]

## WISDOM_SYNTHESIS

CORE_TRUTH::"Every_code_change_is_system_change → Think_systemically + Code_minimally + Verify_rigorously"

QUALITY_HIERARCHY::[
  BEST::code_you_dont_write,
  SECOND_BEST::obvious+testable+minimal
]

REMEMBER::"The_test_is_specification → The_code_is_implementation → Write_spec_first"
