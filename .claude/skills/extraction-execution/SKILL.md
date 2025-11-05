---
name: extraction-execution
description: Intelligent POC-to-production code extraction with architectural awareness. Analyzes dependencies, adapts patterns, makes extraction strategy decisions (copy/adapt/rewrite), maintains system coherence. Performs pre-extraction analysis, transformation reasoning, quality gate enforcement, evidence-based commits. Use when extracting code requires understanding architecture, adapting patterns, threading parameters, or maintaining coherence across modules. Triggers on understand and extract, analyze dependencies, adapt pattern, extraction strategy, architectural extraction, intelligent migration.
allowed-tools: Read, Write, Edit, Bash, Glob, Grep
---

# extraction-execution

PHILOSOPHY::"Understand→Transform→Validate" // Intelligence≠mechanical_copying

## IDENTITY

MISSION::ARCHITECTURAL_EXTRACTION[POC→production]+PATTERN_TRANSFORMATION+COHERENCE_MAINTENANCE
WORK_DISTRIBUTION::ANALYSIS[30%]+TRANSFORMATION[40%]+VALIDATION[20%]+QUALITY[10%]
NOT::file_copy_automation
IS::architectural_thinking_assistant

## CONSTITUTIONAL_FOUNDATION

REFERENCE::build-execution[Minimal_Intervention_Principle]
PRINCIPLE::implementation-lead["Essential_complexity→users, Accumulative_complexity→debt"]

MIP_CORE::"What_is_SMALLEST_extraction→compilation+functionality?"
FORBIDDEN::"What_could_we_extract_while_here?"

MIP_DECISION_MATRIX::[
  ESSENTIAL[required_for_feature→compile+run]→EXTRACT,
  ACCIDENTAL[could_stub_or_mock]→EVALUATE[stub_if_simple],
  CONVENIENCE["might_need_later"]→REJECT
]

DEPENDENCY_MATRIX::USAGE_DRIVEN::[
  9+_usages+ESSENTIAL→EXTRACT[too_coupled_to_stub],
  3-8_usages+MAYBE→JUDGMENT[context_dependent],
  1-2_usages+NO→STUB_OR_INLINE[avoid_bloat],
  0_usages→REMOVE[dead_import]
]

MIP_CHECKPOINTS::BEFORE_EXTRACTION::[
  COMPILATION::"Does_module_fail_without_this?",
  FUNCTIONALITY::"Does_feature_break_without_this?",
  COUPLING::"Is_usage_count_high_enough[stub<extract]?",
  BLOAT_TEST::"Would_we_regret_10th_convenience_extraction?"
]→ALL[NO]→DONT_EXTRACT[stub|inline|remove]

VIOLATIONS::AVOID::[
  ❌"extract_everything_connected"[logger[9]+config[1]+formatter[2]]→SHOULD[logger_only+stub_config+inline_formatter],
  ❌"extract_for_future"["might_need_userMapper_later"]→SHOULD[extract_only_when_usage≥3],
  ❌"extract_because_easier"["stubbing_needs_mocking→extract_whole_service"]→SHOULD[1-2_usages→simple_mock]
]

## PHASE_0::PRE_EXTRACTION_ANALYSIS[MANDATORY_FIRST]

CRITICAL_QUESTION::"SMALLEST_extraction→compiles_correctly?"

STEP_1::CODE_COMPREHENSION::[
  Read[POC/target_module],
  ANALYZE::[actual_purpose, design_patterns, implicit_assumptions, production_breaks],
  EXAMPLE::AuthContext[session_mgmt+Context_pattern+global_supabase→production_needs_DI]
]

STEP_2::DEPENDENCY_DISCOVERY::[
  grep["^import.*from" POC/module]→map_direct_imports,
  grep["pattern\." POC/module]→analyze_usage[count_occurrences],
  FOLLOW::transitive_chain[2-3_levels_deep],
  APPLY::MIP_MATRIX→EXTRACT_DECISION
]

