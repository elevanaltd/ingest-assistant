# Build Philosophy

SYSTEM_AWARENESS::"Code_change→system_ripple→understand_ripples_BEFORE_modification"

## CORE_PRINCIPLES

SYSTEM_THINKING::[
  map_impact[imports/uses_changed_code, data_flow, shared_state]→document_ripple_paths,
  local_change_requires_system_context[simple_edit_breaks_distant_components],
  local_optimization_can_degrade_system[faster_function≠better_system_if_breaks_caching],
  minimal_code_serves_users[bloat_serves_complexity]→ruthlessly_cut_unnecessary,
  maintain_living_system≠edit_text[every_change_affects_production]
]

## MINIMAL_INTERVENTION_PRINCIPLE[MIP]

DEFINITION::[
  ESSENTIAL::code_serving_user_value[measurable_outcomes],
  ACCUMULATIVE::code_adding_maintenance_burden[without_proportional_user_value]
]

DECISION::"Could_we_achieve_same_outcome_with_simpler_means?"

PROCESS::remove_components_until_UX_degrades→identify_break_point→restore_last_essential→minimal_achieved

SIMPLIFICATION_TESTS::[
  FEATURES::[directly_solve_user_problem?, users_notice_removal?, users_care?],
  ABSTRACTIONS::[pattern_repeated_3+?, reduces_cognitive_load?, understandable_without_docs?],
  OPTIMIZATIONS::[measured_bottleneck?, profiled_first?, complexity_cost_justified?]
]

## MIP_ENFORCEMENT

BECAUSE::"MIP_requires_enforcement→prevent_accumulative_slipping_through_as_essential"

MANDATORY_ARTIFACTS::[
  MINIMALITY_JUSTIFICATION::[user_problem_solved?, why_not_extend_existing?, simplification_test_result?],
  REMOVAL_TEST_EVIDENCE::[what_removed?, break_point_identified?, minimal_restoration_performed?],
  REVIEWER_SIGNOFF::code-review-specialist_MUST_verify[minimality_credible, removal_test_shows_testing, no_obvious_bloat]
]

AUTHORITY::[implementation-lead::RESPONSIBLE, code-review-specialist::ACCOUNTABLE, critical-engineer::BLOCKING_if_insufficient]

RED_FLAGS::[generic_justifications["might need later", "best practice"], no_removal_test, abstraction_without_3+_sites, nice_to_have_without_demand]

## PHILOSOPHY_FRAMEWORK

UNDERSTAND→SHAPE→ACT::[
  UNDERSTAND::[user_problem?, system_connections?, dependencies?, assumptions?, invariants?]→WARNING["just_try_this", "probably_works", "not_sure_how"],
  SHAPE::[simplest_satisfying_requirements, obvious_to_future_readers[6mo], easy_test_isolation, minimal_coupling]→PATTERN[proven>novel, simple>clever, explicit>implicit],
  ACT::[TDD[failing_test_first], implement_minimal, refactor_for_essential_simplification_only, commit_atomically]→SCOPE[requested≠while_here, one_concern_per_commit]
]

WISDOM_PATH::"Between[complexity_labyrinth, oversimplification_sea]→minimal_effective"::[
  AVOID_LABYRINTH::[over_abstracted, premature_generalization, unjustified_patterns],
  AVOID_OVERSIMPLIFICATION::[unjustified_duplication, skipping_necessary_abstractions, ignoring_patterns],
  MINIMAL_EFFECTIVE::[just_enough_abstraction[prevent_duplication], just_enough_flexibility[handle_variations], just_enough_structure[maintain_coherence]]
]

## DECISION_GATES

BEFORE_X::[
  CODE::[user_problem?, extend_existing?, feature_requested_or_assumed?, defer_until_proven?]→IF[accumulative]→DONT_ADD,
  ABSTRACTION::[pattern_3+?, reduces_load?, understandable?, cost_if_requirements_change?]→RULE_OF_THREE[1st_concrete→2nd_note_similarity→3rd_consider_abstracting]→IF[mysterious]→KEEP_CONCRETE,
  OPTIMIZATION::[measured_bottleneck?, profiled?, gain_measured?]→PROFILE_FIRST→IF[not_measured]→DONT_OPTIMIZE,
  TESTS::[behavior_never_break_for_users?, component_contract?, catches_bugs?, behavior≠implementation?]→IF[not_user_facing]→RECONSIDER,
  REFACTOR::[improves_clarity?, reduces_complexity?, tests_green?, easier_changes?]→SAFETY[small_steps, test_after_each, revert_if_fail]→IF[behavior_changes]→NOT_REFACTORING_ITS_FEATURE
]

## EXAMPLES

RIPPLE_MAP::processUser(id)→processUser(user)::[
  DIRECT[10_files]→all_pass_user_object,
  INDIRECT→tests_need_fixtures≠IDs + API_hydrate + caching_changes,
  FLOW→db_queries_move_to_callers + N+1_risk,
  OUTCOME::"Simple_signature_change→20_files + performance_testing + staged_migration"
]

WITH_PHILOSOPHY_COMPARISON::[
  REQUEST::"Add_PDF_export",
  WITHOUT::[add_library→create_service→endpoint→ship]→500_lines_untested,
  WITH::[UNDERSTAND[who_why_how_often]→DISCOVER["1_user, monthly_report, screenshots_now"]→SHAPE[screenshot_API_10_lines]→ACT[TEST→IMPLEMENT→TEST→DOCUMENT]]→50_lines_tested_solves_actual
]

WISDOM::"Code_change→system_change | Think_systemically + Code_minimally + Verify_rigorously"

QUALITY_HIERARCHY::[BEST::code_you_dont_write, SECOND::obvious + testable + minimal]
