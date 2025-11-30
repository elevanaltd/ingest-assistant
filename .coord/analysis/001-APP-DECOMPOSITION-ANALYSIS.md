# App.tsx Component Decomposition Analysis

**Issue #26 Reference:** Tier 4.2 - Extract components to feature-based structure
**Analysis Date:** 2025-11-29
**Current State:** App.tsx is 1,077 lines with high complexity and mixed responsibilities

## EXECUTIVE SUMMARY

App.tsx has **grown into a 1,077-line mega-component** that combines multiple concerns:
- Core file/folder navigation and state management
- Metadata form management (6 input fields)
- Media preview rendering (image + video with transcoding)
- Settings/modal management
- Batch operation coordination
- Tab switching (Ingest vs CFEx)

**Extraction Strategy:** Focus on **presentation isolation** (components with clean prop interfaces) rather than state-lifting logic. This maximizes test improvements while minimizing refactoring risk.

---

## SECTION 1: CURRENT STRUCTURE ANALYSIS

### Line Count: 1,077 lines

**Key Metrics:**
```
State Variables:           19 individual useState() calls
Effect Hooks:             5 useEffect() declarations
Event Handlers:           9 handler functions
Memoization:              1 useMemo (currentFile)
Refs:                     1 useRef (skipNextVideoLoadRef)
```

### State Breakdown (by responsibility)

| Category | Variables | Lines | Cohesion |
|----------|-----------|-------|----------|
| **Navigation** | currentTab, folderPath, currentFileIndex, selectedFileIds | 13-18 | HIGH - Related to file traversal |
| **Metadata Fields** | location, subject, action, shotType, shotTypes, shotName, keywords | 22-32 | MEDIUM - 7 related fields, but scattered |
| **Media Preview** | mediaDataUrl, isLoadingMedia, transcodeProgress, transcodePercentage, codecWarning | 35-39 | HIGH - All preview-related |
| **UI State** | isLoading, isAIConfigured, statusMessage, showSettings, showCommandPalette | 33-34, 40-42 | LOW - UI housekeeping |
| **Folder State** | isFolderCompleted, isFolderLoading | 44-45 | MEDIUM - Completion lock features |
| **Config** | lexiconConfig, filenameRewrite, forceUpdate | 43, 49, 53 | LOW - Settings-related |

### Effect Hook Analysis

**Effect 1 (lines 61-66):** Auto-dismiss status messages
- **Responsibility:** UI Housekeeping
- **Dependencies:** [statusMessage]
- **Extraction:** Can be extracted as custom hook → `useStatusMessageAutoClose`

**Effect 2 (lines 69-90):** Initialize AI config + load shot types + setup transcode progress listener
- **Responsibility:** App initialization (3 separate concerns!)
- **Dependencies:** []
- **Issue:** Mixing initialization (shot types) with listeners (transcode progress)
- **Extraction:** Separate into `useInitializeAppConfig` hook

**Effect 3 (lines 94-106):** Window resize handler
- **Responsibility:** Layout recalculation workaround
- **Dependencies:** []
- **Extraction:** Can be extracted as `useWindowResizeForceUpdate`

**Effect 4 (lines 110-162):** Form field sync when file changes
- **Responsibility:** Parse file metadata → populate form fields
- **Dependencies:** [currentFile, shotTypes]
- **Complexity:** HIGH - Contains parsing logic (lines 130-152)
- **Extraction:** Extract `useMetadataParser` hook to isolate parsing logic

**Effect 5 (lines 167-218):** Load media preview
- **Responsibility:** Load media URL + handle codec warnings
- **Dependencies:** [currentFile]
- **Complexity:** MEDIUM - URL decoding logic (lines 188-203)
- **Extraction:** Extract `useMediaLoader` hook

### Event Handler Analysis

| Handler | Lines | Responsibility | Complexity | Dependencies |
|---------|-------|-----------------|------------|--------------|
| `handleSelectFolder` | 220-246 | Load folder + files | MEDIUM | Sets 4 state vars |
| `handleToggleSelection` | 248-258 | Toggle file selection | LOW | 1 state var |
| `handleSave` | 260-333 | Save metadata + update file list | HIGH | Updates 3+ vars, IPC calls |
| `handleNext` | 335-339 | Navigate to next file | TRIVIAL | 1 state var |
| `handlePrevious` | 341-345 | Navigate to previous file | TRIVIAL | 1 state var |
| `handleCompleteFolder` | 347-358 | Lock folder for editing | MEDIUM | IPC + state update |
| `handleReopenFolder` | 360-371 | Unlock folder for editing | MEDIUM | IPC + state update |
| `handleAIAssist` | 373-408 | AI analysis + field population | MEDIUM | Updates 4+ state vars |
| `handleOpenSettings` | 410-419 | Load + display settings | LOW | IPC + state |
| `handleSaveLexicon` | 421-424 | Persist lexicon settings | LOW | IPC only |
| `handleSettingsClose` | 426-433 | Close settings + refresh AI config | LOW | IPC + state |
| `handleBatchComplete` | 435-445 | Reload files after batch | TRIVIAL | IPC only |

