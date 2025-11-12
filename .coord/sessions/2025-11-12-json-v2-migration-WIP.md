# JSON Schema v2.0 Migration - Work In Progress

**Date:** 2025-11-12
**Session:** Cache invalidation fix → JSON schema redesign
**Status:** 🟡 IN PROGRESS - Breaking changes partially implemented
**Branch:** `fix/ce-issues-2`

---

## Context

User discovered that `.ingest-metadata.json` structure was outdated and not aligned with:
1. **Issue #54 XMP metadata strategy** (XMP-xmpDM:shotName, XMP-xmpDM:LogComment, XMP-dc:Description)
2. **Future CEP Panel integration** (needs audit trail for cross-referencing)
3. **Quality tracking** (need to know which system created/modified metadata)

**User approval:** Safe to break compatibility - only 2-3 test JSON files exist

---

## New JSON Structure (v2.0)

### Root Level
```json
{
  "_schema": "2.0",  // Version for future migrations
  "EA001736": { /* FileMetadata */ }
}
```

### FileMetadata Structure
```typescript
{
  // === File Identification ===
  "id": "EA001736",
  "originalFilename": "EA001736.JPG",
  "currentFilename": "EA001736.JPG",  // May be unchanged (no rename)
  "filePath": "/path/EA001736.JPG",
  "extension": ".JPG",
  "fileType": "image",

  // === Core Metadata (matches XMP) ===
  "mainName": "kitchen-fridge-serial-CU",  // XMP-xmpDM:shotName
  "keywords": ["beko", "serial-number"],    // XMP-dc:Description (RENAMED from "metadata")

  // === Structured Components (XMP-xmpDM:LogComment) ===
  "location": "kitchen",      // Required (empty string if not set)
  "subject": "fridge-serial", // Required
  "action": "",               // Empty string for images
  "shotType": "CU",           // ShotType | ''

  // === Processing State ===
  "processedByAI": true,

  // === Audit Trail (CEP Panel alignment) ===
  "createdAt": "2025-11-12T10:00:00.000Z",
  "createdBy": "ingest-assistant",  // or "cep-panel" | "manual"
  "modifiedAt": "2025-11-12T11:30:00.000Z",
  "modifiedBy": "ingest-assistant",
  "version": "1.1.0"  // App version
}
```

### Key Changes from v1.0
- ❌ **REMOVED:** `lastModified` → Replaced by `modifiedAt` (audit)
- ✅ **RENAMED:** `metadata: string[]` → `keywords: string[]` (clearer)
- ✅ **ADDED:** `_schema` at root (versioning)
- ✅ **ADDED:** `createdAt`, `createdBy`, `modifiedAt`, `modifiedBy`, `version` (audit trail)
- ✅ **CHANGED:** Structured fields (`location`, `subject`, `action`, `shotType`) now **required** (empty string, not optional)

---

## Changes Completed ✅

### 1. Type Definitions (`src/types/index.ts`)

**Lines modified:** 17-63, 164-181

**Changes:**
- Updated `FileMetadata` interface with new structure
- `metadata: string[]` → `keywords: string[]`
- Added audit fields: `createdAt`, `createdBy`, `modifiedAt`, `modifiedBy`, `version` (all required)
- Structured fields now required (empty string, not optional):
  - `location: string` (was `location?: string`)
  - `subject: string`
  - `action: string`
  - `shotType: ShotType | ''` (was `shotType?: ShotType`)
- Updated `AIAnalysisResult` to match (keywords + required structured fields)

### 2. MetadataStore (`electron/services/metadataStore.ts`)

**Lines added:** 5-15, 17-19, 26-64, 69-90, 143-202

**Changes:**
- Added `SCHEMA_VERSION = '2.0'` constant
- Added `APP_NAME = 'ingest-assistant'` constant
- Added `APP_VERSION` from package.json (reads at import time)
- Added `MetadataStoreFile` interface (includes `_schema` field)
- Updated `loadMetadata()`:
  - Extracts `_schema` version
  - Converts `createdAt`/`modifiedAt` strings → Date objects
  - Skips `_schema` key when loading metadata
- Updated `saveMetadata()`:
  - Injects `_schema: "2.0"` at root level
  - Writes proper v2.0 format
- Added **helper methods:**
  - `MetadataStore.createMetadata()` - Creates FileMetadata with audit trail
  - `MetadataStore.updateAuditTrail()` - Updates modifiedAt/modifiedBy/version

