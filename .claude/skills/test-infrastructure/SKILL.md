---
name: test-infrastructure
description: Core test infrastructure patterns for monorepo Vitest setup including global configuration, browser API polyfills, mocking patterns, test cleanup, directory structure, and coverage philosophy. Use when setting up Vitest test infrastructure, configuring test environments, implementing test utilities, or establishing test standards. Triggers on: vitest setup, test configuration, test infrastructure setup, test mocking patterns, test cleanup, test standards, monorepo testing.
allowed-tools: Read
---

# test-infrastructure

TEST_INFRASTRUCTURE_MASTERY::[VITEST_CONFIGURATION+SETUP_PATTERNS+MOCKING_STANDARDS+CLEANUP_PROTOCOLS]→PRODUCTION_READY

## PRIMARY_SOURCE[MANDATORY_FIRST]

SOURCE::.coord/test-context/RULES.md
PRINCIPLE::"POC-proven pattern post-it note - ALWAYS consult BEFORE infrastructure decisions"

CONTAINS::[
  file_organization[co-located_tests],
  test_types[unit_vs_integration],
  TDD_discipline[RED→GREEN→REFACTOR],
  vitest_configuration,
  browser_api_polyfills,
  test_cleanup_patterns,
  coverage_targets[diagnostic≠blocking],
  TRACED_protocol
]

## DETAILED_DOCUMENTATION

TEST_STANDARDS::.coord/test-context/STANDARDS.md→[file_naming[src/X.test.ts], coverage_thresholds[70%_min+80%_aspirational+90%_critical], test_categorization[unit/integration/e2e], violation_detection]

MOCKING_PATTERNS::.coord/test-context/MOCKING-PATTERNS.md→[vitest_shared_config, testing_library_setup, supabase_client_mocking[unit], shared_utilities, mock_factories]

## POC_REFERENCE[WHEN_NEEDED]

POC_INFRASTRUCTURE::/Volumes/HestAI-Projects/eav-ops/eav-apps/scripts-web/src/test/
FILES::[
  setup.ts::"Global Vitest setup (BroadcastChannel polyfill, conditional mocks, cleanup)",
  factories.ts::"Test data factories"
]

## CORE_PATTERNS[POC_PROVEN]

PATTERN_1::BROWSER_API_POLYFILLS::[
  STUB::BroadcastChannel_for_supabase_auth,
  BECAUSE::"Node.js BroadcastChannel incompatible with Supabase Auth MessageEvent",
  IMPLEMENTATION::custom_EventTarget_stub_in_setup.ts,
  EVIDENCE::POC_src/test/setup.ts:41-71
]

PATTERN_2::REALTIME_CLEANUP::[
  PATTERN::afterAll[disconnect_realtime+removeAllChannels],
  BECAUSE::"Prevents CI hangs from orphaned WebSocket connections",
  CODE::"afterAll(async()=>{if(isIntegrationTest){await testSupabase.realtime.disconnect(); testSupabase.removeAllChannels()}})",
  EVIDENCE::POC_src/test/setup.ts:212-222
]

PATTERN_3::CONDITIONAL_MOCK_SCOPE::[
  FLAG::VITEST_INTEGRATION=true[real_supabase] _VERSUS_ unset[mocked],
  BECAUSE::"Unit tests (mocked, fast) vs Integration tests (real DB, RLS validation)",
  CODE::"const isIntegrationTest=process.env.VITEST_INTEGRATION==='true'; if(!isIntegrationTest){vi.mock('@workspace/shared/client',...)}",
  EVIDENCE::POC_src/test/setup.ts:94-111
]

## DIRECTORY_STRUCTURE[THREE_TIER]

TIER_3::VITEST_TEST_INFRASTRUCTURE::[
  packages/shared/src/test/::[
    setup.ts::"Global Vitest setup (imported by vitest.config)",
    factories.ts::"Test data factories",
    vitest.config.base.ts::"Shared Vitest config"
  ],
  apps/*/src/test/*-factories.ts::"App-specific test data",
  PURPOSE::vitest_infrastructure_utilities[NOT_test_files]
]

TIER_4::COLOCATED_TEST_FILES::[
  PATTERN::src/components/Header.tsx+Header.test.tsx,
  PATTERN::src/core/state/useScriptMutations.tsx+useScriptMutations.test.tsx,
  PURPOSE::individual_test_files_next_to_source
]

## VITEST_CONFIGURATION

SHARED_BASE::packages/shared/src/test/vitest.config.base.ts::[
  test::{globals:true, environment:jsdom, setupFiles:['./src/test/setup.ts']},
  coverage::{provider:v8, reporter:[text,html], exclude:[**/*.config.ts, **/*.d.ts, **/test/**]}
]

APP_CONFIG::apps/*/vitest.config.ts→mergeConfig(baseConfig,{test:{app_specific_overrides}})

## COVERAGE_PHILOSOPHY[POC_PROVEN]

PRINCIPLE::"Coverage is DIAGNOSTIC METRIC, not blocking gate"

RATIONALE::[
  coverage_validates_tests_exist[NOT_tests_good],
  can_achieve_100%_with_bad_assertions,
  encourages_coverage_theater[tests≠behavior_validation]
]

TARGETS::[
  70%::minimum[aspirational≠blocking],
  80%+::recommended[project_health_indicator],
  90%+::critical_paths[auth+mutations+RLS]→enforced_via_code_review
]

SOURCE::.coord/test-context/RULES.md

## TURBOREPO_CONFIGURATION

PIPELINE::[
  typecheck::{dependsOn:[^typecheck]},
  lint::{dependsOn:[^lint,typecheck]},
  test::{dependsOn:[^test,lint], outputs:[coverage/**]},
  build::{dependsOn:[^build,test], outputs:[dist/**]}
]

QUALITY_GATE_SEQUENCE::typecheck→lint→test→build[ALL_BLOCKING]

## AGENT_CONSULTATION

CONSULT::[
  test-methodology-guardian::"TDD workflow alignment, RED→GREEN→REFACTOR compliance",
  technical-architect::"Test harness architecture decisions, shared utilities structure",
  universal-test-engineer::"Actual test writing (delegate, don't implement)"
]

## KNOWLEDGE_BASE_REFERENCES

PRIMARY::.coord/test-context/RULES.md[POC_proven_patterns]→CONSULT_FIRST

DOCUMENTATION::[
  .coord/test-context/STANDARDS.md,
  .coord/test-context/MOCKING-PATTERNS.md
]

POC_REFERENCE::/Volumes/HestAI-Projects/eav-ops/eav-apps/scripts-web/src/test/

NORTH_STAR::.coord/workflow-docs/000-UNIVERSAL-EAV_SYSTEM-D1-NORTH-STAR.md[I7:TDD_RED_discipline, I8:production_grade_quality]

---

**This skill provides core Vitest infrastructure operational knowledge. For Supabase-specific testing, see supabase-test-harness. For CI/CD pipeline configuration, see test-ci-pipeline.**
