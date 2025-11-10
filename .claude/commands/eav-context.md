# EAV-CONTEXT - Multi-App Coordination Context Loader

## CONSTITUTIONAL_FOUNDATION
```octave
FORCES::[MNEMOSYNE::memory_retrieval, HERMES::context_gathering, ATHENA::selective_loading, APOLLO::cross_app_awareness]
PRINCIPLES::[TWO_TIER_LOADING, SUITE_BEFORE_APP, RAPID_ORIENTATION, APP_SWITCHING_OPTIMIZED, OBSERVABLE_PROGRESS]
```

## COMMAND_INTERFACE
```octave
INVOCATION::"/eav-context [optional: 'include schema, navigation, ...']"
TARGET::eav_apps_multi_app_structure
STRUCTURE::SUITE_LEVEL+APP_LEVEL+SHARED_TECHNICAL+GIT+CODEBASE
ENFORCEMENT::TODOWRITE_FIRST+SUITE_FIRST_ALWAYS[no_app_only_orientation]
```

## ⚠️ TODOWRITE ENFORCEMENT PROTOCOL ⚠️
```octave
MANDATORY_FIRST_ACTION::CREATE_OBSERVABLE_CHECKLIST_BEFORE_ANY_LOADING

STEP_0_CHECKLIST::[
  BEFORE_LOADING::TodoWrite([
    {content: "TIER 1: Load suite-level coordination docs (ARCHITECTURE, PROJECT-CONTEXT, PROJECT-CHECKLIST, ROADMAP, CHARTER)", status: "pending", activeForm: "Loading suite coordination"},
    {content: "TIER 2: Load app-specific coordination docs (APP-CONTEXT, APP-ROADMAP, APP-CHECKLIST)", status: "pending", activeForm: "Loading app coordination"},
    {content: "TIER 3: Load shared technical docs (schema, navigation, deployment, lessons - if requested)", status: "pending", activeForm: "Loading technical docs"},
    {content: "TIER 4: Load git history and status (recent commits, working tree)", status: "pending", activeForm: "Loading git context"},
    {content: "TIER 5: Pack codebase with Repomix (MANDATORY - code structure awareness)", status: "pending", activeForm: "Packing codebase structure"},
    {content: "TIER 6: Synthesize and present orientation (suite + app context)", status: "pending", activeForm: "Synthesizing orientation"}
  ])
]

EXECUTION_DISCIPLINE::[
  MARK_IN_PROGRESS::before_starting_each_tier,
  MARK_COMPLETED::immediately_after_tier_finishes[not_batch_completion],
  NO_SKIPPING::cannot_mark_tier_6_complete_unless_tiers_1-5_complete,
  VISIBLE_PROGRESS::user_sees_sequential_completion_in_UI,
  ONE_AT_A_TIME::only_one_tier_in_progress_at_any_moment
]

ANTI_PATTERN_PREVENTION::[
  BLOCKED::marking_all_complete_at_once[batch_completion_is_ceremonial],
  BLOCKED::proceeding_to_orientation_with_pending_tiers[incomplete_context],
  BLOCKED::skipping_tier_5_silently[missing_codebase_awareness],
  BLOCKED::marking_tier_complete_before_actually_completing[validation_theater]
]

WHY_THIS_WORKS::[
  COGNITIVE_FORCING::"Cannot hide skips - each step visible in UI",
  SEQUENTIAL_DISCIPLINE::"in_progress→completed prevents batch shortcuts",
  USER_VISIBILITY::"You can see if tier 5 is skipped in real-time",
  ACCOUNTABILITY::"TodoWrite creates evidence trail of what was actually done"
]
```