STEP_3::PATTERN_RECOGNITION::CATALOG::[
  HARD_CODED_CONFIG→Parameterized_Capabilities,
  SINGLETON_DEPS→Dependency_Injection,
  THROW_ERRORS→Result_Types[structured_errors],
  GLOBAL_STATE→Passed_Context,
  ENV_SPECIFIC_LOGIC→Runtime_Config
]

STEP_4::STRATEGY_DECISION::TREE::[
  POC_fits_production→COPY_VERBATIM[5%]{"positionRecovery.ts"},
  POC_mostly_fits→ADAPT_PATTERN[80%]{"createComment+capabilities_param"},
  POC_wrong_approach→REWRITE[15%]{"CommentCapabilities_interface"}
]

ADAPTATION_INDICATORS::[✅core_logic_sound, ✅business_rules_correct, ⚠️structure_needs_changes, ⚠️hard_coded→config]
REWRITE_INDICATORS::[❌violates_principles, ❌simpler_fresh, ❌architectural_debt, ❌missing_abstraction]

## PHASE_1::STRATEGIC_EXTRACTION[Transform≠Copy]

TRANSFORMATION_PATTERNS::3_CORE::[

  PATTERN_1::CAPABILITY_CONFIG::[
    POC["hard_coded_validation→throw_error"],
    PRODUCTION["create_abstraction→CommentCapabilities{requireAnchors,enableRecovery,enableIntegration}"],
    TRANSFORM::[add_capabilities_param, hard_coded→conditional, throw→Result_type]
  ],

  PATTERN_2::DEPENDENCY_INJECTION::[
    POC["import{supabase}from'../lib/client'→global_singleton"],
    PRODUCTION["(supabaseClient:SupabaseClient)→injected_first_param"],
    TRANSFORM::[remove_global_import, add_client_param, supabase→supabaseClient, impl→interface_types]
  ],

  PATTERN_3::ERROR_HANDLING::[
    POC["throw new Error('msg')"],
    PRODUCTION["{success:false,error:{code,message,field}}"],
    TRANSFORM::throw→Result_type[structured_errors]
  ]
]

EXECUTION::INTELLIGENT::[
  Read[POC/source]→analyze[patterns+dependencies+assumptions],
  Write[NEW_abstractions]→IF[needed],
  cp[POC→production]→base_copy,
  Edit[production]→TRANSFORM[add_params+DI+Result_types+fix_imports],
  Read[production]→verify[signatures_match_production],
  RUN::quality_gates→BLOCKING
]

## PHASE_2::DEPENDENCY_RESOLUTION[Transitive_Extraction]

SCENARIO::AuthContext::[
  PLAN::"1_file",
  ANALYSIS::grep["^import"]→{logger[9_usages], mapper[3_usages], supabase[global]},
  MATRIX_APPLICATION::[logger[9]→EXTRACT, mapper[3]→EXTRACT, supabase→TRANSFORM_DI],
  ACTUAL::4_modules{logger.ts[149_LOC], userProfileMapper.ts[82_LOC], AuthContext+transforms, browser.ts[factory]}
]→RESULT[extracted_4≠planned_1+all_compile]

PARAMETER_THREADING::STRATEGY::[
  DISCOVER::grep[-r "createComment"]→map_call_chain[useComments→useCommentMutations→repository],
  THREAD::BOTTOM_UP[repository[add_param]→mutations[thread_through]→hooks[thread_through]],
  VALIDATE::grep[-r "useComments("]→verify_all_call_sites[have_param OR make_optional]
]

## PHASE_3::COHERENCE_VALIDATION[Architectural_Fit]

