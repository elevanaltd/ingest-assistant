# Phase 2: Result Type Schema Integration Guide

**Status:** Implementation Guide
**Date:** 2025-11-10
**Prerequisites:** Phase 0 complete (ADR-008, schemas, serialization layer, tests)
**Related:** Issue #20, ADR-008

---

## Overview

This guide describes how to integrate the versioned result type schema system into the Ingest Assistant codebase. Phase 0 provided the foundation (schemas, serialization layer, tests). Phase 2 is about **adoption** - actually using the validation system in production code.

---

## Phase 0 Deliverables (Complete)

✅ **ADR-008:** Architectural Decision Record documenting design
✅ **Schemas:** Zod schemas for V1 and V2 result types with discriminated union
✅ **Serialization Layer:** `resultSerializer.ts` with serialize/deserialize/migrate functions
✅ **Tests:** Comprehensive backward compatibility tests (88 test cases)
✅ **Documentation:** This implementation guide

**Location:**
- ADR: `.coord/docs/adrs/003-DOC-ADR-RESULT-TYPE-SCHEMA-VERSIONING.md`
- Schemas: `electron/schemas/aiResultSchemas.ts`
- Serialization: `electron/utils/resultSerializer.ts`
- Tests: `electron/utils/resultSerializer.test.ts`, `electron/schemas/aiResultSchemas.test.ts`

---

## Integration Points

The serialization layer needs to be integrated at 3 key points in the system:

```
┌─────────────────────────────────────────────────────────┐
│ 1. AIService.parseAIResponse()                          │
│    OUTPUT VALIDATION                                     │
│    - Validate AI responses before returning              │
│    - Add version field to results                        │
│    - Catch malformed AI responses early                  │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ 2. Main Process IPC Handlers                            │
│    TRANSMISSION VALIDATION                               │
│    - electron/main.ts: ai:analyze-file handler           │
│    - electron/main.ts: ai:batch-process handler          │
│    - Serialize before sending to renderer                │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ 3. Renderer Process (Optional)                          │
│    INPUT VALIDATION                                      │
│    - Deserialize on receipt from main process            │
│    - Graceful error handling for invalid data            │
└─────────────────────────────────────────────────────────┘
```

---

## Step-by-Step Integration

### Step 1: Update AIService Output Validation

**File:** `electron/services/aiService.ts`

**Current:** `parseAIResponse()` returns unvalidated object
**Target:** Validate and add version field

```typescript
// electron/services/aiService.ts
import { serializeResult } from '../utils/resultSerializer';
import type { AIAnalysisResultV2 } from '../schemas/aiResultSchemas';

class AIService {
  /**
   * Parse AI response into structured result
   * NOW WITH VALIDATION
   */
  parseAIResponse(response: string): AIAnalysisResultV2 {
    try {
      // ... existing parsing logic (extract JSON, handle markdown, etc.) ...

      // OLD: Return unvalidated object
      // return {
      //   mainName: parsed.mainName,
      //   metadata: parsed.metadata || [],
      //   confidence: 0.8,
      // };

      // NEW: Validate and add version field
      const rawResult = {
        mainName: parsed.mainName || '',
        metadata: Array.isArray(parsed.metadata) ? parsed.metadata : [],
        confidence: 0.8,
        // Include structured components if AI provided them
        ...(parsed.location && { location: parsed.location }),
        ...(parsed.subject && { subject: parsed.subject }),
        ...(parsed.action && { action: parsed.action }),
        ...(parsed.shotType && { shotType: parsed.shotType }),
      };

      // Validate via serialization layer
      // This will throw ZodError if AI returned invalid data
      return serializeResult(rawResult);
    } catch (error) {
      console.error('[AIService] Failed to parse AI response:', error);
      console.error('[AIService] Response was:', response);

      // Return safe fallback
      return serializeResult({
        mainName: '',
        metadata: [],
        confidence: 0,
      });
    }
  }
}
```

**Why:** This catches malformed AI responses immediately, before they propagate through the system.

**Testing:**
```bash
npm run test electron/services/aiService.test.ts
```

---

### Step 2: Update IPC Handlers (Main Process)

**File:** `electron/main.ts`

**Current:** IPC handlers return `AIAnalysisResult` directly (implicit JSON serialization)
**Target:** Explicit validation before sending to renderer

#### 2a. Update `ai:analyze-file` Handler