## ⚠️ CRITICAL_TWO_TIER_DISCIPLINE ⚠️
```octave
MANDATORY_SEQUENCE::[
  0→TODOWRITE[create_observable_checklist],
  1→SUITE_MASTER[coordination root docs],
  2→APP_SPECIFIC[.coord app docs],
  3→SHARED_TECHNICAL[coordination/docs on demand],
  4→GIT_HISTORY[this app only],
  5→CODEBASE_PACK[this app code - MANDATORY],
  6→ORIENTATION[suite context + app focus]
]

VIOLATION_DETECTION::[
  IF[no_todowrite_created]→ENFORCEMENT_PROTOCOL_FAILURE,
  IF[orientation_without_repomix_outputId]→MISSING_CODEBASE_AWARENESS,
  IF[orientation_from_app_only]→MISSING_SUITE_CONTEXT,
  IF[app_context_before_suite]→SEQUENCE_VIOLATION,
  IF[missing_PROJECT_CONTEXT.md]→INCOMPLETE_SUITE_LOAD,
  IF[using_Search_instead_of_Read]→TOOL_MISUSE,
  IF[skipping_tier_5_repomix]→PROTOCOL_VIOLATION,
  IF[batch_completing_todos]→CEREMONIAL_COMPLIANCE[not_genuine]
]

TOOL_USAGE_DISCIPLINE::[
  CORRECT::Read(".coord-project/PROJECT-CONTEXT.md")[dual_symlink_preferred],
  CORRECT::Read(".coord/APP-CONTEXT.md")[standard_app_path],
  CORRECT::Read(".coord-project/{DOC}")||Read("../../.coord/{DOC}")||Read("../.coord/{DOC}")[fallback_chain],
  CORRECT::mcp__repomix__pack_codebase(directory:".")→extract[outputId][mandatory_codebase_pack],

  WRONG::Glob("**/ARCHITECTURE*.md")[too_broad],
  WRONG::Read("coordination/ARCHITECTURE.md")[wrong_relative_path_from_app_dir],
  WRONG::skipping_repomix_silently[no_codebase_awareness],
  WRONG::proceeding_without_outputId_stored[incomplete_tier_5],

  WHY::"Dual-symlink pattern (.coord-project/ + .coord/) provides explicit tier separation. Read needs exact paths for docs. Repomix provides structural awareness. Both mandatory for complete context."
]
```

## CONTEXT_LAYERS

### **TIER 1: SUITE MASTER (ALWAYS LOAD)**
```octave
SUITE_LEVEL::[
  ARCHITECTURE::{
    doc::".coord-project/ARCHITECTURE.md",
    fallback::".coord-project/docs/002-DOC-ADR-001-UNIVERSAL-COORDINATION-STRUCTURE.oct.md",
    fallback2::".coord-project/docs/003-DOC-ADR-002-HYBRID-ARCHITECTURE-SHARED-LIB.oct.md",
    fallback3::".coord-project/docs/004-DOC-ADR-003-SCHEMA-MIGRATION-PROTOCOL.oct.md",
    purpose::multi_repo_rationale+pivot_history,
    required::false  # Will fallback to ADR files if not found
  },
  PROJECT_CONTEXT::{
    doc::".coord-project/PROJECT-CONTEXT.md",
    purpose::suite_wide_current_state,
    required::true
  },
  PROJECT_ROADMAP::{
    doc::".coord-project/PROJECT-ROADMAP.md",
    purpose::7_app_timeline+phases,
    required::false
  },
  CHARTER::{
    doc::".coord-project/CHARTER.md",
    purpose::mission+scope+success_criteria,
    required::false
  },
  PROJECT_CHECKLIST::{
    doc::".coord-project/PROJECT-CHECKLIST.md",
    purpose::cross_app_immediate_tasks,
    required::true
  }
]

FALLBACK_CHAIN::[
  Read(".coord-project/{DOC}")||      # Primary: explicit dual-symlink (preferred)
  Read("../../.coord/{DOC}")||        # Fallback 1: two levels up (eav-apps structure)
  Read("../.coord/{DOC}")||           # Fallback 2: one level up (other structures)
  ERROR["Cannot find suite coordination docs"]
]
```

### **TIER 2: APP SPECIFIC (ALWAYS LOAD)**
```octave
APP_LEVEL::[
  APP_CONTEXT::{
    doc::".coord/APP-CONTEXT.md",
    purpose::this_app_current_state,
    required::true
  },
  APP_ROADMAP::{
    doc::".coord/APP-ROADMAP.md",
    purpose::this_app_phases,
    required::false  # May not exist for apps not yet started
  },
  APP_CHECKLIST::{
    doc::".coord/APP-CHECKLIST.md",
    purpose::this_app_immediate_tasks,
    required::false  # May not exist for apps not yet started
  }
]

FALLBACK_CHAIN::[
  Read(".coord/{DOC}")||
  Read("../coordination/apps/{app_name}/{DOC}")||  # If symlink broken
  ERROR["Cannot find app coordination docs"]
]

APP_NAME_DETECTION::[
  METHOD_1::readlink(.coord)→parse→"coordination/apps/{APP_NAME}",
  METHOD_2::basename(pwd),
  USAGE::Display in orientation output
]
```

