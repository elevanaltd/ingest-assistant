---
name: skill-developer
description: Create and manage Claude Code skills following Anthropic best practices. Use when creating new skills, modifying skill-rules.json, understanding trigger patterns, working with hooks, debugging skill activation, or implementing progressive disclosure. Covers skill structure, YAML frontmatter, keyword triggers, hook mechanisms (UserPromptSubmit), session tracking, and the 500-line rule.
---

# Skill Developer

SKILL_SYSTEM_AUTHORITY::[
  MISSION::enable_domain_specific_guidance_via_automatic_skill_injection,
  SCOPE::skill_creation+trigger_tuning+500_line_enforcement+progressive_disclosure,
  GOVERNANCE_HIERARCHY::[CLAUDE.md→Skills→skill-developer]
]

---

## SKILL TYPES

```octave
GUARDRAIL_SKILL::[
  TYPE::"guardrail",
  PURPOSE::enforce_critical_best_practices→prevent_errors,
  AUTO_INJECT::true,
  SESSION_AWARE::true[inject_once_per_conversation],
  USE_WHEN::[runtime_errors, data_integrity, compatibility_critical],
  EXAMPLES::[database-verification, frontend-dev-guidelines]
]

DOMAIN_SKILL::[
  TYPE::"domain",
  PURPOSE::provide_comprehensive_guidance_for_specific_area,
  AUTO_INJECT::true,
  ADVISORY::not_mandatory,
  USE_WHEN::[complex_systems, best_practices, architectural_patterns],
  EXAMPLES::[python-best-practices, skill-developer, api-security]
]
```

---

## THE 500-LINE RULE (CRITICAL)

```octave
ABSOLUTE_LIMITS::[
  TARGET::all_skills<500_lines,
  MAX_BREACH::5_files_can_exceed_500[across_entire_system],
  HARD_LIMIT::NO_file>600_lines[EVER],
  REASON::"Agents_process_linearly→long_files_waste_tokens"
]

ENFORCEMENT::[
  approaching_500→STOP_and_extract_to_resources/,
  >500_and_not_top5→refactor_immediately,
  approaching_600→MANDATORY_refactor_no_exceptions,
  STRATEGY::progressive_disclosure[main_SKILL.md→resources/deep_dives]
]

HOW_TO_STAY_UNDER_500::[
  1_move_examples→resources/subdirectory,
  2_extract_deep_dives→topic_specific_resource_files,
  3_use_summaries_main→detailed_content_resources,
  4_remove_redundancy_and_wordiness
]
```

---

## CREATING NEW SKILLS (5-STEP PROCESS)

```octave
STEP_1_CREATE::[
  file::SKILL.md,
  content::[YAML_frontmatter, core_guidance, resource_references],
  location::.claude/skills/{skill-name}/SKILL.md
]

STEP_2_CONFIGURE::[
  file::skill-rules.json,
  add::[skill_name, triggers, type, autoInject_flag, keywords]
]

STEP_3_TEST::[
  tool::UserPromptSubmit_hook,
  verify::trigger_detection_with_3+_scenarios,
  adjust::keyword_patterns_based_on_results
]

STEP_4_REFINE::[
  review::effectiveness_in_real_scenarios,
  update::trigger_keywords_for_coverage,
  adjust::resource_references_for_clarity
]

STEP_5_FINALIZE::[
  ensure::<500_lines,
  verify::progressive_disclosure_working,
  confirm::no_TOCs_or_line_numbers[FORBIDDEN]
]
```

---

## FORBIDDEN IN SKILLS ❌

```octave
NEVER::[
  table_of_contents→bloat_for_agents,
  line_number_references→stale_and_fragile,
  heading_navigation_links→agents_scan_natively,
  examples>300_lines_in_main→move_to_resources/,
  verbose_explanations→compress_to_OCTAVE,
  circular_references→skills_don't_reference_CLAUDE.md
]

INSTEAD::[
  clear_descriptive_headings→agents_scan_naturally,
  anchor_text_references→see_patterns-library.md,
  keep_<500_lines→navigation_unnecessary,
  progressive_disclosure→main+resources/deep_dives,
  OCTAVE_format→semantic_density
]
```

---

## SESSION STATE & DEDUPLICATION

```octave
AUTOMATIC_TRACKING::[
  MECHANISM::[skills_injected_once_per_conversation, subsequent_detections_reuse_loaded],
  STATE_FILE::.claude/hooks/state/{conversation_id}-skills-suggested.json,
  MANUAL_LOADING::IF[autoInject:false]→Skill("skill-name")_tool
]
```

---

## TESTING & VALIDATION

```octave
BEFORE_DOCUMENTATION::[
  test_with::3+_real_world_scenarios,
  verify::triggers_activate_correctly,
  confirm::content_provides_guidance,
  NEVER::document_untested_skills
]
```

---

## SKILL HEALTH & MAINTENANCE

```octave
PRE_COMMIT_HOOK::[
  script::.claude/hooks/pre-commit/validate_skill_references.py,
  triggers::[changes_to_skills, internal_docs, src/files],
  validates::[file_links_exist, new_docs_referenced, pattern_coverage],
  behavior::[fail_on_broken_links, warn_on_missing_references]
]

MANUAL_CHECKLIST[/wrap_command]::[
  new_constants_utilities→Update_code_reuse_skill,
  new_docs→Add_links_to_resource_files,
  new_patterns→Update_promptTriggers_keywords,
  verify::skill-rules.json_sync_with_codebase
]

BEST_PRACTICES::[
  run_/wrap→end_of_sessions[check_skill_updates],
  trust_pre_commit_warnings→unreferenced_docs,
  keep_skill_rules.json_sync,
  update_descriptions→when_adding_triggers,
  test_after_updates→verify_triggers_work
]
```

---

## GOVERNANCE HIERARCHY

```octave
CLAUDE.md::[
  content::global_context+high_level_architecture+universal_style,
  references::1_line_pointers_to_skills
]

SKILLS::[
  content::domain_specific_guidance+patterns+procedures,
  triggered_by::context_keywords,
  examples::[python-best-practices, api-security, skill-developer]
]

SKILL_DEVELOPER::[
  content::skill_system_mechanics+trigger_patterns+500_line_rule,
  role::explains_complete_hierarchy,
  maintained_by::skill_expert_agent
]

CIRCULAR_PREVENTION::[
  skills_DON'T_reference_CLAUDE.md,
  CLAUDE.md_references_skills_one_line,
  skill_developer_maintains_hierarchy
]
```

---

## REFERENCE RESOURCES

For detailed information on specific topics (in resources/ directory):

- **trigger-types.md** - Complete keyword trigger guide
- **skill-rules-reference.md** - Full skill-rules.json schema
- **hook-mechanisms.md** - Deep dive into UserPromptSubmit flow
- **patterns-library.md** - Ready-to-use pattern collection
- **two-tier-system.md** - Complete architecture guide
- **skill-creation-guide.md** - Step-by-step creation

---

## QUICK REFERENCE

```octave
CREATE_NEW_SKILL::[
  1_SKILL.md_with_frontmatter,
  2_add_to_skill-rules.json,
  3_test_triggers,
  4_refine_patterns,
  5_keep<500_lines
]

CRITICAL_RULES::[
  500_line_limit[max_5_files>500, none>600],
  progressive_disclosure[use_resource_files],
  FORBIDDEN::[TOCs, line_numbers, circular_refs],
  TEST::3+_scenarios_before_documenting
]
```
