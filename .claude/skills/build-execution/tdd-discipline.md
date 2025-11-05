# TDD Discipline

CORE::"Failing_test_BEFORE_implementation→NO_exceptions"

BECAUSE::[prevents_over_engineering[implement_only_what_test_requires], prevents_under_specification[test_defines_requirements], prevents_integration_bugs[test_proves_component_works], prevents_regression[test_catches_future_breaks]]

## RED→GREEN→REFACTOR

CYCLE::[
  RED::[write_test_describing_behavior→run_test→MUST_FAIL→verify_fails_RIGHT_reason≠syntax_error],
  GREEN::[write_minimal_code_to_pass→run_test→MUST_PASS→resist_while_here_features],
  REFACTOR::[identify_duplication_or_complexity→refactor_small_steps→run_tests_after_EACH→IF[fail]→revert_immediately]
]

QUALITY_CHECKS::[
  RED::[test_describes_one_behavior?, failure_message_obvious?, requirement_clear_from_test?],
  GREEN::[added_ONLY_what_test_requires?, resisting_feature_creep?, code_obvious_and_direct?],
  REFACTOR::[improved_clarity?, tests_still_passing?, changed_behavior≠NO]
]

EXAMPLE_PROGRESSION::[
  RED::"test('calculateDiscount applies 10% for premium')→expect(calculateDiscount(user, 100)).toBe(90)→FAIL[not_defined]",
  GREEN::"function calculateDiscount(user, price) { if (user.tier === 'premium') return price * 0.9; return price; }→PASS",
  REFACTOR::"Extract DISCOUNT_RATES constant→return price * (1 - discountRate)→PASS[clearer_code]"
]

## TEST-FIRST_DISCIPLINE

WHY_IT_WORKS::[
  DESIGN_PRESSURE::[writing_test_first→forces_API_thinking, hard_to_test→design_problems, test_difficulty→reveals_coupling],
  SPECIFICATION::[test_defines_done, no_ambiguity, executable_documentation],
  SAFETY_NET::[green_tests→confidence_to_refactor, red_tests→caught_regression, fast_feedback]
]

WORKFLOW::write_failing_test→run_verify_fails→write_minimal_code→run_verify_passes→refactor_if_needed→run_verify_still_passes→commit→next_test

WHEN_TEMPTED_TO_SKIP::[
  "too_simple_to_test"→WRONG[simple_code_breaks_too],
  "add_tests_after"→WRONG[you_wont],
  "need_to_explore"→SPIKE_PROTOCOL[create_spike_branch→explore_timeboxed→throw_away→write_test_first_main→implement_with_knowledge]
]

## TDD_ENFORCEMENT

GIT_HISTORY_PATTERN::[
  REQUIRED::"TEST: Add failing test..." → "FEAT: Implement..."→git_log_shows_RED→GREEN,
  VALIDATION::[implementation_commits_preceded_by_test_commits, TEST_before_FEAT_pattern, reviewer_verifies_commit_order],
  REJECT_TRIGGERS::[implementation_precedes_test, test_file_not_modified_with_impl, no_RED_state_evidence, retroactive_test_addition]
]

AUTOMATED_GATES::[
  test_file_pairing[impl_modified→test_MUST_be_modified],
  git_history_order[parse_commits→reject_FEAT_before_TEST],
  coverage_delta[new_code→maintain_or_increase[signal≠gate]]
]

MANUAL_VERIFICATION::[
  PR_evidence[RED_state_output + test_file + impl_file + commit_order],
  reviewer_checklist[test_commit_before_impl, RED_proof_provided, both_files_modified, GREEN_state_confirmed, no_test_later_patterns]
]

AUTHORITY::[implementation-lead::RESPONSIBLE[TDD_evidence], code-review-specialist::ACCOUNTABLE[verify_compliance], test-methodology-guardian::BLOCKING[test_integrity_violations]]

RED_FLAGS::[commit_message["Add tests"]→implies_after, single_commit_both→cant_verify_RED, test_timestamp_newer, reviewer_comment["Please add tests"]→detected_after]

## BEHAVIOR≠COVERAGE

COVERAGE_GUIDELINE::[80%_diagnostic≠gate, high_coverage≠quality_guarantee, low_coverage→indicates_gaps, test_behavior_users_depend_on→coverage_follows_naturally]

TEST_BEHAVIOR≠IMPLEMENTATION::[
  BAD::"test('uses map internally')→spy_on_map→breaks_when_refactor_to_forloop",
  GOOD::"test('transforms numbers to strings')→expect(transform([1,2,3])).toEqual(['1','2','3'])→passes_regardless_of_impl"
]

ESSENTIAL≠ACCUMULATIVE::[
  ESSENTIAL::[validates_user_dependent_behavior, catches_meaningful_bugs, remains_valid_through_refactoring, documents_contract],
  ACCUMULATIVE::[chases_coverage_metrics, tests_implementation_details, breaks_on_safe_refactoring, adds_maintenance_burden]
]

## BEST_PRACTICES

ONE_BEHAVIOR_PER_TEST::BAD["test('user operations')→create+update+delete_in_one"] → GOOD[separate_tests_per_operation]

DESCRIPTIVE_NAMES::PATTERN["[function] [does_what] [under_what_conditions]"]→"calculateDiscount applies 10% for premium users"

ARRANGE_ACT_ASSERT::[setup_test_data→perform_operation→verify_outcome]

TEST_EDGE_CASES::[happy_path[normal_inputs], edge_cases[empty/null/undefined/zero/negative], error_cases[invalid_inputs], boundary_conditions[max/min/limits]]

KEEP_FAST::[
  STRATEGY::[mock_external_dependencies, in_memory_dbs_for_integration, unit_frequent + integration_CI, parallelize_execution],
  BENCHMARK::[unit<1s_suite, integration<10s_suite, e2e<60s_critical_paths]
]

## ANTI_PATTERNS

PATTERNS_TO_AVOID::[
  testing_implementation_details→tests_break_on_safe_refactoring,
  skipping_simple→simple_code_breaks_too[add(0.1, 0.2)→0.30000000000000004],
  writing_tests_after→tests_fit_code≠requirements→coverage_theater,
  one_giant_test→hard_debug + unclear_failure,
  mocking_everything→tests_pass + integration_fails[balance_unit_integration_e2e],
  testing_private_methods→couples_to_implementation[test_public_API_only]
]

## GIT_WORKFLOW

COMMIT_STRATEGY::[
  "test: add test for X (RED)"→"feat: implement X (GREEN)"→"refactor: simplify X"
]→git_history_shows_TDD_discipline

REVIEW_VERIFICATION::[tests_added_with_code, covers_happy+edge, focuses_behavior≠implementation, clear_and_descriptive]

WISDOM::"Test_is_specification | Code_is_implementation | Write_spec_first"
