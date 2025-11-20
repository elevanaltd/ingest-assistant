/**
 * CFEx Transfer Service - transferFile() Tests
 *
 * TDD CYCLE: RED Phase
 * Tests for streaming file transfer with progress tracking.
 *
 * Test Strategy:
 * 1. Happy path: Stream file with progress callbacks
 * 2. Security: Validate paths before transfer
 * 3. Error recovery: Clean up partial files on failure
 *
 * Reference: D3 Blueprint lines 253-309
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import { transferFile, FileTransferTask, TransferProgress } from '../cfexTransfer';
import { SecurityValidator } from '../securityValidator';

const TEST_DIR = path.join(process.cwd(), 'test-tmp-transfer');
const SOURCE_DIR = path.join(TEST_DIR, 'source');
const DEST_DIR = path.join(TEST_DIR, 'dest');

/**
 * Setup: Create test directories and mock files
 */
beforeEach(async () => {
  await fs.mkdir(SOURCE_DIR, { recursive: true });
  await fs.mkdir(DEST_DIR, { recursive: true });
});

/**
 * Teardown: Clean up test files
 */
afterEach(async () => {
  await fs.rm(TEST_DIR, { recursive: true, force: true });
});

describe('transferFile', () => {
  /**
   * CRITICAL TEST: Streaming file transfer with progress tracking
   *
   * Validates:
   * - File streams from source to destination
   * - Progress callbacks emitted during transfer
   * - Final bytes transferred matches file size
   * - Destination file created successfully
   */
  test('streams file from source to destination with progress tracking', async () => {
    // ARRANGE: Create 1MB test file
    const sourceFile = path.join(SOURCE_DIR, 'test-photo.jpg');
    const destFile = path.join(DEST_DIR, 'test-photo.jpg');

    // Create 1MB file (1024 * 1024 bytes)
    const testData = Buffer.alloc(1024 * 1024, 'a');
    await fs.writeFile(sourceFile, testData);

    const mockTask: FileTransferTask = {
      source: sourceFile,
      destination: destFile,
      size: 1024 * 1024,
      mediaType: 'photo',
      enqueued: Date.now(),
    };

    // Track progress callbacks
    const progressUpdates: TransferProgress[] = [];
    const onProgress = (progress: TransferProgress) => {
      progressUpdates.push(progress);
    };

    // ACT: Transfer file
    const result = await transferFile(mockTask, onProgress);

    // ASSERT: Transfer completed successfully
    expect(result.success).toBe(true);
    expect(result.bytesTransferred).toBe(1024 * 1024);

    // ASSERT: Progress updates emitted
    expect(progressUpdates.length).toBeGreaterThan(0);
    expect(progressUpdates[0].currentFile).toBe('test-photo.jpg');

    // ASSERT: Destination file exists with correct content
    const destExists = await fs
      .access(destFile)
      .then(() => true)
      .catch(() => false);
    expect(destExists).toBe(true);

    const destStats = await fs.stat(destFile);
    expect(destStats.size).toBe(1024 * 1024);
  });

  /**
   * SECURITY TEST: Path traversal validation
   *
   * Validates:
   * - Source path validated before transfer
   * - Destination path validated before transfer
   * - Malicious paths rejected
   */
  test('validates source and destination paths before transfer', async () => {
    // ARRANGE: Malicious path traversal attempt
    const mockTask: FileTransferTask = {
      source: '/safe/source.jpg',
      destination: '/safe/../../../etc/passwd',
      size: 1024,
      mediaType: 'photo',
      enqueued: Date.now(),
    };

    // ACT & ASSERT: Should reject path traversal
    await expect(transferFile(mockTask)).rejects.toThrow();
  });

  /**
   * ERROR RECOVERY TEST: Partial file cleanup on source file not found
   *
   * Validates:
   * - Error propagated when source file missing
   * - No partial destination file created
   *
   * NOTE: More complex error scenarios (disk full mid-transfer) deferred to
   * Week 2 error handling phase per D3 Blueprint.
   */
  test('handles missing source file gracefully', async () => {
    // ARRANGE: Task with non-existent source file
    const mockTask: FileTransferTask = {
      source: path.join(SOURCE_DIR, 'non-existent.jpg'),
      destination: path.join(DEST_DIR, 'non-existent.jpg'),
      size: 1024,
      mediaType: 'photo',
      enqueued: Date.now(),
    };

    // ACT & ASSERT: Should throw error
    await expect(transferFile(mockTask)).rejects.toThrow();

    // ASSERT: No partial destination file created
    const destExists = await fs
      .access(mockTask.destination)
      .then(() => true)
      .catch(() => false);
    expect(destExists).toBe(false);
  });

  /**
   * DIRECTORY CREATION TEST: Auto-create destination directories
   *
   * Validates:
   * - Nested destination directories created if missing
   * - Transfer succeeds even if destination path doesn't exist
   */
  test('creates destination directory if it does not exist', async () => {
    // ARRANGE: Source file with nested destination path
    const sourceFile = path.join(SOURCE_DIR, 'test-nested.jpg');
    const nestedDestDir = path.join(DEST_DIR, 'nested', 'path', 'deep');
    const destFile = path.join(nestedDestDir, 'test-nested.jpg');

    // Create small test file
    const testData = Buffer.alloc(1024, 'c'); // 1KB
    await fs.writeFile(sourceFile, testData);

    const mockTask: FileTransferTask = {
      source: sourceFile,
      destination: destFile,
      size: 1024,
      mediaType: 'photo',
      enqueued: Date.now(),
    };

    // ACT: Transfer file (should auto-create directories)
    const result = await transferFile(mockTask);

    // ASSERT: Transfer succeeded
    expect(result.success).toBe(true);

    // ASSERT: Destination directory created
    const destDirExists = await fs
      .access(nestedDestDir)
      .then(() => true)
      .catch(() => false);
    expect(destDirExists).toBe(true);

    // ASSERT: File transferred successfully
    const destExists = await fs
      .access(destFile)
      .then(() => true)
      .catch(() => false);
    expect(destExists).toBe(true);
  });

  /**
   * PROGRESS THROTTLING TEST: Progress updates throttled to prevent UI flooding
   *
   * Validates:
   * - Progress updates throttled to reasonable intervals
   * - Not every chunk emits progress callback
   * - Final progress update emitted (100% completion)
   */
  test('throttles progress updates to prevent UI flooding', async () => {
    // ARRANGE: Create larger file (5MB) to trigger multiple progress updates
    const sourceFile = path.join(SOURCE_DIR, 'test-large.jpg');
    const destFile = path.join(DEST_DIR, 'test-large.jpg');

    // Create 5MB file
    const testData = Buffer.alloc(5 * 1024 * 1024, 'd');
    await fs.writeFile(sourceFile, testData);

    const mockTask: FileTransferTask = {
      source: sourceFile,
      destination: destFile,
      size: 5 * 1024 * 1024,
      mediaType: 'photo',
      enqueued: Date.now(),
    };

    // Track progress callback timestamps
    const progressTimestamps: number[] = [];
    const onProgress = (progress: TransferProgress) => {
      progressTimestamps.push(Date.now());
    };

    // ACT: Transfer file
    await transferFile(mockTask, onProgress);

    // ASSERT: Progress updates throttled (not every 64KB chunk)
    // With 64KB chunks, 5MB = 80 chunks
    // Throttled to 100ms intervals, 5MB transfer should take ~100-500ms
    // Expect 5-10 progress updates, NOT 80
    expect(progressTimestamps.length).toBeGreaterThan(0);
    expect(progressTimestamps.length).toBeLessThan(80);

    // ASSERT: Progress updates spaced by throttle interval (100ms)
    if (progressTimestamps.length > 1) {
      for (let i = 1; i < progressTimestamps.length; i++) {
        const deltaMs = progressTimestamps[i] - progressTimestamps[i - 1];
        // Allow some variance (50ms to 200ms)
        expect(deltaMs).toBeGreaterThanOrEqual(50);
      }
    }
  });
});
