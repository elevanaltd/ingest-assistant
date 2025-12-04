# BUILD.oct - Execution Discipline Engine

## EXECUTION_PROTOCOL
```octave
PURPOSE::ENFORCE_BUILD_DISCIPLINE_ON_WSC_WORKFLOW
AUTHORITY::workflow-scope-calibrator→PROVIDES_PHASE_WORKFLOW
DISCIPLINE::TRACED_ENFORCEMENT+TDD_DISCIPLINE+QUALITY_GATES
```

## ROLE_AWARE_ROUTING
```octave
DETECT_CURRENT_ROLE→active_agent_identity,
ORCHESTRATOR_ROLES::[holistic-orchestrator, coherence-oracle, eav-coherence-oracle],
IMPLEMENTATION_ROLES::[implementation-lead, error-resolver, completion-architect],
ARCHITECT_ROLES::[technical-architect, design-architect, workspace-architect],

MANDATORY_ROLE_CHECK::[
  CHECK_ACTIVE_ROLE::"ls /tmp/active_role_* 2>/dev/null | head -1",
  IF_NO_ROLE::"Assume human user - full permissions",
  IF_ROLE_EXISTS::"Extract role and enforce boundaries",
  ENFORCEMENT::"Hook enforce-role-boundaries.sh blocks violations"
],

IF_ORCHESTRATOR→ORCHESTRATE_PATTERN::[
  DETECT_PHASE→workflow_north_star,
  IDENTIFY_SPECIALISTS→phase_appropriate,
  INVOKE::Task(specialist, context),
  MONITOR→cross_boundary_coherence,
  ENFORCE→constitutional_gates,
  VIOLATION_IF::[
    "Direct code implementation (Write/Edit .ts/.js files)",
    "Fixing bugs directly instead of delegating",
    "Writing tests instead of invoking test specialists"
  ],
  CORRECT_PATTERN::"Task(implementation-lead, 'implement X')"
],

IF_IMPLEMENTATION→EXECUTE_PATTERN::[
  current_UNIVERSAL_FLOW→maintain_as_is,
  ALLOWED::[
    "Direct implementation of features",
    "Bug fixes and error resolution",
    "Test implementation",
    "Refactoring code"
  ]
],

IF_ARCHITECT→DESIGN_PATTERN::[
  DESIGN→validate→delegate_to_implementation,
  ALLOWED::[
    "Architecture documents (.md)",
    "Type definitions (.d.ts)",
    "Configuration files",
    "Design patterns"
  ],
  VIOLATION_IF::"Direct implementation of designed systems"
]
```

