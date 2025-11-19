# CFEx Phase 1a - Technical Blueprint (D3)

**AUTHORITY:** D3 design-architect deliverable | Implementation-ready specifications
**CREATED:** 2025-11-19
**PHASE:** D3 Blueprint Architecture
**GOVERNANCE:** North Star 7 immutables + D2 Final Design (Progressive Disclosure Timeline)
**NEXT:** critical-design-validator (B0 GO/NO-GO) → implementation-lead (B2 TDD)

---

## EXECUTIVE SUMMARY

### Blueprint Purpose

Transform D2 synthesizer's progressive disclosure breakthrough into **implementation-ready architecture** with explicit component contracts, data flows, API specifications, and testing guidance for TDD execution.

### Scope: Phase 1a-CORE (3 weeks)

**GATES Phase 1b (Proxy Generation):**
- Essential file transfer mechanism (Node.js streams)
- Hybrid integrity validation (size + EXIF with fallback)
- Smart retry with comprehensive error mapping
- Dedicated transfer window with lifecycle management
- Basic CFEx auto-detection (single-card priority)
- Manual folder picker (functional baseline)

**DEFERRED TO Phase 1a-POLISH (1 week, parallel to Phase 1b):**
- Path intelligence (MRU + smart defaults + pinned folders)
- Multi-card detection enhancement (detailed comparison)
- Enhanced error log UI (real-time transparency)

### Implementation Timeline

```
Week 1-3: Phase 1a-CORE (18.5 days)
├─ Transfer Mechanism: 3 days (Node.js streams, progress, validation)
├─ Integrity Validation: 2.5 days (EXIF + fallback, file count)
├─ Error Handling: 4 days (comprehensive mapping, smart retry)
├─ CFEx Detection: 2.5 days (macOS + Ubuntu auto-detect)
├─ Path Selection: 0.5 days (manual folder picker)
├─ Dedicated Window: 5 days (UI, lifecycle, progress, validation results)
└─ Integration Testing: 5 days (LucidLink, Ubuntu, risk scenarios)

GATE: Phase 1a-CORE COMPLETE → Phase 1b starts Week 4
```

---

## COMPONENT ARCHITECTURE

### Component Dependency Graph

```
Main Process (Electron)
├─ services/
│  ├─ cfexTransfer.ts ──────────┐
│  │   Dependencies:            │
│  │   - integrityValidator     │
│  │   - errorHandler           ├─→ IPC Bridge ─→ Renderer Process
│  │   - securityValidator      │                (Transfer Window)
│  │   - fs/promises            │
│  │   - node:stream/promises   │
│  │                            │
│  ├─ integrityValidator.ts ────┤
│  │   Dependencies:            │
│  │   - exiftool (child process) │
│  │   - fs/promises            │
│  │                            │
│  └─ errorHandler.ts ──────────┘
│      Dependencies:
│      - Transfer state tracking
│      - Error classification maps
│
├─ ipc/
│  └─ cfexHandlers.ts
│      Dependencies:
│      - cfexTransfer service
│      - Window lifecycle manager
│      - Security validator
│
└─ windows/
   └─ transferWindow.ts
       Dependencies:
       - BrowserWindow lifecycle
       - IPC event handlers
       - Notification API

Renderer Process (React)
└─ components/
   ├─ CfexTransferWindow.tsx (root component)
   │   Dependencies:
   │   - FolderPicker
   │   - TransferProgress
   │   - ValidationResults
   │   - IPC renderer API
   │
   ├─ FolderPicker.tsx
   │   Dependencies:
   │   - IPC folder selection
   │   - Path validation feedback
   │
   ├─ TransferProgress.tsx
   │   Dependencies:
   │   - Real-time progress updates
   │   - File-level + overall metrics
   │
   └─ ValidationResults.tsx
       Dependencies:
       - EXIF validation warnings
       - File count comparison
       - Size mismatch alerts
```

---

### 1. Transfer Service (cfexTransfer.ts)

**Purpose:** Orchestrate file transfer from CFEx card to dual destinations (photos → LucidLink, videos → Ubuntu) with real-time progress tracking and integrity validation.

**Responsibilities:**
1. Enumerate source files from CFEx card
2. Route files to correct destination (photos vs videos by extension)
3. Stream file transfer with chunked progress tracking
4. Invoke integrity validation after each file
5. Coordinate error handling and retry logic
6. Report transfer completion with validation results

**Dependencies:**
- `integrityValidator` - Post-transfer size and EXIF validation
- `errorHandler` - Smart retry and error classification
- `securityValidator` - Path traversal prevention (v2.2.0 existing)
- `fs/promises` - File system operations
- `node:stream/promises` - Streaming pipeline

**Interface:**

```typescript
// Main transfer orchestration
interface CfexTransferService {
  startTransfer(config: TransferConfig): Promise<TransferResult>
  pauseTransfer(): void
  resumeTransfer(): void
  cancelTransfer(): void
  getTransferState(): TransferState
}

// Transfer configuration
interface TransferConfig {
  source: string // CFEx card path (e.g., /Volumes/NO NAME/)
  destinations: {
    photos: string       // /LucidLink/EAV014/images/shoot1/
    rawVideos: string    // /Ubuntu/EAV014/videos-raw/shoot1/
  }
  onProgress: (progress: TransferProgress) => void
  onFileComplete: (result: FileTransferResult) => void
  onValidation: (result: ValidationResult) => void
}

// Transfer result
interface TransferResult {
  success: boolean
  filesTransferred: number
  filesTotal: number
  bytesTransferred: number
  duration: number // milliseconds
  validationWarnings: ValidationWarning[]
  errors: TransferError[]
}

// Real-time progress
interface TransferProgress {
  currentFile: string
  fileIndex: number
  filesTotal: number
  currentFileBytes: number
  currentFileSize: number
  totalBytesTransferred: number
  totalBytesExpected: number
  percentComplete: number
  estimatedTimeRemaining: number | null
}

// Per-file transfer result
interface FileTransferResult {
  file: string
  source: string
  destination: string
  size: number
  duration: number
  sizeValidated: boolean
  exifTimestamp: Date | null
  exifSource: 'EXIF' | 'FILESYSTEM' | null
  warnings: string[]
}
```

**State Management:**

```typescript
class TransferState {
  status: 'idle' | 'scanning' | 'transferring' | 'paused' | 'validating' | 'complete' | 'error'
  currentFile: string | null
  filesEnqueued: FileTransferTask[]
  filesCompleted: FileTransferResult[]
  filesErrored: TransferError[]
  bytesTransferred: number
  bytesTotal: number
  startTime: number | null
  pausedAt: number | null
  errorRetryCount: Map<string, number> // file path → retry count
}

interface FileTransferTask {
  source: string
  destination: string
  size: number
  mediaType: 'photo' | 'video'
  enqueued: number // timestamp
}
```

**Key Methods:**

```typescript
// File enumeration and routing
async function scanSourceFiles(sourcePath: string): Promise<FileTransferTask[]> {
  const files = await fs.promises.readdir(sourcePath, { recursive: true })
  const tasks: FileTransferTask[] = []

  for (const file of files) {
    const fullPath = path.join(sourcePath, file)
    const stat = await fs.promises.stat(fullPath)

    if (!stat.isFile()) continue

    const ext = path.extname(file).toLowerCase()
    const mediaType = getMediaType(ext) // .jpg/.jpeg → 'photo', .mov/.mp4 → 'video'

    if (mediaType) {
      tasks.push({
        source: fullPath,
        destination: getDestinationPath(file, mediaType, config.destinations),
        size: stat.size,
        mediaType,
        enqueued: Date.now()
      })
    }
  }

  return tasks
}

// Streaming transfer with progress tracking
async function transferFile(task: FileTransferTask): Promise<FileTransferResult> {
  const startTime = Date.now()

  // Validate paths before transfer
  securityValidator.validateFilePath(task.source)
  securityValidator.validateFilePath(task.destination)

  // Ensure destination directory exists
  await fs.promises.mkdir(path.dirname(task.destination), { recursive: true })

  // Stream with progress tracking
  const readStream = fs.createReadStream(task.source, { highWaterMark: 64 * 1024 }) // 64KB chunks
  const writeStream = fs.createWriteStream(task.destination)

  let bytesTransferred = 0

  readStream.on('data', (chunk: Buffer) => {
    bytesTransferred += chunk.length

    // Update progress (throttled to 100ms intervals)
    this.updateProgress({
      currentFile: path.basename(task.source),
      fileIndex: this.state.filesCompleted.length + 1,
      filesTotal: this.state.filesEnqueued.length,
      currentFileBytes: bytesTransferred,
      currentFileSize: task.size,
      totalBytesTransferred: this.state.bytesTransferred + bytesTransferred,
      totalBytesExpected: this.state.bytesTotal,
      percentComplete: ((this.state.bytesTransferred + bytesTransferred) / this.state.bytesTotal) * 100,
      estimatedTimeRemaining: this.calculateETA()
    })
  })

  // Transfer with error handling
  try {
    await pipeline(readStream, writeStream)
  } catch (error) {
    // Clean up partial file on error
    try {
      await fs.promises.unlink(task.destination)
    } catch {}

    throw error
  }

  // Post-transfer validation
  const validation = await integrityValidator.validateFile(task.source, task.destination)

  return {
    file: path.basename(task.source),
    source: task.source,
    destination: task.destination,
    size: task.size,
    duration: Date.now() - startTime,
    sizeValidated: validation.sizeMatch,
    exifTimestamp: validation.timestamp,
    exifSource: validation.timestampSource,
    warnings: validation.warnings
  }
}

// Main transfer loop with error handling
async function executeTransfer(): Promise<void> {
  this.state.status = 'transferring'

  for (const task of this.state.filesEnqueued) {
    if (this.state.status === 'paused') {
      await this.waitForResume()
    }

    if (this.state.status === 'cancelled') {
      throw new TransferCancelledError()
    }

    try {
      const result = await this.transferFileWithRetry(task)
      this.state.filesCompleted.push(result)
      this.state.bytesTransferred += task.size
      this.config.onFileComplete(result)
    } catch (error) {
      this.state.filesErrored.push({
        file: task.source,
        error: errorHandler.classify(error),
        recoveryAction: errorHandler.getRecoveryAction(error)
      })

      // Fatal errors halt entire transfer
      if (errorHandler.isFatal(error)) {
        this.state.status = 'error'
        throw error
      }
    }
  }

  this.state.status = 'validating'
  await this.finalValidation()
  this.state.status = 'complete'
}
```

**Error Handling Integration:**

