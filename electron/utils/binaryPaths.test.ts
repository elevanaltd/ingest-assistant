import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockExistsSync } = vi.hoisted(() => ({
  mockExistsSync: vi.fn(),
}));

vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs')>();
  return { ...actual, default: { ...actual, existsSync: mockExistsSync }, existsSync: mockExistsSync };
});

import { getFfmpegPath, getFfprobePath, resolveWithAsarFallback } from './binaryPaths';

describe('binaryPaths', () => {
  beforeEach(() => {
    mockExistsSync.mockReset();
  });

  describe('getFfmpegPath', () => {
    it('should return a valid path when installer resolves and binary exists', () => {
      mockExistsSync.mockReturnValue(true);
      const result = getFfmpegPath();
      expect(result).toContain('ffmpeg');
      expect(typeof result).toBe('string');
    });

    it('should throw when no path can be resolved (non-ASAR context)', () => {
      mockExistsSync.mockReturnValue(false);
      expect(() => getFfmpegPath()).toThrow('Could not find ffmpeg binary');
    });
  });

  describe('getFfprobePath', () => {
    it('should return a valid path when installer resolves and binary exists', () => {
      mockExistsSync.mockReturnValue(true);
      const result = getFfprobePath();
      expect(result).toContain('ffprobe');
      expect(typeof result).toBe('string');
    });

    it('should throw when no path can be resolved (non-ASAR context)', () => {
      mockExistsSync.mockReturnValue(false);
      expect(() => getFfprobePath()).toThrow('Could not find ffprobe binary');
    });
  });

  describe('ASAR fallback (resolveWithAsarFallback)', () => {
    it('should construct ASAR unpacked path when dirname contains app.asar', () => {
      // Installer require will fail for a fake module, so it falls through to ASAR
      mockExistsSync.mockImplementation((p: string) => {
        return String(p).includes('app.asar.unpacked');
      });

      const result = resolveWithAsarFallback(
        'nonexistent-module',
        '@ffmpeg-installer',
        'ffmpeg',
        '/tmp/.mount_Ingest123/resources/app.asar/dist/electron/utils'
      );
      expect(result).toContain('app.asar.unpacked');
      expect(result).toContain('@ffmpeg-installer');
      expect(result).toContain('ffmpeg');
    });

    it('should throw when both installer and ASAR fallback fail', () => {
      mockExistsSync.mockReturnValue(false);

      expect(() => resolveWithAsarFallback(
        'nonexistent-module',
        '@ffmpeg-installer',
        'ffmpeg',
        '/tmp/.mount_Ingest123/resources/app.asar/dist/electron/utils'
      )).toThrow('Could not find ffmpeg binary');
    });
  });
});