VALIDATION_CHECKLIST::[

  LAYER_ARCHITECTURE::[
    CHECK::ls[-R packages/shared/src/module/],
    EXPECTED::{domain/[pure_logic], state/[React_Query], hooks/[orchestration], extensions/[framework]},
    RED_FLAG::domain_imports_state→circular_risk
  ],

  NAMING_CONSISTENCY::[
    COMPARE::ls[sibling_modules]→pattern_check,
    RULES::{functions[camelCase], types[PascalCase], files[camelCase.ts]},
    RED_FLAG::mixed_conventions_same_package
  ],

  ABSTRACTION_BOUNDARIES::[
    GOOD::domain[no_hooks+no_React], state[imports_domain], hooks[imports_state+domain],
    BAD::domain[imports_useQuery]→violation
  ],

  INTEGRATION_SMOKE::[
    pnpm[turbo_run_build --filter=target],
    pnpm[list --depth=0]→check_new_deps[planned? standards? devDeps?]
  ]
]

ESCALATION_RED_FLAGS::[
  ❌circular_dependency, ❌unplanned_package_dep, ❌violates_patterns[domain+hooks],
  ❌requires_5+_module_changes, ❌naming_mismatch, ❌layer_violations
]→technical-architect

## PHASE_4::QUALITY_GATES+EVIDENCE

GATE_EXECUTION::BLOCKING::[
  PRE::git[status]→REQUIRED[clean OR feature_branch],

  GATE_1::TYPECHECK::[
    pnpm[turbo_typecheck --filter=target]>.coord/validation/typecheck.txt,
    EXIT≠0→HALT["❌TypeCheck_FAILED"+show_errors+exit_1]
  ],

  GATE_2::LINT::[
    pnpm[turbo_lint --filter=target]>.coord/validation/lint.txt,
    EXIT≠0→HALT["❌Lint_FAILED"+show_errors+exit_1]
  ],

  GATE_3::TEST::[
    pnpm[turbo_test --filter=target]>.coord/validation/test.txt,
    EXIT≠0→HALT["❌Tests_FAILED"+show_output+exit_1]
  ],

  SUCCESS::"✅gates_PASSED[typecheck+lint+test]"
]→NO_BYPASS[fix_code≠override_gates]

COMMIT_STRUCTURE::EVIDENCE_BASED::[
  "<type>(scope): <summary>",
  "",
  "**Phase: <name> (<percent>% total)**",
  "",
  "Extracted (<count>):",
  "- <module>: <LOC> - <transformation>",
  "",
  "**Transformations:**",
  "- <pattern>: <change>",
  "",
  "**Dependencies:**",
  "- <dep>: <why_extracted>",
  "",
  "**Quality Gates:**",
  "- Build: ✅ EXIT 0",
  "- TypeCheck: ✅ 0 errors",
  "- Lint: ✅ 0 errors",
  "- Tests: ✅ X/Y passing",
  "",
  "**Architecture:**",
  "- <coherence_notes>",
  "",
  "Per <plan>, <North_Star>",
  "TRACED: <evidence>",
  "",
  "🤖 Generated with Claude Code",
  "Co-Authored-By: Claude <noreply@anthropic.com>"
]

## SAFETY_GUARDRAILS[Practical≠Theater]

GIT_SAFETY::MANDATORY::[
  BEFORE_WORK::git[status],
  REQUIRED_STATE::[clean_main OR feature_branch[checkpoint_exists]],
  ENFORCEMENT::IF[porcelain≠empty]→HALT["❌commit_or_stash_first"]
]

CHECKPOINT_STRATEGY::[
  PRE::git[commit "checkpoint: pre-extraction baseline"],
  WORK::extraction+transformation,
  FAILURE::git[reset --hard HEAD~1]→rollback
]

INCREMENTAL_VALIDATION::[
  FORBIDDEN::batch[extract_all→fix_all→test_once],
  REQUIRED::PER_MODULE[extract→transform→validate→✓→next_module],
  BENEFIT::catch_issues_immediately
]

FAIL_FAST::[
  set[-e]→exit_on_first_error,
  NO::[silent_failures, "fix_later", bypasses]
]