## PHASE_EXECUTION_SEQUENCE
```octave
UNIVERSAL_FLOW::[
  1::AUTO_INJECT_CONTEXT→RULES.md+DOD.md+AGENT_CONTRACTS.md→ALL_TASK_LAUNCHES,
  2::READ_CONTEXT→PROJECT_CONTEXT.md+NORTH_STAR.md→MANDATORY,
  3::PACK_CODEBASE→mcp__repomix__pack_codebase→FULL_CONTEXT_AWARENESS,
  4::DETECT_PHASE→artifact_patterns,
  5::Task(workflow-scope-calibrator, phase={DETECTED})→GET_WORKFLOW_VERBATIM+AUTO_CONTEXT,
  6::EXECUTE_WSC_WORKFLOW→with_time_constraints+project_awareness+AUTO_CONTEXT,
  7::ENFORCE_BUILD_DISCIPLINE→see_TRACED_below,
  8::CHECK_PHASE_GATE→from_WSC_output,
  9::SESSION_END_VALIDATION→compare_against_NORTH_STAR+BUILD_PLAN,
  10::IF_PASS→DETECT_NEXT_PHASE→REPEAT_FROM_4
]

ENHANCED_VALIDATION::[
    AFTER_WSC_RESPONSE::[
      "VALIDATE: phase_returned == phase_detected",
      "VALIDATE: workflow_complete == true",
      "IF_INVALID→AUTO_FALLBACK→READ_WORKFLOW_NORTH_STAR",
      "LOG: validation_outcome for audit"
    ],
    ANTI_VIBE_CODING_GATES::[
      "SCOPE_DRIFT_CHECK: current_features ⊆ NORTH_STAR_requirements",
      "COMPLETION_DISCIPLINE: no_new_features_until_current_complete",
      "PATTERN_JUSTIFICATION: architectural_choices_have_business_context",
      "REFACTORING_CYCLES: continuous_code_quality_improvement"
    ]
  ]

CONTEXT_REQUIREMENTS::[
  MANDATORY::"0*-*NORTH-STAR.md (ALWAYS required - immutable requirements)",
  CANONICAL_LOCATION::".coord/workflow-docs/000-{PROJECT}-D1-NORTH-STAR.md",
  REPOMIX_INTEGRATION::[
    STEP_1::"mcp__repomix__pack_codebase(directory=current_project)",
    STEP_2::"Store outputId for incremental analysis",
    STEP_3::"Use mcp__repomix__grep_repomix_output for targeted searches",
    BENEFIT::"Complete codebase awareness prevents emergent complexity"
  ],
  LOCATION_PATTERNS::[
    PRIMARY::".coord/ (symlinked coordination directory)",
    FALLBACK::"../coordination/ (if no symlink)",
    SUBDIRECTORIES::"workflow-docs/, docs/, reports/",
    SEARCH_ORDER::".coord/workflow-docs/→.coord/docs/→../coordination/workflow-docs/→../coordination/docs/→current_directory"
  ],
  CONTEXTUAL::[
    PRIMARY::"PROJECT_CONTEXT.md (if exists)",
    FALLBACK::"Latest D-phase artifact (D3→D2→D1)",
    LAST_RESORT::"Request context from user"
  ],
  READ_SEQUENCE::[
    "1. AUTO_INJECT: Read('~/.claude/instructions/RULES.md+DOD.md+AGENT-CONTRACTS.md')",
    "2. mcp__repomix__pack_codebase for full awareness",
    "3. Read('.coord/workflow-docs/000-{PROJECT}-D1-NORTH-STAR.md') - CANONICAL ONLY",
    "4. Read('.coord/PROJECT_CONTEXT.md') || Read('.coord/CONTEXT.md')",
    "5. All provide complete mission awareness with governance context"
  ],
  NORTH_STAR_PATTERN::"000-{PROJECT}-D1-NORTH-STAR.md",
  PROJECT_CONTEXT_PATTERN::"PROJECT_CONTEXT.md | CONTEXT.md",
  BENEFIT::"Requirements + Context + Codebase = Complete execution awareness"
]

PHASE_DETECTION::{
  NO_ARTIFACTS→B0,
  NORTH_STAR+NO_VAD→B0,
  VAD+NO_BUILD_PLAN→B1,
  BUILD_PLAN+NO_CODE→B2,
  CODE+NO_INTEGRATION→B3,
  INTEGRATION+NO_HANDOFF→B4
}

MIGRATION_GATE::[
  TRIGGER::AFTER_B1_workspace-architect,
  STOP::"Project graduated to /Volumes/HestAI-Projects/{PROJECT}/",
  REQUIRED::"cd /Volumes/HestAI-Projects/{PROJECT}/build/",
  VERIFY::"pwd matches new location",
  BLOCK::"Cannot proceed until migration confirmed",
  RESUME::"Task(workflow-scope-calibrator, phase='B2')"
]
```

## TRACED_ENFORCEMENT
```octave
T::TEST_FIRST::[
  MANDATORY::"Write failing test BEFORE any code",
  EVIDENCE::"TodoWrite: 'RED phase complete'",
  VIOLATION→IMMEDIATE_STOP
]

R::REVIEW_ALL_CODE::[
  MANDATORY::"Task(code-review-specialist) after EACH change",
  EVIDENCE::"Review completion in TodoWrite",
  VIOLATION→BLOCKING_ERROR
]

A::ARCHITECTURE_VALIDATION::[
  TRIGGER::"Technical uncertainty or design decisions",
  EXECUTE::"mcp__hestai__critical-engineer",
  VIOLATION→ESCALATE
]

C::CONSULT_SPECIALISTS::[
  AUTOMATIC::"Per WSC workflow requirements + AUTO_CONTEXT_INJECTION",
  MANUAL::"When expertise needed + AUTO_CONTEXT_INJECTION",
  CONTEXT_PACK::"RULES.md+DOD.md+AGENT_CONTRACTS.md+current_task_context",
  TRACK::"Via TodoWrite"
]

E::EXECUTE_QUALITY_GATES::[
  MANDATORY_TRIO::[
    "npm run lint"→FORMATTING_CHECK[all_files_including_tests],
    "npm run typecheck"→TYPE_SAFETY_ALL_FILES[src_and_test_directories],
    "npm run test"→FUNCTIONAL_VERIFICATION[all_test_suites]
  ]
  SESSION_END::"lint+typecheck+tests ALL THREE REQUIRED",
  ALL_PASS_OR_FIX::"No proceeding with failures",
  CI_ENFORCEMENT::"Automated from B1 setup",
  NEVER_CLAIM_COMPLETE_WITH_ONLY::[
    "npm run build"→PARTIAL_CHECK_ONLY[misses_test_files],
    "tests pass"→MISSING_TYPE_AND_LINT[incomplete_validation],
    "compiles"→INSUFFICIENT_VALIDATION[not_CI_ready]
  ]
  EVIDENCE_REQUIRED::[
    SHOW_ACTUAL_OUTPUT::"Copy paste command results",
    NOT_JUST_CLAIMS::"Must show all three passing",
    REFERENCE::"docs/410-DOC-CI-VALIDATION-CHECKLIST.md"
  ]
]

D::DOCUMENT_PROGRESS::[
  THROUGHOUT::"TodoWrite for all tasks",
  ATOMIC_COMMITS::"Per task completion",
  EVIDENCE::"Audit trail required"
]
```

