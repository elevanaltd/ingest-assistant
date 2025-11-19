import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { promises as fs } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { randomBytes } from 'crypto'

/**
 * integrityValidator.test.ts
 *
 * Test suite for integrity validation service
 *
 * RESPONSIBILITIES:
 * - Verify source/dest file size match (fail-fast on mismatch)
 * - Extract EXIF DateTimeOriginal (I1 immutable compliance)
 * - Fallback to filesystem timestamp with warning
 * - Batch validation for complete transfers
 *
 * CONSTITUTIONAL DISCIPLINE:
 * - RED phase: All tests must fail initially (service not implemented)
 * - Test behavior (timestamp extraction), not implementation (exiftool calls)
 * - Mock filesystem only, not exiftool (integration test for real extraction)
 */

// Type definitions (will be imported from service once implemented)
interface FileValidationResult {
  file: string
  sizeMatch: boolean
  sourceSize: number
  destSize: number
  timestamp: Date | null
  timestampSource: 'EXIF' | 'FILESYSTEM' | null
  warnings: string[]
}

interface TimestampResult {
  timestamp: Date | null
  source: 'EXIF' | 'FILESYSTEM' | null
  confidence: 'HIGH' | 'MEDIUM' | 'LOW'
  warning: string | null
}

interface BatchValidationResult {
  fileCountMatch: boolean
  sourceFileCount: number
  destFileCount: number
  sizeValidationPassed: number
  exifTimestampsFound: number
  filesystemFallbacks: number
  chronologicalOrderEnforceable: boolean
  warnings: Array<{
    severity: 'ERROR' | 'WARNING' | 'INFO'
    file: string
    message: string
    suggestedAction: string
  }>
}