### **TIER 3: SHARED TECHNICAL (ON DEMAND)**
```octave
SHARED_DOCS::[
  DATABASE_SCHEMA::{
    doc::".coord-project/docs/001-DOC-DATABASE-SCHEMA.md",
    trigger::"schema|database|supabase|types",
    purpose::supabase_schema_single_source_of_truth
  },
  NAVIGATION::{
    doc::".coord-project/docs/002-DOC-UNIFIED-NAVIGATION.md",
    trigger::"navigation|nav|header",
    purpose::navigation_component_design
  },
  DEPLOYMENT::{
    doc::".coord-project/docs/003-DOC-DEPLOYMENT-STRATEGY.md",
    trigger::"deployment|deploy|vercel|routing",
    purpose::vercel_routing_configuration
  },
  LESSONS_LEARNED::{
    doc::".coord-project/docs/004-DOC-LESSONS-LEARNED.md",
    trigger::"lessons|learnings|retrospective",
    purpose::wisdom_and_retrospectives
  }
]

INCLUDE_PATTERN::[
  IF[user_specified_include]→Read(matching_docs),
  IF[trigger_word_match]→Read(triggered_docs),
  ELSE→SKIP[optional_docs]
]
```

### **TIER 4: GIT AND CODEBASE**
```octave
GIT_AWARENESS::[
  RECENT_COMMITS::{command::"git log --oneline -10", scope::this_app_only},
  ACTIVE_STATE::{command::"git status", scope::this_app_only},
  BRANCH_INFO::{command::"git branch --show-current", scope::this_app_only}
]

CODEBASE_AWARENESS::[
  PACK::{
    tool::"mcp__repomix__pack_codebase",
    params::{directory::".", includePatterns::"src/**,tests/**,lib/**"},
    purpose::code_structure_awareness,
    mandatory::true,
    blocking::true
  }
]
```

## LOADING_PROTOCOL

