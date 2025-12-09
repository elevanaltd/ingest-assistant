# Create Compressed North Star Summary

Compress an existing North Star document into a high-fidelity summary: $ARGUMENTS

## METHODOLOGY: Compression Through Semantic Binding

This command uses pattern-based compression to reduce North Star documents from 300-500 lines to 50-70 lines while preserving 100% decision-logic fidelity.

**Core Principle:**
> "If it's not needed to answer: 'Do I lazy-load the full document now?' → it goes in the full document"

---

## PHASE 0: PRE-COMPRESSION VALIDATION (MANDATORY)

### Constitutional Compliance Check

**BLOCKING GATE:** Source North Star must be constitutionally compliant before compression.

**Validation Protocol:**

```octave
PRE_COMPRESSION_GATES::[
  MILLERS_LAW::5_to_9_immutables_REQUIRED[
    SCAN::count_immutables_in_source[I1-IN],

    IF[count<5]→ERROR[
      "North Star lacks clarity - minimum 5 immutables required",
      "ACTION: Review with north-star-architect to identify missing immutables",
      "CANNOT_COMPRESS: insufficient_structure"
    ],

    IF[count>9]→ERROR[
      "North Star violates Miller's Law - cognitive overload (7±2 limit)",
      "ACTION: Run forced ranking protocol to reduce to 5-9 immutables",
      "CANNOT_COMPRESS: constitutional_violation"
    ],

    IF[count=5-9]→PROCEED[
      "Miller's Law compliance verified",
      "Immutables: {count} (within 5-9 range)",
      "COMPRESSION_AUTHORIZED: constitutional_compliance_confirmed"
    ]
  ],

  EVIDENCE_SUMMARY::section_present_REQUIRED[
    SCAN::look_for_section["## EVIDENCE SUMMARY" | "## **EVIDENCE SUMMARY**"],
    VALIDATES::[
      pressure_testing_results[X/X_passed_Immutability_Oath],
      system_agnostic_validation[X/X_passed_Technology_Change_Test],
      ceremony_completion[timestamp_present]
    ],

    IF[missing]→WARN[
      "Evidence Summary section not found",
      "SOURCE: North Star may lack validation evidence",
      "RECOMMENDATION: Update source with Evidence Summary before compression"
    ]
  ],

  YAML_FRONTMATTER::metadata_present_REQUIRED[
    SCAN::check_document_header[lines_1-20],
    VALIDATES::[
      approval_date[YYYY-MM-DD],
      validation_chain[validated_by: critical-engineer, requirements-steward],
      phase_status[phase: D1, status: APPROVED]
    ],

    IF[missing]→WARN[
      "YAML front-matter not found",
      "RECOMMENDATION: Add metadata block per ns-create.md standards"
    ]
  ],

  COMMITMENT_CEREMONY::timestamp_present_REQUIRED[
    SCAN::look_for_approval["APPROVED: ✅ YYYY-MM-DD" | "approval_date:"],
    VALIDATES::binding_authority_established,

    IF[missing]→WARN[
      "Commitment Ceremony timestamp not found",
      "RECOMMENDATION: Complete ceremony protocol before compression"
    ]
  ]
]
```

**Execution Flow:**

1. **Read source North Star document**
2. **Count immutables** (scan for I1, I2, ... IN pattern)
3. **Check Miller's Law compliance** (5-9 range)
4. **Scan for Evidence Summary section**
5. **Scan for YAML front-matter**
6. **Scan for Commitment Ceremony timestamp**

**If MILLERS_LAW fails (BLOCKING):**
```
❌ COMPRESSION BLOCKED: Source North Star non-compliant

Constitutional Violations:
- Immutables: {count} (must be 5-9 per Miller's Law)
- Miller's Law: {VIOLATED | COMPLIANT}
- Evidence Summary: {PRESENT | MISSING} ⚠️
- YAML Front-matter: {PRESENT | MISSING} ⚠️
- Commitment Ceremony: {TIMESTAMPED | MISSING} ⚠️

REQUIRED ACTIONS:
1. Run /ns-check on source North Star to validate compliance
2. If >9 immutables: Apply forced ranking protocol (ns-create.md Phase 2)
3. If <5 immutables: Work with north-star-architect to identify missing requirements
4. Update source document to constitutional compliance
5. Re-run /ns-summary-create after source validated

CANNOT PROCEED: Constitutional violations must be resolved in source before compression
```

