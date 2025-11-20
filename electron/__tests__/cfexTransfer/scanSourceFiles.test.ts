import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

/**
 * CFEx Transfer - scanSourceFiles() Tests
 *
 * Requirements (D3 Blueprint 003-CFEX-D3-BLUEPRINT.md lines 226-251):
 * 1. Enumerate files from CFEx card structure recursively
 * 2. Identify media type by extension (.jpg/.jpeg → 'photo', .mov/.mp4 → 'video')
 * 3. Route photos to LucidLink destination, raw videos to Ubuntu destination
 * 4. Return FileTransferTask[] with source, destination, size, mediaType, enqueued timestamp
 *
 * System Ripples:
 * - Dual routing coherence (photos→LucidLink, videos→Ubuntu)
 * - EXIF preservation dependency (chronological sorting requires correct files)
 * - Security baseline integration (path validation required)
 *
 * TDD Evidence: RED phase - This test FAILS before implementation (scanSourceFiles not defined)
 */

interface FileTransferTask {
  source: string;
  destination: string;
  size: number;
  mediaType: 'photo' | 'video';
  enqueued: number;
}

interface TransferDestinations {
  photos: string;
  rawVideos: string;
}

// Import implementation (GREEN phase)
import { scanSourceFiles } from '../../services/cfexTransfer';

describe('scanSourceFiles() - CFEx File Enumeration', () => {
  let tempSourceDir: string;
  let tempDestinations: TransferDestinations;

  beforeEach(async () => {
    // Create temporary test directory structure mimicking CFEx card
    tempSourceDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cfex-test-'));

    // Create destination directories
    const tempPhotosDir = await fs.mkdtemp(path.join(os.tmpdir(), 'lucidlink-test-'));
    const tempVideosDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ubuntu-test-'));

    tempDestinations = {
      photos: tempPhotosDir,
      rawVideos: tempVideosDir,
    };

    // Create CFEx-like directory structure
    await fs.mkdir(path.join(tempSourceDir, 'DCIM'), { recursive: true });
    await fs.mkdir(path.join(tempSourceDir, 'PRIVATE', 'M4ROOT', 'CLIP'), { recursive: true });
  });

  afterEach(async () => {
    // Clean up temporary directories
    try {
      await fs.rm(tempSourceDir, { recursive: true, force: true });
      await fs.rm(tempDestinations.photos, { recursive: true, force: true });
      await fs.rm(tempDestinations.rawVideos, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  it('should enumerate photo files from DCIM directory', async () => {
    // Arrange: Create photo files in DCIM
    const photoFiles = ['EA001621.JPG', 'EA001622.jpg', 'EA001623.jpeg'];

    for (const file of photoFiles) {
      const filePath = path.join(tempSourceDir, 'DCIM', file);
      await fs.writeFile(filePath, 'fake photo data');
    }

    // Act: Scan source files
    const tasks = await scanSourceFiles(tempSourceDir, tempDestinations);

    // Assert: Should identify all 3 photos
    expect(tasks).toHaveLength(3);
    expect(tasks.every(t => t.mediaType === 'photo')).toBe(true);
    expect(tasks.every(t => t.destination.startsWith(tempDestinations.photos))).toBe(true);
  });

  it('should enumerate video files from PRIVATE/M4ROOT/CLIP directory', async () => {
    // Arrange: Create video files in CLIP directory
    const videoFiles = ['C0001.MOV', 'C0002.mov', 'C0003.MP4', 'C0004.mp4'];

    for (const file of videoFiles) {
      const filePath = path.join(tempSourceDir, 'PRIVATE', 'M4ROOT', 'CLIP', file);
      await fs.writeFile(filePath, 'fake video data');
    }

    // Act: Scan source files
    const tasks = await scanSourceFiles(tempSourceDir, tempDestinations);

    // Assert: Should identify all 4 videos
    expect(tasks).toHaveLength(4);
    expect(tasks.every(t => t.mediaType === 'video')).toBe(true);
    expect(tasks.every(t => t.destination.startsWith(tempDestinations.rawVideos))).toBe(true);
  });

  it('should handle mixed photos and videos', async () => {
    // Arrange: Create both photo and video files
    await fs.writeFile(path.join(tempSourceDir, 'DCIM', 'EA001621.JPG'), 'photo 1');
    await fs.writeFile(path.join(tempSourceDir, 'DCIM', 'EA001622.JPG'), 'photo 2');
    await fs.writeFile(path.join(tempSourceDir, 'PRIVATE', 'M4ROOT', 'CLIP', 'C0001.MOV'), 'video 1');
    await fs.writeFile(path.join(tempSourceDir, 'PRIVATE', 'M4ROOT', 'CLIP', 'C0002.MOV'), 'video 2');

    // Act
    const tasks = await scanSourceFiles(tempSourceDir, tempDestinations);

    // Assert: Should route photos to LucidLink, videos to Ubuntu
    const photoTasks = tasks.filter(t => t.mediaType === 'photo');
    const videoTasks = tasks.filter(t => t.mediaType === 'video');

    expect(photoTasks).toHaveLength(2);
    expect(videoTasks).toHaveLength(2);

    expect(photoTasks.every(t => t.destination.startsWith(tempDestinations.photos))).toBe(true);
    expect(videoTasks.every(t => t.destination.startsWith(tempDestinations.rawVideos))).toBe(true);
  });

  it('should include file size and enqueued timestamp', async () => {
    // Arrange
    const testFile = path.join(tempSourceDir, 'DCIM', 'EA001621.JPG');
    const testData = 'x'.repeat(1024); // 1KB file
    await fs.writeFile(testFile, testData);

    const beforeScan = Date.now();

    // Act
    const tasks = await scanSourceFiles(tempSourceDir, tempDestinations);

    const afterScan = Date.now();

    // Assert
    expect(tasks).toHaveLength(1);
    expect(tasks[0].size).toBe(1024);
    expect(tasks[0].enqueued).toBeGreaterThanOrEqual(beforeScan);
    expect(tasks[0].enqueued).toBeLessThanOrEqual(afterScan);
  });

  it('should ignore non-media files', async () => {
    // Arrange: Create non-media files
    await fs.writeFile(path.join(tempSourceDir, 'DCIM', '.DS_Store'), 'system file');
    await fs.writeFile(path.join(tempSourceDir, 'DCIM', 'README.txt'), 'text file');
    await fs.writeFile(path.join(tempSourceDir, 'DCIM', 'EA001621.JPG'), 'valid photo');

    // Act
    const tasks = await scanSourceFiles(tempSourceDir, tempDestinations);

    // Assert: Only 1 valid photo file
    expect(tasks).toHaveLength(1);
    expect(tasks[0].source).toContain('EA001621.JPG');
  });

  it('should ignore directories', async () => {
    // Arrange: Create subdirectories
    await fs.mkdir(path.join(tempSourceDir, 'DCIM', 'subfolder'), { recursive: true });
    await fs.writeFile(path.join(tempSourceDir, 'DCIM', 'EA001621.JPG'), 'valid photo');

    // Act
    const tasks = await scanSourceFiles(tempSourceDir, tempDestinations);

    // Assert: Only 1 file (not directory)
    expect(tasks).toHaveLength(1);
  });

  it('should handle empty source directory', async () => {
    // Arrange: Empty CFEx card (no files in DCIM or CLIP)

    // Act
    const tasks = await scanSourceFiles(tempSourceDir, tempDestinations);

    // Assert: Empty array
    expect(tasks).toEqual([]);
  });
});
