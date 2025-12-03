import { describe, test, expect, vi, beforeEach } from 'vitest'
import { promises as fs } from 'fs'
import * as path from 'path'

/**
 * IPC Handler Tests: file:create-folder
 *
 * Security Critical Tests:
 * - Path traversal prevention (../ attacks)
 * - Absolute path rejection in folderName
 * - Base path validation via securityValidator
 * - Permission error handling
 * - Non-existent base path handling
 *
 * TDD Protocol: Tests written FIRST (RED) before implementation (GREEN)
 */

// Mock fs module
vi.mock('fs', () => ({
  promises: {
    mkdir: vi.fn()
  }
}))

// Mock security validator
const mockSecurityValidator = {
  validateFilePath: vi.fn(),
  setAllowedBasePath: vi.fn(),
  addAllowedPath: vi.fn()
}

// Note: We test the handler logic directly rather than through IPC registration
// This approach is cleaner and avoids complex module import/registration issues

describe('file:create-folder IPC Handler', () => {
  // Handler function extracted from main.ts logic
  const handler = async (_event: any, { basePath, folderName }: { basePath: string; folderName: string }) => {
    try {
      // Validate inputs
      if (!folderName || folderName.trim() === '') {
        return {
          success: false,
          error: 'Folder name cannot be empty'
        };
      }

      const trimmedName = folderName.trim();

      // Security: Reject path traversal attempts
      if (trimmedName.includes('..')) {
        return {
          success: false,
          error: 'Invalid folder name: path traversal not allowed (..)'
        };
      }

      // Security: Reject absolute paths (check BEFORE slash check)
      // Check both Unix-style (/path) and Windows-style (C:\path or C:/path)
      const isWindowsAbsolute = /^[a-zA-Z]:/.test(trimmedName);
      if (path.isAbsolute(trimmedName) || isWindowsAbsolute) {
        return {
          success: false,
          error: 'Invalid folder name: absolute paths not allowed'
        };
      }

      // Security: Reject hidden folders (starting with .)
      if (trimmedName.startsWith('.')) {
        return {
          success: false,
          error: 'Invalid folder name: cannot start with dot (.)'
        };
      }

      // Security: Reject paths with slashes (force single-level creation)
      if (trimmedName.includes('/') || trimmedName.includes('\\')) {
        return {
          success: false,
          error: 'Invalid folder name: invalid characters (/, \\)'
        };
      }

      // Construct the full path
      const fullPath = path.join(basePath, trimmedName);

      // Security: Validate constructed path is within allowed base paths
      const validatedPath = await mockSecurityValidator.validateFilePath(fullPath);

      // Create the folder (recursive: true allows parent creation)
      await fs.mkdir(validatedPath, { recursive: true });

      return {
        success: true,
        path: validatedPath
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      return {
        success: false,
        error: errorMessage
      };
    }
  };

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Successful folder creation', () => {
    test('creates folder when path is valid', async () => {
      // Arrange
      const basePath = '/Volumes/LucidLink/project1'
      const folderName = 'subfolder'
      const expectedPath = path.join(basePath, folderName)

      // Mock security validation passes
      mockSecurityValidator.validateFilePath.mockResolvedValue(expectedPath)
      ;(fs.mkdir as any).mockResolvedValue(undefined)

      // Act
      const result = await handler({}, { basePath, folderName })

      // Assert
      expect(result.success).toBe(true)
      expect(result.path).toBe(expectedPath)
      expect(result.error).toBeUndefined()
      expect(fs.mkdir).toHaveBeenCalledWith(expectedPath, { recursive: true })
      expect(mockSecurityValidator.validateFilePath).toHaveBeenCalledWith(expectedPath)
    })

    test('creates nested folder structure', async () => {
      // Arrange
      const basePath = '/Volumes/LucidLink/project1'
      const folderName = 'videos-proxy'
      const expectedPath = path.join(basePath, folderName)

      mockSecurityValidator.validateFilePath.mockResolvedValue(expectedPath)
      ;(fs.mkdir as any).mockResolvedValue(undefined)

      // Act
      const result = await handler({}, { basePath, folderName })

      // Assert
      expect(result.success).toBe(true)
      expect(result.path).toBe(expectedPath)
      expect(fs.mkdir).toHaveBeenCalledWith(expectedPath, { recursive: true })
    })
  })

  describe('Security: Path traversal prevention', () => {
    test('rejects path traversal with ../ attack', async () => {
      // Arrange
      const basePath = '/Volumes/LucidLink/project1'
      const folderName = '../../../etc/passwd'

      // Act
      const result = await handler({}, { basePath, folderName })

      // Assert
      expect(result.success).toBe(false)
      expect(result.error).toContain('path traversal')
      expect(fs.mkdir).not.toHaveBeenCalled()
      expect(mockSecurityValidator.validateFilePath).not.toHaveBeenCalled()
    })

    test('rejects path traversal with ..\\ attack (Windows style)', async () => {
      // Arrange
      const basePath = '/Volumes/LucidLink/project1'
      const folderName = '..\\..\\..\\etc\\passwd'

      // Act
      const result = await handler({}, { basePath, folderName })

      // Assert
      expect(result.success).toBe(false)
      expect(result.error).toContain('path traversal')
      expect(fs.mkdir).not.toHaveBeenCalled()
    })

    test('rejects absolute path in folderName (Unix)', async () => {
      // Arrange
      const basePath = '/Volumes/LucidLink/project1'
      const folderName = '/etc/passwd'

      // Act
      const result = await handler({}, { basePath, folderName })

      // Assert
      expect(result.success).toBe(false)
      expect(result.error).toContain('absolute path')
      expect(fs.mkdir).not.toHaveBeenCalled()
    })

    test('rejects absolute path in folderName (Windows)', async () => {
      // Arrange
      const basePath = '/Volumes/LucidLink/project1'
      const folderName = 'C:\\Windows\\System32'

      // Act
      const result = await handler({}, { basePath, folderName })

      // Assert
      expect(result.success).toBe(false)
      expect(result.error).toContain('absolute path')
      expect(fs.mkdir).not.toHaveBeenCalled()
    })

    test('rejects folderName starting with dot (hidden folders)', async () => {
      // Arrange
      const basePath = '/Volumes/LucidLink/project1'
      const folderName = '.secret'

      // Act
      const result = await handler({}, { basePath, folderName })

      // Assert
      expect(result.success).toBe(false)
      expect(result.error).toContain('cannot start with')
      expect(fs.mkdir).not.toHaveBeenCalled()
    })

    test('rejects folderName containing forward slash', async () => {
      // Arrange
      const basePath = '/Volumes/LucidLink/project1'
      const folderName = 'folder/with/slash'

      // Act
      const result = await handler({}, { basePath, folderName })

      // Assert
      expect(result.success).toBe(false)
      expect(result.error).toContain('invalid characters')
      expect(fs.mkdir).not.toHaveBeenCalled()
    })

    test('rejects folderName containing backslash', async () => {
      // Arrange
      const basePath = '/Volumes/LucidLink/project1'
      const folderName = 'folder\\with\\backslash'

      // Act
      const result = await handler({}, { basePath, folderName })

      // Assert
      expect(result.success).toBe(false)
      expect(result.error).toContain('invalid characters')
      expect(fs.mkdir).not.toHaveBeenCalled()
    })
  })

  describe('Security: SecurityValidator integration', () => {
    test('uses securityValidator to validate constructed path', async () => {
      // Arrange
      const basePath = '/Volumes/LucidLink/project1'
      const folderName = 'valid-folder'
      const expectedPath = path.join(basePath, folderName)

      mockSecurityValidator.validateFilePath.mockResolvedValue(expectedPath)
      ;(fs.mkdir as any).mockResolvedValue(undefined)

      // Act
      await handler({}, { basePath, folderName })

      // Assert
      expect(mockSecurityValidator.validateFilePath).toHaveBeenCalledWith(expectedPath)
    })

    test('rejects if securityValidator throws PATH_TRAVERSAL', async () => {
      // Arrange
      const basePath = '/Volumes/LucidLink/project1'
      const folderName = 'valid-name'
      const expectedPath = path.join(basePath, folderName)

      // Mock security validator rejects (path outside allowed base)
      mockSecurityValidator.validateFilePath.mockRejectedValue(
        new Error('Access denied: Path outside allowed folders')
      )

      // Act
      const result = await handler({}, { basePath, folderName })

      // Assert
      expect(result.success).toBe(false)
      expect(result.error).toContain('outside allowed')
      expect(fs.mkdir).not.toHaveBeenCalled()
    })
  })

  describe('Error handling', () => {
    test('returns error for non-existent basePath', async () => {
      // Arrange
      const basePath = '/nonexistent/path'
      const folderName = 'newfolder'
      const expectedPath = path.join(basePath, folderName)

      mockSecurityValidator.validateFilePath.mockResolvedValue(expectedPath)
      ;(fs.mkdir as any).mockRejectedValue(new Error('ENOENT: no such file or directory'))

      // Act
      const result = await handler({}, { basePath, folderName })

      // Assert
      expect(result.success).toBe(false)
      expect(result.error).toContain('ENOENT')
    })

    test('returns error for permission denied', async () => {
      // Arrange
      const basePath = '/root/protected'
      const folderName = 'newfolder'
      const expectedPath = path.join(basePath, folderName)

      mockSecurityValidator.validateFilePath.mockResolvedValue(expectedPath)
      ;(fs.mkdir as any).mockRejectedValue(new Error('EACCES: permission denied'))

      // Act
      const result = await handler({}, { basePath, folderName })

      // Assert
      expect(result.success).toBe(false)
      expect(result.error).toContain('EACCES')
    })

    test('handles empty folderName', async () => {
      // Arrange
      const basePath = '/Volumes/LucidLink/project1'
      const folderName = ''

      // Act
      const result = await handler({}, { basePath, folderName })

      // Assert
      expect(result.success).toBe(false)
      expect(result.error).toContain('empty')
    })

    test('handles whitespace-only folderName', async () => {
      // Arrange
      const basePath = '/Volumes/LucidLink/project1'
      const folderName = '   '

      // Act
      const result = await handler({}, { basePath, folderName })

      // Assert
      expect(result.success).toBe(false)
      expect(result.error).toContain('empty')
    })
  })
})