**If Evidence/Front-matter/Ceremony missing (WARNINGS):**
```
⚠️  COMPRESSION PROCEEDING WITH WARNINGS

Source North Star has structural gaps:
- Evidence Summary: MISSING (recommended for validation traceability)
- YAML Front-matter: MISSING (recommended for version control)
- Commitment Ceremony: MISSING (recommended for binding authority)

COMPRESSION WILL CONTINUE but summary quality may be degraded.

RECOMMENDATION: Update source North Star per ns-create.md standards:
- Add Evidence Summary section (validation metrics)
- Add YAML front-matter (metadata block)
- Complete Commitment Ceremony (timestamped approval)
```

---

**Validation Complete:** Source North Star passes constitutional compliance gate
- Immutables: {count} ✅ (within 5-9 range)
- Miller's Law: COMPLIANT ✅
- Ready for compression

Proceeding to Phase 1: Discovery & Analysis...

---

## PHASE 1: DISCOVERY & ANALYSIS

### Step 1: Read the Full North Star Document

```
ACTION: Read(full_north_star_path)
EXTRACT::[
  immutable_count[I1-IN],
  assumption_count[A1-AN],
  decision_gate_count[D0,B0-B4],
  major_sections[boundaries,constrained_variables,integration_points,success_criteria]
]
```

**What You're Looking For:**
- Total immutables (determines line budget)
- Assumption confidence levels (identify which stay vs compress)
- Gate status (which are blocking vs informational)
- Scope boundaries (identify out-of-scope items)

### Step 2: Identify Shared Patterns Across Projects

If creating multiple summaries, scan for:
- **Quality Patterns**: TDD discipline + Production-grade quality (I7+I8 archetype)
- **Integrity Patterns**: Single source of truth + Zero data loss + Cross-app consistency (I3+I4+I10 archetype)
- **Temporal Patterns**: Chronological ordering + Identifier immutability (I1+I6 archetype)
- **Agency Patterns**: Human oversight + Human primacy (I2+I7 archetype)
- **Resilience Patterns**: Offline capability (I5 archetype)

Document inheritance relationships:
```octave
SHARED_PATTERN::pattern_name[component_immutables]::[
  EAV_MONOREPO::[I#, I#],
  INGEST_ASSISTANT::[I#, mapped_concept],
  CEP_PANEL::[I#_optional, inherited]
]
```

### Step 3: System-Agnostic Validation

**Check for Technology-Specific Language:**

```octave
TECHNOLOGY_NEUTRALITY_SCAN::[
  TECHNOLOGY_VIOLATIONS::[
    "PostgreSQL|MySQL|MongoDB" → "Structured persistence with ACID",
    "React|Vue|Angular" → "UI framework",
    "Vercel|Netlify|Railway" → "Serverless platform",
    "Redis|Memcached" → "Caching layer",
    "Next.js|Nuxt|SvelteKit" → "Full-stack framework"
  ],

  FOR_EACH_IMMUTABLE::scan_principle_and_why[
    IF[technology_specific_language_found]→WARN[
      "Technology-specific language in I#: {detected_term}",
      "RECOMMENDATION: Translate to system-agnostic capability",
      "EXAMPLE: '{technology}' → '{capability_description}'"
    ]
  ],

  SUMMARY_GUIDANCE::[
    "Preserve system-agnostic principle in summary",
    "Move specific implementation choices to Constrained Variables",
    "Maintain Technology Change Test compliance"
  ]
]
```

