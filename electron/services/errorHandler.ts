/**
 * Error Handler Service
 *
 * Provides error classification, retry strategy, user messages, and recovery actions
 * for CFEx file transfer operations.
 *
 * Design Philosophy (MIP Compliance):
 * - ESSENTIAL: Error classification for retry decision (TRANSIENT vs FATAL vs NETWORK)
 * - ESSENTIAL: Exponential backoff for transient failures (1s, 2s, 4s, 8s...)
 * - ESSENTIAL: User-friendly error messages and recovery guidance
 * - ESSENTIAL: Card removal detection (CFEx card unplugged during transfer)
 *
 * System Ripples:
 * - Error classification → Retry logic in cfexTransfer.ts
 * - Backoff delays → Transfer performance and user wait time
 * - User messages → UI error display and notification system
 *
 * Reference: D3 Blueprint lines 859-1044
 */

/**
 * Error category classification
 */
export type ErrorCategory = 'TRANSIENT' | 'FATAL' | 'NETWORK';

/**
 * Error classification result with retry guidance and user messaging
 */
export interface ErrorClassification {
  category: ErrorCategory;
  code: string;
  retriable: boolean;
  userMessage: string;
  recoveryAction: string;
}

/**
 * Error Handler Service
 *
 * Classifies errors into categories (TRANSIENT/FATAL/NETWORK) and provides
 * retry strategy, user messages, and recovery actions.
 */
export class ErrorHandler {
  // TRANSIENT errors: Retry up to 3 times with exponential backoff
  private static readonly TRANSIENT_ERRORS = [
    'EBUSY',      // Resource busy
    'ETIMEDOUT',  // Network timeout (also in NETWORK_ERRORS for extended retry)
    'ECONNRESET', // Connection reset
    'ENOENT',     // File not found (LucidLink cache eviction)
    'ESTALE',     // Stale NFS handle (Ubuntu NFS)
    'EAGAIN',     // Resource temporarily unavailable
    'EIO',        // I/O error (conservative retry 3x then fail)
  ];

  // FATAL errors: Fail immediately, no retry
  private static readonly FATAL_ERRORS = [
    'ENOSPC',     // No space left (disk full)
    'EACCES',     // Permission denied
    'EROFS',      // Read-only filesystem
    'ENOTDIR',    // Not a directory
    'EISDIR',     // Is a directory
  ];

  // NETWORK errors: Retry up to 5 times with longer delays (2s base)
  private static readonly NETWORK_ERRORS = [
    'ETIMEDOUT',
    'ENETUNREACH',   // Network unreachable (network partition)
    'ECONNREFUSED',  // Connection refused
    'EHOSTUNREACH',  // Host unreachable
  ];

  // Error code → User-friendly message mapping
  private static readonly ERROR_MESSAGES: Record<string, string> = {
    'ENOSPC': 'Destination disk is full. Cannot continue transfer.',
    'EACCES': 'Permission denied. Check folder access permissions.',
    'EROFS': 'Destination is read-only. Cannot write files.',
    'ENOENT': 'File not found. Retrying... (LucidLink cache may be reloading)',
    'ESTALE': 'Network file handle stale. Retrying... (NFS temporary issue)',
    'ENETUNREACH': 'Network unreachable. Retrying... (Check NFS mount)',
    'ETIMEDOUT': 'Network timeout. Retrying...',
    'EBUSY': 'File is busy. Retrying...',
    'EIO': 'I/O error. Retrying...',
  };

  // Error code → Recovery action mapping
  private static readonly RECOVERY_ACTIONS: Record<string, string> = {
    'ENOSPC': 'Free up disk space on destination and restart transfer',
    'EACCES': 'Check folder permissions (chmod/chown) and restart transfer',
    'EROFS': 'Ensure destination is mounted read-write',
    'ENOENT': 'Wait for retry - LucidLink cache will repopulate',
    'ESTALE': 'Wait for retry - NFS mount will recover',
    'ENETUNREACH': 'Check network connection and NFS mount status',
    'ETIMEDOUT': 'Check network connection stability',
    'EBUSY': 'Wait for retry - file will become available',
    'EIO': 'Check disk health and cable connections',
  };