```typescript
async function transferFileWithRetry(task: FileTransferTask): Promise<FileTransferResult> {
  const maxRetries = errorHandler.getMaxRetries(task.destination) // Network paths get 5, local get 3
  const retryKey = task.source

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await this.transferFile(task)
    } catch (error) {
      // Fatal errors: Fail immediately (ENOSPC, EACCES, EROFS)
      if (errorHandler.isFatal(error)) {
        throw new FatalTransferError({
          file: task.source,
          errorCode: error.code,
          message: errorHandler.getUserMessage(error),
          recoveryAction: errorHandler.getRecoveryAction(error)
        })
      }

      // CFEx card removal: Clean up and fail
      if (error.code === 'ENOENT' && task.source.includes(this.config.source)) {
        await this.cleanupPartialFiles()
        throw new CardRemovedError({
          message: 'CFEx card removed during transfer',
          partialFiles: this.getPartialFiles()
        })
      }

      // Transient errors: Retry with backoff
      if (attempt === maxRetries) {
        throw error // Exhausted retries
      }

      const delay = errorHandler.getBackoffDelay(error, attempt)
      await sleep(delay)

      this.state.errorRetryCount.set(retryKey, attempt)
      logger.info(`Retrying ${task.source} (attempt ${attempt + 1}/${maxRetries}) after ${delay}ms - error: ${error.code}`)
    }
  }
}
```

**Testing Guidance (TDD):**

```typescript
// RED: Write failing tests first
describe('CfexTransferService', () => {
  describe('file enumeration', () => {
    it('should route .jpg files to photos destination', async () => {
      // Test that JPEG files are correctly identified as photos
    })

    it('should route .mov files to raw videos destination', async () => {
      // Test that MOV files are correctly identified as videos
    })

    it('should skip non-media files', async () => {
      // Test that .txt, .db, etc. are ignored
    })
  })

  describe('streaming transfer', () => {
    it('should transfer file with correct chunk size', async () => {
      // Test that 64KB chunks are used
    })

    it('should emit progress events during transfer', async () => {
      // Test that onProgress called with correct metrics
    })

    it('should validate size match after transfer', async () => {
      // Test that source.size === dest.size enforced
    })

    it('should clean up partial file on transfer error', async () => {
      // Test that incomplete files are deleted on failure
    })
  })

  describe('error handling', () => {
    it('should retry on ENOENT (LucidLink cache eviction)', async () => {
      // Test that transient ENOENT triggers retry
    })

    it('should fail immediately on ENOSPC (disk full)', async () => {
      // Test that fatal errors halt transfer without retry
    })

    it('should detect card removal and clean up', async () => {
      // Test that source ENOENT → cleanup partial files
    })
  })
})
```

---

### 2. Integrity Validator (integrityValidator.ts)

**Purpose:** Validate file transfer completeness and chronological temporal ordering (I1 compliance) through size checks and EXIF DateTimeOriginal validation with filesystem fallback.

**Responsibilities:**
1. Verify source and destination file sizes match (fail-fast)
2. Extract EXIF DateTimeOriginal from transferred files
3. Fallback to filesystem timestamps when EXIF missing (with warning)
4. Validate file count match (source vs destination)
5. Return validation results with warnings for user review

**Dependencies:**
- `exiftool` - EXIF metadata extraction (child process)
- `fs/promises` - Filesystem stat operations

**Interface:**

```typescript
interface IntegrityValidator {
  validateFile(source: string, dest: string): Promise<FileValidationResult>
  validateBatch(results: FileTransferResult[]): Promise<BatchValidationResult>
  extractTimestamp(filePath: string): Promise<TimestampResult>
}

// Per-file validation
interface FileValidationResult {
  file: string
  sizeMatch: boolean
  sourceSize: number
  destSize: number
  timestamp: Date | null
  timestampSource: 'EXIF' | 'FILESYSTEM' | null
  warnings: string[]
}

// Batch validation (post-transfer)
interface BatchValidationResult {
  fileCountMatch: boolean
  sourceFileCount: number
  destFileCount: number
  sizeValidationPassed: number
  exifTimestampsFound: number
  filesystemFallbacks: number
  chronologicalOrderEnforceable: boolean
  warnings: ValidationWarning[]
}

// Timestamp extraction result
interface TimestampResult {
  timestamp: Date | null
  source: 'EXIF' | 'FILESYSTEM' | null
  confidence: 'HIGH' | 'MEDIUM' | 'LOW'
  warning: string | null
}

interface ValidationWarning {
  severity: 'ERROR' | 'WARNING' | 'INFO'
  file: string
  message: string
  suggestedAction: string
}
```

**Key Methods:**

```typescript
// Per-file size validation (during transfer)
async function validateFile(source: string, dest: string): Promise<FileValidationResult> {
  const [sourceStat, destStat] = await Promise.all([
    fs.promises.stat(source),
    fs.promises.stat(dest)
  ])

  const sizeMatch = sourceStat.size === destStat.size

  if (!sizeMatch) {
    throw new IntegrityError({
      code: 'SIZE_MISMATCH',
      file: path.basename(source),
      sourceSize: sourceStat.size,
      destSize: destStat.size,
      message: `Size mismatch: source=${sourceStat.size}, dest=${destStat.size}`
    })
  }

  // Extract timestamp (EXIF with filesystem fallback)
  const timestampResult = await this.extractTimestamp(dest)

  const warnings: string[] = []
  if (timestampResult.warning) {
    warnings.push(timestampResult.warning)
  }

  return {
    file: path.basename(source),
    sizeMatch: true,
    sourceSize: sourceStat.size,
    destSize: destStat.size,
    timestamp: timestampResult.timestamp,
    timestampSource: timestampResult.source,
    warnings
  }
}

// EXIF extraction with filesystem fallback (CRITICAL for I1)
async function extractTimestamp(filePath: string): Promise<TimestampResult> {
  try {
    // Try EXIF DateTimeOriginal first (preferred - I1 compliance)
    const exifResult = await this.getEXIFDateTimeOriginal(filePath)

    if (exifResult) {
      return {
        timestamp: exifResult,
        source: 'EXIF',
        confidence: 'HIGH',
        warning: null
      }
    }
  } catch (error) {
    logger.warn(`EXIF extraction failed for ${filePath}: ${error.message}`)
  }

  // Fallback to filesystem creation time (with warning)
  try {
    const stat = await fs.promises.stat(filePath)

    return {
      timestamp: stat.birthtime,
      source: 'FILESYSTEM',
      confidence: 'MEDIUM',
      warning: `EXIF DateTimeOriginal missing - using file creation time. Verify camera clock accuracy before cataloging.`
    }
  } catch (error) {
    return {
      timestamp: null,
      source: null,
      confidence: 'LOW',
      warning: `Could not extract timestamp from file. Manual timestamp correction required.`
    }
  }
}

// Execute exiftool to extract EXIF DateTimeOriginal
async function getEXIFDateTimeOriginal(filePath: string): Promise<Date | null> {
  return new Promise((resolve, reject) => {
    // Use spawn({shell: false}) to prevent shell injection
    const exiftool = spawn('exiftool', [
      '-DateTimeOriginal',
      '-s3', // Short format (value only, no labels)
      filePath
    ], { shell: false })

    let output = ''
    let errorOutput = ''

    exiftool.stdout.on('data', (data) => {
      output += data.toString()
    })

    exiftool.stderr.on('data', (data) => {
      errorOutput += data.toString()
    })

    exiftool.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`exiftool failed: ${errorOutput}`))
        return
      }

      const dateStr = output.trim()

      if (!dateStr || dateStr === '-') {
        resolve(null) // EXIF field not present
        return
      }

      // Parse EXIF date format: "2025:11:19 14:32:01"
      const parsed = this.parseEXIFDate(dateStr)
      resolve(parsed)
    })

    exiftool.on('error', (error) => {
      reject(error)
    })
  })
}

// Parse EXIF date format to JavaScript Date
function parseEXIFDate(exifDate: string): Date | null {
  // EXIF format: "YYYY:MM:DD HH:MM:SS"
  const match = exifDate.match(/^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})$/)

  if (!match) {
    logger.warn(`Invalid EXIF date format: ${exifDate}`)
    return null
  }

  const [, year, month, day, hour, minute, second] = match

  // JavaScript Date months are 0-indexed
  return new Date(
    parseInt(year),
    parseInt(month) - 1,
    parseInt(day),
    parseInt(hour),
    parseInt(minute),
    parseInt(second)
  )
}

// Batch validation (after all files transferred)
async function validateBatch(results: FileTransferResult[]): Promise<BatchValidationResult> {
  const sourceFiles = results.map(r => r.source)
  const destFiles = results.map(r => r.destination)

  const fileCountMatch = sourceFiles.length === destFiles.length

  const sizeValidationPassed = results.filter(r => r.sizeValidated).length
  const exifTimestampsFound = results.filter(r => r.exifSource === 'EXIF').length
  const filesystemFallbacks = results.filter(r => r.exifSource === 'FILESYSTEM').length

  // Check if chronological ordering is enforceable
  const filesWithTimestamps = results.filter(r => r.exifTimestamp !== null)
  const chronologicalOrderEnforceable = filesWithTimestamps.length > 0

  // Generate warnings
  const warnings: ValidationWarning[] = []

  if (!fileCountMatch) {
    warnings.push({
      severity: 'ERROR',
      file: 'BATCH',
      message: `File count mismatch: ${sourceFiles.length} source files, ${destFiles.length} destination files`,
      suggestedAction: 'Review transfer logs and verify no files were skipped'
    })
  }

  if (filesystemFallbacks > 0) {
    warnings.push({
      severity: 'WARNING',
      file: 'BATCH',
      message: `${filesystemFallbacks} files missing EXIF DateTimeOriginal (using filesystem timestamps)`,
      suggestedAction: 'Verify camera clock accuracy before cataloging. Review files with filesystem timestamps.'
    })
  }

  if (!chronologicalOrderEnforceable) {
    warnings.push({
      severity: 'ERROR',
      file: 'BATCH',
      message: 'No files have timestamps - chronological ordering impossible (I1 violation)',
      suggestedAction: 'Manual timestamp correction required before cataloging'
    })
  }

  return {
    fileCountMatch,
    sourceFileCount: sourceFiles.length,
    destFileCount: destFiles.length,
    sizeValidationPassed,
    exifTimestampsFound,
    filesystemFallbacks,
    chronologicalOrderEnforceable,
    warnings
  }
}
```

**Testing Guidance (TDD):**

