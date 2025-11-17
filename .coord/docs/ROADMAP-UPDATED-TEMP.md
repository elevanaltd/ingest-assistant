# Dependency Roadmap - Ingest Assistant

**Last Updated:** 2025-11-15
**Developer:** Solo dev + Claude Code
**Current Phase:** B4 (Production Ready)

## Executive Summary

This roadmap maps **9 open issues** against **codebase reality** to determine:
- What has dependencies vs what's independent
- What can be done in parallel
- Effort vs value for each enhancement
- Risk of merge conflicts

**Key Finding:** Most Tier 1-4 proposals are **paradigm shifts** (functional programming patterns) rather than incremental improvements. Current architecture is solid and production-ready.

---

## Issue Landscape

### Current State
- **543 tests passing** (35 test files) - Updated 2025-11-15 post-PR68
- **Clean architecture** (service layer, IPC bridge, Zod validation)
- **5 React components** (flat structure works fine at this scale)
- **789-line App.tsx** (manageable, not urgent to split)
- **TDD discipline enforced** (via CLAUDE.md)
- **Phase:** B4 (Production Ready) - enhancements are maintenance work unless requiring new North Star

### Enhancement Categories

**Foundation Changes** (High effort, high risk):
- #28: State Machine + Command Pattern
- #29: Functional Media Pipeline
- #25: Result/Either Types

**Quality Improvements** (Medium effort, medium risk):
- #27: Type-safe Validation (branded types)
- #30: Lazy Loading + Pagination

**Refactors** (Low effort, high conflict risk):
- #26: Feature-based Component Structure

**New Features** (Low conflict, safe to parallel):
- #63: Reference Image Lookup System ⚠️ **CROSS-ECOSYSTEM DEPENDENCY**
- #54: XMP Field Alignment (**DONE** - close issue)

**Documentation** (Zero conflict):
- #21: Tier Mapping Document (or this roadmap)

---

## Dependency Graph

```
FOUNDATION LAYER (Do first - enables others)
│
├─ #28 State Machine + Command Pattern
│   ├─ Current: React useState (works fine)
│   ├─ Proposed: XState or custom state machine
│   ├─ Enables: #29 (functional pipeline orchestration)
│   └─ Value: Only if undo/redo needed (not current requirement)
│
├─ #25 Result/Either Types
│   ├─ Current: try/catch + sanitizeError (works well)
│   ├─ Proposed: Result<T, E> monads
│   ├─ Enables: #29 (compose error-aware pipelines)
│   └─ Value: Type-safe errors (nice-to-have, not essential)
│
└─ #27 Type-safe Validation (branded types)
    ├─ Current: Zod runtime validation (comprehensive)
    ├─ Proposed: Branded types (compile-time constraints)
    ├─ Enables: Nothing (independent enhancement)
    └─ Value: Low (Zod already provides safety)

APPLICATION LAYER (Needs foundation)
│
└─ #29 Functional Media Pipeline
    ├─ Dependencies: #28 (state orchestration), #25 (error composition)
    ├─ Current: Imperative video processing (works)
    ├─ Proposed: pipe(checkCodec, transcode, extractFrames, serve)
    └─ Value: HIGH - video pipeline would benefit from composition

UI/UX LAYER (Independent)
│
├─ #30 Lazy Loading + Pagination
│   ├─ Dependencies: None (UI enhancement)
│   ├─ Current: Virtual scrolling (handles 1000+ files at 60fps)
│   ├─ Proposed: Paginated loading
│   └─ Value: MEDIUM - current virtual scrolling already performant
│
└─ #26 Feature-based Component Structure
    ├─ Dependencies: Wait for stable codebase
    ├─ Current: Flat structure (5 components)
    ├─ Proposed: src/features/{file-browser, media-viewer, etc}
    └─ Value: LOW - premature at current scale (5 components)

NEW FEATURES (Parallel-safe with coordination)
│
└─ #63 Reference Image Lookup System
    ├─ Dependencies: ⚠️ **CROSS-ECOSYSTEM COORDINATION REQUIRED**
    │   ├─ EAV Monorepo coordination (shared Supabase: zbxvjyrbkycbfhwmmnmy)
    │   ├─ Schema integration: media_references.reference_images → FK → public.shots
    │   ├─ RLS policy impact validation
    │   └─ Migration sequencing approval
    ├─ Adds: Supabase schema, embedding service, vector search
    ├─ Modifies: AIService.analyzeImage() (minor)
    └─ Value: HIGH - new capability for AI analysis

    **BEFORE STARTING #63:**
    1. Consult technical-architect for cross-schema design validation
    2. Document coordination protocol in EAV PROJECT-CONTEXT.md
    3. Create GitHub issue at elevanaltd/eav-monorepo for schema approval
    4. Validate RLS policy impact with EAV team
    5. Establish migration sequencing (IA local → EAV remote)

DOCUMENTATION (Zero conflict)
│
└─ #21 Tier Mapping Document
    ├─ Dependencies: None
    ├─ Status: Replaced by this DEPENDENCY-ROADMAP.md
    └─ Value: HIGH - strategic clarity
```

