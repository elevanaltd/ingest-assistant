---
name: github-issue-creation
description: GitHub issue creation best practices including label verification, format standards, and systemic issue detection. Prevents duplicate work and ensures proper categorization.
allowed-tools: Read, Bash
---

# GitHub Issue Creation

ISSUE_MASTERY::[LABEL_VERIFICATION+FORMAT_STANDARDS+SYSTEMIC_DETECTION]→CLEAR_BACKLOG

---

## LABEL_VERIFICATION

```octave
BEFORE_CREATE::[
  MANDATORY::check_existing_labels[gh_label_list_OR_GitHub_UI],
  COMMAND::"gh label list",
  VERIFY::label_exists_before_applying[prevents_typos+maintains_taxonomy],
  COMMON_LABELS::[bug, enhancement, documentation, technical-debt, security, performance]
]

LABEL_SELECTION::[
  SINGLE_TYPE::choose_one[bug|enhancement|chore],
  OPTIONAL_MODIFIERS::[priority-high, needs-investigation, cross-app],
  ANTI_PATTERN::NEVER[create_new_labels_without_discussion, apply_nonexistent_labels]
]
```

---

## FORMAT_STANDARDS

```octave
TITLE::[
  PATTERN::"[Component] Brief description",
  EXAMPLES::["[Auth] RLS policy blocks valid users", "[CI] Flaky test in scenes-web", "[Docs] Missing API examples"],
  RULES::[descriptive≠vague, component_prefix_when_relevant, <80_chars]
]

BODY_STRUCTURE::[
  CONTEXT::"What's happening? Why is this important?",
  EXPECTED::"What should happen instead?",
  CURRENT::"What actually happens?",
  REPRODUCTION::"Steps to reproduce (if bug)",
  OPTIONAL::[screenshots, logs, related_issues]
]

TEMPLATE_EXAMPLE::
  """
  **Context:**
  Users with valid session tokens are getting 403 errors when accessing script comments.

  **Expected:**
  Authenticated users should be able to read comments on their own scripts.

  **Current:**
  403 Forbidden error from Supabase RLS policy.

  **Reproduction:**
  1. Login as test user
  2. Navigate to script with comments
  3. Observe error in console
  """
```

---

## SYSTEMIC_DETECTION

```octave
CREATE_ISSUE_WHEN::[
  SYSTEMIC::cannot_fix_immediately[requires_prioritization],
  CROSS_APP::coordination_required[multiple_apps_affected],
  TECHNICAL_DEBT::refactoring_needed[paydown_strategy],
  DISCOVERED_BUGS::deprioritized[fix_later],
  SECURITY_PERFORMANCE::investigation_required[deep_analysis],
  RECURRING::pattern_observed[happens_across_apps]
]

SKIP_ISSUE_WHEN::[
  IMMEDIATE_FIX::resolved_current_session[just_fix_it],
  MINOR_DETAIL::solved_during_feature[no_tracking_needed],
  TEMPORARY::scaffolding[documented_in_.coord],
  ALREADY_TRACKED::[TodoWrite_sufficient, PROJECT_CHECKLIST_covers]
]

COORDINATION_PHILOSOPHY::[
  GIT_ISSUES::long_term_backlog+prioritization+cross_session_visibility,
  COORD_DOCS::binding_decisions+system_state+phase_artifacts,
  TODOWRITE::current_session_task_execution
]
```

---

## CREATION_WORKFLOW

```octave
STEP_BY_STEP::[
  1→verify_labels::"gh label list"→choose_existing,
  2→check_duplicates::"gh issue list --search 'keyword'"→avoid_redundancy,
  3→draft_title::"[Component] Clear description",
  4→write_body::context→expected→current→reproduction,
  5→apply_labels::verified_labels_only,
  6→create::"gh issue create --title '...' --body '...' --label '...'"
]

COMMAND_EXAMPLES::[
  list_labels::"gh label list",
  search_existing::"gh issue list --search 'RLS policy'",
  create_issue::"gh issue create --title '[Auth] RLS circular dependency' --body '$(cat issue.md)' --label 'bug,priority-high'",
  interactive::"gh issue create"  # Opens editor for body
]
```

---

## ANTI_PATTERNS

```octave
AVOID::[
  SKIP_LABEL_CHECK::applying_nonexistent_labels→orphaned_issues,
  VAGUE_TITLES::"fix stuff"→unsearchable,
  NO_CONTEXT::"doesn't work"→cannot_reproduce,
  PREMATURE_ISSUES::tracking_trivial_tasks→noise,
  DUPLICATE_TRACKING::issue+TodoWrite+PROJECT_CHECKLIST→confusion
]

QUALITY_GATE::[
  BEFORE_CREATE::ask["Is this systemic?", "Can I fix it now?", "Do labels exist?"],
  LABEL_VERIFIED::command_run_confirms_label_exists,
  FORMAT_FOLLOWED::title_pattern+body_structure,
  NO_DUPLICATES::search_performed_first
]
```

---

## INTEGRATION

```octave
CONSULTED_BY::[implementation-lead, holistic-orchestrator, quality-observer, principal-engineer]

TRIGGERS::[
  SYSTEMIC_ISSUE_DETECTED,
  CROSS_APP_CONCERN_IDENTIFIED,
  TECHNICAL_DEBT_DISCOVERED,
  RECURRING_PATTERN_OBSERVED
]

AUTHORITY::ADVISORY[suggest_issue_creation_when_appropriate≠force]
```

---

## WISDOM

```octave
CORE_TRUTH::"Labels organize, format clarifies, systemic detection prevents noise"

REMEMBER::[
  "Always verify labels exist before creating issue",
  "Fix immediately if possible → Skip issue creation",
  "Context+Expected+Current = Actionable issue",
  "Search before creating → Prevent duplicates",
  "Systemic issues deserve tracking → Trivial tasks don't"
]
```
