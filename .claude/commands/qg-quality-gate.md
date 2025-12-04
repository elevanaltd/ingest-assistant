# /qg - Quality Gate (Post-Implementation Review)

Intelligent quality validation with scope-aware agent routing.

## USAGE

```
/qg [--scope quick|arch|full|auto] [--allow-external] [focus]
```

**Arguments:**
- `--scope` - Validation depth (default: quick, or auto-detected)
- `--allow-external` - Enable external CLI routing (Gemini). Default: false (Codex-only)
- `focus` - What to review (default: "recent implementation changes")

**Examples:**
```
/qg                           # Quick review (Codex-only)
/qg auth module               # Quick review with focus
/qg --allow-external          # Quick review with Gemini quality-observer
/qg --scope arch              # Architectural review (Codex-only)
/qg --scope full              # Full review (phase transitions)
/qg --scope auto              # Auto-detect scope, confirm before proceeding
```

## SCOPE TIERS

### `quick` (default)
Fast tactical validation for most changes.

**Default (Codex-only):**
| Agent | CLI | Authority | Focus |
|-------|-----|-----------|-------|
| code-review-specialist | codex | BLOCKING | Code quality, security, patterns |

**With `--allow-external`:**
| Agent | CLI | Authority | Focus |
|-------|-----|-----------|-------|
| code-review-specialist | codex | BLOCKING | Code quality, security, patterns |
| quality-observer | gemini | ADVISORY | Standards, metrics |

### `arch` (architectural)
For infrastructure, ADR, or core system changes.

**Default (Codex-only):**
| Agent | CLI | Authority | Focus |
|-------|-----|-----------|-------|
| code-review-specialist | codex | BLOCKING | Code quality, security, patterns |
| critical-engineer | codex | BLOCKING | Architectural impact, production risk |

**With `--allow-external`:**
| Agent | CLI | Authority | Focus |
|-------|-----|-----------|-------|
| code-review-specialist | codex | BLOCKING | Code quality, security, patterns |
| critical-engineer | codex | BLOCKING | Architectural impact, production risk |
| quality-observer | gemini | ADVISORY | Standards, metrics |

**Auto-triggers when:**
- Files in `/arch`, `/infrastructure`, or ADR directories
- Core module changes (>100 LOC in shared/core)
- Database schema or migration changes

### `full` (comprehensive)
For phase transitions or major releases.

**Default (Codex-only):**
| Agent | CLI | Authority | Focus |
|-------|-----|-----------|-------|
| code-review-specialist | codex | BLOCKING | Code quality, security, patterns |
| critical-engineer | codex | BLOCKING | Architectural impact, production risk |
| test-methodology-guardian | codex | BLOCKING | Test quality, TDD compliance |

**With `--allow-external`:**
| Agent | CLI | Authority | Focus |
|-------|-----|-----------|-------|
| code-review-specialist | codex | BLOCKING | Code quality, security, patterns |
| critical-engineer | codex | BLOCKING | Architectural impact, production risk |
| test-methodology-guardian | codex | BLOCKING | Test quality, TDD compliance |
| quality-observer | gemini | ADVISORY | Standards, metrics |

**Auto-triggers when:**
- Phase boundary (B0→B1, B2→B3, etc.)
- Test file changes with coverage impact
- Pre-release validation requested

### `auto` (intelligent routing)
Analyzes change scope and proposes appropriate tier.

1. Scans recent changes for trigger patterns
2. Proposes scope (quick/arch/full) with reasoning
3. Asks for confirmation before proceeding
4. Preserves quota discipline - user controls escalation

## SCOPE DETECTION LOGIC

```
DETECT_SCOPE::[
  IF[files_match(/arch|/infrastructure|ADR|migration|schema)]→arch
  IF[LOC_core>100 OR database_changes]→arch
  IF[phase_transition OR test_coverage_drop OR release_tag]→full
  IF[test_files_modified>50%]→full
  ELSE→quick
]

AUTO_MODE::[
  detected_scope→display_reasoning→ask_confirm[Y/n]
  IF[confirmed]→execute_detected_scope
  IF[declined]→ask_preferred_scope
]
```

## EXECUTION PROTOCOL

### Phase 1: Scope Resolution
```
$ARGUMENTS → parse_flags → determine_scope

IF[--scope provided]→use_explicit_scope
ELIF[--scope auto]→detect_and_confirm
ELSE→detect_silently[default_quick_if_no_triggers]
```

