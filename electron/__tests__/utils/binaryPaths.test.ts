import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as os from 'os';

vi.mock('fs', () => ({
  existsSync: vi.fn(),
}));

vi.mock('@ffmpeg-installer/ffmpeg', () => ({
  default: { path: '/fake/node_modules/@ffmpeg-installer/darwin-arm64/ffmpeg' },
}));

vi.mock('@ffprobe-installer/ffprobe', () => ({
  default: { path: '/fake/node_modules/@ffprobe-installer/darwin-arm64/ffprobe' },
}));

import * as fs from 'fs';
import { resolveWithAsarFallback, getFfmpegPath, getFfprobePath } from '../../utils/binaryPaths';

const mockExistsSync = vi.mocked(fs.existsSync);

describe('resolveWithAsarFallback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns installer path when it exists and is not inside app.asar', () => {
    mockExistsSync.mockReturnValue(true);
    const result = resolveWithAsarFallback(
      '/usr/local/bin/ffmpeg',
      '@ffmpeg-installer',
      'ffmpeg',
      '/usr/local/lib'
    );
    expect(result).toBe('/usr/local/bin/ffmpeg');
  });

  it('skips installer path that contains app.asar even when fs.existsSync returns true', () => {
    // Electron patches fs so existsSync returns true for ASAR-internal paths,
    // but spawn() cannot execute from inside an ASAR archive.
    mockExistsSync.mockImplementation((p) => {
      if (String(p).includes('app.asar.unpacked')) return true;
      return true; // would also return true for the ASAR path — the guard must prevent this
    });

    const asarInstallerPath =
      '/Applications/IngestAssistant.app/Contents/Resources/app.asar/node_modules/@ffmpeg-installer/darwin-arm64/ffmpeg';
    const dirname =
      '/Applications/IngestAssistant.app/Contents/Resources/app.asar/electron';

    const result = resolveWithAsarFallback(
      asarInstallerPath,
      '@ffmpeg-installer',
      'ffmpeg',
      dirname
    );

    // Must resolve to the unpacked path, not the ASAR-internal installer path
    expect(result).toContain('app.asar.unpacked');
    expect(result).not.toBe(asarInstallerPath);
  });

  it('falls through to app.asar.unpacked when installer path contains app.asar and unpacked exists', () => {
    mockExistsSync.mockImplementation((p) =>
      String(p).includes('app.asar.unpacked')
    );

    const result = resolveWithAsarFallback(
      '/path/to/app.asar/node_modules/@ffmpeg-installer/darwin-arm64/ffmpeg',
      '@ffmpeg-installer',
      'ffmpeg',
      '/path/to/app.asar/electron'
    );

    const platform = os.platform() + '-' + os.arch();
    expect(result).toBe(
      `/path/to/app.asar.unpacked/node_modules/@ffmpeg-installer/${platform}/ffmpeg`
    );
  });

  it('falls through to app.asar.unpacked when installer path is missing', () => {
    mockExistsSync.mockImplementation((p) =>
      String(p).includes('app.asar.unpacked')
    );

    const result = resolveWithAsarFallback(
      '/does/not/exist/ffmpeg',
      '@ffmpeg-installer',
      'ffmpeg',
      '/path/to/app.asar/electron'
    );

    expect(result).toContain('app.asar.unpacked');
  });

  it('throws when neither installer path nor unpacked path exists', () => {
    mockExistsSync.mockReturnValue(false);

    expect(() =>
      resolveWithAsarFallback(
        '/does/not/exist/ffmpeg',
        '@ffmpeg-installer',
        'ffmpeg',
        '/path/to/app.asar/electron'
      )
    ).toThrow('Could not find ffmpeg binary');
  });

  it('throws when not in ASAR context and installer path is missing', () => {
    mockExistsSync.mockReturnValue(false);

    expect(() =>
      resolveWithAsarFallback('/missing/ffmpeg', '@ffmpeg-installer', 'ffmpeg', '/dev/app')
    ).toThrow('Could not find ffmpeg binary');
  });
});

describe('getFfmpegPath', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns a path when the mocked installer path exists', () => {
    mockExistsSync.mockReturnValue(true);
    expect(() => getFfmpegPath()).not.toThrow();
    expect(getFfmpegPath()).toContain('ffmpeg');
  });
});

describe('getFfprobePath', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns a path when the mocked installer path exists', () => {
    mockExistsSync.mockReturnValue(true);
    expect(() => getFfprobePath()).not.toThrow();
    expect(getFfprobePath()).toContain('ffprobe');
  });
});
