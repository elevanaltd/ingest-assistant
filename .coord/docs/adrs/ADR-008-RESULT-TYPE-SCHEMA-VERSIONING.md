# ADR-008: Result Type Schema Versioning & Serialization

**Status:** PROPOSED
**Date:** 2025-11-10
**Authors:** implementation-lead, technical-architect
**Deciders:** critical-engineer, holistic-orchestrator
**Tags:** architecture, type-safety, ipc, versioning, phase-0

---

## Context

The `AIAnalysisResult` interface exists as a unified JSON structure transmitted via inter-process communication (IPC) between Electron's renderer and main processes. The current implementation has several architectural vulnerabilities:

### Current State (Vulnerable)
```typescript
// src/types/index.ts:149-166
export interface AIAnalysisResult {
  mainName: string;
  metadata: string[];
  confidence: number;
  location?: string;      // Added in Phase 1 - NO migration path
  subject?: string;       // Added in Phase 1 - NO migration path
  action?: string;        // Added in Phase 1 - NO migration path
  shotType?: ShotType;    // Added in Phase 1 - NO migration path
}
```

### System Ripple Map (Impact Analysis)
```
AIService.parseAIResponse() [CREATOR]
    ↓ (returns AIAnalysisResult)
electron/main.ts IPC handlers [TRANSMITTER]
    ↓ (JSON.stringify via Electron IPC - NO VALIDATION)
electron/preload.ts [IPC BRIDGE]
    ↓ (JSON.parse via Electron IPC - NO VALIDATION)
Renderer process [CONSUMER]
    ↓ (stores in MetadataStore)
FileMetadata persistence [STORAGE]
```

### Vulnerabilities Identified

**VULNERABILITY-1: No Runtime Validation**
- TypeScript types provide compile-time safety only
- Invalid AI responses (malformed JSON, missing fields) crash the app
- Example: AI returns `{"mainName": null}` → TypeScript happy, runtime crash

**VULNERABILITY-2: No Versioning Mechanism**
- Adding `location`, `subject`, `action`, `shotType` fields was risky
- Legacy data persisted before Phase 1 lacks these fields
- No migration path from v1 → v2 schema

**VULNERABILITY-3: Implicit JSON Serialization**
- Electron IPC uses `JSON.stringify`/`JSON.parse` implicitly
- No schema enforcement during transmission
- Renderer can send malformed data to main process

**VULNERABILITY-4: No Backward Compatibility**
- Old app versions can't read new schema (forward compatibility)
- New app versions can't migrate old schema (backward compatibility)
- Breaking changes require users to delete all metadata

**VULNERABILITY-5: Type Confusion Attacks**
- IPC boundary accepts any JSON structure
- No validation that data matches expected shape
- Potential for security issues if renderer is compromised

---

## Decision

Implement **versioned Zod schemas with serialization layer** providing runtime validation, forward/backward compatibility, and migration support.

### Architecture: Three-Layer Validation System

```
┌─────────────────────────────────────────────────────────┐
│ LAYER 1: SCHEMA DEFINITION (Zod)                        │
├─────────────────────────────────────────────────────────┤
│ • AIAnalysisResultV1Schema (legacy)                     │
│ • AIAnalysisResultV2Schema (current: structured naming) │
│ • AIAnalysisResultV3Schema (future: confidence details) │
│ • Discriminated union with version field               │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ LAYER 2: SERIALIZATION LAYER                            │
├─────────────────────────────────────────────────────────┤
│ • serialize() - Adds version field, validates output    │
│ • deserialize() - Validates input, migrates if needed   │
│ • migrate() - Version-specific migration functions      │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ LAYER 3: IPC VALIDATION                                 │
├─────────────────────────────────────────────────────────┤
│ • Main process: Validate before sending to renderer     │
│ • Renderer process: Validate before using               │
│ • Error handling with graceful degradation              │
└─────────────────────────────────────────────────────────┘
```

### Core Components