```typescript
// electron/main.ts
import { serializeResult } from './utils/resultSerializer';
import type { AIAnalysisResultV2 } from './schemas/aiResultSchemas';

// OLD VERSION (no validation):
ipcMain.handle('ai:analyze-file', async (_event, filePath: string) => {
  // ... security validation ...

  const lexicon = await configManager.getLexicon();
  const fileType = fileManager.getFileType(validPath);

  if (fileType === 'video') {
    return await aiService.analyzeVideo(validPath, lexicon); // Implicit JSON
  } else {
    return await aiService.analyzeImage(validPath, lexicon); // Implicit JSON
  }
});

// NEW VERSION (with validation):
ipcMain.handle('ai:analyze-file', async (_event, filePath: string): Promise<AIAnalysisResultV2> => {
  try {
    // ... existing security validation ...

    const lexicon = await configManager.getLexicon();
    const fileType = fileManager.getFileType(validPath);

    let result: AIAnalysisResultV2;
    if (fileType === 'video') {
      result = await aiService.analyzeVideo(validPath, lexicon);
    } else {
      result = await aiService.analyzeImage(validPath, lexicon);
    }

    // Result is already validated by AIService.parseAIResponse()
    // But we ensure version field is present before IPC transmission
    // (serializeResult is idempotent - safe to call twice)
    return serializeResult(result);
  } catch (error) {
    console.error('[IPC] Failed to analyze file:', error);
    throw sanitizeError(error);
  }
});
```

#### 2b. Update `ai:batch-process` Handler

```typescript
// electron/main.ts

// OLD VERSION:
ipcMain.handle('ai:batch-process', async (_event, fileIds: string[]) => {
  // ... validation ...

  const results = new Map();
  for (const fileId of validated.fileIds) {
    // ... process file ...
    const result = await aiService.analyzeImage(validatedPath, lexicon);
    results.set(fileId, result); // Unvalidated
  }

  return Object.fromEntries(results);
});

// NEW VERSION:
ipcMain.handle('ai:batch-process', async (_event, fileIds: string[]): Promise<Record<string, AIAnalysisResultV2>> => {
  try {
    // ... existing validation ...

    const results = new Map<string, AIAnalysisResultV2>();
    for (const fileId of validated.fileIds) {
      // ... existing file processing ...

      let result: AIAnalysisResultV2;
      if (fileType === 'video') {
        result = await aiService.analyzeVideo(validatedPath, lexicon);
      } else {
        result = await aiService.analyzeImage(validatedPath, lexicon);
      }

      // Ensure validation (already done by AIService, but defensive)
      const validated = serializeResult(result);
      results.set(fileId, validated);

      // ... existing auto-update logic ...
    }

    return Object.fromEntries(results);
  } catch (error) {
    console.error('[IPC] Failed to batch process:', error);
    throw sanitizeError(error);
  }
});
```

**Why:** Explicit validation at IPC boundary prevents invalid data from reaching renderer, even if AIService validation was bypassed.

**Testing:**
```bash
npm run test electron/main.test.ts
```

---

### Step 3: Update Preload Type Definitions

**File:** `electron/preload.ts`

**Current:** Type definitions use generic `AIAnalysisResult`
**Target:** Use specific `AIAnalysisResultV2` type

```typescript
// electron/preload.ts
import type { AIAnalysisResultV2 } from './schemas/aiResultSchemas';

// Update type definitions
const electronAPI = {
  analyzeFile: (filePath: string): Promise<AIAnalysisResultV2> =>
    ipcRenderer.invoke('ai:analyze-file', filePath),

  batchProcess: (fileIds: string[]): Promise<Record<string, AIAnalysisResultV2>> =>
    ipcRenderer.invoke('ai:batch-process', fileIds),
};
```

**Why:** Type safety - renderer code now knows it will receive V2 results with version field.

---

### Step 4: (Optional) Add Renderer-Side Validation

**File:** Renderer code (likely `src/` directory)

**When:** If renderer needs to validate data from IPC (defense-in-depth)
**How:** Deserialize on receipt

```typescript
// Example: src/services/aiClient.ts
import { deserializeResult } from '../electron/utils/resultSerializer';

async function analyzeFile(filePath: string) {
  try {
    // IPC call (already validated by main process)
    const result = await window.electronAPI.analyzeFile(filePath);

    // Optional: Deserialize for additional validation
    // This catches cases where main process validation was bypassed
    const validated = deserializeResult(result);

    return validated;
  } catch (error) {
    console.error('[Renderer] Failed to analyze file:', error);
    throw error;
  }
}
```

**Note:** This is optional defense-in-depth. Main process validation is sufficient for most cases.

---

## Migration Strategy

### Handling Existing Data

