# Priority 2: CFEx Auto-Detection - RED Phase Complete
**Session Type:** Main Session (holistic-orchestrator + implementation-lead roles)
**Created:** 2025-11-22
**Phase:** B2 Implementation - Week 2 Days 5-7 (CFEx Phase 1a-CORE)
**Current Status:** RED Phase COMPLETE → GREEN Phase READY

---

## Session Summary

### ✅ What Was Completed

**Quality Gate Status:**
- ✅ All 707/708 tests passing (1 skipped - expected)
- ✅ DST timezone fix committed (batchLogCommentReprocess test)
- ✅ Lint: 0 errors, 106 warnings (acceptable)
- ✅ Typecheck: 0 errors

**Design Analysis:**
- ✅ System awareness (ripple mapping, integration points identified)
- ✅ MIP validation (ESSENTIAL classification, minimal intervention principle applied)
- ✅ Architecture decisions documented (3 key decisions: where to run, error handling, re-detection)
- ✅ Test specifications (20 comprehensive tests defined)

**RED Phase (TDD Discipline):**
- ✅ Created: `electron/services/__tests__/cfexAutoDetect.test.ts` (343 lines, 20 tests)
- ✅ Verified: Tests fail for correct reason (module import error)
- ✅ Test Coverage:
  - macOS platform detection (5 tests)
  - Ubuntu platform detection (5 tests)
  - Card selection logic (3 tests)
  - Error handling (3 tests)
  - Mount state validation (2 tests)

**Commits:**
```
df3bd59 test: add RED phase tests for CFEx auto-detection service
6ff3274 fix: correct DST timezone issue in batchLogCommentReprocess test
```

---

## Next Phase: GREEN (Minimal Implementation)

### What Needs to Happen

**Service Implementation:** ~150 lines of code
- File: `electron/services/cfexAutoDetect.ts`
- Exports: `CfexAutoDetect` class with methods
  - `detectCfexCards(): Promise<string[]>` - Platform-aware detection
  - `detectDestinations(): Promise<{photos: string, rawVideos: string}>` - Default paths
  - `shouldAutoPopulate(cards: string[]): boolean` - Single-card decision
  - `getSelectedCard(cards: string[]): string` - Card selection
  - `isPathAccessible(path: string): Promise<boolean>` - Mount validation

**Platform-Specific Logic:**
- macOS: Scan `/Volumes/` for "NO NAME" mount
- Ubuntu: Scan `/media/$USER/` and `/run/media/$USER/` (dual-location)
- Error handling: EACCES, ENOENT, EIO gracefully caught

**TDD Protocol:**
1. Run failing tests: `npm test -- electron/services/__tests__/cfexAutoDetect.test.ts`
2. Implement cfexAutoDetect.ts to make tests pass
3. Verify all 20 tests pass with GREEN output
4. Commit: `feat: implement cfexAutoDetect service (GREEN)`
5. Run full test suite to ensure no regressions

---

## GREEN Phase Workflow

### Step 1: Build-Execution Skill
```bash
MANDATORY: Load build-execution skill at session start
Skill(command:"build-execution")
```

### Step 2: Implement Service
**Create:** `electron/services/cfexAutoDetect.ts`

```typescript
// Minimal structure (fill in with implementation)
export class CfexAutoDetect {
  async detectCfexCards(): Promise<string[]> {
    // macOS: fs.readdirSync('/Volumes/').filter(dir => dir === 'NO NAME')
    // Ubuntu: fs.readdirSync('/media/' + user + '/') + /run/media/
    // Error handling: EACCES, ENOENT → return []
  }

  async detectDestinations(): Promise<{photos: string, rawVideos: string}> {
    // Scan for /LucidLink/, /Ubuntu/ mounts
    // Return defaults if not found
  }

  shouldAutoPopulate(cards: string[]): boolean {
    return cards.length === 1
  }

  getSelectedCard(cards: string[]): string {
    return cards[0]
  }

  async isPathAccessible(path: string): Promise<boolean> {
    // fs.statSync() to check accessibility
  }
}
```

### Step 3: Verify Tests Pass
```bash
npm test -- electron/services/__tests__/cfexAutoDetect.test.ts
# Expected: ✓ 20 tests passing
```

