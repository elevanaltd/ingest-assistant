/**
 * ValidationResults Component Tests (RED Phase - Phase 8a)
 *
 * TDD Discipline: Write failing tests BEFORE extracting component
 *
 * Test Coverage:
 * - Renders nothing when no warnings or errors
 * - Displays warnings section with correct styling
 * - Displays errors section with correct styling
 * - Shows both warnings and errors simultaneously
 */
import { describe, test, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { render } from '@testing-library/react'
import { ValidationResults } from './ValidationResults'

describe('ValidationResults (Phase 8a Extraction)', () => {
  interface ValidationWarning {
    file: string
    message: string
    severity: 'low' | 'medium' | 'high'
  }

  interface TransferError {
    file: string
    error: Error
    phase: 'scan' | 'transfer' | 'validation'
  }

  describe('Component Rendering', () => {
    test('renders nothing when no warnings or errors', () => {
      // ARRANGE & ACT
      const { container } = render(<ValidationResults warnings={[]} errors={[]} />)

      // ASSERT: Component returns null (no DOM rendered)
      expect(container.firstChild).toBeNull()
    })

    test('displays warnings section with warning items', () => {
      // ARRANGE
      const warnings: ValidationWarning[] = [
        { file: 'IMG_001.jpg', message: 'EXIF DateTimeOriginal missing', severity: 'medium' },
        { file: 'IMG_002.jpg', message: 'Low resolution', severity: 'low' }
      ]

      // ACT
      render(<ValidationResults warnings={warnings} errors={[]} />)

      // ASSERT
      expect(screen.getByText(/warnings/i)).toBeInTheDocument()
      expect(screen.getByText(/IMG_001\.jpg/i)).toBeInTheDocument()
      expect(screen.getByText(/EXIF DateTimeOriginal missing/i)).toBeInTheDocument()
      expect(screen.getByText(/IMG_002\.jpg/i)).toBeInTheDocument()
      expect(screen.getByText(/low resolution/i)).toBeInTheDocument()
    })

    test('displays errors section with error items', () => {
      // ARRANGE
      const errors: TransferError[] = [
        { file: 'video1.MOV', error: new Error('Insufficient disk space'), phase: 'transfer' },
        { file: 'photo1.JPG', error: new Error('Permission denied'), phase: 'transfer' }
      ]

      // ACT
      render(<ValidationResults warnings={[]} errors={errors} />)

      // ASSERT
      expect(screen.getByText(/errors/i)).toBeInTheDocument()
      expect(screen.getByText(/video1\.MOV/i)).toBeInTheDocument()
      expect(screen.getByText(/insufficient disk space/i)).toBeInTheDocument()
      expect(screen.getByText(/photo1\.JPG/i)).toBeInTheDocument()
      expect(screen.getByText(/permission denied/i)).toBeInTheDocument()
    })

    test('displays both warnings and errors sections', () => {
      // ARRANGE
      const warnings: ValidationWarning[] = [
        { file: 'IMG_001.jpg', message: 'Minor issue', severity: 'low' }
      ]
      const errors: TransferError[] = [
        { file: 'video1.MOV', error: new Error('Critical failure'), phase: 'transfer' }
      ]

      // ACT
      render(<ValidationResults warnings={warnings} errors={errors} />)

      // ASSERT
      expect(screen.getByText(/warnings/i)).toBeInTheDocument()
      expect(screen.getByText(/errors/i)).toBeInTheDocument()
      expect(screen.getByText(/minor issue/i)).toBeInTheDocument()
      expect(screen.getByText(/critical failure/i)).toBeInTheDocument()
    })

    test('handles error with missing file property', () => {
      // ARRANGE
      const errors: TransferError[] = [
        { file: '', error: new Error('Unknown error'), phase: 'scan' }
      ]

      // ACT
      render(<ValidationResults warnings={[]} errors={errors} />)

      // ASSERT: Shows "Unknown" when file is empty
      expect(screen.getByText(/unknown:/i)).toBeInTheDocument()
      expect(screen.getByText(/unknown error/i)).toBeInTheDocument()
    })
  })

  describe('Styling', () => {
    test('warnings have yellow background styling', () => {
      // ARRANGE
      const warnings: ValidationWarning[] = [
        { file: 'test.jpg', message: 'Warning message', severity: 'medium' }
      ]

      // ACT
      const { container } = render(<ValidationResults warnings={warnings} errors={[]} />)

      // ASSERT: Warning div has yellow background color
      const warningDiv = container.querySelector('div[style*="background-color: rgb(255, 243, 205)"]')
      expect(warningDiv).toBeInTheDocument()
    })

    test('errors have red background styling', () => {
      // ARRANGE
      const errors: TransferError[] = [
        { file: 'test.mov', error: new Error('Error message'), phase: 'transfer' }
      ]

      // ACT
      const { container } = render(<ValidationResults warnings={[]} errors={errors} />)

      // ASSERT: Error div has red background color
      const errorDiv = container.querySelector('div[style*="background-color: rgb(248, 215, 218)"]')
      expect(errorDiv).toBeInTheDocument()
    })
  })
})
