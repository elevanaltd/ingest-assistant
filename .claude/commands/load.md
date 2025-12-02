# Load: $ARGUMENTS

Combined role activation and context loading with split-RAPH for optimal LLM attention.

**CRITICAL: This command uses TodoWrite to enforce sequential execution. Do NOT batch reads.**

## COMMAND_INTERFACE
```octave
INVOCATION::"/load {role} [--quick|--context-only]"
EXAMPLES::[
  "/load ho"→full_split_RAPH+context,
  "/load implementation-lead"→full_split_RAPH+context,
  "/load ho --quick"→role_only[micro_RAPH],
  "/load --context-only"→context_only[no_role]
]
```

## ATTENTION_MECHANICS_RATIONALE
```octave
SEQUENCE_DESIGN::[
  PRIMACY::constitution_first→anchors_constraints,
  MICRO_RAPH::locks_key_force+tension_before_context_flood,
  MIDDLE::context_acceptable_if_followed_by_refresh,
  RECENCY::full_RAPH_after_context→behaviors_guide_output,
  GROUNDED::RAPH_tensions_reference_actual_project_state
]
SUCCESS_CRITERION::"Dashboard shows role + project + cognitive lock"
ENFORCEMENT::"TodoWrite prevents read batching - each step must complete before next begins"
```

---

## STEP 1: Parse Arguments and Create Sequential Todo

```bash
FULL_ARGS="$ARGUMENTS"
ROLE_NAME=""
QUICK_MODE=false
CONTEXT_ONLY=false

# Parse flags
if echo "$FULL_ARGS" | grep -q -- "--quick"; then
  QUICK_MODE=true
  FULL_ARGS=$(echo "$FULL_ARGS" | sed 's/--quick//g' | xargs)
fi

if echo "$FULL_ARGS" | grep -q -- "--context-only"; then
  CONTEXT_ONLY=true
  FULL_ARGS=$(echo "$FULL_ARGS" | sed 's/--context-only//g' | xargs)
fi

ROLE_NAME=$(echo "$FULL_ARGS" | xargs)
ROLE_NAME=$(echo "$ROLE_NAME" | tr ' ' '-' | tr '[:upper:]' '[:lower:]')

# Common aliases
case "$ROLE_NAME" in
  "ce") ROLE_NAME="critical-engineer" ;;
  "ea") ROLE_NAME="error-architect" ;;
  "ta") ROLE_NAME="technical-architect" ;;
  "ca") ROLE_NAME="completion-architect" ;;
  "il") ROLE_NAME="implementation-lead" ;;
  "td") ROLE_NAME="task-decomposer" ;;
  "wa") ROLE_NAME="workspace-architect" ;;
  "ss") ROLE_NAME="system-steward" ;;
  "rs") ROLE_NAME="requirements-steward" ;;
  "ho") ROLE_NAME="holistic-orchestrator" ;;
  "tis"|"test-steward") ROLE_NAME="test-infrastructure-steward" ;;
  "tmg"|"testguard") ROLE_NAME="test-methodology-guardian" ;;
  "crs"|"cr") ROLE_NAME="code-review-specialist" ;;
  "ute"|"test") ROLE_NAME="universal-test-engineer" ;;
esac
```

**MANDATORY: Create TodoWrite FIRST to enforce sequential execution.**