### JSX Structure (lines 503-1074)

```
<App>
  └─ Folder loading overlay (lines 505-552)
  └─ Header
     ├─ Title
     └─ Tab navigation buttons (lines 558-589)
  └─ Main content
     ├─ Folder info display (lines 599-604)
     ├─ Main container (lines 606-1050)
     │  ├─ Sidebar component (lines 607-614) ✓ Already extracted
     │  ├─ Content area (lines 616-965)
     │  │  ├─ Media viewer (lines 618-710)
     │  │  │  ├─ Image/Video player (lines 619-651)
     │  │  │  └─ Loading overlay with progress (lines 654-709)
     │  │  └─ Form (lines 712-963)
     │  │     ├─ Row 1: Metadata fields (lines 714-806)
     │  │     │  ├─ ID field (lines 715-724)
     │  │     │  ├─ Shot # field (lines 726-736)
     │  │     │  ├─ Location field (lines 738-750)
     │  │     │  ├─ Subject field (lines 752-764)
     │  │     │  ├─ Action field (lines 766-782)
     │  │     │  └─ Shot Type dropdown (lines 784-805)
     │  │     ├─ Row 2: Generated title + Save buttons (lines 809-882)
     │  │     │  ├─ Generated title display (lines 810-839)
     │  │     │  ├─ Metadata input (lines 841-852)
     │  │     │  ├─ Save button (lines 855-866)
     │  │     │  └─ AI Assist button (lines 868-881)
     │  │     └─ Row 3: Navigation + Status (lines 884-963)
     │  │        ├─ Previous button (lines 893-905)
     │  │        ├─ Current filename + status messages (lines 907-947)
     │  │        └─ Next button (lines 950-962)
     │  ├─ Batch panel (lines 980-1050)
     │  │  ├─ BatchOperationsPanel component (lines 983-993) ✓ Already extracted
     │  │  └─ Folder completion controls (lines 996-1048)
     │  └─ Empty states (lines 968-978)
     ├─ Settings modal (lines 1058-1065)
     └─ Command palette (lines 1068-1072)
```

---

## SECTION 2: EXTRACTION CANDIDATES

### Candidate 1: `<MediaViewer />` Component
**Priority:** HIGHEST | **Complexity:** LOW | **Test Impact:** HIGH

#### Current Location
Lines 616-710 (96 lines)

#### Responsibility
Display media (image or video) with:
- Image/video conditional rendering
- Codec warnings
- Transcoding progress overlay

#### Props Interface
```typescript
interface MediaViewerProps {
  // Data
  mediaDataUrl: string;
  isLoading: boolean;
  currentFile: FileMetadata;

  // Video state
  transcodeProgress: string;
  transcodePercentage: number;
  codecWarning: string;
}
```

#### State Ownership
- **currentFile:** Lifted from App (pass as prop)
- **mediaDataUrl:** Lifted from App (pass as prop)
- **isLoadingMedia:** Lifted from App (pass as prop)
- **transcodeProgress/Percentage:** Lifted from App (pass as props)
- **codecWarning:** Lifted from App (pass as prop)
- **NO local state needed** - purely presentational

#### Line Range Breakdown
```
Lines 616-651  : Image/video conditional rendering (35 lines) ✓ Extract
Lines 654-709  : Loading overlay with progress (55 lines) ✓ Extract
Total complexity: PURELY PRESENTATIONAL - NO logic
```

#### Extraction Complexity: **LOW**
- No state lifting required
- No effect hooks
- No event handlers
- Pure presentation layer

#### Test Impact
```
Current App.test.tsx coverage:  ~500 lines (many about form/navigation)
After extraction:
  + New MediaViewer.test.tsx:   ~80-100 lines (focused on media display)
  + Simplified App.test.tsx:    ~450 lines (less JSX noise)

Benefits:
  ✓ Can test video error handling independently
  ✓ Can test codec warning display independently
  ✓ Can test transcoding progress separately
  ✓ Reduces App.test.tsx cognitive load by ~15%
```

#### Extraction Order: **1st** (blocks MetadataForm extraction)

---

### Candidate 2: `<MetadataForm />` Component
**Priority:** HIGH | **Complexity:** MEDIUM | **Test Impact:** HIGH

