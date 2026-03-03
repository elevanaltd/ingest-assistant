# Batch Processing Implementation (Issue #24)

**Status:** ✅ Production Ready (November 2025)
**Test Coverage:** 446/446 tests passing
**Quality Gates:** Lint ✓ | Typecheck ✓ | Tests ✓

## Overview

Batch processing enables AI analysis of multiple files sequentially with:
- Rate limiting (100 files/min to prevent API abuse)
- Progress tracking with live updates
- Queue persistence (survives app restarts)
- Graceful cancellation (finishes current file, then stops)
- Automatic metadata storage (same `.ingest-metadata.json` as manual processing)

## Architecture

### Components

**1. BatchQueueManager** (`electron/services/batchQueueManager.ts`)
- FIFO queue processing
- Progress event emission
- State persistence to disk
- Cancellation support
- Rate limiter integration

**2. Rate Limiter** (`electron/main.ts:58-79`)
- Token bucket algorithm (100 tokens/min)
- **Waits** for tokens (doesn't throw errors)
- Burst processing: First ~100 files process immediately
- Sequential throttling: ~600ms delay between files after burst

**3. UI Integration** (`src/components/BatchOperationsPanel.tsx`)
- Displays unprocessed file count
- Shows real-time progress (current/total)
- 100-file batch limit (user warned if more)
- Cancel button during processing
- Auto-expands during processing

### Data Flow

```
UI Click "Process Files"
  ↓
IPC: batch:start(fileIds[])
  ↓
BatchQueueManager.addToQueue(fileIds)
  ↓
BatchQueueManager.startProcessing(processor, callbacks, rateLimiter)
  ↓
For each file:
  1. Rate limiter waits for token (if needed)
  2. Processor analyzes file with AI
  3. If confidence > 0.7: Update metadata store
  4. Emit progress event to UI
  5. Persist queue state to disk
  ↓
Emit completion summary
```

## Bug Fixes Applied (November 2025)

### Bug #1: Stale Queue Persistence Across Folder Changes

**Symptom:** 99/100 files failed with "Cannot find fileMetadata"

**Root Cause:**
Queue persisted to disk with fileIds from previous folder. When user opened new folder, these fileIds didn't exist in new metadata store.

**Fix Applied (Commit: bbc1390):**
- Added `BatchQueueManager.clearQueue()` method
- Clear queue when folder changes (2 integration points):
  1. `dialog.showOpenDialog()` - explicit folder selection
  2. `getMetadataStoreForFolder()` - implicit folder change
- Queue now folder-scoped via automatic clearing

**Files Changed:**
- `electron/services/batchQueueManager.ts` (+19 lines)
- `electron/main.ts` (+4 lines folder selection, +6 lines helper)
- `electron/__tests__/batch/batchQueueManager.clearQueue.test.ts` (+200 lines, 6 tests)

**Test Evidence:**
```bash
$ npm test -- batchQueueManager.clearQueue.test.ts
✓ 6 tests pass
✓ Validates stale queue clearing
✓ Verifies persistence of cleared state
```

---

### Bug #2: Missing Metadata Entries for Unprocessed Files

**Symptom:** 68/69 files failed - only manually-processed file succeeded

**Root Cause:**
`file:load-files` checked for metadata entries but didn't create them for new files. Batch processor expected ALL files to have metadata entries.

**Fix Applied (Commit: 07a1916):**
- `file:load-files` now creates metadata entries for all scanned files
- Uses FileMetadata from `scanFolder()` (already complete)
- Persists to store with `processedByAI: false`

**Files Changed:**
- `electron/main.ts` (+8 lines, -2 lines in file:load-files handler)

**Before:**
```typescript
if (!existingMetadata) {
  // Skip - no metadata entry
}
```

**After:**
```typescript
if (!existingMetadata) {
  // Save scanFolder's FileMetadata to store
  await store.updateFileMetadata(file.id, file);
}
```

---

### Bug #3: Rate Limiter Throwing Errors Instead of Waiting

**Symptom:** Batch processing failed with rate limit errors

**Root Cause:**
Rate limiter threw errors when tokens unavailable instead of waiting.

**Fix Applied (Commit: c7e496c):**
- Changed rate limiter from throwing → waiting
- Calculates wait time: `((tokens_needed - tokens_available) / refill_rate) * 1000`
- Waits with `setTimeout()`, then refills and consumes

**Before:**
```typescript
if (this.tokens < tokens) {
  throw new Error('Rate limit exceeded. Please wait...');
}
```

**After:**
```typescript
if (this.tokens < tokens) {
  const waitTime = Math.ceil(((tokens - this.tokens) / this.refillRate) * 1000);
  console.log(`[RateLimiter] Waiting ${waitTime}ms for ${tokens} token(s)...`);
  await new Promise(resolve => setTimeout(resolve, waitTime));
  this.refill();
}
```

---

## Usage

### Starting Batch Processing

1. **Open folder** with media files
2. **UI shows unprocessed count:** "68 files available"
3. **Click "Process 68 Files"** (or "Process First 100 Files" if >100)
4. **Batch panel auto-expands** showing:
   - Progress bar (percentage complete)
   - Current file being processed
   - Completed/Failed counts
5. **Processing completes** - UI shows "completed" status

### Rate Limiting Behavior

**Burst Phase (First ~100 files):**
- All tokens available immediately
- Files process as fast as AI can respond
- No waiting between files

**Throttled Phase (After burst):**
- Rate limiter waits ~600ms between files
- Console shows: `[RateLimiter] Waiting 598ms for 1 token(s)...`
- Ensures 100 files/minute limit

### Expected Processing Time

- **10 files:** ~5-10 seconds (burst, no throttling)
- **100 files:** ~60-90 seconds (burst + some throttling)
- **200 files:** ~120-180 seconds (requires 2 batches)

### Cancellation

Click **"Cancel"** button during processing:
- Finishes current file being processed
- Marks remaining files as "cancelled"
- Emits completion summary
- Queue state persisted to disk

## Metadata Storage

**Same storage as manual processing:**
- Metadata saved to `{folderPath}/.ingest-metadata.json`
- Each processed file updates this JSON file
- Batch processing = sequential manual processing (automated)

**Example metadata entry:**
```json
{
  "EA001621": {
    "id": "EA001621",
    "originalFilename": "EA001621.JPG",
    "currentFilename": "EA001621.JPG",
    "filePath": "/path/to/EA001621.JPG",
    "extension": ".JPG",
    "mainName": "hallway-smoke-detector-CU",
    "metadata": ["smoke-detector", "ceiling", "fire-safety"],
    "processedByAI": true,
    "lastModified": "2025-11-11T10:21:00.000Z",
    "fileType": "image",
    "location": "hallway",
    "subject": "smoke-detector",
    "action": undefined,
    "shotType": "CU"
  }
}
```

## Queue Persistence

**Queue file location:** `~/.config/ingest-assistant/batch-queue.json`

**Persisted state:**
- All queued file IDs
- Status of each file (pending/processing/completed/error/cancelled)
- Current processing file
- Queue status (idle/processing/completed/error/cancelled)

**Restoration on app restart:**
- Queue automatically restored from disk
- Status reset from "processing" → "idle"
- Current file cleared
- **Now: Queue cleared when folder changes** (Bug #1 fix)

## Console Logging

**Queue Management:**
```
[BatchQueueManager] Restored 0 items from disk
[BatchQueueManager] Clearing queue (had 69 items)
[main.ts] Folder changing from /old/path to /new/path
```

**Rate Limiting:**
```
[RateLimiter] Waiting 598ms for 1 token(s)...
```

**Processing:**
```
[IPC] Batch analyzing image file: /path/to/file.jpg
[AIService] Parsed AI response: {...}
```

## Testing

**Test Files:**
- `electron/__tests__/batch/batchQueueManager.test.ts` (original queue tests)
- `electron/__tests__/batch/batchQueueManager.clearQueue.test.ts` (folder-change tests)
- `electron/__tests__/batch/rateLimiter.test.ts` (rate limiting tests)

**Test Coverage:**
- ✅ Queue FIFO processing
- ✅ Progress tracking and events
- ✅ Cancellation (graceful shutdown)
- ✅ Queue persistence and restoration
- ✅ Rate limiter waiting behavior
- ✅ Clearing stale queue on folder change
- ✅ Metadata entry creation for new files
- ✅ Concurrent batch prevention (one at a time)

**Run Tests:**
```bash
npm test -- --run
# Test Files: 28 passed (28)
# Tests: 446 passed (446)
```

## Security

**Rate Limiting:** 100 files/minute prevents API abuse
**Input Validation:** Zod schema validation on IPC messages
**Path Security:** SecurityValidator checks all file paths
**Content Validation:** Magic bytes verification before processing
**Size Limits:** 100MB for images (configurable)
**Batch Limit:** 100 files per batch (UI enforced)

## Known Limitations

1. **Sequential Processing:** Files processed one at a time (not parallel)
   - **Reason:** Rate limiting + AI API constraints
   - **Future:** Could add parallel processing with token pool

2. **100-File Batch Limit:** UI restricts batches to 100 files
   - **Reason:** API rate limits + UX (long-running operations)
   - **Workaround:** Run multiple batches sequentially

3. **No Resume After Cancel:** Cancelled batches must be restarted from beginning
   - **Reason:** Simplicity of current implementation
   - **Future:** Could add "resume" feature with queue state

4. **Single Queue:** Only one batch can run at a time
   - **Reason:** Prevents rate limit violations
   - **Design:** Intentional - concurrent batches blocked

## Future Enhancements

**Potential Improvements:**
- [ ] Parallel processing with shared token pool
- [ ] Resume cancelled batches
- [ ] Priority queue (process certain files first)
- [ ] Batch retry for failed files
- [ ] Progress persistence (survive app crashes)
- [ ] Multiple queues with different rate limits
- [ ] Batch scheduling (process during off-hours)

## Troubleshooting

### Issue: "Batch already in progress" error

**Cause:** Tried to start new batch while one is running
**Solution:** Cancel current batch or wait for completion

---

### Issue: Files showing "Batch Processing Complete" but nothing happened

**Cause:** Stale queue from previous folder (fixed in Bug #1)
**Solution:** Upgrade to latest version with folder-change clearing

---

### Issue: Only 1 file processed, rest skipped

**Cause:** Missing metadata entries (fixed in Bug #2)
**Solution:** Upgrade to latest version with auto-metadata creation

---

### Issue: Rate limit errors

**Cause:** Old rate limiter threw errors (fixed in Bug #3)
**Solution:** Upgrade to latest version with waiting rate limiter

---

### Issue: Processing very slow

**Expected:** ~600ms per file after burst (100 files/minute)
**Check:** Console shows `[RateLimiter] Waiting...` messages
**Normal:** This is rate limiting working correctly

---

## Related Issues

- **Issue #18:** Security hardening - batch IPC validation
- **Issue #24:** Batch processing bugs (stale queue, missing metadata, rate limiting)
- **PR #31:** Initial batch processing implementation
- **PR #33:** Security improvements

## Commits

- `bbc1390` - fix: clear stale batch queue on folder change (Issue #24)
- `a1c5a47` - fix: add clearQueue to second folder-change path (Issue #24)
- `07a1916` - fix: create metadata entries for all files during scan (Issue #24)
- `c7e496c` - test: add retroactive validation for batch processing fixes (Issue #24)

## References

- **Architecture:** `.coord/docs/001-DOC-ARCHITECTURE.md`
- **Security:** `.coord/docs/adrs/001-DOC-ADR-006-SECURITY-HARDENING-STRATEGY.md`
- **Testing:** `README.md` (Test Coverage Areas section)
