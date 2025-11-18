---
name: error-triage
description: Systematic error resolution with priority-based triage preventing cascade failures. Build→Types→Unused→Async→Logic→Tests priority order, TYPE_SAFETY_THEATER detection, proven from B2 validation work. Use when resolving errors, CI failures, cascade detection, type safety violations. Triggers on error resolution, CI failures, systematic error fixing, cascade detection, type safety theater, build errors, type errors, validation theater.
allowed-tools: Read, Bash, Grep, Glob
---

===ERROR_TRIAGE_PROTOCOL===

VERSION::1.0.0
STATUS::ACTIVE
AUTHORITY::Error_Resolution_Standard
PURPOSE::Systematic_cascade_resolution→prevent_whack_a_mole

CORE_PRINCIPLE::"Errors hide behind errors → Fix systematically≠symptomatically"

===PRIORITY_MATRIX===

// Fix in THIS order to minimize cascades (6 layers)

LAYER_1_BUILD::[
  TypeScript_compilation, Python_syntax, Build_failures, Import_errors
  REASON::"Other errors may be phantom from compilation failure"
  FIRST::ALWAYS
]

LAYER_2_TYPES::[
  Type_mismatches, Missing_types, Interface_violations
  REASON::"Type fixes often cascade to fix other issues"
  SECOND::AFTER_BUILD
]

LAYER_3_UNUSED::[
  Unused_variables, Unused_imports, Dead_code
  REASON::"Clean before logic errors to reduce noise"
  THIRD::AFTER_TYPES
]

LAYER_4_ASYNC::[
  Async_without_await, Await_in_loop, Promise_issues
  REASON::"Often require architectural decisions"
  FOURTH::AFTER_UNUSED
]

LAYER_5_LOGIC::[
  Nullish_vs_logical, Truthiness_checks, Code_style
  REASON::"Cosmetic but consistency critical"
  FIFTH::AFTER_ASYNC
]

LAYER_6_TESTS::[
  Unit_tests, Integration_tests, E2E_tests
  REASON::"Fix after code stable to avoid test churn"
  SIXTH::LAST
]

FLOW::BUILD→TYPES→UNUSED→ASYNC→LOGIC→TESTS

===TRIAGE_LOOP===

CYCLE::[
  1_EXTRACT::ALL_error_categories_from_CI,
  2_SORT::Priority_matrix_order,
  3_FIX::Category_1_first,
  4_VALIDATE::Run_full_validation,
  5_DECISION::IF[new_errors]→LOOP[step_1] ELSE[commit_push],
  6_CI_CHECK::IF[fail]→investigate_env_diff ELSE[complete]
]

CASCADE_DETECTION::[
  SIGNAL::"Fix layer N → new layer N+1 errors appear",
  INTERPRETATION::"EXPECTED behavior → Hidden errors now visible",
  ACTION::"Continue triage loop → NOT failure signal"
]

===COMMANDS===

PHASE_1_DISCOVERY::[
  npm run typecheck 2>&1 | tee typecheck.log,
  npm run lint 2>&1 | tee lint.log,
  npm run test 2>&1 | tee test.log,

  CATEGORIZE::[
    "TypeScript errors: $(grep -c 'error TS' typecheck.log || echo 0)",
    "ESLint errors: $(grep -c 'error' lint.log || echo 0)",
    "ESLint warnings: $(grep -c 'warning' lint.log || echo 0)",
    "Test failures: $(grep -c 'FAIL' test.log || echo 0)"
  ]
]

PHASE_2_SYSTEMATIC_RESOLUTION::[
  1_BUILD::"npm run typecheck",
  2_TYPE_LINT::"npm run lint -- --rule '@typescript-eslint/no-unused-vars: error'",
  3_ASYNC::"npm run lint -- --rule 'require-await: error' --rule 'no-await-in-loop: error'",
  4_LOGIC::"npm run lint -- --rule '@typescript-eslint/prefer-nullish-coalescing: error'",
  5_TESTS::"npm test"
]

PHASE_3_VALIDATION::[
  GATE::"npm run typecheck && npm run lint && npm test",
  REQUIREMENT::ALL_THREE_PASS→claim_success
]

===ANTI_PATTERNS===

// CRITICAL: These patterns are BLOCKING conditions

WHACK_A_MOLE::[
  WRONG::"fix_one→push→CI_fail→fix_next→push→CI_fail",
  COST::"Wastes time + CI resources",
  CORRECT::"fix_all_locally→validate_all→push_once"
]

