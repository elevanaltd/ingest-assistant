/**
 * CFEx Transfer IPC Handlers
 *
 * Exposes CfexTransferService to renderer process via IPC bridge.
 *
 * Design Philosophy (MIP Compliance):
 * - ESSENTIAL: IPC handlers expose transfer service to UI
 * - ESSENTIAL: Zod validation for config schema (security + type safety)
 * - ESSENTIAL: Event emission for real-time progress updates
 * - DEFERRED: Pause/resume/cancel (Week 2 error handling phase)
 *
 * Architecture Pattern:
 * - Singleton service instance (shared across all IPC calls)
 * - Progress callbacks forwarded to renderer via webContents.send()
 * - Follows existing v2.2.0 IPC pattern (inline handlers in main.ts)
 *
 * System Ripples:
 * - Enables Transfer Window UI to invoke transfer operations
 * - Event emission enables real-time progress UI updates
 * - Zod validation prevents malformed configs from reaching service layer
 *
 * Reference: Orchestration directive from holistic-orchestrator
 */

import { ipcMain, BrowserWindow } from 'electron'
import { z } from 'zod'
import {
  CfexTransferService,
  TransferConfig,
  TransferProgress,
  FileTransferResult
} from '../services/cfexTransfer'
import { FileValidationResult } from '../services/integrityValidator'

// Transfer state for getTransferState() handler
export interface TransferState {
  status: 'idle' | 'scanning' | 'transferring' | 'validating' | 'complete' | 'error'
  filesCompleted: number
  filesTotal: number
  bytesTransferred: number
  bytesTotal: number
  currentFile?: string
  error?: Error
}

// Singleton service instance
let transferService: CfexTransferService | null = null
let transferState: TransferState = {
  status: 'idle',
  filesCompleted: 0,
  filesTotal: 0,
  bytesTransferred: 0,
  bytesTotal: 0
}

/**
 * Validation schema for transfer config
 *
 * Enforces:
 * - source: string (CFEx card mount path)
 * - destinations.photos: string (LucidLink path)
 * - destinations.rawVideos: string (Ubuntu path)
 * - options.skipValidation: boolean (optional, deferred to Week 2)
 */
const TransferConfigSchema = z.object({
  source: z.string().min(1, 'Source path required'),
  destinations: z.object({
    photos: z.string().min(1, 'Photos destination required'),
    rawVideos: z.string().min(1, 'Raw videos destination required')
  }),
  options: z.object({
    skipValidation: z.boolean().optional()
  }).optional()
})

/**
 * Get or create transfer service instance
 *
 * Singleton pattern ensures shared state across IPC calls.
 */
function getTransferService(): CfexTransferService {
  if (!transferService) {
    transferService = new CfexTransferService()
  }
  return transferService
}

/**
 * Update transfer state
 *
 * Internal helper for tracking transfer progress across IPC calls.
 */
function updateTransferState(updates: Partial<TransferState>) {
  transferState = { ...transferState, ...updates }
}

/**
 * Send progress update to renderer
 *
 * Emits 'cfex:transfer-progress' event with progress data.
 */
function sendProgressUpdate(window: BrowserWindow, progress: TransferProgress) {
  window.webContents.send('cfex:transfer-progress', progress)

  // Update internal state for getTransferState()
  updateTransferState({
    status: 'transferring',
    filesCompleted: progress.fileIndex - 1, // fileIndex is 1-based
    filesTotal: progress.filesTotal,
    bytesTransferred: progress.totalBytesTransferred,
    bytesTotal: progress.totalBytesExpected,
    currentFile: progress.currentFile
  })
}

/**
 * Send file completion update to renderer
 *
 * Emits 'cfex:file-complete' event with file transfer result.
 */
function sendFileComplete(window: BrowserWindow, result: FileTransferResult) {
  window.webContents.send('cfex:file-complete', result)
}

/**
 * Send validation result to renderer
 *
 * Emits 'cfex:validation-result' event with validation data.
 */
