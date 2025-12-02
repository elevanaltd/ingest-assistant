/**
 * TransferProgress Component Tests (RED Phase - Phase 8a)
 *
 * TDD Discipline: Write failing tests BEFORE extracting component
 *
 * Test Coverage:
 * - Displays current file name
 * - Shows progress (files completed / total)
 * - Displays percentage complete
 * - Renders progress bar with correct width
 */
import { describe, test, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { render } from '@testing-library/react'
import { TransferProgress } from './TransferProgress'

describe('TransferProgress (Phase 8a Extraction)', () => {
  const defaultProps = {
    status: 'transferring' as const,
    currentFile: 'EA001621.JPG',
    filesCompleted: 25,
    filesTotal: 100,
    bytesTransferred: 500000,
    bytesTotal: 1000000,
    percentComplete: 25.5,
    estimatedTimeRemaining: null
  }

  describe('Component Rendering', () => {
    test('displays current file name', () => {
      // ARRANGE & ACT
      render(<TransferProgress {...defaultProps} />)

      // ASSERT
      expect(screen.getByText(/current file:/i)).toBeInTheDocument()
      expect(screen.getByText(/EA001621\.JPG/i)).toBeInTheDocument()
    })

    test('displays progress as files completed / total', () => {
      // ARRANGE & ACT
      render(<TransferProgress {...defaultProps} />)

      // ASSERT
      expect(screen.getByText(/progress:/i)).toBeInTheDocument()
      expect(screen.getByText(/25.*\/.*100 files/i)).toBeInTheDocument()
    })

    test('displays percentage complete', () => {
      // ARRANGE & ACT
      render(<TransferProgress {...defaultProps} />)

      // ASSERT
      // Percentage shown as 25.50%
      expect(screen.getByText(/25\.50%/i)).toBeInTheDocument()
    })

    test('renders "N/A" when currentFile is null', () => {
      // ARRANGE
      const props = { ...defaultProps, currentFile: null }

      // ACT
      render(<TransferProgress {...props} />)

      // ASSERT
      expect(screen.getByText(/n\/a/i)).toBeInTheDocument()
    })
  })

  describe('Progress Bar Rendering', () => {
    test('progress bar width matches percentComplete', () => {
      // ARRANGE & ACT
      const { container } = render(<TransferProgress {...defaultProps} />)

      // ASSERT: Find progress bar inner div with width style
      const progressBar = container.querySelector('div[style*="width: 25.5%"]')
      expect(progressBar).toBeInTheDocument()
    })

    test('progress bar shows 0% when percentComplete is 0', () => {
      // ARRANGE
      const props = { ...defaultProps, percentComplete: 0, filesCompleted: 0 }

      // ACT
      const { container } = render(<TransferProgress {...props} />)

      // ASSERT
      const progressBar = container.querySelector('div[style*="width: 0%"]')
      expect(progressBar).toBeInTheDocument()
    })

    test('progress bar shows 100% when percentComplete is 100', () => {
      // ARRANGE
      const props = { ...defaultProps, percentComplete: 100, filesCompleted: 100 }

      // ACT
      const { container } = render(<TransferProgress {...props} />)

      // ASSERT
      const progressBar = container.querySelector('div[style*="width: 100%"]')
      expect(progressBar).toBeInTheDocument()
    })
  })
})
