# Component Extraction Implementation Checklist

**Issue #26 Reference:** Tier 4.2 - Extract components to feature-based structure
**Status:** Ready for implementation
**Total Effort:** 7-11 hours (3 phases)

---

## PHASE 1: Extract MediaViewer Component (2-3 hours)

### Pre-Implementation
- [ ] Review 001-APP-DECOMPOSITION-ANALYSIS.md (MediaViewer section)
- [ ] Understand MediaViewer responsibilities (lines 616-710 in App.tsx)
- [ ] No blocking dependencies identified

### Implementation
- [ ] Create `src/components/MediaViewer.tsx`
  - [ ] Copy JSX from App.tsx lines 616-710
  - [ ] Define MediaViewerProps interface
  - [ ] Replace state variables with props
  - [ ] Export component as named export

- [ ] Create `src/components/MediaViewer.test.tsx`
  - [ ] Test image rendering
  - [ ] Test video rendering
  - [ ] Test codec warning display
  - [ ] Test transcoding progress overlay
  - [ ] Test percentage display
  - [ ] Aim for >80% coverage

- [ ] Update `src/App.tsx`
  - [ ] Add import: `import { MediaViewer } from './components/MediaViewer';`
  - [ ] Delete lines 616-710 (old JSX)
  - [ ] Add MediaViewer component call with props (single line)

- [ ] Quality Gates
  - [ ] Run: `npm run lint` (0 errors)
  - [ ] Run: `npm run typecheck` (0 errors)
  - [ ] Run: `npm test` (all passing)
  - [ ] Run: `npm run test -- src/components/MediaViewer.test.tsx` (new tests pass)

### Verification
```bash
# Command checklist
npm run lint && npm run typecheck && npm test
# Expected: All pass

# Verify App.tsx line count
wc -l src/App.tsx
# Expected: ~981 lines (was 1077, reduced by 96)

# Verify component exists
ls -la src/components/MediaViewer.tsx*
# Expected: Both .tsx and .test.tsx exist
```

### Git Commit
```bash
git add src/components/MediaViewer.tsx src/components/MediaViewer.test.tsx src/App.tsx
git commit -m "refactor: extract MediaViewer component from App.tsx

- Move media display logic (image/video/transcoding) to new component
- Create src/components/MediaViewer.tsx with clean props interface
- Create src/components/MediaViewer.test.tsx (media display tests)
- Update App.tsx to use MediaViewer component
- Reduces App.tsx from 1077 → 981 lines (-96 lines)
- Improves test organization and media display testability

Issue #26: Tier 4.2 component decomposition"
```

---

## PHASE 2: Extract MetadataForm Component (4-6 hours)

### Pre-Implementation
- [ ] Review 001-APP-DECOMPOSITION-ANALYSIS.md (MetadataForm section)
- [ ] Understand form field state (location, subject, action, shotType, keywords)
- [ ] Identify 9 event handlers to lift
- [ ] Verify Phase 1 (MediaViewer) extraction is complete

### Implementation
- [ ] Create `src/components/MetadataForm.tsx`
  - [ ] Copy JSX from App.tsx lines 712-963
  - [ ] Define MetadataFormProps interface (13 props)
  - [ ] Replace all setLocation(...) with onLocationChange(...), etc.
  - [ ] Replace all conditional logic from state (isFolderCompleted, isLoading, etc.)
  - [ ] Export component as named export

- [ ] Update `src/App.test.tsx`
  - [ ] Cut tests from lines 81-510 (430 lines of Action Field tests)
  - [ ] Delete lines 81-510 from App.test.tsx
  - [ ] Leave App.test.tsx with only navigation/folder selection tests (~80 lines)

- [ ] Create `src/components/MetadataForm.test.tsx`
  - [ ] Paste 430 lines of Action Field tests from App.test.tsx
  - [ ] Update import: `import App from './App'` → `import { MetadataForm } from './MetadataForm'`
  - [ ] Update render calls: `render(<App />)` → `render(<MetadataForm {...props} />)`
  - [ ] Create mock props for MetadataForm component
  - [ ] Add new tests for form behavior (save button, AI button)
  - [ ] Aim for >80% coverage