---

## Blast Radius Analysis

How many files does each change touch?

| Issue | Blast Radius | Files Affected | Risk |
|-------|--------------|----------------|------|
| #26 Feature Structure | 🔴 **CRITICAL** | All `src/` files reorganized | Merge hell |
| #25 Result Types | 🔴 **HIGH** | Every error handler (30+ files) | High conflict |
| #28 State Machine | 🟡 **MEDIUM** | App.tsx, IPC handlers, services | Medium conflict |
| #29 Functional Pipeline | 🟡 **MEDIUM** | Video processing (5-7 files) | Low-medium conflict |
| #30 Pagination | 🟡 **MEDIUM** | App.tsx, file list rendering | Medium conflict |
| #27 Branded Types | 🟢 **LOW** | Type definitions, validation (additive) | Low conflict |
| #63 Reference Lookup | 🟡 **MEDIUM** ⚠️ | New files + AIService + **EAV coordination** | Cross-ecosystem risk |
| #21 Documentation | ⚪ **NONE** | `.coord/docs/` only | Zero conflict |
| #54 XMP Alignment | ✅ **DONE** | Already implemented | Close issue |

---

## Constitutional Requirements for All Enhancements

### MANDATORY TDD Protocol
**ALL code changes must follow RED→GREEN→REFACTOR discipline:**

1. **RED:** Write failing test first (verify failure reason is correct)
2. **GREEN:** Minimal implementation (verify test passes)
3. **REFACTOR:** Improve while green (optional)
4. **COMMIT:** Evidence trail: `test: X (RED)` → `feat: X (GREEN)` → `refactor: X (optional)`

**Recent Evidence:** PR #68 TDD remediation (7 failing tests) demonstrates this isn't theoretical.

### Quality Gates (ALL Must Pass Before Commit)
```bash
npm run lint && npm run typecheck && npm test
```
- **Lint:** 0 errors, 0 warnings (35 pre-existing warnings acceptable)
- **Typecheck:** 0 errors
- **Tests:** All 543 tests passing

**NO COMMIT WITHOUT ALL THREE GREEN**

### RACI Consultation Protocol
**Major enhancements require specialist validation BEFORE starting:**

| Enhancement | Consult Agent | Validation Type |
|-------------|---------------|-----------------|
| #63 Reference Lookup | technical-architect | Cross-schema architecture design |
| #63 Reference Lookup | requirements-steward | North Star alignment check |
| #29 Functional Pipeline | critical-engineer | Tactical validation ("ready now?") |
| #28 State Machine | requirements-steward | Undo/redo North Star alignment |
| #25 Result Types | code-review-specialist | Error handling pattern assessment |
| Foundation changes | principal-engineer | Strategic validation ("viable 6mo?") |

