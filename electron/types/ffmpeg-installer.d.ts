/**
 * Type declarations for @ffmpeg-installer/ffmpeg and @ffprobe-installer/ffprobe
 * These packages provide bundled ffmpeg/ffprobe binaries for Electron apps
 */

declare module '@ffmpeg-installer/ffmpeg' {
  interface FFmpegInstaller {
    path: string;
    version: string;
    url: string;
  }

  const ffmpeg: FFmpegInstaller;
  export default ffmpeg;
}

declare module '@ffprobe-installer/ffprobe' {
  interface FFprobeInstaller {
    path: string;
    version: string;
    url: string;
  }

  const ffprobe: FFprobeInstaller;
  export default ffprobe;
}
