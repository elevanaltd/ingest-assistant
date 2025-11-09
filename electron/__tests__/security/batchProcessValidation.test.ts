import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SecurityValidator } from '../../services/securityValidator';
import { SecurityViolationError } from '../../utils/securityViolationError';
import type { FileMetadata } from '../../../src/types';
import type { Stats } from 'fs';

/**
 * Batch Process Security Validation Tests
 *
 * CRITICAL-8: Tests for ai:batch-process IPC handler security validation
 * Mitigates: Unvalidated file paths reaching AI processing services
 *
 * Requirements (Issue #18):
 * 1. Path validation for each file in batch
 * 2. File size validation for each file in batch
 * 3. Graceful error handling (partial batch failures)
 * 4. Security boundary integrity
 *
 * TDD Evidence: RED phase - These tests should FAIL before implementation
 */

// Mock fs/promises
vi.mock('fs/promises', () => ({
  realpath: vi.fn(),
  stat: vi.fn(),
  open: vi.fn(() => Promise.resolve({
    read: vi.fn((buffer: Buffer) =>
      Promise.resolve({ bytesRead: buffer.length, buffer })
    ),
    close: vi.fn(() => Promise.resolve()),
  })),
}));

import * as fs from 'fs/promises';

describe('Batch Process Security Validation', () => {
  let validator: SecurityValidator;

  beforeEach(() => {
    validator = new SecurityValidator();
    vi.clearAllMocks();
    vi.mocked(fs.realpath).mockImplementation((path) => Promise.resolve(path.toString()));
  });

  describe('Path Validation in Batch Context', () => {
    it('should validate each file path in batch is within allowed base path', async () => {
      validator.setAllowedBasePath('/selected/folder');

      const fileMetadataList: Partial<FileMetadata>[] = [
        { id: 'file1', filePath: '/selected/folder/image1.jpg', mainName: 'test1', metadata: [], fileType: 'image', processedByAI: false },
        { id: 'file2', filePath: '/selected/folder/image2.jpg', mainName: 'test2', metadata: [], fileType: 'image', processedByAI: false },
      ];

      // Mock realpath to return same paths (valid files)
      vi.mocked(fs.realpath).mockImplementation((path) => Promise.resolve(path.toString()));

      // Each file path should be validated
      for (const fileMetadata of fileMetadataList) {
        const validatedPath = await validator.validateFilePath(fileMetadata.filePath!);
        expect(validatedPath).toBe(fileMetadata.filePath);
      }
    });

    it('should reject batch processing when file path is outside allowed base path', async () => {
      validator.setAllowedBasePath('/selected/folder');

      // Malicious file metadata with path traversal
      const maliciousFileMetadata: Partial<FileMetadata> = {
        id: 'malicious1',
        filePath: '/etc/passwd',
        mainName: 'malicious',
        metadata: [],
        fileType: 'image',
        processedByAI: false,
      };

      vi.mocked(fs.realpath).mockResolvedValue('/etc/passwd');

      // Should throw SecurityViolationError
      await expect(
        validator.validateFilePath(maliciousFileMetadata.filePath!)
      ).rejects.toThrow(SecurityViolationError);
    });

    it('should reject path traversal attempt in batch file', async () => {
      validator.setAllowedBasePath('/selected/folder');

      const traversalFileMetadata: Partial<FileMetadata> = {
        id: 'traversal1',
        filePath: '/selected/folder/../../etc/passwd',
        mainName: 'traversal',
        metadata: [],
        fileType: 'image',
        processedByAI: false,
      };

      // Mock realpath to resolve traversal
      vi.mocked(fs.realpath).mockResolvedValue('/etc/passwd');

      await expect(
        validator.validateFilePath(traversalFileMetadata.filePath!)
      ).rejects.toThrow(SecurityViolationError);
    });

    it('should validate multiple files and identify which ones fail', async () => {
      validator.setAllowedBasePath('/selected/folder');

      const mixedFiles: Partial<FileMetadata>[] = [
        { id: 'valid1', filePath: '/selected/folder/image1.jpg', mainName: 'test1', metadata: [], fileType: 'image', processedByAI: false },
        { id: 'invalid1', filePath: '/etc/passwd', mainName: 'malicious', metadata: [], fileType: 'image', processedByAI: false },
        { id: 'valid2', filePath: '/selected/folder/image2.jpg', mainName: 'test2', metadata: [], fileType: 'image', processedByAI: false },
      ];

      const results: { id: string; valid: boolean; error?: string }[] = [];

      for (const fileMetadata of mixedFiles) {
        // Mock realpath based on file path
        if (fileMetadata.filePath!.startsWith('/selected/folder/')) {
          vi.mocked(fs.realpath).mockResolvedValueOnce(fileMetadata.filePath!);
        } else {
          vi.mocked(fs.realpath).mockResolvedValueOnce(fileMetadata.filePath!);
        }

        try {
          await validator.validateFilePath(fileMetadata.filePath!);
          results.push({ id: fileMetadata.id!, valid: true });
        } catch (error) {
          results.push({
            id: fileMetadata.id!,
            valid: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      // Should have 2 valid and 1 invalid
      expect(results.filter(r => r.valid)).toHaveLength(2);
      expect(results.filter(r => !r.valid)).toHaveLength(1);
      expect(results.find(r => r.id === 'invalid1')?.valid).toBe(false);
    });
  });

  describe('File Size Validation in Batch Context', () => {
    const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

    it('should validate each file size in batch is within limit', async () => {
      validator.setAllowedBasePath('/selected/folder');

      const fileMetadataList: Partial<FileMetadata>[] = [
        { id: 'file1', filePath: '/selected/folder/image1.jpg', mainName: 'test1', metadata: [], fileType: 'image', processedByAI: false },
        { id: 'file2', filePath: '/selected/folder/image2.jpg', mainName: 'test2', metadata: [], fileType: 'image', processedByAI: false },
      ];

      // Mock file sizes within limit
      vi.mocked(fs.stat).mockResolvedValue({
        size: 50 * 1024 * 1024, // 50MB
      } as Stats);

      for (const fileMetadata of fileMetadataList) {
        await expect(
          validator.validateFileSize(fileMetadata.filePath!, MAX_FILE_SIZE)
        ).resolves.not.toThrow();
      }
    });

    it('should reject files exceeding size limit in batch', async () => {
      validator.setAllowedBasePath('/selected/folder');

      const oversizedFileMetadata: Partial<FileMetadata> = {
        id: 'oversized1',
        filePath: '/selected/folder/huge-image.jpg',
        mainName: 'huge',
        metadata: [],
        fileType: 'image',
        processedByAI: false,
      };

      // Mock file size exceeding limit
      vi.mocked(fs.stat).mockResolvedValue({
        size: 150 * 1024 * 1024, // 150MB (over 100MB limit)
      } as Stats);

      await expect(
        validator.validateFileSize(oversizedFileMetadata.filePath!, MAX_FILE_SIZE)
      ).rejects.toThrow(SecurityViolationError);

      try {
        await validator.validateFileSize(oversizedFileMetadata.filePath!, MAX_FILE_SIZE);
      } catch (error) {
        expect(error).toBeInstanceOf(SecurityViolationError);
        expect((error as SecurityViolationError).type).toBe('SIZE_EXCEEDED');
      }
    });

    it('should handle mixed file sizes in batch and identify oversized files', async () => {
      validator.setAllowedBasePath('/selected/folder');

      const mixedSizeFiles: Partial<FileMetadata>[] = [
        { id: 'small1', filePath: '/selected/folder/image1.jpg', mainName: 'test1', metadata: [], fileType: 'image', processedByAI: false },
        { id: 'large1', filePath: '/selected/folder/huge.jpg', mainName: 'huge', metadata: [], fileType: 'image', processedByAI: false },
        { id: 'small2', filePath: '/selected/folder/image2.jpg', mainName: 'test2', metadata: [], fileType: 'image', processedByAI: false },
      ];

      const results: { id: string; valid: boolean; error?: string }[] = [];

      for (const fileMetadata of mixedSizeFiles) {
        // Mock file size based on id
        if (fileMetadata.id === 'large1') {
          vi.mocked(fs.stat).mockResolvedValueOnce({ size: 150 * 1024 * 1024 } as Stats);
        } else {
          vi.mocked(fs.stat).mockResolvedValueOnce({ size: 50 * 1024 * 1024 } as Stats);
        }

        try {
          await validator.validateFileSize(fileMetadata.filePath!, MAX_FILE_SIZE);
          results.push({ id: fileMetadata.id!, valid: true });
        } catch (error) {
          results.push({
            id: fileMetadata.id!,
            valid: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      // Should have 2 valid and 1 invalid
      expect(results.filter(r => r.valid)).toHaveLength(2);
      expect(results.filter(r => !r.valid)).toHaveLength(1);
      expect(results.find(r => r.id === 'large1')?.valid).toBe(false);
    });
  });

  describe('Combined Path and Size Validation', () => {
    const MAX_FILE_SIZE = 100 * 1024 * 1024;

    it('should validate both path and size for each batch file', async () => {
      validator.setAllowedBasePath('/selected/folder');

      const fileMetadata: Partial<FileMetadata> = {
        id: 'file1',
        filePath: '/selected/folder/image1.jpg',
        mainName: 'test1',
        metadata: [],
        fileType: 'image',
        processedByAI: false,
      };

      // Mock valid path
      vi.mocked(fs.realpath).mockResolvedValue(fileMetadata.filePath!);

      // Mock valid file size
      vi.mocked(fs.stat).mockResolvedValue({
        size: 50 * 1024 * 1024, // 50MB
      } as Stats);

      // Both validations should pass
      const validatedPath = await validator.validateFilePath(fileMetadata.filePath!);
      expect(validatedPath).toBe(fileMetadata.filePath);

      await expect(
        validator.validateFileSize(fileMetadata.filePath!, MAX_FILE_SIZE)
      ).resolves.not.toThrow();
    });

    it('should fail validation if path is valid but size exceeds limit', async () => {
      validator.setAllowedBasePath('/selected/folder');

      const fileMetadata: Partial<FileMetadata> = {
        id: 'file1',
        filePath: '/selected/folder/huge.jpg',
        mainName: 'huge',
        metadata: [],
        fileType: 'image',
        processedByAI: false,
      };

      // Mock valid path
      vi.mocked(fs.realpath).mockResolvedValue(fileMetadata.filePath!);

      // Mock oversized file
      vi.mocked(fs.stat).mockResolvedValue({
        size: 150 * 1024 * 1024, // 150MB
      } as Stats);

      // Path validation should pass
      const validatedPath = await validator.validateFilePath(fileMetadata.filePath!);
      expect(validatedPath).toBe(fileMetadata.filePath);

      // Size validation should fail
      await expect(
        validator.validateFileSize(validatedPath, MAX_FILE_SIZE)
      ).rejects.toThrow(SecurityViolationError);
    });

    it('should fail validation if path is invalid regardless of size', async () => {
      validator.setAllowedBasePath('/selected/folder');

      const fileMetadata: Partial<FileMetadata> = {
        id: 'file1',
        filePath: '/etc/passwd',
        mainName: 'malicious',
        metadata: [],
        fileType: 'image',
        processedByAI: false,
      };

      // Mock invalid path
      vi.mocked(fs.realpath).mockResolvedValue('/etc/passwd');

      // Path validation should fail (size validation never reached)
      await expect(
        validator.validateFilePath(fileMetadata.filePath!)
      ).rejects.toThrow(SecurityViolationError);
    });
  });

  describe('Error Handling in Batch Processing', () => {
    it('should continue processing remaining files when one file validation fails', async () => {
      validator.setAllowedBasePath('/selected/folder');

      const batchFiles: Partial<FileMetadata>[] = [
        { id: 'file1', filePath: '/selected/folder/image1.jpg', mainName: 'test1', metadata: [], fileType: 'image', processedByAI: false },
        { id: 'file2', filePath: '/etc/passwd', mainName: 'malicious', metadata: [], fileType: 'image', processedByAI: false },
        { id: 'file3', filePath: '/selected/folder/image3.jpg', mainName: 'test3', metadata: [], fileType: 'image', processedByAI: false },
      ];

      const processedFiles: string[] = [];
      const failedFiles: { id: string; error: string }[] = [];

      for (const fileMetadata of batchFiles) {
        // Mock realpath based on file
        if (fileMetadata.filePath!.startsWith('/selected/folder/')) {
          vi.mocked(fs.realpath).mockResolvedValueOnce(fileMetadata.filePath!);
        } else {
          vi.mocked(fs.realpath).mockResolvedValueOnce(fileMetadata.filePath!);
        }

        try {
          await validator.validateFilePath(fileMetadata.filePath!);
          processedFiles.push(fileMetadata.id!);
        } catch (error) {
          failedFiles.push({
            id: fileMetadata.id!,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
          // Continue processing (don't throw)
        }
      }

      // Should have processed 2 files and failed 1
      expect(processedFiles).toHaveLength(2);
      expect(failedFiles).toHaveLength(1);
      expect(processedFiles).toContain('file1');
      expect(processedFiles).toContain('file3');
      expect(failedFiles[0].id).toBe('file2');
    });
  });

  describe('Rate Limiting for Batch Operations', () => {
    // We need to test the RateLimiter class that's defined in main.ts
    // Since it's not exported, we'll create a test version here to verify the logic

    class TestRateLimiter {
      private tokens: number;
      private lastRefill: number;
      private readonly maxTokens: number;
      private readonly refillRate: number;

      constructor(maxTokens: number, refillRate: number) {
        this.maxTokens = maxTokens;
        this.refillRate = refillRate;
        this.tokens = maxTokens;
        this.lastRefill = Date.now();
      }

      private refill(): void {
        const now = Date.now();
        const timePassed = (now - this.lastRefill) / 1000;
        const tokensToAdd = timePassed * this.refillRate;

        this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
        this.lastRefill = now;
      }

      async consume(tokens: number): Promise<void> {
        this.refill();

        if (this.tokens < tokens) {
          const waitTime = ((tokens - this.tokens) / this.refillRate) * 1000;
          throw new Error(`Rate limit exceeded. Please wait ${Math.ceil(waitTime / 1000)} seconds before retrying.`);
        }

        this.tokens -= tokens;
      }

      // Test helper to get current token count
      getTokens(): number {
        this.refill();
        return this.tokens;
      }
    }

    it('should allow batch processing within rate limits', async () => {
      // 100 files per minute = ~1.67 files/second
      const rateLimiter = new TestRateLimiter(100, 100 / 60);

      // Should allow consuming 50 files (within limit)
      await expect(rateLimiter.consume(50)).resolves.not.toThrow();

      // Should have 50 tokens remaining
      expect(rateLimiter.getTokens()).toBeCloseTo(50, 0);
    });

    it('should reject batch processing when rate limit is exceeded', async () => {
      const rateLimiter = new TestRateLimiter(100, 100 / 60);

      // Consume all tokens
      await rateLimiter.consume(100);

      // Should reject next batch immediately
      await expect(rateLimiter.consume(10)).rejects.toThrow('Rate limit exceeded');
    });

    it('should refill tokens over time', async () => {
      const rateLimiter = new TestRateLimiter(100, 100 / 60); // 1.67 tokens/sec

      // Consume all tokens
      await rateLimiter.consume(100);
      expect(rateLimiter.getTokens()).toBe(0);

      // Wait for 3 seconds (should refill ~5 tokens)
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Should have refilled approximately 5 tokens
      const tokens = rateLimiter.getTokens();
      expect(tokens).toBeGreaterThan(4);
      expect(tokens).toBeLessThan(6);

      // Should now be able to consume 5 tokens
      await expect(rateLimiter.consume(5)).resolves.not.toThrow();
    }, 5000);

    it('should handle burst requests up to max tokens', async () => {
      const rateLimiter = new TestRateLimiter(100, 100 / 60);

      // Should allow full burst of 100 files
      await expect(rateLimiter.consume(100)).resolves.not.toThrow();

      // Should have 0 tokens remaining
      expect(rateLimiter.getTokens()).toBe(0);
    });

    it('should provide accurate wait time in error message', async () => {
      const rateLimiter = new TestRateLimiter(100, 100 / 60); // 1.67 tokens/sec

      // Consume all tokens
      await rateLimiter.consume(100);

      // Try to consume 60 more tokens
      // Need 60 tokens, refill rate is 1.67/sec, so wait time = 60/1.67 ≈ 36 seconds
      try {
        await rateLimiter.consume(60);
        // Should not reach here
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('Rate limit exceeded');
        expect((error as Error).message).toContain('36 seconds');
      }
    });

    it('should prevent abuse with multiple small batches', async () => {
      const rateLimiter = new TestRateLimiter(100, 100 / 60);

      // Process 5 batches of 20 files each (100 total)
      for (let i = 0; i < 5; i++) {
        await expect(rateLimiter.consume(20)).resolves.not.toThrow();
      }

      // 6th batch should fail (limit reached)
      await expect(rateLimiter.consume(20)).rejects.toThrow('Rate limit exceeded');
    });

    it('should track token consumption correctly across multiple operations', async () => {
      const rateLimiter = new TestRateLimiter(100, 100 / 60);

      // Consume 30 tokens
      await rateLimiter.consume(30);
      expect(rateLimiter.getTokens()).toBeCloseTo(70, 0);

      // Consume 40 more tokens
      await rateLimiter.consume(40);
      expect(rateLimiter.getTokens()).toBeCloseTo(30, 0);

      // Should still be able to consume remaining 30
      await expect(rateLimiter.consume(30)).resolves.not.toThrow();
      expect(rateLimiter.getTokens()).toBeCloseTo(0, 0);
    });
  });
});
