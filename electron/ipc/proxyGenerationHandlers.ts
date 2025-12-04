/**
 * Proxy Generation IPC Handlers
 *
 * Exposes ProxyOrchestrator to renderer process via IPC bridge.
 *
 * Design Philosophy (MIP Compliance):
 * - ESSENTIAL: IPC handlers expose proxy generation service to UI
 * - ESSENTIAL: Zod validation for request schema (security + type safety)
 * - ESSENTIAL: Event emission for real-time progress updates
 *
 * Architecture Pattern:
 * - Singleton orchestrator instance (shared across all IPC calls)
 * - Progress callbacks forwarded to renderer via webContents.send()
 * - Follows existing v2.2.0 IPC pattern (inline handlers in main.ts)
 *
 * System Ripples:
 * - Enables BatchOperationsPanel UI to invoke proxy generation
 * - Event emission enables real-time progress UI updates
 * - Zod validation prevents malformed requests from reaching service layer
 *
 * Phase: B2.6 (Phase 1b Proxy Generation)
 */

import { ipcMain, BrowserWindow } from 'electron'
import { z } from 'zod'
import {
  ProxyOrchestrator,
  ProxyProgressEvent
} from '../services/proxyOrchestrator'
import * as path from 'path'

/**
 * Validation schema for proxy generation request
 *
 * Enforces:
 * - rawVideoFolder: string (folder containing raw videos)
 * - proxyOutputFolder: string (destination for proxies)
 * - videoFilenames: string[] (list of video filenames to process)
 */
const GenerateProxiesRequestSchema = z.object({
  rawVideoFolder: z.string().min(1, 'Raw video folder required'),
  proxyOutputFolder: z.string().min(1, 'Proxy output folder required'),
  videoFilenames: z.array(z.string()),
  proxyPresetId: z.string().optional() // Optional preset ID (backward compatible)
})

// Singleton orchestrator instance
let orchestrator: ProxyOrchestrator | null = null

/**
 * Get or create orchestrator instance
 *
 * Singleton pattern ensures shared state across IPC calls.
 */
function getOrchestrator(): ProxyOrchestrator {
  if (!orchestrator) {
    orchestrator = new ProxyOrchestrator()
  }
  return orchestrator
}

/**
 * Send progress update to renderer
 *
 * Emits 'proxy:progress' event with progress data.
 */
function sendProgressUpdate(window: BrowserWindow, progress: ProxyProgressEvent) {
  window.webContents.send('proxy:progress', progress)
}

/**
 * Register all proxy generation IPC handlers
 *
 * Handlers:
 * - proxy:generate - Generate 2K ProRes proxies with progress callbacks
 *
 * @param mainWindow - Electron BrowserWindow for event emission
 */
export function registerProxyGenerationHandlers(mainWindow: BrowserWindow) {
  /**
   * Handler: proxy:generate
   *
   * Generate 2K ProRes proxies from raw videos
   *
   * REQUEST:
   * {
   *   rawVideoFolder: string,
   *   proxyOutputFolder: string,
   *   videoFilenames: string[]
   * }
   *
   * RESPONSE:
   * {
   *   success: boolean,
   *   completedCount: number,
   *   failedCount: number,
   *   failedFiles: Array<{ filename: string; error: string }>,
   *   verificationFailures: ExifVerificationResult[]
   * }
   *
   * EVENTS:
   * - proxy:progress - Real-time progress updates
   */
  ipcMain.removeHandler('proxy:generate');
  ipcMain.handle('proxy:generate', async (event, request) => {
    try {
      // Validate request schema
      const validated = GenerateProxiesRequestSchema.parse(request)

      // Build full paths from folder + filenames
      const rawVideoPaths = validated.videoFilenames.map(filename =>
        path.join(validated.rawVideoFolder, filename)
      )

      // Get orchestrator instance
      const orch = getOrchestrator()

      // Start proxy generation with progress callbacks
      const result = await orch.executeJob(
        {
          rawVideoPaths,
          proxyOutputDir: validated.proxyOutputFolder,
          presetId: validated.proxyPresetId // Pass through user-selected preset (or undefined)
        },
        (progressEvent) => {
          sendProgressUpdate(mainWindow, progressEvent)
        }
      )

      return result
    } catch (error) {
      console.error('Proxy generation failed:', error)
      throw error
    }
  })
}

/**
 * Unregister all proxy generation IPC handlers
 *
 * Cleanup on app quit or handler re-registration.
 */
export function unregisterProxyGenerationHandlers() {
  ipcMain.removeHandler('proxy:generate')
}

/**
 * Reset handler state for testing
 *
 * TEST-ONLY: Resets singleton orchestrator instance.
 * Allows tests to start with clean state.
 */
export function __resetForTesting() {
  orchestrator = null
}
