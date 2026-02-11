import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockExistsSync } = vi.hoisted(() => ({
  mockExistsSync: vi.fn(),
}));

vi.mock('@ffmpeg-installer/ffmpeg', () => ({
  default: { path: '/usr/bin/ffmpeg' },
}));

vi.mock('@ffprobe-installer/ffprobe', () => ({
  default: { path: '/usr/bin/ffprobe' },
}));

vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs')>();
  return { ...actual, default: { ...actual, existsSync: mockExistsSync }, existsSync: mockExistsSync };
});

import { getFfmpegPath, getFfprobePath } from './binaryPaths';

describe('binaryPaths', () => {
  beforeEach(() => {
    mockExistsSync.mockReset();
  });

  describe('getFfmpegPath', () => {
    it('should return installer path when it exists on disk', () => {
      mockExistsSync.mockReturnValue(true);
      const result = getFfmpegPath();
      expect(result).toBe('/usr/bin/ffmpeg');
    });

    it('should throw when installer path does not exist (non-ASAR context)', () => {
      // In dev/test, __dirname does not contain 'app.asar', so ASAR fallback
      // is skipped and we get the error directly
      mockExistsSync.mockReturnValue(false);
      expect(() => getFfmpegPath()).toThrow('Could not find ffmpeg binary');
    });
  });

  describe('getFfprobePath', () => {
    it('should return installer path when it exists on disk', () => {
      mockExistsSync.mockReturnValue(true);
      const result = getFfprobePath();
      expect(result).toBe('/usr/bin/ffprobe');
    });

    it('should throw when installer path does not exist (non-ASAR context)', () => {
      mockExistsSync.mockReturnValue(false);
      expect(() => getFfprobePath()).toThrow('Could not find ffprobe binary');
    });
  });

  describe('ASAR fallback (resolveWithAsarFallback)', () => {
    it('should construct ASAR unpacked path when __dirname contains app.asar', async () => {
      // To test the ASAR branch, we need to re-import with a mocked __dirname.
      // We use resolveWithAsarFallback exported for testing.
      const { resolveWithAsarFallback } = await import('./binaryPaths');

      // Simulate: installer path doesn't exist, ASAR unpacked path does
      mockExistsSync.mockImplementation((p: string) => {
        return String(p).includes('app.asar.unpacked');
      });

      // In test context __dirname won't contain app.asar, so we test the function directly
      // by passing a simulated dirname
      const result = resolveWithAsarFallback(
        '/nonexistent/ffmpeg',
        '@ffmpeg-installer',
        'ffmpeg',
        '/tmp/.mount_Ingest123/resources/app.asar/dist/electron/utils'
      );
      expect(result).toContain('app.asar.unpacked');
      expect(result).toContain('@ffmpeg-installer');
      expect(result).toContain('ffmpeg');
    });

    it('should throw when ASAR unpacked path also does not exist', async () => {
      const { resolveWithAsarFallback } = await import('./binaryPaths');
      mockExistsSync.mockReturnValue(false);

      expect(() => resolveWithAsarFallback(
        '/nonexistent/ffmpeg',
        '@ffmpeg-installer',
        'ffmpeg',
        '/tmp/.mount_Ingest123/resources/app.asar/dist/electron/utils'
      )).toThrow('Could not find ffmpeg binary');
    });
  });
});