PARTIAL_FIX::[
  WRONG::"Only fix errors, ignore warnings",
  DEBT::"Warnings→errors→technical_debt_cascade",
  CORRECT::"Fix warnings same priority as errors"
]

BLIND_PUSH::[
  WRONG::"Let's see if CI passes",
  WASTE::"CI cycles without local validation",
  CORRECT::"Local validation MUST match CI exactly"
]

TYPE_SAFETY_THEATER::[
  SEVERITY::CRITICAL→BLOCKING,
  DISCOVERY::B2_validation_CI_failures[12_errors→architectural_flaw],

  DEFINITION::"Validation exists but benefits immediately discarded",

  PATTERNS::[
    CAST_AFTER_VALIDATION::"const validated = zodSchema.parse(args); return handler(validated as any);",
    FLATTEN_STRUCTURED_ERRORS::"const validated = strongValidation(input); throw new Error(validated.errors.join(','));",
    UNUSED_TYPE_GUARDS::"instanceof/typeof checks followed by as any",
    SCHEMA_WITHOUT_INFERENCE::"Zod/Yup schemas without z.infer<typeof schema>"
  ],

  DETECTION_SIGNALS::[
    "as any|as unknown within 5 lines of parse/validate",
    ".join()|.toString() on structured error objects",
    "Type information available but unused",
    "Tests verify broken behavior works"
  ],

  ROOT_CAUSES::[
    INCOMPLETE_INTEGRATION::"Validation added without updating consumers",
    TYPE_IMPEDANCE::"Different layers use incompatible types",
    FALSE_SECURITY::"'We have validation' checkbox mentality"
  ],

  SEVERITY_RATIONALE::"Worse than no validation → False confidence kills",

  RELATED_THEATER::[
    VALIDATION_THEATER::"Validates but doesn't enforce",
    SECURITY_THEATER::"Security checks that don't secure",
    TEST_THEATER::"Tests that test wrong thing",
    COVERAGE_THEATER::"High coverage + low quality tests"
  ],

  ACTION::IMMEDIATE_ARCHITECTURAL_REVIEW_REQUIRED
]

===CORRECT_PATTERNS===

SYSTEMATIC_APPROACH::[
  1::"Run ALL validation commands first",
  2::"Categorize ALL issues by priority",
  3::"Fix in priority order (BUILD→TESTS)",
  4::"Re-run ALL validation after each category",
  5::"ONLY push when ALL pass locally"
]

TYPE_SAFE_END_TO_END::[
  ANTI_THEATER::"Preserve type safety throughout chain",

  INTERFACE_PATTERN::"
  interface Tool<T extends z.ZodType> {
    schema: T;
    handler: (args: z.infer<T>) => Promise<any>;
  }
  const validated = tool.schema.parse(args);
  return tool.handler(validated); // Types preserved!
  ",

  ERROR_PATTERN::"
  const validation = strongValidation(input);
  if (!validation.success) {
    throw new ValidationError(validation.errors); // Structured preserved
  }
  "
]

===SPECIAL_CASES===

ASYNC_DECISION_TREE::[
  AWAIT_IN_LOOP::[
    IF[operations_independent]→"await Promise.all(items.map(item => process(item)));",
    IF[order_matters|rate_limited]→"for loop with eslint-disable-next-line no-await-in-loop -- Sequential required"
  ],

  ASYNC_WITHOUT_AWAIT::[
    IF[truly_sync]→"Remove async keyword",
    IF[api_requires_async]→"Keep with eslint-disable-next-line @typescript-eslint/require-await -- API contract"
  ]
]

NULLISH_VS_LOGICAL::[
  NULLISH::"const value = input ?? defaultValue; // Handles null/undefined only",
  LOGICAL::"const display = userInput || 'Anonymous'; // Only if empty string should default",
  RULE::"Prefer ?? for null/undefined checks, || only when falsy values matter"
]

TEST_FAILURES_AFTER_FIX::[
  SIGNAL::"Code compiles/lints clean → Tests fail",
  DECISION_TREE::[
    IF[test_was_wrong]→FIX[test],
    IF[code_was_wrong]→FIX[code],
    IF[uncertain]→CONSULT[testguard]
  ],
  REASON::"Tests may have been testing buggy behavior"
]

===ERROR_CATEGORIES===