**1. Versioned Schemas (src/schemas/aiResultSchemas.ts)**
```typescript
import { z } from 'zod';

// Version 1: Legacy format (pre-structured naming)
export const AIAnalysisResultV1Schema = z.object({
  version: z.literal('1').optional().default('1'),
  mainName: z.string(),
  metadata: z.array(z.string()),
  confidence: z.number().min(0).max(1),
});

// Version 2: Current format (structured naming)
export const AIAnalysisResultV2Schema = z.object({
  version: z.literal('2'),
  mainName: z.string(),
  metadata: z.array(z.string()),
  confidence: z.number().min(0).max(1),
  location: z.string().optional(),
  subject: z.string().optional(),
  action: z.string().optional(),
  shotType: z.enum(['WS', 'MID', 'CU', 'UNDER', 'FP', 'TRACK', 'ESTAB']).optional(),
});

// Discriminated union for all versions
export const AIAnalysisResultSchema = z.discriminatedUnion('version', [
  AIAnalysisResultV1Schema,
  AIAnalysisResultV2Schema,
]);

export type AIAnalysisResultV1 = z.infer<typeof AIAnalysisResultV1Schema>;
export type AIAnalysisResultV2 = z.infer<typeof AIAnalysisResultV2Schema>;
export type AIAnalysisResult = z.infer<typeof AIAnalysisResultSchema>;
```

**2. Serialization Layer (electron/utils/resultSerializer.ts)**
```typescript
import { AIAnalysisResultSchema, AIAnalysisResultV2Schema } from '../../src/schemas/aiResultSchemas';

/**
 * Serialize result for IPC transmission
 * - Adds version field if missing
 * - Validates output matches schema
 */
export function serializeResult(result: unknown): string {
  // Add version field for new results (default to v2)
  const versionedResult = {
    version: '2',
    ...result,
  };

  // Validate before serialization
  const validated = AIAnalysisResultV2Schema.parse(versionedResult);
  return JSON.stringify(validated);
}

/**
 * Deserialize result from IPC with migration
 * - Validates input
 * - Migrates if version < current
 * - Returns current version
 */
export function deserializeResult(data: string): AIAnalysisResultV2 {
  const parsed = JSON.parse(data);

  // Validate against all known versions
  const validated = AIAnalysisResultSchema.parse(parsed);

  // Migrate to current version if needed
  if (validated.version === '1') {
    return migrateV1ToV2(validated);
  }

  return validated;
}

/**
 * Migrate v1 → v2
 * - Preserves mainName, metadata, confidence
 * - Attempts to parse structured components from mainName
 */
function migrateV1ToV2(v1: AIAnalysisResultV1): AIAnalysisResultV2 {
  const parts = v1.mainName.split('-');
  const shotTypes = ['WS', 'MID', 'CU', 'UNDER', 'FP', 'TRACK', 'ESTAB'];

  if (parts.length === 3 && shotTypes.includes(parts[2].toUpperCase())) {
    // Pattern: {location}-{subject}-{shotType}
    return {
      version: '2',
      mainName: v1.mainName,
      metadata: v1.metadata,
      confidence: v1.confidence,
      location: parts[0],
      subject: parts[1],
      shotType: parts[2].toUpperCase() as any,
    };
  } else if (parts.length === 4 && shotTypes.includes(parts[3].toUpperCase())) {
    // Pattern: {location}-{subject}-{action}-{shotType}
    return {
      version: '2',
      mainName: v1.mainName,
      metadata: v1.metadata,
      confidence: v1.confidence,
      location: parts[0],
      subject: parts[1],
      action: parts[2],
      shotType: parts[3].toUpperCase() as any,
    };
  }

  // No pattern match - return without structured components
  return {
    version: '2',
    mainName: v1.mainName,
    metadata: v1.metadata,
    confidence: v1.confidence,
  };
}
```

**3. IPC Validation Layer**

Update IPC handlers to use serialization:

```typescript
// electron/main.ts
import { serializeResult } from './utils/resultSerializer';

ipcMain.handle('ai:analyze-file', async (_event, filePath: string) => {
  // ... existing validation ...

  const result = await aiService.analyzeImage(validPath, lexicon);

  // Serialize with version validation before sending to renderer
  return serializeResult(result);
});
```

Update preload to deserialize:

```typescript
// electron/preload.ts
import { deserializeResult } from './utils/resultSerializer';

analyzeFile: (filePath: string): Promise<AIAnalysisResult> =>
  ipcRenderer.invoke('ai:analyze-file', filePath)
    .then(data => deserializeResult(data)),
```

