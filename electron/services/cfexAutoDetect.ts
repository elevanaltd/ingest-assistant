/**
 * CFEx Card Auto-Detection Service
 *
 * REFACTOR PHASE - Architectural compliance fixes
 * - Async I/O throughout (fs/promises pattern)
 * - Timeout protection for network volumes
 * - Explicit error handling (EACCES/ENOENT/ETIMEDOUT)
 */

import * as fs from 'fs/promises'
import * as os from 'os'
import * as path from 'path'

export interface CfexDestinations {
  photos: string;
  rawVideos: string;
}

/**
 * Default fallback paths when mounts not detected
 */
const DEFAULT_PATHS = {
  photos: '/default/photos',
  rawVideos: '/default/rawVideos'
} as const

export class CfexAutoDetect {
  /**
   * Detect CFEx cards mounted on the system
   * Platform-aware: macOS scans /Volumes/, Ubuntu scans /media/ + /run/media/
   *
   * @returns Array of CFEx card mount paths (e.g., ['/Volumes/NO NAME/'])
   *
   * REFACTOR PHASE: Async I/O with timeout protection
   */
  async detectCfexCards(): Promise<string[]> {
    const platform = os.platform()

    try {
      if (platform === 'darwin') {
        // macOS: Scan /Volumes/ for "NO NAME" directories with timeout
        return await this.detectWithTimeout('/Volumes/', ['NO NAME'], 10000)
      } else if (platform === 'linux') {
        // Ubuntu: Scan both /media/$USER/ and /run/media/$USER/.
        // Use content-based detection (DCIM/100_FUJI presence) rather than
        // volume label matching — Fuji cards mount as "disk", "disk1", etc.
        const username = path.basename(os.homedir())
        const mediaPath = `/media/${username}/`
        const runMediaPath = `/run/media/${username}/`

        // Use allSettled so a failure (EACCES/ETIMEDOUT) on one media root
        // cannot discard cards already found on the other root.
        const settled = await Promise.allSettled([
          this.detectFujiCardsWithTimeout(mediaPath, 10000),
          this.detectFujiCardsWithTimeout(runMediaPath, 10000)
        ])

        const cards: string[] = []
        for (const outcome of settled) {
          if (outcome.status === 'fulfilled') {
            cards.push(...outcome.value)
          } else {
            const reason = outcome.reason
            console.warn(
              `CFEx Fuji scan failed for a media root: ${reason instanceof Error ? reason.message : String(reason)}`
            )
          }
        }

        return cards
      }

      return []
    } catch (error: unknown) {
      // Type guard for Node.js error codes
      const nodeError = error as NodeJS.ErrnoException

      if (nodeError?.code === 'EACCES') {
        // Graceful: Log permission error and return empty (let user manually select)
        console.warn(`Permission denied accessing volume directories. Check system permissions.`)
        return []
      }

      if (error instanceof Error && error.message.includes('timeout')) {
        console.warn(`Volume scan timeout: ${error.message}`)
        return [] // Graceful: treat timeout as "no cards found"
      }

      // Other errors: Log warning and return empty (graceful degradation)
      console.warn(`Error detecting CFEx cards: ${error instanceof Error ? error.message : String(error)}`)
      return []
    }
  }

