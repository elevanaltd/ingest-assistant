import * as fs from 'fs/promises';
import * as path from 'path';
import type { FileMetadata, ShotType } from '../../src/types';

const SCHEMA_VERSION = '2.0';
const APP_NAME = 'ingest-assistant';

// App version for audit trail (updated via build process)
const APP_VERSION = '1.1.0';

interface MetadataStoreFile {
  _schema: string;
  _completed?: boolean;
  [fileId: string]: FileMetadata | string | boolean | undefined; // Extended types for special fields
}

type MetadataStoreData = Record<string, FileMetadata>;

export class MetadataStore {
  private storePath: string;
  private cache: MetadataStoreData | null = null;
  private schemaVersion: string = SCHEMA_VERSION;
  private completed: boolean = false;

  constructor(storePath: string) {
    this.storePath = storePath;
  }

  /**
   * Load all metadata from JSON file
   */
  async loadMetadata(): Promise<MetadataStoreData> {
    try {
      const content = await fs.readFile(this.storePath, 'utf-8');
      const fileData = JSON.parse(content) as MetadataStoreFile;

      // Extract schema version and completed flag
      this.schemaVersion = fileData._schema || '1.0';
      this.completed = fileData._completed || false;

      // Extract metadata (all keys except _schema and _completed)
      const data: MetadataStoreData = {};
      for (const key in fileData) {
        if (key === '_schema' || key === '_completed') continue;

        const metadata = fileData[key] as FileMetadata;

        // Ensure keywords exists (defensive - handles v1.0 files without keywords field)
        if (!metadata.keywords) {
          metadata.keywords = [];
        }

        // Mark v1.0 files as outdated (schema migration tracking)
        if (this.schemaVersion === '1.0') {
          metadata.isOutdated = true;
          console.log(`[MetadataStore] Marked v1.0 file as outdated: ${key}`);
        }

        // Convert date strings back to Date objects
        if (metadata.createdAt) {
          metadata.createdAt = new Date(metadata.createdAt);
        }
        if (metadata.modifiedAt) {
          metadata.modifiedAt = new Date(metadata.modifiedAt);
        }

        data[key] = metadata;
      }

      this.cache = data;
      return data;
    } catch (error) {
      // Type guard: Check if error has code property (NodeJS.ErrnoException)
      if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
        // File doesn't exist, return empty store
        this.cache = {};
        return {};
      }
      // Re-throw JSON parse errors
      throw error;
    }
  }

  /**
   * Save all metadata to JSON file
   */
  async saveMetadata(metadata: MetadataStoreData): Promise<boolean> {
    try {
      // Build file structure with schema version and completed flag
      const fileData: MetadataStoreFile = {
        _schema: SCHEMA_VERSION,
        _completed: this.completed,
        ...metadata
      };

      const jsonContent = JSON.stringify(fileData, null, 2);

      // Ensure directory exists
      const dir = path.dirname(this.storePath);
      await fs.mkdir(dir, { recursive: true });

      await fs.writeFile(this.storePath, jsonContent, 'utf-8');
      this.cache = metadata;
      return true;
    } catch (error) {
      console.error('Failed to save metadata:', error);
      return false;
    }
  }

  /**
   * Get metadata for a specific file
   */
  async getFileMetadata(fileId: string): Promise<FileMetadata | null> {
    if (!this.cache) {
      await this.loadMetadata();
    }
    return this.cache![fileId] || null;
  }

  /**
   * Update metadata for a specific file
   */
  async updateFileMetadata(fileId: string, metadata: FileMetadata): Promise<boolean> {
    if (!this.cache) {
      await this.loadMetadata();
    }

    this.cache![fileId] = metadata;
    return await this.saveMetadata(this.cache!);
  }

  /**
   * Get metadata for a range of file IDs (pagination support)
   */
  async getMetadataForRange(fileIds: string[]): Promise<FileMetadata[]> {
    if (!this.cache) {
      await this.loadMetadata();
    }

    const results: FileMetadata[] = [];
    for (const fileId of fileIds) {
      const metadata = this.cache![fileId];
      if (metadata) {
        results.push(metadata);
      }
    }

    return results;
  }

  /**
   * Create new FileMetadata with audit trail
   * Use this helper to ensure consistent metadata creation
   */
  static createMetadata(params: {
    id: string;
    originalFilename: string;
    currentFilename: string;
    filePath: string;
    extension: string;
    fileType: 'image' | 'video';
    shotName: string;
    keywords?: string[];
    lockedFields?: string[];
    location?: string;
    subject?: string;
    action?: string;
    shotType?: string;
    processedByAI?: boolean;
    creationTimestamp?: Date;
    cameraId?: string;
    shotNumber?: number;
  }): FileMetadata {
    const now = new Date();
    return {
      // File identification
      id: params.id,
      originalFilename: params.originalFilename,
      currentFilename: params.currentFilename,
      filePath: params.filePath,
      extension: params.extension,
      fileType: params.fileType,
      creationTimestamp: params.creationTimestamp,
      cameraId: params.cameraId,
      shotNumber: params.shotNumber,

      // Core metadata
      shotName: params.shotName,
      keywords: params.keywords || [],
      lockedFields: params.lockedFields || [],

      // Structured components (always present, empty string if not provided)
      location: params.location || '',
      subject: params.subject || '',
      action: params.action || '',
      shotType: (params.shotType as ShotType) || '',

      // Processing state
      processedByAI: params.processedByAI || false,

      // Audit trail
      createdAt: now,
      createdBy: APP_NAME,
      modifiedAt: now,
      modifiedBy: APP_NAME,
      version: APP_VERSION
    };
  }

  /**
   * Clear in-memory cache
   * Used before batch processing to ensure fresh reads from disk
   * Prevents stale cached data when processing files currently displayed in UI
   */
  clearCache(): void {
    this.cache = null;
    console.log('[MetadataStore] Cache cleared');
  }

  /**
   * Update FileMetadata audit trail
   * Call this when modifying existing metadata
   */
  static updateAuditTrail(metadata: FileMetadata): void {
    metadata.modifiedAt = new Date();
    metadata.modifiedBy = APP_NAME;
    metadata.version = APP_VERSION;
  }

  /**
   * Get folder completion status
   * Returns true if folder has been marked as COMPLETED (locked for editing)
   */
  getCompleted(): boolean {
    return this.completed;
  }

  /**
   * Set folder completion status
   * When set to true, FileManager will skip processing and folder becomes read-only
   * @param completed - true to lock folder, false to allow editing
   */
  async setCompleted(completed: boolean): Promise<boolean> {
    this.completed = completed;
    // Persist the change immediately
    if (this.cache) {
      return await this.saveMetadata(this.cache);
    }
    return false;
  }
}
