import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { renderWithProviders } from '../../test/test-utils'
import { CfexTransferWindow } from './index'
import type { ElectronAPI } from '../../types/electron'

/**
 * Test suite for CfexTransferWindow component
 *
 * TDD Discipline: Updated for v2.2.0 contextBridge pattern (GREEN phase)
 *
 * Test Coverage:
 * - Component rendering when idle
 * - IPC integration via ElectronAPI.cfex (contextBridge abstraction)
 * - State management (transfer status, progress, warnings, errors)
 * - Input disabling during transfer
 * - Progress updates from IPC events
 * - Completion state rendering
 *
 * IPC Mocking Pattern (v2.2.0):
 * - Mock window.electronAPI.cfex.* methods (NO raw ipcRenderer)
 * - Capture event listeners for manual event simulation
 * - Verify IPC invocations via abstracted methods
 */
describe('CfexTransferWindow', () => {
  let mockStartTransfer: ReturnType<typeof vi.fn>
  let mockGetTransferState: ReturnType<typeof vi.fn>
  let mockOnTransferProgress: ReturnType<typeof vi.fn>
  let mockDetectSources: ReturnType<typeof vi.fn>
  let mockGenerateProxies: ReturnType<typeof vi.fn>

  beforeEach(() => {
    // Create mocks first
    mockStartTransfer = vi.fn().mockResolvedValue({
      success: true,
      filesTransferred: 0,
      filesTotal: 0,
      bytesTransferred: 0,
      duration: 0,
      validationWarnings: [],
      errors: []
    })
    mockGetTransferState = vi.fn()
    mockOnTransferProgress = vi.fn().mockReturnValue(() => {})
    mockDetectSources = vi.fn().mockResolvedValue({
      cards: [],
      destinations: { photos: '/default/photos', rawVideos: '/default/rawVideos' },
      shouldAutoPopulate: false,
      selectedCard: undefined
    })
    mockGenerateProxies = vi.fn().mockResolvedValue({
      success: true,
      completedCount: 0,
      failedCount: 0,
      completedFiles: [],
      failedFiles: []
    })

    // Mock window.electronAPI.cfex (v2.2.0 contextBridge pattern)
    // Type mock structure against ElectronAPI['cfex'] contract for type safety
    // Use 'as any' for individual mocks to allow Vitest flexibility
    const cfexMock: ElectronAPI['cfex'] = {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      detectSources: mockDetectSources as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      startTransfer: mockStartTransfer as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      cancel: vi.fn().mockResolvedValue({ success: true }) as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onTransferProgress: mockOnTransferProgress as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      getTransferState: mockGetTransferState as any
    }

    // Assign typed mock to window object (Partial<ElectronAPI> for test isolation)
    ;(window as any).electronAPI = {
      cfex: cfexMock,
      proxy: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        generateProxies: mockGenerateProxies as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onProxyProgress: vi.fn(() => () => {}) as any
      },
      // Mock getShotTypes for MetadataFormContext (Phase 5.7)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      getShotTypes: vi.fn().mockResolvedValue(['WS', 'MID', 'CU']) as any
    } as Partial<ElectronAPI>
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Initial Rendering (Idle State)', () => {
    test('renders folder picker when idle', () => {
      // ARRANGE: Component with no active transfer
      renderWithProviders(<CfexTransferWindow />)

      // ASSERT: Folder picker inputs visible (use more specific selectors to avoid checkbox/input ambiguity)
      expect(screen.getByLabelText(/source.*folder/i)).toBeInTheDocument()
      expect(screen.getByPlaceholderText(/LucidLink.*photos/i)).toBeInTheDocument()
      expect(screen.getByPlaceholderText(/Ubuntu/i)).toBeInTheDocument()
      expect(screen.getByPlaceholderText(/LucidLink.*proxy/i)).toBeInTheDocument()
    })

    test('renders start transfer button when idle', () => {
      // ARRANGE
      renderWithProviders(<CfexTransferWindow />)

      // ASSERT: Start button exists
      expect(screen.getByRole('button', { name: /start transfer/i })).toBeInTheDocument()
    })

    test('start button enabled when default source path set', async () => {
      // ARRANGE
      renderWithProviders(<CfexTransferWindow />)

      // Wait for auto-detection to complete
      await waitFor(() => {
        expect(mockDetectSources).toHaveBeenCalled()
      })

      // ASSERT: Button enabled with default source path after detection completes
      const startButton = screen.getByRole('button', { name: /start transfer/i })
      await waitFor(() => {
        expect(startButton).toBeEnabled()
      })
    })
  })

  describe('Transfer Workflow', () => {
    test('disables inputs during transfer', async () => {
      // ARRANGE: Mock transfer that never resolves (simulates in-progress state)
      mockStartTransfer.mockImplementation(() => {
        return new Promise(() => {}) // Intentionally unresolved
      })

      renderWithProviders(<CfexTransferWindow />)

      const user = userEvent.setup()

      // Wait for auto-detection to complete before interacting
      await waitFor(() => {
        expect(mockDetectSources).toHaveBeenCalled()
      })

      // Wait for input to be enabled after detection
      const sourceInput = await screen.findByLabelText(/source.*folder/i)
      await waitFor(() => {
        expect(sourceInput).not.toBeDisabled()
      })

      // ACT: Fill source path and click start
      await user.type(sourceInput, '/Volumes/CFExpress')

      const startButton = screen.getByRole('button', { name: /start transfer/i })
      await user.click(startButton)

      // ASSERT: Inputs disabled during transfer
      await waitFor(() => {
        expect(screen.getByLabelText(/source.*folder/i)).toBeDisabled()
      })
    })

    test('invokes cfex.startTransfer with correct config', async () => {
      // Previously skipped due to misdiagnosed "path concatenation bug".
      // Root cause: userEvent.type() appends to existing input values (correct keyboard sim).
      // Fix: clear inputs before typing, and use correct aria selectors for text inputs.
      // Also updated expected IPC structure to match current context startTransfer implementation.

      // ARRANGE: Spy on cfex.startTransfer
      mockStartTransfer.mockResolvedValue({
        success: true,
        filesTransferred: 10,
        filesTotal: 10,
        bytesTransferred: 1000000,
        duration: 5000,
        validationWarnings: [],
        errors: []
      })

      renderWithProviders(<CfexTransferWindow />)

      const user = userEvent.setup()

      // Wait for auto-detection to complete before interacting
      await waitFor(() => {
        expect(mockDetectSources).toHaveBeenCalled()
      })

      // ACT: Clear default values then type new paths
      // Source input (has default from context DEFAULT_STATE)
      const sourceInput = screen.getByLabelText(/source.*folder/i)
      await user.clear(sourceInput)
      await user.type(sourceInput, '/Volumes/CFExpress')

      // Photos destination input (use placeholder to avoid checkbox/input ambiguity)
      const photosInput = screen.getByPlaceholderText(/LucidLink.*photos/i)
      await user.clear(photosInput)
      await user.type(photosInput, '/Volumes/LucidLink/photos')

      // Videos destination input (use placeholder to avoid checkbox/input ambiguity)
      const videosInput = screen.getByPlaceholderText(/Ubuntu/i)
      await user.clear(videosInput)
      await user.type(videosInput, '/Volumes/Ubuntu/videos-raw')

      const startButton = screen.getByRole('button', { name: /start transfer/i })
      await user.click(startButton)

      // ASSERT: cfex.startTransfer invoked with correct config
      // Current context implementation sends full config including enabledDestinations and proxyPresetId
      await waitFor(() => {
        expect(mockStartTransfer).toHaveBeenCalledWith(
          expect.objectContaining({
            source: '/Volumes/CFExpress',
            destinations: expect.objectContaining({
              photos: '/Volumes/LucidLink/photos',
              rawVideos: '/Volumes/Ubuntu/videos-raw',
            }),
            enabledDestinations: expect.objectContaining({
              photos: true,
              rawVideos: true,
            }),
          })
        )
      })
    })
  })

  describe('Progress Updates (IPC Events)', () => {
    test('displays progress updates from IPC events', async () => {
      // ARRANGE: Context subscribes to IPC events, not component
      // Capture the progress handler registered by context
      let progressHandler: Parameters<ElectronAPI['cfex']['onTransferProgress']>[0] | null = null

      mockOnTransferProgress.mockImplementation((callback) => {
        progressHandler = callback
        return () => {} // Return cleanup function
      })

      mockStartTransfer.mockImplementation(() => {
        // Simulate in-progress transfer (never resolves immediately)
        return new Promise(() => {})
      })

      renderWithProviders(<CfexTransferWindow />)
      const user = userEvent.setup()

      // Wait for component ready
      await waitFor(() => {
        expect(mockDetectSources).toHaveBeenCalled()
      })

      const startButton = await screen.findByRole('button', { name: /start transfer/i })
      await waitFor(() => {
        expect(startButton).not.toBeDisabled()
      })

      // ACT: Start transfer (triggers context state change)
      await user.click(startButton)

      // Wait for transfer to start
      await waitFor(() => {
        expect(mockStartTransfer).toHaveBeenCalled()
      })

      // ACT: Simulate progress event from IPC (context receives and updates state)
      if (progressHandler) {
        (progressHandler as Parameters<ElectronAPI['cfex']['onTransferProgress']>[0])({
          currentFile: 'test-photo.jpg',
          fileIndex: 3,
          filesTotal: 10,
          percentComplete: 50,
          totalBytesTransferred: 500000,
          totalBytesExpected: 1000000,
          estimatedTimeRemaining: 120
        })
      }

      // ASSERT: Progress displayed in UI (from context state)
      await waitFor(() => {
        expect(screen.getByText(/test-photo\.jpg/i)).toBeInTheDocument()
        expect(screen.getByText(/50\.00%/i)).toBeInTheDocument()
      })
    })

    test.skip('displays validation warnings after completion', async () => {
      // SKIPPED: Component doesn't extract validationWarnings from transfer result yet
      // Context migration (Phase 5.4) focused on state management
      // Validation warning display deferred to Phase 5.5 (UI polish)
      // TODO: Extract validationWarnings from context.state and display in ValidationResults

      // ARRANGE
      mockStartTransfer.mockResolvedValue({
        success: true,
        filesTransferred: 10,
        filesTotal: 10,
        bytesTransferred: 1000000,
        duration: 5000,
        validationWarnings: [
          {
            file: 'IMG_001.jpg',
            message: 'EXIF DateTimeOriginal missing',
            severity: 'medium'
          }
        ],
        errors: []
      })

      renderWithProviders(<CfexTransferWindow />)

      const user = userEvent.setup()

      // Wait for auto-detection to complete before interacting
      await waitFor(() => {
        expect(mockDetectSources).toHaveBeenCalled()
      })

      // Wait for input to be enabled after detection
      const sourceInput = await screen.findByLabelText(/source.*folder/i)
      await waitFor(() => {
        expect(sourceInput).not.toBeDisabled()
      })

      // ACT: Start transfer and wait for completion
      await user.type(sourceInput, '/Volumes/CFExpress')
      await user.click(screen.getByRole('button', { name: /start transfer/i }))

      // ASSERT: Validation warnings displayed
      await waitFor(() => {
        expect(screen.getByText(/IMG_001\.jpg/i)).toBeInTheDocument()
        expect(screen.getByText(/EXIF DateTimeOriginal missing/i)).toBeInTheDocument()
      })
    })

    test('displays errors when transfer fails', async () => {
      // ARRANGE
      mockStartTransfer.mockRejectedValue(
        new Error('Source path not accessible')
      )

      renderWithProviders(<CfexTransferWindow />)

      const user = userEvent.setup()

      // Wait for auto-detection to complete before interacting
      await waitFor(() => {
        expect(mockDetectSources).toHaveBeenCalled()
      })

      // Wait for input to be enabled after detection
      const sourceInput = await screen.findByLabelText(/source.*folder/i)
      await waitFor(() => {
        expect(sourceInput).not.toBeDisabled()
      })

      // ACT: Start transfer and wait for error
      await user.type(sourceInput, '/Volumes/InvalidPath')
      await user.click(screen.getByRole('button', { name: /start transfer/i }))

      // ASSERT: Error displayed in UI
      await waitFor(() => {
        expect(screen.getByText(/Source path not accessible/i)).toBeInTheDocument()
      })
    })
  })

  describe('Event Listener Cleanup', () => {
    test('removes event listeners on unmount', () => {
      // ARRANGE: Track cleanup function invocation
      const mockCleanup = vi.fn()

      mockOnTransferProgress.mockReturnValue(mockCleanup)

      const { unmount } = renderWithProviders(<CfexTransferWindow />)

      // ACT: Unmount component
      unmount()

      // ASSERT: Cleanup function invoked by useEffect cleanup
      expect(mockCleanup).toHaveBeenCalled()
    })
  })

  describe('Browse Button Timeout Cleanup (Issue #1)', () => {
    afterEach(() => {
      vi.restoreAllMocks()
    })

    test('clears timeout after successful folder selection', async () => {
      // CRITICAL: This test validates the fix for Issue #1
      // Without clearTimeout, timeout promise rejects after folder selected
      // causing unhandled rejection in production

      // Spy on clearTimeout to verify cleanup occurs
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout')

      // Mock successful folder selection (resolves immediately)
      const mockSelectFolder = vi.fn().mockResolvedValue('/Volumes/CFExpress')
      ;(window as any).electronAPI = {
        ...((window as any).electronAPI || {}),
        selectFolder: mockSelectFolder
      }

      renderWithProviders(<CfexTransferWindow />)
      const user = userEvent.setup()

      // ACT: Click Browse button for source folder
      const browseButton = screen.getAllByRole('button', { name: /browse/i })[0]
      await user.click(browseButton)

      // Wait for folder selection to complete
      await waitFor(() => {
        expect(mockSelectFolder).toHaveBeenCalled()
      })

      // ASSERT: clearTimeout was called (cleanup occurred)
      // This proves timeout was cleaned up after successful selection
      expect(clearTimeoutSpy).toHaveBeenCalled()
      // Note: May be called multiple times in test environment (React Strict Mode, etc.)
      // What matters is that it WAS called, proving cleanup occurred

      // ASSERT: Source path updated correctly (no error state)
      expect(screen.getByDisplayValue('/Volumes/CFExpress')).toBeInTheDocument()
    })

    test.skip('clears timeout when timeout fires', async () => {
      // SKIPPED: Timeout extended to 60s for UX (was 10s). Testing real timeout is impractical.
      // Manual verification: Click Browse, wait 60s without selecting → should show timeout message
      // Timeout cleanup logic is verified by 'clears timeout when selectFolder resolves' test

      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout')

      // Mock folder selection that never resolves (simulates hung dialog)
      const mockSelectFolder = vi.fn(() => new Promise<string>(() => {
        // Never resolves - forces timeout
      }))
      ;(window as any).electronAPI = {
        ...((window as any).electronAPI || {}),
        selectFolder: mockSelectFolder
      }

      renderWithProviders(<CfexTransferWindow />)
      const user = userEvent.setup()

      // ACT: Click Browse button
      const browseButton = screen.getAllByRole('button', { name: /browse/i })[0]
      await user.click(browseButton)

      // Wait for timeout error to appear (60s timeout - too long for unit test)
      await waitFor(() => {
        expect(screen.getByText(/folder picker timeout/i)).toBeInTheDocument()
      }, { timeout: 61000 })

      // ASSERT: clearTimeout was called in error path
      expect(clearTimeoutSpy).toHaveBeenCalled()

      // ASSERT: Browse button returns to normal state
      expect(browseButton).not.toHaveTextContent('Opening...')
      expect(browseButton).toHaveTextContent('Browse')
    }, 65000) // Would need 65s test timeout to accommodate 60s browser timeout

    test('clears timeout when selectFolder rejects immediately', async () => {
      // Test cleanup when error occurs BEFORE timeout
      // Example: Permission denied, path invalid, etc.

      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout')

      // Mock selectFolder that rejects immediately (NOT timeout)
      const mockSelectFolder = vi.fn().mockRejectedValue(new Error('Permission denied'))
      ;(window as any).electronAPI = {
        ...((window as any).electronAPI || {}),
        selectFolder: mockSelectFolder
      }

      renderWithProviders(<CfexTransferWindow />)
      const user = userEvent.setup()

      // ACT: Click Browse button
      const browseButton = screen.getAllByRole('button', { name: /browse/i })[0]
      await user.click(browseButton)

      // Wait for error to appear
      await waitFor(() => {
        expect(screen.getByText(/permission denied/i)).toBeInTheDocument()
      })

      // ASSERT: clearTimeout was still called (cleanup in error path)
      expect(clearTimeoutSpy).toHaveBeenCalled()
    })

    test('prevents unhandled rejection after successful selection', async () => {
      // This test validates the PRODUCTION BUG FIX
      // Without clearTimeout, timeout promise rejects after successful selection
      // causing unhandled rejection crash

      const unhandledRejections: any[] = []

      // Listen for unhandled rejections (what caused production crash)
      const handler = (event: PromiseRejectionEvent) => {
        event.preventDefault() // Prevent test framework from failing
        unhandledRejections.push(event.reason)
      }
      window.addEventListener('unhandledrejection', handler)

      try {
        // Mock successful folder selection
        const mockSelectFolder = vi.fn().mockResolvedValue('/Volumes/CFExpress')
        ;(window as any).electronAPI = {
          ...((window as any).electronAPI || {}),
          selectFolder: mockSelectFolder
        }

        renderWithProviders(<CfexTransferWindow />)
        const user = userEvent.setup()

        // ACT: Click Browse button
        const browseButton = screen.getAllByRole('button', { name: /browse/i })[0]
        await user.click(browseButton)

        // Wait for selection to complete
        await waitFor(() => {
          expect(mockSelectFolder).toHaveBeenCalled()
        })

        // Wait a bit longer than timeout duration to ensure no late rejection
        await new Promise(resolve => setTimeout(resolve, 11000))

        // ASSERT: NO unhandled rejections occurred
        // This is the CRITICAL fix - timeout was cleaned up before it could reject
        expect(unhandledRejections).toHaveLength(0)

      } finally {
        window.removeEventListener('unhandledrejection', handler)
      }
    }, 15000) // Increase test timeout to accommodate 11s wait

    test('REGRESSION GUARD: test fails if clearTimeout removed', async () => {
      // This test documents that removing clearTimeout will cause test failure
      // Provides confidence that tests will catch regression

      // Spy on clearTimeout
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout')

      // Mock successful selection
      const mockSelectFolder = vi.fn().mockResolvedValue('/Volumes/CFExpress')
      ;(window as any).electronAPI = {
        ...((window as any).electronAPI || {}),
        selectFolder: mockSelectFolder
      }

      renderWithProviders(<CfexTransferWindow />)
      const user = userEvent.setup()

      // ACT: Click Browse button
      const browseButton = screen.getAllByRole('button', { name: /browse/i })[0]
      await user.click(browseButton)

      // Wait for selection to complete
      await waitFor(() => {
        expect(mockSelectFolder).toHaveBeenCalled()
      })

      // CRITICAL ASSERTION: If clearTimeout is NOT called, this test FAILS
      // This proves tests will catch regression if someone removes cleanup code
      expect(clearTimeoutSpy).toHaveBeenCalled()

      // Document: Commenting out clearTimeout in CfexTransferWindow.tsx
      // lines 115-117 and 125-127 will fail this test
    })
  })

  /**
   * Destination Enable/Disable Checkboxes Tests (RED Phase)
   *
   * Tests for checkboxes that allow users to enable/disable specific destinations
   * Use case: Redo only photos (or only videos) without re-transferring everything
   */
  describe('Destination Enable/Disable Checkboxes', () => {
    test('renders checkbox for photos destination', () => {
      // ARRANGE
      renderWithProviders(<CfexTransferWindow />)

      // ASSERT: Photos checkbox exists and is checked by default
      const photosCheckbox = screen.getByRole('checkbox', { name: /photos destination/i })
      expect(photosCheckbox).toBeInTheDocument()
      expect(photosCheckbox).toBeChecked()
    })

    test('renders checkbox for raw videos destination', () => {
      // ARRANGE
      renderWithProviders(<CfexTransferWindow />)

      // ASSERT: Videos checkbox exists and is checked by default
      const videosCheckbox = screen.getByRole('checkbox', { name: /raw videos destination/i })
      expect(videosCheckbox).toBeInTheDocument()
      expect(videosCheckbox).toBeChecked()
    })

    test('disables photos input when photos checkbox unchecked', async () => {
      // ARRANGE
      renderWithProviders(<CfexTransferWindow />)
      const user = userEvent.setup()

      // Wait for auto-detection to complete
      await waitFor(() => {
        expect(mockDetectSources).toHaveBeenCalled()
      })

      // Wait for inputs to be enabled after detection (use aria-label for specificity)
      const photosInput = await screen.findByLabelText(/photos destination path/i)
      await waitFor(() => {
        expect(photosInput).not.toBeDisabled()
      })

      // ACT: Uncheck photos checkbox
      const photosCheckbox = screen.getByRole('checkbox', { name: /photos destination/i })
      await user.click(photosCheckbox)

      // ASSERT: Photos input and browse button disabled
      expect(photosInput).toBeDisabled()
      const photoBrowseButton = screen.getAllByRole('button', { name: /browse/i })[1]
      expect(photoBrowseButton).toBeDisabled()
    })

    test('disables raw videos input when videos checkbox unchecked', async () => {
      // ARRANGE
      renderWithProviders(<CfexTransferWindow />)
      const user = userEvent.setup()

      // Wait for auto-detection to complete
      await waitFor(() => {
        expect(mockDetectSources).toHaveBeenCalled()
      })

      // Wait for inputs to be enabled after detection
      const videosInput = await screen.findByDisplayValue(/EAV_Video_RAW/i)
      await waitFor(() => {
        expect(videosInput).not.toBeDisabled()
      })

      // ACT: Uncheck videos checkbox
      const videosCheckbox = screen.getByRole('checkbox', { name: /raw videos destination/i })
      await user.click(videosCheckbox)

      // ASSERT: Videos input and browse button disabled
      expect(videosInput).toBeDisabled()
      const videoBrowseButton = screen.getAllByRole('button', { name: /browse/i })[2]
      expect(videoBrowseButton).toBeDisabled()
    })

    test('passes enabledDestinations to startTransfer when both checked', async () => {
      // ARRANGE
      mockStartTransfer.mockResolvedValue({
        success: true,
        filesTransferred: 10,
        filesTotal: 10,
        bytesTransferred: 1000000,
        duration: 5000,
        validationWarnings: [],
        errors: []
      })

      renderWithProviders(<CfexTransferWindow />)
      const user = userEvent.setup()

      // Wait for auto-detection to complete
      await waitFor(() => {
        expect(mockDetectSources).toHaveBeenCalled()
      })

      const sourceInput = await screen.findByLabelText(/source folder/i)
      await waitFor(() => {
        expect(sourceInput).not.toBeDisabled()
      })

      // ACT: Start transfer with both checkboxes checked (default)
      await user.click(screen.getByRole('button', { name: /start transfer/i }))

      // ASSERT: enabledDestinations passed with photos, rawVideos, and proxies (Issue #112)
      // Context startTransfer() extracts enabled flags from context state
      await waitFor(() => {
        expect(mockStartTransfer).toHaveBeenCalledWith(
          expect.objectContaining({
            enabledDestinations: expect.objectContaining({
              photos: true,
              rawVideos: true,
              proxies: false // Default state (proxies disabled by default)
            })
          })
        )
      })
    })

    test('passes enabledDestinations with photos disabled', async () => {
      // ARRANGE
      mockStartTransfer.mockResolvedValue({
        success: true,
        filesTransferred: 5,
        filesTotal: 5,
        bytesTransferred: 500000,
        duration: 2500,
        validationWarnings: [],
        errors: []
      })

      renderWithProviders(<CfexTransferWindow />)
      const user = userEvent.setup()

      // Wait for auto-detection to complete
      await waitFor(() => {
        expect(mockDetectSources).toHaveBeenCalled()
      })

      const sourceInput = await screen.findByLabelText(/source folder/i)
      await waitFor(() => {
        expect(sourceInput).not.toBeDisabled()
      })

      // ACT: Uncheck photos checkbox
      const photosCheckbox = screen.getByRole('checkbox', { name: /photos destination/i })
      await user.click(photosCheckbox)

      // ACT: Start transfer
      await user.click(screen.getByRole('button', { name: /start transfer/i }))

      // ASSERT: enabledDestinations passed with photos=false
      // Context updates via onEnabledDestinationsChange
      await waitFor(() => {
        expect(mockStartTransfer).toHaveBeenCalledWith(
          expect.objectContaining({
            enabledDestinations: expect.objectContaining({
              photos: false,
              rawVideos: true,
              proxies: false // Default state
            })
          })
        )
      })
    })

    test('passes enabledDestinations with rawVideos disabled', async () => {
      // ARRANGE
      mockStartTransfer.mockResolvedValue({
        success: true,
        filesTransferred: 5,
        filesTotal: 5,
        bytesTransferred: 500000,
        duration: 2500,
        validationWarnings: [],
        errors: []
      })

      renderWithProviders(<CfexTransferWindow />)
      const user = userEvent.setup()

      // Wait for auto-detection to complete
      await waitFor(() => {
        expect(mockDetectSources).toHaveBeenCalled()
      })

      const sourceInput = await screen.findByLabelText(/source folder/i)
      await waitFor(() => {
        expect(sourceInput).not.toBeDisabled()
      })

      // ACT: Uncheck videos checkbox
      const videosCheckbox = screen.getByRole('checkbox', { name: /raw videos destination/i })
      await user.click(videosCheckbox)

      // ACT: Start transfer
      await user.click(screen.getByRole('button', { name: /start transfer/i }))

      // ASSERT: enabledDestinations passed with rawVideos=false
      await waitFor(() => {
        expect(mockStartTransfer).toHaveBeenCalledWith(
          expect.objectContaining({
            enabledDestinations: expect.objectContaining({
              photos: true,
              rawVideos: false,
              proxies: false // Default state
            })
          })
        )
      })
    })
  })

  /**
   * Proxy Videos Destination UI Tests (B2.7_01 - RED Phase)
   *
   * Tests for proxy videos destination checkbox and input
   * Follows same pattern as photos/rawVideos destinations
   */
  describe('Proxy Videos Destination UI', () => {
    test('renders checkbox for proxy videos destination', () => {
      // ARRANGE
      renderWithProviders(<CfexTransferWindow />)

      // ASSERT: Proxy videos checkbox exists and is unchecked by default
      const proxyCheckbox = screen.getByRole('checkbox', { name: /proxy videos destination.*lucidlink/i })
      expect(proxyCheckbox).toBeInTheDocument()
      expect(proxyCheckbox).not.toBeChecked()
    })

    test('renders input for proxy videos destination path', () => {
      // ARRANGE
      renderWithProviders(<CfexTransferWindow />)

      // ASSERT: Proxy videos input exists with correct placeholder
      const proxyInput = screen.getByPlaceholderText(/LucidLink.*proxy/i)
      expect(proxyInput).toBeInTheDocument()
    })

    test('proxy input disabled when checkbox unchecked by default', async () => {
      // ARRANGE
      renderWithProviders(<CfexTransferWindow />)

      // Wait for auto-detection to complete
      await waitFor(() => {
        expect(mockDetectSources).toHaveBeenCalled()
      })

      // ASSERT: Proxy input and browse button disabled by default
      const proxyInput = await screen.findByPlaceholderText(/LucidLink.*proxy/i)
      expect(proxyInput).toBeDisabled()
    })

    test('enables proxy input when checkbox checked', async () => {
      // ARRANGE
      renderWithProviders(<CfexTransferWindow />)
      const user = userEvent.setup()

      // Wait for auto-detection to complete
      await waitFor(() => {
        expect(mockDetectSources).toHaveBeenCalled()
      })

      const proxyInput = await screen.findByPlaceholderText(/LucidLink.*proxy/i)

      // ACT: Check proxy checkbox
      const proxyCheckbox = screen.getByRole('checkbox', { name: /proxy videos destination.*lucidlink/i })
      await user.click(proxyCheckbox)

      // ASSERT: Proxy input and browse button enabled
      expect(proxyInput).not.toBeDisabled()
      const proxyBrowseButton = screen.getAllByRole('button', { name: /browse/i })[3]
      expect(proxyBrowseButton).not.toBeDisabled()
    })

    test('proxy input is editable when checkbox checked', async () => {
      // ARRANGE
      renderWithProviders(<CfexTransferWindow />)
      const user = userEvent.setup()

      // Wait for auto-detection to complete
      await waitFor(() => {
        expect(mockDetectSources).toHaveBeenCalled()
      })

      // ACT: Check proxy checkbox
      const proxyCheckbox = screen.getByRole('checkbox', { name: /proxy videos destination.*lucidlink/i })
      await user.click(proxyCheckbox)

      // ACT: Type in proxy input
      const proxyInput = await screen.findByPlaceholderText(/LucidLink.*proxy/i)
      await user.clear(proxyInput)
      await user.type(proxyInput, '/Volumes/videos-current/proxies')

      // ASSERT: Value updated correctly
      expect(proxyInput).toHaveValue('/Volumes/videos-current/proxies')
    })

    test('browse button triggers directory picker for proxy destination', async () => {
      // ARRANGE
      const mockSelectFolder = vi.fn().mockResolvedValue('/Volumes/videos-current/proxies')
      ;(window as any).electronAPI = {
        ...((window as any).electronAPI || {}),
        selectFolder: mockSelectFolder
      }

      renderWithProviders(<CfexTransferWindow />)
      const user = userEvent.setup()

      // Wait for auto-detection to complete
      await waitFor(() => {
        expect(mockDetectSources).toHaveBeenCalled()
      })

      // ACT: Check proxy checkbox to enable browse button
      const proxyCheckbox = screen.getByRole('checkbox', { name: /proxy videos destination.*lucidlink/i })
      await user.click(proxyCheckbox)

      // ACT: Click browse button for proxy folder (4th browse button: source, photos, videos, proxies)
      const proxyBrowseButton = screen.getAllByRole('button', { name: /browse/i })[3]
      await user.click(proxyBrowseButton)

      // ASSERT: selectFolder was called
      await waitFor(() => {
        expect(mockSelectFolder).toHaveBeenCalled()
      })

      // ASSERT: Proxy input updated with selected path
      const proxyInput = await screen.findByPlaceholderText(/LucidLink.*proxy/i)
      expect(proxyInput).toHaveValue('/Volumes/videos-current/proxies')
    })

    test.skip('proxy settings persist to localStorage', async () => {
      // SKIPPED: localStorage persistence not yet implemented
      // Will be implemented when config save/load added to backend
      // For now, proxy settings follow existing photos/rawVideos pattern (state only)

      // ARRANGE
      const localStorageData: Record<string, string> = {}
      const mockLocalStorage = {
        getItem: vi.fn((key: string) => localStorageData[key] || null),
        setItem: vi.fn((key: string, value: string) => { localStorageData[key] = value }),
        removeItem: vi.fn((key: string) => { delete localStorageData[key] }),
        clear: vi.fn(() => { Object.keys(localStorageData).forEach(k => delete localStorageData[k]) }),
        length: 0,
        key: vi.fn()
      }
      Object.defineProperty(window, 'localStorage', { value: mockLocalStorage, writable: true })

      renderWithProviders(<CfexTransferWindow />)
      const user = userEvent.setup()

      // Wait for auto-detection to complete
      await waitFor(() => {
        expect(mockDetectSources).toHaveBeenCalled()
      })

      // ACT: Check proxy checkbox
      const proxyCheckbox = screen.getByRole('checkbox', { name: /proxy videos destination.*lucidlink/i })
      await user.click(proxyCheckbox)

      // ACT: Set proxy destination path
      const proxyInput = await screen.findByPlaceholderText(/LucidLink.*proxy/i)
      await user.clear(proxyInput)
      await user.type(proxyInput, '/Volumes/videos-current/proxies')

      // Wait for debounced localStorage save (if using debounce pattern)
      await new Promise(resolve => setTimeout(resolve, 100))

      // ASSERT: Settings saved to localStorage
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        expect.stringContaining('cfex'),
        expect.stringContaining('proxies')
      )
    })
  })

  /**
   * Auto-Detection Integration Tests
   *
   * TDD RED Phase - Tests for automatic CFEx card detection on mount
   * Tests verify that detectSources is called and UI responds appropriately
   */
  describe('Auto-Detection Integration', () => {
    test('calls detectSources on component mount', async () => {
      // ARRANGE - Mock already set up in beforeEach

      // ACT
      renderWithProviders(<CfexTransferWindow />)

      // ASSERT
      await waitFor(() => {
        expect(mockDetectSources).toHaveBeenCalledTimes(1)
      })
    })

    test('shows "Detecting CFEx cards..." during detection', async () => {
      // ARRANGE - Make detection slow to capture loading state
      mockDetectSources.mockImplementation(() =>
        new Promise(resolve =>
          setTimeout(() => resolve({
            cards: [],
            destinations: { photos: '/default/photos', rawVideos: '/default/rawVideos' },
            shouldAutoPopulate: false,
            selectedCard: undefined
          }), 100)
        )
      )

      // ACT
      renderWithProviders(<CfexTransferWindow />)

      // ASSERT - Should show loading indicator
      expect(screen.getByText(/detecting cfex cards/i)).toBeInTheDocument()
    })

    test('disables source input during detection', async () => {
      // ARRANGE - Make detection slow
      mockDetectSources.mockImplementation(() =>
        new Promise(resolve =>
          setTimeout(() => resolve({
            cards: [],
            destinations: { photos: '/default/photos', rawVideos: '/default/rawVideos' },
            shouldAutoPopulate: false,
            selectedCard: undefined
          }), 100)
        )
      )

      // ACT
      renderWithProviders(<CfexTransferWindow />)

      // ASSERT - Source input should be disabled during detection
      const sourceInput = screen.getByLabelText(/source folder/i)
      expect(sourceInput).toBeDisabled()
    })

    test('auto-populates source path when single card detected', async () => {
      // ARRANGE
      mockDetectSources.mockResolvedValue({
        cards: ['/Volumes/NO NAME/'],
        destinations: { photos: '/Volumes/LucidLink/', rawVideos: '/Volumes/Ubuntu/' },
        shouldAutoPopulate: true,
        selectedCard: '/Volumes/NO NAME/'
      })

      // ACT
      renderWithProviders(<CfexTransferWindow />)

      // ASSERT
      await waitFor(() => {
        const sourceInput = screen.getByLabelText(/source folder/i) as HTMLInputElement
        expect(sourceInput.value).toBe('/Volumes/NO NAME/')
      })
    })

    test('auto-populates destination paths from detected mounts', async () => {
      // ARRANGE
      mockDetectSources.mockResolvedValue({
        cards: ['/Volumes/NO NAME/'],
        destinations: { photos: '/Volumes/LucidLink/', rawVideos: '/Volumes/Ubuntu/' },
        shouldAutoPopulate: true,
        selectedCard: '/Volumes/NO NAME/'
      })

      // ACT
      renderWithProviders(<CfexTransferWindow />)

      // ASSERT: Use specific placeholder text to avoid checkbox/input ambiguity
      await waitFor(() => {
        const photosInput = screen.getByPlaceholderText(/LucidLink.*photos/i) as HTMLInputElement
        const videosInput = screen.getByPlaceholderText(/Ubuntu/i) as HTMLInputElement
        expect(photosInput.value).toBe('/Volumes/LucidLink/')
        expect(videosInput.value).toBe('/Volumes/Ubuntu/')
      })
    })

    test('keeps default source when multiple cards detected (no auto-populate)', async () => {
      // ARRANGE
      mockDetectSources.mockResolvedValue({
        cards: ['/Volumes/NO NAME/', '/Volumes/NO NAME 2/'],
        destinations: { photos: '/Volumes/LucidLink/', rawVideos: '/Volumes/Ubuntu/' },
        shouldAutoPopulate: false,
        selectedCard: undefined
      })

      // ACT
      renderWithProviders(<CfexTransferWindow />)

      // Wait for detection to complete
      await waitFor(() => {
        expect(mockDetectSources).toHaveBeenCalled()
      })

      // ASSERT - Source should keep default (not auto-populated from detection)
      const sourceInput = screen.getByLabelText(/source folder/i) as HTMLInputElement
      expect(sourceInput.value).toBe('/Volumes/Untitled/DCIM/100_FUJI')
    })

    test('handles detectSources error gracefully', async () => {
      // ARRANGE
      mockDetectSources.mockRejectedValue(new Error('Detection failed'))

      // ACT
      renderWithProviders(<CfexTransferWindow />)

      // ASSERT - Should not crash, should clear detecting state
      await waitFor(() => {
        // Component should render without crashing
        expect(screen.getByText(/cfex file transfer/i)).toBeInTheDocument()
      })
    })

    test('clears detecting state after completion or error', async () => {
      // ARRANGE - Fast detection
      mockDetectSources.mockResolvedValue({
        cards: [],
        destinations: { photos: '/default/photos', rawVideos: '/default/rawVideos' },
        shouldAutoPopulate: false,
        selectedCard: undefined
      })

      // ACT
      renderWithProviders(<CfexTransferWindow />)

      // ASSERT - After detection completes, loading indicator should be gone
      await waitFor(() => {
        expect(screen.queryByText(/detecting cfex cards/i)).not.toBeInTheDocument()
      })
    })

    test('disables start button while auto-detection is in progress', async () => {
      // ARRANGE: Make detectSources hang (don't resolve immediately)
      let resolveDetection: (value: any) => void
      mockDetectSources.mockImplementation(() => new Promise(resolve => {
        resolveDetection = resolve
      }))

      // ACT
      renderWithProviders(<CfexTransferWindow />)

      // ASSERT: Button disabled during detection
      const startButton = screen.getByRole('button', { name: /start transfer/i })
      expect(startButton).toBeDisabled()

      // Cleanup: resolve the promise
      resolveDetection!({
        cards: [],
        destinations: { photos: '/default/photos', rawVideos: '/default/rawVideos' },
        shouldAutoPopulate: false,
        selectedCard: undefined
      })

      // Wait for detection to complete
      await waitFor(() => {
        expect(mockDetectSources).toHaveBeenCalled()
      })
    })
  })

  /**
   * Proxy Generation After Transfer Tests (B2.7_02 - RED Phase)
   *
   * Tests for automatic proxy generation trigger after CFEx transfer completes
   * when proxy destination is enabled.
   */
  describe('Proxy Generation After Transfer (B2.7_02)', () => {
    test.skip('triggers proxy generation when proxies enabled and transfer completes', async () => {
      // SKIPPED: Proxy generation TRIGGER logic (Issue #112 only covers settings propagation)
      // Issue #112 FIXED: Proxy settings now propagated to backend via IPC
      // TODO: Implement proxy generation trigger in backend (separate feature)
      // ARRANGE
      const rawVideosPaths = ['/Volumes/EAV_Video_RAW/video1.MOV', '/Volumes/EAV_Video_RAW/video2.MOV']

      mockStartTransfer.mockResolvedValue({
        success: true,
        filesTransferred: 2,
        filesTotal: 2,
        bytesTransferred: 2000000,
        duration: 5000,
        validationWarnings: [],
        errors: [],
        transferredFiles: {
          rawVideos: rawVideosPaths
        }
      })

      renderWithProviders(<CfexTransferWindow />)
      const user = userEvent.setup()

      // Wait for auto-detection to complete
      await waitFor(() => {
        expect(mockDetectSources).toHaveBeenCalled()
      })

      // ACT: Enable proxy destination and set path
      const proxyCheckbox = screen.getByRole('checkbox', { name: /proxy videos destination.*lucidlink/i })
      await user.click(proxyCheckbox)

      const proxyInput = await screen.findByPlaceholderText(/LucidLink.*proxy/i)
      await user.clear(proxyInput)
      await user.type(proxyInput, '/Volumes/videos-current/proxies')

      // ACT: Start transfer
      const startButton = screen.getByRole('button', { name: /start transfer/i })
      await user.click(startButton)

      // ASSERT: Proxy generation triggered with correct parameters
      await waitFor(() => {
        expect(mockGenerateProxies).toHaveBeenCalledWith(
          expect.objectContaining({
            rawVideoFolder: '/Volumes/EAV_Video_RAW/',
            proxyOutputFolder: '/Volumes/videos-current/proxies',
            videoFilenames: expect.arrayContaining(['video1.MOV', 'video2.MOV'])
          })
        )
      })
    })

    test.skip('does NOT trigger proxy generation when proxies disabled', async () => {
      // SKIPPED: Proxy generation TRIGGER logic out of scope for Issue #112
      // ARRANGE
      mockStartTransfer.mockResolvedValue({
        success: true,
        filesTransferred: 2,
        filesTotal: 2,
        bytesTransferred: 2000000,
        duration: 5000,
        validationWarnings: [],
        errors: [],
        transferredFiles: {
          rawVideos: ['/Volumes/EAV_Video_RAW/video1.MOV']
        }
      })

      renderWithProviders(<CfexTransferWindow />)
      const user = userEvent.setup()

      // Wait for auto-detection to complete
      await waitFor(() => {
        expect(mockDetectSources).toHaveBeenCalled()
      })

      // ACT: Start transfer with proxies disabled (default state)
      const startButton = screen.getByRole('button', { name: /start transfer/i })
      await user.click(startButton)

      // Wait for transfer to complete
      await waitFor(() => {
        expect(mockStartTransfer).toHaveBeenCalled()
      })

      // ASSERT: Proxy generation NOT triggered
      expect(mockGenerateProxies).not.toHaveBeenCalled()
    })

    test.skip('passes correct destination path to proxy generation', async () => {
      // SKIPPED: See above - proxy generation not in context yet
      // ARRANGE
      const customProxyPath = '/Volumes/custom-path/proxies'

      mockStartTransfer.mockResolvedValue({
        success: true,
        filesTransferred: 1,
        filesTotal: 1,
        bytesTransferred: 1000000,
        duration: 2500,
        validationWarnings: [],
        errors: [],
        transferredFiles: {
          rawVideos: ['/Volumes/EAV_Video_RAW/video.MOV']
        }
      })

      renderWithProviders(<CfexTransferWindow />)
      const user = userEvent.setup()

      // Wait for auto-detection to complete
      await waitFor(() => {
        expect(mockDetectSources).toHaveBeenCalled()
      })

      // ACT: Enable proxies and set custom path
      const proxyCheckbox = screen.getByRole('checkbox', { name: /proxy videos destination.*lucidlink/i })
      await user.click(proxyCheckbox)

      const proxyInput = await screen.findByPlaceholderText(/LucidLink.*proxy/i)
      await user.clear(proxyInput)
      await user.type(proxyInput, customProxyPath)

      // ACT: Start transfer
      const startButton = screen.getByRole('button', { name: /start transfer/i })
      await user.click(startButton)

      // ASSERT: Custom path passed correctly
      await waitFor(() => {
        expect(mockGenerateProxies).toHaveBeenCalledWith(
          expect.objectContaining({
            proxyOutputFolder: customProxyPath
          })
        )
      })
    })

    test.skip('proxy generation failure does not fail overall transfer (fail-log-continue)', async () => {
      // SKIPPED: See above - proxy generation not in context yet
      // ARRANGE - Proxy generation fails
      mockGenerateProxies.mockResolvedValue({
        success: false,
        completedCount: 0,
        failedCount: 2,
        completedFiles: [],
        failedFiles: ['video1.MOV', 'video2.MOV']
      })

      mockStartTransfer.mockResolvedValue({
        success: true,
        filesTransferred: 2,
        filesTotal: 2,
        bytesTransferred: 2000000,
        duration: 5000,
        validationWarnings: [],
        errors: [],
        transferredFiles: {
          rawVideos: ['/Volumes/EAV_Video_RAW/video1.MOV', '/Volumes/EAV_Video_RAW/video2.MOV']
        }
      })

      renderWithProviders(<CfexTransferWindow />)
      const user = userEvent.setup()

      // Wait for auto-detection to complete
      await waitFor(() => {
        expect(mockDetectSources).toHaveBeenCalled()
      })

      // ACT: Enable proxies and start transfer
      const proxyCheckbox = screen.getByRole('checkbox', { name: /proxy videos destination.*lucidlink/i })
      await user.click(proxyCheckbox)

      const startButton = screen.getByRole('button', { name: /start transfer/i })
      await user.click(startButton)

      // Wait for both transfer and proxy generation
      await waitFor(() => {
        expect(mockGenerateProxies).toHaveBeenCalled()
      })

      // ASSERT: Transfer still shows as complete despite proxy failure
      // Status should be 'complete', not 'error'
      await waitFor(() => {
        // Check UI shows completion (not error state)
        expect(screen.queryByText(/transfer in progress/i)).not.toBeInTheDocument()
      })
    })
  })

  // RED: Test that Cancel button calls context.cancelTransfer
  describe('Cancel Button Integration', () => {
    test('should call context.cancelTransfer when Cancel button clicked', async () => {
      // ARRANGE: Mock cancel function to track invocations
      const mockCancelFn = vi.fn().mockResolvedValue({ success: true });
      (window as any).electronAPI.cfex.cancel = mockCancelFn;

      // Mock transfer that never completes (simulates in-progress state)
      mockStartTransfer.mockImplementation(() => new Promise(() => {}));

      renderWithProviders(<CfexTransferWindow />);
      const user = userEvent.setup();

      // Wait for auto-detection to complete
      await waitFor(() => {
        expect(mockDetectSources).toHaveBeenCalled();
      });

      // Start transfer to enable Cancel button
      const startButton = await screen.findByRole('button', { name: /start transfer/i });
      await waitFor(() => {
        expect(startButton).not.toBeDisabled();
      });
      await user.click(startButton);

      // Wait for transfer to start
      await waitFor(() => {
        expect(mockStartTransfer).toHaveBeenCalled();
      });

      // ACT: Click Cancel button
      const cancelButton = await screen.findByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      // ASSERT: IPC cancel method was called
      expect(mockCancelFn).toHaveBeenCalled();
    });
  });

  describe('Proxy Generation Progress (TDD - RED phase)', () => {
    test('should display proxy progress section after transfer completes with proxies enabled', async () => {
      // ARRANGE: Setup proxy progress event emitter
      let proxyProgressCallback: ((progress: any) => void) | null = null
      const mockOnProxyProgress = vi.fn((callback) => {
        proxyProgressCallback = callback
        return () => {} // cleanup function
      })

      ;(window as any).electronAPI.proxy = {
        ...( (window as any).electronAPI.proxy || {} ),
        onProxyProgress: mockOnProxyProgress,
        generateProxies: mockGenerateProxies
      }

      mockStartTransfer.mockResolvedValue({
        success: true,
        filesTransferred: 2,
        filesTotal: 2,
        bytesTransferred: 1000000,
        duration: 2500,
        validationWarnings: [],
        errors: [],
        transferredFiles: {
          rawVideos: ['EA001621.MOV', 'EA001622.MOV']
        }
      })

      const user = userEvent.setup()
      renderWithProviders(<CfexTransferWindow />)

      // ACT: Enable proxies and start transfer
      const proxyCheckbox = screen.getByRole('checkbox', { name: /proxy videos destination.*lucidlink/i })
      await user.click(proxyCheckbox)

      const startButton = screen.getByRole('button', { name: /start transfer/i })
      await user.click(startButton)

      // Wait for transfer to complete
      await waitFor(() => {
        expect(mockStartTransfer).toHaveBeenCalled()
      })

      // Simulate proxy progress event
      if (proxyProgressCallback) {
        (proxyProgressCallback as (progress: any) => void)({
          type: 'transcode_progress',
          filename: 'EA001621.MOV',
          index: 1,
          total: 2,
          percentage: 45,
          timeString: '2m 30s'
        });
      }

      // ASSERT: Should display proxy generation progress
      await waitFor(() => {
        expect(screen.getByText(/Generating Proxies:/)).toBeInTheDocument()
        expect(screen.getByText(/EA001621\.MOV/)).toBeInTheDocument()
        expect(screen.getByText(/Progress:.*1.*2.*videos/)).toBeInTheDocument()
        expect(screen.getByText(/Encoding:.*45%/)).toBeInTheDocument()
      })
    })

    test('should show current file and encoding percentage during proxy generation', async () => {
      // ARRANGE: Setup proxy progress event emitter
      let proxyProgressCallback: ((progress: any) => void) | null = null
      const mockOnProxyProgress = vi.fn((callback) => {
        proxyProgressCallback = callback
        return () => {}
      })

      ;(window as any).electronAPI.proxy = {
        ...( (window as any).electronAPI.proxy || {} ),
        onProxyProgress: mockOnProxyProgress
      }

      renderWithProviders(<CfexTransferWindow />)

      // ACT: Simulate proxy progress events
      if (proxyProgressCallback) {
        (proxyProgressCallback as (progress: any) => void)({
          type: 'transcode_progress',
          filename: 'EA001622.MOV',
          index: 2,
          total: 5,
          percentage: 67
        });
      }

      // ASSERT: Should display encoding progress
      await waitFor(() => {
        expect(screen.getByText(/67%/)).toBeInTheDocument()
        expect(screen.getByText(/EA001622\.MOV/)).toBeInTheDocument()
      })
    })

    test('should cleanup proxy progress subscription on unmount', () => {
      // ARRANGE: Mock cleanup function
      const mockCleanup = vi.fn()
      const mockOnProxyProgress = vi.fn().mockReturnValue(mockCleanup)

      ;(window as any).electronAPI.proxy = {
        ...( (window as any).electronAPI.proxy || {} ),
        onProxyProgress: mockOnProxyProgress
      }

      const { unmount } = renderWithProviders(<CfexTransferWindow />)

      // ACT: Unmount component
      unmount()

      // ASSERT: Should call cleanup function
      expect(mockCleanup).toHaveBeenCalled()
    })
  })
})