**Example Warning:**
```
⚠️  Technology-specific language detected:
- I3: "PostgreSQL database" → Recommend: "Structured persistence with ACID guarantees"
- I8: "Vercel deployment" → Recommend: "Serverless platform with <200ms response"

These will be preserved in summary but consider updating source North Star
for better system-agnostic compliance per ns-create.md Technology Change Test.
```

---

## PHASE 2: LINE BUDGET CALCULATION

```octave
LINE_BUDGET_FORMULA::[
  HEADER::3_lines[title+authority+version],
  INHERITANCE::4_lines[parent_deps+inherited+optional],
  IMMUTABLES::3N_lines[title+principle+WHY+status per immutable],
  ASSUMPTIONS::M_lines[one_per_assumption_max],
  CONSTRAINED_VARIABLES::12_lines_max[top_3-4_with_IMMUTABLE/FLEXIBLE/NEGOTIABLE],
  SCOPE_BOUNDARIES::10_lines_max[3-4_IS_items+3-4_IS_NOT_items],
  DECISION_GATES::1_line[reference_to_phases],
  AGENT_ESCALATION::12_lines_max[routing_for_key_decision_types],
  TRIGGERS::6-8_lines[when_to_load_full_doc],
  PROTECTION::3_lines[violation_protocol],
  FOOTER::2_lines[status+reference],

  TOTAL_BUDGET::56+3N+M_lines,
  TARGET::100-130_lines[for_300-500_line_originals]
]
```

**Revised realistic targets (5-9 immutable compliance):**
- EAV Monorepo (8 immutables): 56 + (3×8) + 8 = 88 lines (3.4:1 compression from 300 lines)
- Ingest Assistant (7 immutables): 56 + (3×7) + 8 = 85 lines (4.7:1 compression from 400 lines)
- CEP Panel (5 immutables): 56 + (3×5) + 8 = 79 lines (6.3:1 compression from 500 lines)

**Key change**: Include WHY reasoning (3 lines per immutable, not 1). This is non-negotiable for agent decision-making.

---

## PHASE 3: COMPRESSION RULES

### Rule 1: Immutables (Title + ONE-Line WHY + Status)

**STAY IN SUMMARY:**
```octave
I1::COMPONENT_SPINE_IDENTITY::[
  PRINCIPLE::stable_identity_maintained_throughout_production_pipeline,
  WHY::business-critical_traceability+downstream_foreign_key_references,
  STATUS::PROVEN[120/120_tests]
]
```

**MOVE TO FULL DOC (These elaborate, not guide decisions):**
- Detailed justifications and examples
- Pressure-test scenarios
- Edge case handling
- Implementation details
- Empirical evidence (full citations)

**Compression Format:**
```
I#::TITLE::[
  PRINCIPLE::core_rule_one_sentence,
  WHY::business_or_technical_reason[1-2_lines],
  STATUS::status_with_proof_artifact
]
```

**Key Rule**: Keep the ONE-LINE WHY. This is what agents need to make decisions. Without it, they cannot evaluate if a proposed change violates the immutable.

Example:
```
❌ WRONG (no WHY):
I1::COMPONENT_SPINE_IDENTITY→PROVEN

✅ CORRECT (WHY included):
I1::COMPONENT_SPINE_IDENTITY::[
  PRINCIPLE::every_content_piece_maps_to_component_with_stable_identity,
  WHY::downstream_apps_reference_via_foreign_keys+traceability_required,
  STATUS::PROVEN[Scripts_MVP_120/120]
]
```

### Rule 2: Assumptions (Status + Owner + Phase Only)

**STAY IN SUMMARY:**
```octave
A1::DEPLOYMENT_PLATFORM[95%]→RESOLVED[production_validated]
A2::COMPONENT_SPINE_WRITE_PROTECTION[60%]→PENDING[tech-arch@B1]
A3::PERFORMANCE_VALIDATION[70%]→PENDING[implementation-lead@B1]
```

**MOVE TO FULL DOC (These detail, not filter):**
- Confidence percentage explanation
- VALIDATION procedure details
- Specific CONTINGENCY plans
- Detailed RISK descriptions
- Examples and test scenarios