- [ ] Update `src/App.tsx`
  - [ ] Add import: `import { MetadataForm } from './components/MetadataForm';`
  - [ ] Delete lines 712-963 (old form JSX)
  - [ ] Add MetadataForm component call with 13+ props (replace lines 712-963)
  - [ ] Verify form field state still exists in App.tsx (location, subject, action, shotType, keywords)
  - [ ] Verify handlers still exist (handleSave, handleAIAssist, handleNext, handlePrevious)

- [ ] Quality Gates
  - [ ] Run: `npm run lint` (0 errors)
  - [ ] Run: `npm run typecheck` (0 errors)
  - [ ] Run: `npm test` (all passing, including migrated tests)
  - [ ] Run: `npm run test -- src/components/MetadataForm.test.tsx` (migrated tests pass)

### Verification
```bash
# Verify line counts
wc -l src/App.tsx
# Expected: ~737 lines (was 981, reduced by 244)

wc -l src/components/MetadataForm.tsx
# Expected: ~244 lines

wc -l src/App.test.tsx
# Expected: ~110 lines (was 510, reduced by 400)

wc -l src/components/MetadataForm.test.tsx
# Expected: ~450+ lines (was 430 moved + 20 new)

# Verify all tests pass
npm test
# Expected: All 543 tests pass (including migrated tests)
```

### Git Commit
```bash
git add src/components/MetadataForm.tsx src/components/MetadataForm.test.tsx src/App.tsx src/App.test.tsx
git commit -m "refactor: extract MetadataForm component from App.tsx

- Move form inputs (location, subject, action, shotType, keywords) to new component
- Create src/components/MetadataForm.tsx with clean props interface (13 props)
- Move 430 lines of Action Field tests from App.test.tsx → MetadataForm.test.tsx
- Create src/components/MetadataForm.test.tsx with migrated + new tests
- Update App.tsx to use MetadataForm component
- Reduces App.tsx from 981 → 737 lines (-244 lines)
- Improves form testing isolation and component maintainability

Issue #26: Tier 4.2 component decomposition"
```

---

## PHASE 3: Extract FolderCompletionControls Component (1-2 hours)

### Pre-Implementation
- [ ] Review 001-APP-DECOMPOSITION-ANALYSIS.md (FolderCompletionControls section)
- [ ] Understand folder lock/unlock UI responsibility
- [ ] Verify Phase 1 and Phase 2 extractions are complete

### Implementation
- [ ] Create `src/components/FolderCompletionControls.tsx`
  - [ ] Copy JSX from App.tsx lines 995-1048
  - [ ] Define FolderCompletionControlsProps interface (2 callbacks)
  - [ ] Replace callback references with props
  - [ ] Export component as named export

- [ ] Create `src/components/FolderCompletionControls.test.tsx`
  - [ ] Test folder locked state display
  - [ ] Test button state transitions (Complete vs Reopen)
  - [ ] Test handler callbacks fire correctly
  - [ ] Test status message display
  - [ ] Aim for >80% coverage

- [ ] Update `src/App.tsx`
  - [ ] Add import: `import { FolderCompletionControls } from './components/FolderCompletionControls';`
  - [ ] Delete lines 995-1048 (old JSX)
  - [ ] Add FolderCompletionControls component call with props
  - [ ] Verify handleCompleteFolder and handleReopenFolder handlers still exist

- [ ] Quality Gates
  - [ ] Run: `npm run lint` (0 errors)
  - [ ] Run: `npm run typecheck` (0 errors)
  - [ ] Run: `npm test` (all passing)
  - [ ] Run: `npm run test -- src/components/FolderCompletionControls.test.tsx` (new tests pass)

### Verification
```bash
# Verify final App.tsx size
wc -l src/App.tsx
# Expected: ~683 lines (was 737, reduced by 54)

wc -l src/components/FolderCompletionControls.tsx
# Expected: ~54 lines

# Verify all files exist
ls -la src/components/FolderCompletionControls.*
# Expected: Both .tsx and .test.tsx exist

# Verify all tests pass
npm test
# Expected: All 543+ tests pass
```

