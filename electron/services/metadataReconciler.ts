/**
 * Metadata Reconciliation Service
 *
 * Handles reconciliation of stale metadata (e.g., when filenames change on disk
 * but metadata store still references the old filename).
 *
 * @module metadataReconciler
 */

import { FileMetadata } from '../../src/types';
import { MetadataStore } from './metadataStore';

/**
 * Result of metadata reconciliation
 */
export interface ReconcileResult {
  /** The reconciled metadata object */
  metadata: FileMetadata;
  /** Whether the metadata was updated (true if filename changed, false otherwise) */
  updated: boolean;
}

/**
 * Reconciles existing metadata with scanned file metadata.
 *
 * Updates currentFilename and filePath if they differ from the scanned values,
 * then updates the audit trail to reflect the change.
 *
 * **Use Case:** When a file is renamed externally (e.g., user renames proxy file),
 * the metadata store still references the old filename. This function updates
 * the stored metadata to match the actual disk state.
 *
 * @param existingMetadata - Metadata currently stored in the database
 * @param scannedMetadata - Fresh metadata from filesystem scan
 * @returns ReconcileResult with metadata and updated flag
 *
 * @example
 * ```typescript
 * const existing = await store.getFileMetadata('EA002033');
 * const scanned = await scanFolder('/path/to/folder');
 * const { metadata: reconciled, updated } = reconcileMetadata(existing, scanned[0]);
 * if (updated) {
 *   await store.updateFileMetadata('EA002033', reconciled);
 * }
 * ```
 */
export function reconcileMetadata(
  existingMetadata: FileMetadata,
  scannedMetadata: FileMetadata
): ReconcileResult {
  // Detect stale filename: stored metadata has old filename, scan found new filename
  const needsUpdate = existingMetadata.currentFilename !== scannedMetadata.currentFilename;

  if (needsUpdate) {
    console.log(
      `[metadataReconciler] Updating stale currentFilename: ${existingMetadata.currentFilename} → ${scannedMetadata.currentFilename}`
    );

    // Update filename and path to match disk state
    existingMetadata.currentFilename = scannedMetadata.currentFilename;
    existingMetadata.filePath = scannedMetadata.filePath;

    // Update audit trail to record this change
    MetadataStore.updateAuditTrail(existingMetadata);
  }

  return { metadata: existingMetadata, updated: needsUpdate };
}
