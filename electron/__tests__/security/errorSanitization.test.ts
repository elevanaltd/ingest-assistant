import { describe, it, expect } from 'vitest';
import { sanitizeError } from '../../utils/errorSanitization';

describe('Error Sanitization - Security', () => {
  describe('File path removal', () => {
    it('should remove Unix absolute paths from error messages', () => {
      const error = new Error("ENOENT: no such file or directory, open '/Users/victim/secret.txt'");
      const sanitized = sanitizeError(error);

      expect(sanitized.message).not.toContain('/Users');
      expect(sanitized.message).not.toContain('secret.txt');
      expect(sanitized.message).not.toContain('/Users/victim/secret.txt');
    });

    it('should remove Windows absolute paths from error messages', () => {
      const error = new Error('EACCES: permission denied, access \'C:\\Users\\victim\\secret.txt\'');
      const sanitized = sanitizeError(error);

      expect(sanitized.message).not.toContain('C:\\');
      expect(sanitized.message).not.toContain('secret.txt');
    });

    it('should remove multiple paths from same error', () => {
      const error = new Error('Cannot copy /home/user/file.txt to /var/data/output.txt');
      const sanitized = sanitizeError(error);

      expect(sanitized.message).not.toContain('/home/user');
      expect(sanitized.message).not.toContain('/var/data');
      expect(sanitized.message).not.toContain('file.txt');
      expect(sanitized.message).not.toContain('output.txt');
    });
  });

  describe('User-friendly messages', () => {
    it('should convert ENOENT to user-friendly message', () => {
      const error = new Error('ENOENT: no such file or directory, open \'/path/to/file\'');
      const sanitized = sanitizeError(error);

      expect(sanitized.message).toBe('File not found');
    });

    it('should convert EACCES to user-friendly message', () => {
      const error = new Error('EACCES: permission denied, access \'/path/to/file\'');
      const sanitized = sanitizeError(error);

      expect(sanitized.message).toBe('Permission denied');
    });

    it('should use generic message when paths removed', () => {
      const error = new Error('Operation failed on /some/path/file.txt');
      const sanitized = sanitizeError(error);

      expect(sanitized.message).toBe('File operation failed');
    });
  });

  describe('Safe error preservation', () => {
    it('should preserve safe error messages without paths', () => {
      const error = new Error('File too large: 150MB (max 100MB)');
      const sanitized = sanitizeError(error);

      expect(sanitized.message).toBe('File too large: 150MB (max 100MB)');
    });

    it('should preserve error name property', () => {
      const error = new Error('Test error');
      error.name = 'ValidationError';
      const sanitized = sanitizeError(error);

      expect(sanitized.name).toBe('ValidationError');
    });

    it('should handle non-Error objects gracefully', () => {
      const sanitized = sanitizeError('string error');

      expect(sanitized).toBeInstanceOf(Error);
      expect(sanitized.message).toBe('An error occurred');
    });

    it('should handle null/undefined gracefully', () => {
      const sanitized1 = sanitizeError(null);
      const sanitized2 = sanitizeError(undefined);

      expect(sanitized1.message).toBe('An error occurred');
      expect(sanitized2.message).toBe('An error occurred');
    });
  });

  describe('Command injection prevention', () => {
    it('should remove command arguments containing paths', () => {
      const error = new Error('Command failed: exiftool "/secret/path/file.jpg"');
      const sanitized = sanitizeError(error);

      expect(sanitized.message).not.toContain('/secret/path');
      expect(sanitized.message).not.toContain('file.jpg');
    });

    it('should handle complex command strings', () => {
      const error = new Error('exec: cp /Users/admin/.env /tmp/stolen.txt failed');
      const sanitized = sanitizeError(error);

      expect(sanitized.message).not.toContain('/Users/admin');
      expect(sanitized.message).not.toContain('.env');
      expect(sanitized.message).not.toContain('/tmp');
    });
  });

  describe('Edge cases', () => {
    it('should handle errors with only paths', () => {
      const error = new Error('/var/log/app.log');
      const sanitized = sanitizeError(error);

      expect(sanitized.message).toBe('File operation failed');
    });

    it('should handle relative paths appropriately', () => {
      const error = new Error('Cannot read ./config.json');
      const sanitized = sanitizeError(error);

      // Relative paths less sensitive but should still be sanitized
      expect(sanitized.message).not.toContain('config.json');
    });

    it('should preserve stack trace-free errors', () => {
      const error = new Error('Network timeout');
      const sanitized = sanitizeError(error);

      expect(sanitized.message).toBe('Network timeout');
    });
  });
});
