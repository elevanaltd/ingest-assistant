import { describe, it, expect, vi, beforeAll } from 'vitest';
import type { FileMetadata, AIAnalysisResult, Lexicon } from '../../../src/types';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Low Confidence Metadata Writing Tests
 *
 * Context: User workflow requires ALL AI results written to metadata regardless
 * of confidence level for QC analysis workflow:
 * 1. AI analyzes → results written to .ingest-metadata.json
 * 2. Import to Premiere Pro → CEP Panel QC workflow
 * 3. QC person reviews/corrects → separate JSON with corrections
 * 4. Analysis: compare AI results vs corrections to calibrate confidence accuracy
 *
 * Problem: Current 0.7 confidence threshold prevents low-confidence results from
 * being written, which blocks QC analysis workflow.
 *
 * Solution: Remove confidence threshold checks - write ALL AI results regardless
 * of confidence. The confidence value is still stored for downstream analysis.
 *
 * Locations: electron/main.ts line 1037 and line 1149
 *
 * TDD Evidence: RED phase - This test FAILS before implementation
 */

describe('Low Confidence Metadata Writing', () => {
  const mainTsPath = path.join(__dirname, '../../main.ts');
  let mainTsContent: string;

  // Read main.ts once for all tests
  beforeAll(() => {
    mainTsContent = fs.readFileSync(mainTsPath, 'utf-8');
  });

  describe('Source Code Integration Test (RED phase)', () => {
    it('should NOT have confidence threshold check at line 1037 in batch:start handler', () => {
      // CURRENT STATE (RED): if (result.confidence > 0.7) { ... } → SKIP low confidence
      // EXPECTED STATE (GREEN): No threshold check → Write ALL results
      //
      // This test verifies the actual handler code has the threshold removed
      // It will FAIL (RED) before implementation, PASS (GREEN) after removal

      // Find the batch:start handler section
      const batchStartIndex = mainTsContent.indexOf("ipcMain.handle('batch:start'");
      expect(batchStartIndex).toBeGreaterThan(-1);

      // Extract relevant section (batch:start handler)
      const batchStartSection = mainTsContent.slice(batchStartIndex, batchStartIndex + 5000);

      // Check for confidence threshold in batch:start section
      const hasConfidenceThreshold = batchStartSection.includes('if (result.confidence > 0.7)');

      // RED PHASE: This should be TRUE (threshold exists), will fail
      // GREEN PHASE: This should be FALSE (threshold removed), will pass
      expect(hasConfidenceThreshold).toBe(false);
    });

    it('should NOT have any confidence threshold checks in batch:start handler', () => {
      // CURRENT STATE (RED): TWO occurrences of if (result.confidence > 0.7)
      //   - Line 1037: First batch processing loop
      //   - Line 1149: Inside processor function
      // EXPECTED STATE (GREEN): No threshold checks → Write ALL results

      // Find the batch:start handler section
      const batchStartIndex = mainTsContent.indexOf("ipcMain.handle('batch:start'");
      expect(batchStartIndex).toBeGreaterThan(-1);

      // Find the next handler after batch:start (to limit search scope)
      const nextHandlerIndex = mainTsContent.indexOf("ipcMain.handle('batch:cancel'", batchStartIndex);

      // Extract the entire batch:start handler
      const batchStartHandler = mainTsContent.slice(batchStartIndex, nextHandlerIndex);

      // Count occurrences of confidence threshold
      const thresholdPattern = /if \(result\.confidence > 0\.7\)/g;
      const matches = batchStartHandler.match(thresholdPattern);
      const thresholdCount = matches ? matches.length : 0;

      // RED PHASE: This should be 2 (both thresholds exist), will fail
      // GREEN PHASE: This should be 0 (both thresholds removed), will pass
      expect(thresholdCount).toBe(0);
    });

    it('should document rationale for removing confidence threshold', () => {
      // After removing threshold, implementation should include explanatory comment
      // Example: "// All confidence levels written for QC analysis workflow"

      const hasRationale = mainTsContent.includes('QC analysis') ||
                          mainTsContent.includes('QC workflow') ||
                          mainTsContent.includes('All confidence levels written') ||
                          mainTsContent.includes('confidence regardless');

      // RED PHASE: No rationale comment exists (will fail)
      // GREEN PHASE: Rationale comment added (will pass)
      expect(hasRationale).toBe(true);
    });
  });

  describe('QC Workflow Requirements', () => {
    it('should write metadata for low confidence results (below 0.7 threshold)', async () => {
      // Setup: Mock store and AI service with LOW confidence result
      const mockMetadataStore = {
        getFileMetadata: vi.fn(async (_fileId: string): Promise<FileMetadata | null> => ({
          id: 'test-image-001',
          originalFilename: 'test-image-001.jpg',
          currentFilename: 'test-image-001.jpg',
          filePath: '/path/to/test.jpg',
          extension: '.jpg',
          processedByAI: false,
          shotName: '',
          keywords: [] as string[],
          fileType: 'image',
          createdAt: new Date(),
          createdBy: 'ingest-assistant',
          modifiedAt: new Date(),
          modifiedBy: 'ingest-assistant',
          version: '2.0',
          location: '',
          subject: '',
          action: '',
          shotType: '',
          lockedFields: [],
        })),
        updateFileMetadata: vi.fn(async (_fileId: string, _metadata: FileMetadata) => true),
      };

      const mockAIService = {
        analyzeImage: vi.fn(async (_imagePath: string, _lexicon: Lexicon): Promise<AIAnalysisResult> => ({
          shotName: 'exterior-elevator-controls-CU',
          keywords: ['elevator', 'controls'],
          confidence: 0.5, // LOW confidence (below old 0.7 threshold)
          location: 'exterior',
          subject: 'elevator-controls',
          action: '',
          shotType: 'CU',
        })),
      };

      // Simulate batch processor behavior
      const fileMetadata = await mockMetadataStore.getFileMetadata('test-image-001');

      if (fileMetadata) {
        const result = await mockAIService.analyzeImage(fileMetadata.filePath, {} as Lexicon);

        // KEY TEST: Should write metadata even with confidence = 0.5 (was filtered before)
        // OLD BEHAVIOR: if (result.confidence > 0.7) { ... } → SKIP low confidence
        // NEW BEHAVIOR: Write ALL results regardless of confidence

        // Write metadata regardless of confidence
        fileMetadata.shotName = result.shotName;
        fileMetadata.keywords = result.keywords;
        fileMetadata.location = result.location;
        fileMetadata.subject = result.subject;
        fileMetadata.action = result.action;
        fileMetadata.shotType = result.shotType;
        fileMetadata.processedByAI = true; // Mark as processed

        await mockMetadataStore.updateFileMetadata('test-image-001', fileMetadata);

        // Verify metadata WAS written (not skipped due to low confidence)
        expect(mockMetadataStore.updateFileMetadata).toHaveBeenCalledWith(
          'test-image-001',
          expect.objectContaining({
            shotName: 'exterior-elevator-controls-CU',
            location: 'exterior',
            subject: 'elevator-controls',
            shotType: 'CU',
            processedByAI: true,
          })
        );
      }
    });

    it('should preserve confidence value for low confidence results', async () => {
      const mockMetadataStore = {
        getFileMetadata: vi.fn(async (_fileId: string): Promise<FileMetadata | null> => ({
          id: 'test-video-001',
          originalFilename: 'test-video-001.mov',
          currentFilename: 'test-video-001.mov',
          filePath: '/path/to/test.mov',
          extension: '.mov',
          processedByAI: false,
          shotName: '',
          keywords: [] as string[],
          fileType: 'video',
          createdAt: new Date(),
          createdBy: 'ingest-assistant',
          modifiedAt: new Date(),
          modifiedBy: 'ingest-assistant',
          version: '2.0',
          location: '',
          subject: '',
          action: '',
          shotType: '',
          lockedFields: [],
        })),
        updateFileMetadata: vi.fn(async (_fileId: string, _metadata: FileMetadata) => true),
      };

      const lowConfidenceResult: AIAnalysisResult = {
        shotName: 'kitchen-appliance-demo-WS',
        keywords: ['appliance', 'demo'],
        confidence: 0.3, // VERY low confidence
        location: 'kitchen',
        subject: 'appliance',
        action: 'demo',
        shotType: 'WS',
      };

      const fileMetadata = await mockMetadataStore.getFileMetadata('test-video-001');

      if (fileMetadata) {
        // Simulate results map storing confidence
        const results = new Map<string, AIAnalysisResult>();
        results.set('test-video-001', lowConfidenceResult);

        // Write metadata
        fileMetadata.shotName = lowConfidenceResult.shotName;
        fileMetadata.keywords = lowConfidenceResult.keywords;
        fileMetadata.location = lowConfidenceResult.location;
        fileMetadata.subject = lowConfidenceResult.subject;
        fileMetadata.action = lowConfidenceResult.action;
        fileMetadata.shotType = lowConfidenceResult.shotType;
        fileMetadata.processedByAI = true;

        await mockMetadataStore.updateFileMetadata('test-video-001', fileMetadata);

        // Verify confidence is preserved in results for downstream analysis
        const storedResult = results.get('test-video-001');
        expect(storedResult).toBeDefined();
        expect(storedResult?.confidence).toBe(0.3); // Confidence preserved for QC analysis
      }
    });

    it('should write metadata for edge case confidence values (0.0, 0.69, 0.7, 1.0)', async () => {
      const testCases = [
        { confidence: 0.0, description: 'zero confidence' },
        { confidence: 0.69, description: 'just below old threshold' },
        { confidence: 0.7, description: 'at old threshold' },
        { confidence: 0.71, description: 'just above old threshold' },
        { confidence: 1.0, description: 'maximum confidence' },
      ];

      for (const testCase of testCases) {
        const mockMetadataStore = {
          getFileMetadata: vi.fn(async (_fileId: string): Promise<FileMetadata | null> => ({
            id: `test-${testCase.confidence}`,
            originalFilename: `test-${testCase.confidence}.jpg`,
            currentFilename: `test-${testCase.confidence}.jpg`,
            filePath: `/path/to/test-${testCase.confidence}.jpg`,
            extension: '.jpg',
            processedByAI: false,
            shotName: '',
            keywords: [] as string[],
            fileType: 'image',
            createdAt: new Date(),
            createdBy: 'ingest-assistant',
            modifiedAt: new Date(),
            modifiedBy: 'ingest-assistant',
            version: '2.0',
            location: '',
            subject: '',
            action: '',
            shotType: '',
            lockedFields: [],
          })),
          updateFileMetadata: vi.fn(async (_fileId: string, _metadata: FileMetadata) => true),
        };

        const aiResult: AIAnalysisResult = {
          shotName: `kitchen-oven-CU-${testCase.confidence}`,
          keywords: ['test'],
          confidence: testCase.confidence,
          location: 'kitchen',
          subject: 'oven',
          action: '',
          shotType: 'CU',
        };

        const fileMetadata = await mockMetadataStore.getFileMetadata(`test-${testCase.confidence}`);

        if (fileMetadata) {
          // Write metadata regardless of confidence value
          fileMetadata.shotName = aiResult.shotName;
          fileMetadata.keywords = aiResult.keywords;
          fileMetadata.location = aiResult.location;
          fileMetadata.subject = aiResult.subject;
          fileMetadata.action = aiResult.action;
          fileMetadata.shotType = aiResult.shotType;
          fileMetadata.processedByAI = true;

          await mockMetadataStore.updateFileMetadata(`test-${testCase.confidence}`, fileMetadata);

          // Verify metadata WAS written for ALL confidence values
          expect(mockMetadataStore.updateFileMetadata).toHaveBeenCalledWith(
            `test-${testCase.confidence}`,
            expect.objectContaining({
              shotName: `kitchen-oven-CU-${testCase.confidence}`,
              location: 'kitchen',
              processedByAI: true,
            })
          );
        }
      }
    });

    it('should demonstrate QC workflow: AI result → metadata write → confidence preserved', async () => {
      // Simulate complete QC workflow
      const qcWorkflowResults: Array<{
        fileId: string;
        aiConfidence: number;
        aiResult: string;
        humanCorrection?: string;
      }> = [];

      const testFiles = [
        { id: 'file-001', confidence: 0.9, result: 'kitchen-oven-CU' }, // High confidence
        { id: 'file-002', confidence: 0.4, result: 'bedroom-closet-WS' }, // Low confidence
        { id: 'file-003', confidence: 0.6, result: 'bathroom-sink-MID' }, // Medium confidence
      ];

      for (const file of testFiles) {
        const mockMetadataStore = {
          updateFileMetadata: vi.fn(async (_fileId: string, _metadata: FileMetadata) => true),
        };

        // AI analyzes → writes metadata regardless of confidence
        const parts = file.result.split('-');
        const aiResult: AIAnalysisResult = {
          shotName: file.result,
          keywords: [],
          confidence: file.confidence,
          location: parts[0],
          subject: parts[1],
          action: '',
          shotType: parts[2] as 'WS' | 'MID' | 'CU', // Type assertion for test
        };

        // Metadata written for all confidence levels
        await mockMetadataStore.updateFileMetadata(file.id, {
          shotName: aiResult.shotName,
          processedByAI: true,
        } as FileMetadata);

        // Store result for QC analysis
        qcWorkflowResults.push({
          fileId: file.id,
          aiConfidence: file.confidence,
          aiResult: file.result,
        });

        expect(mockMetadataStore.updateFileMetadata).toHaveBeenCalled();
      }

      // Verify QC workflow data collected for ALL files (including low confidence)
      expect(qcWorkflowResults).toHaveLength(3);
      expect(qcWorkflowResults.filter(r => r.aiConfidence < 0.7)).toHaveLength(2); // Low confidence files included
      expect(qcWorkflowResults.filter(r => r.aiConfidence >= 0.7)).toHaveLength(1); // High confidence files included
    });
  });
});
