import { spawn } from 'child_process';
import * as path from 'path';

/**
 * ExifPreserver - Preserves DateTimeOriginal metadata from raw videos to proxies
 *
 * Features (Phase 1b B2.2):
 * - 3-phase workflow: Extract → Transcode (ProxyGenerator) → Write → Verify
 * - Batch operations for efficiency (single exiftool call per phase)
 * - I1 compliance validation (chronological ordering preserved)
 *
 * B0 Condition 4 Compliance: EXIF DateTimeOriginal preservation with verification
 */

/**
 * Helper: Extract filename without extension (cross-platform)
 * Handles both Unix (/) and Windows (\) path separators
 * Case-insensitive extension removal
 */
function getBasenameWithoutExt(filePath: string): string {
  const basename = path.basename(filePath);
  const ext = path.extname(basename);
  return basename.slice(0, -ext.length);
}

export interface ExifVerificationResult {
  proxyPath: string;
  rawDate: string | undefined;
  proxyDate: string | undefined;
  matches: boolean;
}

export class ExifPreserver {
  /**
   * Phase 1: Extract DateTimeOriginal from raw videos using exiftool -json
   * Returns Map of rawPath -> DateTimeOriginal
   */
  async extractBatch(rawVideoPaths: string[]): Promise<Map<string, string>> {
    if (rawVideoPaths.length === 0) {
      return new Map();
    }

    return new Promise((resolve, reject) => {
      const args = ['-json', '-DateTimeOriginal', ...rawVideoPaths];

      console.log('[ExifPreserver] Extracting DateTimeOriginal from', rawVideoPaths.length, 'raw videos');
      const exiftoolProcess = spawn('exiftool', args);

      let stdout = '';
      let stderr = '';

      exiftoolProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      exiftoolProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      exiftoolProcess.on('close', (code) => {
        if (code !== 0) {
          console.error('[ExifPreserver] exiftool extraction failed:', stderr);
          reject(new Error('Failed to extract EXIF data'));
          return;
        }

        try {
          const results = JSON.parse(stdout);
          const dateMap = new Map<string, string>();

          for (const result of results) {
            if (result.DateTimeOriginal) {
              dateMap.set(result.SourceFile, result.DateTimeOriginal);
            }
          }

          console.log('[ExifPreserver] Extracted', dateMap.size, 'timestamps');
          resolve(dateMap);
        } catch (err) {
          console.error('[ExifPreserver] Failed to parse exiftool output:', err);
          reject(new Error('Failed to parse EXIF data'));
        }
      });

      exiftoolProcess.on('error', (err) => {
        console.error('[ExifPreserver] exiftool spawn error:', err);
        reject(err);
      });
    });
  }

  /**
   * Phase 3a: Write DateTimeOriginal to proxy videos using exiftool
   * Accepts Map of proxyPath -> DateTimeOriginal
   *
   * FIX (I1 compliance): Calls exiftool separately for each file to preserve per-file timestamps.
   * Previous implementation called exiftool once with all files, which applied LAST value to ALL files.
   *
   * Concurrency limiting: Processes files in chunks of 8 to prevent EMFILE errors on large batches.
   * Risk mitigation: 500+ proxies with unbounded Promise.all() causes OS file descriptor exhaustion.
   */
  async writeBatch(proxyDateMap: Map<string, string>): Promise<void> {
    if (proxyDateMap.size === 0) {
      return;
    }

    console.log('[ExifPreserver] Writing DateTimeOriginal to', proxyDateMap.size, 'proxy videos');

    const CONCURRENCY_LIMIT = 8;
    const entries = Array.from(proxyDateMap.entries());

    // Process files in chunks to limit concurrent exiftool processes
    for (let i = 0; i < entries.length; i += CONCURRENCY_LIMIT) {
      const chunk = entries.slice(i, i + CONCURRENCY_LIMIT);
      const chunkPromises = chunk.map(([proxyPath, dateTime]) =>
        this.writeSingleFile(proxyPath, dateTime)
      );
      await Promise.all(chunkPromises);
    }

    console.log('[ExifPreserver] Write complete');
  }