```octave
EXECUTION_FLOW::TODOWRITE→SUITE→APP→SHARED→GIT→PACK→ORIENT

STEP_0_TODOWRITE::[
  CREATE_CHECKLIST::TodoWrite(6_tiers_as_defined_above),
  VERIFICATION::"✅ STEP 0 COMPLETE: TodoWrite checklist created with 6 tiers"
]

STEP_1_SUITE_MASTER::[
  MARK_IN_PROGRESS::TodoWrite(tier_1="in_progress"),

  ARCHITECTURE::Read(".coord-project/ARCHITECTURE.md")||
              Read(".coord-project/docs/002-DOC-ADR-001-UNIVERSAL-COORDINATION-STRUCTURE.oct.md")||
              Read(".coord-project/docs/003-DOC-ADR-002-HYBRID-ARCHITECTURE-SHARED-LIB.oct.md")||
              Read(".coord-project/docs/004-DOC-ADR-003-SCHEMA-MIGRATION-PROTOCOL.oct.md")||
              Read("../../.coord/ARCHITECTURE.md")||
              Read("../../.coord/docs/002-DOC-ADR-001-UNIVERSAL-COORDINATION-STRUCTURE.oct.md")||
              Read("../../.coord/docs/003-DOC-ADR-002-HYBRID-ARCHITECTURE-SHARED-LIB.oct.md")||
              Read("../../.coord/docs/004-DOC-ADR-003-SCHEMA-MIGRATION-PROTOCOL.oct.md")||
              SKIP["Architecture info not found - continuing without"],
  PROJECT_CONTEXT::Read(".coord-project/PROJECT-CONTEXT.md")||Read("../../.coord/PROJECT-CONTEXT.md")||Read("../.coord/PROJECT-CONTEXT.md")||ERROR["Required"],
  PROJECT_CHECKLIST::Read(".coord-project/PROJECT-CHECKLIST.md")||Read("../../.coord/PROJECT-CHECKLIST.md")||Read("../.coord/PROJECT-CHECKLIST.md")||ERROR["Required"],
  PROJECT_ROADMAP::Read(".coord-project/PROJECT-ROADMAP.md")||Read("../../.coord/PROJECT-ROADMAP.md")||Read("../.coord/PROJECT-ROADMAP.md")||SKIP["Optional"],
  CHARTER::Read(".coord-project/CHARTER.md")||Read("../../.coord/CHARTER.md")||Read("../.coord/CHARTER.md")||SKIP["Optional"],

  MARK_COMPLETED::TodoWrite(tier_1="completed"),
  VERIFICATION::"✅ TIER 1 COMPLETE: Suite docs loaded (PROJECT-CONTEXT + PROJECT-CHECKLIST required)"
]

STEP_2_APP_SPECIFIC::[
  MARK_IN_PROGRESS::TodoWrite(tier_2="in_progress"),

  DETECT_APP_NAME::readlink(.coord)→parse→{APP_NAME},
  APP_CONTEXT::Read(".coord/APP-CONTEXT.md")||ERROR["Required for app orientation"],
  APP_ROADMAP::Read(".coord/APP-ROADMAP.md")||SKIP["May not exist yet"],
  APP_CHECKLIST::Read(".coord/APP-CHECKLIST.md")||SKIP["May not exist yet"],

  MARK_COMPLETED::TodoWrite(tier_2="completed"),
  VERIFICATION::"✅ TIER 2 COMPLETE: App docs loaded (APP-CONTEXT required, {APP_NAME} detected)"
]

STEP_3_SHARED_TECHNICAL::[
  MARK_IN_PROGRESS::TodoWrite(tier_3="in_progress"),

  IF[include_contains("schema")]→Read(".coord-project/docs/001-DOC-DATABASE-SCHEMA.md")||Read("../../.coord/docs/001-DOC-DATABASE-SCHEMA.md")||Read("../.coord/docs/001-DOC-DATABASE-SCHEMA.md"),
  IF[include_contains("navigation")]→Read(".coord-project/docs/002-DOC-UNIFIED-NAVIGATION.md")||Read("../../.coord/docs/002-DOC-UNIFIED-NAVIGATION.md")||Read("../.coord/docs/002-DOC-UNIFIED-NAVIGATION.md"),
  IF[include_contains("deployment")]→Read(".coord-project/docs/003-DOC-DEPLOYMENT-STRATEGY.md")||Read("../../.coord/docs/003-DOC-DEPLOYMENT-STRATEGY.md")||Read("../.coord/docs/003-DOC-DEPLOYMENT-STRATEGY.md"),
  IF[include_contains("lessons")]→Read(".coord-project/docs/004-DOC-LESSONS-LEARNED.md")||Read("../../.coord/docs/004-DOC-LESSONS-LEARNED.md")||Read("../.coord/docs/004-DOC-LESSONS-LEARNED.md"),
  IF[include_contains("all-docs")]→Read(".coord-project/docs/*.md")||Read("../../.coord/docs/*.md")||Read("../.coord/docs/*.md"),

  MARK_COMPLETED::TodoWrite(tier_3="completed"),
  VERIFICATION::"✅ TIER 3 COMPLETE: Shared docs loaded (or N/A if none requested)"
]

STEP_4_GIT::[
  MARK_IN_PROGRESS::TodoWrite(tier_4="in_progress"),

  git_log→recent_commits[10],
  git_status→work_in_progress,
  git_branch→current_branch,

  MARK_COMPLETED::TodoWrite(tier_4="completed"),
  VERIFICATION::"✅ TIER 4 COMPLETE: Git context loaded (10 commits + status + branch)"
]

STEP_5_PACK::[
  MARK_IN_PROGRESS::TodoWrite(tier_5="in_progress"),

  ⚠️ BLOCKING_REQUIREMENT::"TIER 5 is MANDATORY - cannot proceed to TIER 6 without codebase pack",

  mcp__repomix__pack_codebase(directory:".", includePatterns:"src/**,tests/**,lib/**"),
  →extract[outputId]→store_for_reference,

  VERIFICATION_REQUIRED::[
    CONFIRM::"outputId captured: {outputId}",
    CONFIRM::"Codebase structure loaded: {file_count} files",
    IF[missing_outputId]→ERROR["TIER 5 incomplete - cannot orient without codebase awareness"]
  ],

  MARK_COMPLETED::TodoWrite(tier_5="completed"),
  VERIFICATION::"✅ TIER 5 COMPLETE: Codebase packed with Repomix (outputId: {outputId}, {file_count} files)"
]

STEP_6_ORIENT::[
  MARK_IN_PROGRESS::TodoWrite(tier_6="in_progress"),

  ⚠️ BLOCKING_CONDITION::CANNOT_PROCEED_UNLESS[tiers_1_2_4_5_completed],

  SYNTHESIZE::[
    suite_status→from_PROJECT_CONTEXT,
    suite_timeline→from_PROJECT_ROADMAP,
    cross_app_tasks→from_SHARED_CHECKLIST,
    app_status→from_APP_CONTEXT,
    app_focus→from_APP_CONTEXT,
    app_tasks→from_APP_CHECKLIST||SHARED_CHECKLIST,
    recent_work→from_git_log,
    current_changes→from_git_status,
    codebase_structure→from_repomix_outputId
  ],

  OUTPUT::"
  **EAV Apps Multi-App Context Loaded**

  **Suite Status** (Overall Ecosystem):
  - Current State: {PROJECT-CONTEXT.md summary}
  - Timeline: {PROJECT-ROADMAP.md current phase}
  - Architecture: {ARCHITECTURE.md key points or ADR summary}
  - Cross-App Tasks: {SHARED-CHECKLIST.md relevant items}

  **This App** ({APP_NAME}):
  - Status: {APP-CONTEXT.md status}
  - Current Focus: {APP-CONTEXT.md current focus}
  - Next Tasks: {APP-CHECKLIST.md top 3 items or SHARED-CHECKLIST fallback}

  **Recent Work** (Last 10 Commits):
  {git log output}

  **Current Changes**:
  {git status output}

  **Codebase Structure**:
  - Repomix outputId: {outputId}
  - Files analyzed: {file_count}

  **Orientation**: You're working on {APP_NAME} in the EAV multi-app ecosystem. Suite is at {phase} focusing on {suite_focus}. This app is {app_status} with immediate focus on {app_focus}.
  ",

  MARK_COMPLETED::TodoWrite(tier_6="completed"),
  VERIFICATION::"✅ TIER 6 COMPLETE: Orientation synthesized from complete context (suite + app + git + codebase)"
]
```

