import * as fs from 'fs/promises';
import * as path from 'path';
import type { FileMetadata } from '../../src/types';

type MetadataStoreData = Record<string, FileMetadata>;

export class MetadataStore {
  private storePath: string;
  private cache: MetadataStoreData | null = null;

  constructor(storePath: string) {
    this.storePath = storePath;
  }

  /**
   * Load all metadata from JSON file
   */
  async loadMetadata(): Promise<MetadataStoreData> {
    try {
      const content = await fs.readFile(this.storePath, 'utf-8');
      const data = JSON.parse(content);

      // Convert date strings back to Date objects
      for (const key in data) {
        if (data[key].lastModified) {
          data[key].lastModified = new Date(data[key].lastModified);
        }
      }

      this.cache = data;
      return data;
    } catch (error: any) {
      if (error.code === 'ENOENT') {
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
      const jsonContent = JSON.stringify(metadata, null, 2);

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
}
