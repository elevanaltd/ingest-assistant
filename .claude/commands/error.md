# Unified Error Resolution Command

**COMBINES**: error.md + errorcheck.md for complete fix-validate-commit-verify loop

## Usage

```bash
/error                    # Full pipeline: fix → validate → commit → PR → verify
/error --minimal         # Just fix errors (no validation/commit)
/error --ci              # Fix CI failures with full pipeline
/error --local           # Local errors only  
/error --production      # Production issues
```

## COMPLETE ERROR RESOLUTION PIPELINE

### Phase 1: ERROR ANALYSIS & FIX
**MANDATORY: Invoke error-architect via Task tool for intelligent resolution**

```bash
# REQUIRED: Use Task tool for delegation (do NOT perform work directly)
Task tool with:
  subagent_type: "error-architect"
  prompt: Include full error output + context
  description: "Analyze and fix errors"
  
# error-architect returns: Targeted fixes with approach
```

**CONSTITUTIONAL ENFORCEMENT**: The agent executing this command MUST delegate to error-architect through the Task tool. Direct error resolution without delegation violates domain authority.

**ERROR-ARCHITECT EXCLUSIVE DOMAIN**: Constitutional authority for all error analysis, root cause determination, and fix implementation. No agent may bypass this delegation requirement.

**HOLISTIC-ORCHESTRATOR AUTHORITY**: Constitutionally empowered to block partial fixes that fail complete pipeline validation. Must enforce architectural coherence across all error types.

### Phase 2: PROGRESSIVE VALIDATION
**Never advance without evidence - Full pipeline success required**

**ARCHITECTURAL COHERENCE REQUIREMENT**: Fixes must maintain system integrity across all error types. Any fix introducing new error categories indicates architectural deficiency requiring Strangler Fig pattern application.

#### Local Validation (MANDATORY)
```bash
# FOR CI PIPELINE ERRORS - RUN EXACT CI COMMANDS:
npm run typecheck && npm run lint && npm test

# Must pass ALL THREE locally before claiming success
# EVIDENCE REQUIREMENT: Show output of all three commands
# Expected outcome: 
#   - TypeScript: 0 errors (npm run typecheck)
#   - ESLint: 0 errors, acceptable warnings (npm run lint)  
#   - Tests: All passing (npm test)

# ANTI-PATTERN PREVENTION:
# ❌ DO NOT claim success with only TypeScript passing
# ❌ DO NOT push if ESLint has errors
# ❌ DO NOT ignore failing tests

# FALSE COMPLETION PREVENTION
# ⚠️ CRITICAL: Agents frequently make these mistakes:
#
# 1. Running only "npm run build" → INSUFFICIENT
#    - Build only checks src/, not test files
#    - Misses all ESLint errors
#    - Creates false confidence
#
# 2. Running only "npm run typecheck" → INCOMPLETE
#    - Misses formatting/style issues
#    - Doesn't verify tests actually work
#
# 3. Claiming "TypeScript clean" → CHECK TEST FILES
#    - CI typechecks ALL .ts files including tests
#    - Local build often skips test files
#
# AUDIT REQUIREMENT: Copy/paste actual output from all three commands
```

**EVIDENCE CHAIN REQUIREMENTS**:
- Concrete validation commands with expected outcomes
- Screenshots/logs of successful local validation
- Demonstration that fix resolves original error without introducing new ones
- Architectural pattern documentation when Strangler Fig applied

#### Commit & PR Creation
```bash
git add -A
git commit -m "fix: [error type] - AI-assisted resolution

- Fixed [specific issues]
- Validated locally with [commands]
- Evidence: All local tests passing

🤖 Generated with Claude Code"
gh pr create --title "Fix: [Error description]" --body "[Evidence]"
```

#### CI Monitoring
- Watch PR for CI results
- If failures, return to Phase 1
- Continue until CI green

#### Staging Validation (if applicable)
```bash
npm run test:e2e:staging
k6 run performance-tests/
```

#### Production Canary (if applicable)
- 5% → 25% → 100% progressive rollout
- Automatic rollback on metrics degradation

### Phase 3: VERIFICATION & CLOSURE
- CI pipeline green ✅
- PR approved/merged ✅
- Production metrics stable ✅

## TRACED Protocol Compliance

- **T**: Tests run locally first
- **R**: Code review via PR
- **A**: Critical-engineer for architecture
- **C**: Specialists consulted as needed
- **E**: Quality gates enforced
- **D**: Documentation in commits

## KEY IMPROVEMENTS OVER SEPARATE COMMANDS

1. **Complete Loop**: Fixes → Validates → Commits → Monitors → Iterates
2. **Evidence Chain**: Each step requires proof before advancing
3. **No Manual Steps**: Fully automated pipeline
4. **Failure Recovery**: Automatic retry on CI failures
5. **Progressive Confidence**: Local → CI → Staging → Production

## ANTI-PATTERNS PREVENTED

❌ Push-fail-repeat cycles
❌ Untested fixes pushed to CI
❌ Missing validation evidence
❌ Incomplete error resolution
❌ Manual intervention requirements
❌ **Cascading failure cycles** (fixing TypeScript breaks ESLint, fixing ESLint breaks TypeScript)
❌ **Partial architectural fixes** that create new error categories
❌ **Surface-level symptom fixes** without addressing architectural root causes
❌ **Constitutional authority bypass** (skipping error-architect delegation)
❌ **PARTIAL VALIDATION** (TypeScript passes but ESLint/tests fail - THIS IS NOT SUCCESS)
❌ **INCOMPLETE CI REPLICATION** (must run ALL CI commands, not just typecheck)

