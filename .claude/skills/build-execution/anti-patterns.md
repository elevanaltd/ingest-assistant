# Build Anti-Patterns

DEFINITION::Common_mistakes_that_degrade_quality + increase_maintenance + introduce_bugs

## 1_ISOLATED_EDITS[System_Blindness]

SYMPTOMS::"I_just_changed_one_function"→unexpected_failures_in_distant_components + integration_bugs_despite_unit_tests + ripple_effects_not_anticipated

EXAMPLE::"processUser(id)→processUser(userId) | 15_call_sites + db_query_builder + GraphQL_resolver + type_defs → 4hrs_debugging"

DETECT::[changes_without_grepping, skip_dependency_analysis, quick_fix_mentality, no_test_failures_but_prod_breaks]

PREVENT::[ripple_map_before_coding[git_grep_usage], run_full_suite[not_just_changed_file], check_types[npm_typecheck], system_impact_analysis[what_imports + transitive + assumptions + what_breaks]]

## 2_FEATURE_BLOAT[Scope_Creep]

SYMPTOMS::"Since_I'm_here_I'll_also..."→features_nobody_asked_for + increased_complexity_without_user_value + PRs_do_multiple_things

EXAMPLE::"Task: email_validation | Also: disposable_check + DNS_verify + typo_suggestions + analytics → 200_lines_instead_of_10 + 3_new_dependencies"

DETECT::[implementing_not_in_requirements, adding_abstractions_for_future, improving_unrelated_code, multiple_concerns_one_commit]

PREVENT::[scope_validation[explicitly_requested? + solves_user_problem? + solving_problem_that_doesnt_exist?], defer_until_needed[Rule_of_Three], separate_PRs[improvement→new_ticket], commit_discipline[one_concern_per_commit]]

## 3_CONTEXT_DESTRUCTION[History_Amnesia]

SYMPTOMS::"Comment_is_obvious_removing_it"→deleting_TODOs_without_addressing + removing_commit_history + stripping_architectural_rationale

EXAMPLE::"setTimeout_comment[why_not_setInterval + issue#234]→deleted→future_dev_reintroduces_bug#234"

DETECT::[deleting_non-obvious_comments, removing_TODO_without_resolution, stripping_git_history, cleanup_PRs_remove_context]

PREVENT::[git_handles_versions_comments_explain_WHY≠WHAT, preserve_TODOs[document_why_not_fixed], architectural_decisions_in_docs[.coord/DECISIONS.md], commit_messages_explain_WHY]

## 4_PREMATURE_OPTIMIZATION[Optimization_Without_Evidence]

SYMPTOMS::"This_could_be_faster"→optimization_without_profiling + added_complexity_for_theoretical_gains + micro-optimizations_while_real_bottlenecks_exist

EXAMPLE::"Optimize_array_iteration | Real_bottleneck: N+1_database_queries → wasted_2hrs_on_wrong_optimization"

DETECT::[optimizing_without_measuring, assuming_bottlenecks, complexity_added_for_speed, ignoring_profiler_results]

PREVENT::[profile_first_ALWAYS[measure≠intuit], optimize_algorithms_before_code[O(n²)→O(n)], benchmark_before_after[prove_improvement], complexity_cost_justified[measurable_gain]]

## 5_TEST_PROCRASTINATION[Test-After_Syndrome]

SYMPTOMS::"I'll_add_tests_later"→tests_fit_code≠requirements + missing_edge_cases + tests_don't_guide_design + coverage_theater

EXAMPLE::"Implement_feature→write_tests_after → tests_pass_but_feature_breaks_in_edge_cases"

DETECT::[tests_added_after_code, commit_message["Add_tests"], single_commit_both_test_impl, test_timestamp_newer_than_impl]

PREVENT::[TDD_discipline[RED→GREEN→REFACTOR], git_history_enforcement[TEST_commit→FEAT_commit], failing_test_proof_required, no_merge_without_TDD_evidence]

## 6_ABSTRACTION_ADDICTION

SYMPTOMS::"Future_flexibility"→abstractions_for_2_use_cases + generic_classes_for_specific_problems + frameworks_for_one-time_tasks + indirection_without_benefit

EXAMPLE::"2_similar_functions→DataProcessor_class_with_generics → only_2_call_sites + complex_config"

DETECT::[abstraction_before_3rd_use, generic_solutions_for_specific_problems, indirection_without_clarity, flexibility_nobody_needs]

PREVENT::[Rule_of_Three[1st_concrete→2nd_note_similarity→3rd_consider_abstracting], YAGNI[You_Aren't_Gonna_Need_It], abstractions_reduce_cognitive_load≠increase, understandable_without_docs]

## 7_SNOWBALL_COMMITS[Oversized_Changes]

SYMPTOMS::100+_files_one_PR→impossible_to_review + mixed_concerns + unclear_scope + rollback_nightmare

EXAMPLE::"Refactor_user_service + add_feature + fix_bugs + update_deps → 247_files_changed"

DETECT::[PRs_with_50+_files, multiple_unrelated_changes, commit_with_mixed_concerns, reviewer_comment["too_large_to_review"]]

PREVENT::[atomic_commits[one_logical_change], feature_flags[for_gradual_rollout], separate_refactor_from_features, stacked_PRs[small_incremental]]

## 8_DEPENDENCY_DRIFT[Version_Chaos]

SYMPTOMS::outdated_dependencies→security_vulnerabilities + compatibility_issues + breaking_changes_accumulate + dependency_hell

EXAMPLE::"react@16.8→18.0_without_testing → breaking_changes_in_hooks + concurrent_mode_issues"

DETECT::[dependencies_not_updated_6mo+, security_warnings_ignored, version_pinning_without_reason, no_dependency_audit]

PREVENT::[regular_updates[monthly_review], security_scanning[npm_audit + Dependabot], test_before_update[integration_suite], document_version_decisions[why_pinned]]

## 9_ENVIRONMENT_PARITY_GAPS[Works-On-My-Machine]

SYMPTOMS::"Works_locally"→prod_failures + different_node_versions + missing_env_vars + DB_schema_drift

EXAMPLE::"Local: node@18 + sqlite | Prod: node@16 + postgres → crashes_on_deploy"

DETECT::[no_version_specification, different_DBs_dev_prod, missing_.env.example, manual_environment_setup]

PREVENT::[version_specification[.nvmrc + package.json_engines], docker_for_consistency, CI_matches_prod[same_node_version + same_DB], env_var_validation[startup_checks]]

## DETECTION_FRAMEWORK

QUESTION::"Which_anti-pattern_am_I_falling_into?"

CHECK::[
  changing_without_system_analysis?→ISOLATED_EDITS,
  adding_unrequested_features?→FEATURE_BLOAT,
  deleting_WHY_comments?→CONTEXT_DESTRUCTION,
  optimizing_without_profiling?→PREMATURE_OPTIMIZATION,
  writing_tests_after?→TEST_PROCRASTINATION,
  abstracting_for_2_cases?→ABSTRACTION_ADDICTION,
  PR_with_100+_files?→SNOWBALL_COMMITS,
  dependencies_6mo+_old?→DEPENDENCY_DRIFT,
  works_locally≠prod?→ENVIRONMENT_PARITY_GAPS
]

## WISDOM

PREVENTION>CURE::"Recognize_pattern_early→apply_prevention_strategy→avoid_hours_debugging"

CORE_TRUTH::"Anti-patterns_are_shortcuts_that_create_technical_debt→Pay_now_or_pay_later_with_interest"