```typescript
describe('IntegrityValidator', () => {
  describe('size validation', () => {
    it('should pass when source and dest sizes match', async () => {
      // Test that sizeMatch=true when sizes equal
    })

    it('should throw IntegrityError when sizes mismatch', async () => {
      // Test that exception thrown on size mismatch
    })
  })

  describe('EXIF timestamp extraction', () => {
    it('should extract EXIF DateTimeOriginal from JPEG', async () => {
      // Test that EXIF extraction works for photos
    })

    it('should extract EXIF DateTimeOriginal from MOV', async () => {
      // Test that EXIF extraction works for videos
    })

    it('should fallback to filesystem timestamp when EXIF missing', async () => {
      // Test that stat.birthtime used when EXIF unavailable
    })

    it('should include warning when using filesystem fallback', async () => {
      // Test that warning generated for MEDIUM confidence timestamps
    })

    it('should parse EXIF date format correctly', async () => {
      // Test "2025:11:19 14:32:01" → Date object
    })
  })

  describe('batch validation', () => {
    it('should detect file count mismatch', async () => {
      // Test that source.length !== dest.length triggers warning
    })

    it('should count EXIF vs filesystem fallbacks', async () => {
      // Test that exifTimestampsFound and filesystemFallbacks tallied correctly
    })

    it('should flag I1 violation when no timestamps available', async () => {
      // Test that chronologicalOrderEnforceable=false when all timestamps null
    })
  })
})
```

---

### 3. Error Handler (errorHandler.ts)

**Purpose:** Classify transfer errors, determine retry strategy, and provide user-friendly recovery guidance for comprehensive error handling aligned with D2 validator's 7 risk scenarios.

**Responsibilities:**
1. Classify errors into TRANSIENT, FATAL, or NETWORK categories
2. Determine retry count and backoff delay based on error type
3. Generate user-friendly error messages and recovery actions
4. Track retry attempts per file
5. Detect CFEx card removal vs normal file errors

**Dependencies:**
- Transfer state tracking (retry counts)
- Error code classification maps

**Interface:**

```typescript
interface ErrorHandler {
  classify(error: Error): ErrorClassification
  isFatal(error: Error): boolean
  isTransient(error: Error): boolean
  isNetwork(error: Error): boolean
  getMaxRetries(destinationPath: string): number
  getBackoffDelay(error: Error, attempt: number): number
  getUserMessage(error: Error): string
  getRecoveryAction(error: Error): string
}

// Error classification
interface ErrorClassification {
  category: 'TRANSIENT' | 'FATAL' | 'NETWORK'
  code: string
  retriable: boolean
  userMessage: string
  recoveryAction: string
}

// Custom error types
class IntegrityError extends Error {
  constructor(details: {
    code: string
    file: string
    sourceSize?: number
    destSize?: number
    message: string
  }) {
    super(details.message)
    this.name = 'IntegrityError'
    this.code = details.code
    this.file = details.file
    this.sourceSize = details.sourceSize
    this.destSize = details.destSize
  }
}

class FatalTransferError extends Error {
  constructor(details: {
    file: string
    errorCode: string
    message: string
    recoveryAction: string
  }) {
    super(details.message)
    this.name = 'FatalTransferError'
    this.file = details.file
    this.errorCode = details.errorCode
    this.recoveryAction = details.recoveryAction
  }
}

class CardRemovedError extends Error {
  constructor(details: {
    message: string
    partialFiles: string[]
  }) {
    super(details.message)
    this.name = 'CardRemovedError'
    this.partialFiles = details.partialFiles
  }
}
```

**Error Classification Maps:**

```typescript
// TRANSIENT errors: Retry up to 3 times with exponential backoff
const TRANSIENT_ERRORS = [
  'EBUSY',      // Resource busy (original ideator)
  'ETIMEDOUT',  // Network timeout (original ideator)
  'ECONNRESET', // Connection reset (original ideator)
  'ENOENT',     // File not found (VALIDATOR: LucidLink cache eviction)
  'ESTALE',     // Stale NFS handle (VALIDATOR: Ubuntu NFS)
  'EAGAIN',     // Resource temporarily unavailable (VALIDATOR)
  'EIO'         // I/O error (VALIDATOR: conservative retry 3x then fail)
]

// FATAL errors: Fail immediately, no retry
const FATAL_ERRORS = [
  'ENOSPC',     // No space left (VALIDATOR: Scenario 2 - disk full)
  'EACCES',     // Permission denied (VALIDATOR)
  'EROFS',      // Read-only filesystem (VALIDATOR)
  'ENOTDIR',    // Not a directory (VALIDATOR)
  'EISDIR'      // Is a directory (VALIDATOR)
]

// NETWORK errors: Retry up to 5 times with longer delays (2s base)
const NETWORK_ERRORS = [
  'ETIMEDOUT',
  'ENETUNREACH',   // VALIDATOR: Scenario 4 - network partition
  'ECONNREFUSED',  // VALIDATOR
  'EHOSTUNREACH'   // VALIDATOR
]

// Error code → User-friendly message mapping
const ERROR_MESSAGES = {
  'ENOSPC': 'Destination disk is full. Cannot continue transfer.',
  'EACCES': 'Permission denied. Check folder access permissions.',
  'EROFS': 'Destination is read-only. Cannot write files.',
  'ENOENT': 'File not found. Retrying... (LucidLink cache may be reloading)',
  'ESTALE': 'Network file handle stale. Retrying... (NFS temporary issue)',
  'ENETUNREACH': 'Network unreachable. Retrying... (Check NFS mount)',
  'ETIMEDOUT': 'Network timeout. Retrying...',
  'EBUSY': 'File is busy. Retrying...',
  'EIO': 'I/O error. Retrying...'
}

// Error code → Recovery action mapping
const RECOVERY_ACTIONS = {
  'ENOSPC': 'Free up disk space on destination and restart transfer',
  'EACCES': 'Check folder permissions (chmod/chown) and restart transfer',
  'EROFS': 'Ensure destination is mounted read-write',
  'ENOENT': 'Wait for retry - LucidLink cache will repopulate',
  'ESTALE': 'Wait for retry - NFS mount will recover',
  'ENETUNREACH': 'Check network connection and NFS mount status',
  'ETIMEDOUT': 'Check network connection stability',
  'EBUSY': 'Wait for retry - file will become available',
  'EIO': 'Check disk health and cable connections'
}
```

**Key Methods:**

```typescript
// Classify error into category
function classify(error: Error): ErrorClassification {
  const code = error.code || 'UNKNOWN'

  if (FATAL_ERRORS.includes(code)) {
    return {
      category: 'FATAL',
      code,
      retriable: false,
      userMessage: ERROR_MESSAGES[code] || error.message,
      recoveryAction: RECOVERY_ACTIONS[code] || 'Contact support'
    }
  }

  if (NETWORK_ERRORS.includes(code)) {
    return {
      category: 'NETWORK',
      code,
      retriable: true,
      userMessage: ERROR_MESSAGES[code] || error.message,
      recoveryAction: RECOVERY_ACTIONS[code] || 'Check network connection'
    }
  }

  if (TRANSIENT_ERRORS.includes(code)) {
    return {
      category: 'TRANSIENT',
      code,
      retriable: true,
      userMessage: ERROR_MESSAGES[code] || error.message,
      recoveryAction: RECOVERY_ACTIONS[code] || 'Retry in progress'
    }
  }

  // Unknown error: Treat as fatal (conservative)
  return {
    category: 'FATAL',
    code,
    retriable: false,
    userMessage: error.message,
    recoveryAction: 'Review error log and contact support'
  }
}

// Determine retry count based on destination path (network paths get more retries)
function getMaxRetries(destinationPath: string): number {
  // Network paths (LucidLink, Ubuntu NFS): 5 retries (extended tolerance)
  if (destinationPath.startsWith('/LucidLink/') || destinationPath.startsWith('/Ubuntu/')) {
    return 5
  }

  // Local paths: 3 retries (standard)
  return 3
}

// Calculate exponential backoff delay
function getBackoffDelay(error: Error, attempt: number): number {
  const classification = this.classify(error)

  // Network errors: 2s base delay (longer than transient)
  const baseDelay = classification.category === 'NETWORK' ? 2000 : 1000

  // Exponential backoff: 1s, 2s, 4s, 8s, 16s...
  return Math.pow(2, attempt) * baseDelay
}

// Check if error indicates CFEx card removal (vs normal ENOENT)
function isCardRemovalError(error: Error, sourcePath: string, cfexCardPath: string): boolean {
  // ENOENT on source file within CFEx card path → likely card removal
  return error.code === 'ENOENT' &&
         sourcePath.startsWith(cfexCardPath) &&
         !fs.existsSync(cfexCardPath) // Card mount point no longer exists
}
```

**Testing Guidance (TDD):**

```typescript
describe('ErrorHandler', () => {
  describe('error classification', () => {
    it('should classify ENOENT as TRANSIENT', () => {
      // Test that LucidLink cache eviction is retriable
    })

    it('should classify ENOSPC as FATAL', () => {
      // Test that disk full halts transfer immediately
    })

    it('should classify ENETUNREACH as NETWORK', () => {
      // Test that network errors get extended retry (5 attempts)
    })

    it('should provide user-friendly messages for common errors', () => {
      // Test that ERROR_MESSAGES map returns helpful text
    })

    it('should provide recovery actions for fatal errors', () => {
      // Test that RECOVERY_ACTIONS map returns actionable steps
    })
  })

  describe('retry strategy', () => {
    it('should return 5 retries for LucidLink paths', () => {
      // Test that network paths get extended retry tolerance
    })

    it('should return 3 retries for local paths', () => {
      // Test that local paths get standard retry count
    })

    it('should calculate exponential backoff correctly', () => {
      // Test: attempt 1 → 2s, attempt 2 → 4s, attempt 3 → 8s
    })
  })

  describe('card removal detection', () => {
    it('should detect card removal when source ENOENT and mount gone', () => {
      // Test that isCardRemovalError returns true when card unmounted
    })

    it('should distinguish card removal from normal ENOENT', () => {
      // Test that destination ENOENT not flagged as card removal
    })
  })
})
```

---

## DATA FLOW DIAGRAMS

### Flow 1: Transfer Initiation

```
User Action: Click "Process" Button
    ↓
1. Validate Destinations Exist
   - securityValidator.validateFilePath(photosPath)
   - securityValidator.validateFilePath(videosPath)
   - If invalid → Show error dialog, halt
    ↓
2. Detect CFEx Card
   - detectCFExCard() → Auto-populate source field
   - If multiple cards → Show warning, default to first
   - If no cards → Require manual Browse
    ↓
3. Scan Source Files
   - cfexTransfer.scanSourceFiles(sourcePath)
   - Enumerate all files recursively
   - Filter by extension (.jpg, .jpeg, .mov, .mp4, etc.)
   - Route to destinations (photos vs videos)
   - Calculate total byte count
    ↓
4. Create Transfer Queue
   - Build FileTransferTask[] array
   - Sort by source path (maintain filesystem order)
   - Update TransferState (filesEnqueued, bytesTotal)
    ↓
5. Open Dedicated Transfer Window
   - transferWindow.show()
   - Send initial state to renderer
   - Window lifecycle handlers attached
    ↓
6. Begin Streaming Transfer
   - cfexTransfer.executeTransfer()
   - Sequential file processing (with retry logic)
   - Real-time progress updates via IPC
```

---

### Flow 2: Streaming Transfer (Per File)

