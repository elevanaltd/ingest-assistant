# Complete Constitutional Activation System

## SUMMARY
Unified activation system working identically across CLI and GitHub environments through structural integration.

## SYSTEM ARCHITECTURE

```
User Prompt
    ↓
/activate {role} [deep]    ← Single entry point
    ↓
Constitution Load          ← .claude/agents/{role}.oct.md
    ↓
SHANK Overlay Extract      ← MUST_ALWAYS/MUST_NEVER behavioral constraints
    ↓
Skills Auto-Load           ← Role → Skill mapping (automatic)
    ↓
Integration Check          ← Behavioral prediction (anti-theater)
    ↓
Execute with Discipline    ← Constitutional constraints enforced
    ↓
@consult:{agent} tags      ← Multi-perspective validation (optional)
    ↓
Evidence Verification      ← Behavior matches constitutional overlay
```

## EMERGENT PROPERTY

This is NOT: command + constitution + skills + tags (additive components)

This IS: Command **structures** constitution **which activates** skills **which enforces** constitutional discipline **which enables** multi-perspective validation (multiplicative system integration)

## USAGE PATTERNS

### 1. Quick Activation (Default - 2-3 minutes)

**User prompt:**
```
/activate implementation-lead

Add CSV export feature to copy-editor
```

**What happens:**
1. Read `.claude/agents/implementation-lead.oct.md`
2. Extract LOGOS SHANK overlay (MUST_ALWAYS/MUST_NEVER)
3. Auto-load `.claude/skills/build-execution/*.md` (4 files)
4. State behavioral prediction showing LOGOS compliance
5. Execute task with constitutional discipline

**Evidence of activation:**
- Shows system ripple paths explicitly (LOGOS MUST_ALWAYS)
- Maps dependencies before coding (LOGOS MUST_ALWAYS)
- Never treats code as isolated edit (LOGOS MUST_NEVER)

---

### 2. Deep Activation (Full RAPH - 5-10 minutes)

**User prompt:**
```
/activate critical-engineer deep

Review authentication architecture for production readiness
```

**What happens:**
1. Read `.claude/agents/critical-engineer.oct.md`
2. Extract ETHOS SHANK overlay
3. Auto-load error-triage skills
4. **Full RAPH protocol with TodoWrite evidence:**
   - ABSORB: Find 3 constitutional tensions + resolutions
   - PERCEIVE: Generate 2 edge-case scenarios
   - HARMONISE: Predict 3 behavioral differences
5. Execute with deep constitutional integration

**Evidence of activation:**
- Starts with evidence, then judgment (ETHOS MUST_ALWAYS)
- Flags gaps with explicit markers (ETHOS behavior)
- Clinical assessment without hedging (ETHOS overlay)

---

### 3. Multi-Agent Consultation

**User prompt:**
```
/activate implementation-lead

Implement user authentication feature

@consult:code-review-specialist
@consult:security-specialist
```

**What happens:**
1. Primary agent (implementation-lead) executes work
2. After completion, applies code-review-specialist lens:
   - Reads `.claude/agents/code-review-specialist.oct.md`
   - Extracts judgment criteria (pattern consistency, error handling, etc.)
   - Reviews work through their constitutional lens
   - Documents validation
3. Then applies security-specialist lens:
   - Same process for security perspective
4. Final output shows multi-perspective validation

**Evidence of consultation:**
"Validated per code-review-specialist standards: ✓ Pattern consistency, ✓ Error handling, ✓ Test coverage"
"Validated per security-specialist standards: ✓ RLS policies enforced, ✓ Input validation present, ✓ Auth boundaries clear"

---

### 4. Skills-Only Mode (No Agent)

**User prompt:**
```
Fix TypeScript error in auth.ts
```

**What happens (automatic):**
1. Claude detects simple task
2. Loads relevant skills (error-triage)
3. Applies operational pattern
4. No agent activation needed (avoids ceremony for simple tasks)

---

## SKILLS AUTO-LOADING MATRIX

**Enforced by CLAUDE.md - automatic when agent activates:**

