/**
 * Redacts sensitive query parameters from URLs before logging.
 *
 * Security: Prevents capability-token values from appearing in log output.
 * Mitigates: CWE-532 (Insertion of Sensitive Information into Log File)
 *
 * The media server uses capability tokens for authentication. If these tokens
 * appear in logs (crash reports, log aggregation, console output), they could
 * be used to bypass authentication and access media files.
 */

/**
 * Replaces the value of `token` query parameter with `[REDACTED]`.
 * Handles both full URLs and relative request paths (as seen by http.Server).
 *
 * @param url - The URL string to redact (full URL or relative path with query)
 * @returns The URL with token value replaced by [REDACTED]
 */
export function redactUrlTokens(url: string): string {
  // Use regex to replace token=<value> in the query string.
  // This handles both full URLs and relative paths without needing URL parsing,
  // which would require a base URL for relative paths.
  return url.replace(
    /([?&])token=[^&]*/,
    '$1token=[REDACTED]'
  );
}