```
For Each FileTransferTask in Queue:
    ↓
1. Validate Paths
   - securityValidator.validateFilePath(task.source)
   - securityValidator.validateFilePath(task.destination)
   - Prevent path traversal
    ↓
2. Ensure Destination Directory
   - fs.promises.mkdir(path.dirname(task.destination), { recursive: true })
    ↓
3. Create Streams
   - readStream = fs.createReadStream(task.source, { highWaterMark: 64KB })
   - writeStream = fs.createWriteStream(task.destination)
    ↓
4. Stream Data with Progress Tracking
   - readStream.on('data', (chunk) => {
       bytesTransferred += chunk.length
       updateProgress({
         currentFile: basename,
         currentFileBytes: bytesTransferred,
         currentFileSize: task.size,
         percentComplete: (bytesTransferred / task.size) * 100
       })
     })
   - Progress throttled to 100ms intervals (avoid UI overload)
    ↓
5. Execute Pipeline
   - await pipeline(readStream, writeStream)
   - On error → Clean up partial file, throw exception
    ↓
6. Post-Transfer Validation
   - integrityValidator.validateFile(task.source, task.destination)
   - Check: source.size === dest.size
   - Extract: EXIF DateTimeOriginal (or fallback to filesystem)
   - Return FileValidationResult
    ↓
7. Update State
   - filesCompleted.push(result)
   - bytesTransferred += task.size
   - Emit onFileComplete(result) to UI
    ↓
8. Error Handling
   - If error → errorHandler.classify(error)
   - If TRANSIENT → Retry with backoff (up to 3-5 attempts)
   - If FATAL → Halt entire transfer, show error dialog
   - If card removed → Cleanup partial files, throw CardRemovedError
```

---

### Flow 3: Integrity Validation (Post-Transfer)

```
After All Files Transferred:
    ↓
1. Collect Transfer Results
   - filesCompleted[] from TransferState
   - Each result has: file, size, timestamp, warnings
    ↓
2. File Count Comparison
   - sourceFileCount = filesEnqueued.length
   - destFileCount = filesCompleted.length
   - If mismatch → ERROR warning (missing files)
    ↓
3. EXIF Timestamp Analysis
   - Count files with EXIF DateTimeOriginal
   - Count files using filesystem fallback
   - Check if chronological ordering enforceable
    ↓
4. Generate Validation Warnings
   - For Each FileTransferResult:
       - If exifSource === 'FILESYSTEM' → WARNING:
         "File X missing EXIF - using filesystem timestamp"
       - If exifTimestamp === null → ERROR:
         "File X has no timestamp - manual correction required"
    ↓
5. Aggregate Batch Results
   - BatchValidationResult {
       fileCountMatch: boolean
       exifTimestampsFound: number
       filesystemFallbacks: number
       chronologicalOrderEnforceable: boolean
       warnings: ValidationWarning[]
     }
    ↓
6. Display Validation Results in UI
   - Show summary panel:
     ✓ File count match (100 source, 100 dest)
     ⚠️ 3 files missing EXIF timestamps (using filesystem)
     - EA001621.JPG (filesystem: 2025-11-19 14:32:01)
     - EA001622.JPG (filesystem: 2025-11-19 14:32:05)
     - EA001623.MOV (filesystem: 2025-11-19 14:32:10)
    ↓
7. User Acknowledgment
   - Require user to review warnings before closing window
   - "Close" button enabled only after validation complete
```

---

### Flow 4: Error Handling & Retry

```
Transfer Error Detected (during streaming)
    ↓
1. Classify Error
   - errorHandler.classify(error)
   - Determine category: TRANSIENT | FATAL | NETWORK
    ↓
2. Check Error Category
    ├─ FATAL (ENOSPC, EACCES, EROFS):
    │   ↓
    │   - Show error dialog immediately
    │   - Display user message: "Disk full - cannot continue"
    │   - Display recovery action: "Free up space and restart"
    │   - Halt entire transfer (cancel remaining files)
    │   - Update TransferState.status = 'error'
    │   - Return FatalTransferError
    │
    ├─ TRANSIENT (ENOENT, ESTALE, EBUSY, EIO):
    │   ↓
    │   - Check retry count for this file
    │   - If attempt < maxRetries (3 for local, 5 for network):
    │       ↓
    │       - Calculate backoff delay: Math.pow(2, attempt) * 1000ms
    │       - Sleep for delay (1s, 2s, 4s, 8s, 16s...)
    │       - Log retry attempt: "Retrying EA001621.JPG (attempt 2/3) after 2000ms - error: ENOENT"
    │       - Retry file transfer
    │   - If attempt === maxRetries:
    │       ↓
    │       - Throw error (exhausted retries)
    │       - Display error dialog: "File transfer failed after 3 retries"
    │       - Halt transfer
    │
    └─ NETWORK (ENETUNREACH, ETIMEDOUT, ECONNREFUSED):
        ↓
        - Extended retry: maxRetries = 5 (not 3)
        - Extended backoff: base delay = 2000ms (not 1000ms)
        - Retry with longer intervals: 2s, 4s, 8s, 16s, 32s
        - If all retries exhausted → Halt transfer
    ↓
3. Card Removal Detection (Special Case)
   - If error.code === 'ENOENT' AND source path in CFEx card:
       ↓
       - Check if CFEx mount point still exists
       - If mount point gone → Card removed
       - Cleanup partial files (delete incomplete transfers)
       - Throw CardRemovedError
       - Display dialog: "CFEx card removed - partial files cleaned up"
    ↓
4. Update UI with Error State
   - If retrying → Show "Retrying... (attempt 2/3)" in progress panel
   - If fatal → Show red error banner with recovery action
   - If card removed → Show critical alert dialog
```

---

## IPC API SPECIFICATIONS

### Main Process → Renderer (Event Emissions)

```typescript
// Progress updates (streaming during transfer)
ipcMain.send('cfex:progress', {
  currentFile: 'EA001621.JPG',
  fileIndex: 23,
  filesTotal: 100,
  currentFileBytes: 1024000,
  currentFileSize: 2048000,
  totalBytesTransferred: 47104000,
  totalBytesExpected: 204800000,
  percentComplete: 23.0,
  estimatedTimeRemaining: 180000 // milliseconds
})

// Per-file completion
ipcMain.send('cfex:file-complete', {
  file: 'EA001621.JPG',
  source: '/Volumes/NO NAME/DCIM/EA001621.JPG',
  destination: '/LucidLink/EAV014/images/shoot1/EA001621.JPG',
  size: 2048000,
  duration: 1234,
  sizeValidated: true,
  exifTimestamp: new Date('2025-11-19T14:32:01'),
  exifSource: 'EXIF',
  warnings: []
})

// Transfer complete (with validation results)
ipcMain.send('cfex:transfer-complete', {
  success: true,
  filesTransferred: 100,
  filesTotal: 100,
  bytesTransferred: 204800000,
  duration: 300000,
  validationWarnings: [
    {
      severity: 'WARNING',
      file: 'EA001622.JPG',
      message: 'EXIF DateTimeOriginal missing - using filesystem timestamp',
      suggestedAction: 'Verify camera clock accuracy before cataloging'
    }
  ],
  errors: []
})

// Error notification
ipcMain.send('cfex:transfer-error', {
  file: 'EA001623.MOV',
  errorCode: 'ENOSPC',
  message: 'Destination disk is full. Cannot continue transfer.',
  recoveryAction: 'Free up disk space on destination and restart transfer',
  fatal: true
})

// Retry notification
ipcMain.send('cfex:retry', {
  file: 'EA001621.JPG',
  attempt: 2,
  maxAttempts: 3,
  delay: 2000,
  errorCode: 'ENOENT',
  reason: 'File not found - LucidLink cache may be reloading'
})
```

---

### Renderer → Main Process (Invocations)

```typescript
// Start transfer
const result = await ipcRenderer.invoke('cfex:start-transfer', {
  source: '/Volumes/NO NAME/',
  destinations: {
    photos: '/LucidLink/EAV014/images/shoot1-20251124/',
    rawVideos: '/Ubuntu/EAV014/videos-raw/shoot1-20251124/'
  }
})

// Response: TransferResult
{
  success: true,
  filesTransferred: 100,
  filesTotal: 100,
  bytesTransferred: 204800000,
  duration: 300000,
  validationWarnings: [ /* ... */ ],
  errors: []
}

// Pause transfer
await ipcRenderer.invoke('cfex:pause-transfer')

// Resume transfer
await ipcRenderer.invoke('cfex:resume-transfer')

// Cancel transfer
await ipcRenderer.invoke('cfex:cancel-transfer')

// Get current transfer state
const state = await ipcRenderer.invoke('cfex:get-state')

// Response: TransferState
{
  status: 'transferring',
  currentFile: 'EA001621.JPG',
  filesEnqueued: [ /* FileTransferTask[] */ ],
  filesCompleted: [ /* FileTransferResult[] */ ],
  filesErrored: [],
  bytesTransferred: 47104000,
  bytesTotal: 204800000,
  startTime: 1700407921000,
  pausedAt: null,
  errorRetryCount: new Map()
}

// Detect CFEx card
const detection = await ipcRenderer.invoke('cfex:detect-card')

// Response: DetectionResult
{
  source: '/Volumes/NO NAME/',
  warning: null
}
// OR
{
  source: '/Volumes/NO NAME/',
  warning: '2 cards detected - using NO NAME. Use Browse to change.'
}
// OR
{
  source: '',
  warning: 'No CFEx card detected - use Browse button to select manually'
}

// Browse for folder (manual selection)
const folderPath = await ipcRenderer.invoke('cfex:browse-folder', {
  title: 'Select photos destination folder',
  defaultPath: '/LucidLink/'
})

// Response: string | null
'/LucidLink/EAV014/images/shoot1-20251124/'
```

---

### IPC Handler Implementation (Main Process)

