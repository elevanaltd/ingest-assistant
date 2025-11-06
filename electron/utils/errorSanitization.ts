/**
 * Sanitizes error objects to remove sensitive information (file paths, commands)
 * before sending to renderer process.
 *
 * Security: Prevents information disclosure via error messages in DevTools console
 * Mitigates: CWE-209 (Information Exposure Through an Error Message)
 */
export function sanitizeError(error: Error | unknown): Error {
  if (!(error instanceof Error)) {
    return new Error('An error occurred');
  }

  let message = error.message;

  // Remove absolute paths (Unix: /path/to/file, Windows: C:\path\to\file)
  message = message.replace(/\/[^\s]+/g, '[path]'); // Unix paths
  message = message.replace(/[A-Z]:[/\\][^\s]+/gi, '[path]'); // Windows paths

  // Remove relative paths (./file or ../file)
  message = message.replace(/\.{1,2}\/[^\s]+/g, '[path]');

  // Convert common error codes to user-friendly messages
  if (message.includes('ENOENT')) {
    message = 'File not found';
  } else if (message.includes('EACCES')) {
    message = 'Permission denied';
  } else if (message.includes('[path]')) {
    // If message now contains [path] placeholder, make it generic
    message = 'File operation failed';
  }

  const sanitized = new Error(message);
  sanitized.name = error.name;

  return sanitized;
}