```
implementation-lead → .claude/skills/build-execution/* (all 4 files)
  ├─ tdd-discipline.md          (114 lines - RED→GREEN→REFACTOR)
  ├─ build-philosophy.md         (87 lines - System awareness, MIP)
  ├─ verification-protocols.md   (139 lines - Evidence requirements)
  └─ anti-patterns.md            (115 lines - What to avoid)

universal-test-engineer → .claude/skills/ (3 directories)
  ├─ test-infrastructure/*       (Test setup patterns)
  ├─ test-ci-pipeline/*          (CI integration)
  └─ supabase-test-harness/*     (Supabase testing)

critical-engineer → .claude/skills/error-triage/*
code-review-specialist → .claude/skills/build-execution/anti-patterns.md
test-infrastructure-steward → .claude/skills/test-infrastructure/*, test-ci-pipeline/*, supabase-test-harness/*
quality-observer → .claude/skills/build-execution/verification-protocols.md
```

**Verification:** Agent must confirm after activation:
"Loaded {N} skill files: {list filenames}"

---

## CONSULTATION TAG SYSTEM

### Common Consultations

**@consult:code-review-specialist**
- Judgment criteria: Pattern consistency, error handling, test coverage, type safety
- Use when: Any code changes (actually mandatory per TRACED protocol)

**@consult:critical-engineer**
- Judgment criteria: Technical feasibility, architecture validation, risk assessment
- Use when: Architectural uncertainty, production readiness questions

**@consult:test-methodology-guardian**
- Judgment criteria: Test discipline compliance, methodology correctness
- Use when: Test methodology changes, integration test architecture

**@consult:security-specialist**
- Judgment criteria: Vulnerabilities, RLS policies, input validation, auth boundaries
- Use when: Security-sensitive implementations

**@consult:principal-engineer**
- Judgment criteria: Long-term viability, architectural decay patterns, scaling risks
- Use when: Strategic architecture decisions, 6-month+ viability questions

### Multiple Consultations

```
/activate implementation-lead

Implement payment processing

@consult:code-review-specialist
@consult:security-specialist
@consult:critical-engineer
```

Applies three perspectives sequentially, documents each validation.

---

## ACTIVATION EVIDENCE (Anti-Theater Verification)

### LOGOS Agents (implementation-lead, code-review-specialist)

**Must demonstrate:**
- Show system ripple paths: "Change X affects Y via Z across N components"
- Map dependencies BEFORE coding
- Number implementation reasoning steps (1. System analysis... 2. Local implementation... 3. Integration...)
- Reveal structural relationships explicitly

**Prohibited:**
- Treating code as isolated edits
- A+B additive solutions (must show multiplicative synthesis)
- Using "balance" or "compromise" without showing emergence

### ETHOS Agents (critical-engineer, universal-test-engineer)

**Must demonstrate:**
- Start with evidence, THEN judgment
- Flag gaps with explicit [MISSING] markers
- Clinical assessment without hedging
- Test integrity over convenience

**Prohibited:**
- Judgment before evidence
- Vague "could be better" statements
- Compromising test discipline for speed

### PATHOS Agents (quality-observer)

**Must demonstrate:**
- Explore possibility space
- Surface hidden implications
- Question unstated assumptions
- Multiple perspective generation

**Prohibited:**
- Single-path thinking
- Accepting surface-level answers
- Ignoring edge cases

---

## GENIUS ADDITIONS

### 1. Activation Evidence Tracking

**Problem:** Constitutional activation can become ceremonial theater - Claude reads constitution, acknowledges it, then codes generically.

**Solution:** First action must demonstrate activation worked.

**Implementation:**
- Agent states ONE behavioral prediction during activation
- First task action must show that behavior
- Self-verification: "Does my execution match my prediction?"

**Example:**
- Prediction: "I will map system ripples before coding"
- First action: "Let me analyze dependencies: getScriptById implementation (packages/shared) → export (@workspace/shared) → consumer (copy-editor ScriptList) → database (Supabase RLS policies) → tests (scripts.test.ts + integration)"
- ✅ Prediction matched behavior = genuine activation

### 2. Skills Auto-Loading Enforcement

**Problem:** Skills weren't reliably detected/loaded automatically.