## TDD_DISCIPLINE
```octave
RED_PHASE::[
  WRITE_TEST→EXPECT_BEHAVIOR,
  RUN_TEST→VERIFY_FAILURE,
  TodoWrite::"RED: {component} test failing ✓"
]

GREEN_PHASE::[
  WRITE_CODE→MINIMAL_TO_PASS,
  RUN_TEST→VERIFY_SUCCESS,
  TodoWrite::"GREEN: {component} passing ✓"
]

REFACTOR_PHASE::[
  IMPROVE→MAINTAIN_GREEN,
  REVIEW→code-review-specialist,
  TodoWrite::"REFACTOR: {component} complete ✓"
]

SKIP_TDD_ONLY::[
  EXISTING_CODE_WITH_TESTS,
  PURE_CSS_CHANGES,
  CONFIG_UPDATES,
  DOCUMENTATION
]
```

## VIOLATION_RECOVERY
```octave
IMMEDIATE_STOP::[
  CODE_WITHOUT_TEST::"Create test first",
  TEST_WITHOUT_RED::"Verify failure first",
  REVIEW_SKIPPED::"Get review now"
]

PROTOCOL_RESET::[
  ACKNOWLEDGE::"I violated {protocol}",
  REREAD::"Review TRACED requirements",
  CORRECT::"Fix violation before continuing",
  RESUME::"With strict adherence"
]

ESCALATION::[
  REPEATED_VIOLATIONS→HUMAN,
  UNCLEAR_REQUIREMENTS→requirements-steward,
  TECHNICAL_BLOCKS→critical-engineer
]
```

## COMMAND_INTERFACE
```octave
USAGE::[
  "/build {context}"→AUTO_DETECT_AND_EXECUTE,
  "/build --phase=B2 {context}"→FORCE_SPECIFIC_PHASE,
  "/build --status"→CURRENT_PHASE_STATUS
]

WSC_FALLBACK::[
  IF_WSC_UNAVAILABLE::"Read /Volumes/HestAI/docs/workflow/001-WORKFLOW-NORTH-STAR.md directly",
  EXTRACT::"Phase workflow verbatim",
  APPLY::"Default time constraints (30-60min)"
]
```

## MISSION
```octave
ORCHESTRATORS::ORCHESTRATE_WORKFLOW_EXECUTION,
IMPLEMENTERS::EXECUTE_WSC_PROVIDED_WORKFLOW,
ALL::ENFORCE_BUILD_DISCIPLINE+TRACK_PROGRESS+VALIDATE_GATES
```

## VIBE_CODING_MITIGATION
```octave
ICARUS_PATTERN::EMERGENT_COMPLEXITY_PREVENTION::[
  ARCHITECTURE_FIRST::D1→D3_phases_mandatory_before_code,
  PATTERN_JUSTIFICATION::"Why this pattern for this context?",
  BUSINESS_VALUE_VALIDATION::"What user problem does this solve?"
]

HYDRA_COORDINATION::MULTI_AGENT_ALIGNMENT::[
  CANONICAL_NORTH_STAR::single_source_of_truth_location,
  CONTEXT_PACK::mcp__repomix__pack_codebase→full_awareness,
  SPECIALIST_CONSULTATION::RACI_framework_prevents_isolation
]

SISYPHUS_DEBT::COMPLETION_DISCIPLINE::[
  FEATURE_COMPLETION_GATE::no_new_features_until_current_complete,
  TODO_DEBT_LIMIT::zero_TODO_markers_in_completed_features,
  REFACTORING_CYCLES::continuous_quality_improvement_mandatory
]

ACHILLES_VULNERABILITIES::SECURITY_PERFORMANCE_FIRST_CLASS::[
  SECURITY_SPECIALIST::D3_B3_B4_mandatory_involvement,
  PERFORMANCE_BENCHMARKS::validated_against_scale_requirements,
  VULNERABILITY_SCANNING::automated_security_gates_in_CI
]
```