function sendValidation(window: BrowserWindow, result: FileValidationResult) {
  window.webContents.send('cfex:validation-result', result)

  // Update state for validation phase
  updateTransferState({
    status: 'validating'
  })
}

/**
 * Register all CFEx transfer IPC handlers
 *
 * Handlers:
 * - cfex:start-transfer - Start transfer with progress callbacks
 * - cfex:get-transfer-state - Get current transfer state
 *
 * @param mainWindow - Electron BrowserWindow for event emission
 */
export function registerCfexTransferHandlers(mainWindow: BrowserWindow) {
  /**
   * Handler: cfex:start-transfer
   *
   * Start complete transfer workflow: scan → transfer → validate
   *
   * REQUEST:
   * {
   *   source: string,
   *   destinations: { photos: string, rawVideos: string },
   *   options?: { skipValidation?: boolean }
   * }
   *
   * RESPONSE:
   * {
   *   success: boolean,
   *   filesTransferred: number,
   *   filesTotal: number,
   *   bytesTransferred: number,
   *   duration: number,
   *   validationWarnings: ValidationWarning[],
   *   errors: TransferError[]
   * }
   *
   * EVENTS:
   * - cfex:transfer-progress - Real-time progress updates
   * - cfex:file-complete - File completion notifications
   * - cfex:validation-result - Validation phase results
   */
  ipcMain.handle('cfex:start-transfer', async (event, config) => {
    try {
      // Validate config schema
      const validated = TransferConfigSchema.parse(config)

      // Reset state for new transfer
      updateTransferState({
        status: 'scanning',
        filesCompleted: 0,
        filesTotal: 0,
        bytesTransferred: 0,
        bytesTotal: 0,
        currentFile: undefined,
        error: undefined
      })

      // Get service instance
      const service = getTransferService()

      // Start transfer with callbacks
      const result = await service.startTransfer({
        source: validated.source,
        destinations: validated.destinations,
        onProgress: (progress) => {
          sendProgressUpdate(mainWindow, progress)
        },
        onFileComplete: (fileResult) => {
          sendFileComplete(mainWindow, fileResult)
        },
        onValidation: (validation) => {
          sendValidation(mainWindow, validation)
        }
      })

      // Update final state
      updateTransferState({
        status: result.success ? 'complete' : 'error',
        filesCompleted: result.filesTransferred,
        filesTotal: result.filesTotal,
        bytesTransferred: result.bytesTransferred
      })

      return result

    } catch (error) {
      // Update error state
      updateTransferState({
        status: 'error',
        error: error as Error
      })

      console.error('CFEx transfer failed:', error)
      throw error
    }
  })

  /**
   * Handler: cfex:get-transfer-state
   *
   * Get current transfer state for UI synchronization.
   *
   * RESPONSE:
   * {
   *   status: 'idle' | 'scanning' | 'transferring' | 'validating' | 'complete' | 'error',
   *   filesCompleted: number,
   *   filesTotal: number,
   *   bytesTransferred: number,
   *   bytesTotal: number,
   *   currentFile?: string,
   *   error?: Error
   * }
   */
  ipcMain.handle('cfex:get-transfer-state', async (event) => {
    return transferState
  })

  // Note: Pause/resume/cancel handlers deferred to Week 2 (error handling phase)
}

/**
 * Unregister all CFEx transfer IPC handlers
 *
 * Cleanup on app quit or handler re-registration.
 */
export function unregisterCfexTransferHandlers() {
  ipcMain.removeHandler('cfex:start-transfer')
  ipcMain.removeHandler('cfex:get-transfer-state')
  // ... remove other handlers when implemented
}

/**
 * Reset handler state for testing
 *
 * TEST-ONLY: Resets singleton service instance and transfer state.
 * Allows tests to start with clean state.
 */
export function __resetForTesting() {
  transferService = null
  transferState = {
    status: 'idle',
    filesCompleted: 0,
    filesTotal: 0,
    bytesTransferred: 0,
    bytesTotal: 0
  }
}
