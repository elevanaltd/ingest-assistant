# /audit - Requirements Steward Audit Command

## COMMAND_INTERFACE
```bash
/audit [scope] [--phase GATE] [--evidence BUNDLE]

SCOPE (optional, defaults to 'full'):
  quick         # 5-10min pre-transition sanity check
  alignment     # 15-30min canonical ↔ operational sync
  north-star    # 30-60min I1-I10 immutables compliance
  phase         # 20-45min specific gate validation (requires --phase)
  full          # 1-2hr comprehensive constitutional validation

OPTIONS:
  --phase       # Target specific gate (D0.1, D1.3, B0.1, etc.)
  --evidence    # Reference evidence bundle ID (optional)

EXAMPLES:
  /audit                              # Full comprehensive audit
  /audit quick                        # Quick pre-transition check
  /audit alignment                    # Canonical alignment validation
  /audit north-star                   # Immutables I1-I10 compliance
  /audit phase --phase D1.3           # Validate D1.3 gate completion
  /audit full --evidence session-047  # Full audit with evidence reference
```

## INVOCATION_AGENT
```octave
AGENT_SELECTION::[
  quick→system-steward[ADVISORY_authority],
  alignment→requirements-steward[BLOCKING_if_drift],
  north-star→requirements-steward[BLOCKING_authority],
  phase→requirements-steward[BLOCKING_for_progression],
  full→requirements-steward[BLOCKING_authority]
]

TIER_ARCHITECTURE::[
  TIER1_exploration→clink[gemini]→quick_audits[ADVISORY],
  TIER2_validation→clink[codex]→alignment_north-star_phase[BLOCKING],
  TIER3_implementation→Task()→full_audits_constitutional[BLOCKING]
]

RECOMMENDED_ROUTING::[
  quick→clink[gemini, role:default]→rapid_sanity_check,
  alignment→Task[requirements-steward]→proper_role_boundaries,
  north-star→Task[requirements-steward]→constitutional_authority,
  phase→Task[requirements-steward]→gate_validation,
  full→Task[requirements-steward]→comprehensive_ruling
]
```

## PROTOCOL_LOADING
```octave
MANDATORY::load_RS-AUDIT_protocol_before_execution

PROTOCOL_PATH::"/Users/shaunbuswell/.claude/protocols/RS-AUDIT.md"

AGENT_INSTRUCTIONS::"
You are executing the /audit command with scope: {scope}

**Load Protocol**: RS-AUDIT.md (constitutional audit framework)

**Audit Type**: {audit_type_details_from_protocol}

**Your Task**:
1. DISCOVER canonical documents (workflow-docs/*CHECKLIST*, *NORTH-STAR*)
2. READ operational documents (PROJECT-CONTEXT, CURRENT-CHECKLIST, PROJECT-ROADMAP)
3. COMPARE operational claims vs canonical structure
4. CLASSIFY violations (CRITICAL→HIGH→MEDIUM→LOW)
5. RULE with verdict (GO/CONDITIONAL-GO/NO-GO)

**Evidence Standards**: See RS-AUDIT.md EVIDENCE_STANDARDS section
**Ruling Structure**: See RS-AUDIT.md RULING_STRUCTURE section
**Report Format**: See RS-AUDIT.md REPORT_FORMAT section (004-REPORT precedent)

{scope_specific_instructions}
"
```

