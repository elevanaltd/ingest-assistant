# JSON Sidecar Guardrails v1.0

**Purpose:** Lightweight format validation and lock protocol enforcement for `.ingest-metadata.json` files shared between Ingest Assistant and CEP Panel.

**Scope:** JSON format only (Supabase guardrails deferred to future phase - see GitHub Issue)

**Status:** Production-ready for current JSON-based workflow

---

## 1. JSON Schema Validation

### Schema Version

**Current:** `_schema: "2.0"`

**Validation Rule:** Both IA and CEP Panel MUST reject files with unknown schema versions.

```typescript
// Schema version check (both apps)
if (json._schema !== "2.0") {
  throw new Error(`Unsupported schema version: ${json._schema}. Expected 2.0`);
}
```

**Why:** Prevents silent failures when schema evolves. Apps explicitly support only known versions.

---

### Required Root-Level Fields

**Mandatory:**
- `_schema` (string): Version identifier ("2.0")
- File entries (object): Keyed by original filename without extension

**Validation:**
```typescript
const rootKeys = Object.keys(json);
if (!rootKeys.includes('_schema')) {
  throw new Error('Missing required _schema field');
}

const fileKeys = rootKeys.filter(k => k !== '_schema');
if (fileKeys.length === 0) {
  throw new Error('No file entries found in JSON');
}
```

---

### Required File Entry Fields

**Per file entry, these fields MUST exist:**

| Field | Type | Description | Validation |
|-------|------|-------------|------------|
| `id` | string | Original filename without extension | `id === Object.key` |
| `originalFilename` | string | Complete filename with extension | Must end with valid extension |
| `currentFilename` | string | Current filename (may differ if renamed) | Not empty |
| `filePath` | string | Absolute path to file | Must be absolute path |
| `extension` | string | File extension | Must start with `.` |
| `fileType` | string | "image" or "video" | Enum: ["image", "video"] |
| `location` | string | Location field | Not empty after COMPLETE |
| `subject` | string | Subject field | Not empty after COMPLETE |
| `shotType` | string | Shot type (ESTAB, CU, WS, etc.) | Valid shotType enum |
| `shotName` | string | Computed: `{location}-{subject}-{action}-{shotType}-#{shotNumber}` | Matches format pattern |
| `createdAt` | string | ISO 8601 timestamp | Valid ISO date |
| `createdBy` | string | Creator identifier | One of: ["ingest-assistant", "cep-panel"] |
| `modifiedAt` | string | ISO 8601 timestamp | Valid ISO date |
| `modifiedBy` | string | Last modifier | One of: ["ingest-assistant", "cep-panel"] |
| `locked` | boolean | Folder completion status | Boolean |
| `lockedFields` | array | Field-level locks | Array of strings |

**Optional Fields:**
- `action` (string): Only for videos
- `shotNumber` (number): Assigned after chronological sort
- `keywords` (array): Keyword list
- `description` (string): Human-readable description
- `lockedBy` (string | null): User who locked
- `lockedAt` (string | null): ISO timestamp of lock

---

### Field Validation Rules

```typescript
// Example validation function
function validateFileEntry(key: string, entry: any): ValidationResult {
  const errors: string[] = [];

  // ID must match object key
  if (entry.id !== key) {
    errors.push(`ID mismatch: key="${key}" but id="${entry.id}"`);
  }

  // originalFilename must have extension
  if (!entry.originalFilename.includes('.')) {
    errors.push('originalFilename missing extension');
  }

  // fileType must be valid enum
  if (!['image', 'video'].includes(entry.fileType)) {
    errors.push(`Invalid fileType: ${entry.fileType}`);
  }

  // Timestamps must be valid ISO 8601
  if (!isValidISO8601(entry.createdAt)) {
    errors.push('createdAt not valid ISO 8601');
  }

  // shotName format validation
  const shotNamePattern = /^[\w-]+-[\w-]+(-[\w-]+)?-(ESTAB|CU|WS|MID|UNDER|FP|TRACK)(-#\d+)?$/;
  if (!shotNamePattern.test(entry.shotName)) {
    errors.push('shotName does not match expected format');
  }

  return { valid: errors.length === 0, errors };
}
```

---

## 2. Lock Protocol

### Folder-Level Lock (`locked: true`)

**Purpose:** Prevent reprocessing of completed folders (COMPLETE button in IA)

**Effect when `locked: true`:**
1. **Ingest Assistant:**
   - FileManager.scanFolder() returns cached metadata (no re-scan)
   - Chronological sorting SKIPPED (shot numbers frozen)
   - AI batch processing DISABLED
   - All metadata fields READ-ONLY in UI
   - Save and AI Assist buttons DISABLED

2. **CEP Panel:**
   - Can still read metadata for QC
   - Can unlock via REOPEN button (admin only)
   - Warns user if attempting to edit locked folder

**Unlock Process:**
- IA: Click "REOPEN" button → sets `locked: false`
- CEP Panel: Click "Unlock" button (requires admin permission)

