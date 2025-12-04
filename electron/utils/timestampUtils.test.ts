import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  formatTimestampForTitle,
  getOrExtractCreationTimestamp,
  generateTitleWithTimestamp
} from './timestampUtils';

describe('formatTimestampForTitle', () => {
  it('should format timestamp as 14-digit string (YYYYMMDDHHMMSS)', () => {
    const date = new Date('2025-11-03T10:05:30Z');
    const result = formatTimestampForTitle(date);

    expect(result).toBe('20251103100530');
    expect(result).toHaveLength(14);
  });

  it('should pad single-digit months and days with leading zeros', () => {
    const date = new Date('2025-01-05T03:02:01Z');
    const result = formatTimestampForTitle(date);

    expect(result).toBe('20250105030201');
  });

  it('should handle midnight correctly', () => {
    // Use local time constructor to avoid timezone conversion issues
    const date = new Date(2025, 5, 15, 0, 0, 0); // June 15, 2025, 00:00:00 local
    const result = formatTimestampForTitle(date);

    expect(result).toBe('20250615000000');
  });

  it('should handle end of month correctly', () => {
    // Use local time constructor to avoid timezone conversion issues
    const date = new Date(2025, 11, 31, 23, 59, 59); // December 31, 2025, 23:59:59 local
    const result = formatTimestampForTitle(date);

    expect(result).toBe('20251231235959');
  });
});

describe('getOrExtractCreationTimestamp', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return cached timestamp when available', async () => {
    const cachedDate = new Date('2025-11-03T10:05:30Z');
    const fileMetadata = {
      filePath: '/path/to/test.jpg',
      creationTimestamp: cachedDate
    };

    const mockReadFn = vi.fn();
    const result = await getOrExtractCreationTimestamp(fileMetadata, mockReadFn);

    expect(result).toEqual(cachedDate);
    expect(mockReadFn).not.toHaveBeenCalled();
  });

  it('should convert ISO string to Date when deserializing from JSON', async () => {
    const isoString = '2025-11-03T10:05:30.000Z';
    const fileMetadata = {
      filePath: '/path/to/test.jpg',
      creationTimestamp: isoString as any // Simulates JSON deserialization
    };

    const mockReadFn = vi.fn();
    const result = await getOrExtractCreationTimestamp(fileMetadata, mockReadFn);

    expect(result).toBeInstanceOf(Date);
    expect(result?.toISOString()).toBe(isoString);
    expect(fileMetadata.creationTimestamp).toBeInstanceOf(Date); // Should cache as Date
    expect(mockReadFn).not.toHaveBeenCalled();
  });

  it('should call readCreationTimestampFn when no cached timestamp', async () => {
    const fileMetadata = {
      filePath: '/path/to/test.jpg'
    };

    const extractedDate = new Date('2025-11-03T10:05:30Z');
    const mockReadFn = vi.fn().mockResolvedValue(extractedDate);

    const result = await getOrExtractCreationTimestamp(fileMetadata, mockReadFn);

    expect(result).toEqual(extractedDate);
    expect(mockReadFn).toHaveBeenCalledWith(fileMetadata.filePath);
  });

  it('should cache extracted timestamp for future use', async () => {
    const fileMetadata: { filePath: string; creationTimestamp?: Date } = {
      filePath: '/path/to/test.jpg'
    };

    const extractedDate = new Date('2025-11-03T10:05:30Z');
    const mockReadFn = vi.fn().mockResolvedValue(extractedDate);

    await getOrExtractCreationTimestamp(fileMetadata, mockReadFn);

    expect(fileMetadata.creationTimestamp).toEqual(extractedDate);
  });

  it('should return undefined when extraction returns null', async () => {
    const fileMetadata: { filePath: string; creationTimestamp?: Date } = {
      filePath: '/path/to/test.jpg'
    };

    const mockReadFn = vi.fn().mockResolvedValue(undefined);

    const result = await getOrExtractCreationTimestamp(fileMetadata, mockReadFn);

    expect(result).toBeUndefined();
    expect(fileMetadata.creationTimestamp).toBeUndefined();
  });
});

describe('generateTitleWithTimestamp', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should append formatted timestamp to base title', async () => {
    const fileMetadata = {
      filePath: '/path/to/test.jpg'
    };

    const timestamp = new Date('2025-11-03T10:05:30Z');
    const mockReadFn = vi.fn().mockResolvedValue(timestamp);

    const result = await generateTitleWithTimestamp('kitchen-oven-CU', fileMetadata, mockReadFn);

    expect(result).toBe('kitchen-oven-CU-20251103100530');
  });

  it('should return base title only when no timestamp available', async () => {
    const fileMetadata = {
      filePath: '/path/to/test.jpg'
    };

    const mockReadFn = vi.fn().mockResolvedValue(undefined);
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const result = await generateTitleWithTimestamp('kitchen-oven-CU', fileMetadata, mockReadFn);

    expect(result).toBe('kitchen-oven-CU');
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('No creation timestamp found for /path/to/test.jpg')
    );
  });

  it('should use cached timestamp without calling readFn', async () => {
    const cachedDate = new Date('2025-11-03T10:05:30Z');
    const fileMetadata = {
      filePath: '/path/to/test.jpg',
      creationTimestamp: cachedDate
    };

    const mockReadFn = vi.fn();

    const result = await generateTitleWithTimestamp('kitchen-oven-CU', fileMetadata, mockReadFn);

    expect(result).toBe('kitchen-oven-CU-20251103100530');
    expect(mockReadFn).not.toHaveBeenCalled();
  });

  it('should handle ISO string timestamps from JSON deserialization', async () => {
    const fileMetadata = {
      filePath: '/path/to/test.jpg',
      creationTimestamp: '2025-11-03T10:05:30.000Z' as any
    };

    const mockReadFn = vi.fn();

    const result = await generateTitleWithTimestamp('kitchen-oven-CU', fileMetadata, mockReadFn);

    expect(result).toBe('kitchen-oven-CU-20251103100530');
    expect(mockReadFn).not.toHaveBeenCalled();
  });
});