**Compression Format:**
```
A#::TITLE[confidence%]→STATUS[owner@phase]
```

Confidence encoding:
```
✅ 80-95% = RESOLVED|HIGH_CONFIDENCE
⚠️  60-79% = PENDING|MEDIUM_CONFIDENCE
❌ <60% = CRITICAL|LOW_CONFIDENCE_VALIDATION_REQUIRED
```

### Rule 3: Decision Gates (Reference Pattern Only)

**STAY IN SUMMARY:**
```octave
GATES::D0[DONE]→B0[PENDING]→B1[PENDING]→B2[PENDING]→B3[PENDING]→B4[PENDING]
```

**MOVE TO FULL DOC (Everything else):**
- Gate entry criteria
- Gate exit criteria
- Gate validation checklist
- Gate decision examples
- Gate approval authorities

### Rule 4: Constrained Variables (IMMUTABLE/FLEXIBLE/NEGOTIABLE Only)

**STAY IN SUMMARY (Top 3-4 most critical):**
```octave
CONSTRAINED_VARIABLES::[
  EDIT_CONFLICT_PREVENTION::[
    IMMUTABLE::prevent_data_loss_from_concurrent_edits,
    FLEXIBLE::Smart_Edit_Locking[heartbeat_timeout_approach]|Operational_Transform[complex],
    NEGOTIABLE::timeout_duration[15-60min]|heartbeat_frequency[5-min_baseline]
  ],

  DEPLOYMENT_INFRASTRUCTURE::[
    IMMUTABLE::serverless_HTTP_API_<200ms_response_at_production_scale,
    FLEXIBLE::Vercel|Railway|any_serverless_meeting_requirements
  ]
]
```

**MOVE TO FULL DOC (Everything else):**
- All remaining constrained variables
- Detailed rationale for IMMUTABLE boundaries
- Implementation guidance for FLEXIBLE options
- Tuning parameters for NEGOTIABLE items
- Anti-patterns for each variable

**Key Rule**: Include IMMUTABLE/FLEXIBLE/NEGOTIABLE structure. This shows what can be changed vs what's locked.

### Rule 5: Scope Boundaries (Key IS / IS_NOT Items)

**STAY IN SUMMARY (Top 3-4 of each):**
```octave
SCOPE_BOUNDARIES::[
  IS::[
    ✅::data_collection_structuring[client_specs→LLM_extraction→fields],
    ✅::content_creation_pipeline[LLM_scripts→multi-user_editing],
    ✅::production_workflow_orchestration[VO+scene_planning+edit_guidance],
    ✅::multi-client_operations[RLS_isolation+role-based_access]
  ],

  IS_NOT::[
    ❌::project_management_system[SmartSuite_owns_PROJECT_level],
    ❌::media_file_storage[LucidLink_primary],
    ❌::video_hosting_platform[Vimeo_for_delivery],
    ❌::video_editing_software[Adobe/Final_Cut_external]
  ]
]
```

**MOVE TO FULL DOC:**
- All remaining scope items
- Rationale for each exclusion
- Integration points with excluded systems
- Architectural implications of boundaries

**Key Rule**: Keep 3-4 most important IS/IS_NOT per project. These prevent scope creep.

### Rule 6: Agent Escalation Routing

**STAY IN SUMMARY:**
```octave
ESCALATION_ROUTING::[
  requirements-steward::[
    "violates I#" :: immutable_violation,
    "scope_boundary_question" :: is_this_in_scope?,
    "immutable_change_requested" :: north_star_amendment
  ],

  technical-architect::[
    "deployment_strategy|database_design" :: architecture_decisions,
    "cross-app_integration" :: integration_design,
    "constrained_variable_negotiation" :: flexible_option_selection
  ],

  implementation-lead::[
    "assumption_A#_validation" :: execute_validation_plan,
    "B1_foundation_tasks" :: build_phase_execution
  ]
]
```

