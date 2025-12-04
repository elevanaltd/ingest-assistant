# Anti-Patterns

DECOMPOSITION_ANTI_PATTERNS::errors_discovered_through_validation_comparison

## CRITICAL PATH ANTI-PATTERNS

ANTI_PATTERN_1::INCOMPLETE_CRITICAL_PATH[severity::HIGH]
```octave
SYMPTOM::critical_path_omits_prerequisite_tasks
EXAMPLE::[
  GRAPH_SHOWS::"P1.1->P1.2->P1.4 AND P1.1->P1.3->P1.4",
  PATH_STATED::"P1.1->P1.4->P2.2...",
  ERROR::P1.2_and_P1.3_omitted_but_required_for_P1.4
]
DETECTION::count_tasks_in_path < traced_dependency_chain
FIX::trace_each_task's_dependencies->include_ALL_in_path
SOURCE::Codex_found_this_in_validation_session
```

ANTI_PATTERN_2::COUNT_MISMATCH[severity::MEDIUM]
```octave
SYMPTOM::stated_count_differs_from_listed_path
EXAMPLE::[
  PATH_STATED::"P1.1->P1.2->P1.4->P2.1->P2.2->P2.3->P3.4->P3.5->P4.1->P4.4 (9 tasks)",
  ACTUAL_COUNT::10_tasks_in_listed_path
]
DETECTION::count_items_in_path_string
FIX::recount_and_update_totals_table
```

ANTI_PATTERN_3::CROSS_PHASE_DEPENDENCY_SKIP[severity::HIGH]
```octave
SYMPTOM::phase_N_task_depends_on_phase_N-1_but_path_skips_it
EXAMPLE::[
  P2.2_depends_on_P1.4_AND_P2.1,
  PATH_SHOWS::"...->P1.4->P2.2"_but_misses_P2.1
]
DETECTION::check_each_task's_Deps_column_against_path
FIX::include_ALL_deps_even_if_same_phase
```

## TDD SEQUENCE ANTI-PATTERNS

ANTI_PATTERN_4::FEAT_BEFORE_TEST[severity::CRITICAL]
```octave
SYMPTOM::task_shows_implementation_before_test
EXAMPLE::[
  WRONG::"FEAT: implement X -> TEST: verify X",
  WRONG::"Create component -> Add tests"
]
DETECTION::grep_for_FEAT_appearing_before_TEST_in_TDD_column
FIX::reverse_order_to_TEST->FEAT
SOURCE::Original_Claude_v1_BUILD-PLAN_had_this_error
```

ANTI_PATTERN_5::SEPARATE_TEST_TASKS[severity::CRITICAL]
```octave
SYMPTOM::TEST_and_FEAT_split_into_different_tasks
EXAMPLE::[
  "P1.1 | Create migration | FEAT: apply migration |...",
  "P1.2 | Test migration | TEST: verify schema |..."
]
DETECTION::grep_for_tasks_containing_only_TEST_or_only_FEAT
FIX::merge_into_single_task_with_embedded_TEST->FEAT
SOURCE::task-decomposer_enhancement_session_discovery
```

ANTI_PATTERN_6::MISSING_TDD_SEQUENCE[severity::HIGH]
```octave
SYMPTOM::task_has_no_TEST_or_FEAT_in_TDD_column
EXAMPLE::[
  "P3.6 | Remove legacy code | delete files | apps/**/* |..."
]
DETECTION::grep_for_tasks_missing_TEST_or_FEAT_keywords
FIX::add_verification_step::"TEST: grep verification fails on old refs -> FEAT: delete files"
```

## FILE PATH ANTI-PATTERNS

ANTI_PATTERN_7::PLACEHOLDER_PATHS[severity::MEDIUM]
```octave
SYMPTOM::file_paths_contain_ellipsis_or_placeholders
EXAMPLE::[
  "supabase/migrations/...sql",
  "packages/shared/src/.../comments.ts",
  "apps/**/tests/**/*.test.ts"
]
DETECTION::grep_for_[..., **, etc., multiple]_in_Files_column
FIX::replace_with_explicit_full_paths
SOURCE::Codex_flagged_this_in_validation
```

ANTI_PATTERN_8::WILDCARD_DELETIONS[severity::MEDIUM]
```octave
SYMPTOM::deletion_task_uses_glob_instead_of_file_list
EXAMPLE::[
  "Files: apps/copy-editor/src/**/*"
]
DETECTION::grep_for_**_in_deletion_task_Files
FIX::enumerate_specific_files::[TextHighlight.tsx, commentPositions.ts, useHighlightedText.ts]
```

## GRANULARITY ANTI-PATTERNS

ANTI_PATTERN_9::OVER_DECOMPOSITION[severity::LOW]
```octave
SYMPTOM::>30_tasks_for_medium_complexity_feature
DETECTION::count_total_tasks
FIX::merge_related_tasks_targeting_15-25_range
```

ANTI_PATTERN_10::UNDER_DECOMPOSITION[severity::MEDIUM]
```octave
SYMPTOM::<10_tasks_for_multi_phase_feature
DETECTION::count_total_tasks
FIX::split_large_tasks_into_atomic_units
```

## DOCUMENTATION ANTI-PATTERNS

ANTI_PATTERN_11::MISSING_YAGNI_NOTES[severity::LOW]
```octave
SYMPTOM::risk_mitigation_task_unclear_about_YAGNI_decision
EXAMPLE::[
  "P4.1 | Split/merge tests | TEST: tests fail -> FEAT: verify behavior |..."
  # Unclear: should tests DRIVE new features or VALIDATE existing behavior?
]
DETECTION::review_risk_tasks_for_ambiguity
FIX::add_clarification::"(YAGNI: tests validate behavior, don't drive new features)"
SOURCE::Claude_validator_found_this_ambiguity
```

## DETECTION AUTOMATION

SELF_CHECK_BEFORE_VALIDATION::[
  ```bash
  # Critical path count
  echo "Critical path tasks:" && grep -o "P[0-9]\.[0-9]" <<< "$CRITICAL_PATH" | wc -l

  # Placeholder detection
  grep -E "\.\.\.|/\*\*/|etc\." BUILD-PLAN.md

  # TDD sequence check
  grep -E "FEAT.*TEST|^[^T]*FEAT" BUILD-PLAN.md  # FEAT before TEST
  ```
]

## VALIDATION COMPARISON LEARNINGS

SESSION_DISCOVERY::[
  CLAUDE_MISSED::critical_path_P1.2/P1.3_omission,
  CODEX_CAUGHT::critical_path_inconsistency+file_placeholders,
  GEMINI_MISSED::everything_Codex_caught,

  LESSON_1::self_review_has_blind_spots->use_independent_validator,
  LESSON_2::Codex_strict_DOD->better_for_validation,
  LESSON_3::Gemini_permissive->not_recommended_for_validation
]
