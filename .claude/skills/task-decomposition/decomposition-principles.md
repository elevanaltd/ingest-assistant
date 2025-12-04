# Decomposition Principles

DECOMPOSITION_MASTERY::GRANULARITY+TDD_EMBEDDING+DEPENDENCY_MAPPING+FILE_SPECIFICITY

## GRANULARITY CALIBRATION

TARGET_RANGE::15-25_atomic_tasks

CALIBRATION_MATRIX::[
  <10_tasks::under_decomposed->implementation_ambiguity,
  10-14_tasks::borderline->verify_task_atomicity,
  15-25_tasks::optimal->atomic_verifiable_deliverables,
  26-30_tasks::borderline->verify_no_over_splitting,
  >30_tasks::over_decomposed->merge_related_tasks
]

TASK_SIZE_GUIDELINES::[
  S_SMALL::2-4_hours[single_component_or_test_suite],
  M_MEDIUM::4-8_hours[feature_slice_with_tests],
  L_LARGE::8-16_hours[consider_splitting_into_S+M]
]

SPLITTING_CRITERIA::[
  SPLIT_WHEN::[
    task_touches_>3_files,
    task_has_>2_distinct_concerns,
    estimated_time_>8_hours,
    multiple_verification_points_needed
  ],
  MERGE_WHEN::[
    tasks_share_same_file,
    tasks_are_sequential_without_parallel_opportunity,
    combined_task_<4_hours
  ]
]

## TDD TASK STRUCTURE

CORRECT_PATTERN::[
  FORMAT::"| ID | Description | TEST: X fails -> FEAT: implement X | files | deps | complexity |",
  EMBEDDED::single_task_contains_both_TEST_and_FEAT,
  SEQUENCE::TEST_appears_before_FEAT_in_description
]

EXAMPLES_CORRECT::[
  "P1.1 | Migration schema | TEST: schema tests fail -> FEAT: apply migration | /supabase/... | None | M",
  "P2.3 | App-source injection | TEST: injection test fails -> FEAT: create wrapper | apps/... | P2.2 | S"
]

EXAMPLES_WRONG::[
  "P1.1 | Create migration | FEAT: apply migration | ... | None | M",  // Missing TEST
  "P1.2 | Test migration | TEST: verify schema | ... | P1.1 | S",      // Separate TEST task
  "P1.1 | Migration | apply migration and add tests | ... | None | M"  // Unclear sequence
]

TDD_SEQUENCE_ENFORCEMENT::[
  MUST::every_task_shows_RED_before_GREEN,
  MUST::TEST_keyword_appears_before_FEAT_keyword,
  MUST_NOT::separate_TEST_and_FEAT_into_different_tasks,
  MUST_NOT::FEAT_appears_without_preceding_TEST
]

## DEPENDENCY MAPPING

CRITICAL_PATH_RULES::[
  DEFINITION::"Longest chain of dependent tasks from start to finish",
  VALIDATION::"Every task T in path: ALL deps(T) appear BEFORE T in path",
  COUNT::"Tasks in path = nodes in longest dependency chain"
]

COMMON_CRITICAL_PATH_ERRORS::[
  ERROR_1::omitting_intermediate_dependencies[
    WRONG::"P1.1->P1.4" when graph shows "P1.1->P1.2->P1.4",
    CORRECT::"P1.1->P1.2->P1.4"
  ],
  ERROR_2::path_count_mismatch[
    WRONG::"Critical Path: 9 tasks" when actual path has 10,
    CORRECT::count_must_match_listed_path
  ],
  ERROR_3::missing_cross_phase_dependencies[
    WRONG::P2.2_in_path_without_P1.4_when_P2.2_depends_on_P1.4,
    CORRECT::include_all_cross_phase_prerequisites
  ]
]

DEPENDENCY_GRAPH_FORMAT::[
  ```
  PHASE 1:
  P1.1 --+--> P1.2 --+
         |          |--> P1.4
         +--> P1.3 --+

  PHASE 2:
  P1.1 --> P2.1 --> P2.2 --+--> P2.3
  P1.4 ---------------+   +--> P2.4
  ```
]

## FILE PATH SPECIFICITY

EXPLICIT_PATHS_REQUIRED::[
  PATTERN::full_path_from_repo_root,
  EXAMPLE::"/supabase/migrations/20251127000000_component_level_comments.sql",
  EXAMPLE::"apps/copy-editor/src/components/editor/__tests__/EditorView-comments.test.tsx"
]

PROHIBITED_PATTERNS::[
  "...sql"           ->REPLACE_WITH->full_migration_filename,
  "**/*"             ->REPLACE_WITH->specific_file_list,
  ".../tests/*.ts"   ->REPLACE_WITH->explicit_test_file_paths,
  "etc."             ->REPLACE_WITH->enumerate_all_files,
  "[multiple files]" ->REPLACE_WITH->list_each_file
]

WHY_EXPLICIT_PATHS::[
  implementation_clarity::no_guessing_which_file,
  review_accuracy::validator_can_verify_files_exist,
  tracking::TodoWrite_can_reference_specific_files,
  evidence::git_commits_match_planned_files
]

## PHASE ORGANIZATION

STANDARD_PHASES::[
  P1::foundation[database_migration_RLS_types],
  P2::service_layer[services_hooks_state],
  P3::UI[components_integration_wiring],
  P4::validation[integration_tests_performance_documentation]
]

PHASE_EXIT_CRITERIA::[
  EACH_PHASE::[
    all_tasks_complete,
    quality_gates_passing,
    dependencies_satisfied_for_next_phase
  ]
]

## OUTPUT FORMAT

BUILD_PLAN_STRUCTURE::[
  EXECUTIVE_SUMMARY::transformation+task_count+TDD+timeline+North_Star,
  PHASE_TABLES::ID+Description+TDD_Sequence+Files+Deps+Complexity,
  DEPENDENCY_GRAPH::ASCII_visualization,
  CRITICAL_PATH::explicit_task_chain_with_count,
  PARALLEL_OPPORTUNITIES::task_pairs_that_can_run_concurrently,
  RISK_MITIGATION::risk_matrix_with_validation_tasks,
  QUALITY_GATES::per_task_and_per_phase_criteria
]