**MOVE TO FULL DOC:**
- Detailed decision logic for each routing
- Historical examples of each escalation type
- Authority chain for conflicts
- Approval requirements per decision type

**Key Rule**: Keep agent routing compact. This ensures right specialist handles right decision.

### Rule 7: Triggers (When to Load Full Document)

**TRIGGER PRIORITIZATION (Evidence-Based from Surveyor Audit):**

```octave
TIER_1_CRITICAL_AUTO_LOAD::[
  "violates I#" :: immutable_conflict[load_immediately],
  "schema_mismatch|contract_violation" :: ecosystem_breaks[load_immediately],
  "RLS_policy+security" :: data_isolation_risk[load_immediately],
  "component_ID+FK_broken" :: cross-app_spine_failure[load_immediately]
]

TIER_2_HIGH_PRIORITY::[
  "data_loss|corrupted_metadata" :: integrity_violation[load_on_detection],
  "offline+Supabase_unavailable" :: resilience_question[load_on_detection],
  "shot_number+reordered" :: temporal_ordering_violation[load_on_detection],
  "AI+no_override" :: human_oversight_bypassed[load_on_detection]
]

TIER_3_CONTEXTUAL::[
  "B0|B1|B2_gate" :: decision_gate_approaching[load_when_near],
  "assumption_A#" :: validation_planning[load_when_executing],
  "deployment_strategy|architecture" :: design_decisions[load_when_architecting],
  "constrained_variable_negotiation" :: flexibility_questions[load_when_needed]
]
```

**STAY IN SUMMARY (Copy Trigger Categories):**
```octave
LOAD_FULL_NORTH_STAR_IF::[
  "violates I1|I2|I3|..." :: immutable_conflict_detected,
  "deployment|architecture|database" :: design_decisions_needed,
  "assumption A#" :: validation_evidence_required,
  "scope boundary" :: is_this_in_scope_question,
  "B0|B1|B2|B3|B4" :: decision_gate_approaching,
  "integration|contract" :: cross-system_design_needed
]
```

**MOVE TO FULL DOC:**
- Detailed trigger explanations
- Examples of when each trigger fires
- Historical trigger patterns
- Agent escalation details

**Key Rule**: TIER 1 triggers = auto-load immediately (blocking issues). TIER 2 = high priority (load on detection). TIER 3 = contextual (load when approaching that phase).

### Rule 8: Inheritance Chain (Compressed Reference)

**WHEN TO INCLUDE INHERITANCE SECTION:**

```octave
INHERITANCE_DECISION_TREE::[
  INCLUDE_WHEN::[
    SUB_PROJECT::project_inherits_from_parent_North_Star[EAV_Universal→CEP_Panel],
    MODULE::component_inherits_from_system[Scenes_Web→EAV_Monorepo],
    SHARED_IMMUTABLES::multiple_projects_share_immutables[IA+CEP+EAV]
  ],

  OMIT_WHEN::[
    STANDALONE_PROJECT::no_parent_dependencies[new_greenfield_project],
    TOP_LEVEL_SYSTEM::is_the_parent_itself[EAV_Universal_top_of_hierarchy],
    NO_SHARED_CONTEXT::single_project_in_isolation
  ]
]
```

**STAY IN SUMMARY (if this is a sub-project/module):**
```octave
INHERITANCE::[
  PARENT_NS::link_to_parent[immutables_inherited],
  INHERITED::[I#_name, I#_name],
  MODIFIED::[I#_name→variant_reason],
  OPTIONAL::[I#_name]
]
```

**MOVE TO FULL DOC (Everything else):**
- Detailed parent NS dependency mapping
- Assumption validation sequencing
- Immutable modification explanations

**Example:**
```octave
INHERITANCE::[
  PARENT_NS::EAV_Universal[8_immutables],
  INHERITED::[I7_TDD, I8_Production_Grade],
  OPTIONAL::[I10_Database_Coordination],
  BLOCKING_ASSUMPTION::EAV_A2_deployment_platform_validated_MUST_PASS_before_CEP_B1
]
```

