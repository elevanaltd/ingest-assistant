import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EXIFTOOL_TIMEOUT_MS } from './metadataWriter';

const execFileMock = vi.fn((_file: string, _args: string[], _options: unknown, callback: (error: Error | null, result?: { stdout: string; stderr: string }) => void) => {
  callback(null, { stdout: '[{}]', stderr: '' });
});

vi.mock('child_process', () => {
  const execFile = (...args: unknown[]) => (execFileMock as unknown as (...a: unknown[]) => void)(...args);
  return { execFile, default: { execFile } };
});

describe('MetadataWriter exiftool timeout', () => {
  beforeEach(() => {
    execFileMock.mockClear();
  });

  it('sets the exiftool timeout to 3 minutes', () => {
    expect(EXIFTOOL_TIMEOUT_MS).toBe(180_000);
  });

  it('passes the 3-minute timeout to every exiftool invocation', async () => {
    const { MetadataWriter } = await import('./metadataWriter');
    const writer = new MetadataWriter();

    await writer.readCreationTimestamp('/tmp/does-not-matter.mov');
    await writer.readMetadataFromFile('/tmp/does-not-matter.mov');
    await writer.readTapeNameFromFile('/tmp/does-not-matter.mov');

    expect(execFileMock).toHaveBeenCalled();
    for (const call of execFileMock.mock.calls) {
      const options = call[2] as { timeout?: number };
      expect(options.timeout).toBe(EXIFTOOL_TIMEOUT_MS);
    }
  });
});