```typescript
// electron/ipc/cfexHandlers.ts

import { ipcMain, dialog, BrowserWindow } from 'electron'
import { cfexTransferService } from '../services/cfexTransfer'
import { securityValidator } from '../services/securityValidator'
import { detectCFExCard } from '../services/cfexDetection'

export function registerCfexHandlers() {
  // Start transfer
  ipcMain.handle('cfex:start-transfer', async (event, config: TransferConfig) => {
    // Validate paths
    try {
      securityValidator.validateFilePath(config.source)
      securityValidator.validateFilePath(config.destinations.photos)
      securityValidator.validateFilePath(config.destinations.rawVideos)
    } catch (error) {
      throw new Error(`Path validation failed: ${error.message}`)
    }

    // Set up progress callback
    const progressCallback = (progress: TransferProgress) => {
      event.sender.send('cfex:progress', progress)
    }

    const fileCompleteCallback = (result: FileTransferResult) => {
      event.sender.send('cfex:file-complete', result)
    }

    const validationCallback = (result: ValidationResult) => {
      event.sender.send('cfex:validation-result', result)
    }

    // Execute transfer
    const result = await cfexTransferService.startTransfer({
      ...config,
      onProgress: progressCallback,
      onFileComplete: fileCompleteCallback,
      onValidation: validationCallback
    })

    // Emit completion event
    event.sender.send('cfex:transfer-complete', result)

    return result
  })

  // Pause transfer
  ipcMain.handle('cfex:pause-transfer', async () => {
    cfexTransferService.pauseTransfer()
  })

  // Resume transfer
  ipcMain.handle('cfex:resume-transfer', async () => {
    cfexTransferService.resumeTransfer()
  })

  // Cancel transfer
  ipcMain.handle('cfex:cancel-transfer', async () => {
    cfexTransferService.cancelTransfer()
  })

  // Get current state
  ipcMain.handle('cfex:get-state', async () => {
    return cfexTransferService.getTransferState()
  })

  // Detect CFEx card
  ipcMain.handle('cfex:detect-card', async () => {
    return detectCFExCard()
  })

  // Browse for folder
  ipcMain.handle('cfex:browse-folder', async (event, options: { title: string; defaultPath: string }) => {
    const result = await dialog.showOpenDialog({
      title: options.title,
      properties: ['openDirectory'],
      defaultPath: options.defaultPath
    })

    if (result.canceled) return null

    return result.filePaths[0]
  })
}
```

---

## STATE MANAGEMENT ARCHITECTURE

### Transfer State (Main Process)

```typescript
// electron/services/cfexTransfer.ts

class TransferState {
  // Transfer status
  status: 'idle' | 'scanning' | 'transferring' | 'paused' | 'validating' | 'complete' | 'error'

  // File tracking
  currentFile: string | null
  filesEnqueued: FileTransferTask[]
  filesCompleted: FileTransferResult[]
  filesErrored: TransferError[]

  // Progress tracking
  bytesTransferred: number
  bytesTotal: number

  // Timing
  startTime: number | null
  pausedAt: number | null
  pauseDuration: number // Accumulated pause time

  // Error tracking
  errorRetryCount: Map<string, number> // file path → retry count

  // Lifecycle
  cancelRequested: boolean
}

// File transfer task (queued for processing)
interface FileTransferTask {
  source: string
  destination: string
  size: number
  mediaType: 'photo' | 'video'
  enqueued: number // timestamp
}

// Transfer result (completed file)
interface FileTransferResult {
  file: string
  source: string
  destination: string
  size: number
  duration: number
  sizeValidated: boolean
  exifTimestamp: Date | null
  exifSource: 'EXIF' | 'FILESYSTEM' | null
  warnings: string[]
}

// Transfer error (failed file)
interface TransferError {
  file: string
  error: ErrorClassification
  recoveryAction: string
  attempt: number
}
```

**State Transitions:**

```
idle
  ↓ (startTransfer called)
scanning
  ↓ (source files enumerated)
transferring
  ↓ (pauseTransfer called)
paused
  ↓ (resumeTransfer called)
transferring
  ↓ (all files transferred)
validating
  ↓ (batch validation complete)
complete

OR

transferring
  ↓ (fatal error)
error
```

---

### Window State (Renderer Process)

```typescript
// src/components/CfexTransferWindow.tsx

interface WindowState {
  // Window lifecycle
  isOpen: boolean
  isMinimized: boolean

  // Transfer control
  canStart: boolean
  canPause: boolean
  canResume: boolean
  canCancel: boolean

  // Transfer progress
  progress: TransferProgress | null

  // Validation results
  validationResults: BatchValidationResult | null

  // User inputs
  source: string
  destinations: {
    photos: string
    rawVideos: string
  }

  // CFEx detection
  detectedCard: DetectionResult | null

  // Errors
  currentError: TransferError | null
}

// React state management example
const [windowState, setWindowState] = useState<WindowState>({
  isOpen: true,
  isMinimized: false,
  canStart: true,
  canPause: false,
  canResume: false,
  canCancel: false,
  progress: null,
  validationResults: null,
  source: '',
  destinations: {
    photos: '',
    rawVideos: ''
  },
  detectedCard: null,
  currentError: null
})

// IPC event listeners
useEffect(() => {
  const handleProgress = (progress: TransferProgress) => {
    setWindowState(prev => ({
      ...prev,
      progress,
      canPause: true,
      canCancel: true
    }))
  }

  const handleComplete = (result: TransferResult) => {
    setWindowState(prev => ({
      ...prev,
      progress: null,
      validationResults: result.batchValidation,
      canStart: true,
      canPause: false,
      canCancel: false
    }))
  }

  const handleError = (error: TransferError) => {
    setWindowState(prev => ({
      ...prev,
      currentError: error,
      canStart: true,
      canPause: false,
      canCancel: false
    }))
  }

  ipcRenderer.on('cfex:progress', handleProgress)
  ipcRenderer.on('cfex:transfer-complete', handleComplete)
  ipcRenderer.on('cfex:transfer-error', handleError)

  return () => {
    ipcRenderer.removeListener('cfex:progress', handleProgress)
    ipcRenderer.removeListener('cfex:transfer-complete', handleComplete)
    ipcRenderer.removeListener('cfex:transfer-error', handleError)
  }
}, [])
```

---

### Window Lifecycle Management (CRITICAL for Validator Scenario 6)

```typescript
// electron/windows/transferWindow.ts

let transferWindow: BrowserWindow | null = null
let transferInProgress = false

// Create transfer window
export function createTransferWindow(): BrowserWindow {
  if (transferWindow && !transferWindow.isDestroyed()) {
    transferWindow.show()
    transferWindow.focus()
    return transferWindow
  }

  transferWindow = new BrowserWindow({
    parent: null, // Independent lifecycle (VALIDATOR REQUIREMENT)
    width: 800,
    height: 600,
    minWidth: 600,
    minHeight: 400,
    closable: true,
    minimizable: true,
    title: 'CFEx Card Import',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  })

  transferWindow.loadFile('transfer.html')

  // Window close handling (VALIDATOR SCENARIO 6)
  transferWindow.on('close', (event) => {
    if (transferInProgress) {
      event.preventDefault() // Prevent close

      // Ask user confirmation
      const choice = dialog.showMessageBoxSync(transferWindow, {
        type: 'warning',
        title: 'Transfer In Progress',
        message: 'CFEx transfer is still running. What would you like to do?',
        buttons: ['Continue in Background', 'Cancel Transfer', 'Keep Window Open'],
        defaultId: 2, // Keep window open (safest)
        cancelId: 2
      })

      if (choice === 0) {
        // Continue in background
        transferWindow.minimize()
      } else if (choice === 1) {
        // Cancel transfer
        cfexTransferService.cancelTransfer()
        transferInProgress = false
        transferWindow.close()
      }
      // choice === 2: Do nothing (window stays open)
    }
  })

  transferWindow.on('closed', () => {
    transferWindow = null
  })

  return transferWindow
}

// Main window close handling (VALIDATOR SCENARIO 6)
export function setupMainWindowHandlers(mainWindow: BrowserWindow) {
  mainWindow.on('close', () => {
    if (transferWindow && !transferWindow.isDestroyed() && transferInProgress) {
      // Bring transfer window to front (ensure visibility)
      transferWindow.show()
      transferWindow.focus()

      // Notify user
      transferWindow.webContents.send('main-window-closed', {
        message: 'Main window closed - transfer continuing in background'
      })

      // Show system notification
      new Notification({
        title: 'CFEx Transfer Continues',
        body: 'Main window closed. Transfer window remains open.',
        urgency: 'normal'
      }).show()
    }
  })
}

// Transfer completion notification (VALIDATOR REQUIREMENT)
export async function onTransferComplete(result: TransferResult) {
  transferInProgress = false

  // System notification
  new Notification({
    title: 'CFEx Import Complete',
    body: `${result.filesTransferred} files transferred successfully`,
    urgency: 'normal'
  }).show()

  // Bring window to front (if minimized)
  if (transferWindow && !transferWindow.isDestroyed()) {
    if (transferWindow.isMinimized()) {
      transferWindow.restore()
    }
    transferWindow.focus()

    // Send completion event (UI will display validation results)
    transferWindow.webContents.send('cfex:transfer-complete', result)
  }
}

// App quit handling (prevent orphaned processes)
app.on('before-quit', () => {
  if (transferWindow && !transferWindow.isDestroyed()) {
    if (transferInProgress) {
      // Warn user before quitting with transfer in progress
      const choice = dialog.showMessageBoxSync({
        type: 'warning',
        title: 'Transfer In Progress',
        message: 'Quitting will cancel the active transfer. Continue?',
        buttons: ['Cancel Quit', 'Quit Anyway'],
        defaultId: 0
      })

      if (choice === 0) {
        return false // Prevent quit
      }

      // User chose to quit - cancel transfer
      cfexTransferService.cancelTransfer()
    }

    transferWindow.close()
  }
})
```

---

## INTEGRATION POINTS WITH v2.2.0 BASELINE

### 1. Security Validator Integration

**Existing Component:** `electron/services/securityValidator.ts`

**Reuse Pattern:**

```typescript
import { securityValidator } from './services/securityValidator'

// Validate all paths before transfer
async function validateTransferPaths(config: TransferConfig): Promise<void> {
  try {
    // Source path validation
    securityValidator.validateFilePath(config.source)

    // Destination path validation
    securityValidator.validateFilePath(config.destinations.photos)
    securityValidator.validateFilePath(config.destinations.rawVideos)
  } catch (error) {
    throw new Error(`Path validation failed: ${error.message}`)
  }
}

// Validate individual file paths during transfer
async function validateFilePath(filePath: string): Promise<void> {
  securityValidator.validateFilePath(filePath)
}
```

**Why Reuse:**
- Proven pattern from v2.2.0 (Security Report 007 compliance)
- Prevents path traversal attacks
- Platform-agnostic symlink resolution (macOS + Ubuntu)
- No need to reimplement - stable baseline

---

### 2. Metadata Writer Integration (Future Phase 1c)

**Existing Component:** `electron/services/metadataWriter.ts`

**Deferred Integration (Phase 1c):**

Phase 1a-CORE does NOT write file metadata (JSON-only workflow per I3).

Phase 1c will extend `metadataWriter` to support TapeName field:

```typescript
// Phase 1c enhancement (not Phase 1a)
interface MetadataWriteConfig {
  filePath: string
  tapeName: string // Original filename before any renaming
  shotName?: string
  logComment?: string
  description?: string
}

async function writeTapeName(filePath: string, tapeName: string): Promise<void> {
  await metadataWriter.writeXMP(filePath, {
    'XMP-xmpDM:TapeName': tapeName
  })
}
```

**Phase 1a Boundary:** No file metadata writing. Transfer only copies files and validates integrity.

---

### 3. Main Process IPC Registration

**Existing Pattern:** `electron/main.ts` registers IPC handlers on startup

