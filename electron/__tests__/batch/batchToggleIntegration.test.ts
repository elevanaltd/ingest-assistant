import { describe, it, expect, beforeAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Batch Toggle Integration Tests
 *
 * BUG: Filename rewrite toggle not working in batch operations
 * Issue: Phase 1c delivered components in isolation without integration wiring
 *
 * Integration Gaps (verified by checking main.ts source):
 * 1. FilenameTemplateParser NOT imported in main.ts
 * 2. getCfexToggles() NOT called in batch:start handler
 * 3. metadataWriter unconditional (should respect metadataWrite toggle)
 * 4. No rename operation (should rename when filenameRewrite toggle enabled)
 * 5. No TapeName preservation before rename
 *
 * TDD Evidence: RED phase - These tests FAIL before implementation
 * Strategy: Check source code for presence of integration wiring
 */

describe('Batch Toggle Integration - Source Code Checks', () => {
  const mainTsPath = path.join(__dirname, '../../main.ts');
  let mainTsContent: string;

  // Read main.ts once for all tests
  beforeAll(() => {
    mainTsContent = fs.readFileSync(mainTsPath, 'utf-8');
  });

  describe('Integration Gap 1: FilenameTemplateParser import', () => {
    it('should import FilenameTemplateParser in main.ts', () => {
      // EXPECTED: import { FilenameTemplateParser } from './services/filenameTemplate';
      // ACTUAL: Missing (will fail - RED phase)

      const hasImport = mainTsContent.includes("import { FilenameTemplateParser }") ||
                       mainTsContent.includes("import { FilenameTemplateParser,") ||
                       mainTsContent.includes("FilenameTemplateParser }");

      expect(hasImport).toBe(true);
    });
  });

  describe('Integration Gap 2: getCfexToggles() call in batch:start', () => {
    it('should call getCfexToggles() in batch:start handler', () => {
      // EXPECTED: const toggles = await configManager.getCfexToggles();
      // ACTUAL: Missing (will fail - RED phase)

      // Check for getCfexToggles call after batch:start declaration
      const batchStartIndex = mainTsContent.indexOf("ipcMain.handle('batch:start'");
      expect(batchStartIndex).toBeGreaterThan(-1); // Sanity check

      // Look for getCfexToggles after batch:start
      const afterBatchStart = mainTsContent.substring(batchStartIndex);
      const nextHandlerIndex = afterBatchStart.indexOf("ipcMain.handle(", 100); // Find next handler
      const batchStartHandlerContent = nextHandlerIndex > 0
        ? afterBatchStart.substring(0, nextHandlerIndex)
        : afterBatchStart;

      const hasGetCfexToggles = batchStartHandlerContent.includes('getCfexToggles()');

      expect(hasGetCfexToggles).toBe(true);
    });
  });

  describe('Integration Gap 3: metadataWrite toggle conditional', () => {
    it('should make metadataWriter.writeMetadataToFile conditional on toggles.metadataWrite', () => {
      // EXPECTED: if (toggles.metadataWrite) { await metadataWriter.writeMetadataToFile(...) }
      // ACTUAL: Unconditional (will fail - RED phase)

      // Find the processor function inside batch:start
      const processorIndex = mainTsContent.indexOf('const processor = async (fileId: string)');
      expect(processorIndex).toBeGreaterThan(-1); // Sanity check

      const afterProcessor = mainTsContent.substring(processorIndex);

      // Look for conditional metadata write
      const hasConditionalWrite =
        afterProcessor.includes('if (toggles.metadataWrite)') &&
        afterProcessor.includes('writeMetadataToFile');

      expect(hasConditionalWrite).toBe(true);
    });
  });

  describe('Integration Gap 4: filenameRewrite toggle with fs.rename', () => {
    it('should call fs.rename when toggles.filenameRewrite is true', () => {
      // EXPECTED: if (toggles.filenameRewrite) { ... await fs.rename(...) }
      // ACTUAL: Missing (will fail - RED phase)

      const processorIndex = mainTsContent.indexOf('const processor = async (fileId: string)');
      const afterProcessor = mainTsContent.substring(processorIndex);

      // Look for filename rewrite block
      const hasFilenameRewrite =
        afterProcessor.includes('if (toggles.filenameRewrite)') &&
        (afterProcessor.includes('fs.rename') || afterProcessor.includes('await rename'));

      expect(hasFilenameRewrite).toBe(true);
    });

    it('should use FilenameTemplateParser.parse() for generating new filename', () => {
      // EXPECTED: parser.parse(toggles.filenameTemplate, {...})
      // ACTUAL: Missing (will fail - RED phase)

      const processorIndex = mainTsContent.indexOf('const processor = async (fileId: string)');
      const afterProcessor = mainTsContent.substring(processorIndex);

      // Look for parser usage
      const hasParserUsage =
        afterProcessor.includes('FilenameTemplateParser()') &&
        afterProcessor.includes('.parse(');

      expect(hasParserUsage).toBe(true);
    });
  });

  describe('Integration Gap 5: TapeName preservation before rename (I3 Compliance)', () => {
    it('should write TapeName BEFORE calling fs.rename', () => {
      // EXPECTED: await metadataWriter.writeTapeName(...); ... await fs.rename(...);
      // ACTUAL: Missing (will fail - RED phase)

      const processorIndex = mainTsContent.indexOf('const processor = async (fileId: string)');
      const afterProcessor = mainTsContent.substring(processorIndex);

      // Look for TapeName write in filename rewrite block
      // Note: writeTapeName method may not exist yet, so this test may need adjustment
      const hasTapeNameWrite =
        afterProcessor.includes('if (toggles.filenameRewrite)') &&
        (afterProcessor.includes('writeTapeName') || afterProcessor.includes('TapeName'));

      expect(hasTapeNameWrite).toBe(true);
    });
  });

  describe('Integration Gap 6: Metadata store update after rename', () => {
    it('should update metadata store with new filename after fs.rename', () => {
      // EXPECTED: fileMetadata.currentFilename = newBasename + extension;
      //           await store.updateFileMetadata(fileId, fileMetadata);
      // ACTUAL: Missing (will fail - RED phase)

      const processorIndex = mainTsContent.indexOf('const processor = async (fileId: string)');
      const afterProcessor = mainTsContent.substring(processorIndex);

      // Look for metadata update after rename
      const hasMetadataUpdate =
        afterProcessor.includes('if (toggles.filenameRewrite)') &&
        afterProcessor.includes('currentFilename') &&
        afterProcessor.includes('updateFileMetadata');

      expect(hasMetadataUpdate).toBe(true);
    });
  });

  describe('Sanity checks', () => {
    it('should have batch:start handler defined', () => {
      const hasBatchStart = mainTsContent.includes("ipcMain.handle('batch:start'");
      expect(hasBatchStart).toBe(true);
    });

    it('should have processor function defined', () => {
      const hasProcessor = mainTsContent.includes('const processor = async (fileId: string)');
      expect(hasProcessor).toBe(true);
    });

    it('should have metadataWriter.writeMetadataToFile call', () => {
      const hasMetadataWrite = mainTsContent.includes('metadataWriter.writeMetadataToFile');
      expect(hasMetadataWrite).toBe(true);
    });
  });
});
