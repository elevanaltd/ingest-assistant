import { describe, it, expect } from 'vitest';
import packageJson from '../../package.json';

describe('electron-builder packaging config invariants', () => {
  const { asarUnpack, files } = packageJson.build;

  it('keeps ffmpeg, ffprobe, and the keytar native module in asarUnpack', () => {
    // Without these, whether the binaries land in app.asar (unexecutable --
    // proxy generation silently does nothing) or app.asar.unpacked (working)
    // is decided entirely by electron-builder's internal smartUnpack
    // heuristic. This test can't invoke electron-builder itself (see PR #178
    // for the manual packaging verification that proved these globs produce
    // an unchanged, correctly-unpacked output) -- it guards the config input
    // to that heuristic from silent deletion or a typo'd path.
    expect(asarUnpack).toContain('node_modules/@ffmpeg-installer/*/ffmpeg');
    expect(asarUnpack).toContain('node_modules/@ffprobe-installer/*/ffprobe');
    expect(asarUnpack).toContain('node_modules/keytar/build/Release/*.node');
  });

  it('does not reintroduce the dead @ffmpeg-installer platform exclusions in build.files', () => {
    // PR #178 removed five build.files lines like
    // "!node_modules/@ffmpeg-installer/darwin-*" as dead code: minimatch's
    // `*` never crosses `/`, so they never excluded a real file and were a
    // no-op. The trap is that they LOOK like they should be corrected to a
    // recursive form (`darwin-*/**`) -- and that form would actually work,
    // excluding darwin-arm64/ffmpeg, which is exactly the binary this app's
    // own asarUnpack rule above expects to unpack. That ships a macOS build
    // with no ffmpeg, silently. If this assertion fails, read PR #178
    // before "fixing" build.files -- do not just make this pass.
    const reintroducedExclusions = (files ?? []).filter((pattern) =>
      pattern.startsWith('!node_modules/@ffmpeg-installer/')
    );
    expect(reintroducedExclusions).toEqual([]);
  });
});
