import { spawn } from 'child_process';
import ffmpeg from '@ffmpeg-installer/ffmpeg';
import * as path from 'path';
import * as fs from 'fs';
import { getPresetById } from './proxyPresets';

/**
 * ProxyGenerator - Generates proxy files with configurable formats
 *
 * Features (Phase 1b B2.1 + Configurable Presets):
 * - ffmpeg stderr `time=` parsing for progress (not 17.5% heuristic)
 * - Duration extraction via ffprobe
 * - Progress percentage calculation (currentTime / duration * 100)
 * - 10-minute timeout per video
 * - Configurable proxy formats (5 presets: 2K/1080p/4K ProRes, 2K/1080p H.264)
 * - Extension tied to codec (ProRes → .MOV, H.264 → .mp4)
 *
 * B0 Condition 1 Compliance: Progress tracking via ffmpeg stderr parsing
 */

export interface ProxyGeneratorOptions {
  timeoutMs?: number; // Default: 10 minutes
}

export interface GenerateProxyOptions {
  onProgress?: (timeString: string, percentage: number) => void;
  outputFilename?: string; // Custom filename (default: {basename}_proxy.{ext})
  presetId?: string; // Proxy format preset ID (default: '2k-prores-proxy')
}

export class ProxyGenerator {
  private timeoutMs: number;

  constructor(options: ProxyGeneratorOptions = {}) {
    this.timeoutMs = options.timeoutMs ?? 10 * 60 * 1000; // 10 minutes default
  }

  /**
   * Extract duration from source video using ffprobe
   * Returns duration in seconds
   */
  async extractDuration(sourceFile: string): Promise<number> {
    return new Promise((resolve, reject) => {
      const args = [
        '-v', 'error',
        '-show_entries', 'format=duration',
        '-of', 'default=noprint_wrappers=1:nokey=1',
        sourceFile
      ];

      console.log('[ProxyGenerator] Extracting duration via ffprobe:', sourceFile);
      const ffprobeProcess = spawn(ffmpeg.path.replace('ffmpeg', 'ffprobe'), args);

      let stdout = '';
      let stderr = '';

      ffprobeProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      ffprobeProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      ffprobeProcess.on('close', (code) => {
        if (code !== 0) {
          console.error('[ProxyGenerator] ffprobe failed:', stderr);
          reject(new Error('Failed to extract duration'));
          return;
        }

        const duration = parseFloat(stdout.trim());
        if (isNaN(duration) || duration <= 0) {
          reject(new Error('Invalid duration'));
          return;
        }

        console.log('[ProxyGenerator] Duration:', duration, 'seconds');
        resolve(duration);
      });

      ffprobeProcess.on('error', (err) => {
        console.error('[ProxyGenerator] ffprobe spawn error:', err);
        reject(err);
      });
    });
  }

