# Phase 1b B2.7 - Proxy Generation UI Design

**AUTHORITY:** D3 Blueprint | **CREATED:** 2025-11-27 | **STATUS:** APPROVED
**PHASE:** B2.7 UI Implementation
**GOVERNANCE:** NORTH_STAR[I1_chronological_integrity, I7_human_primacy]

---

## EXECUTIVE SUMMARY

SCOPE::Proxy_Generation_UI[CFEx_automatic + BatchPanel_manual]
APPROACH::Option_C[dual_integration]→automatic_during_transfer + manual_rerun_capability
SAFETY::Transfer_first→proxies_after[raw_backup_exists_before_proxy_generation]

---

## 1. ARCHITECTURE DECISION

### Safety Order Analysis

```
SCENARIO_A::Transfer_First_Proxies_After[SELECTED]
  1. CFEx → Ubuntu (raw backup created) ✓
  2. Ubuntu raw → LucidLink proxy
  SAFETY::raw_backup_exists_before_proxy_attempt
  RECOVERY::proxy_failure_does_not_lose_data

SCENARIO_B::Proxies_First_Transfer_After[REJECTED]
  1. CFEx → LucidLink proxy (from card directly)
  2. CFEx → Ubuntu raw
  RISK::card_removal_during_proxy_generation
  RISK::no_backup_until_transfer_completes
```

**DECISION:** Transfer raw files first, generate proxies after. Ubuntu raw folder serves as backup source for proxy generation.

---

## 2. CFEx TRANSFER WINDOW CHANGES

### 2.1 New UI Element: Proxy Destination Picker

**Location:** Below "Raw Videos Destination (Ubuntu)" section

```
┌─────────────────────────────────────────────────────────────┐
│ ☑ Proxy Videos Destination (LucidLink)                      │
│ ┌─────────────────────────────────────────────┐ ┌─────────┐ │
│ │ /Volumes/videos-current/2. WORKING.../proxy │ │ Browse..│ │
│ └─────────────────────────────────────────────┘ └─────────┘ │
└─────────────────────────────────────────────────────────────┘
```

**Behavior:**
- Checkbox controls whether proxy generation runs after transfer
- Default: OFF (I7 Human Primacy - user must opt-in)
- When enabled: Auto-generates proxies after raw transfer completes
- Browse button: Opens folder picker for proxy destination
- Input field: Manual path entry (like other destinations)

### 2.2 State Changes

```typescript
interface TransferState {
  // ... existing fields ...
  enabledDestinations: {
    photos: boolean
    rawVideos: boolean
    proxies: boolean  // NEW
  }
  destinationPaths: {
    photos: string
    rawVideos: string
    proxies: string   // NEW
  }
}
```

### 2.3 Transfer Workflow (Proxies Enabled)

```
WORKFLOW::[
  1. scanSourceFiles() → route photos/videos
  2. Transfer photos → LucidLink ✓
  3. Transfer raw videos → Ubuntu ✓
  4. IF[proxies_enabled]→generateProxies(Ubuntu_raw → LucidLink_proxy)
  5. Validate DateTimeOriginal preservation (I1 compliance)
  6. Display results (transfer + proxy generation)
]
```

### 2.4 Progress Display

**During Transfer:**
```
Transferring: EA001621.MOV
Progress: 45 / 103 files (43.69%)
[████████████░░░░░░░░░░░░░░░░░░░░░]
```

**During Proxy Generation (after transfer):**
```
Generating Proxies: EA001621.MOV
Progress: 12 / 58 videos (20.69%)
[██████░░░░░░░░░░░░░░░░░░░░░░░░░░]
Encoding: 45% | ETA: 2m 30s
```

### 2.5 Manual Proxy-Only Mode

User can uncheck photos/rawVideos and only check proxies:
- Source: Ubuntu raw folder (not CFEx card)
- Destination: LucidLink proxy folder
- Use case: Re-generate proxies for existing raw files

---

## 3. BATCH OPERATIONS PANEL CHANGES

### 3.1 Button Renaming

```
CURRENT                          RENAMED
─────────────────────────────────────────────────
"Process X Files"            → "AI Process X Files"
"Reprocess All X Files"      → "AI Reprocess All X Files"
```

### 3.2 New Button: Generate Proxies

**Location:** Below AI processing buttons