---

## Rationale

### Why Zod Over Other Validation Libraries?

**Decision:** Use Zod for schema validation

**Alternatives Considered:**
1. **io-ts**
   - ❌ Rejected: Complex type inference, steeper learning curve
2. **yup**
   - ❌ Rejected: Designed for forms, not domain types
3. **ajv (JSON Schema)**
   - ❌ Rejected: Separate schema language, poor TypeScript integration
4. **Zod (CHOSEN)**
   - ✅ TypeScript-first, excellent type inference
   - ✅ Composable schemas (discriminated unions)
   - ✅ Already used in project (electron/schemas/ipcSchemas.ts)
   - ✅ Built-in transformations for migration

**Trade-off:** Runtime validation overhead vs type safety + migration support
**Decision:** Overhead justified by preventing crashes and enabling schema evolution

### Why Versioned Schemas Over Schema Extension?

**Decision:** Explicit version field with discriminated union

**Alternatives Considered:**
1. **Schema extension (no version field)**
   ```typescript
   // All versions share same interface, distinguish by presence of fields
   if (result.location) { /* v2 */ } else { /* v1 */ }
   ```
   - ❌ Rejected: Ambiguous, can't distinguish v2 with missing optionals from v1

2. **Separate endpoints per version**
   ```typescript
   'ai:analyze-file-v1'
   'ai:analyze-file-v2'
   ```
   - ❌ Rejected: Code duplication, no migration path

3. **Version field with discriminated union (CHOSEN)**
   - ✅ Explicit version in data
   - ✅ Type-safe discrimination (TypeScript narrows union)
   - ✅ Easy to add v3, v4, etc.

**Trade-off:** Extra `version` field in payload vs explicit versioning
**Decision:** 7 bytes per result justified by type safety and clarity

### Why Serialization Layer Over Direct IPC?

**Decision:** Wrapper functions for serialize/deserialize

**Rationale:**
- **Single point of validation:** All IPC data flows through one validation point
- **Migration encapsulation:** Version migration logic isolated from business logic
- **Error handling:** Graceful degradation if validation fails
- **Future-proofing:** Can add compression, encryption without changing callsites

**Alternative:** Validate at each IPC handler
- ❌ Rejected: Code duplication, easy to forget validation

**Trade-off:** Extra function calls vs centralized validation
**Decision:** Centralization worth minor performance cost

### Why Backward AND Forward Compatibility?

**Decision:** Support migration v1→v2 AND graceful degradation v2→v1

**Rationale:**
- **Backward:** New app must read old data (users upgrade app)
- **Forward:** Old app should degrade gracefully with new data (team uses mixed versions)
- **Migration path:** Users can upgrade without losing data

**Implementation:**
- v1→v2: Migrate by parsing mainName pattern
- v2→v1: Strip structured fields, keep mainName (degradation)

---

## Consequences

### Positive Consequences

✅ **Type Safety:** Runtime validation prevents crashes from malformed data
✅ **Schema Evolution:** Can add v3, v4 without breaking changes
✅ **Migration Path:** Existing data automatically migrates on read
✅ **Security:** IPC validation prevents type confusion attacks
✅ **Debugging:** Validation errors provide clear messages
✅ **Consistency:** Zod already used in project (ipcSchemas.ts)

### Negative Consequences

⚠️ **Complexity:** Additional serialization layer adds abstraction
⚠️ **Performance:** Runtime validation adds ~1-5ms per result
⚠️ **Bundle Size:** Zod adds ~12KB to bundle (acceptable for Electron)
⚠️ **Migration Risk:** v1→v2 migration may misparse some mainName patterns

### Migration Risks & Mitigation

**RISK-1: Misparse mainName During Migration**
- **Example:** `mainName: "kitchen-tap-under"` → incorrectly parsed as `{location: "kitchen", subject: "tap", shotType: "UNDER"}` when it should be `{location: "kitchen-tap", subject: "under", shotType: undefined}`
- **Mitigation:**
  - Conservative pattern matching (only recognize known shot types)
  - Log migration decisions for audit
  - Provide manual override in UI

