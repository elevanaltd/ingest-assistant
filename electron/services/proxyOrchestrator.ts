import { ProxyGenerator } from './proxyGenerator';
import { ExifPreserver, ExifVerificationResult } from './exifPreserver';
import * as path from 'path';
import * as fs from 'fs';

/**
 * ProxyOrchestrator - Coordinates ProxyGenerator + ExifPreserver workflow
 *
 * Features (Phase 1b B2.3):
 * - Fail-log-continue: Single file failure doesn't halt batch
 * - Partial success reporting (e.g., 95/100 completed)
 * - Error collection for user display
 * - Progress event emission for UI updates
 *
 * B0 Condition 2 Compliance: Fail-log-continue with comprehensive error reporting
 */

export interface ProxyJobConfig {
  rawVideoPaths: string[];
  proxyOutputDir: string;
  presetId?: string; // Optional preset ID (defaults to '2k-prores-proxy' if undefined)
}

export interface ProxyJobResult {
  success: boolean; // true only if all files succeeded
  completedCount: number;
  failedCount: number;
  failedFiles: Array<{ filename: string; error: string }>;
  verificationFailures: ExifVerificationResult[];
}

export interface ProxyProgressEvent {
  type: 'file_start' | 'file_complete' | 'file_failed' | 'transcode_progress' | 'phase_start';
  filename?: string;
  index?: number;
  total?: number;
  success?: boolean;
  error?: string;
  timeString?: string;
  percentage?: number;
  phase?: 'transcode' | 'exif_preserve';
}

export class ProxyOrchestrator {
  private proxyGenerator: ProxyGenerator;
  private exifPreserver: ExifPreserver;

  constructor() {
    this.proxyGenerator = new ProxyGenerator();
    this.exifPreserver = new ExifPreserver();
  }