  /**
   * Write DateTimeOriginal to a single proxy file using exiftool
   * Extracted for concurrency limiting and testability
   */
  private async writeSingleFile(proxyPath: string, dateTime: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const args = [
        '-overwrite_original',
        `-QuickTime:DateTimeOriginal=${dateTime}`,
        proxyPath
      ];

      const exiftoolProcess = spawn('exiftool', args);

      let stderr = '';

      exiftoolProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      exiftoolProcess.on('close', (code) => {
        if (code !== 0) {
          console.error('[ExifPreserver] exiftool write failed for', proxyPath, ':', stderr);
          reject(new Error('Failed to write EXIF data'));
          return;
        }

        resolve();
      });

      exiftoolProcess.on('error', (err) => {
        console.error('[ExifPreserver] exiftool spawn error for', proxyPath, ':', err);
        reject(err);
      });
    });
  }

  /**
   * Phase 3b: Verify DateTimeOriginal matches between raw and proxies
   * Returns verification results with I1 compliance status
   */
  async verifyBatch(
    rawDateMap: Map<string, string>,
    proxyPaths: string[]
  ): Promise<ExifVerificationResult[]> {
    return new Promise((resolve, reject) => {
      const args = ['-json', '-DateTimeOriginal', ...proxyPaths];

      console.log('[ExifPreserver] Verifying DateTimeOriginal in', proxyPaths.length, 'proxy videos');
      const exiftoolProcess = spawn('exiftool', args);

      let stdout = '';
      let stderr = '';

      exiftoolProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      exiftoolProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      exiftoolProcess.on('close', (code) => {
        if (code !== 0) {
          console.error('[ExifPreserver] exiftool verification failed:', stderr);
          reject(new Error('Failed to verify EXIF data'));
          return;
        }

        try {
          const results = JSON.parse(stdout);
          const verificationResults: ExifVerificationResult[] = [];

          // Build lookup map of proxy -> proxyDate
          const proxyDateMap = new Map<string, string | undefined>();
          for (const result of results) {
            proxyDateMap.set(result.SourceFile, result.DateTimeOriginal);
          }

          // Compare each proxy against raw
          for (const [rawPath, rawDate] of rawDateMap.entries()) {
            // Find corresponding proxy (assume {basename}_proxy.{ext} naming)
            const proxyPath = proxyPaths.find(p => {
              // Match by filename pattern (cross-platform, case-insensitive)
              const rawBasename = getBasenameWithoutExt(rawPath);
              const proxyBasename = getBasenameWithoutExt(p);
              return proxyBasename.toLowerCase().includes(`${rawBasename.toLowerCase()}_proxy`);
            });

            if (!proxyPath) {
              console.warn('[ExifPreserver] No proxy found for', rawPath);
              continue;
            }

            const proxyDate = proxyDateMap.get(proxyPath);
            const matches = proxyDate === rawDate;

            verificationResults.push({
              proxyPath,
              rawDate,
              proxyDate,
              matches
            });

            if (!matches) {
              console.warn('[ExifPreserver] I1 VIOLATION:', proxyPath, '- Expected:', rawDate, 'Got:', proxyDate);
            }
          }

          console.log('[ExifPreserver] Verification complete -', verificationResults.filter(r => r.matches).length, '/', verificationResults.length, 'match');
          resolve(verificationResults);
        } catch (err) {
          console.error('[ExifPreserver] Failed to parse verification output:', err);
          reject(new Error('Failed to parse verification data'));
        }
      });

      exiftoolProcess.on('error', (err) => {
        console.error('[ExifPreserver] exiftool spawn error:', err);
        reject(err);
      });
    });
  }

  /**
   * Full workflow coordinator: Extract → Write → Verify
   * Assumes proxies have been generated between extract and write phases
   */
  async preserveAndVerify(
    rawPaths: string[],
    proxyPaths: string[]
  ): Promise<ExifVerificationResult[]> {
    console.log('[ExifPreserver] Starting preserve-and-verify workflow');

    // Phase 1: Extract DateTimeOriginal from raw videos
    const rawDateMap = await this.extractBatch(rawPaths);

    // Build proxyPath -> dateTime map for writing
    const proxyDateMap = new Map<string, string>();
    for (const [rawPath, dateTime] of rawDateMap.entries()) {
      // Find corresponding proxy (cross-platform, case-insensitive)
      const proxyPath = proxyPaths.find(p => {
        const rawBasename = getBasenameWithoutExt(rawPath);
        const proxyBasename = getBasenameWithoutExt(p);
        return proxyBasename.toLowerCase().includes(`${rawBasename.toLowerCase()}_proxy`);
      });

      if (proxyPath) {
        proxyDateMap.set(proxyPath, dateTime);
      }
    }

    // Phase 3a: Write DateTimeOriginal to proxies
    await this.writeBatch(proxyDateMap);

    // Phase 3b: Verify DateTimeOriginal matches
    const results = await this.verifyBatch(rawDateMap, proxyPaths);

    console.log('[ExifPreserver] Workflow complete');
    return results;
  }
}