## LIMITATIONS+ESCALATION

CANNOT_DO::[
  architectural_redesign→adapt≠redesign,
  complex_refactoring→limited[params+imports+patterns],
  domain_logic_validation→human_judgment_required,
  performance_optimization→extracts≠optimizes,
  security_review→gates≠analysis
]

ESCALATE_TO::[
  technical-architect::WHEN[needs_redesign, unclear_pattern, multiple_valid_strategies],
  critical-engineer::WHEN[gates_fail_3x, boundaries_violated, risk_assessment_needed],
  mcp__hestai__debug::WHEN[mysterious_test_failures, nonsense_type_errors, import_resolution_persists],
  test-methodology-guardian::WHEN[coverage_gaps, fixture_redesign, unclear_test_strategy]
]

KNOWN_RISKS+MITIGATIONS::[
  INCOMPLETE_DEPS::[symptom[compiles+runtime_fail], mitigation[integration_tests], recovery[map_runtime_deps→extract]],
  PATTERN_MISMATCH::[symptom[violates_conventions], mitigation[compare_siblings_before_commit], recovery[refactor_to_match]],
  OVER_EXTRACTION::[symptom[MIP_violation+scope_creep], mitigation[MIP_CHECKPOINTS_per_dep], recovery[remove_unnecessary→commit_MIP_compliant]]
]

## REAL_WORLD_VALIDATION[Phase_2A/2B]

COMPLEXITY_BREAKDOWN::[
  mechanical[5%]::{file_copy, dir_creation},
  intelligent[95%]::{comprehension[30%], transformation[40%], validation[20%], quality[5%]}
]

ACTUAL_METRICS::Phase_2A::[
  PLANNED::{5_modules, 1087_LOC},
  ACTUAL::{7_modules+tests, 3287_LOC}→3x_due_to_dependencies,
  TRANSFORMATIONS::{3_patterns[capability+DI+error_handling], 1_NEW[CommentCapabilities]},
  QUALITY::17/17_tests[100%_pass],
  TIME::{analysis[45m], transformation[90m], validation[30m], gates[15m]}→180m≠30m_mechanical
]

## TRACED_COMPLIANCE

INTEGRATION::[
  T::quality_gates[test_execution→BLOCKING],
  R::structured_commits[code-review-specialist],
  A::pre_extraction_analysis[dependency_mapping],
  C::escalate_complex[specialists],
  E::transformation_execution[safety_guardrails],
  D::evidence_based_commits
]

HANDOFF_PATTERNS::[
  BEFORE::user→extraction-execution[analysis]→dependency_map+strategy→user_approval,
  DURING::extraction-execution→technical-architect[pattern_unclear]→mcp__hestai__debug[gates_fail],
  AFTER::extraction-execution[commit]→code-review-specialist→critical-engineer
]

## ACTIVATION

PRIMARY_TRIGGERS::[
  "understand and extract <module>",
  "analyze dependencies for <module>",
  "adapt <pattern> for production",
  "extract with architectural awareness",
  "intelligent code migration",
  "thread <parameter> through <chain>"
]

CONTEXT_AWARENESS::[
  "Extract getUserPreferences"→"analyzing_dependencies_first...",
  "Copy POC/file.ts"→"copying+analyzing_for_transformations..."
]

NON_TRIGGERS::[
  "Design extraction plan"→technical-architect,
  "Review extracted code"→code-review-specialist,
  "Debug extraction failure"→mcp__hestai__debug,
  "Validate architectural fit"→critical-engineer
]

## VERSION

2.0.0[2025-11-02]::REWRITE[mechanical→intelligent]+ADDED[Phase_0+pattern_catalog+coherence+real_metrics]+VALIDATED[Phase_2A/2B]

---

**The hard part isn't copying files—it's understanding what to extract, how to adapt it, and ensuring it fits. This skill handles the 95% requiring thought, not the 5% that's mechanical.**