**Problem:** MetadataStore contains persisted results without version field (V1 format)

**Solution:** Automatic migration on read via `deserializeResult()`

```typescript
// When reading from MetadataStore
const storedMetadata = await metadataStore.getFileMetadata(fileId);

if (storedMetadata.aiAnalysisResult) {
  // Migrate legacy data automatically
  const migrated = deserializeResult(storedMetadata.aiAnalysisResult);

  // migrated is now AIAnalysisResultV2 with version='2'
  // If original was V1, structured components parsed from mainName
}
```

**When to migrate:**
- On app startup (batch migration of all metadata)
- Lazy migration (migrate on read, write back on next update)
- Background migration (scheduled job)

**Recommended:** Lazy migration (lowest risk, no downtime)

---

## Error Handling

### Validation Errors

```typescript
import { getValidationErrors } from './utils/resultSerializer';

try {
  const result = serializeResult(data);
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error('[Validation] Invalid AI result:', error.issues);

    // Log detailed errors for debugging
    const errors = getValidationErrors(data);
    if (errors) {
      errors.issues.forEach(issue => {
        console.error(`- Field "${issue.path.join('.')}": ${issue.message}`);
      });
    }

    // Return safe fallback
    return {
      version: '2',
      mainName: '',
      metadata: [],
      confidence: 0,
    };
  }
  throw error;
}
```

### Graceful Degradation

```typescript
import { isValidResult } from './utils/resultSerializer';

// Pre-flight check before processing
if (isValidResult(data)) {
  const result = deserializeResult(data);
  processResult(result);
} else {
  console.warn('[Warning] Invalid result data, skipping:', data);
  // Continue processing other files
}
```

---

## Testing Strategy

### Unit Tests (Already Complete)

- ✅ Schema validation: `electron/schemas/aiResultSchemas.test.ts`
- ✅ Serialization: `electron/utils/resultSerializer.test.ts`
- ✅ Migration: Covered in serialization tests

### Integration Tests (Phase 2)

```typescript
// Test IPC handler with validation
describe('IPC handlers with result validation', () => {
  it('ai:analyze-file returns validated V2 result', async () => {
    const result = await ipcRenderer.invoke('ai:analyze-file', testImagePath);

    expect(result.version).toBe('2');
    expect(result.mainName).toBeDefined();
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
  });

  it('ai:batch-process returns all results with version field', async () => {
    const results = await ipcRenderer.invoke('ai:batch-process', [fileId1, fileId2]);

    for (const [id, result] of Object.entries(results)) {
      expect(result.version).toBe('2');
    }
  });
});
```

### End-to-End Tests (Phase 2)

```typescript
// Test full flow: AI → IPC → Renderer
describe('AI analysis end-to-end', () => {
  it('analyzes image and returns validated structured result', async () => {
    const result = await analyzeFile(testImagePath);

    // Validate structure
    expect(result.version).toBe('2');
    expect(result.location).toBeDefined();
    expect(result.subject).toBeDefined();
    expect(result.shotType).toBeDefined();

    // Validate pattern
    const pattern = new RegExp(`${result.location}-${result.subject}-${result.shotType}`);
    expect(result.mainName).toMatch(pattern);
  });
});
```

---

## Rollback Plan

If issues arise during Phase 2 integration:

### Immediate Rollback

1. **Revert IPC handler changes:**
   ```bash
   git revert <commit-hash>
   ```

2. **Keep foundation code:**
   - Schemas remain in codebase (unused, no harm)
   - Tests remain (documentation value)
   - ADR remains (historical record)

### Gradual Rollback

1. **Remove validation from specific handlers:**
   ```typescript
   // Temporarily disable validation for ai:batch-process
   return result; // Instead of: return serializeResult(result);
   ```

2. **Add feature flag:**
   ```typescript
   const ENABLE_RESULT_VALIDATION = process.env.ENABLE_RESULT_VALIDATION === 'true';

   if (ENABLE_RESULT_VALIDATION) {
     return serializeResult(result);
   } else {
     return result; // Legacy behavior
   }
   ```

---

## Performance Considerations

### Validation Overhead

**Measured:** ~1-5ms per result (negligible for user-facing operations)

**Batch Processing:** Validate array of results together:

```typescript
// Instead of validating each result individually:
for (const result of results) {
  serializeResult(result); // 5ms × 100 = 500ms
}

// Validate array at once (future optimization):
const schema = z.array(AIAnalysisResultV2Schema);
schema.parse(results); // ~50ms for 100 results
```

### Caching