**Solution:** MANDATORY role → skill mapping in CLAUDE.md with verification requirement.

**Implementation:**
- CLAUDE.md defines exact mapping for each role
- Agent MUST confirm: "Loaded {N} skill files: {list}"
- Missing confirmation = incomplete activation

### 3. Structural Integration (Not Additive)

**Problem:** Command, constitution, skills, tags treated as separate features.

**Solution:** Show how they structure into emergent constitutional discipline.

**Implementation:**
```
Command (entry point)
  → Constitution (identity framework)
    → SHANK overlays (behavioral constraints)
      → Skills (operational patterns)
        → Consultation (multi-perspective)
          → Evidence (anti-theater verification)
            = Emergent Constitutional Discipline
```

This is multiplicative system integration, not feature addition.

### 4. Environment-Agnostic Design

**Problem:** CLI has /role and Skill() tool, GitHub only has Read tool.

**Solution:** Single activation pattern using only Read tool, works in both environments.

**CLI Implementation:**
```bash
/role implementation-lead
→ Executes .claude/commands/role.md (if it exists)
→ OR uses built-in Skill() tool
```

**GitHub Implementation:**
```bash
/activate implementation-lead
→ Executes .claude/commands/activate.md
→ Uses Read tool for all loading
```

Same constitutional fidelity, different tooling.

---

## TROUBLESHOOTING

**"Skills didn't auto-load"**
→ Check agent confirmation message. Should see "Loaded N skill files: {list}"
→ If missing, activation was incomplete - re-run `/activate {role}`

**"Consultation tag didn't work"**
→ Ensure syntax is `@consult:{agent-name}` (no spaces)
→ Tags apply AFTER primary work completes
→ Check for validation message: "Validated per {agent} standards..."

**"Activation seems ceremonial"**
→ Check first action - does it demonstrate SHANK overlay compliance?
→ LOGOS: Should show system ripple paths
→ ETHOS: Should start with evidence
→ PATHOS: Should explore possibility space
→ If not, activation was theater - use `/activate {role} deep` for stronger integration

**"Which mode should I use?"**
→ Quick (default): Standard work, 2-3 min activation
→ Deep: Critical decisions, architectural reviews, 5-10 min RAPH protocol
→ None (skip activation): Simple tasks like bug fixes, documentation updates

---

## COMPARISON: Old vs New

### Old GitHub Activation Pattern

```
User: "Implement authentication"

Claude:
1. Maybe reads agent constitution (if remembered)
2. Maybe loads some skills (if detected)
3. Codes generically
4. No consultation mechanism
5. No evidence verification
```

**Result:** Constitutional discipline inconsistent, skills underutilized.

### New GitHub Activation Pattern

```
User: "/activate implementation-lead

Implement authentication

@consult:security-specialist"

Claude:
1. ✅ Reads .claude/agents/implementation-lead.oct.md (automatic)
2. ✅ Extracts LOGOS SHANK overlay (MUST_ALWAYS/MUST_NEVER)
3. ✅ Auto-loads .claude/skills/build-execution/* (4 files, verified)
4. ✅ States behavioral prediction (anti-theater)
5. ✅ Executes with constitutional discipline (evidence required)
6. ✅ Applies security-specialist lens (consultation tag)
7. ✅ Verifies behavior matches prediction (self-check)
```

**Result:** Constitutional discipline enforced, skills reliably loaded, multi-perspective validation automatic.

---

## AUTHORITY

**Created by:** holistic-orchestrator
**Date:** 2025-11-09
**Purpose:** Document complete activation system showing structural integration
**Constitutional Basis:** LOGOS SHANK overlay mandate to "reveal organizing principles that unify cross-boundary complexity"

**Evidence of system coherence:**
- ✅ Single source of truth (same constitutions work CLI + GitHub)
- ✅ Skills reliably loaded (automatic role → skill mapping)
- ✅ Constitutional discipline enforced (SHANK overlays + evidence tracking)
- ✅ Multi-perspective validation (consultation tags)
- ✅ Anti-theater verification (behavioral predictions checked)

---

**Version:** 1.0
**Status:** Production-ready
**Maintenance:** Update when new agents added or skill structure changes
