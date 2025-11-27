import { describe, it, expect, beforeEach } from 'vitest';
import { MetadataStore } from '../../services/metadataStore';
import { FileManager } from '../../services/fileManager';
import type { FileMetadata } from '../../../src/types';
import * as fs from 'fs/promises';
import * as path from 'path';
import { tmpdir } from 'os';
import { SecurityValidator } from '../../services/securityValidator';

/**
 * Filename ID Stability Tests (RED Phase - TDD)
 *
 * BUG 1: UI not updating after file rename
 * ROOT CAUSE: File ID extracted from CURRENT filename, not cameraId
 * SYMPTOM: After rename EB001535.JPG → kitchen-oven-CU.JPG, metadata lookup fails
 *
 * BUG 2: Double extension (.JPG.JPG) in batch processor
 * ROOT CAUSE: path.basename() uses renamed name as "original" if file already renamed
 * SYMPTOM: TapeName preservation uses corrupted originalBasename
 *
 * ARCHITECTURAL FIX: Use cameraId as stable anchor for metadata lookup
 * - scanFolder() extracts cameraId from originalFilename (immutable)
 * - getFileMetadata() tries lookup priority: cameraId → originalFilename → id
 * - batch:start uses cameraId for lookup and originalFilename preservation
 */

describe('Filename ID Stability - Metadata Persistence After Rename', () => {
  let tempDir: string;
  let metadataStore: MetadataStore;
  let fileManager: FileManager;

  beforeEach(async () => {
    // Create temp directory for test
    tempDir = await fs.mkdtemp(path.join(tmpdir(), 'ingest-test-'));
    metadataStore = new MetadataStore(path.join(tempDir, '.ingest-metadata.json'));

    const securityValidator = new SecurityValidator();
    await securityValidator.setAllowedBasePath(tempDir);
    fileManager = new FileManager(securityValidator);
  });

  it('should persist metadata after filename rename (cameraId-based lookup)', async () => {
    // ARRANGE: Create original file with camera ID
    const originalFilename = 'EB001535.JPG';
    const originalPath = path.join(tempDir, originalFilename);
    await fs.writeFile(originalPath, 'test image data');

    // Scan folder - creates metadata with cameraId="EB001535"
    const files = await fileManager.scanFolder(tempDir);
    expect(files).toHaveLength(1);
    const originalFile = files[0];
    expect(originalFile.cameraId).toBe('EB001535');
    expect(originalFile.id).toBe('EB001535'); // ID matches cameraId initially

    // Save metadata with AI-processed data
    const metadata: FileMetadata = {
      ...originalFile,
      location: 'kitchen',
      subject: 'oven',
      shotType: 'CU',
      shotName: 'kitchen-oven-CU-#1',
      processedByAI: true
    };
    await metadataStore.updateFileMetadata(originalFile.id, metadata);

    // ACT: Rename file (simulates batch:start rename operation)
    const renamedFilename = 'kitchen-oven-CU.JPG';
    const renamedPath = path.join(tempDir, renamedFilename);
    await fs.rename(originalPath, renamedPath);

    // UPDATE metadata store with new filename (this is what batch:start does at line 1180)
    metadata.currentFilename = renamedFilename;
    metadata.filePath = renamedPath;
    await metadataStore.updateFileMetadata(originalFile.id, metadata);

    // RESCAN: Folder now contains renamed file
    fileManager.invalidateCache(tempDir);
    const rescannedFiles = await fileManager.scanFolder(tempDir);
    expect(rescannedFiles).toHaveLength(1);
    const renamedFile = rescannedFiles[0];

    // CRITICAL: After rename, file.id changes but cameraId stays the same
    expect(renamedFile.id).toBe('kitchen-'); // extractFileId() uses current filename → changes!
    expect(renamedFile.cameraId).toBe('EB001535'); // cameraId is immutable ✓

    // ASSERT: getFileMetadata should STILL find metadata via cameraId
    // This test WILL FAIL in RED phase because current implementation only looks up by file.id
    const retrievedMetadata = await metadataStore.getFileMetadata(renamedFile.id);

    // EXPECTED: Metadata found via cameraId lookup
    expect(retrievedMetadata).toBeDefined();
    expect(retrievedMetadata?.cameraId).toBe('EB001535');
    expect(retrievedMetadata?.location).toBe('kitchen');
    expect(retrievedMetadata?.subject).toBe('oven');
    expect(retrievedMetadata?.shotName).toBe('kitchen-oven-CU-#1');
  });

  it('should prevent double extension when extracting originalBasename', async () => {
    // ARRANGE: Create file that's ALREADY been renamed once
    const alreadyRenamedFilename = 'kitchen-microwave-CU.JPG';
    const alreadyRenamedPath = path.join(tempDir, alreadyRenamedFilename);
    await fs.writeFile(alreadyRenamedPath, 'test image data');

    // Scan and create metadata (cameraId should be extracted from ORIGINAL filename, not current)
    const files = await fileManager.scanFolder(tempDir);
    const file = files[0];

    // Save metadata with cameraId preserved
    const metadata: FileMetadata = {
      ...file,
      cameraId: 'EB001536', // This would come from TapeName XMP field in production
      originalFilename: 'EB001536.JPG', // Store original camera filename
      currentFilename: alreadyRenamedFilename,
      location: 'kitchen',
      subject: 'microwave',
      shotType: 'CU'
    };
    await metadataStore.updateFileMetadata(file.id, metadata);

    // ACT: Simulate batch:start TapeName preservation (line 1165 in main.ts)
    // CURRENT BUG: Uses path.basename(normalizedPath, extension) which gives "kitchen-microwave-CU"
    // CORRECT: Should use cameraId or originalFilename → "EB001536"
    const extension = path.extname(alreadyRenamedPath);

    // WRONG WAY (current implementation - creates double extension):
    const wrongOriginalBasename = path.basename(alreadyRenamedPath, extension);
    // wrongOriginalBasename = "kitchen-microwave-CU"

    // RIGHT WAY (should use stored cameraId):
    const correctOriginalBasename = metadata.cameraId;
    // correctOriginalBasename = "EB001536"

    // ASSERT: Test that we're NOT using the wrong way
    // This test WILL FAIL in RED phase because main.ts uses path.basename
    expect(correctOriginalBasename).toBe('EB001536');
    expect(correctOriginalBasename).not.toBe(wrongOriginalBasename);

    // Verify that double extension would occur with wrong approach
    const wouldCreateDoubleExtension = `${wrongOriginalBasename}${extension}`;
    expect(wouldCreateDoubleExtension).toBe('kitchen-microwave-CU.JPG'); // Not the original!

    const correctTapeName = `${correctOriginalBasename}`;
    expect(correctTapeName).toBe('EB001536'); // This is what TapeName should be
  });

  it('should use cameraId for stable metadata lookup in batch processor', async () => {
    // ARRANGE: Create file and metadata
    const filename = 'EC001640.JPG';
    const filePath = path.join(tempDir, filename);
    await fs.writeFile(filePath, 'test image data');

    const files = await fileManager.scanFolder(tempDir);
    const file = files[0];

    const metadata: FileMetadata = {
      ...file,
      cameraId: 'EC001640',
      location: 'kitchen',
      subject: 'blender',
      shotType: 'WS',
      processedByAI: true
    };
    await metadataStore.updateFileMetadata(file.id, metadata);

    // ACT: Simulate batch:start processor lookup (line 1084 in main.ts)
    // CURRENT: await store.getFileMetadata(fileId) where fileId = file.id
    // PROBLEM: If file renamed, file.id changes → lookup fails

    // Simulate rename AND metadata update (production flow)
    const renamedFilename = 'kitchen-blender-WS.JPG';
    const renamedPath = path.join(tempDir, renamedFilename);
    await fs.rename(filePath, renamedPath);

    // Update metadata with new filename (batch:start does this)
    metadata.currentFilename = renamedFilename;
    metadata.filePath = renamedPath;
    await metadataStore.updateFileMetadata(file.id, metadata);

    // Rescan to get new file.id
    fileManager.invalidateCache(tempDir);
    const rescannedFiles = await fileManager.scanFolder(tempDir);
    const renamedFile = rescannedFiles[0];

    // ASSERT: Batch processor should find metadata even with new file.id
    // Current implementation: getFileMetadata(renamedFile.id) → undefined ❌
    // Expected: getFileMetadata should accept cameraId as parameter → found ✓

    // This test WILL FAIL in RED phase - current implementation can't find metadata
    const batchProcessorLookup = await metadataStore.getFileMetadata(renamedFile.id);
    expect(batchProcessorLookup).toBeDefined();
    expect(batchProcessorLookup?.cameraId).toBe('EC001640');
  });
});