```octave
IF[QUICK_MODE=false AND CONTEXT_ONLY=false]::[
  TodoWrite([
    {content:"1. Read constitution (PRIMACY)", status:"in_progress", activeForm:"Reading constitution"},
    {content:"2. Micro-RAPH anchor (LOCK)", status:"pending", activeForm:"Locking constraints"},
    {content:"3. Load PROJECT-CONTEXT", status:"pending", activeForm:"Loading project context"},
    {content:"4. Load CHECKLIST + NORTH-STAR", status:"pending", activeForm:"Loading tactical and strategic"},
    {content:"5. Load git state", status:"pending", activeForm:"Getting git state"},
    {content:"6. Pack codebase (repomix)", status:"pending", activeForm:"Packing codebase for awareness"},
    {content:"7. Full RAPH: READ phase", status:"pending", activeForm:"Extracting components"},
    {content:"8. Full RAPH: ABSORB phase", status:"pending", activeForm:"Finding context-grounded tensions"},
    {content:"9. Full RAPH: PERCEIVE phase", status:"pending", activeForm:"Generating project scenarios"},
    {content:"10. Full RAPH: HARMONISE phase", status:"pending", activeForm:"Predicting context-aware behaviors"},
    {content:"11. Dashboard synthesis", status:"pending", activeForm:"Generating HUD"}
  ])
]

IF[QUICK_MODE=true]::[
  TodoWrite([
    {content:"1. Read constitution", status:"in_progress", activeForm:"Reading constitution"},
    {content:"2. Micro-RAPH anchor", status:"pending", activeForm:"Locking constraints"},
    {content:"3. Quick activation summary", status:"pending", activeForm:"Summarizing activation"}
  ])
]

IF[CONTEXT_ONLY=true]::[
  TodoWrite([
    {content:"1. Load PROJECT-CONTEXT", status:"in_progress", activeForm:"Loading project context"},
    {content:"2. Load CHECKLIST + NORTH-STAR", status:"pending", activeForm:"Loading tactical and strategic"},
    {content:"3. Get git state", status:"pending", activeForm:"Getting git state"},
    {content:"4. Pack codebase (repomix)", status:"pending", activeForm:"Packing codebase"},
    {content:"5. Dashboard synthesis", status:"pending", activeForm:"Generating HUD"}
  ])
]
```

---

## STEP 2: Read Constitution (PRIMACY) - Todo Item 1

**Do this step. Mark complete. Then proceed to next.**

```octave
READ::"/Users/shaunbuswell/.claude/agents/{ROLE_NAME}.oct.md"

EXTRACT::[
  COGNITION::ETHOS|LOGOS|PATHOS,
  ARCHETYPES::from_COGNITIVE_FOUNDATION,
  CORE_FORCES::from_CONSTITUTIONAL_FOUNDATION,
  SHANK_OVERLAY::{COGNITION}_SHANK_OVERLAY_section,
  CONSTRAINTS::MUST_ALWAYS+MUST_NEVER
]

THEN::mark_todo_1_complete→mark_todo_2_in_progress
```

---

## STEP 3: Micro-RAPH Anchor (LOCK) - Todo Item 2

**Before loading any context, lock key constraints. Mark complete. Then proceed.**

```octave
MICRO_RAPH::[
  KEY_FORCE::"Primary cognitive force: {COGNITION} - {one_sentence_meaning}",
  TOP_TENSION::"Key tension: {MUST_X} vs {operational_reality} - resolved by {principle}"
]

OUTPUT::[
  "🔒 CONSTRAINT ANCHOR:",
  "   Force: {COGNITION} - {synthesis}",
  "   Lock: {top_MUST_ALWAYS} ↔ {top_MUST_NEVER}"
]

THEN::mark_todo_2_complete→mark_todo_3_in_progress
```

This anchor is now locked BEFORE any project context enters the window.

---

## STEP 4: Load PROJECT-CONTEXT - Todo Item 3

**Now load context. Mark complete. Then proceed.**

```octave
PROJECT_CONTEXT::[
  TRY::Read(".coord/PROJECT-CONTEXT.md"),
  FALLBACK::Read("coordination/PROJECT-CONTEXT.md"),
  FALLBACK::Read("../coordination/PROJECT-CONTEXT.md"),
  FALLBACK::SKIP["No PROJECT-CONTEXT found"]
]

THEN::mark_todo_3_complete→mark_todo_4_in_progress
```

---

## STEP 5: Load CHECKLIST + NORTH-STAR - Todo Item 4

**Load tactical and strategic layers. Mark complete. Then proceed.**

```octave
CHECKLIST::[
  TRY::Read(".coord/PROJECT-CHECKLIST.md"),
  TRY::Read(".coord/SHARED-CHECKLIST.md"),
  FALLBACK::Read("coordination/SHARED-CHECKLIST.md"),
  FALLBACK::SKIP["No checklist found"]
]

NORTH_STAR::[
  TRY::Read(".coord/PROJECT-NORTH-STAR.md"),
  TRY::Read(".coord/NORTH-STAR.md"),
  TRY::Glob(".coord/workflow-docs/*NORTH-STAR*.md")→Read(first_match),
  TRY::Glob(".coord/*NORTH-STAR*.md")→Read(first_match),
  FALLBACK::SKIP["No North Star found - proceeding tactically"]
]

THEN::mark_todo_4_complete→mark_todo_5_in_progress
```

