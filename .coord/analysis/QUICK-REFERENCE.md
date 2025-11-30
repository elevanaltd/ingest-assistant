# App.tsx Component Decomposition - Quick Reference Card

## Current State
```
App.tsx: 1,077 lines
├─ 19 state variables
├─ 5 useEffect hooks
├─ 9 event handlers
└─ 3 major concerns mixed
```

## Extraction Overview

| # | Component | Lines | Props | Effort | Risk | Test Value |
|---|-----------|-------|-------|--------|------|------------|
| 1 | MediaViewer | 96 | 6 | 2-3h | LOW | HIGH |
| 2 | MetadataForm | 244 | 13 | 4-6h | MED | HIGHEST |
| 3 | FolderCompletionControls | 54 | 2 | 1-2h | LOW | MED |
| **TOTAL** | **3 components** | **394 lines** | **-** | **7-11h** | **LOW** | **HIGH** |

## After Extraction
```
App.tsx: 683 lines (-39%)
├─ 6 state variables (down from 19)
├─ 3 useEffect hooks (down from 5)
├─ Core navigation + coordination
└─ Clean prop passing
```

## Extraction Sequence

### Phase 1: MediaViewer (Start NOW)
```bash
# Files to create/modify
- src/components/MediaViewer.tsx (new, 96 lines)
- src/components/MediaViewer.test.tsx (new, 100 lines)
- src/App.tsx (delete lines 616-710)

# Verification
npm run lint && npm run typecheck && npm test
```

### Phase 2: MetadataForm (After Phase 1)
```bash
# Files to create/modify
- src/components/MetadataForm.tsx (new, 244 lines)
- src/components/MetadataForm.test.tsx (move 430 lines + add 20-50)
- src/App.tsx (delete lines 712-963)
- src/App.test.tsx (remove 430 lines)

# Verification
npm run lint && npm run typecheck && npm test
```

### Phase 3: FolderCompletionControls (After Phase 2 review)
```bash
# Files to create/modify
- src/components/FolderCompletionControls.tsx (new, 54 lines)
- src/components/FolderCompletionControls.test.tsx (new, 70 lines)
- src/App.tsx (delete lines 995-1048)

# Verification
npm run lint && npm run typecheck && npm test
```

## Component Prop Interfaces

### MediaViewer
```typescript
interface MediaViewerProps {
  mediaDataUrl: string;
  isLoading: boolean;
  currentFile: FileMetadata;
  transcodeProgress: string;
  transcodePercentage: number;
  codecWarning: string;
}
```

### MetadataForm
```typescript
interface MetadataFormProps {
  // Values
  currentFile: FileMetadata;
  location: string;
  subject: string;
  action: string;
  shotType: ShotType | '';
  keywords: string;
  shotTypes: string[];

  // Flags
  isFolderCompleted: boolean;
  isLoading: boolean;
  isAIConfigured: boolean;
  statusMessage: string;
  codecWarning: string;
  canSave: boolean;

  // Handlers
  onLocationChange: (v: string) => void;
  onSubjectChange: (v: string) => void;
  onActionChange: (v: string) => void;
  onShotTypeChange: (v: ShotType) => void;
  onKeywordsChange: (v: string) => void;
  onSave: () => void;
  onAIAssist: () => void;
  onNext: () => void;
  onPrevious: () => void;
}
```

### FolderCompletionControls
```typescript
interface FolderCompletionControlsProps {
  isFolderCompleted: boolean;
  onComplete: () => void;
  onReopen: () => void;
}
```

## Test Impact

### Before
```
App.test.tsx: 510 lines (mixed form + navigation)
```

### After
```
App.test.tsx: 80-100 lines (navigation only)
MediaViewer.test.tsx: 100-120 lines (new)
MetadataForm.test.tsx: 450+ lines (430 moved + 20-50 new)
FolderCompletionControls.test.tsx: 60-80 lines (new)
─────────────────────────────────────────────
Total: 690-750 lines (better organized)
```

## Git Commits

### Phase 1
```bash
git commit -m "refactor: extract MediaViewer component from App.tsx

- Move media display logic to new component
- Create src/components/MediaViewer.tsx (96 lines)
- Create src/components/MediaViewer.test.tsx (100 lines)
- Reduces App.tsx from 1077 → 981 lines"
```

### Phase 2
```bash
git commit -m "refactor: extract MetadataForm component from App.tsx

- Move form inputs to new component
- Create src/components/MetadataForm.tsx (244 lines)
- Move tests: App.test.tsx → MetadataForm.test.tsx (430 lines)
- Reduces App.tsx from 981 → 737 lines"
```

### Phase 3
```bash
git commit -m "refactor: extract FolderCompletionControls component from App.tsx

- Move folder controls to new component
- Create src/components/FolderCompletionControls.tsx (54 lines)
- Reduces App.tsx from 737 → 683 lines (-39% total)"
```

## Success Criteria

- [ ] App.tsx: 1,077 → 683 lines (-39%)
- [ ] 3 new components with >80% test coverage
- [ ] 430 lines of tests move to MetadataForm
- [ ] All 543+ tests passing
- [ ] npm run lint: 0 errors
- [ ] npm run typecheck: 0 errors
- [ ] No behavior changes (refactoring only)

## Timeline
```
Phase 1: 2-3 hours (+ 30min review)
Phase 2: 4-6 hours (+ 1hour review)
Phase 3: 1-2 hours (+ 30min review)
─────────────────────────────
Total: 7-11 hours across 1.5-2 days
```

## Documents

1. **001-APP-DECOMPOSITION-ANALYSIS.md** (Comprehensive)
   - Full structure analysis
   - Detailed extraction plans
   - Appendices with full prop interfaces

2. **002-EXTRACTION-IMPLEMENTATION-CHECKLIST.md** (Step-by-step)
   - Phase-by-phase checklists
   - Verification commands
   - Rollback procedures

3. **003-EXECUTIVE-SUMMARY.md** (High-level)
   - Problem statement
   - Solution overview
   - Risk assessment

4. **QUICK-REFERENCE.md** (This file)
   - Quick lookup cards
   - Prop interfaces
   - Git commit templates

## Status
**Ready for implementation** ✓
Approval needed: Yes
Start: Immediately with Phase 1