## SCOPE_DEFINITIONS
```octave
QUICK_AUDIT::{
  duration::5-10_minutes,
  agent::system-steward_or_workspace-architect[ADVISORY],
  dimensions::[previous_phase_gates_checked, quality_gates_passing, spot_check_citations],
  output::GO/WARN/ESCALATE_to_full,
  instructions::"
    Rapid validation before phase transition:
    - Previous phase gates checked in canonical checklist?
    - Quality gates passing (TypeScript✅ ESLint✅ Tests✅ Build✅)?
    - Spot-check 3-5 North Star citations exist?
    - Any obvious drift (phase names mismatch)?

    Output: GO (proceed) / WARN (issues noted) / ESCALATE (run full audit)
  "
}

ALIGNMENT_AUDIT::{
  duration::15-30_minutes,
  agent::requirements-steward[BLOCKING_if_drift_detected],
  dimensions::[canonical_operational_sync, undocumented_phases, skipped_gates, doc_coherence],
  output::ALIGNED/DRIFT_DETECTED→full_audit_required,
  instructions::"
    Canonical ↔ Operational alignment verification:

    1. READ canonical checklist (workflow-docs/*CHECKLIST*.md)
       - Extract official phase structure (D0.*, D1.*, B0.*, B1.*, etc.)
       - Identify unchecked gates

    2. READ operational documents (PROJECT-CONTEXT, CURRENT-CHECKLIST, ROADMAP)
       - Extract claimed current phase
       - Identify completed work claims

    3. COMPARE:
       - Does operational phase exist in canonical structure?
         Example: Operational claims 'B1_03' but canonical defines 'B1.0-B1.4' → DRIFT
       - Are previous gates checked?
         Example: Operational in B1 but D1.1-D1.3 unchecked → DRIFT (skipped foundation)
       - Do document versions align?
         Example: ROADMAP says 83% but CONTEXT says 90% → DRIFT (inconsistency)

    4. RULE:
       - ALIGNED: Proceed with documentation updates
       - DRIFT DETECTED: Block sync-coord, require remediation or full audit

    Output: Verdict + specific drift findings + remediation requirements
  "
}

NORTH-STAR_AUDIT::{
  duration::30-60_minutes,
  agent::requirements-steward[BLOCKING_authority],
  dimensions::[immutable_citations, implementation_traces, violations, architectural_alignment],
  output::COMPLIANT/VIOLATIONS→remediation_required,
  instructions::"
    North Star I1-I10 immutables compliance verification:

    1. READ North Star (workflow-docs/*NORTH-STAR*.md)
       - Extract I1-I10 immutable requirements
       - Understand each immutable mandate

    2. READ implementation documents/code
       - Review architectural decisions
       - Check implementation patterns

    3. VERIFY each immutable:
       - I1 Component Spine: Stable identity maintained? Evidence?
       - I7 TDD Discipline: Git log shows TEST→FEAT? Evidence?
       - I8 Quality Gates: Zero errors enforced? Evidence?
       - (Continue through all relevant immutables)

    4. CHECK citations:
       - Do decisions cite immutables in I# format with line numbers?
       - Are citations accurate (not vague references)?

    5. RULE:
       - COMPLIANT: All immutables satisfied with evidence
       - VIOLATIONS: Specific immutables violated, remediation required

    Output: Verdict + immutable-by-immutable assessment + violations + remediation
  "
}

PHASE-GATE_AUDIT::{
  duration::20-45_minutes,
  agent::requirements-steward[BLOCKING_for_phase_progression],
  dimensions::[gate_evidence, artifacts, quality_criteria, blocker_resolution],
  output::GATE_PASSED/INCOMPLETE→remediation_required,
  instructions::"
    Specific gate completion validation (--phase required):

    1. IDENTIFY gate from canonical checklist
       - Locate gate definition (D1.3, B0.1, etc.)
       - Extract completion criteria
       - Identify required evidence

    2. VERIFY completion:
       - Checkbox marked in canonical checklist?
       - Evidence artifacts exist (migrations, test outputs, benchmarks)?
       - Quality criteria met (performance targets, test coverage, etc.)?
       - Blockers resolved?

    3. VALIDATE evidence:
       - Artifacts referenced by canonical checklist exist?
       - Test outputs show actual passing (not 'expected to pass')?
       - Performance benchmarks documented with real measurements?
       - Review approvals obtained?

    4. RULE:
       - GATE PASSED: All criteria met with evidence
       - INCOMPLETE: Specific missing items, remediation required

    Output: Verdict + criteria checklist + missing items + remediation
  ",
  example::"
    /audit phase --phase D1.3

    Validates: Gate D1.3: Component Summary View Performance
    Checks:
    - [ ] Seed test data: 500 components across multiple scripts
    - [ ] Run EXPLAIN ANALYZE on component_summary view
    - [ ] Measure query latency: <50ms target
    - [ ] Document performance findings

    Evidence Required:
    - Database seed script or migration
    - EXPLAIN ANALYZE output (actual SQL execution plan)
    - Query latency measurements (with timestamps)
    - Performance documentation in coordination/reports/
  "
}

FULL_AUDIT::{
  duration::1-2_hours,
  agent::requirements-steward[BLOCKING_signature_required],
  dimensions::[canonical_alignment, north_star, phase_gates, process_discipline, quality_gates],
  output::comprehensive_report[004-REPORT_format]→GO/CONDITIONAL-GO/NO-GO,
  instructions::"
    Comprehensive constitutional validation:

    Execute ALL audit dimensions from RS-AUDIT.md:
    1. CANONICAL_ALIGNMENT (alignment audit scope)
    2. NORTH_STAR_COMPLIANCE (north-star audit scope)
    3. PHASE_GATE_COMPLETION (sequential gate verification)
    4. PROCESS_DISCIPLINE (TDD, TRACED, quality gates)
    5. QUALITY_GATES (actual outputs verification)

    Produce detailed report following 004-REPORT precedent:
    - VERDICT: GO / CONDITIONAL-GO / NO-GO
    - NORTH STAR VALIDATION: Aligned items + violations
    - CHECKLIST RECONCILIATION: Gate status + actions
    - TECHNICAL DEBT RULING: Fix now / defer / accept
    - PROCESS CORRECTION DIRECTIVE: Required updates
    - PATH FORWARD: Immediate / short-term / strategic
    - CONSTITUTIONAL COMPLIANCE GRADE: Scores + overall verdict

    Store report: coordination/reports/XXX-REPORT-[SCOPE]-AUDIT-[DATE].md
  ",
  mandatory_at::[phase_boundaries, repeated_violations, constitutional_concerns, production_deployment]
}
```