### 3. FileManager (`electron/services/fileManager.ts`)

**Lines modified:** 1-6, 88-101

**Changes:**
- Added import: `import { MetadataStore } from './metadataStore';`
- Updated `scanFolder()`:
  - Uses `MetadataStore.createMetadata()` to create FileMetadata
  - Ensures consistent audit trail on initial file discovery
  - Structured fields default to empty strings

---

## Changes Required (Not Yet Done) ❌

### CRITICAL - App will not compile until these are fixed:

#### 1. **electron/main.ts** (~10 handlers to update)

**Search for:** `\.metadata` (references to old field name)

**Lines found:** 469, 505, 545, 604, 606, 628, 656, 697, 735, 836, 926

**Required changes:**
- Rename `metadata` → `keywords` throughout
- Update IPC handler `file:update-metadata` → accepts `keywords: string[]`
- Update all `fileMetadata` creation to use `MetadataStore.createMetadata()`
- Update all `fileMetadata` updates to call `MetadataStore.updateAuditTrail()`
- Ensure structured fields are always set (empty string, not undefined)

**Example handler pattern (file:rename, line ~516):**
```typescript
// OLD:
fileMetadata = {
  id: fileId,
  originalFilename: path.basename(currentPath),
  currentFilename: path.basename(newPath),
  filePath: newPath,
  extension: path.extname(newPath),
  mainName: mainName,
  metadata: [],  // ❌ OLD
  processedByAI: false,
  lastModified: stats.mtime,  // ❌ OLD
  fileType: fileManager.getFileType(path.basename(newPath)),
  location: structured?.location,  // ❌ Optional
  subject: structured?.subject,
  action: structured?.action,
  shotType: structured?.shotType as ShotType | undefined,
};

// NEW:
fileMetadata = MetadataStore.createMetadata({
  id: fileId,
  originalFilename: path.basename(currentPath),
  currentFilename: path.basename(newPath),
  filePath: newPath,
  extension: path.extname(newPath),
  mainName: mainName,
  keywords: [],  // ✅ NEW
  fileType: fileManager.getFileType(path.basename(newPath)),
  location: structured?.location || '',  // ✅ Required, empty string default
  subject: structured?.subject || '',
  action: structured?.action || '',
  shotType: structured?.shotType || '',
  processedByAI: false
});
```

**Example update pattern (file:update-metadata, line ~604):**
```typescript
// OLD:
fileMetadata.metadata = validated.metadata;
await store.updateFileMetadata(validated.fileId, fileMetadata);

// NEW:
fileMetadata.keywords = validated.keywords;  // ✅ Renamed field
MetadataStore.updateAuditTrail(fileMetadata);  // ✅ Update audit
await store.updateFileMetadata(validated.fileId, fileMetadata);
```

#### 2. **src/App.tsx** (React component)

**Search for:** `.metadata` (React component accessing field)

**Required changes:**
- Find all `currentFile.metadata` references
- Rename to `currentFile.keywords`
- Update state variables: `metadata` → `keywords`
- Update form field references

**Example pattern:**
```typescript
// OLD:
const [metadata, setMetadata] = useState<string>('');
const metadataTags = metadata.split(',').map(tag => tag.trim());
await window.electronAPI.updateMetadata(currentFile.id, metadataTags);

// NEW:
const [keywords, setKeywords] = useState<string>('');
const keywordTags = keywords.split(',').map(tag => tag.trim());
await window.electronAPI.updateKeywords(currentFile.id, keywordTags);
```

#### 3. **electron/preload.ts** (IPC API definitions)

**Required changes:**
- Rename `updateMetadata` → `updateKeywords` (or keep same name but update types)
- Update type signatures to use `keywords: string[]`

#### 4. **electron/schemas/ipcSchemas.ts** (Zod validation)

**Search for:** `FileUpdateMetadataSchema`

**Required changes:**
- Rename schema or update field: `metadata` → `keywords`
- Update validation to match new structure

#### 5. **Test Files** (Multiple files)

**Search all test files for:** `.metadata`

**Files likely affected:**
- `electron/services/fileManager.test.ts`
- `electron/services/metadataStore.test.ts`
- `electron/main.test.ts`
- `src/App.test.tsx`
- Any integration tests

**Required changes:**
- Update assertions: `.metadata` → `.keywords`
- Update mock data to include audit fields
- Add tests for audit trail behavior

---

## Migration Strategy