### Step 4: Commit and Validate
```bash
git add electron/services/cfexAutoDetect.ts
git commit -m "feat: implement cfexAutoDetect service (GREEN)

GREEN phase implementation making all 20 RED tests pass:
- macOS /Volumes/ scanning for CFEx card detection
- Ubuntu /media + /run/media dual-location scanning
- Destination path detection (LucidLink, Ubuntu mounts)
- Single/multi/zero card decision logic
- Error handling: EACCES, ENOENT, EIO gracefully handled
- Mount state validation

All 20 tests GREEN ✓"

npm test  # Full suite (should still be 707/708 passing)
```

---

## After GREEN Phase: Remaining Work (Days 2-2.5)

### IPC Handler Integration (~0.5 days)
- File: `electron/ipc/cfexTransferHandlers.ts`
- Add: `ipcMain.handle('cfex:detect-sources', async () => { ... })`
- RED: Write 4 IPC integration tests
- GREEN: Implement handler

### UI Integration (~1 day)
- File: `src/components/CfexTransferWindow.tsx`
- Add: useEffect hook to call cfex:detect-sources on mount
- Implement: Auto-populate sourcePath if 1 card found
- Implement: Multi-card selection dialog if 2+ cards found
- RED: Write 4 UI component tests
- GREEN: Implement integration

### Quality Validation (~0.5 days)
- Full test suite passing (expect ~760 tests)
- Lint: 0 errors
- Typecheck: 0 errors
- Code review: code-review-specialist approval
- Commit all changes
- Push to feat/cfex-work
- Target: Priority 2 COMPLETE by Week 2 Day 7

---

## Validation Checklist

Before moving to Phase 3 (Integration Testing):

- [ ] cfexAutoDetect.ts service complete
- [ ] All 20 service tests GREEN ✓
- [ ] IPC handler implemented
- [ ] IPC integration tests GREEN ✓
- [ ] CfexTransferWindow UI integration complete
- [ ] UI component tests GREEN ✓
- [ ] Full test suite: 760+ tests passing
- [ ] Lint: 0 errors
- [ ] Typecheck: 0 errors
- [ ] Code review: APPROVED
- [ ] All commits following TEST→FEAT pattern
- [ ] Pushed to feat/cfex-work

---

## Key Context Files

**Essential Reading:**
1. `.coord/SHARED-CHECKLIST.md` - Priority 2 detailed requirements
2. `.coord/PROJECT-CONTEXT.md` - Current state and architecture
3. `.coord/workflow-docs/003-CFEX-D3-BLUEPRINT.md` - Full specifications (OCTAVE compressed)
4. `electron/services/__tests__/cfexAutoDetect.test.ts` - Test specification (this defines behavior)

**Quick Reference:**
- **Current Phase:** B2 Implementation (Week 2 Days 5-7)
- **Next Work:** Priority 2 GREEN phase (cfexAutoDetect service implementation)
- **Timeline:** 2.5 days total (RED complete, GREEN + Polish remaining)
- **Quality Status:** 707/708 tests passing, all gates GREEN

---

## Running Build-Execution Skill

**MANDATORY before implementation:**
```bash
/role implementation-lead
Skill(command:"build-execution")
```

This loads:
- TDD discipline (RED→GREEN→REFACTOR)
- MIP framework (minimal intervention principle)
- Verification protocols (evidence requirements)
- Anti-patterns detection

---

## Session Notes

- **Parallel Execution:** Priority 1 work completed in Claude Code Web session, merged to main via PR #80 + #81
- **Design Approach:** Followed build-execution Minimal Intervention Principle (180 lines estimated code vs 500+ lines possible)
- **Quality Strategy:** TDD discipline with RED phase tests before any implementation
- **Next Convergence:** Week 2 Day 8 → Phase 1a-CORE COMPLETE → Phase 3 Integration Testing starts

---

## Quick Start Command (Next Session)

```
Load build-execution skill and resume Priority 2 GREEN phase implementation:
/role implementation-lead
Skill(command:"build-execution")

Then implement cfexAutoDetect.ts service following TDD protocol:
1. RED: npm test -- electron/services/__tests__/cfexAutoDetect.test.ts (verify fails)
2. GREEN: Implement service to make all 20 tests pass
3. REFACTOR: (if needed while green)
4. COMMIT: feat: implement cfexAutoDetect service (GREEN)
5. REPEAT for IPC handler + UI integration
```

---

**Session Type:** TDD-focused implementation
**Estimated Duration:** 2.5 days (Days 5-7 of Week 2)
**Ready to Start:** YES - All specifications, tests, and architecture documented
**Next Phase:** Phase 3 Integration Testing (after Priority 2 complete)
