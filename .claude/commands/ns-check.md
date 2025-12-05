# North Star Alignment Check

Validates current work against project North Star to prevent mission drift.

## USAGE

```bash
/ns-check [work-description]
/ns-check [north-star-path] [work-description]
```

**Examples:**
```bash
/ns-check "adding ML recommendation engine"
# Auto-discovers North Star, validates ML feature

/ns-check .coord/workflow-docs/000-CUSTOM-NORTH_STAR.md "migrating to microservices"
# Uses specified North Star for validation
```

## WHEN TO USE
- At start of significant work
- Before major architectural decisions
- When proposing scope changes
- At phase transitions (D0→D1, B0→B1, B1→B2, etc.)
- When North Star violations suspected
- At project milestones

## NORTH STAR DISCOVERY

**Automatic Discovery** (when no path specified):
1. Search `.coord/workflow-docs/000-*-NORTH_STAR.md`
2. If multiple found → list options, ask user to specify
3. If none found → error with guidance to create North Star first

**Manual Path** (when path provided):
- First argument looks like path (`*.md` or contains `/`) → use as North Star path
- Remaining arguments → work description

**Discovery Pattern:**
```python
# Parse arguments
if $ARGUMENTS[0] matches *.md or contains /:
    north_star_path = $ARGUMENTS[0]
    work_description = $ARGUMENTS[1:]
else:
    north_star_path = glob(".coord/workflow-docs/000-*-NORTH_STAR.md")
    work_description = $ARGUMENTS
```

## EXECUTION PATTERN

**MANDATORY: Delegate to requirements-steward via Task tool**

```python
# Step 1: Discover North Star
north_star_path = discover_north_star($ARGUMENTS)

# Step 2: Read North Star document
Read(north_star_path)

# Step 3: Delegate to requirements-steward
Task(subagent_type="requirements-steward",
     prompt=f"""Execute North Star alignment validation.

**North Star Document:** {north_star_path}
**Current Work:** {work_description}

## YOUR TASK

Validate current work against North Star immutables to prevent mission drift.

### 1. Constitutional Health Check
- Verify 8 immutables structure (Miller's Law compliance)
- Confirm Evidence Summary section present
- Validate YAML front-matter with validation chain
- Check Commitment Ceremony timestamp

### 2. Work Analysis
Parse work description for:
- **Feature additions**: Scope expansion beyond IS section?
- **Architectural changes**: Immutable violations (I1-I8)?
- **Technology choices**: System-agnostic compliance?
- **Process deviations**: Quality gate bypasses (TDD, code review)?

### 3. Immutable Validation
For each immutable (I1-I8), assess:
- **ALIGNED**: Work supports/respects immutable
- **VIOLATED**: Work contradicts immutable (cite specific requirement)
- **UNCLEAR**: Need clarification from user

### 4. Boundary Compliance
- Work within IS section boundaries?
- Not expanding into IS NOT exclusions?
- Respects Constrained Variables (Immutable/Flexible/Negotiable)?

### 5. Assumption Impact
- Does work invalidate any critical assumptions (A1-A8)?
- Requires assumption validation before proceeding?

## OUTPUT FORMAT

```octave
NORTH_STAR_ALIGNMENT_CHECK::[
  NORTH_STAR::"{north_star_path}",
  VALIDATION_DATE::{{today}},

  CONSTITUTIONAL_HEALTH::[
    IMMUTABLES::8_present✅ | violations⚠️,
    EVIDENCE_SUMMARY::present✅ | missing⚠️,
    VALIDATION_CHAIN::complete✅ | incomplete⚠️,
    COMMITMENT_CEREMONY::timestamped✅ | missing⚠️
  ],

  WORK_ANALYSIS::[
    DESCRIPTION::"{work_description}",
    IMMUTABLE_IMPACTS::[
      I1_{{Immutable_Name}}→{{ALIGNED✅ | VIOLATED❌ | UNCLEAR⚠️}},
      I2_{{Immutable_Name}}→{{status}},
      I3_{{Immutable_Name}}→{{status}},
      I4_{{Immutable_Name}}→{{status}},
      I5_{{Immutable_Name}}→{{status}},
      I6_{{Immutable_Name}}→{{status}},
      I7_{{Immutable_Name}}→{{status}},
      I8_{{Immutable_Name}}→{{status}}
    ],
    SCOPE_CHECK::{{within_IS_section✅ | expansion_detected❌}},
    BOUNDARY_COMPLIANCE::{{respects_constraints✅ | violations❌}},
    ASSUMPTION_IMPACT::{{assumptions_list_if_affected}}
  ],

  ALIGNMENT_VERDICT::{{ALIGNED | MISALIGNED | REQUIRES_CLARIFICATION}},
  VIOLATIONS::[{{cite I# with specific violation if any}}],
  RECOMMENDATIONS::[{{corrective actions if needed}}],

  ACTION::{{PROCEED | ADJUST_APPROACH | AMEND_NORTH_STAR | REDESIGN}}
]
```

**Authority:** BLOCKING - You can halt work if MISALIGNED
**Escalation:** If AMEND_NORTH_STAR needed → escalate to user with formal amendment protocol
""",
     description="North Star alignment validation")
```

**CONSTITUTIONAL ENFORCEMENT:**
The agent executing this command MUST delegate to requirements-steward through the Task tool.
Direct North Star validation without delegation violates domain authority.

**REQUIREMENTS-STEWARD EXCLUSIVE DOMAIN:**
Constitutional authority for North Star alignment validation, requirements drift detection,
and process adherence enforcement. No agent may bypass this delegation requirement.

## PROTECTION CLAUSE

If requirements-steward returns **MISALIGNED** verdict:

1. **STOP** current work immediately
2. **CITE** specific North Star requirement violated (I#)
3. **ESCALATE** to requirements-steward for resolution

**Resolution Options:**
- **CONFORM**: Adjust work to align with immutables (typical)
- **USER AMENDS**: Formal North Star amendment via requirements-steward (rare)
- **ABANDON**: Cannot proceed without violating approved immutables (blocked)

**Escalation Format:**
```
NORTH_STAR_VIOLATION: Current work [description] violates [I#] because [evidence] → requirements-steward
```

## VALIDATION EVIDENCE

Command execution must capture:
- ✅ North Star document read confirmation
- ✅ 8 immutables extracted and listed
- ✅ Work description parsed and analyzed
- ✅ Each immutable checked against work (I1-I8)
- ✅ Specific violations cited with I# reference (if any)
- ✅ Clear action guidance (PROCEED/ADJUST/REDESIGN)

## SUCCESS METRICS

- **Alignment checks**: <2 minutes per validation
- **False positives**: <10% (high precision)
- **Violation detection**: 100% (no drift undetected)
- **User clarity**: Clear PROCEED/ADJUST/REDESIGN guidance
- **Constitutional compliance**: 100% delegation to requirements-steward

## AUTHORITY & RACI

- **R**: requirements-steward (executes validation)
- **A**: requirements-steward (ACCOUNTABLE for North Star governance)
- **C**: critical-engineer (if architectural concerns), north-star-architect (if amendment needed)
- **I**: implementation-lead (receives verdict for execution decisions)

**Decision Authority:** BLOCKING - requirements-steward can halt work if misaligned
**Escalation Chain:** requirements-steward → critical-engineer → user

---

**OBJECTIVE:** Prevent North Star drift by validating all significant work against
immutables before proceeding. Constitutional delegation ensures domain expertise applied
with BLOCKING authority to protect project integrity.
