import { promises as fs } from 'fs'
import { basename } from 'path'
import { spawn } from 'child_process'

/**
 * integrityValidator.ts
 *
 * Validates file transfer completeness and chronological temporal ordering
 * through size checks and EXIF DateTimeOriginal extraction.
 *
 * IMMUTABLES (I1 Compliance):
 * - EXIF DateTimeOriginal = camera capture time (immutable)
 * - Used for chronological shot numbering (#1, #2, #3...)
 * - Fallback to filesystem timestamp ONLY when EXIF missing (with warning)
 *
 * RESPONSIBILITIES:
 * 1. Verify source/dest file sizes match (fail-fast on mismatch)
 * 2. Extract EXIF DateTimeOriginal using exiftool
 * 3. Fallback to filesystem birthtime when EXIF unavailable
 * 4. Batch validation for complete transfer verification
 *
 * CONSTITUTIONAL DISCIPLINE:
 * - Minimal implementation (essential complexity only)
 * - System ripple: CfexTransferService → IPC handlers → UI error display
 * - Behavior tests, not implementation tests (test outcomes, not exiftool calls)
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface FileValidationResult {
  file: string
  sizeMatch: boolean
  sourceSize: number
  destSize: number
  timestamp: Date | null
  timestampSource: 'EXIF' | 'FILESYSTEM' | null
  warnings: string[]
}

export interface TimestampResult {
  timestamp: Date | null
  source: 'EXIF' | 'FILESYSTEM' | null
  confidence: 'HIGH' | 'MEDIUM' | 'LOW'
  warning: string | null
}

export interface BatchValidationResult {
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

export interface FileTransferResult {
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

// ============================================================================
// CUSTOM ERRORS
// ============================================================================

export class IntegrityError extends Error {
  constructor(
    public readonly code: string,
    public readonly file: string,
    public readonly sourceSize: number,
    public readonly destSize: number,
    message: string
  ) {
    super(message)
    this.name = 'IntegrityError'
  }
}

// ============================================================================
// INTEGRITY VALIDATOR
// ============================================================================

export class IntegrityValidator {
  /**
   * Validates a single file transfer by checking size match and extracting timestamp.
   *
   * FAIL-FAST: Throws IntegrityError if sizes don't match
   * SUCCESS: Returns validation result with timestamp and warnings
   *
   * @param source - Path to source file
   * @param dest - Path to destination file
   * @returns FileValidationResult with size match, timestamp, and warnings
   * @throws IntegrityError if source/dest sizes mismatch
   */
  async validateFile(source: string, dest: string): Promise<FileValidationResult> {
    // Step 1: Get file stats
    const [sourceStat, destStat] = await Promise.all([
      fs.stat(source),
      fs.stat(dest)
    ])

    // Step 2: Verify size match (FAIL-FAST)
    const sizeMatch = sourceStat.size === destStat.size

    if (!sizeMatch) {
      throw new IntegrityError(
        'SIZE_MISMATCH',
        basename(source),
        sourceStat.size,
        destStat.size,
        `Size mismatch: source=${sourceStat.size}, dest=${destStat.size}`
      )
    }

    // Step 3: Extract timestamp (EXIF with fallback)
    const timestampResult = await this.extractTimestamp(dest)

    // Step 4: Collect warnings
    const warnings: string[] = []
    if (timestampResult.warning) {
      warnings.push(timestampResult.warning)
    }

    return {
      file: basename(source),
      sizeMatch: true,
      sourceSize: sourceStat.size,
      destSize: destStat.size,
      timestamp: timestampResult.timestamp,
      timestampSource: timestampResult.source,
      warnings
    }
  }

  /**
   * Extracts timestamp from file using EXIF DateTimeOriginal with filesystem fallback.
   *
   * PRIORITY:
   * 1. EXIF DateTimeOriginal (HIGH confidence) - camera capture time
   * 2. Filesystem birthtime (MEDIUM confidence) - file creation time
   * 3. null (LOW confidence) - extraction failed completely
   *
   * @param filePath - Path to file for timestamp extraction
   * @returns TimestampResult with timestamp, source, confidence, and warning
   */
  async extractTimestamp(filePath: string): Promise<TimestampResult> {
    // Attempt 1: EXIF DateTimeOriginal (preferred)
    try {
      const exifDate = await this.getEXIFDateTimeOriginal(filePath)

      if (exifDate) {
        return {
          timestamp: exifDate,
          source: 'EXIF',
          confidence: 'HIGH',
          warning: null
        }
      }
    } catch (error) {
      // EXIF extraction failed - continue to filesystem fallback
      console.warn(`EXIF extraction failed for ${filePath}:`, error)
    }

    // Attempt 2: Filesystem birthtime (fallback)
    try {
      const stat = await fs.stat(filePath)

      return {
        timestamp: stat.birthtime,
        source: 'FILESYSTEM',
        confidence: 'MEDIUM',
        warning: 'EXIF DateTimeOriginal missing - using file creation time. Verify camera clock accuracy before cataloging.'
      }
    } catch (error) {
      // Both attempts failed
      return {
        timestamp: null,
        source: null,
        confidence: 'LOW',
        warning: 'Could not extract timestamp from file. Manual timestamp correction required.'
      }
    }
  }

  /**
   * Extracts EXIF DateTimeOriginal using exiftool.
   *
   * SECURITY:
   * - Uses spawn({shell: false}) to prevent shell injection
   * - No shell metacharacters allowed in file paths
   *
   * @param filePath - Path to file for EXIF extraction
   * @returns Date from EXIF DateTimeOriginal, or null if not found
   */
  async getEXIFDateTimeOriginal(filePath: string): Promise<Date | null> {
    return new Promise((resolve, reject) => {
      const exiftool = spawn('exiftool', [
        '-DateTimeOriginal',
        '-s3', // Short format (value only)
        filePath
      ], {
        shell: false // SECURITY: Prevent shell injection
      })

      let stdout = ''
      let stderr = ''

      exiftool.stdout.on('data', (data: Buffer) => {
        stdout += data.toString()
      })

      exiftool.stderr.on('data', (data: Buffer) => {
        stderr += data.toString()
      })

      exiftool.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`exiftool failed with code ${code}: ${stderr}`))
          return
        }

        const trimmed = stdout.trim()

        // No EXIF DateTimeOriginal found
        if (!trimmed || trimmed === '-') {
          resolve(null)
          return
        }

        // Parse EXIF date format: "YYYY:MM:DD HH:MM:SS"
        try {
          const parsed = this.parseEXIFDate(trimmed)
          resolve(parsed)
        } catch (error) {
          reject(error)
        }
      })

      exiftool.on('error', (error) => {
        reject(new Error(`Failed to spawn exiftool: ${error.message}`))
      })
    })
  }

  /**
   * Parses EXIF date string to JavaScript Date.
   *
   * EXIF Format: "YYYY:MM:DD HH:MM:SS"
   * Output: JavaScript Date object
   *
   * @param exifDateString - EXIF DateTimeOriginal string
   * @returns Parsed Date object
   * @throws Error if parsing fails
   */
  private parseEXIFDate(exifDateString: string): Date {
    // EXIF format: "2025:11:19 14:22:30"
    const match = exifDateString.match(/^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})$/)

    if (!match) {
      throw new Error(`Invalid EXIF date format: ${exifDateString}`)
    }

    const [, year, month, day, hour, minute, second] = match

    // Month is 0-indexed in JavaScript Date
    return new Date(
      parseInt(year),
      parseInt(month) - 1,
      parseInt(day),
      parseInt(hour),
      parseInt(minute),
      parseInt(second)
    )
  }

  /**
   * Validates a batch of transferred files.
   *
   * Checks:
   * - File count match (source vs destination)
   * - Size validation pass rate
   * - EXIF vs filesystem timestamp ratio
   * - Chronological ordering enforceability
   *
   * @param results - Array of FileTransferResult from transfer
   * @returns BatchValidationResult with counts and warnings
   */
  async validateBatch(results: FileTransferResult[]): Promise<BatchValidationResult> {
    const destFileCount = results.length
    const sourceFileCount = results.length // Assume same for now (TODO: accept expected count)

    const sizeValidationPassed = results.filter(r => r.sizeValidated).length
    const exifTimestampsFound = results.filter(r => r.exifSource === 'EXIF').length
    const filesystemFallbacks = results.filter(r => r.exifSource === 'FILESYSTEM').length

    // Chronological ordering enforceable if ALL timestamps from same source
    const chronologicalOrderEnforceable = exifTimestampsFound === destFileCount ||
      filesystemFallbacks === destFileCount

    const warnings: Array<{
      severity: 'ERROR' | 'WARNING' | 'INFO'
      file: string
      message: string
      suggestedAction: string
    }> = []

    // File count mismatch
    if (sourceFileCount !== destFileCount) {
      warnings.push({
        severity: 'ERROR',
        file: 'BATCH',
        message: `File count mismatch: expected ${sourceFileCount} files, found ${destFileCount}`,
        suggestedAction: 'Check CFEx card for missing files and retry transfer'
      })
    }

    // Mixed timestamp sources
    if (!chronologicalOrderEnforceable && filesystemFallbacks > 0) {
      warnings.push({
        severity: 'WARNING',
        file: 'BATCH',
        message: `Mixed timestamp sources detected (${exifTimestampsFound} EXIF, ${filesystemFallbacks} filesystem). Chronological accuracy may vary.`,
        suggestedAction: 'Review files with filesystem timestamps and verify camera clock settings'
      })
    }

    return {
      fileCountMatch: sourceFileCount === destFileCount,
      sourceFileCount,
      destFileCount,
      sizeValidationPassed,
      exifTimestampsFound,
      filesystemFallbacks,
      chronologicalOrderEnforceable,
      warnings
    }
  }
}
