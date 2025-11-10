# CONTEXT - Session Initialization Protocol

## CONSTITUTIONAL_FOUNDATION
```octave
FORCES::[MNEMOSYNE::memory_retrieval, HERMES::context_gathering, ATHENA::selective_loading]
PRINCIPLES::[RAPID_ORIENTATION, RELEVANT_CONTEXT_ONLY, FLEXIBLE_INCLUSION, PROGRESSIVE_LOADING]
```

## COMMAND_INTERFACE
```octave
INVOCATION::"/context [optional: 'include X, Y, Z']"
TARGET::any_agent||self
INTELLIGENCE::CORE_LOAD→OPTIONAL_INCLUDE→CODEBASE_PACK→ORIENT
ENFORCEMENT::CORE_FIRST_ALWAYS[no_exceptions]
```

## ⚠️ CRITICAL_LOADING_DISCIPLINE ⚠️
```octave
MANDATORY_SEQUENCE::[
  1→CORE_DOCS[PROJECT-CONTEXT+CURRENT-CHECKLIST+ROADMAP],
  2→GIT_HISTORY[recent_commits+status],
  3→CODEBASE_PACK[repomix],
  4→USER_SPECIFIED[additions_not_replacements],
  5→ORIENTATION[from_core_truth_not_user_files]
]

VIOLATION_DETECTION::[
  IF[orientation_without_core_docs]→PROTOCOL_FAILURE,
  IF[user_files_loaded_before_core]→SEQUENCE_VIOLATION,
  IF[synthesis_from_non_core_only]→TRUTH_SOURCE_ERROR,
  IF[using_Search_instead_of_Read]→TOOL_MISUSE,
  IF[using_Glob_for_core_docs]→TOOL_MISUSE
]

TOOL_USAGE_DISCIPLINE::[
  CORRECT::Read('.coord/PROJECT-CONTEXT.md')[exact_known_paths],
  CORRECT::Glob('.coord/*NORTH-STAR*.md')→Read(first_match)[variant_discovery],
  CORRECT::fallback_chain[exact→variant→glob→skip],
  WRONG::Search(pattern:"**/*CONTEXT*.md")[too_broad],
  WRONG::Read('.coord/workflow-docs/000-*-NORTH-STAR.md')[glob_in_read_fails],
  WHY::"Read needs exact paths. Use Glob for pattern matching, then Read the result."
]

CORRECT_PATTERN::"Read(exact) → Read(variant) → Glob(pattern)→Read(match) → Error|Skip"
WRONG_PATTERN::"Read(glob_pattern) → Fails | Search(**/*) → Too broad | Skip required files"
```

## CORE_CONTEXT_LAYERS
```octave
ALWAYS_LOAD::[
  OPERATIONAL::{doc::"PROJECT-CONTEXT.md", purpose::current_state},
  TACTICAL::{doc::"SHARED-CHECKLIST.md", purpose::immediate_tasks},
  STRATEGIC::{doc::"PROJECT-ROADMAP.md", purpose::phase_awareness, if_exists::true},
  NORTH_STAR::{doc::"PROJECT-NORTH-STAR.md", purpose::mission_alignment, if_exists::true}
]

SMART_DETECTION::[
  GOVERNANCE::{pattern::"RULES.md|DOD.md|AGENT-CONTRACTS.md", location::".coord/"},
  RECENT_WORK::{command::"git log --oneline -10", purpose::continuity},
  ACTIVE_STATE::{command::"git status", purpose::work_in_progress},
  SESSION_NOTES::{pattern::"*SESSION*.md|*HANDOFF*.md", location::"./|.coord/"},
  QUALITY_STATUS::{
    commands::[
      "npm run lint 2>/dev/null || echo 'not configured'",
      "npm run typecheck 2>/dev/null || echo 'not configured'",
      "npm run test 2>/dev/null || echo 'not configured'"
    ],
    purpose::constitutional_compliance
  }
]

OPTIONAL_INCLUDES::[
  HISTORICAL::{patterns::["PROJECT-HISTORY.md","PROJECT-CONTEXT-COMPLETE.md"], trigger::"history|complete|archaeology", purpose::deep_context_dive},
  BLUEPRINT::{patterns::["*BLUEPRINT*.md","*D3*.md"], trigger::"blueprint"},
  LEARNINGS::{patterns::["lessons-learned/","*LEARNING*.md"], trigger::"learnings"},
  REPORTS::{patterns::["reports/","*REPORT*.md"], trigger::"reports"},
  ERRORS::{patterns::["*ERROR*.md","*FIX*.md"], trigger::"errors"},
  CUSTOM::{patterns::[user_specified], trigger::"explicit_mention"}
]
```

