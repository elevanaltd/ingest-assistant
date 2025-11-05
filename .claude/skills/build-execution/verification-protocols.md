# Verification Protocols

CORE::"Claims_require_reproducible_artifacts→NO_exceptions"

BECAUSE::[prevents_validation_theater["I tested it"], prevents_regression["worked_on_machine"], prevents_integration_failures["tests_passed_deploy_broke"], prevents_accountability_gaps["who_approved_this"]]

## ANTI_VALIDATION_THEATER

DEFINITION::going_through_testing_motions_without_evidence_tests_actually_passed

EXAMPLES::[
  "I_ran_tests"[no_output],
  "Coverage_good"[no_report],
  "Passes_locally"[CI_not_run],
  "Linting_clean"[no_lint_output]
]

REALITY::"If_you_cant_reproduce_validation→it_didnt_happen"

## EVIDENCE_REQUIREMENTS

MANDATORY_ARTIFACTS::[
  TEST_RESULTS::command_output_showing_pass_fail[PASS_tests≠claims],
  BUILD_LOGS::lint+typecheck+test_execution[0_errors_required],
  COVERAGE_REPORTS::actual_percentages_with_file_paths[which_files+which_lines_missing],
  PERFORMANCE_METRICS::benchmark_results_or_profiling[BEFORE+AFTER+improvement_measured],
  CI_JOB_LINKS::pipeline_runs_showing_quality_gates[link+commit_SHA+all_gates],
  DEPLOYMENT_HASHES::commit_SHA+environment+timestamp+smoke_tests,
  TEST_COMMANDS::exact_commands_with_reproducible_results[anyone_can_reproduce],
  ROLLBACK_PROCEDURES::trigger_conditions+exact_commands+data_reversal+verification
]

ACCEPTABLE_FORMAT::[
  tests::"$ npm test → PASS tests/feature.test.js ✓ 3 passed → Test Suites: 1/1, Tests: 3/3, Time: 1.234s",
  lint::"$ npm run lint → ✓ 0 errors, 0 warnings",
  typecheck::"$ npm run typecheck → ✓ No type errors",
  coverage::"File: src/feature.js | Stmts: 95.23% | Branch: 88.88%",
  performance::"BEFORE: 245ms → AFTER: 89ms (63% faster, 156ms saved)",
  CI::"Run: https://github.com/org/repo/actions/runs/123456 | Commit: abc123 | Status: ✓ All gates"
]

NOT_ACCEPTABLE::[
  "Tests pass"[no_output],
  "3/3 passing"[no_command],
  "All green"[no_evidence],
  "Coverage is 80%"[which_files?],
  "This should be faster"[measure_it],
  lint_warnings_ignored,
  type_errors_suppressed_without_justification,
  tests_skipped["will fix later"]
]

## PR_TEMPLATE_REQUIREMENTS

REQUIRED_FIELDS::[
  QUALITY_GATES::[
    lint[status, command, output, errors:0, warnings:0],
    typecheck[status, command, output, errors:0],
    test[status, command, output, tests_passing:X/X_100%]
  ],
  CI_LINK[URL≠self_attestation, commit_SHA, all_gates_passed],
  TDD_EVIDENCE[RED_state_output, test_file, impl_file, commit_order:TEST→FEAT],
  MIP_COMPLIANCE[component_added, user_problem_solved, existing_extension_why_not, simplification_test_result, removal_test_evidence, reviewer_signoff],
  ROLLBACK[trigger_conditions, steps, verification]
]

REVIEWER_CHECKLIST::[
  quality_gates[all_three_have_evidence, CI_link_provided≠self_attestation, 0_errors_warnings, tests_100%_passing],
  TDD[RED_state_evidence, TEST→FEAT_pattern, test+impl_both_modified],
  MIP[minimality_justification_credible, removal_test_shows_testing, no_obvious_bloat],
  artifacts[all_required_fields_filled, evidence_reproducible, no_generic_claims]
]

BLOCK_MERGE_IF::[any_checkbox_unchecked]

## ENFORCEMENT

AUTOMATED::[
  PR_template_fields_required_via_platform,
  CI_check[fail_if_placeholder_text],
  bot_comments_if_empty,
  merge_button_disabled_until_complete
]

MANUAL::[
  code-review-specialist_MUST_verify_template_compliance,
  BLOCKING_authority_to_reject_if_empty,
  no_merge_without_complete_evidence
]

REJECTION_TRIGGERS::[
  required_fields_empty_or_placeholder,
  CI_link_missing[self_attestation_attempted],
  test_evidence_missing_for_new_code,
  MIP_justification_missing_for_new_components,
  generic_claims_without_artifacts
]

AUTHORITY::[implementation-lead::RESPONSIBLE[provide_evidence], code-review-specialist::ACCOUNTABLE[verify_evidence], critical-engineer::BLOCKING[if_insufficient_or_gates_failed]]

## QUALITY_GATES

THREE_MANDATORY::[LINT::code_style+static_analysis, TYPECHECK::type_safety, TEST::functional_behavior]

STANDARDS::[
  LINT::[0_errors + 0_warnings→REQUIRED, exception_requires[inline_justification + PR_documentation + approval]],
  TYPECHECK::[0_errors→REQUIRED, any_or_ts-ignore_ONLY_when[untyped_third_party + documented + approved]],
  TEST::[all_passing→REQUIRED, no_skipped_without[ticket + approval]]
]

## WORKFLOW

DURING_DEVELOPMENT::run_gates_after_change→capture_output→save_to_notes→include_in_commit_if_relevant

BEFORE_COMMIT::"npm run lint && typecheck && test"→capture_output→review_for_issues→IF[all_pass]→commit_with_evidence

BEFORE_PR::[all_commits_have_evidence, CI_ran_and_passed, code_review_with_artifacts, integration_tests_passed, performance_benchmarks_if_optimizing, deployment_plan_documented, rollback_procedure_documented]

## ARTIFACT_TRACKING

TRACK_PER_CHANGE::[test_output, coverage_report, lint_output, typecheck_output, CI_run_link, benchmark_results_if_performance]

WHERE::[commit_messages[inline_evidence], PR_description[summary], CI_artifacts[pipeline_saves_reports], documentation[link_to_artifacts]]

## REPRODUCIBILITY

TEST::"Can_another_developer_reproduce_your_validation?"

REQUIREMENTS::[exact_commands, environment_specified[node_version + OS], data_fixtures_if_needed, expected_output_shown]

FORMAT::Environment[versions]→Steps[exact_commands]→Expected[output_pattern]→Actual[paste_output]

## SCALE_ENFORCEMENT

MULTI_CONTRIBUTOR::[pre-commit_hooks[auto_run_gates], CI_enforcement[block_merge_if_fail], PR_templates[require_evidence], code_review_checklist[verify_artifacts]]

CI_PIPELINE::[run_all_gates, save_artifacts[test_reports + coverage], block_merge_if_fail, provide_artifact_links_in_PR]

WISDOM::"If_cant_reproduce→didnt_happen | Evidence>claims_always | Goal≠bureaucracy→confidence"