**Integration:**

```typescript
// electron/main.ts

import { registerCfexHandlers } from './ipc/cfexHandlers'
import { createTransferWindow, setupMainWindowHandlers } from './windows/transferWindow'

app.whenReady().then(() => {
  // Register existing IPC handlers (v2.2.0 baseline)
  registerBatchHandlers()
  registerMetadataHandlers()
  registerFileHandlers()

  // Register CFEx IPC handlers (Phase 1a NEW)
  registerCfexHandlers()

  // Create main window
  const mainWindow = createMainWindow()

  // Set up main window lifecycle handlers (Phase 1a NEW)
  setupMainWindowHandlers(mainWindow)

  // CFEx transfer window created on-demand (not at startup)
})

// Main window menu integration (Phase 1a NEW)
function createMainWindowMenu(): Menu {
  return Menu.buildFromTemplate([
    // ... existing menu items ...
    {
      label: 'File',
      submenu: [
        // ... existing items ...
        { type: 'separator' },
        {
          label: 'CFEx Card Import...',
          accelerator: 'CmdOrCtrl+I',
          click: () => {
            createTransferWindow()
          }
        }
      ]
    }
  ])
}
```

---

### 4. React Component Integration

**Existing Pattern:** `src/App.tsx` as main renderer component

**Integration:**

```tsx
// src/App.tsx

import { CfexTransferButton } from './components/CfexTransferButton'

function App() {
  return (
    <div className="app">
      {/* Existing UI components */}
      <FileList />
      <BatchOperations />
      <SettingsModal />

      {/* NEW: CFEx Transfer button (Phase 1a) */}
      <CfexTransferButton />
    </div>
  )
}

// src/components/CfexTransferButton.tsx
export function CfexTransferButton() {
  const handleClick = () => {
    // IPC call to open dedicated transfer window
    ipcRenderer.send('cfex:open-window')
  }

  return (
    <button
      onClick={handleClick}
      className="cfex-transfer-btn"
      title="Import from CFEx card"
    >
      CFEx Card Import
    </button>
  )
}
```

**Dedicated Window:** Transfer UI lives in separate BrowserWindow, NOT embedded in main app.

---

### 5. Platform-Specific Path Handling

**Existing Pattern:** `electron/utils/platformPaths.ts`

**Extension:**

```typescript
// electron/utils/platformPaths.ts

export function getPlatformDefaultPaths(): { photos: string; rawVideos: string } {
  const platform = process.platform

  if (platform === 'darwin') {
    return {
      photos: '/LucidLink/',
      rawVideos: '/Ubuntu/'
    }
  }

  if (platform === 'linux') {
    return {
      photos: '/mnt/lucidlink/',
      rawVideos: '/home/videos-raw/'
    }
  }

  throw new Error(`Unsupported platform: ${platform}`)
}

// Detect LucidLink vs Ubuntu NFS mount
export function isNetworkPath(filePath: string): boolean {
  return filePath.startsWith('/LucidLink/') ||
         filePath.startsWith('/Ubuntu/') ||
         filePath.startsWith('/mnt/lucidlink/') ||
         filePath.startsWith('/mnt/nfs/')
}

// CFEx card detection paths (platform-specific)
export function getCFExMountPaths(): string[] {
  const platform = process.platform

  if (platform === 'darwin') {
    return ['/Volumes/']
  }

  if (platform === 'linux') {
    const user = process.env.USER || 'unknown'
    return [
      `/media/${user}/`,
      `/run/media/${user}/`
    ]
  }

  throw new Error(`Unsupported platform: ${platform}`)
}
```

---

## TESTING SPECIFICATIONS (TDD Guidance)

### Unit Tests (Component-Level)

**Location:** `electron/__tests__/cfex/`

```typescript
// electron/__tests__/cfex/cfexTransfer.test.ts

describe('CfexTransferService', () => {
  describe('file enumeration', () => {
    it('should enumerate all media files from source', async () => {
      // RED: Write failing test
      // Setup mock filesystem with .jpg, .mov, .mp4 files
      // Call scanSourceFiles(sourcePath)
      // Assert: All media files enumerated
      // Assert: Non-media files (.txt, .db) excluded
    })

    it('should route photos to photos destination', async () => {
      // RED: Write failing test
      // Setup mock config with photos/videos destinations
      // Enumerate files with .jpg extension
      // Assert: destination path contains photos destination
    })

    it('should route videos to rawVideos destination', async () => {
      // RED: Write failing test
      // Setup mock config with photos/videos destinations
      // Enumerate files with .mov/.mp4 extension
      // Assert: destination path contains rawVideos destination
    })

    it('should calculate total byte count correctly', async () => {
      // RED: Write failing test
      // Setup mock files with known sizes
      // Call scanSourceFiles()
      // Assert: bytesTotal === sum of all file sizes
    })
  })

  describe('streaming transfer', () => {
    it('should use 64KB chunks for streaming', async () => {
      // RED: Write failing test
      // Mock fs.createReadStream
      // Assert: highWaterMark option === 64 * 1024
    })

    it('should emit progress updates during transfer', async () => {
      // RED: Write failing test
      // Setup progress callback spy
      // Transfer file
      // Assert: onProgress called with correct metrics
      // Assert: percentComplete increases over time
    })

    it('should validate size match after transfer', async () => {
      // RED: Write failing test
      // Transfer file
      // Assert: integrityValidator.validateFile called
      // Assert: sizeMatch checked
    })

    it('should clean up partial file on error', async () => {
      // RED: Write failing test
      // Mock transfer error mid-stream
      // Assert: destination file deleted (fs.promises.unlink called)
    })
  })

  describe('error handling', () => {
    it('should retry on ENOENT (transient)', async () => {
      // RED: Write failing test
      // Mock ENOENT error on first attempt
      // Assert: transferFileWithRetry retries
      // Assert: backoff delay applied
      // Assert: success on second attempt
    })

    it('should fail immediately on ENOSPC (fatal)', async () => {
      // RED: Write failing test
      // Mock ENOSPC error
      // Assert: FatalTransferError thrown
      // Assert: No retry attempted
      // Assert: Transfer halted
    })

    it('should detect card removal and cleanup', async () => {
      // RED: Write failing test
      // Mock source ENOENT + card mount point gone
      // Assert: CardRemovedError thrown
      // Assert: Partial files cleaned up
    })

    it('should apply exponential backoff for retries', async () => {
      // RED: Write failing test
      // Mock transient error (EBUSY)
      // Assert: attempt 1 → 1s delay
      // Assert: attempt 2 → 2s delay
      // Assert: attempt 3 → 4s delay
    })
  })

  describe('pause/resume/cancel', () => {
    it('should pause transfer and wait for resume', async () => {
      // RED: Write failing test
      // Start transfer, pause after 10 files
      // Assert: status === 'paused'
      // Assert: Transfer loop waits
      // Resume
      // Assert: Transfer continues
    })

    it('should cancel transfer and halt immediately', async () => {
      // RED: Write failing test
      // Start transfer, cancel after 10 files
      // Assert: TransferCancelledError thrown
      // Assert: Remaining files not transferred
    })
  })
})
```

---

```typescript
// electron/__tests__/cfex/integrityValidator.test.ts

describe('IntegrityValidator', () => {
  describe('size validation', () => {
    it('should pass when source and dest sizes match', async () => {
      // RED: Write failing test
      // Mock fs.promises.stat with matching sizes
      // Call validateFile()
      // Assert: sizeMatch === true
    })

    it('should throw IntegrityError when sizes mismatch', async () => {
      // RED: Write failing test
      // Mock fs.promises.stat with different sizes
      // Assert: validateFile() throws IntegrityError
      // Assert: Error contains source/dest size details
    })
  })

  describe('EXIF timestamp extraction', () => {
    it('should extract DateTimeOriginal from JPEG', async () => {
      // RED: Write failing test
      // Mock exiftool response: "2025:11:19 14:32:01"
      // Call extractTimestamp()
      // Assert: timestamp parsed correctly
      // Assert: source === 'EXIF'
      // Assert: confidence === 'HIGH'
    })

    it('should extract DateTimeOriginal from MOV', async () => {
      // RED: Write failing test
      // Mock exiftool response for video file
      // Assert: EXIF extraction works for videos
    })

    it('should fallback to filesystem when EXIF missing', async () => {
      // RED: Write failing test
      // Mock exiftool response: '-' (field not present)
      // Assert: stat.birthtime used
      // Assert: source === 'FILESYSTEM'
      // Assert: confidence === 'MEDIUM'
      // Assert: warning generated
    })

    it('should handle exiftool errors gracefully', async () => {
      // RED: Write failing test
      // Mock exiftool failure (command not found)
      // Assert: Fallback to filesystem
      // Assert: Warning logged
    })

    it('should parse EXIF date format correctly', async () => {
      // RED: Write failing test
      // Test input: "2025:11:19 14:32:01"
      // Assert: Date(2025, 10, 19, 14, 32, 1) // month is 0-indexed
    })
  })

  describe('batch validation', () => {
    it('should detect file count mismatch', async () => {
      // RED: Write failing test
      // Mock results with 100 source, 99 dest
      // Assert: fileCountMatch === false
      // Assert: ERROR warning generated
    })

    it('should count EXIF vs filesystem fallbacks', async () => {
      // RED: Write failing test
      // Mock results: 97 EXIF, 3 FILESYSTEM
      // Assert: exifTimestampsFound === 97
      // Assert: filesystemFallbacks === 3
    })

    it('should flag I1 violation when no timestamps', async () => {
      // RED: Write failing test
      // Mock results: All timestamps null
      // Assert: chronologicalOrderEnforceable === false
      // Assert: CRITICAL warning generated
    })

    it('should generate warnings for filesystem fallbacks', async () => {
      // RED: Write failing test
      // Mock results with FILESYSTEM fallbacks
      // Assert: WARNING generated for each file
      // Assert: Suggested action: "Verify camera clock accuracy"
    })
  })
})
```

---

