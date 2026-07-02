import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { ipcMain } from 'electron'
import {
  registerProxyGenerationHandlers,
  unregisterProxyGenerationHandlers,
  __resetForTesting
} from '../proxyGenerationHandlers'

// Mock constructor - use vi.hoisted to ensure mock is available during hoisting
const { MockProxyOrchestrator } = vi.hoisted(() => ({
  MockProxyOrchestrator: vi.fn(),
}));

// Mock Electron IPC
vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn(),
    removeHandler: vi.fn()
  },
  BrowserWindow: vi.fn()
}))

vi.mock('../../services/proxyOrchestrator', () => ({
  ProxyOrchestrator: MockProxyOrchestrator
}))

const mockCopyFile = vi.fn()
vi.mock('fs/promises', () => ({
  copyFile: (...args: unknown[]) => mockCopyFile(...args),
  default: { copyFile: (...args: unknown[]) => mockCopyFile(...args) }
}))

describe('Proxy Generation IPC Handlers', () => {
  let mockWindow: any
  let mockOrchestrator: any

  beforeEach(() => {
    // Clear all mocks FIRST
    vi.clearAllMocks()

    // Reset module state (singleton orchestrator instance)
    unregisterProxyGenerationHandlers()
    __resetForTesting()

    // Create fresh mock instances
    mockWindow = {
      webContents: {
        send: vi.fn()
      }
    }

    mockOrchestrator = {
      executeJob: vi.fn()
    };

    mockCopyFile.mockReset().mockResolvedValue(undefined)

    // Reset and configure mock constructor to return instance when called with 'new'
    MockProxyOrchestrator.mockReset().mockImplementation(function(this: any) {
      return mockOrchestrator;
    });
  })

  afterEach(() => {
    unregisterProxyGenerationHandlers()
    __resetForTesting()
    vi.clearAllMocks()
  })

  describe('Handler Registration', () => {
    test('registers proxy:generate handler on initialization', () => {
      // ACT
      registerProxyGenerationHandlers(mockWindow)

      // ASSERT
      expect(ipcMain.handle).toHaveBeenCalledWith(
        'proxy:generate',
        expect.any(Function)
      )
    })

    test('unregisters handlers on cleanup', () => {
      // ACT
      unregisterProxyGenerationHandlers()

      // ASSERT
      expect(ipcMain.removeHandler).toHaveBeenCalledWith('proxy:generate')
    })
  })

  describe('proxy:generate handler', () => {
    test('validates request schema - rejects empty rawVideoFolder', async () => {
      // ARRANGE
      registerProxyGenerationHandlers(mockWindow)
      const handler = (ipcMain.handle as any).mock.calls.find(
        (call: any) => call[0] === 'proxy:generate'
      )[1]

      const invalidRequest = {
        rawVideoFolder: '', // Empty string
        proxyOutputFolder: '/valid/output',
        videoFilenames: ['video1.MOV']
      }

      // ACT & ASSERT
      await expect(handler({}, invalidRequest)).rejects.toThrow()
    })

    test('validates request schema - rejects empty proxyOutputFolder', async () => {
      // ARRANGE
      registerProxyGenerationHandlers(mockWindow)
      const handler = (ipcMain.handle as any).mock.calls.find(
        (call: any) => call[0] === 'proxy:generate'
      )[1]

      const invalidRequest = {
        rawVideoFolder: '/valid/raw',
        proxyOutputFolder: '', // Empty string
        videoFilenames: ['video1.MOV']
      }

      // ACT & ASSERT
      await expect(handler({}, invalidRequest)).rejects.toThrow()
    })

    test('validates request schema - rejects invalid videoFilenames type', async () => {
      // ARRANGE
      registerProxyGenerationHandlers(mockWindow)
      const handler = (ipcMain.handle as any).mock.calls.find(
        (call: any) => call[0] === 'proxy:generate'
      )[1]

      const invalidRequest = {
        rawVideoFolder: '/valid/raw',
        proxyOutputFolder: '/valid/output',
        videoFilenames: 'not-an-array' // Should be array
      }

      // ACT & ASSERT
      await expect(handler({}, invalidRequest)).rejects.toThrow()
    })

    test('generates proxies with valid request', async () => {
      // ARRANGE
      const expectedResult = {
        success: true,
        completedCount: 2,
        failedCount: 0,
        failedFiles: [],
        verificationFailures: []
      }

      mockOrchestrator.executeJob.mockResolvedValue(expectedResult)

      registerProxyGenerationHandlers(mockWindow)
      const handler = (ipcMain.handle as any).mock.calls.find(
        (call: any) => call[0] === 'proxy:generate'
      )[1]

      const validRequest = {
        rawVideoFolder: '/valid/raw',
        proxyOutputFolder: '/valid/output',
        videoFilenames: ['video1.MOV', 'video2.MOV']
      }

      // ACT
      const result = await handler({}, validRequest)

      // ASSERT
      expect(result).toEqual(expectedResult)
      expect(mockOrchestrator.executeJob).toHaveBeenCalledWith(
        {
          rawVideoPaths: ['/valid/raw/video1.MOV', '/valid/raw/video2.MOV'],
          proxyOutputDir: '/valid/output'
        },
        expect.any(Function)
      )
    })

    test('emits progress events via webContents.send', async () => {
      // ARRANGE
      mockOrchestrator.executeJob.mockImplementation(async (config: any, progressCallback: any) => {
        // Simulate progress events
        progressCallback({ type: 'phase_start', phase: 'transcode' })
        progressCallback({
          type: 'file_start',
          filename: 'video1.MOV',
          index: 0,
          total: 2
        })
        progressCallback({
          type: 'transcode_progress',
          filename: 'video1.MOV',
          timeString: '00:00:05.23',
          percentage: 25
        })
        progressCallback({
          type: 'file_complete',
          filename: 'video1.MOV',
          success: true
        })

        return {
          success: true,
          completedCount: 2,
          failedCount: 0,
          failedFiles: [],
          verificationFailures: []
        }
      })

      registerProxyGenerationHandlers(mockWindow)
      const handler = (ipcMain.handle as any).mock.calls.find(
        (call: any) => call[0] === 'proxy:generate'
      )[1]

      const validRequest = {
        rawVideoFolder: '/valid/raw',
        proxyOutputFolder: '/valid/output',
        videoFilenames: ['video1.MOV', 'video2.MOV']
      }

      // ACT
      await handler({}, validRequest)

      // ASSERT
      expect(mockWindow.webContents.send).toHaveBeenCalledWith('proxy:progress', {
        type: 'phase_start',
        phase: 'transcode'
      })
      expect(mockWindow.webContents.send).toHaveBeenCalledWith('proxy:progress', {
        type: 'file_start',
        filename: 'video1.MOV',
        index: 0,
        total: 2
      })
      expect(mockWindow.webContents.send).toHaveBeenCalledWith('proxy:progress', {
        type: 'transcode_progress',
        filename: 'video1.MOV',
        timeString: '00:00:05.23',
        percentage: 25
      })
      expect(mockWindow.webContents.send).toHaveBeenCalledWith('proxy:progress', {
        type: 'file_complete',
        filename: 'video1.MOV',
        success: true
      })
    })

    test('returns partial success result when some files fail', async () => {
      // ARRANGE
      const partialSuccessResult = {
        success: false,
        completedCount: 1,
        failedCount: 1,
        failedFiles: [{ filename: 'video2.MOV', error: 'Transcode failed' }],
        verificationFailures: []
      }

      mockOrchestrator.executeJob.mockResolvedValue(partialSuccessResult)

      registerProxyGenerationHandlers(mockWindow)
      const handler = (ipcMain.handle as any).mock.calls.find(
        (call: any) => call[0] === 'proxy:generate'
      )[1]

      const validRequest = {
        rawVideoFolder: '/valid/raw',
        proxyOutputFolder: '/valid/output',
        videoFilenames: ['video1.MOV', 'video2.MOV']
      }

      // ACT
      const result = await handler({}, validRequest)

      // ASSERT
      expect(result).toEqual(partialSuccessResult)
      expect(result.success).toBe(false)
      expect(result.completedCount).toBe(1)
      expect(result.failedCount).toBe(1)
    })
  })

  describe('Metadata Sidecar Copy', () => {
    test('copies .ingest-metadata.json from rawVideoFolder to proxyOutputFolder', async () => {
      // ARRANGE
      mockOrchestrator.executeJob.mockResolvedValue({
        success: true,
        completedCount: 1,
        failedCount: 0,
        failedFiles: [],
        verificationFailures: []
      })

      registerProxyGenerationHandlers(mockWindow)
      const handler = (ipcMain.handle as any).mock.calls.find(
        (call: any) => call[0] === 'proxy:generate'
      )[1]

      const validRequest = {
        rawVideoFolder: '/valid/raw',
        proxyOutputFolder: '/valid/output',
        videoFilenames: ['video1.MOV']
      }

      // ACT
      await handler({}, validRequest)

      // ASSERT
      expect(mockCopyFile).toHaveBeenCalledWith(
        '/valid/raw/.ingest-metadata.json',
        '/valid/output/.ingest-metadata.json'
      )
    })

    test('tolerates missing source metadata file without failing proxy generation', async () => {
      // ARRANGE
      const expectedResult = {
        success: true,
        completedCount: 1,
        failedCount: 0,
        failedFiles: [],
        verificationFailures: []
      }
      mockOrchestrator.executeJob.mockResolvedValue(expectedResult)
      mockCopyFile.mockRejectedValue(Object.assign(new Error('not found'), { code: 'ENOENT' }))
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      registerProxyGenerationHandlers(mockWindow)
      const handler = (ipcMain.handle as any).mock.calls.find(
        (call: any) => call[0] === 'proxy:generate'
      )[1]

      const validRequest = {
        rawVideoFolder: '/valid/raw',
        proxyOutputFolder: '/valid/output',
        videoFilenames: ['video1.MOV']
      }

      // ACT
      const result = await handler({}, validRequest)

      // ASSERT
      expect(result).toEqual(expectedResult)
      expect(mockCopyFile).toHaveBeenCalledWith(
        '/valid/raw/.ingest-metadata.json',
        '/valid/output/.ingest-metadata.json'
      )
      expect(consoleErrorSpy).not.toHaveBeenCalled()

      consoleErrorSpy.mockRestore()
    })

    test('logs and continues when metadata copy fails for a reason other than missing file', async () => {
      // ARRANGE
      const expectedResult = {
        success: true,
        completedCount: 1,
        failedCount: 0,
        failedFiles: [],
        verificationFailures: []
      }
      mockOrchestrator.executeJob.mockResolvedValue(expectedResult)
      const permissionError = Object.assign(new Error('permission denied'), { code: 'EACCES' })
      mockCopyFile.mockRejectedValue(permissionError)
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      registerProxyGenerationHandlers(mockWindow)
      const handler = (ipcMain.handle as any).mock.calls.find(
        (call: any) => call[0] === 'proxy:generate'
      )[1]

      const validRequest = {
        rawVideoFolder: '/valid/raw',
        proxyOutputFolder: '/valid/output',
        videoFilenames: ['video1.MOV']
      }

      // ACT
      const result = await handler({}, validRequest)

      // ASSERT
      expect(result).toEqual(expectedResult)
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to copy .ingest-metadata.json to proxy folder:',
        permissionError
      )

      consoleErrorSpy.mockRestore()
    })

    test('skips the copy when rawVideoFolder and proxyOutputFolder are the same directory', async () => {
      // ARRANGE
      mockOrchestrator.executeJob.mockResolvedValue({
        success: true,
        completedCount: 1,
        failedCount: 0,
        failedFiles: [],
        verificationFailures: []
      })

      registerProxyGenerationHandlers(mockWindow)
      const handler = (ipcMain.handle as any).mock.calls.find(
        (call: any) => call[0] === 'proxy:generate'
      )[1]

      const sameFolderRequest = {
        rawVideoFolder: '/valid/raw',
        proxyOutputFolder: '/valid/raw',
        videoFilenames: ['video1.MOV']
      }

      // ACT
      await handler({}, sameFolderRequest)

      // ASSERT
      expect(mockCopyFile).not.toHaveBeenCalled()
    })
  })

  describe('Proxy Preset Propagation (TDD RED Phase)', () => {
    /**
     * Bug Fix: proxyPresetId not wired through IPC → Orchestrator → Generator
     * User selects preset in UI → stored in context → BUT never reaches ProxyGenerator
     * Result: getPresetById(undefined) defaults to '2k-prores-proxy', ignoring user selection
     *
     * Solution: Thread proxyPresetId through:
     * 1. electron.d.ts proxy.generateProxies request type (add optional proxyPresetId?: string)
     * 2. proxyGenerationHandlers Zod schema (add z.string().optional())
     * 3. ProxyJobConfig interface (add presetId?: string)
     * 4. executeJob call (pass presetId to orchestrator)
     * 5. BatchOperationsPanel component (read from useIngestSettings)
     */

    test('accepts optional proxyPresetId in request', async () => {
      // ARRANGE
      const expectedResult = {
        success: true,
        completedCount: 1,
        failedCount: 0,
        failedFiles: [],
        verificationFailures: []
      }

      mockOrchestrator.executeJob.mockResolvedValue(expectedResult)

      registerProxyGenerationHandlers(mockWindow)
      const handler = (ipcMain.handle as any).mock.calls.find(
        (call: any) => call[0] === 'proxy:generate'
      )[1]

      // Request WITH proxyPresetId (user selected 1080p H.264)
      const requestWithPreset = {
        rawVideoFolder: '/valid/raw',
        proxyOutputFolder: '/valid/output',
        videoFilenames: ['video1.MOV'],
        proxyPresetId: '1080p-h264-crf18' // User selection from Settings
      }

      // ACT
      const result = await handler({}, requestWithPreset)

      // ASSERT
      expect(result).toEqual(expectedResult)
      // Should pass presetId to orchestrator.executeJob
      expect(mockOrchestrator.executeJob).toHaveBeenCalledWith(
        expect.objectContaining({
          presetId: '1080p-h264-crf18' // Should propagate to orchestrator
        }),
        expect.any(Function)
      )
    })

    test('allows proxyPresetId to be undefined (backward compatibility)', async () => {
      // ARRANGE
      const expectedResult = {
        success: true,
        completedCount: 1,
        failedCount: 0,
        failedFiles: [],
        verificationFailures: []
      }

      mockOrchestrator.executeJob.mockResolvedValue(expectedResult)

      registerProxyGenerationHandlers(mockWindow)
      const handler = (ipcMain.handle as any).mock.calls.find(
        (call: any) => call[0] === 'proxy:generate'
      )[1]

      // Request WITHOUT proxyPresetId (legacy code path)
      const requestWithoutPreset = {
        rawVideoFolder: '/valid/raw',
        proxyOutputFolder: '/valid/output',
        videoFilenames: ['video1.MOV']
        // proxyPresetId: undefined (not included)
      }

      // ACT
      const result = await handler({}, requestWithoutPreset)

      // ASSERT
      expect(result).toEqual(expectedResult)
      // Should still work (presetId will be undefined → getPresetById(undefined) → default)
      expect(mockOrchestrator.executeJob).toHaveBeenCalledWith(
        expect.objectContaining({
          rawVideoPaths: ['/valid/raw/video1.MOV'],
          proxyOutputDir: '/valid/output'
          // presetId: undefined (backward compatible)
        }),
        expect.any(Function)
      )
    })
  })
})
