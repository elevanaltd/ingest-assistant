import { spawn } from 'child_process';
import ffmpeg from '@ffmpeg-installer/ffmpeg';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';
import * as os from 'os';

/**
 * VideoTranscoder - Handles on-the-fly transcoding of unsupported codecs (ProRes, HEVC)
 * to H.264 for HTML5 video playback.
 *
 * Features:
 * - Hardware acceleration via VideoToolbox (macOS)
 * - Disk-based caching with hash-based keys
 * - Optimized for low-latency preview (720p, streaming)
 */
export class VideoTranscoder {
  private previewRoot: string;
  private activeTranscodes = new Map<string, Promise<string>>();

  constructor(cacheDir?: string) {
    this.previewRoot = cacheDir || path.join(os.tmpdir(), 'catalog-previews');

    // Ensure cache directory exists
    if (!fs.existsSync(this.previewRoot)) {
      fs.mkdirSync(this.previewRoot, { recursive: true });
    }
  }

  /**
   * Get the cache directory path (for security validator registration)
   */
  getCacheDirectory(): string {
    return this.previewRoot;
  }

  /**
   * Generate cache key based on file path + mtime + size
   */
  private getCacheKey(filePath: string, stats: fs.Stats): string {
    const input = `${filePath}:${stats.mtime.getTime()}:${stats.size}`;
    return crypto.createHash('sha256').update(input).digest('hex').slice(0, 16);
  }

  /**
   * Get path to cached preview file
   */
  private getPreviewPath(cacheKey: string, profile: string = '720p'): string {
    return path.join(this.previewRoot, `${cacheKey}-${profile}.mp4`);
  }

  /**
   * Transcode video to H.264 with hardware acceleration
   * Returns path to transcoded file
   */
  async transcodeForPreview(sourceFile: string): Promise<string> {
    // Get file stats for cache key
    const stats = fs.statSync(sourceFile);
    const cacheKey = this.getCacheKey(sourceFile, stats);
    const outPath = this.getPreviewPath(cacheKey);

    // Check if already transcoding
    if (this.activeTranscodes.has(outPath)) {
      return this.activeTranscodes.get(outPath)!;
    }

    // Check if cached version exists
    if (fs.existsSync(outPath)) {
      console.log('[VideoTranscoder] Using cached preview:', outPath);
      return outPath;
    }

    // Start transcoding
    console.log('[VideoTranscoder] Starting transcode:', sourceFile);
    const transcodePromise = this.doTranscode(sourceFile, outPath);
    this.activeTranscodes.set(outPath, transcodePromise);

    try {
      const result = await transcodePromise;
      return result;
    } finally {
      this.activeTranscodes.delete(outPath);
    }
  }

  /**
   * Execute FFmpeg transcoding with optimized settings
   */
  private doTranscode(sourceFile: string, outPath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const args = [
        '-hide_banner',
        '-y', // Overwrite output file

        // Hardware acceleration (macOS VideoToolbox)
        '-hwaccel', 'videotoolbox',

        // Input
        '-i', sourceFile,

        // Video settings
        '-vf', 'scale=-2:720', // 720p height, maintain aspect ratio
        '-c:v', 'h264_videotoolbox', // Hardware H.264 encoder
        '-b:v', '2500k', // Target bitrate
        '-maxrate', '3000k',
        '-bufsize', '5000k',

        // GOP/keyframe settings for seekability
        '-g', '48', // GOP size (2 seconds at 24fps)
        '-keyint_min', '48',
        '-sc_threshold', '0', // Disable scene change detection

        // Frame rate
        '-r', '24',

        // Streaming optimization
        '-movflags', '+faststart+frag_keyframe+empty_moov',

        // Audio settings
        '-c:a', 'aac',
        '-b:a', '96k',
        '-ac', '2', // Stereo
        '-ar', '44100',

        // Output
        outPath
      ];

      console.log('[VideoTranscoder] FFmpeg command:', ffmpeg.path, args.join(' '));

      const ffmpegProcess = spawn(ffmpeg.path, args);
      let stderr = '';

      ffmpegProcess.stderr.on('data', (data) => {
        stderr += data.toString();
        // Log progress occasionally
        if (stderr.includes('time=')) {
          const match = stderr.match(/time=(\d+:\d+:\d+\.\d+)/);
          if (match) {
            console.log('[VideoTranscoder] Progress:', match[1]);
          }
        }
      });

      ffmpegProcess.on('close', (code) => {
        if (code === 0) {
          console.log('[VideoTranscoder] Transcode complete:', outPath);
          resolve(outPath);
        } else {
          console.error('[VideoTranscoder] FFmpeg failed with code:', code);
          console.error('[VideoTranscoder] FFmpeg stderr:', stderr);

          // Clean up failed output
          if (fs.existsSync(outPath)) {
            fs.unlinkSync(outPath);
          }

          reject(new Error(`FFmpeg transcode failed (exit code ${code})`));
        }
      });

      ffmpegProcess.on('error', (err) => {
        console.error('[VideoTranscoder] FFmpeg spawn error:', err);
        reject(err);
      });
    });
  }

  /**
   * Clean up old cache files (optional maintenance)
   */
  async cleanCache(maxAgeMs: number = 7 * 24 * 60 * 60 * 1000): Promise<void> {
    const now = Date.now();
    const files = fs.readdirSync(this.previewRoot);

    for (const file of files) {
      const filePath = path.join(this.previewRoot, file);
      const stats = fs.statSync(filePath);

      if (now - stats.mtime.getTime() > maxAgeMs) {
        console.log('[VideoTranscoder] Removing old cache file:', file);
        fs.unlinkSync(filePath);
      }
    }
  }
}