#### Current Location
Lines 712-963 (252 lines)

#### Responsibility
Structured metadata input form:
- Row 1: ID, Shot#, Location, Subject, Action, Shot Type (6 fields)
- Row 2: Generated title preview, Keywords, Save/AI buttons
- Row 3: Navigation + Status messages

#### Props Interface
```typescript
interface MetadataFormProps {
  // Current file
  currentFile: FileMetadata;

  // Form field values
  location: string;
  subject: string;
  action: string;
  shotType: ShotType | '';
  keywords: string;
  shotTypes: string[];

  // Form state
  isFolderCompleted: boolean;
  isLoading: boolean;
  isAIConfigured: boolean;
  statusMessage: string;
  codecWarning: string;
  canSave: boolean;

  // Event handlers
  onLocationChange: (value: string) => void;
  onSubjectChange: (value: string) => void;
  onActionChange: (value: string) => void;
  onShotTypeChange: (value: ShotType) => void;
  onKeywordsChange: (value: string) => void;
  onSave: () => void;
  onAIAssist: () => void;
  onNext: () => void;
  onPrevious: () => void;
}
```

#### State Ownership
- **All form values:** Lifted from App (passed as props)
- **All handlers:** Lifted from App (passed as props)
- **NO local state** - App remains source of truth

#### Line Range Breakdown
```
Lines 714-806  : Form Row 1 - Metadata fields (92 lines) ✓ Extract
Lines 809-882  : Form Row 2 - Title + buttons (73 lines) ✓ Extract
Lines 884-963  : Form Row 3 - Navigation + status (79 lines) ✓ Extract
Total: 244 lines, 3 distinct form sections
```

#### Extraction Complexity: **MEDIUM**
- No state management (all lifted)
- No effect hooks
- ~9 event handlers (but all passed down)
- Complex conditional styling (action field disabled on images)
- Shot type dropdown with optgroups (requires shotTypes prop)

#### Test Impact
```
Current App.test.tsx:  ~510 lines (form + navigation mixed together)
After extraction:
  + New MetadataForm.test.tsx:  ~150-200 lines (focused on form behavior)
  + Simplified App.test.tsx:    ~400 lines (core navigation only)

Benefits:
  ✓ Can test Location field independently
  ✓ Can test Subject field independently
  ✓ Can test Action field (image vs video disabling)
  ✓ Can test Shot Type dropdown separately
  ✓ Can test generated title preview logic
  ✓ Can test save button disabled state
  ✓ Existing tests (410 lines) mostly transferable!
```

#### Existing Test Coverage
App.test.tsx lines 81-510 (430 lines) test:
- Action field rendering + disabling (lines 105-159)
- Action field state management (lines 162-228)
- AI result population (lines 277-395)
- File parsing (lines 402-507)

**Action:** Move tests 105-507 (402 lines) to MetadataForm.test.tsx as-is

#### Extraction Order: **2nd** (after MediaViewer)

---

### Candidate 3: `<FolderCompletionControls />` Component
**Priority:** MEDIUM | **Complexity:** LOW | **Test Impact:** MEDIUM

#### Current Location
Lines 995-1048 (54 lines)

#### Responsibility
Folder lock/unlock controls:
- Display folder completion status
- Toggle buttons (Complete vs Reopen)
- Status messaging

#### Props Interface
```typescript
interface FolderCompletionControlsProps {
  // State
  isFolderCompleted: boolean;

  // Event handlers
  onComplete: () => void;
  onReopen: () => void;
}
```

#### State Ownership
- **isFolderCompleted:** Lifted from App
- **Handler callbacks:** Lifted from App
- **NO local state needed**

#### Line Range Breakdown
```
Lines 996-1048 : Folder completion UI + buttons (52 lines)
  └─ Status display (lines 1004-1011): 7 lines
  └─ Button container (lines 1013-1047): 35 lines
```

#### Extraction Complexity: **LOW**
- No state management
- No effect hooks
- 2 event handlers (onComplete, onReopen)
- Conditional button rendering (if completed)

#### Test Impact
```
Current App.test.tsx:  No direct tests for folder completion
After extraction:
  + New FolderCompletionControls.test.tsx:  ~60-80 lines

Benefits:
  ✓ Can test folder locked state display
  ✓ Can test button state transitions
  ✓ Can test handler callbacks
  ✓ Improves testability (separate from App complexity)
```

#### Extraction Order: **3rd** (independent, can follow any previous)

---

### Candidate 4: `<HeaderNav />` Component
**Priority:** MEDIUM | **Complexity:** LOW | **Test Impact:** LOW

#### Current Location
Lines 554-594 (40 lines)