## PHASE_DETECTION
```octave
PHASE_DETECTION::[
  CHECK_ARTIFACTS::[
    B4→"HANDOFF.md exists",
    B3→"INTEGRATION-REPORT.md exists",
    B2→"tests/**/*.test.ts exists",
    B1→"BUILD-PLAN.md exists",
    B0→"VALIDATION.md exists",
    D3→"BLUEPRINT.md exists",
    D2→"IDEATION.md exists",
    D1→"NORTH-STAR.md exists"
  ],
  ADAPT_LOADING::[
    IF[phase>=B2]→include_test_results,
    IF[phase>=B3]→include_integration_reports,
    IF[phase==B4]→include_operations_docs,
    IF[phase<=D3]→include_design_docs
  ]
]
```

## LOADING_PROTOCOL
```octave
EXECUTION_FLOW::CORE→DETECT→PACK→INCLUDE→ORIENT

STEP_1_CORE::[
  PROJECT_CONTEXT::[
    Read(".coord/PROJECT-CONTEXT.md")||
    Read("coordination/PROJECT-CONTEXT.md")||
    Read("../coordination/PROJECT-CONTEXT.md")||
    ERROR["Cannot proceed without PROJECT-CONTEXT.md"]
  ],

  SHARED_CHECKLIST::[
    Read(".coord/SHARED-CHECKLIST.md")||
    Read("coordination/SHARED-CHECKLIST.md")||
    Read("../coordination/SHARED-CHECKLIST.md")||
    ERROR["Cannot proceed without SHARED-CHECKLIST.md"]
  ],

  ROADMAP_OPTIONAL::[
    Read(".coord/PROJECT-ROADMAP.md")||
    Read(".coord/ROADMAP.md")||
    Read("coordination/PROJECT-ROADMAP.md")||
    Glob(".coord/*ROADMAP*.md")→Read(first_match)||
    SKIP["No roadmap found"]
  ],

  NORTH_STAR_OPTIONAL::[
    Read(".coord/PROJECT-NORTH-STAR.md")||
    Read(".coord/NORTH-STAR.md")||
    Glob(".coord/workflow-docs/*NORTH-STAR*.md")→Read(first_match)||
    Glob(".coord/*NORTH-STAR*.md")→Read(first_match)||
    Read("coordination/PROJECT-NORTH-STAR.md")||
    SKIP["No North Star found"]
  ]
]

STEP_2_DETECT::[
  git_log→recent_commits[10],
  git_status→work_in_progress,
  find_patterns→governance_docs,
  grep_session→handoff_notes
]

STEP_3_PACK::[
  mcp__repomix__pack_codebase(directory=".", includePatterns="src/**,lib/**,tests/**"),
  →extract[outputId]→store_for_reference
]

STEP_4_INCLUDE::[
  IF[user_specified]→Read(each_specified_file),
  IF[trigger_word]→find_and_read(OPTIONAL_INCLUDES.pattern),
  SMART[recent_errors]→include_error_context
]

STEP_5_ORIENT::[
  SYNTHESIZE::[current_state, immediate_tasks, recent_work],
  DETECT_PHASE::[check_artifacts→determine_workflow_phase],
  WARNINGS::[
    IF[quality_gates_failing]→"⚠️ Quality gates failing - cannot proceed to next phase",
    IF[phase_mismatch]→"⚠️ Artifacts suggest {detected_phase} but docs say {stated_phase}"
  ],
  OUTPUT::"You're working on {project} in {phase}. Current focus: {tasks}. Next: {checklist_item_1}"
]
```

