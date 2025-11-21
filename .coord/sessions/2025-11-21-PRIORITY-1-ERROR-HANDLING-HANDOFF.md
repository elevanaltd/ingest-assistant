# Priority 1: Error Handling Implementation - Session Handoff

**Session Type:** Claude Code Web (implementation-lead role)
**Created:** 2025-11-21
**Phase:** B2 Implementation - Week 2-3 (CFEx Phase 1a-CORE)
**Timeline:** 4 days (Week 2 Days 1-4)
**Agent:** implementation-lead (TDD discipline enforced)

---

## Mission

Implement comprehensive error handling for CFEx file transfer with:
- Smart retry logic (exponential backoff)
- Error classification (TRANSIENT, FATAL, NETWORK, USER)
- Recovery strategies (cleanup, resume, atomic operations)
- User-facing error messages (actionable guidance)

**Success Criteria:**
- ~30-40 unit tests (all passing)
- Quality gates GREEN (lint ✅ typecheck ✅ test ✅)
- Code review approved (code-review-specialist)
- TDD discipline validated (RED→GREEN→REFACTOR commits)

---

## Context Documents

### Primary Specifications
1. **D3 Blueprint (OCTAVE):** `.coord/workflow-docs/003-CFEX-D3-BLUEPRINT.oct.md`
   - Error handling specifications (compressed, 100% decision logic preserved)
   - Component contracts (TypeScript interfaces verbatim)
   - Test specifications (~30-40 tests per component)

2. **Shared Checklist:** `.coord/SHARED-CHECKLIST.md`
   - Priority 1 detailed requirements (Lines 87-95)
   - 5-priority breakdown with dependencies

3. **Project Context:** `.coord/PROJECT-CONTEXT.md`
   - Current state (Week 1 complete, Week 2-3 active)
   - Microphase structure (Phase 1a-CORE → Phase 1b → Phase 1c)

### Existing Implementation
1. **electron/services/cfexTransfer.ts** - Transfer orchestration (needs error handling integration)
2. **electron/services/integrityValidator.ts** - EXIF validation (error reporting)
3. **electron/ipc/cfexTransferHandlers.ts** - IPC bridge (error event emission)

---

## Implementation Requirements

### Component 1: Error Classification (electron/services/errorClassifier.ts)

**Specification (from D3 Blueprint):**

```typescript
export enum TransferErrorCode {
  // TRANSIENT (retry-eligible)
  ETIMEDOUT = 'ETIMEDOUT',
  ECONNRESET = 'ECONNRESET',
  NETWORK_ERROR = 'NETWORK_ERROR',

  // FATAL (no retry)
  ENOSPC = 'ENOSPC',
  EPERM = 'EPERM',
  ENOENT = 'ENOENT',

  // USER ACTION REQUIRED
  INVALID_PATH = 'INVALID_PATH',
  MOUNT_NOT_FOUND = 'MOUNT_NOT_FOUND'
}

export interface TransferError {
  code: TransferErrorCode
  message: string
  recoverable: boolean
  userAction?: string // Actionable guidance
  bytesNeeded?: number // For ENOSPC
}

export function classifyError(error: Error, context: TransferContext): TransferError
```

**Tests Required:**
- Test error code detection (ENOSPC, EPERM, ENOENT from Node.js errors)
- Test recoverable flag (TRANSIENT → true, FATAL → false)
- Test user action messages (ENOSPC → "Free X MB disk space")
- Test bytes needed calculation (ENOSPC error parsing)

---

### Component 2: Retry Strategy (electron/services/retryStrategy.ts)

**Specification (from D3 Blueprint):**

```typescript
export interface RetryConfig {
  maxAttempts: number      // 3 for local FS, 5 for network
  baseDelay: number        // 1000ms initial
  maxDelay: number         // 8000ms cap
  backoffMultiplier: number // 2.0 (exponential)
}

export class RetryStrategy {
  constructor(config: RetryConfig)

  async execute<T>(
    operation: () => Promise<T>,
    errorClassifier: (error: Error) => TransferError
  ): Promise<T>
}
```

**Retry Logic:**
- Attempt 1: Immediate
- Attempt 2: 1s delay (baseDelay)
- Attempt 3: 2s delay (baseDelay * 2)
- Attempt 4: 4s delay (baseDelay * 4)
- Attempt 5: 8s delay (capped at maxDelay)

**Tests Required:**
- Test exponential backoff timing (1s, 2s, 4s, 8s delays)
- Test max attempts enforcement (3 for local, 5 for network)
- Test early exit on FATAL errors (no retry)
- Test success on retry attempt N (verify delay occurred)

---

### Component 3: Error Handler (electron/services/errorHandler.ts)

**Specification (from D3 Blueprint):**

```typescript
export class ErrorHandler {
  constructor(
    private classifier: ErrorClassifier,
    private retryStrategy: RetryStrategy
  )

  async handleTransferError(
    error: Error,
    context: TransferContext,
    operation: () => Promise<void>
  ): Promise<ErrorHandlingResult>

  async cleanup(partialFiles: string[]): Promise<void>
  async resume(checkpoint: TransferCheckpoint): Promise<void>
}

export interface ErrorHandlingResult {
  success: boolean
  attempts: number
  finalError?: TransferError
  recovered: boolean
}
```

**Recovery Strategies:**
- **Cleanup:** Delete partial files on FATAL error (atomic operation)
- **Resume:** Continue from last successful file (checkpoint-based)
- **Abort:** Clean exit with user-facing error message

**Tests Required:**
- Test cleanup on FATAL error (verify partial files deleted)
- Test resume from checkpoint (verify starts at correct file)
- Test retry with recovery (success on attempt 2/3)
- Test error message formatting (actionable guidance)