## SUCCESS METRICS

- Time to CI green: <30 minutes
- Push attempts before success: 1-2 (not 5-10)
- Validation evidence: 100% captured
- Production incidents from fixes: 0
- **Architectural coherence maintained**: No introduction of new error types during fixes
- **Constitutional compliance**: 100% delegation to error-architect for analysis/fixes
- **Pipeline integrity**: Complete fix-validate-commit-PR-verify loop success
- **Cascading failure prevention**: Zero error type proliferation during resolution

## IMPLEMENTATION PATTERN

```python
def unified_error_resolution(error_output):
    while not ci_green:
        # Phase 1: Fix
        fixes = error_architect.analyze_and_fix(error_output)
        apply_fixes(fixes)
        
        # Phase 2: Validate Locally
        if not validate_locally():
            # ITERATION PATTERN: Complete re-analysis required
            # Must return to error-architect for architectural assessment
            # No surface-level symptom chasing allowed
            continue  # Try different fix with architectural coherence
            
        # Phase 3: Commit & PR
        commit_hash = create_commit(fixes)
        pr_url = create_pr(commit_hash)
        
        # Phase 4: Monitor CI
        ci_result = monitor_ci(pr_url)
        if ci_result.failed:
            error_output = ci_result.errors
            continue  # Next iteration
            
        # Phase 5: Staging (if needed)
        if requires_staging:
            validate_staging()
            
        ci_green = True
    
    return "Resolution complete with evidence chain"
```

## RACI

- **R**: error-architect (resolution) - EXCLUSIVE constitutional domain authority for error analysis/fixes
- **A**: holistic-orchestrator (pipeline orchestration) - Constitutional authority to block partial fixes, coordinates specialists via Task tool
- **C**: critical-engineer (architectural validation via Strangler Fig pattern), testguard (test integrity concerns)
- **I**: implementation-lead (execution tracking)

**STRANGLER FIG PATTERN APPLICATION**: When cascading failures indicate architectural deficiency, critical-engineer applies Strangler Fig pattern to isolate legacy architecture while implementing clean facade architecture.

## ORCHESTRATION PATTERN (MANDATORY)

When holistic-orchestrator or any orchestrating agent runs this command:

1. **DELEGATE via Task tool** → error-architect for error resolution
2. **ORCHESTRATE validation** → Based on error-architect findings:
   - If test concerns → Task tool to testguard
   - If architecture concerns → Task tool to critical-engineer
3. **SYNTHESIZE results** → Combine specialist perspectives
4. **MONITOR pipeline** → Watch CI/staging/production

**NEVER**: Orchestrator performs error resolution directly
**ALWAYS**: Orchestrator delegates to domain specialists via Task tool

## FAILURE RECOVERY PATTERNS

### When Initial Fixes Fail Validation

**ARCHITECTURAL ASSESSMENT REQUIRED**: If local validation fails after error-architect fixes, this indicates potential architectural deficiency requiring deeper analysis:

1. **Return to error-architect** with complete failure context
2. **Request architectural root cause analysis** 
3. **Consider Strangler Fig pattern** if cascading failures detected
4. **Engage critical-engineer** for architectural validation if needed

### Cascading Failure Prevention

**PATTERN RECOGNITION**: 
- TypeScript fix breaks ESLint → **Architectural coherence issue**
- ESLint fix breaks TypeScript → **Surface-level symptom chasing**
- Test fix breaks build → **Incomplete domain understanding**

**RESOLUTION APPROACH**:
1. **STOP immediate symptom fixes**
2. **Delegate full context to error-architect** for holistic analysis
3. **Apply Strangler Fig pattern** to isolate problematic architecture
4. **Implement clean facade** that resolves all error types simultaneously

### Evidence-Based Iteration

Each iteration must provide:
- **Error context**: Complete error output from all sources
- **Fix rationale**: Why this approach addresses root cause
- **Validation plan**: Specific commands and expected outcomes
- **Architectural impact**: How fix maintains system coherence

**NO GUESSWORK**: Every fix attempt must be grounded in error-architect analysis

## LESSONS LEARNED (2025-09-09)

**FAILURE CASE**: Error-architect fixed TypeScript compilation (20→19 errors) but claimed success
- **Root Cause**: Only validated `npm run typecheck`, ignored ESLint and tests
- **Result**: CI still failed with 19 errors because ESLint strict mode wasn't checked
- **Learning**: MUST run all three commands: typecheck && lint && test

**CORRECT VALIDATION SEQUENCE**:
1. Run `npm run typecheck` - Must pass
2. Run `npm run lint` - Must have 0 errors (warnings acceptable)
3. Run `npm test` - All tests must pass
4. ONLY if all three pass → Push to CI

## Protocol References

- Error Resolution: `/Users/shaunbuswell/.claude/protocols/ERROR_RESOLUTION.md`
- Multi-Environment: `/Users/shaunbuswell/.claude/protocols/MULTI_ENVIRONMENT_ERROR_RESOLUTION.md`
- CI/CD: `/Users/shaunbuswell/.claude/protocols/CI_ERROR_RESOLUTION.md`

---

**OBJECTIVE**: Complete error resolution with full validation pipeline, evidence chain, and automatic PR creation. No more partial fixes or manual steps.