---
name: smartsuite-patterns
description: SmartSuite API patterns and field format validation. Covers choices vs options distinction (UUID corruption prevention), dry_run safety patterns, field format validation, and MCP integration best practices. Critical for preventing UUID corruption bugs.
allowed-tools: Read
---

# SmartSuite Patterns Skill

## Purpose

Provides SmartSuite API patterns, field format requirements, and UUID corruption prevention strategies. Critical for correct SmartSuite integration and data integrity.

## When to Use This Skill

Auto-activates when:
- Working with SmartSuite API
- Creating or updating SmartSuite fields
- "choices vs options" queries
- UUID corruption prevention
- SmartSuite field format validation
- SmartSuite MCP integration

---

## ⚠️ CRITICAL: UUID Corruption Prevention

### THE GOLDEN RULE: Use `choices`, NEVER `options`

**WRONG** (destroys all data):
```json
{
  "params": {
    "options": [  // ❌ WRONG - creates new UUIDs
      {"value": "draft"},
      {"value": "active"}
    ]
  }
}
```

**CORRECT** (preserves UUIDs):
```json
{
  "params": {
    "choices": [  // ✅ CORRECT - preserves UUIDs
      {"value": "draft", "id": "existing-uuid-1"},
      {"value": "active", "id": "existing-uuid-2"}
    ]
  }
}
```

**Why This Matters**: Using `options` instead of `choices` **permanently destroys all data** in that field across all records. This is IRREVERSIBLE.

---

## Authentication Pattern

```json
{
  "Authorization": "Token ${SMARTSUITE_API_TOKEN}",
  "ACCOUNT-ID": "s3qnmox1",
  "Content-Type": "application/json"
}
```

**CRITICAL**: Use "Token" not "Bearer" for Authorization header

---

## Rate Limiting

- **Max**: 4-5 requests/second
- **Recommended delay**: 250ms between requests
- **429 backoff**: 30 seconds with exponential backoff
- **Retry strategy**: Max 3 retries for 5xx errors

---

## Performance Benchmarks (Production Tested)

- **Query Operations**: 400-600ms consistently
- **CRUD Operations**: 400-700ms including validation
- **Bulk Operations**: 600-850ms for multiple records
- **Schema Discovery**: 300-500ms (standard), 450-850ms (intelligent API)

---

## Core CRUD Operations

### List Records (POST, not GET)
```json
POST /api/v1/applications/{appId}/records/list/
{
  "limit": 2,  // MCP safe limit
  "offset": 0,
  "filter": {
    "operator": "and",
    "fields": [
      {"field": "status", "comparison": "is", "value": "active"}
    ]
  }
}
```

### Get Single Record
```
GET /api/v1/applications/{appId}/records/{recordId}/
```
**CRITICAL**: Trailing slash required

### Create Record
```json
POST /api/v1/applications/{appId}/records/
{
  "title": "Record Title",
  "projects_link": ["68a8ff5237fde0bf797c05b3"],  // Array for linked records
  "status": "draft"
}
```

### Update Record
```json
PATCH /api/v1/applications/{appId}/records/{recordId}/
{
  "status": "active",
  "assigned_to": ["user_id_1", "user_id_2"]  // Array for linked records
}
```

### Delete Record
```
DELETE /api/v1/applications/{appId}/records/{recordId}/
```
**CRITICAL**: Trailing slash required or silent failure

---

## Bulk Operations (Max 25 records)

### Bulk Create
```json
POST /api/v1/applications/{appId}/records/bulk/
{
  "items": [
    {"title": "Record 1", "status": "draft"},
    {"title": "Record 2", "status": "active"}
  ]
}
```
**Performance**: 600-850ms for multiple records

### Bulk Update
```json
PATCH /api/v1/applications/{appId}/records/bulk/
{
  "items": [
    {"id": "record_id_1", "status": "completed"},
    {"id": "record_id_2", "priority": "high"}
  ]
}
```

---

## Critical Field Format Rules

### 1. Linked Record Fields
- **MUST** be arrays, even for single values
- **Wrong**: `"project_id": "68a8ff5237fde0bf797c05b3"`
- **Correct**: `"project_id": ["68a8ff5237fde0bf797c05b3"]`
- **Filter operators**: Use `has_any_of`, `has_all_of`, `has_none_of` - NEVER `is` or `equals`

### 2. Rich Text Fields (SmartDoc Structure)

**Populated Rich Text Field**:
```json
{
  "projectBrief": {
    "data": {
      "type": "doc",
      "content": [
        {
          "type": "paragraph",
          "attrs": {"textAlign": "left", "size": "medium"},
          "content": [
            { "type": "text", "text": "Your content here..." }
          ]
        }
      ]
    },
    "html": "<div class=\"rendered\"><p>Your content here...</p></div>",
    "preview": "Your content here..."
  }
}
```

**Empty Rich Text Field**:
```json
{
  "description": {
    "data": {"type": "doc", "content": []},
    "html": "",
    "preview": ""
  }
}
```

### 3. Select/Status Fields
- Use option **codes** not display labels
- **Wrong**: `"status": "In Progress"`
- **Correct**: `"status": "in_progress"`