---

## STEP 6: Load Git State - Todo Item 5

**Load reality state. Mark complete. Then proceed.**

```octave
GIT_STATE::[
  COMMAND::"git log --oneline -10",
  COMMAND::"git status --short",
  COMMAND::"git branch --show-current"
]

THEN::mark_todo_5_complete→mark_todo_6_in_progress
```

---

## STEP 7: Pack Codebase (Repomix) - Todo Item 6

**Pack codebase for full awareness. Mark complete. Then proceed.**

```octave
CODEBASE_PACK::[
  TOOL::mcp__repomix__pack_codebase(
    directory=".",
    includePatterns="src/**,lib/**,packages/**,apps/**"
  ),
  STORE::outputId_for_reference,
  PURPOSE::"Full codebase awareness for context-grounded RAPH"
]

THEN::mark_todo_6_complete→mark_todo_7_in_progress
```

---

## STEP 8: Full RAPH - READ Phase - Todo Item 7

**Extract constitutional components with line citations. Mark complete. Then proceed.**

```octave
EXTRACTION::[
  CORE_FORCES::[{name}::L{N}],
  PRINCIPLES::[{name}::L{N}],
  ARCHETYPES::{cognition}+{archetypes}::L{N},
  CONSTRAINTS::[MUST::{items}::L{N}, NEVER::{items}::L{N}]
]

GATE::8-15_components_cited

THEN::mark_todo_7_complete→mark_todo_8_in_progress
```

---

## STEP 9: Full RAPH - ABSORB Phase - Todo Item 8

**Identify 3 context-grounded tensions. Mark complete. Then proceed.**

```octave
// Tensions NOW reference the project context loaded in Steps 4-7
TENSIONS::[
  T1::{name}[
    A::L{X}[constitutional_element],
    B::project_context[current_phase|checklist_item|git_state|codebase],
    CONFLICT::when[project_specific_scenario],
    RESOLUTION::via[principle]
  ],
  T2::..., T3::...
]

GATE::3_tensions_grounded_in_project_reality

THEN::mark_todo_8_complete→mark_todo_9_in_progress
```

---

## STEP 10: Full RAPH - PERCEIVE Phase - Todo Item 9

**Generate 2 project-specific edge scenarios. Mark complete. Then proceed.**

```octave
// Scenarios use actual project state from loaded context + codebase
SCENARIOS::[
  S1::{name}[
    SITUATION::actual_project_decision_point,
    AMBIGUITY::constitutional_principle_vs_project_need,
    RESOLUTION::approach_for_this_project
  ],
  S2::...
]

GATE::2_scenarios_specific_to_loaded_context

THEN::mark_todo_9_complete→mark_todo_10_in_progress
```

---

## STEP 11: Full RAPH - HARMONISE Phase - Todo Item 10

**Predict 3 context-aware behavioral differences. Mark complete. Then proceed.**

```octave
// Behaviors cite both constitution AND project + codebase awareness
BEHAVIORS::[
  B1::[
    GENERIC::would[action],
    I_WILL::instead[action_specific_to_this_project],
    BECAUSE::principle::L{N}+project_state::{context_element}
  ],
  B2::..., B3::...
]

GATE::3_behaviors_cite_constitution+context

THEN::mark_todo_10_complete→mark_todo_11_in_progress
```

---

## STEP 12: Dashboard Synthesis - Todo Item 11

**Final output as structured HUD. Mark complete.**