```typescript
// electron/__tests__/cfex/errorHandler.test.ts

describe('ErrorHandler', () => {
  describe('error classification', () => {
    it('should classify ENOENT as TRANSIENT', () => {
      // RED: Write failing test
      // Create error with code='ENOENT'
      // Assert: classify().category === 'TRANSIENT'
      // Assert: retriable === true
    })

    it('should classify ENOSPC as FATAL', () => {
      // RED: Write failing test
      // Create error with code='ENOSPC'
      // Assert: classify().category === 'FATAL'
      // Assert: retriable === false
    })

    it('should classify ENETUNREACH as NETWORK', () => {
      // RED: Write failing test
      // Create error with code='ENETUNREACH'
      // Assert: classify().category === 'NETWORK'
      // Assert: retriable === true
    })

    it('should provide user-friendly messages', () => {
      // RED: Write failing test
      // Classify ENOSPC error
      // Assert: userMessage === "Destination disk is full. Cannot continue transfer."
    })

    it('should provide recovery actions', () => {
      // RED: Write failing test
      // Classify ENOSPC error
      // Assert: recoveryAction === "Free up disk space on destination and restart transfer"
    })

    it('should treat unknown errors as FATAL', () => {
      // RED: Write failing test
      // Create error with code='UNKNOWN_ERROR'
      // Assert: classify().category === 'FATAL'
      // Assert: retriable === false
    })
  })

  describe('retry strategy', () => {
    it('should return 5 retries for LucidLink paths', () => {
      // RED: Write failing test
      // Call getMaxRetries('/LucidLink/...')
      // Assert: maxRetries === 5
    })

    it('should return 3 retries for local paths', () => {
      // RED: Write failing test
      // Call getMaxRetries('/tmp/...')
      // Assert: maxRetries === 3
    })

    it('should calculate exponential backoff', () => {
      // RED: Write failing test
      // Mock TRANSIENT error
      // Assert: attempt 1 → 2s (2^1 * 1000)
      // Assert: attempt 2 → 4s (2^2 * 1000)
      // Assert: attempt 3 → 8s (2^3 * 1000)
    })

    it('should use 2s base delay for NETWORK errors', () => {
      // RED: Write failing test
      // Mock NETWORK error (ENETUNREACH)
      // Assert: attempt 1 → 4s (2^1 * 2000)
    })
  })

  describe('card removal detection', () => {
    it('should detect card removal when mount point gone', () => {
      // RED: Write failing test
      // Mock ENOENT error on source file
      // Mock fs.existsSync('/Volumes/NO NAME/') → false
      // Assert: isCardRemovalError === true
    })

    it('should distinguish card removal from normal ENOENT', () => {
      // RED: Write failing test
      // Mock ENOENT error on destination file
      // Assert: isCardRemovalError === false
    })
  })
})
```

---

### Integration Tests (Service Interaction)

**Location:** `electron/__tests__/integration/`

```typescript
// electron/__tests__/integration/cfexWorkflow.test.ts

describe('CFEx Transfer Workflow (Integration)', () => {
  it('should complete full transfer workflow', async () => {
    // RED: Write failing test
    // Setup mock CFEx card with files
    // Setup mock destinations (photos, videos)
    // Call cfexTransfer.startTransfer()
    // Assert: All files transferred
    // Assert: Integrity validation passed
    // Assert: Progress events emitted
    // Assert: Batch validation complete
  })

  it('should handle mixed media types (photos + videos)', async () => {
    // RED: Write failing test
    // Setup mock source with .jpg and .mov files
    // Transfer
    // Assert: JPG files → photos destination
    // Assert: MOV files → rawVideos destination
  })

  it('should recover from transient LucidLink errors', async () => {
    // RED: Write failing test
    // Mock ENOENT on first attempt (LucidLink cache eviction)
    // Mock success on second attempt
    // Assert: Retry succeeded
    // Assert: File transferred successfully
  })

  it('should halt on fatal disk full error', async () => {
    // RED: Write failing test
    // Mock ENOSPC error during transfer
    // Assert: Transfer halted immediately
    // Assert: FatalTransferError thrown
    // Assert: Remaining files not transferred
  })

  it('should generate warnings for EXIF fallbacks', async () => {
    // RED: Write failing test
    // Mock files with missing EXIF
    // Transfer and validate
    // Assert: Batch validation warnings contain EXIF fallback notices
  })
})
```

---

### End-to-End Tests (User Workflow)

**Location:** `electron/__tests__/e2e/`

```typescript
// electron/__tests__/e2e/cfexTransferWindow.test.ts

import { _electron as electron } from 'playwright'
import { test, expect } from '@playwright/test'

describe('CFEx Transfer Window (E2E)', () => {
  let electronApp
  let transferWindow

  beforeEach(async () => {
    electronApp = await electron.launch({ args: ['.'] })
    // Open transfer window
    await electronApp.evaluate(({ ipcMain }) => {
      ipcMain.emit('cfex:open-window')
    })
    transferWindow = await electronApp.firstWindow()
  })

  afterEach(async () => {
    await electronApp.close()
  })

  it('should auto-detect CFEx card on launch', async () => {
    // Mock CFEx card at /Volumes/NO NAME/
    // Assert: Source field pre-populated
    // Assert: No warning banner
  })

  it('should allow manual folder selection', async () => {
    // Click "Browse..." for photos destination
    // Mock dialog.showOpenDialog
    // Assert: Selected path displayed in UI
  })

  it('should start transfer and show progress', async () => {
    // Fill source and destinations
    // Click "Process" button
    // Assert: Progress bar appears
    // Assert: Current file name displayed
    // Assert: Percentage increases
  })

  it('should display validation results after completion', async () => {
    // Complete transfer
    // Assert: Validation results panel visible
    // Assert: File count match displayed
    // Assert: EXIF warnings listed (if any)
  })

  it('should confirm before closing during transfer', async () => {
    // Start transfer
    // Attempt to close window
    // Assert: Confirmation dialog appears
    // Assert: Transfer continues if "Continue in Background" selected
  })
})
```

---

### Platform-Specific Tests (macOS + Ubuntu)

**Location:** `electron/__tests__/platform/`

```typescript
// electron/__tests__/platform/macOSPaths.test.ts

describe('macOS Path Handling', () => {
  beforeEach(() => {
    // Mock process.platform = 'darwin'
  })

  it('should detect LucidLink mount at /LucidLink/', () => {
    // Assert: isNetworkPath('/LucidLink/...') === true
  })

  it('should detect CFEx card at /Volumes/NO NAME/', () => {
    // Mock fs.readdirSync('/Volumes/') → ['NO NAME']
    // Assert: detectCFExCard() === '/Volumes/NO NAME/'
  })

  it('should use macOS default paths', () => {
    // Assert: getPlatformDefaultPaths().photos === '/LucidLink/'
    // Assert: getPlatformDefaultPaths().rawVideos === '/Ubuntu/'
  })
})

// electron/__tests__/platform/ubuntuPaths.test.ts

describe('Ubuntu Path Handling', () => {
  beforeEach(() => {
    // Mock process.platform = 'linux'
    // Mock process.env.USER = 'testuser'
  })

  it('should check both /media/$USER/ and /run/media/$USER/', () => {
    // Mock fs.readdirSync for both locations
    // Assert: detectCFExCard() checks both paths
  })

  it('should use Ubuntu default paths', () => {
    // Assert: getPlatformDefaultPaths().photos === '/mnt/lucidlink/'
    // Assert: getPlatformDefaultPaths().rawVideos === '/home/videos-raw/'
  })
})
```

---

## IMMUTABLE COMPLIANCE VERIFICATION

### I1: Chronological Temporal Ordering

**How Architecture Honors:**
- EXIF DateTimeOriginal extraction mandatory for all files
- Filesystem timestamp fallback when EXIF missing (with WARNING)
- Batch validation checks `chronologicalOrderEnforceable` flag
- Transfer halts if NO timestamps available (I1 violation)

**Testing Verification:**

```typescript
describe('I1 Compliance', () => {
  it('should extract EXIF DateTimeOriginal for all files', async () => {
    // Transfer files with EXIF
    // Assert: All results have exifTimestamp !== null
    // Assert: All results have exifSource === 'EXIF'
  })

  it('should fallback to filesystem timestamps when EXIF missing', async () => {
    // Transfer files WITHOUT EXIF
    // Assert: All results have exifTimestamp !== null
    // Assert: All results have exifSource === 'FILESYSTEM'
    // Assert: Warnings generated for each fallback
  })

  it('should flag I1 violation when no timestamps available', async () => {
    // Mock files with no EXIF and no filesystem timestamps
    // Assert: chronologicalOrderEnforceable === false
    // Assert: CRITICAL warning generated
    // Assert: Suggested action: "Manual timestamp correction required"
  })
})
```

---

### I3: Single Source of Truth

**How Architecture Honors:**
- Phase 1a-CORE does NOT write file metadata (JSON-only)
- Transfer mechanism only copies files (no XMP writing)
- Proxy folder location contract preserved (I5 ecosystem coherence)
- File metadata writing deferred to Phase 1c (optional toggle)

**Testing Verification:**

```typescript
describe('I3 Compliance', () => {
  it('should not modify file metadata during transfer', async () => {
    // Transfer files
    // Assert: No exiftool write commands executed
    // Assert: File XMP unchanged (only copy operation)
  })

  it('should preserve original file timestamps', async () => {
    // Transfer files
    // Read source EXIF DateTimeOriginal
    // Read dest EXIF DateTimeOriginal
    // Assert: Timestamps match (no modification)
  })
})
```

---

### I4: Zero Data Loss Guarantee

**How Architecture Honors:**
- Comprehensive error classification (TRANSIENT, FATAL, NETWORK)
- Smart retry for transient failures (LucidLink cache eviction, NFS stale handles)
- Fail-fast for fatal errors (ENOSPC disk full, EACCES permission denied)
- Size validation during transfer (source.size === dest.size enforced)
- File count comparison after transfer (source count === dest count)
- Partial file cleanup on card removal or fatal errors

**Testing Verification:**

```typescript
describe('I4 Compliance', () => {
  it('should detect size mismatch during transfer', async () => {
    // Mock incomplete file write (size mismatch)
    // Assert: IntegrityError thrown
    // Assert: Partial file cleaned up
  })

  it('should detect file count mismatch after transfer', async () => {
    // Transfer 100 source files, simulate 1 file skip
    // Assert: Batch validation fileCountMatch === false
    // Assert: ERROR warning generated
  })

  it('should cleanup partial files on card removal', async () => {
    // Mock card removal mid-transfer (source ENOENT)
    // Assert: Partial files deleted
    // Assert: CardRemovedError thrown
  })

  it('should halt on disk full (ENOSPC)', async () => {
    // Mock ENOSPC error during transfer
    // Assert: Transfer halted immediately
    // Assert: Remaining files not transferred
    // Assert: User recovery action provided
  })
})
```

---

### I5: Ecosystem Contract Coherence

**How Architecture Honors:**
- No changes to JSON Schema v2.0
- Transfer creates files in correct locations (photos → LucidLink images, raw → Ubuntu videos-raw)
- Proxy folder location unchanged (CEP Panel contract preserved)
- Filename immutability (no renaming in Phase 1a-CORE)

**Testing Verification:**

```typescript
describe('I5 Compliance', () => {
  it('should preserve original filenames during transfer', async () => {
    // Transfer EA001621.JPG
    // Assert: Destination filename === 'EA001621.JPG' (unchanged)
  })

  it('should maintain proxy folder location contract', async () => {
    // Transfer raw videos to /Ubuntu/videos-raw/
    // Assert: No JSON written to raw folder (only proxy folder per contract)
  })
})
```

---