  /**
   * Execute proxy generation job with fail-log-continue error handling
   * Returns partial success results with collected errors
   */
  async executeJob(
    jobConfig: ProxyJobConfig,
    progressCallback: (event: ProxyProgressEvent) => void
  ): Promise<ProxyJobResult> {
    const { rawVideoPaths, proxyOutputDir, presetId } = jobConfig;
    const total = rawVideoPaths.length;

    let completedCount = 0;
    let failedCount = 0;
    const failedFiles: Array<{ filename: string; error: string }> = [];
    const successfulProxies: string[] = [];

    console.log('[ProxyOrchestrator] Starting job:', total, 'files');

    // Phase 1: Transcode (fail-log-continue)
    progressCallback({ type: 'phase_start', phase: 'transcode' });

    for (let i = 0; i < rawVideoPaths.length; i++) {
      const rawPath = rawVideoPaths[i];
      const filename = path.basename(rawPath);

      progressCallback({
        type: 'file_start',
        filename,
        index: i,
        total
      });

      try {
        const proxyPath = await this.proxyGenerator.generateProxy(
          rawPath,
          proxyOutputDir,
          {
            presetId, // Pass through user-selected preset (or undefined for default)
            onProgress: (timeString, percentage) => {
              progressCallback({
                type: 'transcode_progress',
                filename,
                index: i,
                total,
                timeString,
                percentage
              });
            }
          }
        );

        successfulProxies.push(proxyPath);
        completedCount++;

        progressCallback({
          type: 'file_complete',
          filename,
          success: true
        });

        console.log('[ProxyOrchestrator] Completed:', filename);
      } catch (error) {
        // FAIL-LOG-CONTINUE: Log error but continue processing
        failedCount++;
        const errorMessage = error instanceof Error ? error.message : String(error);

        failedFiles.push({
          filename,
          error: errorMessage
        });

        progressCallback({
          type: 'file_failed',
          filename,
          error: errorMessage
        });

        console.error('[ProxyOrchestrator] Failed:', filename, '-', errorMessage);
      }
    }

    // Phase 2: EXIF Preservation (only for successful transcodes)
    let verificationFailures: ExifVerificationResult[] = [];

    if (successfulProxies.length > 0) {
      progressCallback({ type: 'phase_start', phase: 'exif_preserve' });

      console.log('[ProxyOrchestrator] Starting EXIF preservation for', successfulProxies.length, 'proxies');

      try {
        // Extract DateTimeOriginal from raw videos
        const rawDateMap = await this.exifPreserver.extractBatch(rawVideoPaths);

        // Build proxy -> dateTime map (only for successful proxies)
        const proxyDateMap = new Map<string, string>();
        for (const [rawPath, dateTime] of rawDateMap.entries()) {
          const rawBasename = path.basename(rawPath, path.extname(rawPath));
          const proxyPath = successfulProxies.find(p => p.includes(`${rawBasename}_proxy`));

          if (proxyPath) {
            proxyDateMap.set(proxyPath, dateTime);
          }
        }

        // Write DateTimeOriginal to proxies
        await this.exifPreserver.writeBatch(proxyDateMap);

        // I6 Compliance: Write TapeName (original camera filename) to proxies
        // This enables CEP Panel to match proxies back to raw footage
        const proxyTapeNameMap = new Map<string, string>();
        for (const rawPath of rawVideoPaths) {
          const rawBasename = path.basename(rawPath, path.extname(rawPath));
          const proxyPath = successfulProxies.find(p => p.includes(`${rawBasename}_proxy`));

          if (proxyPath) {
            proxyTapeNameMap.set(proxyPath, rawBasename); // TapeName = original filename (e.g., "EA001827")
          }
        }

        await this.exifPreserver.writeTapeNameBatch(proxyTapeNameMap);
        console.log('[ProxyOrchestrator] TapeName preservation complete -', proxyTapeNameMap.size, 'files');

        // Verify DateTimeOriginal matches
        const verificationResults = await this.exifPreserver.verifyBatch(
          rawDateMap,
          successfulProxies
        );

        // Collect I1 violations
        verificationFailures = verificationResults.filter(r => !r.matches);

        console.log('[ProxyOrchestrator] EXIF preservation complete -', verificationFailures.length, 'I1 violations');
      } catch (error) {
        console.error('[ProxyOrchestrator] EXIF preservation failed:', error);
        // Don't fail entire job if EXIF phase fails - transcodes still completed
      }
    }

    // Cleanup: Remove XMP sidecar files (exiftool -overwrite_original creates these)
    // Metadata is already embedded in the MOV files, sidecars cause Premiere Pro linking errors
    // Only clean up sidecars for proxies generated in THIS job to avoid deleting unrelated XMP files
    this.cleanupXmpSidecars(successfulProxies);

    const result: ProxyJobResult = {
      success: failedCount === 0 && verificationFailures.length === 0,
      completedCount,
      failedCount,
      failedFiles,
      verificationFailures
    };

    console.log('[ProxyOrchestrator] Job complete:', completedCount, '/', total, 'succeeded');
    return result;
  }

  /**
   * Cleanup: Remove XMP sidecar files created for proxies in this job only.
   * exiftool creates .xmp sidecars alongside the video files it writes to.
   * These cause Premiere Pro linking errors, but metadata is already embedded in the video files.
   * Only targets sidecars matching successfulProxies to avoid deleting unrelated XMP files.
   */
  private cleanupXmpSidecars(proxyPaths: string[]): void {
    let deletedCount = 0;

    for (const proxyPath of proxyPaths) {
      const sidecarPath = proxyPath + '.xmp';
      try {
        if (fs.existsSync(sidecarPath)) {
          fs.unlinkSync(sidecarPath);
          console.log('[ProxyOrchestrator] Cleaned up XMP sidecar:', path.basename(sidecarPath));
          deletedCount++;
        }
      } catch (err) {
        console.warn('[ProxyOrchestrator] Failed to delete XMP sidecar:', path.basename(sidecarPath), '-', err);
      }
    }

    if (deletedCount > 0) {
      console.log('[ProxyOrchestrator] Removed', deletedCount, 'XMP sidecar files');
    }
  }
}
