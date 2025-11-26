import type { MetadataWriter } from './metadataWriter';
import type { ShotType } from '../../src/types';

/**
 * Toggle configuration for Phase 1c Power Features
 */
export interface MetadataToggleConfig {
  /** Write metadata to files (shotName, LogComment, Description, TapeName) */
  metadataWrite: boolean;
  /** Rename files using template */
  filenameRewrite: boolean;
}

/**
 * Structured metadata components
 */
export interface StructuredMetadata {
  location: string;
  subject: string;
  action?: string;
  shotType: ShotType;
  shotNumber: number;
  cameraId?: string;
}

/**
 * JSON metadata for storage (single source of truth)
 */
export interface JsonMetadata extends StructuredMetadata {
  /** Generated shotName from structured components */
  shotName: string;
  /** Array of keyword tags */
  keywords?: string[];
}

/**
 * MetadataToggleService - Conditional metadata writing based on toggle configuration
 *
 * Phase 1c Power Features:
 * - Implements toggle-driven metadata write strategy
 * - Enforces TapeName conditional logic (3 scenarios)
 * - Maintains JSON as single source of truth (I3 compliance)
 *
 * TapeName Logic:
 * - Scenario 1: Both toggles OFF → TapeName NOT written (default workflow)
 * - Scenario 2: metadataWrite ON → TapeName written (preserves cameraId)
 * - Scenario 3: filenameRewrite ON → TapeName written (preserves original before rename)
 *
 * MINIMAL INTERVENTION PRINCIPLE:
 * - Essential complexity: Toggle-driven metadata strategy prevents unintended file modification
 * - User value: Flexible workflow (JSON-only OR file metadata)
 * - Existing extension: Enhances metadataWriter.ts with conditional logic layer
 * - Simplification test: Cannot remove without breaking toggle functionality
 */
export class MetadataToggleService {
  constructor(private writer: MetadataWriter) {}

  /**
   * Conditionally write metadata based on toggle configuration
   *
   * WORKFLOW:
   * 1. Generate JSON metadata (always returned for storage)
   * 2. If metadataWrite OR filenameRewrite enabled → write to file
   * 3. TapeName written if either toggle ON (preserves original)
   *
   * @param filePath Absolute path to media file
   * @param metadata Structured metadata components
   * @param config Toggle configuration
   * @returns JSON metadata for storage
   */
  async conditionalWrite(
    filePath: string,
    metadata: StructuredMetadata,
    config: MetadataToggleConfig
  ): Promise<JsonMetadata> {
    // Generate shotName from structured components
    const shotName = this.generateShotName(metadata);

    // Build JSON metadata (single source of truth)
    const jsonMetadata: JsonMetadata = {
      ...metadata,
      shotName,
      keywords: [] // Optional: can be populated from additional fields
    };

    // Determine if file metadata should be written
    const shouldWriteToFile = config.metadataWrite || config.filenameRewrite;

    if (!shouldWriteToFile) {
      // JSON-only workflow (default)
      // No file modification, return JSON for storage
      return jsonMetadata;
    }

    // File metadata write enabled → write to file
    // TapeName written when either toggle ON (preserves original filename)
    await this.writer.writeMetadataToFile(
      filePath,
      shotName,
      metadata.keywords || [],
      {
        location: metadata.location,
        subject: metadata.subject,
        action: metadata.action,
        shotType: metadata.shotType,
        shotNumber: metadata.shotNumber,
        cameraId: metadata.cameraId  // Written to TapeName if provided
      }
    );

    // Return JSON metadata for storage
    return jsonMetadata;
  }

  /**
   * Generate shotName from structured components
   *
   * Format:
   * - Images: {location}-{subject}-{shotType}
   * - Videos: {location}-{subject}-{action}-{shotType}
   *
   * @param metadata Structured metadata
   * @returns Generated shotName (without shot number)
   */
  private generateShotName(metadata: StructuredMetadata): string {
    const parts: string[] = [
      metadata.location,
      metadata.subject
    ];

    // Include action if present (videos)
    if (metadata.action) {
      parts.push(metadata.action);
    }

    parts.push(metadata.shotType);

    return parts.join('-');
  }
}