## AUTOMATIC_INTEGRATION
```octave
SYNC-COORD_TRIGGERS::[
  drift_detected→invokes_"/audit alignment"_automatically,
  phase_boundary→invokes_"/audit full"_mandatory_before_docs_update,
  north_star_violation→invokes_"/audit north-star"_immediate
]

AGENT_ESCALATION::[
  holistic-orchestrator→system_coherence_concern→requests_"/audit full",
  technical-architect→architectural_decision→requests_"/audit north-star",
  implementation-lead→phase_complete→requests_"/audit phase --phase {GATE}"
]

BLOCKING_BEHAVIOR::[
  IF[audit_returns_NO-GO]→BLOCK[all_work_progression]→REQUIRE[remediation],
  IF[audit_returns_CONDITIONAL-GO]→PROCEED[with_constraints]→TRACK[requirements],
  IF[audit_returns_GO]→PROCEED[with_confidence]→DOCUMENT[validation]
]
```

## OUTPUT_FORMAT
```octave
QUICK_AUDIT_OUTPUT::"
✓ Previous phase gates checked
✓ Quality gates passing (TypeScript✅ ESLint✅ Tests 553/700✅ Build✅)
⚠ Minor drift: Test count variance (653→700, document change)
✓ North Star citations present (spot-checked 5 decisions)

**Verdict**: GO (proceed to next phase)
**Recommendation**: Document test count increase in PROJECT-CONTEXT
"

ALIGNMENT_AUDIT_OUTPUT::"
## Canonical Alignment Audit

**Verdict**: DRIFT DETECTED → Full audit required

**Canonical Structure** (002-UNIVERSAL-EAV_SYSTEM-CHECKLIST.md):
- D0.1, D0.2, D0.3 (Pre-flight validation)
- D1.1, D1.2, D1.3 (Database foundation)
- B0.1, B0.2 (Architecture validation)
- B1.0, B1.1, B1.2, B1.3, B1.4 (Foundation implementation)

**Operational Claims**:
- CURRENT-CHECKLIST.md:3 → 'B1_03 Shared Library Implementation'
- PROJECT-CONTEXT.md:6 → 'B1_03... 90% complete'

**Drift Identified**:
1. UNDOCUMENTED PHASE: 'B1_03' not in canonical structure (canonical defines B1.0-B1.4)
2. SKIPPED FOUNDATION: Operational in B1 but D1.1-D1.3 gates UNCHECKED in canonical
3. DOCUMENTATION CONFLICT: PROJECT-CONTEXT line 278 claims 'B0 Pre-Flight 80% UNBLOCKED'

**Remediation Required**:
- Map B1_03 work to canonical gates B1.0-B1.4 OR formally amend checklist
- Complete D1.1-D1.3 gates before claiming B1 work
- Reconcile PROJECT-CONTEXT internal contradictions

**Blocked**: SYNC-COORD updates blocked until remediation or full audit validates approach
"

FULL_AUDIT_OUTPUT::"
[Comprehensive report stored at coordination/reports/005-REPORT-FULL-AUDIT-2025-10-19.md]

**VERDICT**: NO-GO

**Summary**:
- 8 process breaches identified (skipped D1 gates, undocumented phases)
- I7/I8 immutables violated (test failures = RED state)
- Remediation required before B1 progression

**Immediate Actions**:
1. Fix BroadcastChannel (3h) → tests passing
2. Execute D1.1-D1.3 gates (1-2 days) → foundation complete
3. Reconcile documentation (0.5 day) → alignment restored

See full report for detailed findings, evidence citations, and remediation plan.
"
```