  /**
   * Generate proxy file using configured preset format
   * Returns path to generated proxy file
   */
  async generateProxy(
    sourceFile: string,
    outputDir: string,
    options: GenerateProxyOptions = {}
  ): Promise<string> {
    const { onProgress, outputFilename, presetId } = options;

    // Get preset configuration (defaults to 2k-prores-proxy)
    const preset = getPresetById(presetId);

    // B2.4: Preflight Validation
    // 1. Check source file exists
    if (!fs.existsSync(sourceFile)) {
      throw new Error('Source file does not exist');
    }

    // 2. Check source has video extension
    const ext = path.extname(sourceFile).toLowerCase();
    const validExtensions = ['.mov', '.mp4', '.avi', '.mkv', '.m4v', '.webm'];
    if (!validExtensions.includes(ext)) {
      throw new Error('Source file must be a video');
    }

    // Determine output filename
    // BUG FIX: Use preset extension, NOT source extension
    const basename = path.basename(sourceFile, path.extname(sourceFile));
    const defaultFilename = `${basename}_proxy${preset.extension.toLowerCase()}`;
    const finalFilename = outputFilename || defaultFilename;
    const outputPath = path.join(outputDir, finalFilename);

    // Extract duration first (for progress calculation)
    let duration = 0;
    try {
      duration = await this.extractDuration(sourceFile);
    } catch (err) {
      console.warn('[ProxyGenerator] Could not extract duration:', err);
      // Continue without duration - progress will show 0%
    }

    // Build ffmpeg args dynamically from preset
    const args = [
      '-hide_banner',
      '-y', // Overwrite output file
      '-i', sourceFile
    ];

    // Add scaling filter if scale is specified (null = keep original resolution)
    if (preset.scale) {
      args.push('-vf', `scale=${preset.scale}`);
    }

    // Add video codec args based on preset
    if (preset.codec === 'prores_ks') {
      // ProRes codec args
      args.push('-c:v', 'prores_ks');
      args.push('-profile:v', preset.profile!.toString());
      args.push('-vendor', 'apl0');
      args.push('-pix_fmt', 'yuv422p10le');
      args.push('-c:a', 'pcm_s16le');
    } else if (preset.codec === 'libx264') {
      // H.264 codec args
      args.push('-c:v', 'libx264');
      args.push('-preset', 'medium');
      args.push('-crf', preset.crf!.toString());
      args.push('-pix_fmt', 'yuv422p10le');
      args.push('-c:a', 'aac');
    }

    // Add output path
    args.push(outputPath);

    console.log('[ProxyGenerator] Starting proxy generation:', sourceFile);
    console.log('[ProxyGenerator] Output:', outputPath);

    return new Promise((resolve, reject) => {
      const ffmpegProcess = spawn(ffmpeg.path, args);
      let stderr = '';

      // Setup timeout
      const timeoutHandle = setTimeout(() => {
        console.error('[ProxyGenerator] Timeout after', this.timeoutMs, 'ms');
        ffmpegProcess.kill();

        // B2.5: Cleanup partial proxy on timeout
        this.cleanupPartialProxy(outputPath);

        reject(new Error('Transcode timeout'));
      }, this.timeoutMs);

      // Helper: Convert HH:MM:SS.MS to seconds
      const timeToSeconds = (timeStr: string): number => {
        const parts = timeStr.split(':');
        const hours = parseInt(parts[0], 10);
        const minutes = parseInt(parts[1], 10);
        const seconds = parseFloat(parts[2]);
        return hours * 3600 + minutes * 60 + seconds;
      };

      ffmpegProcess.stderr.on('data', (data) => {
        const chunk = data.toString();
        stderr += chunk;

        // Parse progress from time= line
        if (chunk.includes('time=')) {
          const match = chunk.match(/time=(\d+:\d+:\d+\.\d+)/);
          if (match) {
            const currentTime = timeToSeconds(match[1]);
            const percentage = duration > 0 ? Math.round((currentTime / duration) * 100) : 0;

            console.log('[ProxyGenerator] Progress:', match[1], `(${percentage}%)`);

            if (onProgress) {
              onProgress(match[1], percentage);
            }
          }
        }
      });

      ffmpegProcess.on('close', (code) => {
        clearTimeout(timeoutHandle);

        if (code === 0) {
          console.log('[ProxyGenerator] Proxy generation complete:', outputPath);
          resolve(outputPath);
        } else {
          console.error('[ProxyGenerator] FFmpeg failed with code:', code);
          console.error('[ProxyGenerator] FFmpeg stderr:', stderr);

          // B2.5: Cleanup partial proxy on failure
          this.cleanupPartialProxy(outputPath);

          reject(new Error('Proxy generation failed'));
        }
      });

      ffmpegProcess.on('error', (err) => {
        clearTimeout(timeoutHandle);
        console.error('[ProxyGenerator] FFmpeg spawn error:', err);

        // B2.5: Cleanup partial proxy on error
        this.cleanupPartialProxy(outputPath);

        reject(err);
      });
    });
  }

  /**
   * B2.5: Cleanup partial proxy file on failure
   * Handles ENOENT gracefully (file may not exist yet)
   */
  private cleanupPartialProxy(proxyPath: string): void {
    try {
      fs.unlinkSync(proxyPath);
      console.log('[ProxyGenerator] Cleaned up partial proxy:', proxyPath);
    } catch (error) {
      // Ignore ENOENT (file doesn't exist) - other errors are logged but not thrown
      const err = error as NodeJS.ErrnoException;
      if (err.code !== 'ENOENT') {
        console.warn('[ProxyGenerator] Failed to cleanup partial proxy:', err.message);
      }
    }
  }
}