```octave
OUTPUT::[
  "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
  "✅ LOAD COMPLETE",
  "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
  "",
  "🎭 ROLE",
  "   Identity:   {ROLE_NAME} ({COGNITION})",
  "   Archetypes: {ARCHETYPES}",
  "   Domain:     {EXECUTION_DOMAIN}",
  "",
  "📊 PROJECT STATE",
  "   Project:    {project_name_from_context}",
  "   Phase:      {current_phase}",
  "   Branch:     {git_branch} ({clean|dirty})",
  "   Alignment:  {north_star_status|'Tactical only'}",
  "   Codebase:   {repomix_outputId} (packed)",
  "",
  "🔒 COGNITIVE LOCK",
  "   Force:      {COGNITION} - {one_line_synthesis}",
  "   Constraint: {key_MUST_ALWAYS}",
  "   Behavior:   {context_grounded_behavior_prediction}",
  "",
  "🎯 READY STATE",
  "   {specific_readiness_based_on_role_and_context}",
  "",
  "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
]

SUCCESS_VERIFICATION::[
  CHECK::dashboard_shows_role_identity?,
  CHECK::dashboard_shows_project_state?,
  CHECK::dashboard_shows_cognitive_lock?,
  CHECK::codebase_packed?,
  IF[all_present]→"Integration successful",
  IF[missing]→"WARNING: Incomplete integration"
]

THEN::mark_todo_11_complete
```

---

## QUICK MODE (--quick)

Abbreviated TodoWrite sequence - fast activation without context:

```octave
1. Read constitution → mark complete
2. Micro-RAPH anchor → mark complete
3. Quick summary → mark complete

OUTPUT::[
  "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
  "⚡ QUICK LOAD: {ROLE_NAME}",
  "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
  "",
  "🔒 COGNITIVE LOCK",
  "   Force:      {COGNITION}",
  "   Constraint: {key_MUST_ALWAYS}",
  "",
  "Ready (constitutional anchor only, no project context).",
  "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
]
```

---

## CONTEXT-ONLY MODE (--context-only)

Abbreviated TodoWrite sequence - context without role activation:

```octave
1. Load PROJECT-CONTEXT → mark complete
2. Load CHECKLIST + NORTH-STAR → mark complete
3. Git state → mark complete
4. Pack codebase (repomix) → mark complete
5. Dashboard → mark complete

OUTPUT::[
  "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
  "📁 CONTEXT LOADED (no role)",
  "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
  "",
  "📊 PROJECT STATE",
  "   Project:    {project_name}",
  "   Phase:      {current_phase}",
  "   Branch:     {git_branch}",
  "   Alignment:  {north_star_status}",
  "   Codebase:   {repomix_outputId} (packed)",
  "",
  "Ready (context only, no constitutional binding).",
  "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
]
```

---

## Usage Examples

```bash
# Full load: split-RAPH + context with sequential enforcement
/load ho
/load implementation-lead

# Quick load: micro-RAPH only
/load ho --quick

# Context only: no role
/load --context-only

# Using aliases
/load ce          # critical-engineer
/load il          # implementation-lead
```

## Aliases Reference

| Alias | Role |
|-------|------|
| ho | holistic-orchestrator |
| ce | critical-engineer |
| il | implementation-lead |
| ta | technical-architect |
| ea | error-architect |
| wa | workspace-architect |
| ss | system-steward |
| rs | requirements-steward |
| td | task-decomposer |
| cr | code-review-specialist |
| tmg/testguard | test-methodology-guardian |
| tis | test-infrastructure-steward |
| ute/test | universal-test-engineer |

---

## SEQUENTIAL EXECUTION ENFORCEMENT

```
┌──────────────────────────────────────────────────────────────────┐
│ TodoWrite ENFORCES this sequence - no batching allowed:         │
│                                                                  │
│  1. Read constitution (PRIMACY)    ← complete before step 2     │
│  2. Micro-RAPH anchor (LOCK)       ← complete before step 3     │
│  3. Load PROJECT-CONTEXT           ← complete before step 4     │
│  4. Load CHECKLIST + NORTH-STAR    ← complete before step 5     │
│  5. Load git state                 ← complete before step 6     │
│  6. Pack codebase (repomix)        ← complete before step 7     │
│  7. Full RAPH: READ                ← complete before step 8     │
│  8. Full RAPH: ABSORB              ← complete before step 9     │
│  9. Full RAPH: PERCEIVE            ← complete before step 10    │
│ 10. Full RAPH: HARMONISE           ← complete before step 11    │
│ 11. Dashboard synthesis            ← final output               │
└──────────────────────────────────────────────────────────────────┘

Each step: Execute → Mark complete → Next step in_progress → Execute

NOTE: --quick mode skips steps 3-11 (no context, no repomix, no full RAPH)
```

---

**Execute load for: $ARGUMENTS**
