---
name: sync-coord
description: Coordination documentation synchronization patterns. Covers .coord/ structure management, worktree-based doc PRs, PROJECT-CONTEXT/APP-CONTEXT updates, and documentation placement rules. Use for HO delegation to system-steward for doc updates.
allowed-tools: [Read, Write, Edit, Bash, Glob, Grep, Task, TodoWrite]
---

# Sync Coord Skill

COORDINATION_DOCS::"Manage .coord/ documentation structure across projects"

## AUTHORITY

OWNER::system-steward
DELEGATES_FROM::holistic-orchestrator[cannot_Write_directly]
SCOPE::[.coord/*, coordination/*, PROJECT-CONTEXT.md, APP-CONTEXT.md, workflow-docs/*]

## .coord STRUCTURE

```octave
STANDARD_LAYOUT::[
  .coord/::[
    PROJECT-CONTEXT.md::system_state_dashboard,
    PROJECT-CHECKLIST.md::high_level_tasks,
    PROJECT-HISTORY.md::historical_context,
    DECISIONS.md::architectural_rationale,
    workflow-docs/::phase_artifacts[NORTH-STAR,DESIGN,BLUEPRINT,VALIDATION],
    reports/::analysis_reports[8xx_naming],
    apps/{app}/::app_specific[APP-CONTEXT.md,APP-CHECKLIST.md],
    sessions/::session_notes_and_handoffs,
    test-context/::test_infrastructure_docs
  ]
]
```

## DOCUMENT UPDATE PATTERNS

### PROJECT-CONTEXT.md Updates

```octave
WHEN_TO_UPDATE::[
  phase_transitions,
  quality_gate_changes,
  system_infrastructure_changes,
  cross_app_decisions
]

STRUCTURE::[
  SYSTEM_OVERVIEW::apps_status+shared_packages,
  CURRENT_PHASE::active_work+blockers,
  QUALITY_GATES::lint+typecheck+test+build_status,
  DECISIONS_SUMMARY::recent_architectural_choices,
  NEXT_ACTIONS::prioritized_work_items
]
```

### APP-CONTEXT.md Updates

```octave
WHEN_TO_UPDATE::[
  app_phase_progression,
  app_specific_decisions,
  feature_completion,
  gap_resolution
]

STRUCTURE::[
  APP_STATUS::current_phase+health,
  IMPLEMENTATION_STATE::completed+in_progress+blocked,
  DEPENDENCIES::shared_packages+external,
  KNOWN_ISSUES::tracked_gaps,
  NEXT_STEPS::prioritized_tasks
]
```

## WORKTREE PATTERN (For HestAI Docs)

```octave
PURPOSE::"Create doc PRs from clean main without contaminating feature branches"

SETUP::[
  DOCS_WORKTREE::"/Volumes/HestAI-docs",
  MAIN_REPO::"/Volumes/HestAI",
  CREATE::"git worktree add $DOCS_WORKTREE main"
]

WORKFLOW::[
  1::cd_to_worktree,
  2::pull_latest_main,
  3::create_timestamped_branch["docs/sync-$(date +%Y-%m-%d-%H%M)"],
  4::make_documentation_changes,
  5::commit_with_conventional_format,
  6::push_and_create_PR,
  7::return_to_original_work
]

SCOPE_OPTIONS::[
  all::full_docs/_sync,
  guides::docs/guides/_only,
  workflow::docs/workflow/_only,
  standards::docs/standards/_only,
  agents::agent_constitutions,
  templates::templates/_directory
]
```

## DELEGATION FROM HO

```octave
HO_CANNOT::Write|Edit[blocked_by_holistic-orchestrator-mode_skill]

HO_DELEGATES::[
  TASK_FORMAT::Task({
    subagent_type: "system-steward",
    description: "Update .coord documentation",
    prompt: "
      ## CONTEXT
      [describe_what_changed_and_why]

      ## FILES_TO_UPDATE
      - .coord/PROJECT-CONTEXT.md: [specific_changes]
      - .coord/apps/{app}/APP-CONTEXT.md: [if_app_specific]

      ## EVIDENCE
      [reference_completed_work_that_triggered_update]

      ## EXPECTED_OUTCOME
      Documentation reflects current system state
    "
  })
]
```

## HANDOFF PACKET FOR DOC UPDATES

```octave
REQUIRED_FIELDS::[
  TRIGGER::"What event requires doc update (phase complete, decision made, gap resolved)",
  FILES::"Which .coord files need updating",
  CHANGES::"Specific content changes needed",
  EVIDENCE::"Reference to completed work (commit, PR, report)",
  VERIFY::"How to confirm doc accuracy"
]

EXAMPLE::[
  TRIGGER::"B2 phase complete for copy-editor",
  FILES::".coord/PROJECT-CONTEXT.md, .coord/apps/copy-editor/APP-CONTEXT.md",
  CHANGES::"Update phase from B2→B3, add quality gate status, note completed features",
  EVIDENCE::"PR #231 merged, CI green, tests passing",
  VERIFY::"Cross-reference with git log and CI status"
]
```

## 8xx REPORT NAMING

```octave
PATTERN::"{SEQ}-REPORT-{CATEGORY}-{NAME}[-{DATE}].md"
SEQUENCE::800-899
LOCATION::.coord/reports/

CATEGORIES::[
  AUDIT,CI,REVIEW,PLAN,ANALYSIS,INVESTIGATION,PHASE,ARCH,STRATEGIC
]

CHECK_NEXT::"grep 'Next available' .coord/reports/README.md"
```

## VALIDATION COMMANDS

```bash
# Verify .coord structure
ls -la .coord/

# Check PROJECT-CONTEXT freshness
git log -1 --format="%ar" .coord/PROJECT-CONTEXT.md

# Find orphaned docs (not in .coord)
find . -name "*.md" -path "*/docs/*" ! -path "./.coord/*" ! -path "./node_modules/*"

# Validate report naming
find .coord/reports -name "*.md" | xargs -I {} basename {} | grep -v '^[0-9]\{3\}-REPORT-'
```

## INTEGRATION

LOADS_WITH::[documentation-placement, workflow-phases]
USED_BY::[system-steward, holistic-orchestrator[via_delegation]]

ENFORCES::[
  "Dashboard model: PROJECT = overview, APP = detail",
  "Work attribution: Implementation in APP, impact in PROJECT",
  "8xx naming for reports",
  "Timeline test: planning docs vs implementation docs"
]

## WISDOM

CORE::"Documentation is system state made visible"
REMEMBER::"HO sees the need, system-steward writes the update"
SUCCESS::"Docs reflect reality within 24h of system changes"