```
┌───────────────────────────────────────────────┐
│ [  AI Process X Files                    ]    │
│ [  AI Reprocess All X Files              ]    │
│ [  Generate Proxies for X Files          ]    │ ← NEW
│─────────────────────────────────────────────│
│ ▼ Batch Operations                            │
│   Status: idle                                │
└───────────────────────────────────────────────┘
```

**Behavior:**
- Works on selected files (if any selected) OR all video files
- Only processes video files (.mov, .mp4, .m4v)
- Skips photos (no proxy needed for images)
- Shows count: "Generate Proxies for X Videos" (not "files")

### 3.3 Proxy Generation Progress

**Option A: Reuse Batch Operations Panel**
- Same progress bar, different status messages
- Status: "generating_proxies" | "proxy_complete"
- Progress shows video count + encoding percentage

**Option B: Dedicated Progress Section (simpler)**
- New collapsible section below Batch Operations
- Independent progress tracking
- Doesn't interfere with AI batch processing

**SELECTED:** Option A (reuse existing progress UI) - simpler integration, consistent UX

### 3.4 State Changes

```typescript
interface BatchQueueState {
  status: 'idle' | 'processing' | 'completed' | 'cancelled' | 'error'
        | 'generating_proxies' | 'proxy_complete'  // NEW
  // ... existing fields
}
```

---

## 4. IPC INTEGRATION

### 4.1 Existing IPC (from B2.6)

```typescript
// Already implemented in proxyGenerationHandlers.ts
window.electronAPI.proxy.generateProxies(request: ProxyGenerationRequest)
window.electronAPI.proxy.onProxyProgress(callback)
```

### 4.2 CFEx Transfer Integration

```typescript
// In cfexTransferHandlers.ts - after raw transfer completes
if (config.enabledDestinations.proxies) {
  // Get list of transferred video files
  const videoFiles = transferredFiles.filter(f => isVideoFile(f))

  // Call proxy generation
  await proxyOrchestrator.executeJob({
    sourceFolder: config.destinations.rawVideos,
    outputFolder: config.destinations.proxies,
    filenames: videoFiles.map(f => f.filename)
  })
}
```

### 4.3 BatchOperationsPanel Integration

```typescript
// New handler in main.ts or batchHandlers.ts
ipcMain.handle('batch:generate-proxies', async (event, request: {
  sourceFolder: string,      // Current open folder in main app
  outputFolder: string,      // User-selected or default proxy destination
  filenames: string[]        // Selected video files (or all videos in folder)
}) => {
  // 1. Validate paths (securityValidator)
  // 2. Filter to video files only (.mov, .mp4, .m4v)
  // 3. Call proxyOrchestrator.executeJob(request)
  // 4. Progress emitted via 'proxy:progress' events
  // 5. Return ProxyGenerationResult
})
```