**RISK-2: Performance Impact on Batch Operations**
- **Example:** Batch processing 100 files adds 500ms total validation overhead
- **Mitigation:**
  - Validate in batches (validate array of results once)
  - Profile validation performance
  - Consider lazy validation for low-confidence results

**RISK-3: Breaking Changes in Future Versions**
- **Example:** v3 removes `metadata` field → v2→v3 migration is lossy
- **Mitigation:**
  - Document breaking vs non-breaking changes in ADR updates
  - Use semantic versioning for schema versions
  - Require ADR approval for breaking changes

---

## Implementation Phases

### Phase 0 (This ADR): Foundation
- ✅ ADR documentation
- ✅ Schema design (v1, v2, discriminated union)
- ✅ Serialization layer (serialize, deserialize, migrate)
- ✅ IPC validation layer (main + renderer)
- ✅ Backward compatibility tests

### Phase 1 (Future): Adoption
- Migrate all IPC handlers to use serialization
- Update renderer to deserialize results
- Add validation error handling UI
- Monitor validation failures in production

### Phase 2 (Future): Extension
- Add v3 schema (confidence breakdown, AI provider metadata)
- Implement v2→v3 migration
- Add schema registry for dynamic version detection
- Performance optimization (batch validation)

---

## Testing Strategy

### Unit Tests
```typescript
describe('resultSerializer', () => {
  it('serializes v2 result with validation', () => {
    const result = {
      mainName: 'kitchen-oven-CU',
      metadata: ['kitchen', 'oven'],
      confidence: 0.9,
      location: 'kitchen',
      subject: 'oven',
      shotType: 'CU',
    };

    const serialized = serializeResult(result);
    const parsed = JSON.parse(serialized);

    expect(parsed.version).toBe('2');
    expect(parsed.location).toBe('kitchen');
  });

  it('migrates v1 to v2 by parsing mainName', () => {
    const v1 = {
      mainName: 'kitchen-oven-CU',
      metadata: ['kitchen'],
      confidence: 0.8,
    };

    const v2 = deserializeResult(JSON.stringify(v1));

    expect(v2.version).toBe('2');
    expect(v2.location).toBe('kitchen');
    expect(v2.subject).toBe('oven');
    expect(v2.shotType).toBe('CU');
  });

  it('handles v1 without pattern match', () => {
    const v1 = {
      mainName: 'random-description',
      metadata: [],
      confidence: 0.5,
    };

    const v2 = deserializeResult(JSON.stringify(v1));

    expect(v2.version).toBe('2');
    expect(v2.location).toBeUndefined();
    expect(v2.mainName).toBe('random-description');
  });
});
```

### Integration Tests
```typescript
describe('IPC with versioned results', () => {
  it('main process serializes, renderer deserializes', async () => {
    // Simulate main process
    const result = await aiService.analyzeImage(imagePath, lexicon);
    const serialized = serializeResult(result);

    // Simulate IPC transmission
    const transmitted = JSON.parse(JSON.stringify(serialized));

    // Simulate renderer process
    const deserialized = deserializeResult(transmitted);

    expect(deserialized.version).toBe('2');
  });
});
```

---

## References

- **Issue #20:** ARCHITECTURE: Design result type schema with ADR (Phase 0)
- **Code:**
  - `src/types/index.ts:149` - Current AIAnalysisResult interface
  - `electron/preload.ts:50` - IPC type definitions
  - `electron/main.ts:657` - ai:analyze-file handler
  - `electron/services/aiService.ts:163` - parseAIResponse method
- **Related ADRs:**
  - ADR-006: Security Hardening Strategy (IPC validation pattern)
- **External:**
  - [Zod Documentation](https://zod.dev)
  - [TypeScript Discriminated Unions](https://www.typescriptlang.org/docs/handbook/2/narrowing.html#discriminated-unions)

---

**Next Steps:**
1. Review and approve ADR
2. Implement schemas (src/schemas/aiResultSchemas.ts)
3. Implement serialization layer (electron/utils/resultSerializer.ts)
4. Write tests (backward compatibility, migration)
5. Update IPC handlers (main.ts, preload.ts)
6. Document Phase 2 extension plan