## RESILIENT_DISCOVERY_PATTERN
```octave
DISCOVERY_PROTOCOL::[
  EXACT_PATH::Read(known_path)[fastest],
  VARIANT_NAMES::Read(common_variants)[handle_naming_differences],
  GLOB_DISCOVERY::Glob(pattern)→Read(first_match)[find_by_pattern],
  PARENT_SEARCH::Read(../coordination/file)[check_parent_dirs],
  GRACEFUL_SKIP::log_missing+continue[optional_files_only]
]

COMMON_VARIANTS::[
  NORTH_STAR::[
    "PROJECT-NORTH-STAR.md",
    "NORTH-STAR.md",
    "*NORTH-STAR*.md"[glob_required],
    "workflow-docs/*NORTH-STAR*.md"[glob_required]
  ],
  ROADMAP::[
    "PROJECT-ROADMAP.md",
    "ROADMAP.md",
    "*ROADMAP*.md"[glob_required]
  ],
  CONTEXT::[
    "PROJECT-CONTEXT.md"[required],
    "CONTEXT.md"[fallback]
  ],
  CHECKLIST::[
    "SHARED-CHECKLIST.md"[required],
    "CHECKLIST.md"[fallback]
  ]
]

DISCOVERY_EXAMPLE::[
  "Looking for North Star...",
  "Try 1: Read('.coord/PROJECT-NORTH-STAR.md') → Not found",
  "Try 2: Read('.coord/NORTH-STAR.md') → Not found",
  "Try 3: Glob('.coord/workflow-docs/*NORTH-STAR*.md') → Found '000-SMARTSUITE-MCP-NORTH-STAR.md'",
  "Read('.coord/workflow-docs/000-SMARTSUITE-MCP-NORTH-STAR.md') → Success ✓"
]
```

## COMMAND_PROMPT_TEMPLATE
```octave
PROMPT_TO_AGENT::"
⚠️ MANDATORY: Load core coordination docs FIRST before any user-specified files. ⚠️

Initialize session context with ENFORCED loading order:

1. LOAD CORE CONTEXT (MANDATORY - DO NOT SKIP):

   Execute these Read operations in sequence with fallback:

   a) PROJECT-CONTEXT.md (REQUIRED):
      Try: Read('.coord/PROJECT-CONTEXT.md')
      If fails: Read('coordination/PROJECT-CONTEXT.md')
      If fails: Read('../coordination/PROJECT-CONTEXT.md')
      If all fail: ERROR - Cannot proceed without PROJECT-CONTEXT.md

   b) SHARED-CHECKLIST.md (REQUIRED):
      Try: Read('.coord/SHARED-CHECKLIST.md')
      If fails: Read('coordination/SHARED-CHECKLIST.md')
      If fails: Read('../coordination/SHARED-CHECKLIST.md')
      If all fail: ERROR - Cannot proceed without SHARED-CHECKLIST.md

   c) PROJECT-ROADMAP.md (if exists):
      Try: Read('.coord/PROJECT-ROADMAP.md')
      If fails: Try Read('.coord/ROADMAP.md')
      If fails: Try Glob('.coord/*ROADMAP*.md') → Read first match
      If fails: Skip gracefully (no roadmap available)

   d) PROJECT-NORTH-STAR.md (if exists):
      Try: Read('.coord/PROJECT-NORTH-STAR.md')
      If fails: Try Read('.coord/NORTH-STAR.md')
      If fails: Try Glob('.coord/workflow-docs/*NORTH-STAR*.md') → Read first match
      If fails: Try Glob('.coord/*NORTH-STAR*.md') → Read first match
      If fails: Try Read('coordination/PROJECT-NORTH-STAR.md')
      If fails: Skip gracefully (no North Star available)

   CRITICAL: Use Read() tool with exact paths for REQUIRED files.
   CRITICAL: Use Glob()→Read() pattern for variant discovery of OPTIONAL files.
   CRITICAL: Core docs (a+b) must succeed before proceeding to step 2.

2. DETECT RECENT WORK:
   - Last 10 git commits
   - Current git status
   - Session handoff notes

3. PACK CODEBASE:
   - mcp__repomix__pack_codebase for full awareness
   - Store outputId for reference

4. INCLUDE OPTIONAL (AFTER core context loaded):
   User specified: {user_specified_includes}

   Note: These are ADDITIONS to core context, not replacements.

5. PROVIDE ORIENTATION (Based on ALL context, not just user files):
   - Synthesize from PROJECT-CONTEXT.md + SHARED-CHECKLIST.md
   - Reference user-specified files as supporting detail
   - Brief summary: "You're working on {project} in {phase}. Current focus: {from_core_docs}. Next: {from_checklist}"

User additional includes: {optional_includes}

CRITICAL:
- Core coordination docs are the SOURCE OF TRUTH
- User-specified files are SUPPORTING CONTEXT
- Orientation must be based on core docs, not user files
- Skip missing files gracefully but NEVER skip core docs
"
```