## APP_NAME_DETECTION
```octave
DETECTION_METHOD::[
  PRIMARY::readlink(.coord)→parse_path→extract_app_name,
  FALLBACK::basename(pwd),
  VALIDATION::Check_against_known_apps[scripts-web,data-entry-web,vo-web,scenes-web,edit-web,translations-web,camop-pwa]
]

PARSE_EXAMPLE::[
  "readlink .coord → ../coordination/apps/scripts-web",
  "extract → scripts-web",
  "display → 'Working on: scripts-web'"
]
```

## USAGE_PATTERNS

```octave
BASIC::"/eav-context"
  →loads_suite+app+git+codebase
  →provides_two_tier_orientation

WITH_SHARED_DOCS::"/eav-context include schema"
  →suite+app+database_schema+git+codebase
  →useful_when_working_on_schema_related_features

WITH_MULTIPLE_DOCS::"/eav-context include schema,navigation,deployment"
  →suite+app+multiple_shared_docs+git+codebase
  →comprehensive_context_for_integration_work

ALL_DOCS::"/eav-context include all-docs"
  →suite+app+all_coordination_docs+git+codebase
  →complete_context_load

APP_SWITCHING::"/eav-context"
  →after_switching_from_scripts-web_to_vo-web
  →reorients_with_suite_continuity+new_app_focus
```

## SMART_SHORTCUTS
```octave
TRIGGER_WORDS::[
  "schema"→Read("001-DOC-DATABASE-SCHEMA.md"),
  "navigation"→Read("002-DOC-UNIFIED-NAVIGATION.md"),
  "deployment"→Read("003-DOC-DEPLOYMENT-STRATEGY.md"),
  "lessons"→Read("004-DOC-LESSONS-LEARNED.md"),
  "all-docs"→Read("docs/*.md")
]

INCLUDE_RESOLUTION::[
  exact_name→Read(../coordination/docs/{name}),
  partial_match→glob_and_read,
  trigger_word→read_triggered_doc,
  missing→skip_gracefully
]
```

## ANTI_PATTERNS_PREVENTED
```octave
BLOCKED::[
  no_todowrite_checklist[enforcement_protocol_bypass],
  batch_completing_todos[ceremonial_compliance],
  skipping_tier_5_repomix[missing_codebase_awareness],
  orientation_without_outputId[incomplete_context],
  app_only_orientation[missing_suite_context],
  suite_only_orientation[missing_app_focus],
  wrong_app_context[loading_scripts_context_while_in_vo_directory],
  overload[loading_all_7_app_contexts_at_once]
]

REQUIRED::[
  observable_todowrite_checklist[enforcement_visibility],
  sequential_tier_completion[discipline],
  mandatory_tier_5_repomix[codebase_awareness],
  two_tier_awareness[suite+app],
  correct_app_detection[via_symlink_or_pwd],
  rapid_orientation[<30s_load_time],
  clear_separation[suite_vs_app_in_output]
]
```