---

### Component 4: Integration with cfexTransfer.ts

**Modification Required:**

```typescript
// electron/services/cfexTransfer.ts
import { ErrorHandler } from './errorHandler'
import { RetryStrategy } from './retryStrategy'
import { ErrorClassifier } from './errorClassifier'

export async function transferFile(
  source: string,
  destination: string,
  onProgress: ProgressCallback
): Promise<TransferResult> {
  const errorHandler = new ErrorHandler(
    new ErrorClassifier(),
    new RetryStrategy({ maxAttempts: 3, baseDelay: 1000 })
  )

  return errorHandler.handleTransferError(
    new Error('simulated'),
    { source, destination },
    async () => {
      // Existing transfer logic here
      await fs.copyFile(source, destination)
    }
  )
}
```

**Tests Required:**
- Integration test: Transfer with retry success
- Integration test: Transfer with FATAL error + cleanup
- Integration test: Transfer with network timeout + retry

---

## TDD Workflow (MANDATORY)

### Protocol Enforcement

**BEFORE ANY CODE:**
1. Load build-execution skill: `Skill(command:"build-execution")`
2. Create TodoWrite with RED→GREEN→REFACTOR phases
3. Verify protocol loaded in TodoWrite

**DURING IMPLEMENTATION:**
1. **RED:** Write failing test (verify fails for correct reason)
2. **GREEN:** Minimal implementation (make test pass)
3. **REFACTOR:** Improve while green (optional)
4. **COMMIT:** Evidence-based pattern:
   - `test: add failing test for error classification (RED)`
   - `feat: implement error classification (GREEN)`

**Quality Gates (BEFORE COMMIT):**
```bash
npm run lint && npm run typecheck && npm test
```

All three MUST pass before any commit.

---

## File Structure

**New Files to Create:**
```
electron/services/
├─ errorClassifier.ts         # Error classification logic
├─ errorClassifier.test.ts    # ~10 tests
├─ retryStrategy.ts            # Retry with exponential backoff
├─ retryStrategy.test.ts       # ~12 tests
├─ errorHandler.ts             # Recovery strategies
└─ errorHandler.test.ts        # ~15 tests
```

**Modified Files:**
```
electron/services/
└─ cfexTransfer.ts             # Integrate error handling

electron/services/__tests__/
└─ cfexTransfer.integration.test.ts  # ~5 integration tests
```

**Total Test Target:** ~30-40 tests

---

## Validation Checklist

**Before declaring complete:**
- [ ] All tests passing (640+ existing + ~35 new = 675+ total)
- [ ] Lint: 0 errors (warnings <110 acceptable)
- [ ] Typecheck: 0 errors
- [ ] Code review: code-review-specialist approval
- [ ] TDD evidence: RED→GREEN commit pattern visible in git log
- [ ] Integration: cfexTransfer.ts uses new error handling
- [ ] Documentation: JSDoc comments on all public APIs

---

## Consultation Protocol

**DURING IMPLEMENTATION:**
- **code-review-specialist** (MANDATORY after completion)
  - Invoke: `Task(subagent_type="code-review-specialist")`
  - Purpose: Quality validation, security check, reliability score

**IF NEEDED:**
- **test-methodology-guardian** (TDD compliance questions)
- **technical-architect** (architecture ambiguity in D3 Blueprint)

---

## Convergence Point

**Week 2 Day 4:** Priority 1 complete → Priority 3 Integration Testing unblocked

**Handoff to Main Session:**
- Error handling implementation complete
- All tests passing
- Code review approved
- Ready for Priority 3 empirical testing (LucidLink + NFS validation)

---

## Success Metrics

✅ **~35 new tests added** (errorClassifier: 10, retryStrategy: 12, errorHandler: 15, integration: 5)
✅ **Quality gates GREEN** (lint ✅ typecheck ✅ test ✅)
✅ **Code review score 9/10+** (code-review-specialist approval)
✅ **TDD discipline validated** (RED→GREEN commits visible in git log)
✅ **Integration complete** (cfexTransfer.ts uses error handling)

---

**Start implementation with TDD discipline. Good luck!**

---

## Appendix: Recent Critical Fixes (2025-11-21)

### Cache Directory Registration Race Condition

**Problem:** Unawaited IIFE at main.ts:172-176 created race condition between cache directory registration and window creation

**Symptom:** Non-deterministic PATH_TRAVERSAL security violations during batch processing:
```
Error: Security violation (PATH_TRAVERSAL): Access denied: Path outside allowed folders
```

**Root Cause:** VideoTranscoder temp directory (`/private/var/folders/.../catalog-previews`) accessed before SecurityValidator allowlist registration completed

**Fix:** Moved cache directory registration into app.whenReady() with await before createWindow() - guarantees registration completes before UI becomes available

**Impact:** 100% reliable batch transcoding (eliminates non-deterministic failures)

**Evidence:** electron/__tests__/security/cacheDirectoryRegistration.test.ts (5 test cases)

**Commits:**
- 0f73fbd: test: add cache directory registration tests (RED)
- 9951743: fix: eliminate race condition (GREEN)
- 0b18dbf: refactor: add error boundary for hardening

**Validation:**
- security-specialist: [COMPLIANT]
- code-review-specialist: 8.5/10 APPROVED
- Hardening recommendations applied:
  1. ✅ Error boundary for fs.realpath() failure (app.quit() on failure)
  2. ✅ Documentation updated (this appendix)
  3. ✅ Test coverage for error boundary (Approach A integration tests)
