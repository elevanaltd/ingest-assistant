/**
 * CFEx Card Auto-Detection Service
 *
 * GREEN PHASE IMPLEMENTATION - Platform-aware CFEx card detection
 * Follows Minimal Intervention Principle: Essential logic only, graceful error handling
 */

import * as fs from 'fs'
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
   * GREEN PHASE: Minimal implementation to pass tests
   */
  async detectCfexCards(): Promise<string[]> {
    const platform = os.platform()

    try {
      if (platform === 'darwin') {
        // macOS: Scan /Volumes/ for "NO NAME" directories
        return this.scanDirectory('/Volumes/', ['NO NAME'])
      } else if (platform === 'linux') {
        // Ubuntu: Scan both /media/$USER/ and /run/media/$USER/
        const username = path.basename(os.homedir())
        const mediaPath = `/media/${username}/`
        const runMediaPath = `/run/media/${username}/`

        const mediaCards = this.scanDirectory(mediaPath, ['CFEx'])
        const runMediaCards = this.scanDirectory(runMediaPath, ['CFEx'])

        return [...mediaCards, ...runMediaCards]
      }

      return []
    } catch (error) {
      // Graceful degradation: Return empty array on any error
      return []
    }
  }

  /**
   * Detect default destination paths for photos and raw videos
   *
   * @returns Object with photos and rawVideos paths
   *
   * GREEN PHASE: Minimal implementation to pass tests
   */
  async detectDestinations(): Promise<CfexDestinations> {
    const platform = os.platform()

    try {
      if (platform === 'darwin') {
        // macOS: Look for LucidLink and Ubuntu mounts in /Volumes/
        const volumes = fs.readdirSync('/Volumes/')

        const photosMount = volumes.find(v => v === 'LucidLink')
        const rawVideosMount = volumes.find(v => v === 'Ubuntu')

        return {
          photos: photosMount ? `/Volumes/${photosMount}/` : DEFAULT_PATHS.photos,
          rawVideos: rawVideosMount ? `/Volumes/${rawVideosMount}/` : DEFAULT_PATHS.rawVideos
        }
      }

      // Other platforms: Use defaults
      return DEFAULT_PATHS
    } catch (error) {
      // Graceful degradation: Return defaults on error
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
   * @param path - Path to validate
   * @returns true if accessible, false otherwise
   *
   * GREEN PHASE: Minimal implementation to pass tests
   */
  async isPathAccessible(path: string): Promise<boolean> {
    try {
      fs.statSync(path)
      return true
    } catch (error) {
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
  private scanDirectory(dirPath: string, targetNames: string[]): string[] {
    try {
      const entries = fs.readdirSync(dirPath)

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
    } catch (error: any) {
      // Graceful error handling: EACCES, ENOENT, EIO → return empty array
      if (error?.code === 'EACCES' || error?.code === 'ENOENT' || error?.code === 'EIO') {
        return []
      }
      // Other errors: Re-throw for debugging visibility
      throw error
    }
  }
}