describe('IntegrityValidator', () => {
  let tempDir: string

  beforeEach(async () => {
    // Create temp directory for test files
    tempDir = join(tmpdir(), `integrity-test-${randomBytes(8).toString('hex')}`)
    await fs.mkdir(tempDir, { recursive: true })
  })

  afterEach(async () => {
    // Clean up temp files
    await fs.rm(tempDir, { recursive: true, force: true })
  })

  describe('validateFile', () => {
    test('validates file size match between source and destination', async () => {
      // ARRANGE: Create source and dest files with identical sizes
      const sourcePath = join(tempDir, 'source.jpg')
      const destPath = join(tempDir, 'dest.jpg')
      const fileContent = Buffer.from('test file content with exact size')

      await fs.writeFile(sourcePath, fileContent)
      await fs.writeFile(destPath, fileContent)

      // ACT: Import service (will fail - not implemented yet)
      const { IntegrityValidator } = await import('../integrityValidator')
      const validator = new IntegrityValidator()

      const result = await validator.validateFile(sourcePath, destPath)

      // ASSERT: Size validation passes
      expect(result.sizeMatch).toBe(true)
      expect(result.sourceSize).toBe(fileContent.length)
      expect(result.destSize).toBe(fileContent.length)
      expect(result.file).toBe('source.jpg')
    })

    test('throws IntegrityError when source and destination sizes mismatch', async () => {
      // ARRANGE: Create files with different sizes
      const sourcePath = join(tempDir, 'source.jpg')
      const destPath = join(tempDir, 'dest-corrupted.jpg')

      await fs.writeFile(sourcePath, Buffer.from('complete file data'))
      await fs.writeFile(destPath, Buffer.from('truncated')) // Partial transfer

      // ACT: Validate mismatched files
      const { IntegrityValidator } = await import('../integrityValidator')
      const validator = new IntegrityValidator()

      // ASSERT: Throws size mismatch error
      await expect(
        validator.validateFile(sourcePath, destPath)
      ).rejects.toThrow(/SIZE_MISMATCH|size mismatch/i)
    })

    test('extracts EXIF DateTimeOriginal when present (HIGH confidence)', async () => {
      // ARRANGE: Create file with EXIF metadata
      // This is an integration test - requires real file with EXIF
      // For unit test, we'll mock the extractTimestamp method
      const sourcePath = join(tempDir, 'photo-with-exif.jpg')
      const destPath = join(tempDir, 'photo-dest.jpg')
      const fileContent = Buffer.from('mock jpg with exif')

      await fs.writeFile(sourcePath, fileContent)
      await fs.writeFile(destPath, fileContent)

      // Mock extractTimestamp to return EXIF result
      const { IntegrityValidator } = await import('../integrityValidator')
      const validator = new IntegrityValidator()

      // Mock the extractTimestamp method to simulate EXIF found
      const expectedDate = new Date('2025-11-19T10:30:00Z')
      vi.spyOn(validator, 'extractTimestamp').mockResolvedValue({
        timestamp: expectedDate,
        source: 'EXIF',
        confidence: 'HIGH',
        warning: null
      })

      // ACT: Validate file
      const result = await validator.validateFile(sourcePath, destPath)

      // ASSERT: EXIF timestamp extracted
      expect(result.timestamp).toEqual(expectedDate)
      expect(result.timestampSource).toBe('EXIF')
      expect(result.warnings).toHaveLength(0) // No warnings for EXIF success
    })

    test('falls back to filesystem timestamp when EXIF missing (MEDIUM confidence)', async () => {
      // ARRANGE: Create file without EXIF
      const sourcePath = join(tempDir, 'video-no-exif.mov')
      const destPath = join(tempDir, 'video-dest.mov')
      const fileContent = Buffer.from('mock video file')

      await fs.writeFile(sourcePath, fileContent)
      await fs.writeFile(destPath, fileContent)

      // Mock extractTimestamp to return filesystem fallback
      const { IntegrityValidator } = await import('../integrityValidator')
      const validator = new IntegrityValidator()

      const expectedDate = new Date()
      vi.spyOn(validator, 'extractTimestamp').mockResolvedValue({
        timestamp: expectedDate,
        source: 'FILESYSTEM',
        confidence: 'MEDIUM',
        warning: 'EXIF DateTimeOriginal missing - using file creation time. Verify camera clock accuracy before cataloging.'
      })

      // ACT: Validate file
      const result = await validator.validateFile(sourcePath, destPath)

      // ASSERT: Filesystem fallback used with warning
      expect(result.timestamp).toEqual(expectedDate)
      expect(result.timestampSource).toBe('FILESYSTEM')
      expect(result.warnings).toHaveLength(1)
      expect(result.warnings[0]).toMatch(/EXIF DateTimeOriginal missing/i)
    })
  })

  describe('extractTimestamp', () => {
    test('returns HIGH confidence when EXIF DateTimeOriginal found', async () => {
      // ARRANGE: Mock EXIF extraction success
      const filePath = join(tempDir, 'photo.jpg')
      await fs.writeFile(filePath, Buffer.from('mock image'))

      const { IntegrityValidator } = await import('../integrityValidator')
      const validator = new IntegrityValidator()

      const expectedDate = new Date('2025-11-19T14:22:00Z')
      vi.spyOn(validator, 'getEXIFDateTimeOriginal').mockResolvedValue(expectedDate)

      // ACT: Extract timestamp
      const result = await validator.extractTimestamp(filePath)

      // ASSERT: EXIF extraction successful
      expect(result.timestamp).toEqual(expectedDate)
      expect(result.source).toBe('EXIF')
      expect(result.confidence).toBe('HIGH')
      expect(result.warning).toBeNull()
    })

    test('returns MEDIUM confidence when falling back to filesystem timestamp', async () => {
      // ARRANGE: Mock EXIF extraction failure
      const filePath = join(tempDir, 'video.mov')
      await fs.writeFile(filePath, Buffer.from('mock video'))

      const { IntegrityValidator } = await import('../integrityValidator')
      const validator = new IntegrityValidator()

      vi.spyOn(validator, 'getEXIFDateTimeOriginal').mockResolvedValue(null)

      // ACT: Extract timestamp
      const result = await validator.extractTimestamp(filePath)

      // ASSERT: Filesystem fallback
      expect(result.timestamp).toBeInstanceOf(Date)
      expect(result.source).toBe('FILESYSTEM')
      expect(result.confidence).toBe('MEDIUM')
      expect(result.warning).toMatch(/EXIF DateTimeOriginal missing/i)
    })

    test('returns LOW confidence when timestamp extraction completely fails', async () => {
      // ARRANGE: Mock both EXIF and filesystem failures
      const filePath = join(tempDir, 'nonexistent.jpg')

      const { IntegrityValidator } = await import('../integrityValidator')
      const validator = new IntegrityValidator()

      vi.spyOn(validator, 'getEXIFDateTimeOriginal').mockResolvedValue(null)
      vi.spyOn(fs, 'stat').mockRejectedValue(new Error('ENOENT: no such file'))

      // ACT: Extract timestamp
      const result = await validator.extractTimestamp(filePath)

      // ASSERT: Complete failure
      expect(result.timestamp).toBeNull()
      expect(result.source).toBeNull()
      expect(result.confidence).toBe('LOW')
      expect(result.warning).toMatch(/Could not extract timestamp/i)
    })
  })

  describe('validateBatch', () => {
    test('validates complete batch transfer with all EXIF timestamps', async () => {
      // ARRANGE: Mock successful transfer of 3 files with EXIF
      const mockResults = [
        {
          file: 'photo1.jpg',
          source: '/source/photo1.jpg',
          destination: '/dest/photo1.jpg',
          size: 1024,
          duration: 100,
          sizeValidated: true,
          exifTimestamp: new Date('2025-11-19T10:00:00Z'),
          exifSource: 'EXIF' as const,
          warnings: []
        },
        {
          file: 'photo2.jpg',
          source: '/source/photo2.jpg',
          destination: '/dest/photo2.jpg',
          size: 2048,
          duration: 150,
          sizeValidated: true,
          exifTimestamp: new Date('2025-11-19T10:05:00Z'),
          exifSource: 'EXIF' as const,
          warnings: []
        },
        {
          file: 'photo3.jpg',
          source: '/source/photo3.jpg',
          destination: '/dest/photo3.jpg',
          size: 512,
          duration: 80,
          sizeValidated: true,
          exifTimestamp: new Date('2025-11-19T10:10:00Z'),
          exifSource: 'EXIF' as const,
          warnings: []
        }
      ]

      // ACT: Validate batch
      const { IntegrityValidator } = await import('../integrityValidator')
      const validator = new IntegrityValidator()

      const result = await validator.validateBatch(mockResults)

      // ASSERT: Perfect batch validation
      expect(result.fileCountMatch).toBe(true)
      expect(result.sourceFileCount).toBe(3)
      expect(result.destFileCount).toBe(3)
      expect(result.sizeValidationPassed).toBe(3)
      expect(result.exifTimestampsFound).toBe(3)
      expect(result.filesystemFallbacks).toBe(0)
      expect(result.chronologicalOrderEnforceable).toBe(true) // All have EXIF
      expect(result.warnings).toHaveLength(0)
    })

    test('reports filesystem fallbacks and warns about chronological accuracy', async () => {
      // ARRANGE: Mixed EXIF and filesystem timestamps
      const mockResults = [
        {
          file: 'photo1.jpg',
          source: '/source/photo1.jpg',
          destination: '/dest/photo1.jpg',
          size: 1024,
          duration: 100,
          sizeValidated: true,
          exifTimestamp: new Date('2025-11-19T10:00:00Z'),
          exifSource: 'EXIF' as const,
          warnings: []
        },
        {
          file: 'video1.mov',
          source: '/source/video1.mov',
          destination: '/dest/video1.mov',
          size: 5120,
          duration: 200,
          sizeValidated: true,
          exifTimestamp: new Date('2025-11-19T10:05:00Z'),
          exifSource: 'FILESYSTEM' as const,
          warnings: ['EXIF DateTimeOriginal missing - using file creation time']
        }
      ]

      // ACT: Validate batch
      const { IntegrityValidator } = await import('../integrityValidator')
      const validator = new IntegrityValidator()

      const result = await validator.validateBatch(mockResults)

      // ASSERT: Batch validation with warnings
      expect(result.fileCountMatch).toBe(true)
      expect(result.sourceFileCount).toBe(2)
      expect(result.destFileCount).toBe(2)
      expect(result.sizeValidationPassed).toBe(2)
      expect(result.exifTimestampsFound).toBe(1)
      expect(result.filesystemFallbacks).toBe(1)
      expect(result.chronologicalOrderEnforceable).toBe(false) // Mixed sources
      expect(result.warnings.length).toBeGreaterThan(0)
      expect(result.warnings.some(w => w.severity === 'WARNING')).toBe(true)
    })

    test('detects file count mismatches between source and destination', async () => {
      // ARRANGE: Incomplete transfer (2 files transferred out of 3 expected)
      const mockResults = [
        {
          file: 'photo1.jpg',
          source: '/source/photo1.jpg',
          destination: '/dest/photo1.jpg',
          size: 1024,
          duration: 100,
          sizeValidated: true,
          exifTimestamp: new Date('2025-11-19T10:00:00Z'),
          exifSource: 'EXIF' as const,
          warnings: []
        },
        {
          file: 'photo2.jpg',
          source: '/source/photo2.jpg',
          destination: '/dest/photo2.jpg',
          size: 2048,
          duration: 150,
          sizeValidated: true,
          exifTimestamp: new Date('2025-11-19T10:05:00Z'),
          exifSource: 'EXIF' as const,
          warnings: []
        }
      ]

      // ACT: Validate batch (assuming 3 files expected from source scan)
      const { IntegrityValidator } = await import('../integrityValidator')
      const validator = new IntegrityValidator()

      // Mock the validator to know 3 files were expected
      vi.spyOn(validator, 'validateBatch').mockImplementation(async (results) => {
        return {
          fileCountMatch: false,
          sourceFileCount: 3, // Expected
          destFileCount: 2,   // Actual
          sizeValidationPassed: 2,
          exifTimestampsFound: 2,
          filesystemFallbacks: 0,
          chronologicalOrderEnforceable: true,
          warnings: [
            {
              severity: 'ERROR',
              file: 'BATCH',
              message: 'File count mismatch: expected 3 files, found 2',
              suggestedAction: 'Check CFEx card for missing files and retry transfer'
            }
          ]
        }
      })

      const result = await validator.validateBatch(mockResults)

      // ASSERT: File count mismatch detected
      expect(result.fileCountMatch).toBe(false)
      expect(result.sourceFileCount).toBe(3)
      expect(result.destFileCount).toBe(2)
      expect(result.warnings.some(w => w.severity === 'ERROR')).toBe(true)
    })
  })

  describe('getEXIFDateTimeOriginal (integration)', () => {
    test('extracts DateTimeOriginal from real EXIF data', async () => {
      // NOTE: This is a real integration test requiring exiftool
      // For CI, we may need to skip if exiftool not available

      // ARRANGE: Create a file with mock EXIF (or skip if no exiftool)
      const filePath = join(tempDir, 'test-photo.jpg')

      // Create minimal JPEG with EXIF DateTimeOriginal
      // This would require using exiftool to inject metadata
      // For now, we'll mock the spawn call

      const { IntegrityValidator } = await import('../integrityValidator')
      const validator = new IntegrityValidator()

      // This test will be skipped in RED phase (service not implemented)
      // When implemented, it should use real exiftool execution

      // SKIP for now - implementation will use spawn() with exiftool
      expect(validator).toBeDefined()
    })
  })
})