### Rule 9: Protection Clause (Violation Protocol Only)

**STAY IN SUMMARY:**
```octave
IF::agent_detects_work_contradicting_North_Star[D2-B5],
THEN::[
  STOP::current_work_immediately,
  CITE::specific_requirement_violated[I#],
  ESCALATE::to_requirements-steward
]

ESCALATION_FORMAT::"NORTH_STAR_VIOLATION: [work] violates [I#] because [evidence]"
```

**MOVE TO FULL DOC:**
- Resolution options (CONFORM | AMEND | ABANDON)
- Authority chain details
- Historical amendment examples
- Scope boundary conflict resolution

---

## PHASE 4: SEMANTIC BINDING (Optional but Powerful)

If this is one of multiple summaries, add one section:

```octave
SEMANTIC_BINDING::[
  SHARED_WITH_OTHER_PROJECTS::[
    I7::TDD_DISCIPLINE[EAV_MONOREPO+INGEST_ASSISTANT+CEP_PANEL],
    I8::PRODUCTION_QUALITY[EAV_MONOREPO+CEP_PANEL],
    I5::OFFLINE_CAPABILITY[EAV_MONOREPO+INGEST_ASSISTANT+CEP_PANEL],
    I10::DATABASE_CONSISTENCY[EAV_MONOREPO+CEP_PANEL]
  ]
]
```

This prevents duplication when summaries are loaded together and creates navigation between related projects.

---

## PHASE 4B: COMPRESSION STRATEGY OPTIMIZATION (Optional)

For fine-tuning compression based on content complexity:

```octave
IMMUTABLE_FORMAT_SELECTOR::[
  ULTRA_COMPRESSED[1_line]::[
    WHEN::WHY_obvious_from_title[I7_TDD_DISCIPLINE→constitutional_mandate_universally_understood],
    FORMAT::I#::TITLE→STATUS[proof],
    EXAMPLE::I7::TDD_RED_DISCIPLINE→PROVEN[constitutional_mandate]
  ],

  EXPANDED[3_lines]::[
    WHEN::WHY_requires_explanation[I6_APP_SPECIFIC_STATE→shared_vs_owned_distinction_not_obvious],
    FORMAT::I#::TITLE::[PRINCIPLE+WHY+STATUS],
    EXAMPLE::I6::COMPONENT_SPINE_WITH_APP_SPECIFIC_STATE::[
      PRINCIPLE::shared_spine_tables+app-specific_state_tables,
      WHY::independent_evolution+shared_traceability+deployment_flexibility,
      STATUS::PROVEN[technical-architect_validated]
    ]
  ],

  DEFAULT::expanded_format[PRINCIPLE+WHY+STATUS]→safer_choice_when_uncertain
]

ASSUMPTION_FORMAT_SELECTOR::[
  ULTRA_COMPRESSED::[
    WHEN::assumption_RESOLVED_with_high_confidence[A1_95%→production_validated],
    FORMAT::A#::TITLE[confidence%]→RESOLVED[proof]
  ],

  EXPANDED::[
    WHEN::assumption_PENDING_critical_validation_needed[A3_70%→user_research@B2],
    FORMAT::A#::TITLE[confidence%]→PENDING[owner@phase+validation_method],
    RATIONALE::implementation-lead_needs_to_know_HOW_to_validate
  ],

  DEFAULT::status+owner+phase[validation_method_in_full_doc]
]
```

**When to Use Ultra-Compression:**
- Immutable WHY is universally understood (TDD, Production Quality)
- Assumption is fully resolved with empirical proof
- Space savings critical (13+ immutables in summary)

**When to Use Expanded Format:**
- Immutable WHY requires domain-specific explanation
- Assumption validation method unclear without context
- Agents need reasoning to make decisions

---

## PHASE 5: VALIDATION CHECKLIST

Before finalizing summary, verify:

