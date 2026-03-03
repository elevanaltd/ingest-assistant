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
- **527 tests passing** (34 test files)
- **Clean architecture** (service layer, IPC bridge, Zod validation)
- **5 React components** (flat structure works fine at this scale)
- **789-line App.tsx** (manageable, not urgent to split)
- **TDD discipline enforced** (via CLAUDE.md)

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
- #63: Reference Image Lookup System
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

NEW FEATURES (Parallel-safe)
│
└─ #63 Reference Image Lookup System
    ├─ Dependencies: None (new service)
    ├─ Adds: Supabase schema, embedding service, vector search
    ├─ Modifies: AIService.analyzeImage() (minor)
    └─ Value: HIGH - new capability for AI analysis

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
| #63 Reference Lookup | 🟢 **LOW** | New files + 1 AIService method | Very low conflict |
| #21 Documentation | ⚪ **NONE** | `.coord/docs/` only | Zero conflict |
| #54 XMP Alignment | ✅ **DONE** | Already implemented | Close issue |

---

## Parallelization Matrix

What can be worked on simultaneously without conflicts?

### ✅ SAFE COMBINATIONS (Parallel branches)

```
Branch A                  Branch B
────────────────────────  ────────────────────────
#21 Documentation    +    Any code work
#63 Reference Lookup +    #27 Validation (different areas)
#63 Reference Lookup +    #30 Pagination (different areas)
#27 Validation       +    #30 Pagination (no overlap)
```

### ⚠️ SEQUENTIAL ONLY (Must finish A before B)

```
Step 1 (Foundation)       Step 2 (Depends on Step 1)
────────────────────────  ────────────────────────
#28 State Machine    →    #29 Functional Pipeline
#25 Result Types     →    #29 Functional Pipeline
Foundation stable    →    #26 Feature Structure (refactor on stable base)
```

### 🚫 CONFLICT ZONES (Never work on these together)

```
Issue A               Issue B                 Reason
────────────────────  ─────────────────────── ──────────────────────
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
                    │
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
- ✅ **#63 Reference Lookup** (new feature, parallel-safe, high value)
- ✅ **#27 Branded Types** (additive, low risk, immediate type safety)

### Foundation Work (Consider ROI)
- ⚠️ **#29 Functional Pipeline** - HIGH value for video processing
- ⚠️ **#28 State Machine** - Only if undo/redo needed (not current req)
- ⚠️ **#25 Result Types** - Nice-to-have (current error handling works)

### Save for Later (Low priority)
- 🔻 **#30 Pagination** - Virtual scrolling already handles 1000+ files
- 🔻 **#26 Feature Structure** - Premature at 5-component scale

### Already Done
- ✅ **#54 XMP Alignment** - Implemented, 493 tests passing → CLOSE ISSUE

---

## Decision Tree: "What Should I Work On Next?"

```
START
  │
  ├─ Working on other enhancements? ─ YES → Pick from SAFE COMBINATIONS
  │                                    (#63, #21, #27)
  │
  └─ NO (fresh start)
      │
      ├─ Need quick win? ─ YES → #21 Documentation (1 day)
      │
      ├─ Want new feature? ─ YES → #63 Reference Lookup
      │                            (isolated service, high value)
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
1. **Close #54** - XMP alignment already implemented
2. **#63 Reference Lookup** - New feature, parallel-safe, high value
   - Create separate service module
   - Minimal AIService touch
   - Can work alongside other enhancements

### SHORT-TERM (This Month)
3. **#29 Functional Pipeline** - HIGH value for video processing
   - **BUT REQUIRES:** #25 (Result types) or accept imperative approach
   - Focus on `pipe(checkCodec, transcode, extractFrames, serve)`
   - Test each stage independently

### MEDIUM-TERM (Next Quarter)
4. **#27 Branded Types** - IF validation errors become frequent
5. **#30 Pagination** - IF virtual scrolling shows performance issues (unlikely)

### LONG-TERM (Future)
6. **#28 State Machine** - Only if undo/redo becomes requirement
7. **#26 Feature Structure** - Wait until 20+ components (not 5)
8. **#25 Result Types** - Only if building reusable library

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
✅ TDD discipline (527 tests, all passing)
✅ Pragmatic error handling (try/catch + sanitization)

### What Would Add Value (Consider)
🤔 Functional pipelines for video processing (#29)
🤔 Reference image lookup for AI analysis (#63)
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
1. **New capabilities** (#63 Reference Lookup)
2. **High-value improvements** (#29 Functional Pipeline for video)
3. **Strategic clarity** (this roadmap replaces #21)

**Avoid:**
- Rewriting error handling that works (#25)
- Adding state machines without clear need (#28)
- Premature component reorganization (#26)

**Solo dev strategy:** Work on **parallel-safe features** (#63) while keeping codebase stable. Defer foundation rewrites until clear ROI emerges.

---

## Status Tracking

| Issue | Status | Priority | Can Start? | Blocks |
|-------|--------|----------|------------|--------|
| #54 | ✅ DONE | - | N/A | - |
| #21 | ✅ DONE (this doc) | - | N/A | - |
| #63 | 🟢 READY | HIGH | ✅ Yes | None |
| #29 | 🟡 WAITING | HIGH | ⚠️ Needs #25 or accept imperative | #28, #25 |
| #27 | 🟢 READY | MEDIUM | ✅ Yes | None |
| #30 | 🟢 READY | LOW | ✅ Yes | None |
| #28 | 🟡 PENDING | LOW | ⚠️ Need undo/redo requirement | None |
| #25 | 🟡 PENDING | LOW | ⚠️ Evaluate ROI first | None |
| #26 | 🔴 BLOCKED | LOW | ❌ Wait for stable codebase | Everything |

**Next Action:** Start #63 (Reference Lookup) on feature branch, or close #54 + update issue labels.
