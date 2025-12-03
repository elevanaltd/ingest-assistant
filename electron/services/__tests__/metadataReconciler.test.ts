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
    it('should update currentFilename when scanned filename differs', () => {
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

      // ASSERT: currentFilename and filePath should be updated
      expect(result.currentFilename).toBe('EA002033_proxy.MOV');
      expect(result.filePath).toBe('/path/to/new/EA002033_proxy.MOV');
      expect(MetadataStore.updateAuditTrail).toHaveBeenCalledWith(existingMetadata);
    });

    it('should NOT update currentFilename when scanned filename is the same', () => {
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

      // ASSERT: currentFilename should remain unchanged
      expect(result.currentFilename).toBe('EA002033.MOV');
      expect(result.filePath).toBe('/path/to/EA002033.MOV');
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
      expect(result.shotName).toBe('kitchen-oven-cleaning-ESTAB');
      expect(result.keywords).toEqual(['cooking', 'appliance']);
      expect(result.lockedFields).toEqual(['location', 'subject']);
      expect(result.location).toBe('kitchen');
      expect(result.subject).toBe('oven');
      expect(result.action).toBe('cleaning');
      expect(result.shotType).toBe('ESTAB');
      expect(result.processedByAI).toBe(true);
      expect(result.shotNumber).toBe(42);
      expect(result.createdBy).toBe('ingest-assistant');
      expect(result.modifiedBy).toBe('cep-panel');
    });
  });
});