```octave
VALIDATION::[
  ✓::each_immutable_includes_PRINCIPLE+WHY+STATUS[WHY_is_critical],
  ✓::each_assumption_has_STATUS+OWNER+PHASE,
  ✓::constrained_variables_show_IMMUTABLE/FLEXIBLE/NEGOTIABLE[3-4_top_items],
  ✓::scope_boundaries_list_3-4_IS_and_3-4_IS_NOT_items,
  ✓::agent_escalation_routing_covers_key_decision_types,
  ✓::decision_gates_show_clear_flow[D0→B0→...→B4],
  ✓::trigger_conditions_would_catch_all_misalignments,
  ✓::protection_clause_violation_format_is_clear,
  ✓::total_lines_between_100-130[count_carefully],
  ✓::original_fidelity_preserved[decision_logic_complete],
  ✓::summary_enables_80%_of_decisions_WITHOUT_loading_full_doc
]
```

**Fidelity Test - The Real Question:**
Can an agent reviewing a proposed change answer these WITHOUT loading the full document?
- "Does this change violate I#?" → Can determine from PRINCIPLE + WHY
- "Can we negotiate this requirement?" → Can determine from IMMUTABLE/FLEXIBLE/NEGOTIABLE
- "Is this in scope?" → Can determine from IS/IS_NOT boundaries
- "Which specialist should review this?" → Can determine from ESCALATION_ROUTING

If the answer to all four is YES → summary is adequate.
If NO to any → add missing information to that section.

---

## PHASE 6: FORMAT & OUTPUT

**Output Filename Convention:**
```
PATTERN: 000-{PROJECT}-D1-NORTH-STAR-SUMMARY.oct.md
LOCATION: .coord/workflow-docs/ (same directory as full North Star document)

EXAMPLES:
- 000-INGEST_ASSISTANT-D1-NORTH-STAR-SUMMARY.oct.md
- 000-CEP_PANEL_METADATA_ARCHITECTURE-D1-NORTH-STAR-SUMMARY.oct.md
- 000-UNIVERSAL-EAV_SYSTEM-D1-NORTH-STAR-SUMMARY.oct.md
```

**Compression Ratio Calculation:**
```octave
FORMULA: original_lines / summary_lines = ratio:1

EXAMPLES:
- 380 lines / 155 lines = 2.5:1 ratio
- 528 lines / 135 lines = 3.9:1 ratio
- 301 lines / 185 lines = 1.6:1 ratio

ACCEPTABLE_RANGE:
- Minimum: 3:1 (insufficient if lower = too verbose)
- Maximum: 10:1 (excessive if higher = fidelity at risk)
- Target: 3:1 to 6:1 for most documents
```

Final summary structure:

```octave
# {PROJECT_NAME} - North Star Summary

**AUTHORITY**: D1 Phase Deliverable
**APPROVAL**: ✅ or ⚠️ [status]
**FULL_DOCUMENT**: [link_to_full]
**VERSION**: 1.0-OCTAVE-SUMMARY

---

## INHERITANCE CHAIN (If Sub-Project)

[Parent NS dependencies, inherited immutables, optional immutables, blocking assumptions]

---

## IMMUTABLES ({N} Total)

[PRINCIPLE + WHY + STATUS per immutable - see Rule 1]

---

## CRITICAL ASSUMPTIONS ({M} Total)

[Status + owner + phase only]

---

## CONSTRAINED VARIABLES (Top 3-4)

[IMMUTABLE/FLEXIBLE/NEGOTIABLE structure - see Rule 4]

---

## SCOPE BOUNDARIES

[3-4 IS items + 3-4 IS_NOT items - see Rule 5]

---

## DECISION GATES

[D0→B0→B1→B2→B3→B4 with status]

---

## AGENT ESCALATION

[Routing for key decision types - see Rule 6]

---

## TRIGGER PATTERNS (Load Full North Star When...)

[Copy trigger categories exactly]

---

## PROTECTION CLAUSE

[Violation protocol format only]

---

## SEMANTIC BINDING (If Multi-Project)

[Shared immutables across projects]

---

**STATUS**: Ready for implementation
**COMPRESSION**: [original_lines]→[summary_lines] ([ratio]:1)
**FIDELITY**: 100% decision logic preserved
**INHERITANCE**: [Explicit parent dependencies documented]
**FULL_DETAILS**: See [full_document_name]
```

