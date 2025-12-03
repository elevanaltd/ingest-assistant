/**
 * FolderPicker Component Tests (RED Phase - Phase 8a)
 *
 * TDD Discipline: Write failing tests BEFORE extracting component
 *
 * Test Coverage:
 * - Renders source folder input and browse button
 * - Renders destination inputs (photos, rawVideos, proxies)
 * - Enable/disable checkboxes control input state
 * - Browse button timeout cleanup (Issue #1 regression guard)
 * - Error handling for folder picker failures
 */
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { render } from '@testing-library/react'
import { FolderPicker } from './FolderPicker'

describe('FolderPicker (Phase 8a Extraction)', () => {
  const mockOnSourceChange = vi.fn()
  const mockOnDestinationChange = vi.fn()
  const mockOnEnabledDestinationsChange = vi.fn()

  const defaultProps = {
    sourcePath: '/Volumes/CFExpress/DCIM',
    onSourceChange: mockOnSourceChange,
    destinationPaths: {
      photos: '/Volumes/LucidLink/photos',
      rawVideos: '/Volumes/Ubuntu/videos-raw',
      proxies: '/Volumes/LucidLink/proxies'
    },
    onDestinationChange: mockOnDestinationChange,
    enabledDestinations: {
      photos: true,
      rawVideos: true,
      proxies: false
    },
    onEnabledDestinationsChange: mockOnEnabledDestinationsChange,
    disabled: false
  }

  beforeEach(() => {
    vi.clearAllMocks()

    // Mock electronAPI.selectFolder for browse button tests
    ;(window as any).electronAPI = {
      selectFolder: vi.fn().mockResolvedValue('/Volumes/SelectedPath')
    }
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Component Rendering', () => {
    test('renders source folder input with correct value', () => {
      // ARRANGE & ACT
      render(<FolderPicker {...defaultProps} />)

      // ASSERT
      const sourceInput = screen.getByLabelText(/source folder/i) as HTMLInputElement
      expect(sourceInput).toBeInTheDocument()
      expect(sourceInput.value).toBe('/Volumes/CFExpress/DCIM')
    })

    test('renders photos destination input with checkbox', () => {
      // ARRANGE & ACT
      render(<FolderPicker {...defaultProps} />)

      // ASSERT
      const photosCheckbox = screen.getByRole('checkbox', { name: /photos destination/i })
      const photosInput = screen.getByLabelText(/photos destination path/i) as HTMLInputElement

      expect(photosCheckbox).toBeInTheDocument()
      expect(photosCheckbox).toBeChecked()
      expect(photosInput).toBeInTheDocument()
      expect(photosInput.value).toBe('/Volumes/LucidLink/photos')
      expect(photosInput).not.toBeDisabled()
    })

    test('renders raw videos destination input with checkbox', () => {
      // ARRANGE & ACT
      render(<FolderPicker {...defaultProps} />)

      // ASSERT
      const videosCheckbox = screen.getByRole('checkbox', { name: /raw videos destination/i })
      const videosInput = screen.getByDisplayValue('/Volumes/Ubuntu/videos-raw') as HTMLInputElement

      expect(videosCheckbox).toBeInTheDocument()
      expect(videosCheckbox).toBeChecked()
      expect(videosInput).toBeInTheDocument()
      expect(videosInput).not.toBeDisabled()
    })

    test('renders proxy videos destination input with checkbox unchecked by default', () => {
      // ARRANGE & ACT
      render(<FolderPicker {...defaultProps} />)

      // ASSERT
      const proxiesCheckbox = screen.getByRole('checkbox', { name: /proxy videos destination/i })
      const proxiesInput = screen.getByPlaceholderText(/LucidLink.*proxy/i) as HTMLInputElement

      expect(proxiesCheckbox).toBeInTheDocument()
      expect(proxiesCheckbox).not.toBeChecked()
      expect(proxiesInput).toBeInTheDocument()
      expect(proxiesInput).toBeDisabled() // Disabled when checkbox unchecked
    })
  })

  describe('Enable/Disable Checkboxes', () => {
    test('unchecking photos disables photos input and browse button', async () => {
      // ARRANGE
      render(<FolderPicker {...defaultProps} />)
      const user = userEvent.setup()

      // ACT
      const photosCheckbox = screen.getByRole('checkbox', { name: /photos destination/i })
      await user.click(photosCheckbox)

      // ASSERT
      expect(mockOnEnabledDestinationsChange).toHaveBeenCalledWith({
        photos: false,
        rawVideos: true,
        proxies: false
      })

      // Note: Component should disable input based on prop (parent controls enabled state)
    })

    test('checking proxies enables proxies input and browse button', async () => {
      // ARRANGE
      render(<FolderPicker {...defaultProps} />)
      const user = userEvent.setup()

      // ACT
      const proxiesCheckbox = screen.getByRole('checkbox', { name: /proxy videos destination/i })
      await user.click(proxiesCheckbox)

      // ASSERT
      expect(mockOnEnabledDestinationsChange).toHaveBeenCalledWith({
        photos: true,
        rawVideos: true,
        proxies: true
      })
    })
  })

  describe('Browse Button Functionality', () => {
    test('browse button opens folder picker and calls onSourceChange', async () => {
      // ARRANGE
      const mockSelectFolder = vi.fn().mockResolvedValue('/Volumes/NewCard')
      ;(window as any).electronAPI.selectFolder = mockSelectFolder

      render(<FolderPicker {...defaultProps} />)
      const user = userEvent.setup()

      // ACT
      const browseBtnList = screen.getAllByRole('button', { name: /browse/i })
      const sourceBrowseBtn = browseBtnList[0]
      await user.click(sourceBrowseBtn)

      // ASSERT
      await waitFor(() => {
        expect(mockSelectFolder).toHaveBeenCalledWith('/Volumes/CFExpress/DCIM')
        expect(mockOnSourceChange).toHaveBeenCalledWith('/Volumes/NewCard')
      })
    })

    test('browse button shows "Opening..." text during selection', async () => {
      // ARRANGE
      let resolveSelectFolder: (value: string) => void
      const mockSelectFolder = vi.fn(() => new Promise<string>((resolve) => {
        resolveSelectFolder = resolve
      }))
      ;(window as any).electronAPI.selectFolder = mockSelectFolder

      render(<FolderPicker {...defaultProps} />)
      const user = userEvent.setup()

      // ACT
      const sourceBrowseBtn = screen.getAllByRole('button', { name: /browse/i })[0]
      await user.click(sourceBrowseBtn)

      // ASSERT
      await waitFor(() => {
        expect(sourceBrowseBtn).toHaveTextContent('Opening...')
      })

      // Cleanup
      resolveSelectFolder!('/Volumes/Test')
    })

    test('clears timeout after successful folder selection (Issue #1 fix)', async () => {
      // ARRANGE
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout')
      const mockSelectFolder = vi.fn().mockResolvedValue('/Volumes/NewCard')
      ;(window as any).electronAPI.selectFolder = mockSelectFolder

      render(<FolderPicker {...defaultProps} />)
      const user = userEvent.setup()

      // ACT
      const sourceBrowseBtn = screen.getAllByRole('button', { name: /browse/i })[0]
      await user.click(sourceBrowseBtn)

      // ASSERT
      await waitFor(() => {
        expect(mockSelectFolder).toHaveBeenCalled()
      })

      expect(clearTimeoutSpy).toHaveBeenCalled()
    })
  })

  describe('Error Handling', () => {
    test('displays error when folder picker fails', async () => {
      // ARRANGE
      const mockSelectFolder = vi.fn().mockRejectedValue(new Error('Permission denied'))
      ;(window as any).electronAPI.selectFolder = mockSelectFolder

      render(<FolderPicker {...defaultProps} />)
      const user = userEvent.setup()

      // ACT
      const sourceBrowseBtn = screen.getAllByRole('button', { name: /browse/i })[0]
      await user.click(sourceBrowseBtn)

      // ASSERT
      await waitFor(() => {
        expect(screen.getByText(/browse failed/i)).toBeInTheDocument()
        expect(screen.getByText(/permission denied/i)).toBeInTheDocument()
      })
    })

    test('clears error after successful selection', async () => {
      // ARRANGE - First call fails, second succeeds
      const mockSelectFolder = vi.fn()
        .mockRejectedValueOnce(new Error('Permission denied'))
        .mockResolvedValueOnce('/Volumes/Success')
      ;(window as any).electronAPI.selectFolder = mockSelectFolder

      render(<FolderPicker {...defaultProps} />)
      const user = userEvent.setup()

      const sourceBrowseBtn = screen.getAllByRole('button', { name: /browse/i })[0]

      // ACT - First click (error)
      await user.click(sourceBrowseBtn)
      await waitFor(() => {
        expect(screen.getByText(/permission denied/i)).toBeInTheDocument()
      })

      // ACT - Second click (success)
      await user.click(sourceBrowseBtn)

      // ASSERT - Error cleared
      await waitFor(() => {
        expect(screen.queryByText(/permission denied/i)).not.toBeInTheDocument()
      })
    })
  })

  describe('Input Disabling', () => {
    test('all inputs disabled when disabled prop is true', () => {
      // ARRANGE & ACT
      render(<FolderPicker {...defaultProps} disabled={true} />)

      // ASSERT
      expect(screen.getByLabelText(/source folder/i)).toBeDisabled()
      expect(screen.getByLabelText(/photos destination path/i)).toBeDisabled()
      expect(screen.getByDisplayValue('/Volumes/Ubuntu/videos-raw')).toBeDisabled()
      expect(screen.getByPlaceholderText(/LucidLink.*proxy/i)).toBeDisabled()

      const browseButtons = screen.getAllByRole('button', { name: /browse/i })
      browseButtons.forEach(btn => {
        expect(btn).toBeDisabled()
      })
    })

    test('photos input disabled when checkbox unchecked', () => {
      // ARRANGE
      const props = {
        ...defaultProps,
        enabledDestinations: {
          photos: false,
          rawVideos: true,
          proxies: false
        }
      }

      // ACT
      render(<FolderPicker {...props} />)

      // ASSERT
      const photosInput = screen.getByLabelText(/photos destination path/i)
      expect(photosInput).toBeDisabled()
    })
  })

  describe('Path Changes', () => {
    test('typing in source input calls onSourceChange', async () => {
      // ARRANGE
      render(<FolderPicker {...defaultProps} />)
      const user = userEvent.setup()

      // ACT
      const sourceInput = screen.getByLabelText(/source folder/i)
      await user.clear(sourceInput)
      await user.type(sourceInput, '/Volumes/NewPath')

      // ASSERT
      // onSourceChange called for each character
      expect(mockOnSourceChange).toHaveBeenCalled()
    })

    test('typing in photos input calls onDestinationChange', async () => {
      // ARRANGE
      render(<FolderPicker {...defaultProps} />)
      const user = userEvent.setup()

      // ACT
      const photosInput = screen.getByLabelText(/photos destination path/i)
      await user.type(photosInput, 'X') // Type to trigger onChange

      // ASSERT - onDestinationChange was called (onChange triggered)
      // Note: userEvent.type triggers onChange for each character
      // We verify the callback mechanism works, not exact call count
      expect(mockOnDestinationChange).toHaveBeenCalled()
    })
  })

  describe('Create Folder Button (Linux folder creation)', () => {
    test('renders Create Folder button for photos destination', () => {
      // ARRANGE & ACT
      render(<FolderPicker {...defaultProps} />)

      // ASSERT
      const createFolderButtons = screen.getAllByRole('button', { name: /create folder/i })
      expect(createFolderButtons.length).toBeGreaterThan(0)
    })

    test('Create Folder button shows prompt and creates folder successfully', async () => {
      // ARRANGE
      const mockCreateFolder = vi.fn().mockResolvedValue({
        success: true,
        path: '/Volumes/LucidLink/photos/new-project'
      })
      ;(window as any).electronAPI.createFolder = mockCreateFolder

      // Mock window.prompt
      const promptSpy = vi.spyOn(window, 'prompt').mockReturnValue('new-project')

      render(<FolderPicker {...defaultProps} />)
      const user = userEvent.setup()

      // ACT
      const createFolderButtons = screen.getAllByRole('button', { name: /create folder/i })
      const photosCreateBtn = createFolderButtons[0] // First is photos
      await user.click(photosCreateBtn)

      // ASSERT
      await waitFor(() => {
        expect(promptSpy).toHaveBeenCalledWith('Enter folder name:')
        expect(mockCreateFolder).toHaveBeenCalledWith('/Volumes/LucidLink/photos', 'new-project')
        expect(mockOnDestinationChange).toHaveBeenCalledWith({
          photos: '/Volumes/LucidLink/photos/new-project',
          rawVideos: '/Volumes/Ubuntu/videos-raw',
          proxies: '/Volumes/LucidLink/proxies'
        })
      })

      promptSpy.mockRestore()
    })

    test('Create Folder button handles user cancellation (empty input)', async () => {
      // ARRANGE
      const mockCreateFolder = vi.fn()
      ;(window as any).electronAPI.createFolder = mockCreateFolder

      // Mock window.prompt returning null (cancelled)
      const promptSpy = vi.spyOn(window, 'prompt').mockReturnValue(null)

      render(<FolderPicker {...defaultProps} />)
      const user = userEvent.setup()

      // ACT
      const createFolderButtons = screen.getAllByRole('button', { name: /create folder/i })
      await user.click(createFolderButtons[0])

      // ASSERT
      expect(promptSpy).toHaveBeenCalled()
      expect(mockCreateFolder).not.toHaveBeenCalled()
      expect(mockOnDestinationChange).not.toHaveBeenCalled()

      promptSpy.mockRestore()
    })

    test('Create Folder button displays error when creation fails', async () => {
      // ARRANGE
      const mockCreateFolder = vi.fn().mockResolvedValue({
        success: false,
        error: 'Permission denied'
      })
      ;(window as any).electronAPI.createFolder = mockCreateFolder

      const promptSpy = vi.spyOn(window, 'prompt').mockReturnValue('test-folder')

      render(<FolderPicker {...defaultProps} />)
      const user = userEvent.setup()

      // ACT
      const createFolderButtons = screen.getAllByRole('button', { name: /create folder/i })
      await user.click(createFolderButtons[0])

      // ASSERT
      await waitFor(() => {
        expect(screen.getByText(/create folder failed/i)).toBeInTheDocument()
        expect(screen.getByText(/permission denied/i)).toBeInTheDocument()
      })

      promptSpy.mockRestore()
    })

    test('Create Folder button disabled when destination disabled', () => {
      // ARRANGE
      const props = {
        ...defaultProps,
        enabledDestinations: {
          photos: false,
          rawVideos: true,
          proxies: false
        }
      }

      // ACT
      render(<FolderPicker {...props} />)

      // ASSERT
      const createFolderButtons = screen.getAllByRole('button', { name: /create folder/i })
      // First button should be disabled (photos disabled)
      expect(createFolderButtons[0]).toBeDisabled()
    })

    test('Create Folder button disabled when component disabled', () => {
      // ARRANGE & ACT
      render(<FolderPicker {...defaultProps} disabled={true} />)

      // ASSERT
      const createFolderButtons = screen.getAllByRole('button', { name: /create folder/i })
      createFolderButtons.forEach(btn => {
        expect(btn).toBeDisabled()
      })
    })
  })
})
