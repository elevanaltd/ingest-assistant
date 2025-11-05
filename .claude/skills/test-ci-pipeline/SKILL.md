---
name: test-ci-pipeline
description: CI/CD pipeline configuration for monorepo testing including GitHub Actions workflows, Turborepo integration, two-tier quality gates (typecheck→lint→test→build), preview branch integration, retry logic, and environment management. Use when configuring CI pipelines, troubleshooting CI test failures, implementing preview deployments, or optimizing CI performance. Triggers on: CI configuration, github actions testing, CI pipeline, turborepo CI, quality gates, preview integration, CI troubleshooting.
allowed-tools: Read
---

# test-ci-pipeline

CI_PIPELINE_MASTERY::[GITHUB_ACTIONS+TURBOREPO+QUALITY_GATES+PREVIEW_INTEGRATION+RETRY_LOGIC]→PRODUCTION_READY

## PRIMARY_SOURCE[MANDATORY_FIRST]

SOURCE::.coord/test-context/RULES.md
PRINCIPLE::"POC-proven pattern post-it note - ALWAYS consult BEFORE infrastructure decisions"

CONTAINS::[
  CI_pipeline[2-tier_strategy],
  environment_variables,
  port_assignments,
  TRACED_protocol
]

## DETAILED_DOCUMENTATION

CI_PIPELINE::.coord/test-context/CI-PIPELINE-CONFIGURATION.md→[turborepo_config, github_actions, quality_gates[typecheck→lint→test], secret_management, parallel_execution, artifact_storage]

## POC_REFERENCE[WHEN_NEEDED]

PROVEN_CI::/Volumes/HestAI-Projects/eav-ops/eav-apps/scripts-web/.github/workflows/ci.yml
KEY_SECTIONS::[
  lines_43-120::local_supabase_setup[retry_logic],
  lines_100-109::migration_application[supabase_db_reset],
  lines_144-161::test_user_creation[auth_admin_api],
  lines_236-489::preview_branch_integration,
  lines_258-285::preview_ready_wait[graceful_skip]
]

## CRITICAL_PATTERNS[POC_PROVEN]

PATTERN_1::CI_STRATEGY_TWO_TIER::[
  TIER_1::quality_gates[all_commits]::[
    local_supabase_start,
    migrations_via_reset,
    create_test_users,
    RUN::typecheck→lint→test_unit→build,
    EVIDENCE::POC_ci.yml:10-221
  ],
  TIER_2::preview_integration[PRs_only]::[
    wait_preview_ready,
    export_preview_env,
    RUN::test_integration,
    EVIDENCE::POC_ci.yml:236-489
  ]
]

PATTERN_2::RETRY_LOGIC::[
  PATTERN::supabase_start[3_attempts+300s_timeout+GoTrue_health_check],
  BECAUSE::"Handles transient Docker/network failures in CI",
  IMPLEMENTATION::loop[cleanup_between_attempts+health_check_before_proceed],
  EVIDENCE::POC_ci.yml:52-98
]

PATTERN_3::PREVIEW_BRANCH_GRACEFUL_SKIP::[
  PATTERN::CI_handles_missing_preview[exit_0≠failure],
  BECAUSE::"Preview branches deleted after merge OR not created for docs-only PRs",
  CODE::"if(!preview_exists)→echo('No preview - skipping')→exit_0",
  EVIDENCE::POC_ci.yml:[336-345, 376-392]
]

## TURBOREPO_CONFIGURATION

PIPELINE::[
  typecheck::{dependsOn:[^typecheck]},
  lint::{dependsOn:[^lint,typecheck]},
  test::{dependsOn:[^test,lint], outputs:[coverage/**]},
  build::{dependsOn:[^build,test], outputs:[dist/**]}
]

QUALITY_GATE_SEQUENCE::typecheck→lint→test→build[ALL_BLOCKING]

## ENVIRONMENT_CONFIGURATION

ROOT_ENV::[
  APP_URLS::[VITE_APP_URL_SCRIPTS:http://localhost:3001, VITE_APP_URL_SCENES:http://localhost:3002, ports_3003-3007]
]

CI_OVERRIDES::[
  SUPABASE_PREVIEW_URL:https://preview-branch.supabase.co,
  SUPABASE_PREVIEW_ANON_KEY:sb_publishable_preview_*,
  VITEST_INTEGRATION:true
]

## DIRECTORY_STRUCTURE

TIER_1::OPERATIONAL_CI_SCRIPTS::[
  scripts/create-test-users-via-api.mjs::"Used by GitHub Actions (ci.yml:158)",
  PURPOSE::CI_operational_scripts[run_outside_vitest]
]

TIER_2::TEST_SETUP_VALIDATION::[
  tests/migration-validation/::"Migration testing",
  tests/setup/create-test-users.ts::"Auth Admin API setup helper",
  PURPOSE::test_setup_scripts+validation_helpers
]

## AGENT_CONSULTATION

CONSULT::[
  test-methodology-guardian::"TDD workflow alignment, RED→GREEN→REFACTOR compliance",
  technical-architect::"Test harness architecture decisions, shared utilities structure",
  critical-engineer::"Production risk from test infrastructure failures"
]

## KNOWLEDGE_BASE_REFERENCES

PRIMARY::.coord/test-context/RULES.md[POC_proven_patterns]→CONSULT_FIRST

DOCUMENTATION::[
  .coord/test-context/CI-PIPELINE-CONFIGURATION.md
]

POC_REFERENCE::[
  /Volumes/HestAI-Projects/eav-ops/eav-apps/scripts-web/.github/workflows/ci.yml
]

NORTH_STAR::.coord/workflow-docs/000-UNIVERSAL-EAV_SYSTEM-D1-NORTH-STAR.md[I7:TDD_RED_discipline, I8:production_grade_quality]

---

**This skill provides CI/CD pipeline operational knowledge. For core Vitest infrastructure, see test-infrastructure. For Supabase-specific testing, see supabase-test-harness.**