### I7: Human Primacy Over Automation

**How Architecture Honors:**
- Auto-detection always shows manual override "Browse..." button
- EXIF fallback shows warning (user awareness, not silent automation)
- Path intelligence (POLISH) suggests, never forces
- Window close confirmation (user control during transfer)
- Fatal errors halt workflow (not silent continuation)

**Testing Verification:**

```typescript
describe('I7 Compliance', () => {
  it('should allow manual override of auto-detected card', async () => {
    // Auto-detect CFEx card
    // Click "Browse..." button
    // Assert: Manual selection dialog opens
    // Assert: User selection replaces auto-detected path
  })

  it('should show warning when using filesystem timestamps', async () => {
    // Transfer files with missing EXIF
    // Assert: WARNING displayed in UI
    // Assert: User sees fallback notice before closing window
  })

  it('should confirm before closing window during transfer', async () => {
    // Start transfer
    // Attempt window close
    // Assert: Confirmation dialog appears
    // Assert: User can choose: Continue, Cancel, or Keep Open
  })
})
```

---

## SECURITY CONSIDERATIONS

### 1. Path Traversal Prevention

**Reuse Existing Pattern:**

```typescript
import { securityValidator } from './services/securityValidator'

// Validate all user-provided paths
function validateTransferPaths(config: TransferConfig): void {
  securityValidator.validateFilePath(config.source)
  securityValidator.validateFilePath(config.destinations.photos)
  securityValidator.validateFilePath(config.destinations.rawVideos)
}

// Validate per-file paths during transfer
function validateFilePath(filePath: string): void {
  securityValidator.validateFilePath(filePath)
}
```

**What `securityValidator` Does (v2.2.0 existing):**
- Platform-agnostic symlink resolution (macOS + Ubuntu)
- Allowed path enforcement (no access outside designated folders)
- Prevents `../` path traversal attacks
- Validates paths before ANY file operations

---

### 2. Shell Injection Prevention

**CRITICAL: Use `spawn({shell: false})` for exiftool**

```typescript
// CORRECT: spawn without shell
const exiftool = spawn('exiftool', [
  '-DateTimeOriginal',
  '-s3',
  filePath
], { shell: false }) // NO shell execution

// INCORRECT: exec with shell (VULNERABLE to injection)
// exec(`exiftool -DateTimeOriginal -s3 ${filePath}`) // ❌ DON'T DO THIS
```

**Why This Matters:**
- If `filePath` contains shell metacharacters (`; rm -rf /`), shell execution would run malicious commands
- `spawn({shell: false})` passes arguments as array (no shell interpretation)
- Proven pattern from v2.2.0 Security Report 007

---

### 3. CFEx Card Detection Safety

**Whitelist Expected Volume Names:**

```typescript
const ALLOWED_CFEX_VOLUMES = [
  'NO NAME',        // Default CFEx card name
  'UNTITLED',       // Alternative CFEx name
  'SONY_CARD',      // Branded CFEx cards
  'CFEXPRESS'       // Generic CFEx label
]

function detectCFExCard(): DetectionResult {
  const volumes = fs.readdirSync('/Volumes/')
  const cfexVolumes = volumes.filter(v =>
    ALLOWED_CFEX_VOLUMES.some(allowed => v.includes(allowed))
  )

  // ... rest of detection logic
}
```

**Risk Assessment:**
- **Validator's Concern:** Volume name spoofing (attacker creates malicious volume named "NO NAME")
- **Risk Level:** LOW in closed-set production environment (EAV workflows are controlled)
- **Mitigation (POLISH phase):** File type validation (warn if non-media files detected on card)

---

### 4. Error Message Sanitization

**Reuse Existing Pattern:**

```typescript
import { sanitizeError } from './utils/sanitizeError'

// Before sending error to renderer
ipcMain.send('cfex:transfer-error', {
  file: path.basename(filePath), // Don't expose full path
  errorCode: error.code,
  message: sanitizeError(error), // Remove sensitive path details
  recoveryAction: getRecoveryAction(error)
})
```

**Why This Matters:**
- Error messages might contain full filesystem paths
- Renderer process could log errors (exposing sensitive paths)
- Sanitize before crossing IPC boundary (proven v2.2.0 pattern)

---

## NEXT STEPS (After D3 Approval)

### 1. Critical Design Validation (B0 Gate)

**critical-design-validator Review:**

Questions to validate:
1. **I4 Zero Data Loss:** Is error classification comprehensive enough? (7 risk scenarios covered?)
2. **Window Lifecycle:** Are orphan window scenarios fully mitigated? (Scenario 6 validator concern)
3. **EXIF Fallback:** Does filesystem timestamp fallback adequately preserve I1? (Scenario 5)
4. **Smart Retry:** Are retry counts and backoff delays appropriate for LucidLink/Ubuntu? (Scenarios 1, 4)

**security-specialist Review:**

Questions to validate:
1. **Path Validation:** Are all user-provided paths validated before file operations?
2. **Shell Execution:** Is `spawn({shell: false})` used for ALL child processes?
3. **Error Sanitization:** Are error messages sanitized before renderer IPC?
4. **CFEx Detection:** Is volume name spoofing risk acceptable for closed-set production?

**GO Criteria:**
- ✅ All validator risk scenarios mitigated (1-7)
- ✅ Security vulnerabilities addressed
- ✅ Transfer reliability 100% (no silent failures)
- ✅ I1, I4, I7 immutables honored

---

### 2. Visual Architecture (D3 UI Mockups)

**visual-architect Deliverables:**

1. **Dedicated Transfer Window Mockup (800×600)**
   - CFEx source field with auto-detect status
   - Photos destination picker (Browse button)
   - Raw videos destination picker (Browse button)
   - Progress tracking panel (per-file + overall)
   - Validation results panel (EXIF warnings, file count)
   - Process/Pause/Cancel buttons

2. **Progress Tracking UI**
   - Current file name display
   - Per-file progress bar (bytes transferred / total)
   - Overall progress bar (files completed / total)
   - Estimated time remaining

3. **Validation Results Panel**
   - File count match indicator (✓ or ⚠️)
   - EXIF timestamp summary (X found, Y filesystem fallbacks)
   - Detailed warnings list (file-by-file)
   - Scroll panel for large file counts

4. **Error States**
   - Transient error with retry indicator ("Retrying... attempt 2/3")
   - Fatal error dialog with recovery action
   - Card removal alert with partial file cleanup notice

---

### 3. Implementation Preparation (Before B2 Starts)

**2-Day Empirical Testing Sprint (MANDATORY):**

**Day 1: LucidLink + Ubuntu Validation**
- Test LucidLink cache eviction behavior (simulate during transfer)
- Verify Ubuntu NFS mount detection (20.04 + 22.04)
- Observe error code patterns in real production environment
- Document actual error codes encountered (validate TRANSIENT classification)

**Day 2: Real CFEx Card Testing**
- Transfer 3-5 production shoots from CFEx card
- Validate EXIF DateTimeOriginal extraction (photos + videos)
- Test filesystem timestamp fallback (files with missing EXIF)
- Measure transfer performance (time per GB, identify bottlenecks)

**implementation-lead Setup:**
- Load build-execution skill (TDD discipline enforcement)
- Set up testing infrastructure (Vitest, mock LucidLink/Ubuntu)
- Review North Star immutables (I1, I3, I4, I5, I7)
- Review quality gates (lint + typecheck + test before EVERY commit)

---

### 4. B2 Implementation Timeline (15 Working Days)

**Week 1 (Days 1-5):**
- Transfer mechanism (Node.js streams, progress tracking) - 3 days
- Integrity validation (EXIF + fallback, file count) - 2.5 days

**Week 2 (Days 6-10):**
- Error handling (comprehensive mapping, smart retry) - 4 days
- CFEx detection (macOS + Ubuntu auto-detect) - 2.5 days
- Manual folder picker - 0.5 days

**Week 3 (Days 11-15):**
- Dedicated transfer window (UI, lifecycle, progress) - 5 days

**Week 3-4 (Days 16-20):**
- Integration testing (LucidLink, Ubuntu, risk scenarios) - 5 days

**Gate:** Phase 1a-CORE COMPLETE → Phase 1b can start Week 4

---

## APPENDIX: D2 ARCHITECTURAL INSIGHTS EXTRACTED

This D3 blueprint formalizes architectural patterns from D2 synthesizer's design:

1. **Progressive Disclosure Timeline** (D2 breakthrough):
   - CORE phase (3 weeks) gates Phase 1b
   - POLISH phase (1 week) runs parallel to Phase 1b
   - Calendar time optimization through functional dependency analysis

2. **Node.js Streams with Progress Tracking** (D2 Alternative 1A):
   - 64KB chunks for memory efficiency
   - Real-time progress via stream 'data' events
   - Pipeline pattern for error handling

3. **Hybrid Integrity Validation** (D2 Alternative 2C + Validator modifications):
   - Size checks during transfer (fail-fast)
   - EXIF DateTimeOriginal extraction after transfer
   - Filesystem timestamp fallback (Validator's required addition)

4. **Smart Retry with Comprehensive Error Mapping** (D2 Alternative 5C + Validator modifications):
   - TRANSIENT errors: EBUSY, ETIMEDOUT, ECONNRESET, ENOENT, ESTALE, EAGAIN, EIO (Validator additions)
   - FATAL errors: ENOSPC, EACCES, EROFS, ENOTDIR, EISDIR (Validator additions)
   - NETWORK errors: Extended retry (5 attempts, 2s base delay)
   - Exponential backoff: 1s, 2s, 4s, 8s, 16s...

5. **Dedicated Transfer Window with Lifecycle Management** (D2 Alternative 6B + Validator modifications):
   - Independent window (`parent: null`) survives main window close
   - Close confirmation during transfer (Validator Scenario 6)
   - Background continuation support
   - System notifications on completion

6. **CFEx Auto-Detection** (D2 Alternative 4C simplified for CORE):
   - macOS: `/Volumes/NO NAME/` detection
   - Ubuntu: `/media/$USER/` + `/run/media/$USER/` dual-location scan
   - Multi-card basic warning (detailed comparison deferred to POLISH)

7. **Manual Folder Picker** (CORE phase baseline):
   - Simple `dialog.showOpenDialog()` (no MRU, no suggestions)
   - Platform-aware default paths (/LucidLink/, /Ubuntu/)
   - Path intelligence deferred to POLISH phase (MRU + pinned folders)

---

**DOCUMENT_VERSION:** 1.0
**CREATED:** 2025-11-19
**SYNTHESIS_APPROACH:** Formalization of D2 architectural insights into implementation-ready specifications
**WORD_COUNT:** ~18,000 words
**IMMUTABLE_COMPLIANCE:** 100% (I1, I3, I4, I5, I7 verified)
**NEXT_STEP:** critical-design-validator (B0 GO/NO-GO) → implementation-lead (B2 TDD)