---

## EXECUTION STEPS

When user invokes `/ns-summary-create {project_name}`:

1. **Read full North Star** from project's .coord/workflow-docs/
2. **Extract immutables, assumptions, gates** (Phase 1)
3. **Calculate line budget** (Phase 2)
4. **Apply compression rules** (Phase 3)
5. **Add semantic binding** if multi-project context (Phase 4)
6. **Validate fidelity** (Phase 5)
7. **Output final summary** (Phase 6)
8. **Report metrics**: original→compressed ratio, fidelity score, trigger validation

---

## COMMON PITFALLS TO AVOID

❌ **DON'T**: Include multi-paragraph WHY_IMMUTABLE justifications with examples, edge cases, and detailed empirical evidence
✅ **DO**: PRINCIPLE + one-line WHY + STATUS (agents need WHY to evaluate violations - see Rule 1)

❌ **DON'T**: List every assumption's validation procedure details (VALIDATION method, CONTINGENCY plans, RISK scenarios)
✅ **DO**: Status + owner + phase only (validation details in full doc - see Rule 2)

❌ **DON'T**: Explain each trigger condition with examples and historical patterns
✅ **DO**: List trigger categories with TIER prioritization (details in full doc - see Rule 7)

❌ **DON'T**: Describe resolution options for violations (CONFORM | AMEND | ABANDON + authority chain)
✅ **DO**: Show violation protocol format only (STOP → CITE → ESCALATE - see Rule 9)

❌ **DON'T**: List ALL constrained variables (full doc may have 7+) or ALL scope boundaries (full doc may have 10+)
✅ **DO**: Keep top 3-4 constrained variables with IMMUTABLE/FLEXIBLE/NEGOTIABLE structure (prevents over-constraint - see Rule 4) and top 3-4 IS/IS_NOT items (prevents scope creep - see Rule 5)

❌ **DON'T**: Include inheritance section for top-level systems (they ARE the parent)
✅ **DO**: Use inheritance decision tree to determine if section needed (see Rule 8)

❌ **DON'T**: Use ultra-compressed format when WHY reasoning is domain-specific or non-obvious
✅ **DO**: Use expanded format (PRINCIPLE+WHY+STATUS) when agents need reasoning to make decisions (see Phase 4B)

---

## SUCCESS CRITERION

A North Star summary is successful when:

1. **Compression**: Achieves 3:1 to 6:1 reduction (realistic based on immutable count)
   - Formula: `original_lines / summary_lines = ratio:1`
   - Example: 380 lines → 95 lines = 4:1 ratio ✓
   - Minimum acceptable: 3:1 (lower = too verbose)
   - Maximum safe: 10:1 (higher = fidelity risk)

2. **Fidelity**: 100% of decision-making logic preserved
   - All immutables include PRINCIPLE + WHY + STATUS
   - Top 3-4 constrained variables with IMMUTABLE/FLEXIBLE/NEGOTIABLE
   - Top 3-4 IS/IS_NOT scope boundaries
   - Agent escalation routing for key decision types

3. **Usability**: Answers "Should I load full document?" without needing full document
   - Trigger patterns comprehensive (catch all misalignment scenarios)
   - Agent can answer 4 fidelity test questions (see Phase 5)

4. **Clarity**: Each section is scannable in <30 seconds
   - OCTAVE structure with semantic operators
   - No prose paragraphs (compressed patterns only)

5. **Completeness**: No missing immutables, assumptions, or trigger categories
   - Cross-reference full doc to verify all I# codes present
   - All critical assumptions (A#) with status visible
   - All decision gates (D0, B0-B4) referenced
