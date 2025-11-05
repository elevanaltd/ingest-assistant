# MCP Tools for Build Execution

MANDATE::"MCP_tools_MANDATORY_references_before_implementation→ensure_system_awareness + proper_library_usage"

## CONTEXT7::LIBRARY_DOCUMENTATION_AUTHORITY

PURPOSE::real-time_library_documentation_retrieval[validate_API_usage, understand_patterns, ensure_correct_implementation]

WHEN_TO_USE::[
  BEFORE_IMPL::[starting_third_party_library, implementing_framework_APIs, validating_patterns, checking_deprecations],
  DURING_IMPL::[confirming_signatures, understanding_return_types_and_errors, verifying_best_practices, security_considerations],
  DURING_DEBUG::[validating_assumptions, checking_known_issues, understanding_error_messages]
]

WORKFLOW::[
  resolve::"mcp__Context7__resolve-library-id({libraryName})→returns_Context7_ID",
  get_docs::"mcp__Context7__get-library-docs({context7CompatibleLibraryID, topic?, tokens?})→returns_current_docs"
]

ALWAYS_USE_FOR::[React_hooks, Next.js_routing, Supabase_operations, authentication, any_third_party_library]

VERIFICATION_PATTERN::"Check_Context7→implement_based_on_current_docs→verify_matches_documentation"

ANTI_PATTERNS::[
  DONT::[assume_API_from_memory[APIs_change], use_outdated_StackOverflow[without_verification], implement_without_checking_docs, skip_for_simple_usage[simple_breaks_too]],
  DO::[check_Context7_before_every_implementation, verify_signatures_match_current, understand_error_handling_from_docs, check_deprecation_warnings]
]

## REPOMIX::CODEBASE_ANALYSIS_AUTHORITY

PURPOSE::package_and_analyze_codebase[understand_system_context, identify_patterns, prevent_isolated_edits]

WHEN_TO_USE::[
  BEFORE_CHANGES::[understand_structures, find_similar_patterns, identify_usage_sites, analyze_system_impact],
  DURING_ANALYSIS::[architectural_patterns, code_organization, related_functionality, dependency_relationships],
  BEFORE_REFACTOR::[find_all_instances, understand_cross-file_dependencies, identify_integration_points, assess_scope]
]

WORKFLOW::[
  pack::"mcp__repomix__pack_codebase({directory, compress?, includePatterns?, ignorePatterns?})→returns_outputId",
  search::"mcp__repomix__grep_repomix_output({outputId, pattern, contextLines?, ignoreCase?})→returns_matches",
  read::"mcp__repomix__read_repomix_output({outputId, startLine, endLine})→returns_content"
]

SYSTEM_AWARENESS_WORKFLOW::[
  BEFORE_CHANGING_SIGNATURE::[pack_codebase→grep_function_usage→analyze_call_sites→map_ripple_effects→plan_migration_strategy],
  EXAMPLE::"processUser(id)→processUser(user) | Pack→Grep(15_sites)→Analyze(10_have_user, 5_need_fetch)→Decision[keep_both_signatures_for_gradual_migration]"
]

COMPRESSION::[
  WHEN::[repo>500_files, need_overview≠full_content, analyzing_structure≠implementation, token_budget_concerns],
  USE::"compress:true→tree-sitter_compression(~70%_reduction)",
  TRADEOFF::[PRESERVES[structure, signatures, exports, imports], REMOVES[implementation_details, comments], USE_COMPRESSED[initial_exploration], USE_UNCOMPRESSED[detailed_analysis]]
]

ANTI_PATTERNS::[
  DONT::[make_changes_without_grepping, assume_know_all_sites, skip_for_simple_changes, rely_on_IDE_search_only[misses_dynamic]],
  DO::[pack_and_grep_before_signature_changes, use_context_lines_for_patterns, analyze_systematically, document_migration_strategy]
]

## INTEGRATION_WITH_BUILD_PHILOSOPHY

SYSTEM_AWARENESS::"Code_change→system_ripple→map_impact_before_coding"

MCP_ENABLES::[Context7::external_system_contracts, Repomix::internal_system_structure]

WORKFLOW_MANDATORY::[
  understand_requirements→check_Context7[library_docs]→pack_Repomix[codebase]→analyze_ripple_effects→write_failing_test→implement_minimal→verify_with_tests→code_review
]

DECISION_FRAMEWORK::[
  BEFORE_CODE::[user_problem?, Context7_says?, Repomix_pattern?, maintenance_cost?, extend_existing?],
  BEFORE_REFACTOR::[current_pattern?, instance_count?, usage_contexts?, safe_to_change?, migration_strategy?]
]

## TOOL_SELECTION_MATRIX

TASK_TO_TOOL::[
  implement_library_feature→Context7,
  change_function_signature→Repomix,
  add_third_party_integration→BOTH,
  refactor_internal_pattern→Repomix,
  debug_library_error→Context7,
  understand_codebase_structure→Repomix,
  validate_API_usage→Context7,
  find_all_usages→Repomix,
  architectural_decision→BOTH
]

## CHECKPOINTS

BEFORE_IMPL::[Context7_consulted_for_libraries, Repomix_packed_for_system, ripple_effects_mapped, migration_strategy_documented, similar_patterns_identified]

DURING_IMPL::[library_usage_matches_Context7, code_follows_Repomix_patterns, changes_account_for_all_sites, tests_validate_actual_contracts]

BEFORE_REVIEW::[Context7_citations, Repomix_analysis_for_impact, ripple_mapping_evidence, migration_plan_if_applicable]

## PRODUCTION_PATTERNS

HOOK_IMPLEMENTATION::"Context7[current_React_patterns]→Repomix[existing_hook_patterns]→implement_following_both→tests_validate_contracts→structure_matches_patterns"

DATABASE_MIGRATION::"Repomix[grep_all_queries(43_sites_found)]→Context7[Supabase_migration_patterns]→plan_phased_migration[add_column→migrate_data→update_sites→remove_old]→execute_systematically→zero_downtime"

WISDOM::"Context7_understands_libraries | Repomix_understands_codebase | Use_both_for_system_awareness | NOT_optional→ESSENTIAL"