**Validation:**
```typescript
// IA: Check before processing
if (metadataStore.locked) {
  console.log('Folder is LOCKED - skipping processing');
  return existingMetadata; // Return cached, don't re-scan
}

// CEP Panel: Check before write
if (json._locked && !userIsAdmin) {
  throw new Error('Cannot modify locked folder without admin permission');
}
```

---

### Field-Level Lock (`lockedFields: []`)

**Purpose:** Prevent IA from overwriting QC-corrected fields

**Format:**
```json
{
  "EA001621": {
    "location": "kitchen",
    "subject": "oven",
    "lockedFields": ["location", "subject"]
  }
}
```

**Effect when field in `lockedFields`:**
1. **Ingest Assistant:**
   - AI batch processing SKIPS locked fields
   - Logs: "Skipped location (locked by QC)"
   - Updates only unlocked fields
   - Does NOT throw error (graceful skip)

2. **CEP Panel:**
   - Can unlock individual fields (admin only)
   - Shows lock icon next to locked fields
   - Warns before overwriting locked field

**Lock Array Rules:**
- Can contain: "location", "subject", "action", "shotType", "keywords", "description"
- Cannot lock immutable fields: "id", "originalFilename", "fileType", "createdAt"
- Cannot lock computed fields: "shotName" (derived from location/subject/action/shotType)

**Validation:**
```typescript
// IA: Skip locked fields during AI update
function applyAIMetadata(fileId: string, aiResult: AIResult): void {
  const entry = json[fileId];
  const lockedFields = entry.lockedFields || [];

  if (!lockedFields.includes('location')) {
    entry.location = aiResult.location;
  } else {
    console.log(`Skipped location for ${fileId} (locked)`);
  }

  if (!lockedFields.includes('subject')) {
    entry.subject = aiResult.subject;
  } else {
    console.log(`Skipped subject for ${fileId} (locked)`);
  }

  // Update modifiedAt/modifiedBy for unlocked fields only
  if (Object.keys(aiResult).some(k => !lockedFields.includes(k))) {
    entry.modifiedAt = new Date().toISOString();
    entry.modifiedBy = 'ingest-assistant';
  }
}
```

---

## 3. Atomic Write Protocol

**Purpose:** Prevent corruption during concurrent writes (IA + CEP both writing)

**Pattern:** Temp file → Atomic rename

```typescript
// Both IA and CEP use this pattern
async function saveMetadataJSON(folderPath: string, json: object): Promise<void> {
  const metadataPath = path.join(folderPath, '.ingest-metadata.json');
  const tempPath = path.join(folderPath, '.ingest-metadata.json.tmp');

  // Write to temp file
  await fs.writeFile(tempPath, JSON.stringify(json, null, 2), 'utf-8');

  // Atomic rename (OS-level atomic operation)
  await fs.rename(tempPath, metadataPath);

  console.log('✓ Metadata saved atomically');
}
```

**Why:** `fs.rename()` is atomic on macOS/Linux. If two apps write simultaneously, one wins (no partial writes or corruption).

---

## 4. Conflict Detection

**Purpose:** Detect when IA and CEP edit same file concurrently

**Strategy:** Last-write-wins with timestamp comparison

```typescript
// Before writing, check if file was modified since last read
async function checkConflict(fileId: string, lastReadTimestamp: string): Promise<void> {
  const currentJSON = await readMetadataJSON(folderPath);
  const currentEntry = currentJSON[fileId];

  if (currentEntry.modifiedAt > lastReadTimestamp) {
    console.warn(`Conflict detected for ${fileId}: modified by ${currentEntry.modifiedBy} at ${currentEntry.modifiedAt}`);
    // Option 1: Throw error and ask user to reload
    // Option 2: Merge changes (complex)
    // Current: Last-write-wins (simpler for MVP)
  }
}
```

**User Experience:**
- IA: Shows warning if CEP modified file since folder opened
- CEP Panel: Shows warning if IA modified file since clip loaded
- Both: Recommend user to reload before saving

---

## 5. File Discovery & Validation

**Purpose:** Ensure `.ingest-metadata.json` exists and is readable

### IA Discovery (Write Path)

```typescript
// IA creates JSON if missing
async function ensureMetadataExists(folderPath: string): Promise<void> {
  const metadataPath = path.join(folderPath, '.ingest-metadata.json');

  if (!await fs.pathExists(metadataPath)) {
    // Create empty JSON with schema version
    const emptyJSON = { _schema: "2.0" };
    await saveMetadataJSON(folderPath, emptyJSON);
    console.log('✓ Created new .ingest-metadata.json');
  }
}
```

### CEP Panel Discovery (Read Path)

```typescript
// CEP Panel finds JSON in proxy folder
function findMetadataPath(clipPath: string): string {
  // Extract directory from clip path
  // /LucidLink/EAV014/videos-proxy/shoot1-20251124/EA001621_proxy.mov
  // → /LucidLink/EAV014/videos-proxy/shoot1-20251124/.ingest-metadata.json

  const clipDir = path.dirname(clipPath);
  const metadataPath = path.join(clipDir, '.ingest-metadata.json');

  if (!fs.existsSync(metadataPath)) {
    throw new Error(`Metadata file not found: ${metadataPath}`);
  }

  return metadataPath;
}
```

