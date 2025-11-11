import { spawn } from 'child_process';
import * as path from 'path';
import { tmpdir } from 'os';
import ffmpeg from '@ffmpeg-installer/ffmpeg';
import ffprobe from '@ffprobe-installer/ffprobe';

/**
 * Validate filename to prevent command injection
 * Rejects filenames containing shell metacharacters that could enable command injection
 */
function validateFilename(filePath: string): void {
  // Shell metacharacters that enable command injection
  const dangerousChars = /["`;$&|<>(){}[\]\\]/;

  if (dangerousChars.test(filePath)) {
    throw new Error(`Security: Invalid filename contains forbidden characters: ${filePath}`);
  }
}

/**
 * Execute command using spawn (safe from command injection)
 * Returns stdout as string
 */
function spawnCommand(command: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args);
    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Command failed with code ${code}: ${stderr}`));
      } else {
        resolve(stdout);
      }
    });

    proc.on('error', (error) => {
      reject(error);
    });
  });
}

/**
 * VideoFrameExtractor
 * Extracts frames from video files at specified timestamps using ffmpeg
 * Implements Phase 1 of ADR-007: Video Analysis Workflow
 */
export class VideoFrameExtractor {
  private ffmpegPath: string;
  private ffprobePath: string;

  constructor() {
    this.ffmpegPath = ffmpeg.path;
    this.ffprobePath = ffprobe.path;
  }

  /**
   * Extract frames from video at specified timestamps
   * @param videoPath - Full path to video file
   * @param timestamps - Array of timestamps (0.0-1.0 representing percentage through video)
   * @returns Array of paths to extracted frame images
   *
   * Example:
   * ```typescript
   * const frames = await extractor.extractFrames('/path/video.mp4', [0.1, 0.5, 0.9]);
   * // Returns: ['/tmp/frame-123-0.1.jpg', '/tmp/frame-123-0.5.jpg', '/tmp/frame-123-0.9.jpg']
   * ```
   */
  async extractFrames(
    videoPath: string,
    timestamps: number[]
  ): Promise<string[]> {
    const frames: string[] = [];

    for (const timestamp of timestamps) {
      const outputPath = await this.extractSingleFrame(videoPath, timestamp);
      frames.push(outputPath);
    }

    return frames;
  }

  /**
   * Extract a single frame from video at specified timestamp
   * @param videoPath - Full path to video file
   * @param timestamp - Timestamp as percentage (0.0-1.0) through video
   * @returns Path to extracted frame image
   * @private
   */
  private async extractSingleFrame(
    videoPath: string,
    timestamp: number
  ): Promise<string> {
    // Security: Validate filename to prevent command injection
    validateFilename(videoPath);

    // Get video duration first
    const duration = await this.getVideoDuration(videoPath);
    const seconds = duration * timestamp;

    // Generate unique output path in temp directory
    const outputPath = path.join(
      tmpdir(),
      `frame-${Date.now()}-${timestamp}.jpg`
    );

    // Execute ffmpeg command to extract frame using spawn (safe from injection)
    // -ss: seek to timestamp (in seconds)
    // -i: input video file
    // -frames:v 1: extract exactly 1 frame
    // -q:v 2: quality (2 is high quality for JPEG)
    await spawnCommand(this.ffmpegPath, [
      '-ss', seconds.toString(),
      '-i', videoPath,
      '-frames:v', '1',
      '-q:v', '2',
      outputPath
    ]);

    return outputPath;
  }

  /**
   * Get video duration in seconds using ffprobe
   * @param videoPath - Full path to video file
   * @returns Duration in seconds
   * @private
   */
  private async getVideoDuration(videoPath: string): Promise<number> {
    // Security: Validate filename to prevent command injection
    validateFilename(videoPath);

    const stdout = await spawnCommand(this.ffprobePath, [
      '-v', 'error',
      '-show_entries', 'format=duration',
      '-of', 'default=noprint_wrappers=1:nokey=1',
      videoPath
    ]);

    return parseFloat(stdout.trim());
  }

  /**
   * Get video codec information using ffprobe
   * @param videoPath - Full path to video file
   * @returns Object containing codec_name and codec_long_name
   */
  async getVideoCodec(videoPath: string): Promise<{ codec_name: string; codec_long_name: string; supported: boolean }> {
    // Security: Validate filename to prevent command injection
    validateFilename(videoPath);

    const stdout = await spawnCommand(this.ffprobePath, [
      '-v', 'error',
      '-select_streams', 'v:0',
      '-show_entries', 'stream=codec_name,codec_long_name',
      '-of', 'json',
      videoPath
    ]);

    const result = JSON.parse(stdout);
    const stream = result.streams?.[0] || {};

    const codec_name = stream.codec_name || 'unknown';
    const codec_long_name = stream.codec_long_name || 'Unknown codec';

    // Check if codec is supported by Chromium/Electron
    // Chromium natively supports: h264, vp8, vp9, theora
    // Does NOT support: hevc (h265), prores, mpeg2, mpeg4
    const supportedCodecs = ['h264', 'vp8', 'vp9', 'theora'];
    const supported = supportedCodecs.includes(codec_name.toLowerCase());

    return { codec_name, codec_long_name, supported };
  }
}