**SOURCE_FOLDER:** Current open folder in main app (user's responsibility if wrong folder)

---

## 5. SETTINGS PERSISTENCE

### 5.1 CFEx Config Extension

```typescript
interface CfexConfig {
  defaultSource: string
  defaultPhotos: string
  defaultVideos: string
  defaultProxies: string     // NEW
  enableProxyGeneration: boolean  // NEW (persists checkbox state)
  // ... toggles
}
```

### 5.2 Default Values

```typescript
DEFAULT_PROXY_DESTINATION = '/Volumes/videos-current/2. WORKING PROJECTS/'
PROXY_GENERATION_DEFAULT = false  // I7: opt-in required
```

---

## 6. ERROR HANDLING

### 6.1 CFEx Transfer + Proxy Errors

```
SCENARIO::transfer_succeeds_proxy_fails
BEHAVIOR::[
  1. Transfer phase completes successfully ✓
  2. Proxy generation fails on file X
  3. Continue to next video (fail-log-continue)
  4. Show partial success in results
  5. User can manually re-run proxy generation
]

SCENARIO::partial_proxy_cleanup
BEHAVIOR::[
  1. Proxy encoding fails mid-file
  2. Delete partial .MOV file (cleanup logic from B2.5)
  3. Log error for that file
  4. Continue with next video
]
```

### 6.2 BatchPanel Proxy Errors

```
BEHAVIOR::same_as_cfex[fail_log_continue]
DISPLAY::show_failed_count_in_results[X succeeded, Y failed]
RECOVERY::user_can_retry_failed_files
```

---

## 7. TEST SPECIFICATIONS

### 7.1 CFEx Transfer Window Tests

```typescript
describe('CfexTransferWindow - Proxy Generation', () => {
  'should display proxy destination picker below raw videos'
  'should have proxy checkbox defaulting to OFF'
  'should enable proxy input when checkbox checked'
  'should disable proxy input when checkbox unchecked'
  'should persist proxy destination to config'
  'should call generateProxies after raw transfer when enabled'
  'should not call generateProxies when checkbox unchecked'
  'should show proxy progress after transfer progress'
  'should allow proxy-only mode (photos/raw unchecked)'
})
```

### 7.2 BatchOperationsPanel Tests

```typescript
describe('BatchOperationsPanel - Proxy Generation', () => {
  'should display renamed AI Process button'
  'should display renamed AI Reprocess button'
  'should display Generate Proxies button'
  'should show video count in proxy button label'
  'should only count video files for proxy generation'
  'should show progress during proxy generation'
  'should call proxy:generate-proxies IPC on click'
})
```

---

## 8. IMPLEMENTATION SEQUENCE

### Backend Status Check (B2.1-B2.6)

```
COMPLETE::[
  ProxyGenerator.ts         ✅ 21 tests
  ExifPreserver.ts          ✅ 12 tests
  ProxyOrchestrator.ts      ✅ 11 tests
  SecurityValidator         ✅ 4 tests
  Cleanup logic             ✅ 3 tests
  proxyGenerationHandlers.ts ✅ 8 tests
  preload.ts                ✅ proxy namespace exposed
  electron.d.ts             ✅ TypeScript types
]

MISSING_BLOCKING::[
  main.ts::registerProxyGenerationHandlers(mainWindow) ← 5 min, REQUIRED FIRST
]
```

### Implementation Steps

```
B2.7_00::main.ts_Handler_Registration[5_min][BLOCKING]
  - Import registerProxyGenerationHandlers
  - Call in app.whenReady() with mainWindow
  - REQUIRED: Backend not callable until this is done
  - No tests needed (existing handler tests cover)

B2.7_01::CFEx_Transfer_Window_UI[2-3_hours][PURE_UI]
  - Add proxy destination state
  - Add proxy checkbox + input + browse
  - Wire to settings persistence
  - +9 tests (RED→GREEN)

B2.7_02::CFEx_Transfer_Backend_Integration[1-2_hours][BACKEND]
  - Modify cfexTransferHandlers to call proxy generation after raw transfer
  - Add progress forwarding for proxy phase
  - Handle errors (fail-log-continue)
  - +5 tests

B2.7_03::BatchPanel_Button_Rename[30_min][PURE_UI]
  - Rename existing buttons (AI prefix)
  - +2 tests

B2.7_04::BatchPanel_Proxy_Button[1-2_hours][MOSTLY_UI]
  - Add Generate Proxies button
  - Filter for video files only
  - Wire to EXISTING proxy:generate IPC (no new backend!)
  - Progress tracking via proxy:progress events
  - +6 tests
```

**ESTIMATED TOTAL:** 5-8 hours with TDD discipline

### Execution Order Recommendation

```
1. B2.7_00 (main.ts registration) ← DO FIRST, 5 min
2. B2.7_03 (button rename) ← Quick win, 30 min
3. B2.7_04 (BatchPanel proxy button) ← Uses existing backend
4. B2.7_01 (CFEx UI additions)
5. B2.7_02 (CFEx backend integration) ← Most complex
```

---

## 9. IMMUTABLE COMPLIANCE

```
I1::Chronological_Integrity
  - DateTimeOriginal preserved (ExifPreserver)
  - Proxy timestamp matches raw timestamp
  - Validation halts if mismatch

I7::Human_Primacy
  - Proxy generation default OFF
  - User must check box to enable
  - Manual button for re-run capability
  - All destinations individually toggleable
```

---

## DOCUMENT_METADATA

```
VERSION::1.0
CREATED::2025-11-27
AUTHORITY::holistic-orchestrator
NEXT::implementation-lead[B2.7_TDD_with_build-execution_skill]
APPROVAL::USER_CONFIRMED[Option_C_selected]
```
