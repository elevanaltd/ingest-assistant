import { describe, it, expect } from 'vitest';

/**
 * Bug Reproduction Test: creationTimestamp Deserialization
 *
 * Issue: When FileMetadata is loaded from JSON, creationTimestamp is
 * deserialized as an ISO string, not a Date object. This causes
 * TypeError when formatTimestampForTitle() tries to call .getFullYear()
 *
 * Error: TypeError: date.getFullYear is not a function
 * Location: file:update-structured-metadata handler
 */

describe('Timestamp Deserialization Bug', () => {
  it('should handle creationTimestamp as ISO string from JSON deserialization', () => {
    // Simulate what happens when JSON is loaded from metadata store
    const serializedMetadata = {
      id: 'EB001234',
      creationTimestamp: '2025-11-03T10:05:00.000Z', // ISO string from JSON.parse()
    };

    // This is what the code currently does (BUG)
    const timestamp = serializedMetadata.creationTimestamp;

    // Attempting to use it as a Date will fail
    // @ts-expect-error - Testing runtime behavior with wrong type
    expect(() => timestamp.getFullYear()).toThrow(TypeError);
    // @ts-expect-error - Testing runtime behavior with wrong type
    expect(() => timestamp.getFullYear()).toThrow(/getFullYear is not a function/);
  });

  it('should convert ISO string to Date object before formatting', () => {
    // Simulate JSON deserialization
    const isoString = '2025-11-03T10:05:00.000Z';

    // FIX: Convert string to Date
    const timestamp = typeof isoString === 'string' ? new Date(isoString) : isoString;

    // Should now work
    expect(timestamp).toBeInstanceOf(Date);
    expect(timestamp.getFullYear()).toBe(2025);
    expect(timestamp.getMonth()).toBe(10); // November (0-indexed)
    expect(timestamp.getDate()).toBe(3);
    expect(timestamp.getHours()).toBe(10);
    expect(timestamp.getMinutes()).toBe(5);
  });

  it('should format timestamp correctly after deserialization', () => {
    // Simulate JSON deserialization
    const isoString = '2025-11-03T10:05:00.000Z';

    // Convert to Date
    const timestamp = new Date(isoString);

    // Format as yyyymmddhhmm
    const year = timestamp.getFullYear().toString();
    const month = (timestamp.getMonth() + 1).toString().padStart(2, '0');
    const day = timestamp.getDate().toString().padStart(2, '0');
    const hour = timestamp.getHours().toString().padStart(2, '0');
    const minute = timestamp.getMinutes().toString().padStart(2, '0');
    const formatted = `${year}${month}${day}${hour}${minute}`;

    expect(formatted).toBe('202511031005');
  });

  it('should handle Date object passthrough without conversion', () => {
    // When creationTimestamp is already a Date (in-memory)
    const dateObject = new Date('2025-11-03T10:05:00.000Z');

    // Should not need conversion
    const timestamp = dateObject instanceof Date ? dateObject : new Date(dateObject);

    expect(timestamp).toBeInstanceOf(Date);
    expect(timestamp.getFullYear()).toBe(2025);
  });

  it('should handle undefined creationTimestamp gracefully', () => {
    const timestamp = undefined;

    // Should not attempt conversion
    const result = timestamp ? (typeof timestamp === 'string' ? new Date(timestamp) : timestamp) : undefined;

    expect(result).toBeUndefined();
  });
});