## AUTO_CONTEXT_INJECTION
```octave
INJECTION_PROTOCOL::[
  TRIGGER::"EVERY Task() call within BUILD workflow",
  CORE_CONTEXT::"~/.claude/instructions/RULES.md+DOD.md+AGENT-CONTRACTS.md",
  TASK_CONTEXT::"Dynamic context pack based on phase+scope+current_state",
  CODEBASE_CONTEXT::"Repomix outputId for incremental codebase analysis",
  FORMAT::"Prepend to agent prompt - invisible to user",
  TOKEN_BUDGET::"~1500 tokens total injection (includes Repomix guidance)"
]

TASK_CONTEXT_GENERATION::[
  PHASE_CONTEXT::"Current workflow phase (D1|D2|D3|B0|B1|B2|B3|B4|B5)",
  SCOPE_CONTEXT::"Project scope (SIMPLE|STANDARD|COMPLEX|ENTERPRISE)",
  NORTH_STAR_EXCERPT::"Key requirements relevant to current task",
  CURRENT_STATE::"Progress, blockers, and recent decisions",
  ANTI_VIBE_GATES::"Active scope/completion/pattern checks for this task",
  REPOMIX_CONTEXT::[
    "OUTPUTID: {stored_outputId_from_step_3}",
    "GUIDANCE: Use mcp__repomix__grep_repomix_output for targeted searches",
    "BENEFIT: Complete codebase awareness prevents emergent complexity"
  ]
]

IMPLEMENTATION_PATTERN::[
  "Task(agent-name, user_prompt)",
  "↓",
  "AUTO_INJECT:",
  "CONTEXT_PACK + REPOMIX_GUIDANCE + user_prompt → agent",
  "↓",
  "Agent receives full governance + codebase context automatically"
]

CONTEXT_PACK_FORMAT::[
  "=== GOVERNANCE CONTEXT (AUTO-INJECTED) ===",
  "[RULES.oct.md content]",
  "[DOD.oct.md content]",
  "[AGENT-CONTRACTS.oct.md relevant section]",
  "[Task-specific context]",
  "=== CODEBASE CONTEXT ===",
  "Repomix Output ID: {outputId}",
  "Use: mcp__repomix__grep_repomix_output(outputId='{outputId}', pattern='your_search')",
  "For incremental analysis without re-packing the entire codebase",
  "=== USER REQUEST ===",
  "[Original user prompt]"
]

AGENT_PROMPT_ENHANCEMENT::[
  "MANDATORY_PREFIX: 'You have access to complete codebase context via Repomix.'",
  "SEARCH_GUIDANCE: 'Use mcp__repomix__grep_repomix_output for targeted code searches.'",
  "OUTPUTID_PROVISION: 'Repomix outputId: {id} for this codebase snapshot.'",
  "EFFICIENCY_NOTE: 'Avoid re-packing; use grep on existing output for searches.'"
]
```

## MCP_TOOL_INTEGRATION
CONTEXT7_LIBRARY_RESEARCH::[
  PATTERN::"mcp__Context7__resolve-library-id→mcp__Context7__get-library-docs",
  D1_USAGE::"Research for problem understanding and existing solutions",
  B0_USAGE::"Architecture validation against current library capabilities",
  B1_USAGE::"Dependency versions and integration patterns",
  B2_USAGE::"API references and implementation examples during TDD",
  B3_USAGE::"Integration best practices and compatibility validation"
]

MCP_TOOL_PATTERNS::[
  THINKING_TOOLS::[
    "mcp__hestai__planner→planning and task breakdown",
    "mcp__hestai__thinkdeep→deep investigation and analysis",
    "mcp__hestai__consensus→multi-model perspective synthesis",
    "mcp__hestai__debug→systematic error investigation",
    "mcp__hestai__analyze→comprehensive system analysis"
  ],
  VALIDATION_TOOLS::[
    "mcp__hestai__critical-engineer→technical validation",
    "mcp__hestai__testguard→test methodology enforcement",
    "mcp__hestai__secaudit→security audit analysis"
  ],
  DEEP_RESEARCH::[
    "mcp__deep-research__deep-research→autonomous market/problem research"
  ]