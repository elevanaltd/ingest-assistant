---
name: task-decomposition
description: Task decomposition with integrated validation via Codex clink. Guides task-decomposer through BUILD-PLAN creation, mandatory validation gate, and fix loop. Use when creating build plans, decomposing blueprints into tasks, or validating task granularity. Triggers on build plan, task decomposition, B1 phase, decompose blueprint, atomic tasks.
allowed-tools: Read, mcp__hestai__clink
---

# Task Decomposition Skill

DECOMPOSITION_MASTERY::[GRANULARITY_CALIBRATION+TDD_EMBEDDING+DEPENDENCY_MAPPING+VALIDATION_GATE]->PRODUCTION_READY_BUILD_PLAN

## MANDATORY PROTOCOL ACTIVATION

BEFORE_ANY_DECOMPOSITION::[
  STEP_1::Read("~/.claude/skills/task-decomposition/decomposition-principles.md")->MANDATORY[load_granularity_framework],
  STEP_2::Read("~/.claude/skills/task-decomposition/validation-protocol.md")->MANDATORY[load_validation_gate],
  STEP_3::Read("~/.claude/skills/task-decomposition/anti-patterns.md")->MANDATORY[load_error_prevention],
  EVIDENCE::TodoWrite_must_show::"Protocol loaded: Decomposition + Validation + Anti-patterns"
]

## VALIDATION GATE (MANDATORY)

BEFORE_COMPLETING_BUILD_PLAN::[
  INVOKE::mcp__hestai__clink(
    cli_name: "codex",
    role: "task-decomposer-validator",
    prompt: "Validate BUILD-PLAN against DOD: critical_path_accuracy, file_path_specificity, TDD_compliance, dependency_graph_consistency. Return GO/NO-GO with specific issues.",
    files: ["{BUILD_PLAN_PATH}"]
  ),

  PROCESS_RESPONSE::[
    IF[GO]->complete_and_return,
    IF[NO-GO]->fix_issues->revalidate[max_2_iterations],
    IF[still_NO-GO_after_2]->return_with_warnings
  ],

  EVIDENCE::TodoWrite_must_show::"Validation: {GO/NO-GO} via Codex task-decomposer-validator"
]

WHY_CODEX::[
  independent_review::different_model_catches_blind_spots,
  strict_DOD_enforcement::Codex_found_critical_path_error_Claude_missed,
  fast::~65_seconds_vs_~3_minutes
]

## TODOWRITE ENFORCEMENT

REQUIRED_TODO_STRUCTURE::[
  {content:"Load task-decomposition protocols", status:"completed", activeForm:"Loading protocols"},
  {content:"Read D3-BLUEPRINT for decomposition", status:"pending", activeForm:"Reading blueprint"},
  {content:"Create BUILD-PLAN with 15-25 tasks", status:"pending", activeForm:"Creating build plan"},
  {content:"Self-check: critical path matches graph", status:"pending", activeForm:"Validating critical path"},
  {content:"Self-check: all file paths explicit", status:"pending", activeForm:"Validating file paths"},
  {content:"VALIDATION GATE: Invoke Codex validator", status:"pending", activeForm:"Running validation gate"},
  {content:"Fix validation issues (if any)", status:"pending", activeForm:"Fixing validation issues"},
  {content:"Write validated BUILD-PLAN.md", status:"pending", activeForm:"Writing build plan"}
]

TODO_PROGRESSION_RULE::BLUEPRINT[read]->DECOMPOSE[create]->SELF_CHECK[validate]->GATE[codex]->FIX[if_needed]->WRITE[complete]

VIOLATION_DETECTION::[
  NO_VALIDATION_GATE::BLOCK->"Must invoke Codex validator before completing",
  SKIP_SELF_CHECK::WARN->"Self-check catches 80% of issues before validation",
  IGNORE_NO-GO::BLOCK->"Cannot complete with NO-GO verdict without fixing"
]

## CORE DECOMPOSITION PRINCIPLES

### GRANULARITY_CALIBRATION

TARGET_RANGE::15-25_tasks[optimal_atomic_granularity]

CALIBRATION_RULES::[
  TOO_FEW::<15_tasks->likely_oversized_tasks->split_further,
  OPTIMAL::15-25_tasks->atomic_verifiable_deliverables,
  TOO_MANY::>30_tasks->likely_over_decomposed->merge_related
]

TASK_SIZE_HEURISTIC::[
  SMALL::2-4_hours[S_complexity],
  MEDIUM::4-8_hours[M_complexity],
  LARGE::8-16_hours[L_complexity]->consider_splitting
]

### TDD_TASK_STRUCTURE

CORRECT_PATTERN::[
  "| P1.1 | Feature X | TEST: X tests fail -> FEAT: implement X | files | deps | M |",
  EMBEDDED::TEST->FEAT_within_single_task,
  NOT_SEPARATE::"P1.1 TEST for X" then "P1.2 FEAT for X"
]

WRONG_PATTERN::[
  "| P1.1 | Create feature X | FEAT: implement X | files | deps | M |",
  "| P1.2 | Test feature X | TEST: add tests | files | P1.1 | S |",
  ANTI_PATTERN::FEAT_before_TEST_or_separate_tasks
]

### DEPENDENCY_MAPPING

CRITICAL_PATH_VALIDATION::[
  RULE::"For each task T in critical path: ALL deps(T) must appear BEFORE T",
  CHECK::count_tasks_in_path_matches_traced_dependencies,
  COMMON_ERROR::omitting_prerequisite_tasks_from_path
]

FILE_PATH_SPECIFICITY::[
  REQUIRED::full_explicit_paths_from_repo_root,
  PROHIBITED::["...sql", "**/*", "etc.", "...", generic_placeholders],
  EXAMPLE_GOOD::"/supabase/migrations/20251127000000_component_level_comments.sql",
  EXAMPLE_BAD::"supabase/migrations/...sql"
]

## DETAILED GUIDANCE

DECOMPOSITION_WORKFLOW::"See decomposition-principles.md for complete framework"
VALIDATION_PROTOCOL::"See validation-protocol.md for clink invocation and fix loop"
ERROR_PREVENTION::"See anti-patterns.md for common mistakes and detection"

## INTEGRATION

CONSULTED_BY::[holistic-orchestrator[B1_phase], implementation-lead[task_clarity], critical-engineer[validation]]
PROVIDES::[BUILD-PLAN.md, dependency_graph, critical_path, task_specifications]
VALIDATES_VIA::[task-decomposer-validator[Codex_clink]]

## WISDOM_SYNTHESIS

CORE_TRUTH::"Validation_before_completion -> Independent_review_catches_blind_spots -> Codex_strict_DOD_enforcement"

QUALITY_HIERARCHY::[
  BEST::validated_plan[Codex_GO],
  ACCEPTABLE::self_validated_plan[no_external_review],
  REJECTED::unvalidated_plan[skip_gate]
]

REMEMBER::"A build plan without validation is a plan for rework"
