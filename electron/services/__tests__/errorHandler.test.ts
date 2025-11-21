/**
 * Error Handler Tests
 *
 * Tests error classification, retry strategy, user messages, and recovery actions
 * per D3 Blueprint lines 859-1044.
 *
 * TDD: RED phase - These tests will fail until errorHandler.ts is implemented
 */

import { describe, it, expect } from 'vitest';
import { ErrorHandler } from '../errorHandler';

describe('ErrorHandler', () => {
  describe('error classification', () => {
    it('should classify ENOENT as TRANSIENT (LucidLink cache eviction)', () => {
      const errorHandler = new ErrorHandler();
      const error = Object.assign(new Error('File not found'), { code: 'ENOENT' });

      const classification = errorHandler.classify(error);

      expect(classification.category).toBe('TRANSIENT');
      expect(classification.code).toBe('ENOENT');
      expect(classification.retriable).toBe(true);
      expect(classification.userMessage).toContain('LucidLink cache');
    });

    it('should classify ENOSPC as FATAL (disk full)', () => {
      const errorHandler = new ErrorHandler();
      const error = Object.assign(new Error('No space left on device'), { code: 'ENOSPC' });

      const classification = errorHandler.classify(error);

      expect(classification.category).toBe('FATAL');
      expect(classification.code).toBe('ENOSPC');
      expect(classification.retriable).toBe(false);
      expect(classification.userMessage).toContain('disk is full');
    });

    it('should classify ETIMEDOUT as NETWORK (network timeout)', () => {
      const errorHandler = new ErrorHandler();
      const error = Object.assign(new Error('Connection timeout'), { code: 'ETIMEDOUT' });

      const classification = errorHandler.classify(error);

      expect(classification.category).toBe('NETWORK');
      expect(classification.code).toBe('ETIMEDOUT');
      expect(classification.retriable).toBe(true);
      expect(classification.userMessage).toContain('Network timeout');
    });

    it('should classify EACCES as FATAL (permission denied)', () => {
      const errorHandler = new ErrorHandler();
      const error = Object.assign(new Error('Permission denied'), { code: 'EACCES' });

      const classification = errorHandler.classify(error);

      expect(classification.category).toBe('FATAL');
      expect(classification.code).toBe('EACCES');
      expect(classification.retriable).toBe(false);
      expect(classification.userMessage).toContain('Permission denied');
    });

    it('should classify ESTALE as TRANSIENT (stale NFS handle)', () => {
      const errorHandler = new ErrorHandler();
      const error = Object.assign(new Error('Stale file handle'), { code: 'ESTALE' });

      const classification = errorHandler.classify(error);

      expect(classification.category).toBe('TRANSIENT');
      expect(classification.code).toBe('ESTALE');
      expect(classification.retriable).toBe(true);
      expect(classification.userMessage).toContain('NFS');
    });

    it('should classify ENETUNREACH as NETWORK (network unreachable)', () => {
      const errorHandler = new ErrorHandler();
      const error = Object.assign(new Error('Network unreachable'), { code: 'ENETUNREACH' });

      const classification = errorHandler.classify(error);

      expect(classification.category).toBe('NETWORK');
      expect(classification.code).toBe('ENETUNREACH');
      expect(classification.retriable).toBe(true);
    });

    it('should classify EBUSY as TRANSIENT (resource busy)', () => {
      const errorHandler = new ErrorHandler();
      const error = Object.assign(new Error('Resource busy'), { code: 'EBUSY' });

      const classification = errorHandler.classify(error);

      expect(classification.category).toBe('TRANSIENT');
      expect(classification.code).toBe('EBUSY');
      expect(classification.retriable).toBe(true);
    });

    it('should classify EROFS as FATAL (read-only filesystem)', () => {
      const errorHandler = new ErrorHandler();
      const error = Object.assign(new Error('Read-only filesystem'), { code: 'EROFS' });

      const classification = errorHandler.classify(error);

      expect(classification.category).toBe('FATAL');
      expect(classification.code).toBe('EROFS');
      expect(classification.retriable).toBe(false);
    });

    it('should classify EAGAIN as TRANSIENT (resource temporarily unavailable)', () => {
      const errorHandler = new ErrorHandler();
      const error = Object.assign(new Error('Resource temporarily unavailable'), { code: 'EAGAIN' });

      const classification = errorHandler.classify(error);

      expect(classification.category).toBe('TRANSIENT');
      expect(classification.code).toBe('EAGAIN');
      expect(classification.retriable).toBe(true);
    });

    it('should classify EIO as TRANSIENT (I/O error - conservative retry)', () => {
      const errorHandler = new ErrorHandler();
      const error = Object.assign(new Error('I/O error'), { code: 'EIO' });

      const classification = errorHandler.classify(error);

      expect(classification.category).toBe('TRANSIENT');
      expect(classification.code).toBe('EIO');
      expect(classification.retriable).toBe(true);
    });

    it('should classify unknown errors as FATAL (conservative)', () => {
      const errorHandler = new ErrorHandler();
      const error = Object.assign(new Error('Unknown error'), { code: 'EUNKNOWN' });

      const classification = errorHandler.classify(error);

      expect(classification.category).toBe('FATAL');
      expect(classification.code).toBe('EUNKNOWN');
      expect(classification.retriable).toBe(false);
      expect(classification.userMessage).toBe('Unknown error');
    });

    it('should handle error without code property', () => {
      const errorHandler = new ErrorHandler();
      const error = new Error('Generic error without code');

      const classification = errorHandler.classify(error);

      expect(classification.category).toBe('FATAL');
      expect(classification.code).toBe('UNKNOWN');
      expect(classification.retriable).toBe(false);
    });
  });

  describe('retry strategy', () => {
    it('should return 5 retries for LucidLink paths', () => {
      const errorHandler = new ErrorHandler();
      const maxRetries = errorHandler.getMaxRetries('/LucidLink/EAV014/images/shoot1/');

      expect(maxRetries).toBe(5);
    });

    it('should return 5 retries for Ubuntu NFS paths', () => {
      const errorHandler = new ErrorHandler();
      const maxRetries = errorHandler.getMaxRetries('/Ubuntu/EAV014/videos-raw/');

      expect(maxRetries).toBe(5);
    });

    it('should return 3 retries for local paths', () => {
      const errorHandler = new ErrorHandler();
      const maxRetries = errorHandler.getMaxRetries('/Users/local/files/');

      expect(maxRetries).toBe(3);
    });

    it('should return 3 retries for standard paths', () => {
      const errorHandler = new ErrorHandler();
      const maxRetries = errorHandler.getMaxRetries('/tmp/files/');

      expect(maxRetries).toBe(3);
    });

    it('should calculate exponential backoff for transient errors', () => {
      const errorHandler = new ErrorHandler();
      const error = Object.assign(new Error('File busy'), { code: 'EBUSY' });

      expect(errorHandler.getBackoffDelay(error, 0)).toBe(1000); // 2^0 * 1000ms = 1s
      expect(errorHandler.getBackoffDelay(error, 1)).toBe(2000); // 2^1 * 1000ms = 2s
      expect(errorHandler.getBackoffDelay(error, 2)).toBe(4000); // 2^2 * 1000ms = 4s
      expect(errorHandler.getBackoffDelay(error, 3)).toBe(8000); // 2^3 * 1000ms = 8s
    });

    it('should calculate exponential backoff for network errors with 2s base', () => {
      const errorHandler = new ErrorHandler();
      const error = Object.assign(new Error('Network timeout'), { code: 'ETIMEDOUT' });

      expect(errorHandler.getBackoffDelay(error, 0)).toBe(2000); // 2^0 * 2000ms = 2s
      expect(errorHandler.getBackoffDelay(error, 1)).toBe(4000); // 2^1 * 2000ms = 4s
      expect(errorHandler.getBackoffDelay(error, 2)).toBe(8000); // 2^2 * 2000ms = 8s
    });

    it('should return 0 delay for fatal errors (no retry)', () => {
      const errorHandler = new ErrorHandler();
      const error = Object.assign(new Error('Disk full'), { code: 'ENOSPC' });

      expect(errorHandler.getBackoffDelay(error, 0)).toBe(0);
    });
  });

  describe('user-friendly error messages', () => {
    it('should provide helpful message for ENOSPC', () => {
      const errorHandler = new ErrorHandler();
      const error = Object.assign(new Error('No space left'), { code: 'ENOSPC' });

      const classification = errorHandler.classify(error);

      expect(classification.userMessage).toBe('Destination disk is full. Cannot continue transfer.');
      expect(classification.recoveryAction).toBe('Free up disk space on destination and restart transfer');
    });

    it('should provide helpful message for EACCES', () => {
      const errorHandler = new ErrorHandler();
      const error = Object.assign(new Error('Permission denied'), { code: 'EACCES' });

      const classification = errorHandler.classify(error);

      expect(classification.userMessage).toBe('Permission denied. Check folder access permissions.');
      expect(classification.recoveryAction).toBe('Check folder permissions (chmod/chown) and restart transfer');
    });

    it('should provide helpful message for ENOENT', () => {
      const errorHandler = new ErrorHandler();
      const error = Object.assign(new Error('File not found'), { code: 'ENOENT' });

      const classification = errorHandler.classify(error);

      expect(classification.userMessage).toBe('File not found. Retrying... (LucidLink cache may be reloading)');
      expect(classification.recoveryAction).toBe('Wait for retry - LucidLink cache will repopulate');
    });

    it('should provide helpful message for ESTALE', () => {
      const errorHandler = new ErrorHandler();
      const error = Object.assign(new Error('Stale file handle'), { code: 'ESTALE' });

      const classification = errorHandler.classify(error);

      expect(classification.userMessage).toBe('Network file handle stale. Retrying... (NFS temporary issue)');
      expect(classification.recoveryAction).toBe('Wait for retry - NFS mount will recover');
    });

    it('should provide helpful message for ENETUNREACH', () => {
      const errorHandler = new ErrorHandler();
      const error = Object.assign(new Error('Network unreachable'), { code: 'ENETUNREACH' });

      const classification = errorHandler.classify(error);

      expect(classification.userMessage).toBe('Network unreachable. Retrying... (Check NFS mount)');
      expect(classification.recoveryAction).toBe('Check network connection and NFS mount status');
    });
  });

  describe('card removal detection', () => {
    it('should detect card removal when source ENOENT and mount gone', () => {
      const errorHandler = new ErrorHandler();
      const error = Object.assign(new Error('File not found'), { code: 'ENOENT' });
      const sourcePath = '/Volumes/NO NAME/DCIM/EA001621.JPG';
      const cfexCardPath = '/Volumes/NO NAME';

      // Mock fs.existsSync to return false (card not mounted)
      const isCardRemoval = errorHandler.isCardRemovalError(error, sourcePath, cfexCardPath, false);

      expect(isCardRemoval).toBe(true);
    });

    it('should not detect card removal when source ENOENT but mount exists', () => {
      const errorHandler = new ErrorHandler();
      const error = Object.assign(new Error('File not found'), { code: 'ENOENT' });
      const sourcePath = '/Volumes/NO NAME/DCIM/EA001621.JPG';
      const cfexCardPath = '/Volumes/NO NAME';

      // Mock fs.existsSync to return true (card still mounted)
      const isCardRemoval = errorHandler.isCardRemovalError(error, sourcePath, cfexCardPath, true);

      expect(isCardRemoval).toBe(false);
    });

    it('should not detect card removal for destination ENOENT', () => {
      const errorHandler = new ErrorHandler();
      const error = Object.assign(new Error('File not found'), { code: 'ENOENT' });
      const sourcePath = '/LucidLink/EAV014/images/EA001621.JPG';
      const cfexCardPath = '/Volumes/NO NAME';

      // Destination path (not within CFex card path)
      const isCardRemoval = errorHandler.isCardRemovalError(error, sourcePath, cfexCardPath, false);

      expect(isCardRemoval).toBe(false);
    });

    it('should not detect card removal for non-ENOENT errors', () => {
      const errorHandler = new ErrorHandler();
      const error = Object.assign(new Error('Permission denied'), { code: 'EACCES' });
      const sourcePath = '/Volumes/NO NAME/DCIM/EA001621.JPG';
      const cfexCardPath = '/Volumes/NO NAME';

      const isCardRemoval = errorHandler.isCardRemovalError(error, sourcePath, cfexCardPath, false);

      expect(isCardRemoval).toBe(false);
    });
  });

  describe('recovery actions', () => {
    it('should provide recovery action for ENOSPC', () => {
      const errorHandler = new ErrorHandler();
      const error = Object.assign(new Error('No space left'), { code: 'ENOSPC' });

      const classification = errorHandler.classify(error);

      expect(classification.recoveryAction).toBe('Free up disk space on destination and restart transfer');
    });

    it('should provide recovery action for EROFS', () => {
      const errorHandler = new ErrorHandler();
      const error = Object.assign(new Error('Read-only'), { code: 'EROFS' });

      const classification = errorHandler.classify(error);

      expect(classification.recoveryAction).toBe('Ensure destination is mounted read-write');
    });

    it('should provide recovery action for EBUSY', () => {
      const errorHandler = new ErrorHandler();
      const error = Object.assign(new Error('Busy'), { code: 'EBUSY' });

      const classification = errorHandler.classify(error);

      expect(classification.recoveryAction).toBe('Wait for retry - file will become available');
    });

    it('should provide recovery action for EIO', () => {
      const errorHandler = new ErrorHandler();
      const error = Object.assign(new Error('I/O error'), { code: 'EIO' });

      const classification = errorHandler.classify(error);

      expect(classification.recoveryAction).toBe('Check disk health and cable connections');
    });

    it('should provide generic recovery action for unknown errors', () => {
      const errorHandler = new ErrorHandler();
      const error = Object.assign(new Error('Unknown'), { code: 'EUNKNOWN' });

      const classification = errorHandler.classify(error);

      expect(classification.recoveryAction).toBe('Review error log and contact support');
    });
  });
});