### Git Commit
```bash
git add src/components/FolderCompletionControls.tsx src/components/FolderCompletionControls.test.tsx src/App.tsx
git commit -m "refactor: extract FolderCompletionControls component from App.tsx

- Move folder lock/unlock UI to new component
- Create src/components/FolderCompletionControls.tsx with clean props
- Create src/components/FolderCompletionControls.test.tsx with tests
- Update App.tsx to use FolderCompletionControls component
- Reduces App.tsx from 737 → 683 lines (-54 lines)
- Completes initial component decomposition for Issue #26

Final metrics:
  - App.tsx: 1077 → 683 lines (-39% reduction)
  - 3 new focused components with >80% test coverage
  - Test organization improved (tests grouped by component)"
```

---

## POST-EXTRACTION: Final Verification Checklist

### Code Quality
- [ ] All 3 components created with clean prop interfaces
- [ ] No `any` types used
- [ ] All handlers properly lifted to App.tsx
- [ ] No circular dependencies
- [ ] All imports correct

### Testing
- [ ] All 543+ tests passing
- [ ] New MediaViewer.test.tsx tests passing (100+ lines)
- [ ] Migrated MetadataForm tests still passing (430 lines)
- [ ] New FolderCompletionControls tests passing (60+ lines)
- [ ] App.test.tsx still passing (~80 lines)
- [ ] No test regressions

### Performance
- [ ] Bundle size not increased (components are extracted, not added)
- [ ] No new dependencies added
- [ ] No performance regressions

### Documentation
- [ ] Update project CLAUDE.md with new component structure
- [ ] Add JSDoc comments to new components
- [ ] Update architecture docs if needed

### Linting & Type Safety
- [ ] `npm run lint` passes (0 errors)
- [ ] `npm run typecheck` passes (0 errors)
- [ ] `npm test` passes (all tests)

---

## Success Criteria

### Code Metrics
```
✓ App.tsx: 1077 → 683 lines (-39%)
✓ New components: 3 (MediaViewer, MetadataForm, FolderCompletionControls)
✓ State variables in App.tsx: Reduced from 19 → 6
✓ useEffect hooks in App.tsx: Reduced from 5 → 3
```

### Test Coverage
```
✓ Total tests: 543+ (all passing)
✓ MediaViewer tests: 100+ lines (new)
✓ MetadataForm tests: 430+ lines (moved + new)
✓ FolderCompletionControls tests: 60+ lines (new)
✓ App tests: 80+ lines (navigation only)
```

### Quality Gates
```
✓ Lint: 0 errors
✓ TypeCheck: 0 errors
✓ Tests: All passing
✓ No behavior changes (refactoring only)
```

---

## Rollback Plan (If Needed)

If any phase fails:

```bash
# Phase 1 rollback (before Phase 2)
git reset HEAD~1
git checkout src/App.tsx

# Phase 2 rollback (before Phase 3)
git reset HEAD~1
git checkout src/App.tsx src/App.test.tsx

# Phase 3 rollback
git reset HEAD~1
git checkout src/App.tsx
```

---

## Timeline Estimate

| Phase | Task | Effort | Timeline |
|-------|------|--------|----------|
| 1 | MediaViewer extraction | 2-3 hours | Day 1 morning |
| 1 | Code review + fixes | 0.5-1 hour | Day 1 midday |
| 2 | MetadataForm extraction | 4-6 hours | Day 1 afternoon → Day 2 |
| 2 | Test migration + review | 1-2 hours | Day 2 morning |
| 3 | FolderCompletionControls | 1-2 hours | Day 2 afternoon |
| 3 | Final verification | 0.5-1 hour | Day 2 late afternoon |
| **Total** | **All phases** | **9-13 hours** | **1.5-2 days** |

---

## Notes for Implementation

1. **One extraction per commit** - This keeps git history clean and allows rollback if needed
2. **Run tests after each extraction** - Verify no regressions before moving to next phase
3. **Move tests with components** - MetadataForm tests should move to MetadataForm.test.tsx
4. **Props are the contract** - Each component should have a clear, documented props interface
5. **No logic extraction** - Don't extract custom hooks in this phase, keep focus on component boundaries
6. **Update CLAUDE.md** - Document the new component structure after completion

---

**Status:** Ready for implementation
**Next Step:** Start Phase 1 (MediaViewer extraction)
**Estimated Completion:** 1.5-2 days (with parallel review)
