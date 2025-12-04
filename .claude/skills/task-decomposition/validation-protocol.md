# Validation Protocol

VALIDATION_GATE::MANDATORY_before_completing_BUILD-PLAN

## INVOCATION PATTERN

CLINK_CALL::[
  ```
  mcp__hestai__clink(
    cli_name: "codex",
    role: "task-decomposer-validator",
    prompt: `
      GOAL::Validate BUILD-PLAN.md against DOD_B1_02

      DOD_CRITERIA::[
        task_count::15-25_range,
        TDD_sequence::TEST->FEAT_embedded_in_each_task,
        file_paths::explicit_no_placeholders,
        critical_path::matches_dependency_graph,
        all_dependencies::included_in_path
      ]

      DELIVERABLE::[
        VERDICT::GO_or_NO-GO,
        IF[NO-GO]::list_specific_issues_with_task_IDs,
        IF[GO]::confirmation_all_DOD_met
      ]
    `,
    files: ["/path/to/BUILD-PLAN.md"]
  )
  ```
]

## RESPONSE PROCESSING

GO_VERDICT::[
  ACTION::complete_BUILD-PLAN,
  EVIDENCE::TodoWrite_mark_validation_complete,
  OUTPUT::return_validated_plan
]

NO-GO_VERDICT::[
  ACTION::parse_specific_issues,
  FIX::address_each_issue_by_task_ID,
  REVALIDATE::invoke_codex_again[max_2_iterations],
  IF[still_NO-GO]::return_with_warnings_attached
]

## FIX LOOP

```octave
ITERATION_1::[
  receive_NO-GO->parse_issues,
  fix_critical_path_if_flagged,
  fix_file_paths_if_flagged,
  fix_TDD_sequence_if_flagged,
  invoke_codex_revalidation
]

ITERATION_2::[
  IF[still_NO-GO]->document_remaining_issues,
  return_BUILD-PLAN_with_warnings::"VALIDATION: 2 issues remain - see attached",
  escalate_to_holistic-orchestrator_if_blocking
]

MAX_ITERATIONS::2[prevent_infinite_loop]
```

## WHY CODEX (NOT GEMINI)

COMPARATIVE_ANALYSIS::[
  CODEX::[
    verdict::strict_NO-GO_when_issues_exist,
    caught::critical_path_inconsistency,
    speed::~65_seconds,
    quality::7/10[catches_DOD_violations]
  ],
  GEMINI::[
    verdict::permissive_GO_despite_issues,
    missed::critical_path_error+file_path_placeholders,
    speed::~45_seconds,
    quality::4/10[too_lenient_for_validation]
  ]
]

RECOMMENDATION::use_Codex_for_validation[strict_DOD_enforcement]

## VALIDATION CHECKLIST

SELF_CHECK_BEFORE_CLINK::[
  [ ] Critical path task count matches dependency trace
  [ ] No "...sql" or "**/*" placeholders in file paths
  [ ] Every task has TEST->FEAT sequence (not separate tasks)
  [ ] Task count in 15-25 range
  [ ] All dependencies appear before dependent tasks in critical path
]

POST_VALIDATION_EVIDENCE::[
  TodoWrite::"Validation: GO via Codex task-decomposer-validator",
  OR::"Validation: NO-GO fixed in iteration 1, now GO",
  OR::"Validation: 2 issues remain after 2 iterations - escalating"
]

## INTEGRATION WITH TODOWRITE

VALIDATION_TODO_PATTERN::[
  {content:"VALIDATION GATE: Invoke Codex validator", status:"in_progress", activeForm:"Running validation gate"},
  // After receiving response:
  {content:"VALIDATION GATE: Invoke Codex validator", status:"completed", activeForm:"Running validation gate"},
  {content:"Fix validation issues: [issue_list]", status:"in_progress", activeForm:"Fixing validation issues"},
  // Or if GO:
  {content:"Write validated BUILD-PLAN.md", status:"in_progress", activeForm:"Writing build plan"}
]