---

## 6. Error Handling

### Missing JSON File

**IA Behavior:**
- Creates empty JSON with schema version
- Proceeds with file scan and AI analysis
- No error thrown

**CEP Panel Behavior:**
- Shows error: "Metadata file not found. Run Ingest Assistant first."
- Disables metadata editing until JSON exists
- Option: Create empty JSON with user confirmation

### Corrupt JSON File

**Both Apps:**
```typescript
try {
  const json = JSON.parse(fileContent);
  validateSchema(json); // Throws if schema invalid
} catch (error) {
  console.error('Corrupt metadata file:', error);
  // Option 1: Backup corrupt file, create new
  // Option 2: Show error, prevent editing
  // Current: Backup + create new
  await fs.rename(metadataPath, `${metadataPath}.corrupt.${Date.now()}`);
  await createEmptyMetadata(folderPath);
}
```

### Schema Version Mismatch

**Both Apps:**
```typescript
if (json._schema !== SUPPORTED_VERSION) {
  throw new Error(`Unsupported schema: ${json._schema}. This app supports v${SUPPORTED_VERSION}. Update app or migrate JSON.`);
}
```

---

## 7. Testing Requirements

### Unit Tests

**IA:**
- ✅ Schema validation rejects invalid JSON
- ✅ Lock protocol skips locked fields during AI update
- ✅ Atomic write creates temp file then renames
- ✅ Folder lock prevents re-scanning
- ✅ Conflict detection warns on concurrent modification

**CEP Panel:**
- ✅ JSON discovery finds file in proxy folder
- ✅ Lock protocol prevents editing locked fields
- ✅ Schema validation rejects unknown versions
- ✅ Atomic write prevents corruption
- ✅ Error handling for missing/corrupt JSON

### Integration Tests

**Cross-App:**
- ✅ IA writes JSON → CEP reads same values
- ✅ CEP edits JSON → IA respects lock protocol
- ✅ Concurrent writes don't corrupt JSON (last-write-wins)
- ✅ Folder COMPLETE in IA → CEP shows locked status

---

## 8. Migration Path

### JSON Schema Updates (Future)

**When schema changes from 2.0 → 3.0:**

1. **Backward Compatibility:**
   - New apps must read old schema (2.0)
   - Migrate on first write (2.0 → 3.0)
   - Preserve all existing data

2. **Migration Function:**
```typescript
function migrateSchema(json: any): any {
  if (json._schema === "2.0") {
    // Migrate 2.0 → 3.0
    json._schema = "3.0";
    // Add new fields with defaults
    // Transform existing fields if needed
  }
  return json;
}
```

3. **Version Support:**
   - Apps support N-1 schema versions (current + previous)
   - Warn user if schema too old (>2 versions behind)

---

## 9. Performance Considerations

### File Size Limits

**Typical JSON Size:**
- 100 files: ~30 KB
- 1000 files: ~300 KB
- 10,000 files: ~3 MB

**Read/Write Performance:**
- <100ms for typical folders (<1000 files)
- JSON.parse() is fast (native implementation)
- Atomic rename adds ~5ms overhead (acceptable)

**Optimization:**
- Don't reload entire JSON for single-file update (read → modify → write)
- Cache parsed JSON in memory (invalidate on file change)
- Use streaming parser for extremely large folders (>10,000 files)

---

## 10. Security Considerations

### Path Traversal Prevention

**Both Apps:**
```typescript
import { securityValidator } from './securityValidator';

// Validate folder path before reading JSON
await securityValidator.validateFilePath(folderPath);

// Ensure JSON path is within folder
const metadataPath = path.join(folderPath, '.ingest-metadata.json');
if (!metadataPath.startsWith(folderPath)) {
  throw new Error('Path traversal detected');
}
```

### XSS Prevention (CEP Panel)

**CEP Panel displays user input from JSON:**
```typescript
// Sanitize before rendering in HTML
function sanitizeForHTML(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Use when displaying location, subject, etc.
document.getElementById('location').textContent = sanitizeForHTML(entry.location);
```

---

## 11. Compliance Checklist

**Before Production Deployment:**

- [ ] Schema validation enforced in both apps
- [ ] Lock protocol prevents IA overwriting QC corrections
- [ ] Atomic write prevents concurrent corruption
- [ ] Conflict detection warns users
- [ ] Error handling for missing/corrupt JSON
- [ ] Unit tests passing (schema, lock, atomic write)
- [ ] Integration tests passing (cross-app round-trip)
- [ ] Path traversal prevention validated
- [ ] XSS prevention in CEP Panel validated
- [ ] Performance tested with 1000+ file folders

---

## 12. Related Documentation

- **JSON Schema Spec:** See CEP Panel North Star for complete field definitions
- **IA Implementation:** `electron/services/metadataStore.ts`
- **CEP Panel Implementation:** TBD (JSON sidecar read not yet implemented)
- **Supabase Guardrails:** See GitHub Issue (deferred 3-6 months)

---

**Version:** 1.0
**Last Updated:** 2025-11-18
**Status:** Production-ready for JSON-based workflow
**Next Phase:** Supabase integration guardrails (future)