#### Responsibility
Header navigation:
- Tab switching (Ingest vs CFEx)
- Settings button

#### Props Interface
```typescript
interface HeaderNavProps {
  currentTab: 'ingest' | 'cfex';
  onTabChange: (tab: 'ingest' | 'cfex') => void;
  onSettingsClick: () => void;
}
```

#### State Ownership
- **currentTab:** Lifted from App
- **Handlers:** Lifted from App
- **NO local state**

#### Extraction Complexity: **LOW**
- No state
- No effects
- 2 callbacks

#### Test Impact
```
Benefits:
  ✓ Can test tab switching independently
  ✓ Can test settings button click
  ✓ Minimal impact (40 lines of pure UI)
```

#### Extraction Order: **4th** (nice-to-have, lowest priority)

---

## SECTION 3: DEPENDENCY ANALYSIS

### Tight Coupling Map

```
App State      → Components
─────────────────────────────
files          → Sidebar (existing), MetadataForm (new), MediaViewer (new)
currentFile    → MediaViewer (new), MetadataForm (new)
mediaDataUrl   → MediaViewer (new)
location*      → MetadataForm (new)
subject*       → MetadataForm (new)
action*        → MetadataForm (new)
shotType*      → MetadataForm (new)
keywords*      → MetadataForm (new)
isLoading      → MetadataForm (new), MediaViewer (new)
isFolderCompleted → MetadataForm (new), FolderCompletionControls (new)

* = Form field state (7 separate state vars that could be unified)
```

### Extraction Dependencies

**Independent extractions (can happen in any order):**
```
MediaViewer
  ├─ Depends on: currentFile, mediaDataUrl, isLoadingMedia,
  │              transcodeProgress, transcodePercentage, codecWarning
  └─ Blocks: Nothing (read-only props)

FolderCompletionControls
  ├─ Depends on: isFolderCompleted, onComplete, onReopen
  └─ Blocks: Nothing

HeaderNav
  ├─ Depends on: currentTab, onTabChange, onSettingsClick
  └─ Blocks: Nothing
```

**Sequential extraction (order matters):**
```
1. Extract MediaViewer FIRST
   └─ Reduces App complexity: 1077 → 981 lines
   └─ Unblocks MetadataForm extraction

2. Extract MetadataForm SECOND
   └─ Reduces App complexity: 981 → 729 lines
   └─ Moves 402 lines of existing tests
   └─ Enables MetadataForm testing improvements
```

### Recommended Extraction Sequence

```
Phase 1 (Week 1):
  ├─ Extract MediaViewer (96 lines)
  │  └─ Create src/components/MediaViewer.tsx
  │  └─ Create src/components/MediaViewer.test.tsx (new tests)
  │  └─ Update App.tsx (remove lines 616-710)
  │
  └─ Extract FolderCompletionControls (54 lines)
     └─ Create src/components/FolderCompletionControls.tsx
     └─ Create src/components/FolderCompletionControls.test.tsx
     └─ Update App.tsx (remove lines 996-1048)

Phase 2 (Week 2):
  └─ Extract MetadataForm (244 lines)
     └─ Create src/components/MetadataForm.tsx
     └─ Move lines 105-507 from App.test.tsx → MetadataForm.test.tsx
     └─ Update App.tsx (remove lines 712-963)

Phase 3 (Week 3) - Optional nice-to-have:
  └─ Extract HeaderNav (40 lines)
     └─ Create src/components/HeaderNav.tsx
     └─ Create src/components/HeaderNav.test.tsx
```

---

## SECTION 4: DETAILED EXTRACTION PLANS

### EXTRACTION #1: MediaViewer Component

**Effort:** 2-3 hours | **Risk:** LOW | **Test Value:** HIGH

#### Step 1: Create component file
```typescript
// src/components/MediaViewer.tsx

import type { FileMetadata } from '../types';

interface MediaViewerProps {
  mediaDataUrl: string;
  isLoading: boolean;
  currentFile: FileMetadata;
  transcodeProgress: string;
  transcodePercentage: number;
  codecWarning: string;
}

export function MediaViewer({
  mediaDataUrl,
  isLoading,
  currentFile,
  transcodeProgress,
  transcodePercentage,
  codecWarning,
}: MediaViewerProps) {
  // Lines 616-710 from App.tsx, extracted
}
```

#### Step 2: Cut JSX from App.tsx
- Delete lines 616-710
- Update App.tsx import to add `<MediaViewer />`