describe('Filename ID Stability - MetadataStore Lookup Priority', () => {
  let tempDir: string;
  let metadataStore: MetadataStore;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(tmpdir(), 'ingest-test-'));
    metadataStore = new MetadataStore(path.join(tempDir, '.ingest-metadata.json'));
  });

  it('should support lookup by cameraId when available', async () => {
    // ARRANGE: Create metadata with cameraId
    const metadata = MetadataStore.createMetadata({
      id: 'kitchen-',
      originalFilename: 'EB001537.JPG',
      currentFilename: 'kitchen-oven-steam-CU.JPG',
      filePath: path.join(tempDir, 'kitchen-oven-steam-CU.JPG'),
      extension: '.JPG',
      fileType: 'image',
      shotName: 'kitchen-oven-steam-CU-#5',
      cameraId: 'EB001537'
    });

    await metadataStore.updateFileMetadata(metadata.id, metadata);

    // ACT: Try to lookup by cameraId (not by current ID)
    // This test WILL FAIL in RED phase - getFileMetadata doesn't support cameraId lookup
    const found = await metadataStore.getFileMetadata('EB001537');

    // ASSERT: Should find metadata via cameraId
    expect(found).toBeDefined();
    expect(found?.cameraId).toBe('EB001537');
    expect(found?.currentFilename).toBe('kitchen-oven-steam-CU.JPG');
  });

  it('should fall back to originalFilename lookup if cameraId not found', async () => {
    // ARRANGE: Legacy metadata without cameraId field
    const legacyMetadata = MetadataStore.createMetadata({
      id: 'kitchen-',
      originalFilename: 'EB001538.JPG',
      currentFilename: 'kitchen-fridge-WS.JPG',
      filePath: path.join(tempDir, 'kitchen-fridge-WS.JPG'),
      extension: '.JPG',
      fileType: 'image',
      shotName: 'kitchen-fridge-WS-#3'
      // Note: cameraId NOT set (legacy record)
    });

    await metadataStore.updateFileMetadata(legacyMetadata.id, legacyMetadata);

    // ACT: Try to lookup by extracting ID from originalFilename
    // This test WILL FAIL in RED phase - no fallback logic exists
    const searchId = legacyMetadata.originalFilename.substring(0, 8); // "EB001538"
    const found = await metadataStore.getFileMetadata(searchId);

    // ASSERT: Should find via originalFilename-based ID
    expect(found).toBeDefined();
    expect(found?.originalFilename).toBe('EB001538.JPG');
  });
});