```typescript
// Cache validated results to avoid re-validation
const validationCache = new Map<string, AIAnalysisResultV2>();

function getCachedResult(fileId: string) {
  if (validationCache.has(fileId)) {
    return validationCache.get(fileId);
  }

  const result = deserializeResult(rawData);
  validationCache.set(fileId, result);
  return result;
}
```

---

## Monitoring & Observability

### Logging Validation Failures

```typescript
// Log all validation failures for monitoring
import { getValidationErrors } from './utils/resultSerializer';

function logValidationFailure(data: unknown, context: string) {
  const errors = getValidationErrors(data);
  if (errors) {
    console.error(`[Validation] Failed in ${context}:`, {
      errors: errors.issues,
      data: JSON.stringify(data),
      timestamp: new Date().toISOString(),
    });

    // Optional: Send to error tracking service (Sentry, etc.)
    // Sentry.captureException(errors);
  }
}
```

### Metrics

Track validation success/failure rates:

```typescript
let validationAttempts = 0;
let validationFailures = 0;

function trackValidation(success: boolean) {
  validationAttempts++;
  if (!success) validationFailures++;

  if (validationAttempts % 100 === 0) {
    const successRate = ((validationAttempts - validationFailures) / validationAttempts) * 100;
    console.log(`[Metrics] Validation success rate: ${successRate.toFixed(2)}%`);
  }
}
```

---

## Phase 3: Future Extensions

### V3 Schema

When adding new fields (e.g., confidence breakdown, AI provider metadata):

1. **Create V3 schema:**
   ```typescript
   export const AIAnalysisResultV3Schema = z.object({
     version: z.literal('3'),
     // ... all V2 fields ...
     confidenceBreakdown: z.object({
       location: z.number(),
       subject: z.number(),
       shotType: z.number(),
     }).optional(),
     aiProvider: z.enum(['openai', 'anthropic', 'openrouter']).optional(),
   });
   ```

2. **Add to discriminated union:**
   ```typescript
   export const AIAnalysisResultSchema = z.discriminatedUnion('version', [
     AIAnalysisResultV1Schema,
     AIAnalysisResultV2Schema,
     AIAnalysisResultV3Schema, // NEW
   ]);
   ```

3. **Implement V2→V3 migration:**
   ```typescript
   function migrateV2ToV3(v2: AIAnalysisResultV2): AIAnalysisResultV3 {
     return {
       ...v2,
       version: '3',
       // V2 → V3 has no breaking changes, just add new optional fields
     };
   }
   ```

4. **Update serialization layer:**
   ```typescript
   export function deserializeResult(data: unknown): AIAnalysisResultV3 {
     const validated = AIAnalysisResultSchema.parse(data);

     // Chain migrations
     if (validated.version === '1') {
       const v2 = migrateV1ToV2(validated);
       return migrateV2ToV3(v2);
     } else if (validated.version === '2') {
       return migrateV2ToV3(validated);
     }

     return validated;
   }
   ```

---

## Checklist for Phase 2 Integration

### Preparation
- [ ] Review ADR-008
- [ ] Run existing tests: `npm test electron/utils/resultSerializer.test.ts`
- [ ] Create feature branch: `git checkout -b feat/integrate-result-validation`

### Integration
- [ ] Update `AIService.parseAIResponse()` to use `serializeResult()`
- [ ] Update `ai:analyze-file` IPC handler
- [ ] Update `ai:batch-process` IPC handler
- [ ] Update preload type definitions
- [ ] (Optional) Add renderer-side validation

### Testing
- [ ] Write integration tests for IPC handlers
- [ ] Test V1 → V2 migration with real metadata
- [ ] Test error handling (invalid AI responses)
- [ ] Manual testing with app

### Deployment
- [ ] Run full test suite: `npm test`
- [ ] Run linter: `npm run lint`
- [ ] Run type checker: `npm run typecheck`
- [ ] Create PR with integration changes
- [ ] Code review (require review from code-review-specialist)
- [ ] Merge to main

### Monitoring
- [ ] Deploy to staging
- [ ] Monitor validation failure rates
- [ ] Check performance impact
- [ ] Deploy to production
- [ ] Monitor for 1 week

---

## Questions & Support

**Issues:** File GitHub issue with `result-validation` label
**Questions:** Tag @technical-architect or @implementation-lead
**ADR:** `.coord/docs/adrs/003-DOC-ADR-RESULT-TYPE-SCHEMA-VERSIONING.md`

---

**Phase 0 Status:** ✅ Complete
**Phase 2 Status:** 📋 Ready for Implementation