#### Step 3: Create tests
```typescript
// src/components/MediaViewer.test.tsx

describe('MediaViewer', () => {
  it('should display image when fileType is image', () => {
    // Test image rendering
  });

  it('should display video when fileType is video', () => {
    // Test video rendering
  });

  it('should show codec warning when provided', () => {
    // Test codec warning display
  });

  it('should show transcoding progress overlay when isLoading', () => {
    // Test progress display
  });

  it('should display transcode percentage when transcodeProgress provided', () => {
    // Test percentage display
  });
});
```

#### Step 4: Update App.tsx imports and JSX
```typescript
// Old: Lines 616-710 (96 lines of JSX)
// New: Single line
<MediaViewer
  mediaDataUrl={mediaDataUrl}
  isLoading={isLoadingMedia}
  currentFile={currentFile}
  transcodeProgress={transcodeProgress}
  transcodePercentage={transcodePercentage}
  codecWarning={codecWarning}
/>
```

#### Test Migration
- Create new MediaViewer.test.tsx (80-100 lines)
- No existing tests to move (MediaViewer is new presentation)
- App.test.tsx simplifies (JSX rendering tests move to MediaViewer.test.tsx)

#### Verification
```bash
npm run test -- src/components/MediaViewer.test.tsx
npm run lint && npm run typecheck
npm test  # Verify no regressions
```

---

### EXTRACTION #2: FolderCompletionControls Component

**Effort:** 1-2 hours | **Risk:** LOW | **Test Value:** MEDIUM

#### Step 1: Create component file
```typescript
// src/components/FolderCompletionControls.tsx

interface FolderCompletionControlsProps {
  isFolderCompleted: boolean;
  onComplete: () => void;
  onReopen: () => void;
}

export function FolderCompletionControls({
  isFolderCompleted,
  onComplete,
  onReopen,
}: FolderCompletionControlsProps) {
  // Lines 996-1048 from App.tsx
}
```

#### Step 2: Cut from App.tsx and paste
- Delete lines 995-1048 from App.tsx
- Add `<FolderCompletionControls />` in place

#### Step 3: Create tests
```typescript
// src/components/FolderCompletionControls.test.tsx

describe('FolderCompletionControls', () => {
  it('should display COMPLETE button when folder is not completed', () => {});
  it('should display REOPEN button when folder is completed', () => {});
  it('should call onComplete when COMPLETE button clicked', () => {});
  it('should call onReopen when REOPEN button clicked', () => {});
  it('should show locked status when isFolderCompleted is true', () => {});
});
```

#### Verification
```bash
npm run test -- src/components/FolderCompletionControls.test.tsx
npm test  # Verify no regressions
```

---

### EXTRACTION #3: MetadataForm Component

**Effort:** 4-6 hours | **Risk:** MEDIUM | **Test Value:** HIGHEST

#### Step 1: Design component interface
```typescript
// src/components/MetadataForm.tsx

interface MetadataFormProps {
  // Current file
  currentFile: FileMetadata;

  // Form values
  location: string;
  subject: string;
  action: string;
  shotType: ShotType | '';
  keywords: string;
  shotTypes: string[];

  // State flags
  isFolderCompleted: boolean;
  isLoading: boolean;
  isAIConfigured: boolean;
  statusMessage: string;
  codecWarning: string;
  canSave: boolean;

  // Event handlers
  onLocationChange: (value: string) => void;
  onSubjectChange: (value: string) => void;
  onActionChange: (value: string) => void;
  onShotTypeChange: (value: ShotType) => void;
  onKeywordsChange: (value: string) => void;
  onSave: () => void;
  onAIAssist: () => void;
  onNext: () => void;
  onPrevious: () => void;
}
```

#### Step 2: Extract JSX
- Copy lines 712-963 from App.tsx
- Replace state variable references with prop references
- Replace setLocation(...) with onLocationChange(...), etc.

#### Step 3: Migrate existing tests
```bash
# In App.test.tsx, tests at lines 81-510 become MetadataForm.test.tsx

# OLD: describe('Action Field Feature', () => {
# NEW: describe('MetadataForm - Action Field', () => {

# 402 lines of tests migrate 1:1 (minimal changes needed)
```

#### Step 4: Update App.tsx
```typescript
// Before: 252 lines of form JSX
// After: 1 component line

<MetadataForm
  currentFile={currentFile}
  location={location}
  subject={subject}
  action={action}
  shotType={shotType}
  keywords={keywords}
  shotTypes={shotTypes}
  isFolderCompleted={isFolderCompleted}
  isLoading={isLoading}
  isAIConfigured={isAIConfigured}
  statusMessage={statusMessage}
  codecWarning={codecWarning}
  canSave={canSave}
  onLocationChange={setLocation}
  onSubjectChange={setSubject}
  onActionChange={setAction}
  onShotTypeChange={setShotType}
  onKeywordsChange={setKeywords}
  onSave={handleSave}
  onAIAssist={handleAIAssist}
  onNext={handleNext}
  onPrevious={handlePrevious}
/>
```

