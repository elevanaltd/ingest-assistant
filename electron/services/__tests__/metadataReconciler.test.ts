/**
 * Unit tests for metadataReconciler service
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { reconcileMetadata } from '../metadataReconciler';
import { FileMetadata } from '../../../src/types';
import { MetadataStore } from '../metadataStore';

// Mock MetadataStore.updateAuditTrail
vi.mock('../metadataStore', () => ({
  MetadataStore: {
    updateAuditTrail: vi.fn(),
  },
}));

describe('metadataReconciler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('reconcileMetadata', () => {
    it('should return updated=true and update currentFilename when scanned filename differs', () => {
      // ARRANGE: Existing metadata has old filename
      const existingMetadata: FileMetadata = {
        id: 'EA002033',
        originalFilename: 'EA002033.MOV',
        currentFilename: 'EA002033.MOV', // OLD filename
        filePath: '/path/to/old/EA002033.MOV',
        extension: '.MOV',
        fileType: 'video',
        shotName: 'kitchen-oven-cleaning-ESTAB',
        keywords: [],
        lockedFields: [],
        location: 'kitchen',
        subject: 'oven',
        action: 'cleaning',
        shotType: 'ESTAB',
        processedByAI: true,
        createdAt: new Date('2024-01-01'),
        createdBy: 'ingest-assistant',
        modifiedAt: new Date('2024-01-01'),
        modifiedBy: 'ingest-assistant',
        version: '2.2.0',
      };

      // Scanned metadata has NEW filename (proxy suffix)
      const scannedMetadata: FileMetadata = {
        ...existingMetadata,
        currentFilename: 'EA002033_proxy.MOV', // NEW filename
        filePath: '/path/to/new/EA002033_proxy.MOV',
      };

      // ACT: Reconcile metadata
      const result = reconcileMetadata(existingMetadata, scannedMetadata);

      // ASSERT: Should return updated=true flag
      expect(result.updated).toBe(true);

      // ASSERT: currentFilename and filePath should be updated
      expect(result.metadata.currentFilename).toBe('EA002033_proxy.MOV');
      expect(result.metadata.filePath).toBe('/path/to/new/EA002033_proxy.MOV');
      expect(MetadataStore.updateAuditTrail).toHaveBeenCalledWith(existingMetadata);
    });

    it('should return updated=false when scanned filename is the same', () => {
      // ARRANGE: Existing metadata has same filename as scanned
      const existingMetadata: FileMetadata = {
        id: 'EA002033',
        originalFilename: 'EA002033.MOV',
        currentFilename: 'EA002033.MOV',
        filePath: '/path/to/EA002033.MOV',
        extension: '.MOV',
        fileType: 'video',
        shotName: 'kitchen-oven-cleaning-ESTAB',
        keywords: [],
        lockedFields: [],
        location: 'kitchen',
        subject: 'oven',
        action: 'cleaning',
        shotType: 'ESTAB',
        processedByAI: true,
        createdAt: new Date('2024-01-01'),
        createdBy: 'ingest-assistant',
        modifiedAt: new Date('2024-01-01'),
        modifiedBy: 'ingest-assistant',
        version: '2.2.0',
      };

      const scannedMetadata: FileMetadata = {
        ...existingMetadata,
        currentFilename: 'EA002033.MOV', // SAME filename
        filePath: '/path/to/EA002033.MOV',
      };

      // ACT: Reconcile metadata
      const result = reconcileMetadata(existingMetadata, scannedMetadata);

      // ASSERT: Should return updated=false flag
      expect(result.updated).toBe(false);

      // ASSERT: currentFilename should remain unchanged
      expect(result.metadata.currentFilename).toBe('EA002033.MOV');
      expect(result.metadata.filePath).toBe('/path/to/EA002033.MOV');
      expect(MetadataStore.updateAuditTrail).not.toHaveBeenCalled();
    });

    it('should preserve all other metadata fields during reconciliation', () => {
      // ARRANGE: Existing metadata with rich AI-processed data
      const existingMetadata: FileMetadata = {
        id: 'EA002033',
        originalFilename: 'EA002033.MOV',
        currentFilename: 'EA002033.MOV',
        filePath: '/path/to/EA002033.MOV',
        extension: '.MOV',
        fileType: 'video',
        shotName: 'kitchen-oven-cleaning-ESTAB',
        keywords: ['cooking', 'appliance'],
        lockedFields: ['location', 'subject'],
        location: 'kitchen',
        subject: 'oven',
        action: 'cleaning',
        shotType: 'ESTAB',
        processedByAI: true,
        shotNumber: 42,
        createdAt: new Date('2024-01-01'),
        createdBy: 'ingest-assistant',
        modifiedAt: new Date('2024-01-02'),
        modifiedBy: 'cep-panel',
        version: '2.2.0',
      };

      const scannedMetadata: FileMetadata = {
        ...existingMetadata,
        currentFilename: 'EA002033_proxy.MOV',
        filePath: '/path/to/EA002033_proxy.MOV',
      };

      // ACT: Reconcile metadata
      const result = reconcileMetadata(existingMetadata, scannedMetadata);

      // ASSERT: All original metadata fields preserved
      expect(result.metadata.shotName).toBe('kitchen-oven-cleaning-ESTAB');
      expect(result.metadata.keywords).toEqual(['cooking', 'appliance']);
      expect(result.metadata.lockedFields).toEqual(['location', 'subject']);
      expect(result.metadata.location).toBe('kitchen');
      expect(result.metadata.subject).toBe('oven');
      expect(result.metadata.action).toBe('cleaning');
      expect(result.metadata.shotType).toBe('ESTAB');
      expect(result.metadata.processedByAI).toBe(true);
      expect(result.metadata.shotNumber).toBe(42);
      expect(result.metadata.createdBy).toBe('ingest-assistant');
      expect(result.metadata.modifiedBy).toBe('cep-panel');
    });
  });
});