### Phase 1: Fix Type Errors (Run first)

```bash
npm run typecheck 2>&1 | tee typecheck-errors.txt
```

This will show all compilation errors. Fix them systematically:
1. `main.ts` handlers
2. `App.tsx` component
3. `preload.ts` and `ipcSchemas.ts`
4. Test files

### Phase 2: Update IPC Handlers (main.ts)

**Order of operations:**
1. Update `file:load-files` (line ~449) - Hydration logic
2. Update `file:rename` (line ~516) - File rename + metadata
3. Update `file:update-metadata` (line ~604) - Rename to updateKeywords
4. Update `file:update-structured-metadata` (line ~667)
5. Update AI batch handlers (line ~788+) - AI analysis results

**Template for each handler:**
```typescript
// 1. Use MetadataStore.createMetadata() for new metadata
// 2. Call MetadataStore.updateAuditTrail() for updates
// 3. Ensure structured fields are empty strings (not undefined)
// 4. Use 'keywords' not 'metadata'
```

### Phase 3: Update Frontend (App.tsx)

1. Search for `metadata` state variable
2. Rename to `keywords`
3. Update all references
4. Update IPC calls

### Phase 4: Fix Tests

1. Run tests to see failures
2. Update assertions for new field names
3. Add audit trail fields to mock data
4. Verify all tests pass

---

## Prompt for Next Session

```markdown
I'm continuing the JSON v2.0 migration started on 2025-11-12.

**Context:** We're migrating `.ingest-metadata.json` from v1.0 to v2.0 to align with Issue #54 XMP metadata strategy and add audit trail for CEP Panel integration.

**What's been done:**
1. ✅ Updated TypeScript types (`src/types/index.ts`) - `metadata` → `keywords`, added audit fields
2. ✅ Updated `MetadataStore` with schema versioning and helper methods
3. ✅ Updated `FileManager.scanFolder()` to use new structure

**What needs to be completed:**
1. ❌ Update `electron/main.ts` IPC handlers (~10 handlers):
   - Replace `.metadata` with `.keywords`
   - Use `MetadataStore.createMetadata()` for new entries
   - Call `MetadataStore.updateAuditTrail()` for updates
   - Ensure structured fields default to empty strings (not undefined)

2. ❌ Update `src/App.tsx` React component:
   - Rename state variable `metadata` → `keywords`
   - Update all `.metadata` references to `.keywords`

3. ❌ Update `electron/preload.ts` and `electron/schemas/ipcSchemas.ts`

4. ❌ Fix all test files

**Session document:** `.coord/sessions/2025-11-12-json-v2-migration-WIP.md` has complete details.

**First step:** Run `npm run typecheck` to get full list of compilation errors, then fix systematically.

Please continue this migration following the documented plan. Use TDD discipline where appropriate for critical handlers.
```

---

## Files Changed (WIP)

- ✅ `src/types/index.ts`
- ✅ `electron/services/metadataStore.ts`
- ✅ `electron/services/fileManager.ts`
- ⏳ `electron/main.ts` (needs updates)
- ⏳ `src/App.tsx` (needs updates)
- ⏳ `electron/preload.ts` (needs updates)
- ⏳ `electron/schemas/ipcSchemas.ts` (needs updates)
- ⏳ All test files (need updates)

---

## Testing Checklist (After Completion)

- [ ] TypeScript compilation: `npm run typecheck`
- [ ] Linting: `npm run lint`
- [ ] Unit tests: `npm test`
- [ ] Manual test: Load folder, verify JSON structure
- [ ] Manual test: Rename file, check audit trail
- [ ] Manual test: AI assist, verify keywords field
- [ ] Manual test: Verify XMP metadata still writes correctly
- [ ] Manual test: Delete old `.ingest-metadata.json`, verify new format created

---

## Rollback Plan

If issues arise:
```bash
git stash  # Save WIP
git checkout fix/ce-issues-2~3  # Before JSON v2.0 changes
```

Old JSON files are compatible with old code.

---

## Notes

- **Breaking change:** Old `.ingest-metadata.json` files will fail to load properly with partial implementation
- **User confirmed:** Safe to delete existing JSON files (only 2-3 test files)
- **CEP Panel alignment:** Audit fields enable cross-system tracking
- **Schema version:** Enables future migrations with detection

---

**Implementation Lead:** Claude Code
**Session Duration:** ~2 hours
**Token Usage:** ~156K tokens (approaching limit, hence handoff)