#### Test Migration
```bash
# Move from App.test.tsx to MetadataForm.test.tsx:
# Lines 81-510 (430 lines) → MetadataForm.test.tsx

# Update imports in tests:
# import App from './App'  →  import { MetadataForm } from './MetadataForm'

# Update render() calls:
# render(<App />)  →  render(<MetadataForm {...props} />)

# Key tests to verify:
# ✓ Action field rendering (lines 105-159)
# ✓ Action field state management (lines 162-228)
# ✓ AI result population (lines 277-395)
# ✓ File parsing (lines 402-507)
```

#### Verification
```bash
npm run test -- src/components/MetadataForm.test.tsx
npm run lint && npm run typecheck
npm test  # Verify no regressions (App.test.tsx still has ~80 lines)
```

---

## SECTION 5: TEST IMPACT ANALYSIS

### Current Test Coverage

```
Test File                          Lines    Coverage Focus
─────────────────────────────────────────────────────────
src/App.test.tsx                   510      Form behavior + navigation
src/App.windowResize.test.tsx       80      Window resize handling
src/components/Sidebar.test.tsx    573      Sidebar feature
src/components/BatchOps.test.tsx  1149      Batch processing
src/components/SettingsModal.test  1621      Settings modal
...other component tests...

TOTAL: ~5,500 lines of tests
```

### Test Refactoring Roadmap

```
Phase 1: Extract MediaViewer
├─ Create: src/components/MediaViewer.test.tsx (80-100 new lines)
├─ Modify: src/App.test.tsx (-30 lines of redundant media tests)
└─ Result: +50-70 lines of focused testing

Phase 2: Extract FolderCompletionControls
├─ Create: src/components/FolderCompletionControls.test.tsx (60-80 new lines)
├─ Modify: src/App.test.tsx (-0 lines, no existing tests)
└─ Result: +60-80 lines of new testing

Phase 3: Extract MetadataForm
├─ Create: src/components/MetadataForm.test.tsx (move 402 lines)
├─ Modify: src/App.test.tsx (-402 lines moved out)
├─ Modify: src/App.test.tsx (+0 lines, form tests now in MetadataForm.test.tsx)
└─ Result: Lines preserved, better organization
```

### Post-Extraction Test Organization

```
src/App.test.tsx
├─ Basic rendering (header, sidebar display)
├─ Folder selection workflow
├─ File navigation (next/previous)
├─ Tab switching (Ingest vs CFEx)
├─ Settings open/close
└─ Approximate size: 80-100 lines

src/components/MediaViewer.test.tsx (NEW)
├─ Image display
├─ Video display
├─ Codec warning display
├─ Transcode progress overlay
└─ Approximate size: 100-120 lines

src/components/MetadataForm.test.tsx (MOVED + NEW)
├─ Location field editing
├─ Subject field editing
├─ Action field (video vs image)
├─ Shot Type dropdown
├─ Generated title preview
├─ Save button disabled state
├─ AI result population
├─ File parsing logic
└─ Approximate size: 430 lines (moved) + 30-50 lines (new tests)

src/components/FolderCompletionControls.test.tsx (NEW)
├─ Button state transitions
├─ Handler callback execution
└─ Approximate size: 60-80 lines
```

### Test Improvement Metrics

**Before Extraction:**
```
App.test.tsx:           510 lines (mixed concerns)
  ├─ Navigation tests:   ~100 lines
  ├─ Form tests:        ~400 lines
  └─ Media tests:       ~10 lines
Total App component tests: 510 lines
```

**After Extraction:**
```
App.test.tsx:                     80-100 lines (navigation only)
MediaViewer.test.tsx:            100-120 lines (media only)
MetadataForm.test.tsx:           430+ lines (form logic)
FolderCompletionControls.test:     60-80 lines (controls)
─────────────────────────────────────────────
Total: ~670-730 lines of organized tests

Benefits:
✓ 30-40% improvement in test focus (each test file has single responsibility)
✓ Form tests now isolated from navigation noise
✓ Media tests now isolated from form complexity
✓ Easier to run specific feature tests
✓ Easier to onboard new developers (clear test organization)
```

---

## SECTION 6: PRIORITIZED EXTRACTION PLAN

### TOP 3 EXTRACTION CANDIDATES (Recommended Priority Order)

#### 1. EXTRACT MediaViewer (HIGHEST VALUE)
**Why First:**
- Unblocks MetadataForm extraction
- Lowest risk (purely presentational)
- Improves test clarity immediately
- 96 lines → 30-40 lines after extraction