  /**
   * Detect CFEx cards with timeout protection for network volumes
   *
   * @private
   * @param dirPath - Directory to scan
   * @param targetNames - Card names to match
   * @param timeoutMs - Timeout in milliseconds (10s for network volumes)
   * @returns Array of matched card paths
   */
  private async detectWithTimeout(
    dirPath: string,
    targetNames: string[],
    timeoutMs: number
  ): Promise<string[]> {
    return new Promise<string[]>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(Object.assign(
          new Error(`Volume scan timeout: ${dirPath}`),
          { code: 'ETIMEDOUT' }
        ))
      }, timeoutMs)

      this.scanDirectory(dirPath, targetNames)
        .then(result => {
          clearTimeout(timer)
          resolve(result)
        })
        .catch(err => {
          clearTimeout(timer)
          reject(err)
        })
    })
  }

  /**
   * Detect default destination paths for photos and raw videos
   *
   * @returns Object with photos and rawVideos paths
   *
   * REFACTOR PHASE: Async I/O with explicit error handling
   */
  async detectDestinations(): Promise<CfexDestinations> {
    const platform = os.platform()

    try {
      if (platform === 'darwin') {
        // macOS: Look for LucidLink and Ubuntu mounts in /Volumes/
        const volumes = await fs.readdir('/Volumes/')

        const photosMount = volumes.find(v => v === 'LucidLink')
        const rawVideosMount = volumes.find(v => v === 'Ubuntu')

        return {
          photos: photosMount ? `/Volumes/${photosMount}/` : DEFAULT_PATHS.photos,
          rawVideos: rawVideosMount ? `/Volumes/${rawVideosMount}/` : DEFAULT_PATHS.rawVideos
        }
      }

      // Other platforms: Use defaults
      return DEFAULT_PATHS
    } catch (error: unknown) {
      // Type guard for Node.js error codes
      const nodeError = error as NodeJS.ErrnoException

      if (nodeError?.code === 'EACCES') {
        throw new Error(`Permission denied accessing /Volumes/. Check system permissions.`)
      }

      if (nodeError?.code === 'ENOENT') {
        console.warn('/Volumes/ directory not found (non-macOS system?)')
        return DEFAULT_PATHS
      }

      // Other errors: Log warning and return defaults (graceful degradation)
      console.warn(`Error detecting destinations: ${error instanceof Error ? error.message : String(error)}`)
      return DEFAULT_PATHS
    }
  }

  /**
   * Determine if UI should auto-populate based on number of cards detected
   *
   * @param cards - Array of detected CFEx card paths
   * @returns true if exactly 1 card detected, false otherwise
   *
   * GREEN PHASE: Minimal implementation to pass tests
   */
  shouldAutoPopulate(cards: string[]): boolean {
    return cards.length === 1
  }

  /**
   * Get the selected card from array
   *
   * @param cards - Array of detected CFEx card paths
   * @returns First card in array
   *
   * GREEN PHASE: Minimal implementation to pass tests
   */
  getSelectedCard(cards: string[]): string {
    return cards[0]
  }

  /**
   * Check if a path is accessible (exists and readable)
   *
   * @param checkPath - Path to validate
   * @returns true if accessible, false otherwise
   *
   * REFACTOR PHASE: Async I/O with explicit error handling
   */
  async isPathAccessible(checkPath: string): Promise<boolean> {
    try {
      await fs.stat(checkPath)
      return true
    } catch (error: unknown) {
      // Type guard for Node.js error codes
      const nodeError = error as NodeJS.ErrnoException

      if (nodeError?.code === 'EACCES' || nodeError?.code === 'ENOENT') {
        return false // Expected: permission denied or not found
      }

      // Unexpected errors: Log for debugging
      console.warn(`Unexpected error checking path ${checkPath}: ${error instanceof Error ? error.message : String(error)}`)
      return false
    }
  }

  /**
   * Detect Fuji CFEx cards in a directory using content-based detection with timeout.
   * Checks for DCIM/100_FUJI presence rather than matching volume label.
   */
  private async detectFujiCardsWithTimeout(dirPath: string, timeoutMs: number): Promise<string[]> {
    return new Promise<string[]>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(Object.assign(
          new Error(`Volume scan timeout: ${dirPath}`),
          { code: 'ETIMEDOUT' }
        ))
      }, timeoutMs)

      this.scanForFujiCards(dirPath)
        .then(result => {
          clearTimeout(timer)
          resolve(result)
        })
        .catch(err => {
          clearTimeout(timer)
          reject(err)
        })
    })
  }

  /**
   * Matches a Fujifilm DCF image folder name.
   *
   * DCF folders roll over as they fill: 100_FUJI → 101_FUJI → 102_FUJI ... (at
   * 999 files, and continuously across camera bodies). Hard-coding 100_FUJI
   * silently false-negatives the common reused/high-count card, so we match ANY
   * three-digit NNN_FUJI folder.
   */
  private static readonly FUJI_DCF_FOLDER = /^\d{3}_FUJI$/

  /**
   * Scan a directory for Fuji CFEx cards by checking the DCIM folder for any
   * NNN_FUJI subdirectory. Returns mount paths where the Fuji directory
   * structure is present, regardless of the volume label (handles "disk",
   * "disk1", "NO NAME", etc.).
   */
  private async scanForFujiCards(dirPath: string): Promise<string[]> {
    try {
      const entries = await fs.readdir(dirPath)
      const results = await Promise.all(
        entries.map(async (entry) => {
          const mountPath = path.join(dirPath, entry)
          const dcimPath = path.join(mountPath, 'DCIM')
          try {
            // withFileTypes lets us both enumerate NNN_FUJI folders (rollover)
            // and guard that the match is a directory, not a regular file.
            const dcimEntries = await fs.readdir(dcimPath, { withFileTypes: true })
            const hasFujiFolder = dcimEntries.some(
              (dirent) =>
                dirent.isDirectory() &&
                CfexAutoDetect.FUJI_DCF_FOLDER.test(dirent.name)
            )
            return hasFujiFolder ? mountPath : null
          } catch {
            // No DCIM directory (or unreadable) → not a detectable Fuji card.
            return null
          }
        })
      )
      return results.filter((p): p is string => p !== null)
    } catch (error: unknown) {
      const nodeError = error as NodeJS.ErrnoException

      if (nodeError?.code === 'EACCES') {
        throw Object.assign(
          new Error(`Permission denied scanning ${dirPath}. Check volume mount permissions.`),
          { code: 'EACCES' }
        )
      }

      if (nodeError?.code === 'ENOENT') {
        return []
      }

      if (nodeError?.code === 'EIO') {
        console.warn(`I/O error scanning ${dirPath}`)
        return []
      }

      throw error
    }
  }

  /**
   * Scan a directory for CFEx cards matching target names
   *
   * @private
   * @param dirPath - Directory to scan
   * @param targetNames - Array of directory names to match (e.g., ['NO NAME', 'CFEx'])
   * @returns Array of full paths to matched directories
   */
  private async scanDirectory(dirPath: string, targetNames: string[]): Promise<string[]> {
    try {
      const entries = await fs.readdir(dirPath)

      return entries
        .filter(entry => targetNames.includes(entry))
        .map(entry => {
          // macOS convention: /Volumes/ paths get trailing slash
          // Ubuntu convention: /media/ and /run/media/ paths NO trailing slash
          const fullPath = path.join(dirPath, entry)

          // Add trailing slash only for macOS /Volumes/ paths
          if (dirPath === '/Volumes/') {
            return fullPath.endsWith('/') ? fullPath : `${fullPath}/`
          }

          return fullPath
        })
    } catch (error: unknown) {
      // Type guard for Node.js error codes
      const nodeError = error as NodeJS.ErrnoException

      if (nodeError?.code === 'EACCES') {
        throw Object.assign(
          new Error(`Permission denied scanning ${dirPath}. Check volume mount permissions.`),
          { code: 'EACCES' }
        )
      }

      if (nodeError?.code === 'ENOENT') {
        return [] // Graceful: path doesn't exist (expected for /media on macOS)
      }

      if (nodeError?.code === 'EIO') {
        console.warn(`I/O error scanning ${dirPath}`)
        return [] // Graceful: I/O error (network timeout, disconnected device)
      }

      // Programmer errors or unexpected failures bubble up
      throw error
    }
  }
}