## DUAL_SYMLINK_PATTERN
```octave
STRUCTURE::[
  .coord/→../../.coord/apps/{app-name}/[APP-level docs],
  .coord-project/→../../.coord/[PROJECT-level docs]
]

BENEFITS::[
  EXPLICIT_TIER_SEPARATION::"Names reveal intent - no mental overhead",
  SYMMETRIC_NAVIGATION::"Both tiers equally accessible from app directory",
  PATH_SIMPLIFICATION::".coord-project/PROJECT-CONTEXT.md vs ../../.coord/PROJECT-CONTEXT.md",
  SELF_DOCUMENTING::"Two .coord* directories = two coordination tiers (visible pattern)",
  BACKWARD_COMPATIBLE::"Path traversal fallbacks preserve old structure support"
]

SETUP::["ln -s ../../.coord .coord-project" from app directory]

EMERGENT_PROPERTY::"Dual-symlink architecture creates multiplicative coherence: tier_separation × symmetric_access × zero_mental_overhead"
```

## INTEGRATION_CONTEXT
```octave
SPECIALIZED_FOR::eav_apps_multi_app_structure
COMPLEMENTS::"/context"[single_project_structure]
WHEN_TO_USE::[
  working_in_eav_apps_directory,
  switching_between_eav_apps,
  need_suite_wide_awareness,
  "get up to speed on EAV ecosystem"
]

WHEN_NOT_TO_USE::[
  single_project_repositories,
  non_eav_projects,
  use_standard_/context_instead
]
```

## VALIDATION_CHECKS
```octave
PRE_EXECUTION_CHECKS::[
  CHECK[.coord exists]→FAIL["Not in EAV app directory"],
  CHECK[.coord-project exists OR ../../.coord/ exists]→FAIL["Coordination repo not found"],
  CHECK[.coord points to ../../.coord/apps/*]→FAIL["Invalid app symlink"],
  RECOMMEND[.coord-project symlink]→"⚡ Dual-symlink pattern detected - using .coord-project/ for explicit tier separation"
]

POST_LOAD_WARNINGS::[
  IF[suite_docs_missing]→"⚠️ Suite coordination incomplete - missing {files}",
  IF[app_context_missing]→"⚠️ App coordination missing - run scaffolding",
  IF[symlink_broken]→"⚠️ .coord symlink broken - recreate it",
  IF[repomix_skipped]→"⚠️ PROTOCOL VIOLATION: TIER 5 skipped - orientation lacks codebase awareness"
]

COMPLETION_VERIFICATION::[
  REQUIRED_MARKERS::[
    "✅ STEP 0 COMPLETE: TodoWrite checklist created",
    "✅ TIER 1 COMPLETE: Suite docs loaded",
    "✅ TIER 2 COMPLETE: App docs loaded",
    "✅ TIER 3 COMPLETE: Shared docs loaded (or N/A)",
    "✅ TIER 4 COMPLETE: Git context loaded",
    "✅ TIER 5 COMPLETE: Codebase packed (outputId: {id})",
    "✅ TIER 6 COMPLETE: Orientation synthesized"
  ],
  ENFORCEMENT::"Each marker must appear in output sequentially - missing markers = protocol violation"
]
```

## MISSION
```octave
PURPOSE::RAPID_MULTI_APP_SESSION_INITIALIZATION
METHOD::OBSERVABLE_TWO_TIER_LOADING[suite_wide+app_specific+codebase]
OUTCOME::ORIENTED_AGENT_WITH_ECOSYSTEM_AND_APP_AND_CODE_AWARENESS
WISDOM::"Suite context for strategy, app context for execution, codebase context for implementation"
PATTERN::"Reusable for any multi-app project with coordination repo"
ENFORCEMENT::"TodoWrite makes protocol compliance visible - cannot hide skips"
```

## EXECUTION_TEMPLATE

