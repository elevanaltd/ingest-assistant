import type { FileMetadata } from '../../src/types';

/**
 * Format a Date object as a 14-digit timestamp string (YYYYMMDDHHMMSS).
 *
 * @param date - The date to format
 * @returns Formatted timestamp string (e.g., "20251103100530")
 *
 * @example
 * ```typescript
 * const date = new Date('2025-11-03T10:05:30Z');
 * formatTimestampForTitle(date); // "20251103100530"
 * ```
 */
export function formatTimestampForTitle(date: Date): string {
  const year = date.getFullYear().toString();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const hour = date.getHours().toString().padStart(2, '0');
  const minute = date.getMinutes().toString().padStart(2, '0');
  const second = date.getSeconds().toString().padStart(2, '0');

  return `${year}${month}${day}${hour}${minute}${second}`;
}

/**
 * Get or extract creation timestamp from file metadata.
 *
 * Returns cached timestamp if available, otherwise extracts from file using
 * the provided readCreationTimestampFn. Caches the result in the FileMetadata
 * object for future use.
 *
 * Handles JSON deserialization where Date objects become ISO strings by
 * converting them back to Date instances.
 *
 * @param fileMetadata - File metadata object with optional cached timestamp
 * @param readCreationTimestampFn - Function to extract timestamp from file (dependency injection)
 * @returns Promise resolving to creation timestamp Date or undefined
 *
 * @example
 * ```typescript
 * const timestamp = await getOrExtractCreationTimestamp(
 *   fileMetadata,
 *   (filePath) => metadataWriter.readCreationTimestamp(filePath)
 * );
 * ```
 */
export async function getOrExtractCreationTimestamp(
  fileMetadata: Pick<FileMetadata, 'filePath' | 'creationTimestamp'>,
  readCreationTimestampFn: (filePath: string) => Promise<Date | undefined>
): Promise<Date | undefined> {
  // Return cached timestamp if available (convert from ISO string if needed)
  if (fileMetadata.creationTimestamp) {
    // JSON deserialization converts Date objects to ISO strings
    // Convert back to Date if necessary
    const timestamp = typeof fileMetadata.creationTimestamp === 'string'
      ? new Date(fileMetadata.creationTimestamp)
      : fileMetadata.creationTimestamp;

    // Update cache with Date object for future use
    fileMetadata.creationTimestamp = timestamp;
    return timestamp;
  }

  // Extract from file using provided function
  const timestamp = await readCreationTimestampFn(fileMetadata.filePath);

  // Cache in metadata object
  if (timestamp) {
    fileMetadata.creationTimestamp = timestamp;
  }

  return timestamp ?? undefined;
}

/**
 * Generate title with timestamp suffix.
 *
 * Takes a base title and appends creation timestamp in yyyymmddhhmm format.
 * Returns base title only if no timestamp is available (with console warning).
 *
 * @param baseTitle - Base title string (e.g., "kitchen-oven-CU")
 * @param fileMetadata - File metadata with optional cached timestamp
 * @param readCreationTimestampFn - Function to extract timestamp from file (dependency injection)
 * @returns Promise resolving to title with timestamp suffix
 *
 * @example
 * ```typescript
 * // With timestamp
 * const title = await generateTitleWithTimestamp(
 *   'kitchen-oven-CU',
 *   fileMetadata,
 *   (filePath) => metadataWriter.readCreationTimestamp(filePath)
 * );
 * // Result: "kitchen-oven-CU-202511031005"
 *
 * // Without timestamp
 * // Result: "kitchen-oven-CU" + console warning
 * ```
 */
export async function generateTitleWithTimestamp(
  baseTitle: string,
  fileMetadata: Pick<FileMetadata, 'filePath' | 'creationTimestamp'>,
  readCreationTimestampFn: (filePath: string) => Promise<Date | undefined>
): Promise<string> {
  const timestamp = await getOrExtractCreationTimestamp(fileMetadata, readCreationTimestampFn);

  if (timestamp) {
    const formattedTimestamp = formatTimestampForTitle(timestamp);
    return `${baseTitle}-${formattedTimestamp}`;
  }

  // If no timestamp available, return base title as-is
  // This maintains backward compatibility for files without timestamp metadata
  console.warn(`[generateTitleWithTimestamp] No creation timestamp found for ${fileMetadata.filePath}, using base title only`);
  return baseTitle;
}