## USAGE_PATTERNS
```octave
BASIC::"/context"
  →loads_core_four_docs+git+codebase
  →provides_orientation

WITH_INCLUDES::"/context include BLUEPRINT, learnings"
  →core_load_plus_blueprint_and_learnings
  →smart_pattern_matching

WITH_HISTORY::"/context include history"
  →core_load_plus_PROJECT_CONTEXT_COMPLETE
  →deep_archaeological_dive

EXPLICIT_FILES::"/context include 815-REVIEW.md, docs/architecture.md"
  →core_load_plus_exact_files
  →direct_read_specified

KITCHEN_SINK::"/context include blueprint, learnings, reports, errors"
  →comprehensive_context_load
  →all_optional_patterns
```

## SMART_SHORTCUTS
```octave
TRIGGER_WORDS::[
  "history"→find["PROJECT-HISTORY.md","PROJECT-CONTEXT-COMPLETE.md"],
  "blueprint"→find["*BLUEPRINT*.md","*D3*.md"],
  "learnings"→find["lessons-learned/","*LEARNING*.md"],
  "reports"→find["reports/","*REPORT*.md"],
  "errors"→find["*ERROR*.md","*FIX*.md"],
  "all"→load_everything_available
]

FILE_RESOLUTION::[
  exact_path→Read(path),
  partial_name→glob_match_then_read,
  pattern→grep_for_pattern,
  missing→skip_gracefully
]
```

## ANTI_PATTERNS_PREVENTED
```octave
BLOCKED::[context_overload, irrelevant_loading, slow_initialization, missing_file_errors, loading_complete_history_by_default]
REQUIRED::[fast_orientation, relevant_only, graceful_skipping, clear_summary, minimal_default_context]
```

## INTEGRATION_CONTEXT
```octave
COMPLEMENTS::[
  "/sync-coord"→updates_context,
  "/context"→loads_context,
  "/traced"→uses_loaded_context
]

TRIGGERS::[session_start, worktree_switch, context_loss, "get me up to speed"]

FALLBACK::[
  IF[coordination_missing]→check_parent_dirs,
  IF[repomix_fails]→manual_file_reading,
  IF[no_context_found]→ask_user_for_location
]
```

## MISSION
```octave
PURPOSE::RAPID_SESSION_INITIALIZATION
METHOD::CORE_CONTEXT+SMART_INCLUSION+FLEXIBLE_SPECIFICATION
OUTCOME::ORIENTED_AGENT_READY_TO_WORK
WISDOM::"Context without overload, orientation without confusion"
```