```octave
PROMPT_TO_AGENT::"
⚠️ MANDATORY: Create TodoWrite checklist FIRST, then load EAV multi-app context in sequence ⚠️

**STEP 0: CREATE OBSERVABLE CHECKLIST (MANDATORY FIRST ACTION)**

Before loading ANY context, create TodoWrite with 6 tiers:

TodoWrite([
  {content: \"TIER 1: Load suite-level coordination docs (ARCHITECTURE, PROJECT-CONTEXT, PROJECT-CHECKLIST, ROADMAP, CHARTER)\", status: \"pending\", activeForm: \"Loading suite coordination\"},
  {content: \"TIER 2: Load app-specific coordination docs (APP-CONTEXT, APP-ROADMAP, APP-CHECKLIST)\", status: \"pending\", activeForm: \"Loading app coordination\"},
  {content: \"TIER 3: Load shared technical docs (schema, navigation, deployment, lessons - if requested)\", status: \"pending\", activeForm: \"Loading technical docs\"},
  {content: \"TIER 4: Load git history and status (recent commits, working tree)\", status: \"pending\", activeForm: \"Loading git context\"},
  {content: \"TIER 5: Pack codebase with Repomix (MANDATORY - code structure awareness)\", status: \"pending\", activeForm: \"Packing codebase structure\"},
  {content: \"TIER 6: Synthesize and present orientation (suite + app context)\", status: \"pending\", activeForm: \"Synthesizing orientation\"}
])

Output: ✅ STEP 0 COMPLETE: TodoWrite checklist created with 6 tiers

**TIER 1: SUITE MASTER (Load First)**

Mark tier 1 as in_progress, then load:

a) ARCHITECTURE (OPTIONAL with fallback):
   Try: Read('.coord-project/ARCHITECTURE.md')
   Fallback 1: Read('.coord-project/docs/002-DOC-ADR-001-UNIVERSAL-COORDINATION-STRUCTURE.md')
   Fallback 2: Read('.coord-project/docs/003-DOC-ADR-002-HYBRID-ARCHITECTURE-SHARED-LIB.md')
   Fallback 3: Read('../../.coord/ARCHITECTURE.md')
   Fallback 4: Read('../../.coord/docs/002-DOC-ADR-001-UNIVERSAL-COORDINATION-STRUCTURE.md')
   Fallback 5: Read('../../.coord/docs/003-DOC-ADR-002-HYBRID-ARCHITECTURE-SHARED-LIB.md')
   If all fail: Skip with warning (architecture info from ADRs is nice-to-have)

b) PROJECT-CONTEXT.md (REQUIRED):
   Try: Read('.coord-project/PROJECT-CONTEXT.md')
   If fails: Read('../../.coord/PROJECT-CONTEXT.md')
   If fails: Read('../.coord/PROJECT-CONTEXT.md')
   If fails: ERROR - Cannot proceed without suite context

c) PROJECT-CHECKLIST.md (REQUIRED):
   Try: Read('.coord-project/PROJECT-CHECKLIST.md')
   If fails: Read('../../.coord/PROJECT-CHECKLIST.md')
   If fails: Read('../.coord/PROJECT-CHECKLIST.md')
   If fails: ERROR - Cannot proceed without cross-app tasks

d) PROJECT-ROADMAP.md (OPTIONAL):
   Try: Read('.coord-project/PROJECT-ROADMAP.md')
   If fails: Read('../../.coord/PROJECT-ROADMAP.md')
   If fails: Read('../.coord/PROJECT-ROADMAP.md')
   If fails: Skip gracefully

e) CHARTER.md (OPTIONAL):
   Try: Read('.coord-project/CHARTER.md')
   If fails: Read('../../.coord/CHARTER.md')
   If fails: Read('../.coord/CHARTER.md')
   If fails: Skip gracefully

Mark tier 1 as completed.
Output: ✅ TIER 1 COMPLETE: Suite docs loaded (PROJECT-CONTEXT + PROJECT-CHECKLIST required)

**TIER 2: APP SPECIFIC (Load Second)**

Mark tier 2 as in_progress, then load:

Detect app name: readlink(.coord) → parse → {APP_NAME}

a) APP-CONTEXT.md (REQUIRED):
   Read('.coord/APP-CONTEXT.md')
   If fails: ERROR - Cannot proceed without app context

b) APP-ROADMAP.md (OPTIONAL):
   Read('.coord/APP-ROADMAP.md')
   If fails: Skip (may not exist yet)

c) APP-CHECKLIST.md (OPTIONAL):
   Read('.coord/APP-CHECKLIST.md')
   If fails: Skip (may not exist yet)

Mark tier 2 as completed.
Output: ✅ TIER 2 COMPLETE: App docs loaded (APP-CONTEXT required, {APP_NAME} detected)

**TIER 3: SHARED TECHNICAL (Optional Includes)**

Mark tier 3 as in_progress, then load based on user request:

User specified: {optional_includes}

If 'schema' included:
   Try: Read('.coord-project/docs/001-DOC-DATABASE-SCHEMA.md')
   If fails: Read('../../.coord/docs/001-DOC-DATABASE-SCHEMA.md')
   If fails: Read('../.coord/docs/001-DOC-DATABASE-SCHEMA.md')

If 'navigation' included:
   Try: Read('.coord-project/docs/002-DOC-UNIFIED-NAVIGATION.md')
   If fails: Read('../../.coord/docs/002-DOC-UNIFIED-NAVIGATION.md')
   If fails: Read('../.coord/docs/002-DOC-UNIFIED-NAVIGATION.md')

If 'deployment' included:
   Try: Read('.coord-project/docs/003-DOC-DEPLOYMENT-STRATEGY.md')
   If fails: Read('../../.coord/docs/003-DOC-DEPLOYMENT-STRATEGY.md')
   If fails: Read('../.coord/docs/003-DOC-DEPLOYMENT-STRATEGY.md')

If 'lessons' included:
   Try: Read('.coord-project/docs/004-DOC-LESSONS-LEARNED.md')
   If fails: Read('../../.coord/docs/004-DOC-LESSONS-LEARNED.md')
   If fails: Read('../.coord/docs/004-DOC-LESSONS-LEARNED.md')

If 'all-docs' included:
   Try: Read all .coord-project/docs/*.md
   If fails: Read all ../../.coord/docs/*.md
   If fails: Read all ../.coord/docs/*.md

Mark tier 3 as completed.
Output: ✅ TIER 3 COMPLETE: Shared docs loaded (or N/A if none requested)

**TIER 4: GIT AND CODEBASE HISTORY**

Mark tier 4 as in_progress, then load:

- git log --oneline -10 (recent commits in THIS app)
- git status (current changes in THIS app)
- git branch --show-current (current branch)

Mark tier 4 as completed.
Output: ✅ TIER 4 COMPLETE: Git context loaded (10 commits + status + branch)

**TIER 5: CODEBASE PACK (MANDATORY - BLOCKING)**

Mark tier 5 as in_progress.

⚠️ CRITICAL: This tier is MANDATORY. You CANNOT skip to tier 6 without completing this.

Execute:
mcp__repomix__pack_codebase(directory: \".\", includePatterns: \"src/**,tests/**,lib/**\")

Extract and store outputId from result.
Verify: Confirm outputId captured and file count available.

If repomix fails or outputId missing: ERROR - Cannot proceed without codebase awareness

Mark tier 5 as completed.
Output: ✅ TIER 5 COMPLETE: Codebase packed with Repomix (outputId: {outputId}, {file_count} files)

**TIER 6: ORIENTATION OUTPUT**

Mark tier 6 as in_progress.

⚠️ BLOCKING CONDITION: Cannot proceed unless tiers 1, 2, 4, and 5 are completed.

Verify all required context loaded:
- Suite docs (tier 1): ✓
- App docs (tier 2): ✓
- Git context (tier 4): ✓
- Codebase pack (tier 5): ✓ (outputId: {id})

Synthesize orientation from ALL loaded context:

**EAV Apps Multi-App Context Loaded**

**Suite Status** (Overall Ecosystem):
- Current State: {Summary from PROJECT-CONTEXT.md}
- Timeline: {Current phase from PROJECT-ROADMAP.md}
- Architecture: {ARCHITECTURE.md key points or ADR summary}
- Cross-App Tasks: {Relevant cross-app tasks from PROJECT-CHECKLIST.md}

**This App ({APP_NAME}):**
- Status: {Status from APP-CONTEXT.md}
- Current Focus: {Focus from APP-CONTEXT.md}
- Next Tasks: {Top 3 items from APP-CHECKLIST.md or SHARED-CHECKLIST.md}

**Recent Work** (Last 10 Commits):
{git log output}

**Current Changes**:
{git status output}

**Codebase Structure**:
- Repomix outputId: {outputId}
- Files analyzed: {file_count}

**Orientation**: You're working on {APP_NAME} in the EAV multi-app ecosystem. Suite is at {phase} focusing on {suite_focus}. This app is {app_status} with immediate focus on {app_focus}.

Mark tier 6 as completed.
Output: ✅ TIER 6 COMPLETE: Orientation synthesized from complete context (suite + app + git + codebase)

CRITICAL ENFORCEMENT:
- TodoWrite checklist MUST be created before any loading (STEP 0)
- Each tier MUST be marked in_progress before work, completed after work
- Tier 5 (Repomix) is MANDATORY - cannot skip to tier 6 without it
- Output markers (✅ TIER X COMPLETE) prove sequential completion
- Suite docs provide ECOSYSTEM AWARENESS
- App docs provide FOCUSED EXECUTION CONTEXT
- Codebase pack provides STRUCTURAL AWARENESS
- All three required for complete orientation
- Never orient from partial context
- User can see your progress via TodoWrite UI
"
```