  /**
   * Classify error into category (TRANSIENT/FATAL/NETWORK)
   *
   * @param error - Error object with optional code property
   * @returns Error classification with retry guidance and user messaging
   */
  classify(error: Error & { code?: string }): ErrorClassification {
    const code = error.code || 'UNKNOWN';

    // FATAL errors: No retry
    if (ErrorHandler.FATAL_ERRORS.includes(code)) {
      return {
        category: 'FATAL',
        code,
        retriable: false,
        userMessage: ErrorHandler.ERROR_MESSAGES[code] || error.message,
        recoveryAction: ErrorHandler.RECOVERY_ACTIONS[code] || 'Contact support',
      };
    }

    // NETWORK errors: Extended retry (5 attempts, 2s base delay)
    if (ErrorHandler.NETWORK_ERRORS.includes(code)) {
      return {
        category: 'NETWORK',
        code,
        retriable: true,
        userMessage: ErrorHandler.ERROR_MESSAGES[code] || error.message,
        recoveryAction: ErrorHandler.RECOVERY_ACTIONS[code] || 'Check network connection',
      };
    }

    // TRANSIENT errors: Standard retry (3 attempts, 1s base delay)
    if (ErrorHandler.TRANSIENT_ERRORS.includes(code)) {
      return {
        category: 'TRANSIENT',
        code,
        retriable: true,
        userMessage: ErrorHandler.ERROR_MESSAGES[code] || error.message,
        recoveryAction: ErrorHandler.RECOVERY_ACTIONS[code] || 'Retry in progress',
      };
    }

    // Unknown error: Treat as FATAL (conservative)
    return {
      category: 'FATAL',
      code,
      retriable: false,
      userMessage: error.message,
      recoveryAction: 'Review error log and contact support',
    };
  }

  /**
   * Get maximum retry attempts based on destination path
   *
   * Network paths (LucidLink, Ubuntu NFS) get extended retry tolerance (5 attempts)
   * Local paths get standard retry tolerance (3 attempts)
   *
   * @param destinationPath - Destination file path
   * @returns Maximum retry attempts
   */
  getMaxRetries(destinationPath: string): number {
    // Network paths: 5 retries (extended tolerance)
    if (destinationPath.startsWith('/LucidLink/') || destinationPath.startsWith('/Ubuntu/')) {
      return 5;
    }

    // Local paths: 3 retries (standard)
    return 3;
  }

  /**
   * Calculate exponential backoff delay for retry
   *
   * Formula: baseDelay * 2^attempt
   * - TRANSIENT errors: 1s base → 1s, 2s, 4s, 8s, 16s...
   * - NETWORK errors: 2s base → 2s, 4s, 8s, 16s, 32s...
   * - FATAL errors: 0 (no retry)
   *
   * @param error - Error object with optional code property
   * @param attempt - Retry attempt number (0-indexed)
   * @returns Delay in milliseconds
   */
  getBackoffDelay(error: Error & { code?: string }, attempt: number): number {
    const classification = this.classify(error);

    // FATAL errors: No retry
    if (!classification.retriable) {
      return 0;
    }

    // Network errors: 2s base delay (longer than transient)
    const baseDelay = classification.category === 'NETWORK' ? 2000 : 1000;

    // Exponential backoff: 2^attempt * baseDelay
    return Math.pow(2, attempt) * baseDelay;
  }

  /**
   * Check if error indicates CFEx card removal (vs normal ENOENT)
   *
   * Card removal is detected when:
   * 1. Error code is ENOENT
   * 2. Source path is within CFEx card mount point
   * 3. CFEx card mount point no longer exists (card unplugged)
   *
   * @param error - Error object with optional code property
   * @param sourcePath - Source file path (e.g., /Volumes/NO NAME/DCIM/EA001621.JPG)
   * @param cfexCardPath - CFEx card mount point (e.g., /Volumes/NO NAME)
   * @param mountExists - Whether mount point exists (for testing, or from fs.existsSync)
   * @returns True if card removal detected, false otherwise
   */
  isCardRemovalError(
    error: Error & { code?: string },
    sourcePath: string,
    cfexCardPath: string,
    mountExists: boolean
  ): boolean {
    // Only ENOENT errors can indicate card removal
    if (error.code !== 'ENOENT') {
      return false;
    }

    // Source file must be within CFEx card path
    if (!sourcePath.startsWith(cfexCardPath)) {
      return false;
    }

    // Card mount point must no longer exist
    return !mountExists;
  }
}
