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
        // Ubuntu: Scan both /media/$USER/ and /run/media/$USER/ with timeouts
        const username = path.basename(os.homedir())
        const mediaPath = `/media/${username}/`
        const runMediaPath = `/run/media/${username}/`

        const results = await Promise.all([
          this.detectWithTimeout(mediaPath, ['CFEx'], 10000),
          this.detectWithTimeout(runMediaPath, ['CFEx'], 10000)
        ])

        return [...results[0], ...results[1]]
      }

      return []
    } catch (error: unknown) {
      // Type guard for Node.js error codes
      const nodeError = error as NodeJS.ErrnoException

      if (nodeError?.code === 'EACCES') {
        throw new Error(`Permission denied accessing volume directories. Check system permissions.`)
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
    return Promise.race([
      this.scanDirectory(dirPath, targetNames),
      new Promise<string[]>((_, reject) =>
        setTimeout(() => reject(new Error(`Volume scan timeout: ${dirPath}`)), timeoutMs)
      )
    ])
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
        throw new Error(`Permission denied scanning ${dirPath}. Check volume mount permissions.`)
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