**Metrics:**
- **Effort:** 2-3 hours
- **Risk:** LOW (read-only props)
- **Test Value:** HIGH (media display, codec warnings, progress)
- **Blocks:** MetadataForm (conceptually, not technically)

**Extraction Impact:**
```
App.tsx:  1077 → 981 lines
Tests:    +80-100 lines of focused media tests
```

---

#### 2. EXTRACT MetadataForm (HIGHEST TEST VALUE)
**Why Second:**
- 402 lines of existing tests already written
- Isolates form logic from navigation
- Enables form-specific testing improvements
- 244 lines → 20-30 lines after extraction

**Metrics:**
- **Effort:** 4-6 hours
- **Risk:** MEDIUM (9 prop handlers, coordinate updates)
- **Test Value:** HIGHEST (402 lines of tests move)
- **Blocks:** Nothing (can run in parallel with MediaViewer)

**Extraction Impact:**
```
App.tsx:  981 → 737 lines (or ~729 after MediaViewer)
Tests:    Move 402 lines, App.test.tsx → MetadataForm.test.tsx
          +30-50 lines of new form-specific tests
```

---

#### 3. EXTRACT FolderCompletionControls (MEDIUM VALUE)
**Why Third:**
- Clean, isolated responsibility
- Nice-to-have for completeness
- 54 lines → 10-15 lines after extraction
- Improves code readability of batch panel area

**Metrics:**
- **Effort:** 1-2 hours
- **Risk:** LOW (2 simple callbacks)
- **Test Value:** MEDIUM (new test coverage)
- **Blocks:** Nothing

**Extraction Impact:**
```
App.tsx:  737 → 683 lines
Tests:    +60-80 lines of new control tests
```

---

## SECTION 7: FINAL METRICS & RECOMMENDATIONS

### Post-Extraction Code Metrics

```
BEFORE EXTRACTION:
  App.tsx:                 1,077 lines
  Components:              6 (Sidebar, SettingsModal, BatchOps, etc.)
  State variables:         19 useState() calls in one component
  useEffect hooks:         5 in App.tsx

AFTER EXTRACTION (All 3):
  App.tsx:                 683 lines (-39% reduction)
  Components:              9 (+3 new components)
  State variables:         6 in App.tsx (location, subject, action, shotType, keywords, ...)
  useEffect hooks:         3 in App.tsx

MAINTAINABILITY GAINS:
  ✓ App.tsx now focuses on: folder navigation, file traversal, coordination
  ✓ MediaViewer handles: media display (image/video), transcoding UI
  ✓ MetadataForm handles: form inputs, field state, save/AI coordination
  ✓ FolderCompletionControls handles: folder lock/unlock UI
```

### Test Coverage Improvement

```
BEFORE:
  App.test.tsx:  510 lines (form + navigation mixed)
  MediaViewer:   0 lines (not extracted)
  MetadataForm:  0 lines (not extracted)

AFTER:
  App.test.tsx:  80-100 lines (navigation only)
  MediaViewer:   100-120 lines (media display tests)
  MetadataForm:  430+ lines (form tests + new tests)
  FolderControls: 60-80 lines (control tests)
  ─────────────────────────────
  Total:         ~670-730 lines (organized by responsibility)

BENEFITS:
  ✓ Each test file tests single component
  ✓ Easier to find tests for specific features
  ✓ Faster test execution (parallel test discovery)
  ✓ Better documentation (tests show component API)
  ✓ Easier to maintain (changes isolated to relevant tests)
```

### Risk Assessment

```
EXTRACTION 1 (MediaViewer):
  Risk Level: LOW
  Why: Purely presentational, zero business logic
  Mitigation: All props are read-only, easy to test

EXTRACTION 2 (MetadataForm):
  Risk Level: MEDIUM
  Why: Multiple handlers, form state coordination
  Mitigation: 402 existing tests move with component, minimal logic changes
  Contingency: Keep tests in App.test.tsx if needed, extract component only

EXTRACTION 3 (FolderCompletionControls):
  Risk Level: LOW
  Why: Simple 2-button control, isolated callbacks
  Mitigation: Only 2 handler props, easy to test independently

OVERALL PROJECT RISK: LOW
  - Extractions are additive (new files, minimal deletions)
  - Existing tests provide safety net
  - Can be done incrementally
  - No architectural changes required
```

---

## SECTION 8: ALTERNATIVE APPROACHES (Not Recommended)

### Alternative A: Extract Hooks (NOT RECOMMENDED)
**Why not:** Adds abstraction layer without reducing complexity
- `useMetadataFields()` hook doesn't reduce App.tsx size
- Still requires form JSX in App.tsx
- Creates harder-to-test hook interdependencies