### Phase 2: Agent Invocation (Parallel)

**Quick scope (default):**
```
mcp__hestai__clink[cli_name:codex, role:code-review-specialist,
  prompt:"Review implementation for code quality, security, patterns: {focus}"]
```

**Quick scope (with --allow-external):**
```
PARALLEL::[
  mcp__hestai__clink[cli_name:codex, role:code-review-specialist,
    prompt:"Review implementation for code quality, security, patterns: {focus}"],
  mcp__hestai__clink[cli_name:gemini, role:quality-observer,
    prompt:"Assess standards compliance and quality metrics for: {focus}"]
]
```

**Arch scope (adds):**
```
mcp__hestai__clink[cli_name:codex, role:critical-engineer,
  prompt:"Assess architectural impact and production risk for: {focus}"]
```

**Full scope (adds):**
```
mcp__hestai__clink[cli_name:codex, role:test-methodology-guardian,
  prompt:"Validate test quality and TDD compliance for: {focus}"]
```

### Phase 3: Synthesis
Combine findings into unified report:
- BLOCKING issues (must fix)
- ADVISORY observations (should consider)
- Recommendations (prioritized)

## ERROR HANDLING

### Agent Failure Protocol
```
ERROR_HANDLING::[
  TIMEOUT::300s_per_agent[configurable],
  ON_TIMEOUT::[
    BLOCKING_agent_timeout→GATE_FAILS[cannot_proceed_without_blocking_validation],
    ADVISORY_agent_timeout→GATE_CONTINUES[note_missing_advisory_input]
  ],
  ON_ERROR::[
    BLOCKING_agent_error→GATE_FAILS[log_error+require_manual_review],
    ADVISORY_agent_error→GATE_CONTINUES[log_warning]
  ],
  RETRY::1_retry_on_transient_failure[network_timeout_only],
  PARTIAL_RESULTS::PROHIBITED[all_BLOCKING_agents_must_complete]
]
```

### Failure Verdicts
| Scenario | Verdict | Action |
|----------|---------|--------|
| All agents complete | Normal | Apply verdict logic |
| BLOCKING agent timeout | BLOCK | "Gate incomplete - {agent} timed out. Manual review required." |
| BLOCKING agent error | BLOCK | "Gate failed - {agent} error: {message}. Manual review required." |
| ADVISORY agent timeout | CONDITIONAL | "Gate passed with caveats - {agent} unavailable." |
| ADVISORY agent error | CONDITIONAL | "Gate passed with caveats - {agent} error logged." |

### Reliability Guarantees
- Gate NEVER returns PASS if any BLOCKING agent fails to complete
- All agent invocations logged with timestamps for audit
- Partial results explicitly flagged in output

## TRACED INTEGRATION

| TRACED Step | Agent | When |
|-------------|-------|------|
| R (Review) | code-review-specialist | Always (every /qg) |
| A (Analyze) | critical-engineer | When arch triggers |
| C (Consult) | quality-observer, test-methodology-guardian | Advisory input |

## QUOTA DISCIPLINE

**Default (Codex-only):**
| Scope | TIER2 (codex) | Cost Profile |
|-------|---------------|--------------|
| quick | 1 agent | Minimal |
| arch | 2 agents | Low |
| full | 3 agents | Medium |

**With `--allow-external`:**
| Scope | TIER1 (gemini) | TIER2 (codex) | Cost Profile |
|-------|----------------|---------------|--------------|
| quick | 1 agent | 1 agent | Low |
| arch | 1 agent | 2 agents | Medium |
| full | 1 agent | 3 agents | Higher |

**Principle:** Default to Codex-only for data security. Use `--allow-external` when broader advisory input desired.

## OUTPUT FORMAT

```
## Quality Gate Report [{scope}]

### BLOCKING Issues
- [critical-engineer] Issue description...
- [code-review-specialist] Issue description...

### ADVISORY Observations
- [quality-observer] Observation...
- [test-methodology-guardian] Observation...

### Recommendations
1. Priority action...
2. Secondary action...

### Verdict
- [ ] PASS - Ready to proceed
- [ ] CONDITIONAL - Proceed with noted items
- [ ] BLOCK - Must address blocking issues
```