## USAGE_GUIDELINES
```octave
WHEN_TO_USE::[
  quick→before_phase_transition[rapid_green_light],
  alignment→SYNC-COORD_detected_drift[automatic_escalation],
  north-star→validating_architectural_decisions[immutables_compliance],
  phase→gate_completion_verification[specific_milestone],
  full→phase_boundaries[mandatory]_or_constitutional_concerns[major_issues]
]

WHO_CAN_INVOKE::[
  developers→quick_audit[self_validation_before_requesting_review],
  agents→alignment/north-star/phase[escalation_for_validation],
  SYNC-COORD→alignment/full[automatic_on_drift_or_boundary],
  requirements-steward→any_scope[constitutional_authority]
]

FREQUENCY::[
  quick→as_needed[developer_discretion],
  alignment→on_drift_detection[automatic],
  north-star→on_architectural_decisions[as_needed],
  phase→on_gate_completion[per_milestone],
  full→phase_boundaries[mandatory]+quarterly[scheduled]+on_concern[escalation]
]
```

## ANTI_PATTERNS
```octave
AVOID::[
  audit_for_bureaucracy[audits_that_dont_validate_anything],
  checkbox_audits[marking_complete_without_verification],
  rubber_stamping[GO_without_investigation],
  validation_theater[audit_that_misses_drift],
  audit_drift[auditors_not_following_protocol],
  scope_creep[quick_audit_becoming_full_investigation]
]

REQUIRED::[
  evidence_based[actual_artifacts_not_claims],
  scope_adherence[quick_stays_quick, full_is_comprehensive],
  clear_verdicts[GO/CONDITIONAL-GO/NO-GO_unambiguous],
  actionable_output[specific_remediation_not_vague_recommendations],
  protocol_compliance[RS-AUDIT.md_followed_exactly]
]
```

## MISSION
```octave
PURPOSE::USER_ACCESSIBLE_CONSTITUTIONAL_VALIDATION
METHOD::SCOPE_BASED_AUDIT_INVOCATION[quick→alignment→north-star→phase→full]
OUTCOME::CLEAR_GO_NO-GO_GUIDANCE[prevents_drift+enables_rapid_validation]
INTEGRATION::SYNC-COORD_automatic_escalation+agent_manual_request+user_direct_invocation
WISDOM::"Audit with precision, rule with clarity, prevent drift prophetically"
AGENT_ROUTING::"Task(requirements-steward) for BLOCKING audits (alignment, north-star, phase, full), clink(gemini) for ADVISORY quick checks"
```
