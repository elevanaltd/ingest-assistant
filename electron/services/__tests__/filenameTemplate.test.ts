import { describe, it, expect, beforeEach } from 'vitest';
import { FilenameTemplateParser } from '../filenameTemplate';

describe('FilenameTemplateParser - Functional', () => {
  let parser: FilenameTemplateParser;

  beforeEach(() => {
    parser = new FilenameTemplateParser();
  });

  describe('Template Field Substitution', () => {
    it('should substitute {subject} field', () => {
      const result = parser.parse('{subject}', { subject: 'oven' });

      expect(result).toBe('oven');
    });

    it('should substitute {location} field', () => {
      const result = parser.parse('{location}', { location: 'kitchen' });

      expect(result).toBe('kitchen');
    });

    it('should substitute {action} field', () => {
      const result = parser.parse('{action}', { action: 'cleaning' });

      expect(result).toBe('cleaning');
    });

    it('should substitute {shotType} field', () => {
      const result = parser.parse('{shotType}', { shotType: 'CU' });

      expect(result).toBe('CU');
    });

    it('should substitute {shotNumber} field', () => {
      const result = parser.parse('{shotNumber}', { shotNumber: '42' });

      expect(result).toBe('42');
    });

    it('should substitute {cameraId} field', () => {
      const result = parser.parse('{cameraId}', { cameraId: 'EA001622' });

      expect(result).toBe('EA001622');
    });
  });

  describe('Common Template Patterns', () => {
    it('should handle standard image template: {subject}-{shotNumber}', () => {
      const result = parser.parse('{subject}-{shotNumber}', {
        subject: 'oven',
        shotNumber: '5'
      });

      expect(result).toBe('oven-5');
    });

    it('should handle full video template: {location}-{subject}-{action}-{shotType}', () => {
      const result = parser.parse('{location}-{subject}-{action}-{shotType}', {
        location: 'kitchen',
        subject: 'oven',
        action: 'cleaning',
        shotType: 'WS'
      });

      expect(result).toBe('kitchen-oven-cleaning-WS');
    });

    it('should handle image template: {location}-{subject}-{shotType}', () => {
      const result = parser.parse('{location}-{subject}-{shotType}', {
        location: 'kitchen',
        subject: 'oven',
        shotType: 'CU'
      });

      expect(result).toBe('kitchen-oven-CU');
    });

    it('should handle template with cameraId prefix: {cameraId}-{subject}', () => {
      const result = parser.parse('{cameraId}-{subject}', {
        cameraId: 'EA001622',
        subject: 'oven'
      });

      expect(result).toBe('EA001622-oven');
    });
  });

  describe('Field Value Validation', () => {
    it('should convert numeric shotNumber to string', () => {
      const result = parser.parse('{shotNumber}', { shotNumber: 123 });

      expect(result).toBe('123');
    });

    it('should handle kebab-case field values', () => {
      const result = parser.parse('{subject}', { subject: 'oven-steam-tray' });

      expect(result).toBe('oven-steam-tray');
    });

    it('should handle snake_case field values', () => {
      const result = parser.parse('{subject}', { subject: 'oven_steam_tray' });

      expect(result).toBe('oven_steam_tray');
    });

    it('should handle dotted field values', () => {
      const result = parser.parse('{subject}', { subject: 'oven.v2' });

      expect(result).toBe('oven.v2');
    });

    it('should handle uppercase shot types', () => {
      const result = parser.parse('{shotType}', { shotType: 'ESTAB' });

      expect(result).toBe('ESTAB');
    });
  });

  describe('Preview Generation', () => {
    it('should generate preview showing before/after filenames', () => {
      const preview = parser.generatePreview(
        '{subject}-{shotNumber}',
        'EA001622.JPG',
        { subject: 'oven', shotNumber: '5' }
      );

      expect(preview.before).toBe('EA001622.JPG');
      expect(preview.after).toBe('oven-5.JPG');
      expect(preview.extension).toBe('.JPG');
    });

    it('should preserve file extension in preview', () => {
      const preview = parser.generatePreview(
        '{location}-{subject}',
        'EA001622.MOV',
        { location: 'kitchen', subject: 'oven' }
      );

      expect(preview.before).toBe('EA001622.MOV');
      expect(preview.after).toBe('kitchen-oven.MOV');
      expect(preview.extension).toBe('.MOV');
    });

    it('should handle filenames without extension', () => {
      const preview = parser.generatePreview(
        '{subject}',
        'EA001622',
        { subject: 'oven' }
      );

      expect(preview.before).toBe('EA001622');
      expect(preview.after).toBe('oven');
      expect(preview.extension).toBe('');
    });
  });

  describe('Batch Preview Generation', () => {
    it('should generate previews for multiple files', () => {
      const files = [
        { currentFilename: 'EA001622.JPG', subject: 'oven', shotNumber: '1' },
        { currentFilename: 'EA001623.JPG', subject: 'sink', shotNumber: '2' },
        { currentFilename: 'EA001624.JPG', subject: 'countertop', shotNumber: '3' }
      ];

      const previews = parser.generateBatchPreview(
        '{subject}-{shotNumber}',
        files
      );

      expect(previews).toHaveLength(3);
      expect(previews[0].before).toBe('EA001622.JPG');
      expect(previews[0].after).toBe('oven-1.JPG');
      expect(previews[1].before).toBe('EA001623.JPG');
      expect(previews[1].after).toBe('sink-2.JPG');
      expect(previews[2].before).toBe('EA001624.JPG');
      expect(previews[2].after).toBe('countertop-3.JPG');
    });

    it('should detect naming conflicts in batch preview', () => {
      const files = [
        { currentFilename: 'EA001622.JPG', subject: 'oven', shotNumber: '1' },
        { currentFilename: 'EA001623.JPG', subject: 'oven', shotNumber: '1' } // Conflict
      ];

      const previews = parser.generateBatchPreview(
        '{subject}-{shotNumber}',
        files
      );

      expect(previews[0].hasConflict).toBe(true);
      expect(previews[1].hasConflict).toBe(true);
      expect(previews[0].conflictWith).toContain('EA001623.JPG');
      expect(previews[1].conflictWith).toContain('EA001622.JPG');
    });
  });

  describe('Validation', () => {
    it('should validate template syntax', () => {
      const result = parser.validateTemplate('{subject}-{shotNumber}');

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect invalid field names', () => {
      const result = parser.validateTemplate('{invalidField}');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Unknown template field: invalidField');
    });

    it('should detect unclosed placeholders', () => {
      const result = parser.validateTemplate('{subject-{shotNumber}');

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toMatch(/unclosed/i);
    });

    it('should allow static text in template', () => {
      const result = parser.validateTemplate('prefix-{subject}-suffix');

      expect(result.valid).toBe(true);
    });
  });
});
