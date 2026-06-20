import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import ffprobeInstaller from '@ffprobe-installer/ffprobe';

const platform = os.platform() + '-' + os.arch();

/**
 * Resolve a binary path with ASAR fallback.
 *
 * In development or when the installer resolves correctly, the installer path
 * is used directly. Inside a packaged Electron app (ASAR), the installer's
 * path resolution can break because __dirname no longer contains 'node_modules'.
 * In that case we construct the path into app.asar.unpacked where electron-builder
 * places native binaries.
 */
export function resolveWithAsarFallback(
  installerPath: string,
  packageScope: string,
  binaryName: string,
  dirname: string = __dirname
): string {
  // 1. Try the installer-provided path first
  // IMPORTANT: Electron patches fs to read inside ASAR archives, so
  // fs.existsSync() returns true for paths inside app.asar. But spawn()
  // cannot execute binaries from inside an ASAR — it needs a real file on
  // disk. Skip installer paths that resolve inside app.asar (but NOT
  // app.asar.unpacked, which is a real on-disk directory).
  if (!(/(?:^|[/\\])app\.asar(?=[/\\]|$)/).test(installerPath) && fs.existsSync(installerPath)) {
    return installerPath;
  }

  // 2. ASAR fallback: look in app.asar.unpacked
  // In packaged Electron, __dirname is inside app.asar; native binaries
  // are extracted to the parallel app.asar.unpacked directory.
  const asarIndex = dirname.indexOf('app.asar');
  if (asarIndex !== -1) {
    const resourcesDir = dirname.substring(0, asarIndex);
    const unpackedPath = path.join(
      resourcesDir,
      'app.asar.unpacked',
      'node_modules',
      packageScope,
      platform,
      binaryName
    );
    if (fs.existsSync(unpackedPath)) {
      return unpackedPath;
    }
  }

  throw new Error(
    `Could not find ${binaryName} binary. Tried installer path "${installerPath}" and ASAR unpacked fallback.`
  );
}

/** Resolve the ffmpeg binary path, with ASAR fallback for packaged Electron apps. */
export function getFfmpegPath(): string {
  return resolveWithAsarFallback(ffmpegInstaller.path, '@ffmpeg-installer', 'ffmpeg');
}

/** Resolve the ffprobe binary path, with ASAR fallback for packaged Electron apps. */
export function getFfprobePath(): string {
  return resolveWithAsarFallback(ffprobeInstaller.path, '@ffprobe-installer', 'ffprobe');
}