### Test Coverage Requirements
- **New services (#63):** Unit tests (90%+), integration tests (happy + error paths), E2E tests
- **Refactors (#29):** Retroactive tests acceptable IF behavior-focused
- **Foundation changes (#28, #25):** Test impact analysis required before starting
- **Current baseline:** 543 tests across 35 files

---

## Parallelization Matrix

What can be worked on simultaneously without conflicts?

### ✅ SAFE COMBINATIONS (Parallel branches)

```
Branch A                  Branch B
────────────────────────  ────────────────────────
#21 Documentation    +    Any code work
#27 Validation       +    #30 Pagination (no overlap)
```

### ⚠️ SEQUENTIAL ONLY (Must finish A before B)

```
Step 1 (Foundation)       Step 2 (Depends on Step 1)
────────────────────────  ────────────────────────
#63 EAV Coordination →    #63 Implementation
#28 State Machine    →    #29 Functional Pipeline
#25 Result Types     →    #29 Functional Pipeline
Foundation stable    →    #26 Feature Structure (refactor on stable base)
```

### 🚫 CONFLICT ZONES (Never work on these together)

```
Issue A               Issue B                 Reason
────────────────────  ─────────────────────── ──────────────────────
#63 Reference Lookup  #27 Validation          Both could touch AIService
#28 State Machine     #30 Pagination          Both touch App.tsx state
#26 Feature Structure ANY other code work     Reorganizes everything
#25 Result Types      #28 State Machine       Both change error flow
```

---

## Effort vs Value Matrix

Where to focus for maximum ROI?

```
                HIGH VALUE
                    │
    #29 Pipeline    │   #63 Reference Lookup
    (composition)   │   (new capability)
                    │   ⚠️ Requires EAV coordination
    ────────────────┼────────────────────
                    │
    #28 State       │   #30 Pagination
    Machine         │   (already fast)
    (overkill?)     │
                    │
                LOW VALUE

    LOW EFFORT ──────────────→ HIGH EFFORT
```

### Quick Wins (Do These)
- ✅ **#21 Documentation** (1 day, strategic clarity)
- ⚠️ **#63 Reference Lookup** (new feature, high value, **BUT requires EAV coordination first**)
- ✅ **#27 Branded Types** (additive, low risk, immediate type safety)

### Foundation Work (Consider ROI)
- ⚠️ **#29 Functional Pipeline** - HIGH value for video processing
- ⚠️ **#28 State Machine** - Only if undo/redo needed (not current req)
- ⚠️ **#25 Result Types** - Nice-to-have (current error handling works)

### Save for Later (Low priority)
- 🔻 **#30 Pagination** - Virtual scrolling already handles 1000+ files
- 🔻 **#26 Feature Structure** - Premature at 5-component scale

### Already Done
- ✅ **#54 XMP Alignment** - Implemented, 543 tests passing → CLOSE ISSUE

---

## Decision Tree: "What Should I Work On Next?"

```
START
  │
  ├─ Working on other enhancements? ─ YES → Pick from SAFE COMBINATIONS
  │                                    (#27 only - #63 needs coordination)
  │
  └─ NO (fresh start)
      │
      ├─ Need quick win? ─ YES → #21 Documentation (1 day)
      │
      ├─ Want new feature? ─ YES → #63 Reference Lookup
      │                            ⚠️ STEP 1: EAV coordination FIRST
      │                            └─ Document in both PROJECT-CONTEXT.md files
      │                            └─ Create GitHub issue for schema approval
      │                            └─ Consult technical-architect
      │
      ├─ Improving existing? ─ YES → #29 Functional Pipeline
      │                              (BUT requires #28 + #25 first)
      │
      └─ Refactoring? ─ YES → WAIT until codebase stable
                              (#26 Feature Structure = merge hell)
```

---

## Recommendations

### IMMEDIATE (This Week)
1. **Close #54** - XMP alignment already implemented (543 tests passing)
2. **#63 Reference Lookup - Coordination Phase**
   - **BEFORE coding:** Complete cross-ecosystem coordination protocol
   - Consult technical-architect for schema design validation
   - Document in `/Volumes/HestAI-Projects/eav-monorepo/.coord/PROJECT-CONTEXT.md`
   - Create GitHub issue at `elevanaltd/eav-monorepo` for schema approval
   - Validate RLS policy impact
   - Establish migration sequencing

### SHORT-TERM (After #63 Coordination)
3. **#63 Reference Lookup - Implementation Phase**
   - Create separate service module
   - Minimal AIService touch
   - TDD discipline (failing tests first)
   - Can work alongside #27 (if different areas)

4. **#29 Functional Pipeline** - HIGH value for video processing
   - **BUT REQUIRES:** #25 (Result types) or accept imperative approach
   - Focus on `pipe(checkCodec, transcode, extractFrames, serve)`
   - Test each stage independently
   - Consult critical-engineer for tactical validation

### MEDIUM-TERM (Next Quarter)
5. **#27 Branded Types** - IF validation errors become frequent
6. **#30 Pagination** - IF virtual scrolling shows performance issues (unlikely)

### LONG-TERM (Future)
7. **#28 State Machine** - Only if undo/redo becomes requirement
8. **#26 Feature Structure** - Wait until 20+ components (not 5)
9. **#25 Result Types** - Only if building reusable library

### NEVER (Low ROI)
- Don't rewrite working error handling (#25) without clear benefit
- Don't reorganize 5 components into feature structure (#26)
- Don't add state machine (#28) without undo/redo requirement

---

## Architectural Philosophy

### What's Working Well (Keep)
✅ Service layer abstraction
✅ Zod validation (runtime + TypeScript inference)
✅ IPC bridge with security boundaries
✅ TDD discipline (543 tests, all passing)
✅ Pragmatic error handling (try/catch + sanitization)

### What Would Add Value (Consider)
🤔 Functional pipelines for video processing (#29)
🤔 Reference image lookup for AI analysis (#63) - **requires EAV coordination**
🤔 Component extraction IF App.tsx exceeds 1000 lines

### What's Premature (Avoid)
❌ State machines without undo/redo (#28)
❌ Result types for simple error handling (#25)
❌ Branded types when Zod suffices (#27)
❌ Feature structure for 5 components (#26)

---

## Conclusion

**The codebase is production-ready with solid architecture.** Most Tier 1-4 proposals are **functional programming paradigm shifts** that would rewrite working imperative code.

**Focus on:**
1. **Cross-ecosystem coordination** (#63 coordination phase - document first)
2. **New capabilities** (#63 Reference Lookup - after coordination)
3. **High-value improvements** (#29 Functional Pipeline for video)
4. **Strategic clarity** (this roadmap replaces #21)

**Avoid:**
- Rewriting error handling that works (#25)
- Adding state machines without clear need (#28)
- Premature component reorganization (#26)
- **Starting #63 implementation without EAV coordination**

**Solo dev strategy:** Work on **parallel-safe features** after completing cross-ecosystem coordination. Defer foundation rewrites until clear ROI emerges.

---

## Status Tracking

| Issue | Status | Priority | Can Start? | Blocks |
|-------|--------|----------|------------|--------|
| #54 | ✅ DONE | - | N/A | - |
| #21 | ✅ DONE (this doc) | - | N/A | - |
| #63 | 🟡 COORDINATION | HIGH | ⚠️ EAV coordination first | None (after coordination) |
| #29 | 🟡 WAITING | HIGH | ⚠️ Needs #25 or accept imperative | #28, #25 |
| #27 | 🟢 READY | MEDIUM | ✅ Yes | None |
| #30 | 🟢 READY | LOW | ✅ Yes | None |
| #28 | 🟡 PENDING | LOW | ⚠️ Need undo/redo requirement | None |
| #25 | 🟡 PENDING | LOW | ⚠️ Evaluate ROI first | None |
| #26 | 🔴 BLOCKED | LOW | ❌ Wait for stable codebase | Everything |

**Next Action:**
1. **Close #54** (XMP alignment complete)
2. **#63 Coordination Phase:**
   - Invoke technical-architect for schema design
   - Document cross-ecosystem protocol in both PROJECT-CONTEXT.md files
   - Create GitHub issue for schema approval
   - Validate RLS policy impact
3. **After coordination:** Start #63 implementation on feature branch
