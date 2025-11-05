---
name: supabase-operations
description: Supabase operational knowledge for migrations, RLS optimization, MCP tool benchmarks, and ADR-003 compliance. Use when validating database migrations, optimizing Row-Level Security policies, checking MCP tool performance, or ensuring Supabase operational standards. Triggers on: migration validation, RLS patterns, Supabase benchmarks, ADR-003, database state tracking, schema governance.
allowed-tools: Read, mcp__supabase__list_tables, mcp__supabase__list_extensions, mcp__supabase__list_migrations, mcp__supabase__get_advisors
---

# Supabase Operations Skill

SUPABASE_MASTERY::[MIGRATION_VALIDATION+RLS_OPTIMIZATION+MCP_BENCHMARKS+ADR_003_COMPLIANCE]→PRODUCTION_OPERATIONAL_EXCELLENCE

## CAPABILITIES[SUPPORTING_DOCUMENTATION]

MIGRATION_VALIDATION::migration-protocols.md::[
  7_step_workflow,
  backwards_compatible_schema_changes,
  multi_app_deployment_safety
]

RLS_OPTIMIZATION::rls-optimization.md::[
  proven_patterns→<50ms_query_performance,
  InitPlan_optimization,
  policy_consolidation
]

MCP_BENCHMARKS::mcp-benchmarks.md::[
  performance_characteristics,
  best_practices,
  production_measurements
]

ADR_003_COMPLIANCE::adr-003-compliance.md::[
  backwards_compatible_migration_governance,
  verification_checklist
]

STATE_TRACKING::state-tracking.md::[
  local_remote_sync_validation,
  database_state_awareness_procedures
]

## INVOCATION_TRIGGERS

MIGRATION_OPERATIONS::[
  before_applying_migrations→validation_checklist,
  after_schema_changes→compliance_verification,
  debugging_migration_divergence
]

RLS_DESIGN::[
  optimizing_slow_queries_with_RLS,
  designing_new_security_policies,
  benchmarking_RLS_performance_impact
]

DATABASE_OPERATIONS::[
  selecting_appropriate_MCP_tools,
  validating_current_database_state,
  checking_security_performance_advisors
]

COMPLIANCE::[
  verifying_ADR_003_backwards_compatibility,
  multi_app_testing_requirements,
  emergency_rollback_procedures
]

## TOOL_RESTRICTIONS[READ_ONLY_INSPECTION]

ALLOWED_TOOLS::[
  Read::"Access local migration files and documentation",
  mcp__supabase__list_tables::"Inspect current schema structure",
  mcp__supabase__list_extensions::"Verify installed extensions",
  mcp__supabase__list_migrations::"Compare local/remote migration state",
  mcp__supabase__get_advisors::"Check security/performance compliance"
]

SECURITY_JUSTIFICATION::"Skills guide operations but don't mutate state. Write operations (apply_migration, execute_sql) remain with authorized agents."

## INTEGRATION

CONSULTED_BY::[
  supabase-expert[domain_authority_with_BLOCKING],
  implementation-lead[migration_execution],
  technical-architect[schema_design]
]

PROVIDES::[
  migration_validation_checklists,
  RLS_optimization_patterns,
  MCP_tool_selection_guidance,
  compliance_verification_procedures
]