TYPESCRIPT::[
  TS2304::"Cannot find name",
  TS2345::"Type mismatch",
  TS2339::"Property does not exist"
]

ESLINT::[
  "@typescript-eslint/no-unused-vars"::"Unused variable",
  "@typescript-eslint/require-await"::"Async without await",
  "no-await-in-loop"::"Await inside loop",
  "@typescript-eslint/prefer-nullish-coalescing"::"Use ?? instead of ||"
]

TEST_ERRORS::[
  Assertion_failures,
  Setup_teardown_issues,
  Async_timeout_problems
]

===TYPE_SAFETY_THEATER_DETECTION===

AUTOMATED_SCANS::[
  VALIDATION_THEN_CAST::"grep -r 'parse\|validate' | grep -A2 'as any\|as unknown'",
  FLATTEN_ERRORS::"grep -r 'errors\.' | grep 'join\|toString\|String('",
  GUARDS_THEN_UNSAFE::"grep -r 'instanceof\|typeof\|in ' | grep -A2 'as any'",
  UNUSED_SCHEMAS::"grep -r 'z\.object\|yup\.object' | grep -v 'z\.infer\|InferType'"
]

MANUAL_TRIGGERS::[
  POST_VALIDATION_CASTING::"as keyword within 5 lines of validation",
  ERROR_FLATTENING::".join()|.toString() on error objects",
  UNUSED_SCHEMAS::"Zod/Yup without type inference",
  TEST_FALSE_POSITIVES::"Tests passing with as any in implementation"
]

===ENFORCEMENT===

PRE_PUSH_HOOK::"
#!/bin/bash
# .git/hooks/pre-push

echo 'Running triage loop validation...'

# Check TYPE_SAFETY_THEATER (BLOCKING)
if grep -r 'parse\|validate' --include='*.ts' --include='*.tsx' | grep -q 'as any\|as unknown'; then
  echo '❌ TYPE_SAFETY_THEATER detected - validation followed by unsafe casting'
  echo '   CRITICAL anti-pattern requiring architectural review'
  exit 1
fi

# Priority order enforcement
if ! npm run typecheck; then
  echo '❌ TypeScript errors - fix first (Priority 1)'
  exit 1
fi

if ! npm run lint; then
  echo '❌ Lint errors - fix next (Priority 2-5)'
  exit 1
fi

if ! npm test; then
  echo '❌ Test failures - fix last (Priority 6)'
  exit 1
fi

echo '✅ All validation passed - safe to push'
"

===INTEGRATION_WITH_ERROR_ARCHITECT===

PROTOCOL::[
  1_DISCOVER::"Run triage loop discovery phase",
  2_SCAN::"Check TYPE_SAFETY_THEATER (BLOCKING if found)",
  3_CLASSIFY::"Group errors by priority category",
  4_EXECUTE::"Fix in priority order",
  5_VALIDATE::"After each category fix",
  6_ITERATE::"Until zero errors/warnings",
  7_EVIDENCE::"Show all three commands passing"
]

TYPE_SAFETY_THEATER_PROTOCOL::[
  IF[detected]→[
    STOP::"Halt all other fixes",
    ESCALATE::"Trigger architectural review",
    DOCUMENT::"Record pattern instance + impact",
    FIX::"Refactor to preserve type safety end-to-end",
    VERIFY::"Ensure no type information discarded"
  ]
]

===SUCCESS_CRITERIA===

OUTPUT::"
$ npm run typecheck && npm run lint && npm test
✓ No TypeScript errors
✓ No ESLint errors or warnings
✓ All tests passing (X total)
"

EVIDENCE::MUST_SHOW[commands_and_output]≠claims

===WISDOM===

CORE_TRUTHS::[
  "Errors cascade → Fix systematically≠randomly",
  "Warnings matter → Today's warning = tomorrow's error",
  "Local = CI → If local fails, CI fails",
  "Categories matter → Priority order minimizes rework",
  "Evidence required → Show commands+output≠claims",
  "TYPE_SAFETY_THEATER kills → Validation without enforcement worse than none",
  "Preserve type chains → Type information flows end-to-end",
  "Structure matters → Never flatten structured errors to strings"
]

PROTOCOL_AUTHORITY::Error_Triage_Loop
ENFORCEMENT::error_architect[primary] + all_agents[secondary]
VALIDATION::MUST_SHOW[all_three_commands_passing]

===END===