### Alternative B: State Management Refactor (NOT RECOMMENDED)
**Why not:** Scope creep; adds Redux/Zustand complexity
- App.tsx already simple enough for local state
- Form state is not shared with other components
- Risk > benefit

### Alternative C: Full Component Library (NOT RECOMMENDED)
**Why not:** Over-engineering; extract only high-value components
- Sidebar already extracted (working well)
- BatchOperationsPanel already extracted (working well)
- MediaViewer + MetadataForm are the next high-value targets
- HeaderNav is nice-to-have, not urgent

---

## RECOMMENDATIONS

### Immediate Action Items

1. **Extract MediaViewer Component**
   - Timeline: 2-3 hours
   - Effort: 2-3 hours
   - Start: Immediately
   - Blocks: MetadataForm extraction (conceptually)

2. **Extract MetadataForm Component**
   - Timeline: 1-2 days (includes test migration)
   - Effort: 4-6 hours + test organization
   - Start: After MediaViewer review passes
   - Highest test value (402 lines of existing tests)

3. **Extract FolderCompletionControls Component**
   - Timeline: 1-2 hours
   - Effort: 1-2 hours
   - Start: Can run in parallel with #2
   - Nice-to-have for code clarity

### Quality Gates
- All extractions must pass: `npm run lint && npm run typecheck && npm test`
- New components must have >80% test coverage
- Existing tests must not regress
- App.tsx must remain <800 lines after all extractions

### Success Criteria
```
✓ App.tsx reduced from 1,077 → ~683 lines (-39%)
✓ 3 new focused components with clean props
✓ Test organization improved (tests grouped by component)
✓ All existing tests pass + new tests added
✓ TypeScript types remain strict (no `any`)
✓ No behavior changes (refactoring only)
```

---

## APPENDIX A: Component Prop Interfaces (Complete)

### MediaViewer Props
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

### MetadataForm Props
```typescript
interface MetadataFormProps {
  currentFile: FileMetadata;
  location: string;
  subject: string;
  action: string;
  shotType: ShotType | '';
  keywords: string;
  shotTypes: string[];
  isFolderCompleted: boolean;
  isLoading: boolean;
  isAIConfigured: boolean;
  statusMessage: string;
  codecWarning: string;
  canSave: boolean;
  onLocationChange: (value: string) => void;
  onSubjectChange: (value: string) => void;
  onActionChange: (value: string) => void;
  onShotTypeChange: (value: ShotType) => void;
  onKeywordsChange: (value: string) => void;
  onSave: () => void;
  onAIAssist: () => void;
  onNext: () => void;
  onPrevious: () => void;
}
```

### FolderCompletionControls Props
```typescript
interface FolderCompletionControlsProps {
  isFolderCompleted: boolean;
  onComplete: () => void;
  onReopen: () => void;
}
```

### HeaderNav Props (Optional 4th extraction)
```typescript
interface HeaderNavProps {
  currentTab: 'ingest' | 'cfex';
  onTabChange: (tab: 'ingest' | 'cfex') => void;
  onSettingsClick: () => void;
}
```

---

## APPENDIX B: Git Commit Message Templates

### Extraction 1: MediaViewer
```bash
git commit -m "refactor: extract MediaViewer component from App.tsx

- Move media display logic (image/video/transcoding) to new component
- Create src/components/MediaViewer.tsx (96 lines)
- Create src/components/MediaViewer.test.tsx (100 lines)
- Update App.tsx to use MediaViewer component
- Reduces App.tsx from 1077 → 981 lines
- Improves test organization and media display testability"
```

### Extraction 2: MetadataForm
```bash
git commit -m "refactor: extract MetadataForm component from App.tsx

- Move form inputs (location, subject, action, shotType, keywords) to new component
- Create src/components/MetadataForm.tsx (244 lines)
- Move existing tests from App.test.tsx to MetadataForm.test.tsx (402 lines)
- Update App.tsx to use MetadataForm component
- Reduces App.tsx from 981 → 737 lines
- Improves form testing isolation and maintainability"
```

### Extraction 3: FolderCompletionControls
```bash
git commit -m "refactor: extract FolderCompletionControls component from App.tsx

- Move folder lock/unlock UI to new component
- Create src/components/FolderCompletionControls.tsx (54 lines)
- Create src/components/FolderCompletionControls.test.tsx (70 lines)
- Update App.tsx to use FolderCompletionControls component
- Reduces App.tsx from 737 → 683 lines
- Completes initial component decomposition (Issue #26)"
```

---

**End of Analysis Document**

Generated: 2025-11-29
Analyst: Surveyor Agent (Logos Cognition)
