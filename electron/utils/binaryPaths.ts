import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

const platform = os.platform() + '-' + os.arch();

/**
 * Try to load the installer module path. Returns null if the installer
 * throws (which happens inside ASAR where its path resolution breaks).
 */
function tryInstallerPath(moduleName: string): string | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const installer = require(moduleName);
    if (installer?.path && fs.existsSync(installer.path)) {
      return installer.path;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Resolve a binary path with ASAR fallback.
 *
 * In development, the @ffmpeg-installer package resolves the path directly.
 * Inside a packaged Electron app (ASAR), the installer's require() throws
 * because __dirname no longer contains 'node_modules'. In that case we
 * construct the path into app.asar.unpacked where electron-builder places
 * native binaries.
 */
export function resolveWithAsarFallback(
  installerModule: string,
  packageScope: string,
  binaryName: string,
  dirname: string = __dirname
): string {
  // 1. Try the installer-provided path (works in dev, fails in ASAR)
  const installerPath = tryInstallerPath(installerModule);
  if (installerPath) {
    return installerPath;
  }

  // 2. ASAR fallback: look in app.asar.unpacked
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
    `Could not find ${binaryName} binary. Installer module "${installerModule}" failed and ASAR fallback not found.`
  );
}

/** Resolve the ffmpeg binary path, with ASAR fallback for packaged Electron apps. */
export function getFfmpegPath(): string {
  return resolveWithAsarFallback('@ffmpeg-installer/ffmpeg', '@ffmpeg-installer', 'ffmpeg');
}

/** Resolve the ffprobe binary path, with ASAR fallback for packaged Electron apps. */
export function getFfprobePath(): string {
  return resolveWithAsarFallback('@ffprobe-installer/ffprobe', '@ffprobe-installer', 'ffprobe');
}
