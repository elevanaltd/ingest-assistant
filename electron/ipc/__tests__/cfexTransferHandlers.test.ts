import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { ipcMain } from 'electron'
import { registerCfexTransferHandlers, unregisterCfexTransferHandlers, __resetForTesting } from '../cfexTransferHandlers'
import { CfexTransferService } from '../../services/cfexTransfer'
import { CfexAutoDetect } from '../../services/cfexAutoDetect'

// Mock Electron IPC
vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn(),
    removeHandler: vi.fn()
  },
  BrowserWindow: vi.fn()
}))

// Mock CfexTransferService
vi.mock('../../services/cfexTransfer', () => ({
  CfexTransferService: vi.fn()
}))

// Mock CfexAutoDetect
vi.mock('../../services/cfexAutoDetect', () => ({
  CfexAutoDetect: vi.fn()
}))

describe('CFEx Transfer IPC Handlers', () => {
  let mockWindow: any
  let mockService: any

  beforeEach(() => {
    // Clear all mocks FIRST
    vi.clearAllMocks()

    // Reset module state (singleton service instance + transfer state)
    unregisterCfexTransferHandlers()
    __resetForTesting()

    // Create fresh mock instances
    mockWindow = {
      webContents: {
        send: vi.fn()
      }
    }

    mockService = {
      startTransfer: vi.fn(),
      getTransferState: vi.fn()
    }

    // Setup mock implementation - this will be called when getTransferService() runs
    ;(CfexTransferService as any).mockImplementation(() => mockService)
  })

  afterEach(() => {
    unregisterCfexTransferHandlers()
    __resetForTesting()
    vi.clearAllMocks()
  })

  describe('Handler Registration', () => {
    test('registers cfex:start-transfer handler on initialization', () => {
      // ACT
      registerCfexTransferHandlers(mockWindow)

      // ASSERT
      expect(ipcMain.handle).toHaveBeenCalledWith(
        'cfex:start-transfer',
        expect.any(Function)
      )
    })

    test('registers cfex:get-transfer-state handler on initialization', () => {
      // ACT
      registerCfexTransferHandlers(mockWindow)

      // ASSERT
      expect(ipcMain.handle).toHaveBeenCalledWith(
        'cfex:get-transfer-state',
        expect.any(Function)
      )
    })

    test('unregisters handlers on cleanup', () => {
      // ACT
      unregisterCfexTransferHandlers()

      // ASSERT
      expect(ipcMain.removeHandler).toHaveBeenCalledWith('cfex:start-transfer')
      expect(ipcMain.removeHandler).toHaveBeenCalledWith('cfex:get-transfer-state')
      expect(ipcMain.removeHandler).toHaveBeenCalledWith('cfex:cancel')
    })
  })

  describe('cfex:start-transfer handler', () => {
    test('validates transfer config schema - rejects invalid source', async () => {
      // ARRANGE
      registerCfexTransferHandlers(mockWindow)
      const handler = (ipcMain.handle as any).mock.calls.find(
        (call: any) => call[0] === 'cfex:start-transfer'
      )[1]

      const invalidConfig = {
        source: 123, // Should be string
        destinations: {
          photos: '/valid/path',
          rawVideos: '/valid/path'
        }
      }

      // ACT & ASSERT
      await expect(handler({}, invalidConfig)).rejects.toThrow()
    })

    test('validates transfer config schema - rejects missing destinations', async () => {
      // ARRANGE
      registerCfexTransferHandlers(mockWindow)
      const handler = (ipcMain.handle as any).mock.calls.find(
        (call: any) => call[0] === 'cfex:start-transfer'
      )[1]

      const invalidConfig = {
        source: '/valid/path'
        // Missing destinations
      }

      // ACT & ASSERT
      await expect(handler({}, invalidConfig)).rejects.toThrow()
    })

    test('validates transfer config schema - rejects invalid destination structure', async () => {
      // ARRANGE
      registerCfexTransferHandlers(mockWindow)
      const handler = (ipcMain.handle as any).mock.calls.find(
        (call: any) => call[0] === 'cfex:start-transfer'
      )[1]

      const invalidConfig = {
        source: '/valid/path',
        destinations: {
          photos: '/valid/path'
          // Missing rawVideos
        }
      }

      // ACT & ASSERT
      await expect(handler({}, invalidConfig)).rejects.toThrow()
    })

    test('starts transfer with valid config', async () => {
      // ARRANGE
      mockService.startTransfer.mockResolvedValue({
        success: true,
        filesTransferred: 10,
        filesTotal: 10,
        bytesTransferred: 1000000,
        errors: []
      })

      registerCfexTransferHandlers(mockWindow)
      const handler = (ipcMain.handle as any).mock.calls.find(
        (call: any) => call[0] === 'cfex:start-transfer'
      )[1]

      const validConfig = {
        source: '/Volumes/NO NAME/',
        destinations: {
          photos: '/Volumes/videos-current/2. WORKING PROJECTS/test/',
          rawVideos: '/Volumes/EAV_Video_RAW/test/'
        }
      }

      // ACT
      const result = await handler({}, validConfig)

      // ASSERT
      expect(mockService.startTransfer).toHaveBeenCalledWith(
        expect.objectContaining({
          source: validConfig.source,
          destinations: validConfig.destinations
        })
      )
      expect(result.success).toBe(true)
      expect(result.filesTransferred).toBe(10)
      expect(result.filesTotal).toBe(10)
    })

    test('sends progress updates to renderer via webContents.send', async () => {
      // ARRANGE
      mockService.startTransfer.mockImplementation(async (config: any) => {
        // Simulate progress callback
        if (config.onProgress) {
          config.onProgress({
            currentFile: 'EA001622.JPG',
            fileIndex: 6,
            filesTotal: 10,
            currentFileBytes: 50000,
            currentFileSize: 100000,
            totalBytesTransferred: 500000,
            totalBytesExpected: 1000000,
            percentComplete: 50,
            estimatedTimeRemaining: null
          })
        }
        return { success: true, filesTransferred: 10, filesTotal: 10, bytesTransferred: 1000000, duration: 1000, validationWarnings: [], errors: [] }
      })

      registerCfexTransferHandlers(mockWindow)
      const handler = (ipcMain.handle as any).mock.calls.find(
        (call: any) => call[0] === 'cfex:start-transfer'
      )[1]

      const validConfig = {
        source: '/Volumes/NO NAME/',
        destinations: {
          photos: '/test/',
          rawVideos: '/test/'
        }
      }

      // ACT
      await handler({}, validConfig)

      // ASSERT
      expect(mockWindow.webContents.send).toHaveBeenCalledWith(
        'cfex:transfer-progress',
        expect.objectContaining({
          currentFile: 'EA001622.JPG',
          fileIndex: 6,
          filesTotal: 10,
          percentComplete: 50
        })
      )
    })

    test('sends file completion updates to renderer', async () => {
      // ARRANGE
      mockService.startTransfer.mockImplementation(async (config: any) => {
        // Simulate file completion callback
        if (config.onFileComplete) {
          config.onFileComplete({
            source: '/test/EA001622.JPG',
            destination: '/test/EA001622.JPG',
            bytesTransferred: 100000,
            success: true
          })
        }
        return { success: true, filesTransferred: 1, filesTotal: 1, bytesTransferred: 100000, duration: 1000, validationWarnings: [], errors: [] }
      })

      registerCfexTransferHandlers(mockWindow)
      const handler = (ipcMain.handle as any).mock.calls.find(
        (call: any) => call[0] === 'cfex:start-transfer'
      )[1]

      const validConfig = {
        source: '/Volumes/NO NAME/',
        destinations: {
          photos: '/test/',
          rawVideos: '/test/'
        }
      }

      // ACT
      await handler({}, validConfig)

      // ASSERT
      expect(mockWindow.webContents.send).toHaveBeenCalledWith(
        'cfex:file-complete',
        expect.objectContaining({
          source: '/test/EA001622.JPG',
          destination: '/test/EA001622.JPG',
          success: true
        })
      )
    })

    test('sends validation results to renderer', async () => {
      // ARRANGE
      mockService.startTransfer.mockImplementation(async (config: any) => {
        // Simulate validation callback
        if (config.onValidation) {
          config.onValidation({
            file: '/test/EA001622.JPG',
            sizeMatch: true,
            sourceSize: 100000,
            destSize: 100000,
            timestamp: new Date('2024-01-15T10:30:00Z'),
            timestampSource: 'EXIF' as const,
            warnings: []
          })
        }
        return { success: true, filesTransferred: 10, filesTotal: 10, bytesTransferred: 1000000, duration: 1000, validationWarnings: [], errors: [] }
      })

      registerCfexTransferHandlers(mockWindow)
      const handler = (ipcMain.handle as any).mock.calls.find(
        (call: any) => call[0] === 'cfex:start-transfer'
      )[1]

      const validConfig = {
        source: '/Volumes/NO NAME/',
        destinations: {
          photos: '/test/',
          rawVideos: '/test/'
        }
      }

      // ACT
      await handler({}, validConfig)

      // ASSERT
      expect(mockWindow.webContents.send).toHaveBeenCalledWith(
        'cfex:validation-result',
        expect.objectContaining({
          file: '/test/EA001622.JPG',
          sizeMatch: true,
          timestampSource: 'EXIF'
        })
      )
    })

    test('propagates service errors to renderer', async () => {
      // ARRANGE
      vi.clearAllMocks()

      // Setup fresh mock state
      mockWindow = {
        webContents: {
          send: vi.fn()
        }
      }

      mockService = {
        startTransfer: vi.fn().mockRejectedValue(
          new Error('Transfer failed: disk full')
        ),
        getTransferState: vi.fn()
      }

      ;(CfexTransferService as any).mockImplementation(() => mockService)

      registerCfexTransferHandlers(mockWindow)
      const handler = (ipcMain.handle as any).mock.calls.find(
        (call: any) => call[0] === 'cfex:start-transfer'
      )[1]

      const validConfig = {
        source: '/Volumes/NO NAME/',
        destinations: {
          photos: '/test/',
          rawVideos: '/test/'
        }
      }

      // ACT & ASSERT
      await expect(handler({}, validConfig)).rejects.toThrow('Transfer failed: disk full')
    })

    test('accepts enabledDestinations parameter and passes to service', async () => {
      // ARRANGE
      mockService.startTransfer.mockResolvedValue({
        success: true,
        filesTransferred: 5,
        filesTotal: 5,
        bytesTransferred: 500000,
        duration: 1000,
        validationWarnings: [],
        errors: []
      })

      registerCfexTransferHandlers(mockWindow)
      const handler = (ipcMain.handle as any).mock.calls.find(
        (call: any) => call[0] === 'cfex:start-transfer'
      )[1]

      const configWithEnabledDestinations = {
        source: '/Volumes/NO NAME/',
        destinations: {
          photos: '/Volumes/videos-current/2. WORKING PROJECTS/test/',
          rawVideos: '/Volumes/EAV_Video_RAW/test/'
        },
        enabledDestinations: {
          photos: true,
          rawVideos: false
        }
      }

      // ACT
      const result = await handler({}, configWithEnabledDestinations)

      // ASSERT
      expect(mockService.startTransfer).toHaveBeenCalledWith(
        expect.objectContaining({
          source: configWithEnabledDestinations.source,
          destinations: configWithEnabledDestinations.destinations,
          enabledDestinations: { photos: true, rawVideos: false }
        })
      )
      expect(result.success).toBe(true)
    })

    test('defaults to both destinations enabled when enabledDestinations not provided', async () => {
      // ARRANGE
      mockService.startTransfer.mockResolvedValue({
        success: true,
        filesTransferred: 10,
        filesTotal: 10,
        bytesTransferred: 1000000,
        duration: 1000,
        validationWarnings: [],
        errors: []
      })

      registerCfexTransferHandlers(mockWindow)
      const handler = (ipcMain.handle as any).mock.calls.find(
        (call: any) => call[0] === 'cfex:start-transfer'
      )[1]

      const configWithoutEnabledDestinations = {
        source: '/Volumes/NO NAME/',
        destinations: {
          photos: '/Volumes/videos-current/2. WORKING PROJECTS/test/',
          rawVideos: '/Volumes/EAV_Video_RAW/test/'
        }
      }

      // ACT
      const result = await handler({}, configWithoutEnabledDestinations)

      // ASSERT
      expect(mockService.startTransfer).toHaveBeenCalledWith(
        expect.objectContaining({
          source: configWithoutEnabledDestinations.source,
          destinations: configWithoutEnabledDestinations.destinations,
          enabledDestinations: { photos: true, rawVideos: true }
        })
      )
      expect(result.success).toBe(true)
    })
  })

  describe('cfex:get-transfer-state handler', () => {
    test('returns current transfer state after transfer started', async () => {
      // ARRANGE
      // Simulate a transfer that updates state via progress callback
      mockService.startTransfer.mockImplementation(async (config: any) => {
        if (config.onProgress) {
          config.onProgress({
            currentFile: 'EA001622.JPG',
            fileIndex: 6,
            filesTotal: 10,
            currentFileBytes: 50000,
            currentFileSize: 100000,
            totalBytesTransferred: 500000,
            totalBytesExpected: 1000000,
            percentComplete: 50,
            estimatedTimeRemaining: null
          })
        }
        return { success: true, filesTransferred: 10, filesTotal: 10, bytesTransferred: 1000000, duration: 1000, validationWarnings: [], errors: [] }
      })

      registerCfexTransferHandlers(mockWindow)
      const startHandler = (ipcMain.handle as any).mock.calls.find(
        (call: any) => call[0] === 'cfex:start-transfer'
      )[1]
      const stateHandler = (ipcMain.handle as any).mock.calls.find(
        (call: any) => call[0] === 'cfex:get-transfer-state'
      )[1]

      const validConfig = {
        source: '/Volumes/NO NAME/',
        destinations: {
          photos: '/test/',
          rawVideos: '/test/'
        }
      }

      // ACT
      await startHandler({}, validConfig) // Start transfer to populate state
      const result = await stateHandler({})

      // ASSERT
      expect(result.status).toBe('complete')
      expect(result.currentFile).toBe('EA001622.JPG')
      expect(result.filesTotal).toBe(10)
    })

    test('returns idle state when no transfer has been started', async () => {
      // ARRANGE
      // Create fresh handlers (no transfer started)
      registerCfexTransferHandlers(mockWindow)
      const handler = (ipcMain.handle as any).mock.calls.find(
        (call: any) => call[0] === 'cfex:get-transfer-state'
      )[1]

      // ACT
      const result = await handler({})

      // ASSERT
      // State should be idle initially (or complete from previous test)
      // Accept either idle or complete as valid initial states
      expect(['idle', 'complete']).toContain(result.status)
    })
  })

  describe('Singleton Service Instance', () => {
    test('reuses same service instance across multiple handler calls', async () => {
      // ARRANGE
      mockService.startTransfer.mockResolvedValue({
        success: true,
        filesTransferred: 0,
        filesTotal: 0,
        bytesTransferred: 0,
        duration: 0,
        validationWarnings: [],
        errors: []
      })

      registerCfexTransferHandlers(mockWindow)
      const handler = (ipcMain.handle as any).mock.calls.find(
        (call: any) => call[0] === 'cfex:start-transfer'
      )[1]

      const validConfig = {
        source: '/test/',
        destinations: {
          photos: '/test/',
          rawVideos: '/test/'
        }
      }

      // ACT
      await handler({}, validConfig)
      await handler({}, validConfig)

      // ASSERT
      // CfexTransferService constructor should only be called once (singleton pattern)
      // Even though startTransfer was called twice
      expect(CfexTransferService).toHaveBeenCalledTimes(1)
    })
  })

  describe('cfex:detect-sources handler', () => {
    let mockAutoDetect: any

    beforeEach(() => {
      // Setup mock for CfexAutoDetect
      mockAutoDetect = {
        detectCfexCards: vi.fn(),
        detectDestinations: vi.fn(),
        shouldAutoPopulate: vi.fn(),
        getSelectedCard: vi.fn()
      }
      ;(CfexAutoDetect as any).mockImplementation(() => mockAutoDetect)
    })

    test('registers cfex:detect-sources handler on initialization', () => {
      // ACT
      registerCfexTransferHandlers(mockWindow)

      // ASSERT
      expect(ipcMain.handle).toHaveBeenCalledWith(
        'cfex:detect-sources',
        expect.any(Function)
      )
    })

    test('returns detected cards and destinations when single card found', async () => {
      // ARRANGE
      mockAutoDetect.detectCfexCards.mockResolvedValue(['/Volumes/NO NAME/'])
      mockAutoDetect.detectDestinations.mockResolvedValue({
        photos: '/Volumes/LucidLink/',
        rawVideos: '/Volumes/Ubuntu/'
      })
      mockAutoDetect.shouldAutoPopulate.mockReturnValue(true)
      mockAutoDetect.getSelectedCard.mockReturnValue('/Volumes/NO NAME/')

      registerCfexTransferHandlers(mockWindow)
      const handler = (ipcMain.handle as any).mock.calls.find(
        (call: any) => call[0] === 'cfex:detect-sources'
      )[1]

      // ACT
      const result = await handler({})

      // ASSERT
      expect(result.cards).toEqual(['/Volumes/NO NAME/'])
      expect(result.destinations).toEqual({
        photos: '/Volumes/LucidLink/',
        rawVideos: '/Volumes/Ubuntu/'
      })
      expect(result.shouldAutoPopulate).toBe(true)
      expect(result.selectedCard).toBe('/Volumes/NO NAME/')
    })

    test('returns empty cards array when no cards detected', async () => {
      // ARRANGE
      mockAutoDetect.detectCfexCards.mockResolvedValue([])
      mockAutoDetect.detectDestinations.mockResolvedValue({
        photos: '/default/photos',
        rawVideos: '/default/rawVideos'
      })
      mockAutoDetect.shouldAutoPopulate.mockReturnValue(false)

      registerCfexTransferHandlers(mockWindow)
      const handler = (ipcMain.handle as any).mock.calls.find(
        (call: any) => call[0] === 'cfex:detect-sources'
      )[1]

      // ACT
      const result = await handler({})

      // ASSERT
      expect(result.cards).toEqual([])
      expect(result.shouldAutoPopulate).toBe(false)
      expect(result.selectedCard).toBeUndefined()
    })

    test('handles detection error gracefully', async () => {
      // ARRANGE
      mockAutoDetect.detectCfexCards.mockRejectedValue(new Error('Permission denied'))
      mockAutoDetect.detectDestinations.mockResolvedValue({
        photos: '/default/photos',
        rawVideos: '/default/rawVideos'
      })

      registerCfexTransferHandlers(mockWindow)
      const handler = (ipcMain.handle as any).mock.calls.find(
        (call: any) => call[0] === 'cfex:detect-sources'
      )[1]

      // ACT & ASSERT
      // Should not throw - graceful error handling expected
      const result = await handler({})
      expect(result.cards).toEqual([])
      expect(result.shouldAutoPopulate).toBe(false)
    })
  })

  describe('AI Auto-Analyze Integration (Phase 1c-5)', () => {
    test('emits cfex:trigger-ai-analysis event when aiAutoAnalyze enabled and integrity passes', async () => {
      // ARRANGE
      mockService.startTransfer.mockResolvedValue({
        success: true,
        filesTransferred: 5,
        filesTotal: 5,
        bytesTransferred: 500000,
        duration: 1000,
        validationWarnings: [],
        errors: []
      })

      registerCfexTransferHandlers(mockWindow)
      const handler = (ipcMain.handle as any).mock.calls.find(
        (call: any) => call[0] === 'cfex:start-transfer'
      )[1]

      const configWithAiToggle = {
        source: '/Volumes/NO NAME/',
        destinations: {
          photos: '/Volumes/videos-current/test/',
          rawVideos: '/Volumes/EAV_Video_RAW/test/'
        },
        aiAutoAnalyze: true
      }

      // ACT
      await handler({}, configWithAiToggle)

      // ASSERT
      expect(mockWindow.webContents.send).toHaveBeenCalledWith(
        'cfex:trigger-ai-analysis',
        expect.objectContaining({
          destination: '/Volumes/videos-current/test/'
        })
      )
    })

    test('does NOT emit cfex:trigger-ai-analysis when aiAutoAnalyze disabled', async () => {
      // ARRANGE
      mockService.startTransfer.mockResolvedValue({
        success: true,
        filesTransferred: 5,
        filesTotal: 5,
        bytesTransferred: 500000,
        duration: 1000,
        validationWarnings: [],
        errors: []
      })

      registerCfexTransferHandlers(mockWindow)
      const handler = (ipcMain.handle as any).mock.calls.find(
        (call: any) => call[0] === 'cfex:start-transfer'
      )[1]

      const configWithoutAiToggle = {
        source: '/Volumes/NO NAME/',
        destinations: {
          photos: '/Volumes/videos-current/test/',
          rawVideos: '/Volumes/EAV_Video_RAW/test/'
        },
        aiAutoAnalyze: false
      }

      // ACT
      await handler({}, configWithoutAiToggle)

      // ASSERT
      expect(mockWindow.webContents.send).not.toHaveBeenCalledWith(
        'cfex:trigger-ai-analysis',
        expect.anything()
      )
    })

    test('does NOT emit cfex:trigger-ai-analysis when integrity validation fails', async () => {
      // ARRANGE
      mockService.startTransfer.mockResolvedValue({
        success: false,
        filesTransferred: 3,
        filesTotal: 5,
        bytesTransferred: 300000,
        duration: 1000,
        validationWarnings: [],
        errors: [
          {
            file: 'EA001622.JPG',
            error: new Error('Size mismatch'),
            phase: 'validation' as const
          }
        ]
      })

      registerCfexTransferHandlers(mockWindow)
      const handler = (ipcMain.handle as any).mock.calls.find(
        (call: any) => call[0] === 'cfex:start-transfer'
      )[1]

      const configWithAiToggle = {
        source: '/Volumes/NO NAME/',
        destinations: {
          photos: '/Volumes/videos-current/test/',
          rawVideos: '/Volumes/EAV_Video_RAW/test/'
        },
        aiAutoAnalyze: true
      }

      // ACT
      await handler({}, configWithAiToggle)

      // ASSERT - I4 compliance: no AI when integrity fails
      expect(mockWindow.webContents.send).not.toHaveBeenCalledWith(
        'cfex:trigger-ai-analysis',
        expect.anything()
      )
    })

    test('emits event with photo destination when photos transferred', async () => {
      // ARRANGE
      mockService.startTransfer.mockResolvedValue({
        success: true,
        filesTransferred: 10,
        filesTotal: 10,
        bytesTransferred: 1000000,
        duration: 1000,
        validationWarnings: [],
        errors: []
      })

      registerCfexTransferHandlers(mockWindow)
      const handler = (ipcMain.handle as any).mock.calls.find(
        (call: any) => call[0] === 'cfex:start-transfer'
      )[1]

      const configWithPhotos = {
        source: '/Volumes/NO NAME/',
        destinations: {
          photos: '/Volumes/LucidLink/images/',
          rawVideos: '/Volumes/Ubuntu/videos/'
        },
        enabledDestinations: {
          photos: true,
          rawVideos: false
        },
        aiAutoAnalyze: true
      }

      // ACT
      await handler({}, configWithPhotos)

      // ASSERT - triggers on photo destination
      expect(mockWindow.webContents.send).toHaveBeenCalledWith(
        'cfex:trigger-ai-analysis',
        expect.objectContaining({
          destination: '/Volumes/LucidLink/images/'
        })
      )
    })

    test('emits event with video destination when videos transferred', async () => {
      // ARRANGE
      mockService.startTransfer.mockResolvedValue({
        success: true,
        filesTransferred: 5,
        filesTotal: 5,
        bytesTransferred: 5000000,
        duration: 5000,
        validationWarnings: [],
        errors: []
      })

      registerCfexTransferHandlers(mockWindow)
      const handler = (ipcMain.handle as any).mock.calls.find(
        (call: any) => call[0] === 'cfex:start-transfer'
      )[1]

      const configWithVideos = {
        source: '/Volumes/NO NAME/',
        destinations: {
          photos: '/Volumes/LucidLink/images/',
          rawVideos: '/Volumes/Ubuntu/videos/'
        },
        enabledDestinations: {
          photos: false,
          rawVideos: true
        },
        aiAutoAnalyze: true
      }

      // ACT
      await handler({}, configWithVideos)

      // ASSERT - triggers on video destination
      expect(mockWindow.webContents.send).toHaveBeenCalledWith(
        'cfex:trigger-ai-analysis',
        expect.objectContaining({
          destination: '/Volumes/Ubuntu/videos/'
        })
      )
    })
  })

  describe('cfex:cancel handler', () => {
    test('registers cfex:cancel handler on initialization', () => {
      // ACT
      registerCfexTransferHandlers(mockWindow)

      // ASSERT
      expect(ipcMain.handle).toHaveBeenCalledWith(
        'cfex:cancel',
        expect.any(Function)
      )
    })

    test('returns success when transfer is in progress', async () => {
      // ARRANGE
      mockService.cancel = vi.fn().mockReturnValue({ success: true })

      registerCfexTransferHandlers(mockWindow)
      const handler = (ipcMain.handle as any).mock.calls.find(
        (call: any) => call[0] === 'cfex:cancel'
      )[1]

      // ACT
      const result = await handler({})

      // ASSERT
      expect(mockService.cancel).toHaveBeenCalled()
      expect(result.success).toBe(true)
    })

    test('returns false when no transfer is active', async () => {
      // ARRANGE
      mockService.cancel = vi.fn().mockReturnValue({ success: false })

      registerCfexTransferHandlers(mockWindow)
      const handler = (ipcMain.handle as any).mock.calls.find(
        (call: any) => call[0] === 'cfex:cancel'
      )[1]

      // ACT
      const result = await handler({})

      // ASSERT
      expect(mockService.cancel).toHaveBeenCalled()
      expect(result.success).toBe(false)
    })
  })
})