### 4. Checklist Fields
Must use full SmartDoc structure with items array:
```json
{
  "checklist99": {
    "items": [
      {
        "id": "item-id",
        "content": { /* SmartDoc structure */ },
        "completed": false,
        "assignee": null,
        "due_date": null
      }
    ]
  }
}
```

### 5. Date Range Fields
```json
{
  "date_range": {
    "from_date": {"date": "2025-01-15T00:00:00Z", "include_time": false},
    "to_date": {"date": "2025-01-20T00:00:00Z", "include_time": false}
  }
}
```

### 6. Formula/Rollup Fields
- **READ ONLY** - cannot be set via API
- Values are calculated by SmartSuite
- Attempting to set will cause validation errors

---

## Field Discovery Process

### Step 1: Use Schema Discovery
```typescript
// Always start with schema discovery
const schema = await smartsuiteSchema(tableId, 'summary');
// Returns: table info, field list with types
```

### Step 2: Get Field Details
```typescript
// For detailed field information including choices
const fieldDetail = await smartsuiteSchema(tableId, 'field_detail', fieldSlug);
// Returns: Full field configuration including UUIDs
```

### Step 3: Validate Before Write
```typescript
// ALWAYS validate field format before writing
// - Linked records: Check for arrays
// - Select fields: Check for codes not labels
// - Required fields: Ensure present
```

---

## DRY-RUN Safety Pattern

**ALWAYS** default to `dry_run: true` for mutations:

```typescript
// Field creation with dry-run
smartsuiteFieldCreate(tableId, fieldConfig, dryRun: true)

// Field update with dry-run
smartsuiteFieldUpdate(tableId, fieldId, updates, dryRun: true)

// Record mutation with dry-run
smartsuiteRecord('update', tableId, recordId, data, dryRun: true)
```

**Only set `dryRun: false` after verifying operation is correct**

---

## Common Patterns

### Pattern 1: Safe Field Update (Preserving UUIDs)
```typescript
// 1. Get existing field configuration
const fieldDetail = await smartsuiteSchema(tableId, 'field_detail', 'status');

// 2. Extract existing choices with UUIDs
const existingChoices = fieldDetail.params.choices;
// [
//   {"value": "draft", "id": "uuid-1"},
//   {"value": "active", "id": "uuid-2"}
// ]

// 3. Add new choice while preserving existing UUIDs
const updatedChoices = [
  ...existingChoices,  // Preserve existing with UUIDs
  {"value": "archived", "id": generateNewUUID()}  // Add new
];

// 4. Update field with DRY-RUN first
await smartsuiteFieldUpdate(
  tableId,
  fieldId,
  { params: { choices: updatedChoices } },  // ✅ choices, not options
  dryRun: true
);

// 5. Review output, then execute
await smartsuiteFieldUpdate(
  tableId,
  fieldId,
  { params: { choices: updatedChoices } },
  dryRun: false
);
```

### Pattern 2: Creating Linked Record
```typescript
// WRONG: String value
const wrong = {
  project_id: "68a8ff5237fde0bf797c05b3"  // ❌ Will fail
};

// CORRECT: Array of strings
const correct = {
  project_id: ["68a8ff5237fde0bf797c05b3"]  // ✅ Works
};

// Create record
await smartsuiteRecord('create', tableId, null, correct);
```

### Pattern 3: Filtering Linked Records
```typescript
// WRONG: Using 'is' operator
const wrongFilter = {
  field: "project_id",
  comparison: "is",  // ❌ Won't work for linked records
  value: "project-uuid"
};

// CORRECT: Using 'has_any_of' operator
const correctFilter = {
  field: "project_id",
  comparison: "has_any_of",  // ✅ Correct for linked records
  value: ["project-uuid"]  // Array format
};

// Query with filter
await smartsuiteQuery('search', tableId, {
  filter: {
    operator: "and",
    fields: [correctFilter]
  }
});
```

---

## Anti-Patterns to Avoid

❌ **Using `options` instead of `choices` for select field updates**
✅ Always use `choices` with preserved UUIDs

❌ **Single values for linked record fields**
✅ Always use arrays, even for single links

❌ **Display labels for select field values**
✅ Use option codes (e.g., "in_progress" not "In Progress")

❌ **Skipping dry-run for mutations**
✅ Always dry-run first, then execute

❌ **Using `is` operator for linked record filters**
✅ Use `has_any_of`, `has_all_of`, or `has_none_of`

❌ **Attempting to set formula/rollup field values**
✅ These are read-only, calculated by SmartSuite

❌ **Forgetting trailing slashes in DELETE/GET requests**
✅ Always include trailing slash or expect silent failures

---

## Key Takeaways

1. **UUID preservation**: Use `choices` not `options` - this is CRITICAL
2. **Linked records**: Always arrays, even for single values
3. **DRY-RUN first**: Default to dry_run=true for all mutations
4. **Field discovery**: Use schema tools before writing
5. **Select field codes**: Use codes not display labels
6. **Filter operators**: `has_any_of` for linked records, not `is`
7. **Trailing slashes**: Required for GET/DELETE or silent failure
8. **Formula fields**: Read-only, don't attempt to set
9. **Rate limiting**: 250ms delay between requests recommended
10. **SmartDoc structure**: Rich text requires full document structure
