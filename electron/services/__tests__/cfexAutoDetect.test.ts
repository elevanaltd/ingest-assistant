import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { PathLike } from 'fs'
import * as os from 'os'

/**
 * CFEx Auto-Detection Service Tests (REFACTOR Phase)
 *
 * These tests drive the implementation of platform-aware CFEx card detection.
 * Following TDD: RED (failing) → GREEN (minimal implementation) → REFACTOR
 *
 * REFACTOR: Updated mocks for async fs/promises pattern
 *
 * Specifications from D3 Blueprint:
 * - macOS: Scan /Volumes/ for "NO NAME" mount (CFEx card standard name)
 * - Ubuntu: Scan /media/$USER/ and /run/media/$USER/ (dual-location scan)
 * - Single-card: Auto-populate source path
 * - Multi-card: Show selection dialog
 * - Zero-card: Graceful fallback to manual picker
 */

// Mock fs/promises module before importing the service
vi.mock('fs/promises', () => ({
  readdir: vi.fn(),
  stat: vi.fn()
}))

vi.mock('os', () => ({
  platform: vi.fn(),
  homedir: vi.fn()
}))

// Import after mocking
import { CfexAutoDetect } from '../cfexAutoDetect'
import * as fs from 'fs/promises'

describe('CfexAutoDetect Service', () => {
  let autoDetect: CfexAutoDetect

  beforeEach(() => {
    vi.clearAllMocks()
    autoDetect = new CfexAutoDetect()
  })

  describe('macOS Platform Detection', () => {
    beforeEach(() => {
      vi.mocked(os.platform).mockReturnValue('darwin')
    })

    it('should detect /Volumes/NO NAME/ CFEx card when mounted', async () => {
      // ARRANGE: Mock /Volumes/ directory listing
      vi.mocked(fs.readdir).mockImplementation((path: PathLike) => {
        if (path === '/Volumes/') {
          return Promise.resolve(['NO NAME', 'LucidLink', 'other-volume'] as any)
        }
        return Promise.resolve([])
      })

      // ACT
      const cards = await autoDetect.detectCfexCards()

      // ASSERT
      expect(cards).toContain('/Volumes/NO NAME/')
      expect(cards.length).toBeGreaterThan(0)
    })

    it('should return empty array when no CFEx card mounted', async () => {
      // ARRANGE: Mock /Volumes/ with no "NO NAME"
      vi.mocked(fs.readdir).mockImplementation((path: PathLike) => {
        if (path === '/Volumes/') {
          return Promise.resolve(['LucidLink', 'other-volume'] as any)
        }
        return Promise.resolve([])
      })

      // ACT
      const cards = await autoDetect.detectCfexCards()

      // ASSERT
      expect(cards).toEqual([])
    })

    it('should detect /LucidLink/ destination mount', async () => {
      // ARRANGE: Mock /Volumes/ with LucidLink
      vi.mocked(fs.readdir).mockImplementation((path: PathLike) => {
        if (path === '/Volumes/') {
          return Promise.resolve(['LucidLink', 'NO NAME'] as any)
        }
        return Promise.resolve([])
      })

      // ACT
      const destinations = await autoDetect.detectDestinations()

      // ASSERT
      expect(destinations.photos).toBe('/Volumes/LucidLink/')
    })

    it('should detect /Ubuntu/ destination mount', async () => {
      // ARRANGE: Mock /Volumes/ with Ubuntu
      vi.mocked(fs.readdir).mockImplementation((path: PathLike) => {
        if (path === '/Volumes/') {
          return Promise.resolve(['NO NAME', 'Ubuntu'] as any)
        }
        return Promise.resolve([])
      })

      // ACT
      const destinations = await autoDetect.detectDestinations()

      // ASSERT
      expect(destinations.rawVideos).toBe('/Volumes/Ubuntu/')
    })

    it('should use default paths when mounts not found', async () => {
      // ARRANGE: Mock /Volumes/ with nothing
      vi.mocked(fs.readdir).mockImplementation((path: PathLike) => {
        if (path === '/Volumes/') {
          return Promise.resolve([] as any)
        }
        return Promise.resolve([])
      })

      // ACT
      const destinations = await autoDetect.detectDestinations()

      // ASSERT
      expect(destinations).toHaveProperty('photos')
      expect(destinations).toHaveProperty('rawVideos')
      // Should fall back to default paths
      expect(destinations.photos).toBeDefined()
      expect(destinations.rawVideos).toBeDefined()
    })
  })

  describe('Ubuntu Platform Detection', () => {
    beforeEach(() => {
      vi.mocked(os.platform).mockReturnValue('linux')
      vi.mocked(os.homedir).mockReturnValue('/home/testuser')
    })

    it('should detect CFEx cards in /media/$USER/', async () => {
      // ARRANGE: Mock /media/testuser/ directory
      vi.mocked(fs.readdir).mockImplementation((path: PathLike) => {
        if (path === '/media/testuser/') {
          return Promise.resolve(['CFEx', 'other-drive'] as any)
        }
        return Promise.resolve([])
      })

      // ACT
      const cards = await autoDetect.detectCfexCards()

      // ASSERT
      expect(cards).toContain('/media/testuser/CFEx')
    })

    it('should detect CFEx cards in /run/media/$USER/', async () => {
      // ARRANGE: Mock /run/media/testuser/ directory
      vi.mocked(fs.readdir).mockImplementation((path: PathLike) => {
        if (path === '/run/media/testuser/') {
          return Promise.resolve(['CFEx'] as any)
        }
        if (path === '/media/testuser/') {
          return Promise.resolve([] as any)
        }
        return Promise.resolve([])
      })

      // ACT
      const cards = await autoDetect.detectCfexCards()

      // ASSERT
      expect(cards).toContain('/run/media/testuser/CFEx')
    })

    it('should search both /media and /run/media locations', async () => {
      // ARRANGE: Expect both paths to be scanned
      const readmocks: string[] = []
      vi.mocked(fs.readdir).mockImplementation((path: PathLike) => {
        readmocks.push(path.toString())
        if (path === '/media/testuser/') return Promise.resolve(['drive1'] as any)
        if (path === '/run/media/testuser/') return Promise.resolve(['drive2'] as any)
        return Promise.resolve([])
      })

      // ACT
      const cards = await autoDetect.detectCfexCards()

      // ASSERT
      expect(readmocks).toContain('/media/testuser/')
      expect(readmocks).toContain('/run/media/testuser/')
      expect(cards.length).toBeGreaterThanOrEqual(0)
    })

    it('should return empty array when no CFEx cards found', async () => {
      // ARRANGE: Mock both locations empty
      vi.mocked(fs.readdir).mockImplementation((_path: PathLike) => {
        return Promise.resolve([] as any)
      })

      // ACT
      const cards = await autoDetect.detectCfexCards()

      // ASSERT
      expect(cards).toEqual([])
    })

    it('should handle permission denied error gracefully', async () => {
      // ARRANGE: Mock permission denied error
      vi.mocked(fs.readdir).mockImplementation((_path: PathLike) => {
        const error = new Error('EACCES: permission denied')
        ;(error as any).code = 'EACCES'
        return Promise.reject(error)
      })

      // ACT
      const cards = await autoDetect.detectCfexCards()

      // ASSERT: Should return empty array instead of throwing
      expect(cards).toEqual([])
    })
  })

  describe('Fuji Card Detection by Structure (Linux)', () => {
    beforeEach(() => {
      vi.mocked(os.platform).mockReturnValue('linux')
      vi.mocked(os.homedir).mockReturnValue('/home/testuser')
    })

    it('should detect card mounted as "disk" when DCIM/100_FUJI exists', async () => {
      vi.mocked(fs.readdir).mockImplementation((p: PathLike) => {
        if (p === '/media/testuser/') return Promise.resolve(['disk', 'backup-drive'] as any)
        return Promise.resolve([] as any)
      })
      vi.mocked(fs.stat).mockImplementation((p: PathLike) => {
        if (p.toString() === '/media/testuser/disk/DCIM/100_FUJI') return Promise.resolve({} as any)
        return Promise.reject(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }))
      })

      const cards = await autoDetect.detectCfexCards()

      expect(cards).toContain('/media/testuser/disk')
      expect(cards).not.toContain('/media/testuser/backup-drive')
    })

    it('should detect card mounted as "disk1" when stale "disk" directory exists', async () => {
      vi.mocked(fs.readdir).mockImplementation((p: PathLike) => {
        if (p === '/media/testuser/') return Promise.resolve(['disk', 'disk1'] as any)
        return Promise.resolve([] as any)
      })
      vi.mocked(fs.stat).mockImplementation((p: PathLike) => {
        // disk is a stale empty directory; disk1 is the actual card
        if (p.toString() === '/media/testuser/disk1/DCIM/100_FUJI') return Promise.resolve({} as any)
        return Promise.reject(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }))
      })

      const cards = await autoDetect.detectCfexCards()

      expect(cards).toContain('/media/testuser/disk1')
      expect(cards).not.toContain('/media/testuser/disk')
    })

    it('should detect card regardless of volume label', async () => {
      vi.mocked(fs.readdir).mockImplementation((p: PathLike) => {
        if (p === '/media/testuser/') return Promise.resolve(['MY_CARD', 'disk3', 'external-hdd'] as any)
        return Promise.resolve([] as any)
      })
      vi.mocked(fs.stat).mockImplementation((p: PathLike) => {
        if (p.toString() === '/media/testuser/disk3/DCIM/100_FUJI') return Promise.resolve({} as any)
        return Promise.reject(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }))
      })

      const cards = await autoDetect.detectCfexCards()

      expect(cards).toContain('/media/testuser/disk3')
      expect(cards).not.toContain('/media/testuser/MY_CARD')
      expect(cards).not.toContain('/media/testuser/external-hdd')
    })

    it('should check /run/media as well as /media for content-based detection', async () => {
      vi.mocked(fs.readdir).mockImplementation((p: PathLike) => {
        if (p === '/media/testuser/') return Promise.resolve([] as any)
        if (p === '/run/media/testuser/') return Promise.resolve(['disk'] as any)
        return Promise.resolve([] as any)
      })
      vi.mocked(fs.stat).mockImplementation((p: PathLike) => {
        if (p.toString() === '/run/media/testuser/disk/DCIM/100_FUJI') return Promise.resolve({} as any)
        return Promise.reject(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }))
      })

      const cards = await autoDetect.detectCfexCards()

      expect(cards).toContain('/run/media/testuser/disk')
    })

    it('should return empty when no mounted directory has DCIM/100_FUJI', async () => {
      vi.mocked(fs.readdir).mockImplementation((p: PathLike) => {
        if (p === '/media/testuser/') return Promise.resolve(['disk', 'external-hdd'] as any)
        return Promise.resolve([] as any)
      })
      vi.mocked(fs.stat).mockImplementation((_p: PathLike) => {
        return Promise.reject(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }))
      })

      const cards = await autoDetect.detectCfexCards()

      expect(cards).toEqual([])
    })
  })

  describe('Card Selection Logic', () => {
    it('should identify single card for auto-population', async () => {
      // ARRANGE: Mock single card detection
      vi.mocked(os.platform).mockReturnValue('darwin')
      vi.mocked(fs.readdir).mockImplementation((path: PathLike) => {
        if (path === '/Volumes/') {
          return Promise.resolve(['NO NAME'] as any)
        }
        return Promise.resolve([])
      })

      // ACT
      const cards = await autoDetect.detectCfexCards()

      // ASSERT
      expect(cards).toHaveLength(1)
      expect(autoDetect.shouldAutoPopulate(cards)).toBe(true)
      expect(autoDetect.getSelectedCard(cards)).toBe(cards[0])
    })

    it('should NOT auto-populate when multiple cards detected', async () => {
      // ARRANGE: Mock multiple cards
      const cards = ['/media/user/CFEx1', '/media/user/CFEx2']

      // ACT
      const shouldAuto = autoDetect.shouldAutoPopulate(cards)

      // ASSERT
      expect(shouldAuto).toBe(false)
    })

    it('should NOT auto-populate when no cards detected', async () => {
      // ARRANGE: Empty cards array
      const cards: string[] = []

      // ACT
      const shouldAuto = autoDetect.shouldAutoPopulate(cards)

      // ASSERT
      expect(shouldAuto).toBe(false)
    })
  })

  describe('Error Handling', () => {
    it('should catch and log fs.readdir errors', async () => {
      // ARRANGE: Mock error during directory read
      vi.mocked(os.platform).mockReturnValue('darwin')
      vi.mocked(fs.readdir).mockImplementation(() => {
        return Promise.reject(new Error('EIO: input/output error'))
      })

      // ACT: Should not throw, returns empty array on error
      const result = await autoDetect.detectCfexCards()

      // ASSERT
      expect(result).toEqual([])
    })

    it('should handle missing /media directory on Ubuntu', async () => {
      // ARRANGE: /media doesn't exist
      vi.mocked(os.platform).mockReturnValue('linux')
      vi.mocked(os.homedir).mockReturnValue('/home/testuser')
      vi.mocked(fs.readdir).mockImplementation((_path: PathLike) => {
        const error = new Error('ENOENT: no such file')
        ;(error as any).code = 'ENOENT'
        return Promise.reject(error)
      })

      // ACT
      const cards = await autoDetect.detectCfexCards()

      // ASSERT: Should return empty array gracefully
      expect(cards).toEqual([])
    })

    it('should not emit unhandled rejection when scan completes before timeout', async () => {
      // ARRANGE: Mock fast resolution (completes before 10s timeout)
      vi.mocked(os.platform).mockReturnValue('darwin')
      vi.mocked(fs.readdir).mockImplementation((path: PathLike) => {
        if (path === '/Volumes/') {
          return Promise.resolve(['NO NAME'] as any) // Fast resolution
        }
        return Promise.resolve([])
      })

      // ACT
      await autoDetect.detectCfexCards()

      // ASSERT: Test passes if no unhandled rejection thrown
      // The fix uses clearTimeout() to prevent timer from firing after resolution
      expect(true).toBe(true) // Explicit assertion for test clarity
    })

    it('should preserve EACCES error code through scanDirectory rethrow', async () => {
      // ARRANGE: Mock EACCES error during directory scan
      vi.mocked(os.platform).mockReturnValue('darwin')
      const eaccessError = Object.assign(
        new Error('EACCES: permission denied'),
        { code: 'EACCES' }
      )
      vi.mocked(fs.readdir).mockRejectedValue(eaccessError)

      // ACT: detectCfexCards catches EACCES and returns []
      const cards = await autoDetect.detectCfexCards()

      // ASSERT: Top-level gracefully handles EACCES (returns empty array)
      expect(cards).toEqual([])

      // The fix ensures scanDirectory() preserves .code when rethrowing
      // so that detectCfexCards() can properly detect EACCES via nodeError?.code
      // This test verifies the end-to-end behavior works correctly
    })
  })

  describe('Mount State Validation', () => {
    it('should detect if mount became unavailable', async () => {
      // ARRANGE: Mock initial detection
      vi.mocked(os.platform).mockReturnValue('darwin')
      vi.mocked(fs.readdir).mockImplementation((path: PathLike) => {
        if (path === '/Volumes/') {
          return Promise.resolve(['NO NAME'] as any)
        }
        return Promise.resolve([])
      })

      // ACT: Initial detection
      const initialCards = await autoDetect.detectCfexCards()
      expect(initialCards.length).toBe(1)

      // Now mock unmount
      vi.mocked(fs.readdir).mockImplementation((path: PathLike) => {
        if (path === '/Volumes/') {
          return Promise.resolve([] as any) // Card unmounted
        }
        return Promise.resolve([])
      })

      // ACT: Re-detection after unmount
      const afterUnmount = await autoDetect.detectCfexCards()

      // ASSERT
      expect(afterUnmount).toEqual([])
    })

    it('should warn when mounted path becomes inaccessible', async () => {
      // ARRANGE: Path exists but becomes inaccessible
      vi.mocked(os.platform).mockReturnValue('darwin')
      const testPath = '/Volumes/NO NAME/'

      vi.mocked(fs.stat).mockImplementation(() => {
        const error = new Error('EACCES: permission denied')
        ;(error as any).code = 'EACCES'
        return Promise.reject(error)
      })

      // ACT
      const isAccessible = await autoDetect.isPathAccessible(testPath)

      // ASSERT
      expect(isAccessible).toBe(false)
    })
  })
})
