import { describe, it, expect } from 'vitest';
import { redactUrlTokens } from './redactUrl';

/**
 * Token Log Redaction Tests
 * P1 Security Fix: Capability-token values must never appear in log output.
 *
 * Attack vector: If logs are captured (crash reports, log aggregation, shoulder surfing),
 * plaintext tokens allow unauthorized media server access.
 *
 * Mitigates: CWE-532 (Insertion of Sensitive Information into Log File)
 */
describe('redactUrlTokens', () => {
  it('should redact token query parameter from media server URLs', () => {
    const url = 'http://localhost:8765/?path=%2Fsome%2Ffile.mov&token=abc123secret';
    const result = redactUrlTokens(url);
    expect(result).toBe('http://localhost:8765/?path=%2Fsome%2Ffile.mov&token=[REDACTED]');
    expect(result).not.toContain('abc123secret');
  });

  it('should redact token when it is the first query parameter', () => {
    const url = 'http://localhost:8765/?token=secret456&path=%2Ffile.mov';
    const result = redactUrlTokens(url);
    expect(result).toBe('http://localhost:8765/?token=[REDACTED]&path=%2Ffile.mov');
    expect(result).not.toContain('secret456');
  });

  it('should handle URLs without token parameter (no-op)', () => {
    const url = 'http://localhost:8765/?path=%2Fsome%2Ffile.mov';
    const result = redactUrlTokens(url);
    expect(result).toBe('http://localhost:8765/?path=%2Fsome%2Ffile.mov');
  });

  it('should handle URLs with no query string (no-op)', () => {
    const url = 'http://localhost:8765/';
    const result = redactUrlTokens(url);
    expect(result).toBe('http://localhost:8765/');
  });

  it('should redact long tokens (32-byte hex format)', () => {
    const longToken = 'deadbeef'.repeat(8); // 64-char dummy hex
    const url = `http://localhost:8765/?path=%2Ffile.mov&token=${longToken}`;
    const result = redactUrlTokens(url);
    expect(result).not.toContain(longToken);
    expect(result).toContain('token=[REDACTED]');
  });

  it('should preserve path parameter value while redacting token', () => {
    const url = 'http://localhost:8765/?path=%2FVolumes%2Fvideos%2Fproject%2Fproxy.MOV&token=mysecret';
    const result = redactUrlTokens(url);
    expect(result).toContain('path=%2FVolumes%2Fvideos%2Fproject%2Fproxy.MOV');
    expect(result).not.toContain('mysecret');
  });

  it('should redact ALL token parameters when duplicated', () => {
    const url = 'http://localhost:8765/?token=fake&path=%2Ffile.mov&token=realSecret';
    const result = redactUrlTokens(url);
    expect(result).not.toContain('fake');
    expect(result).not.toContain('realSecret');
    expect(result).toContain('token=[REDACTED]');
  });

  it('should handle request URL paths (relative, as seen by http.Server)', () => {
    // http.Server req.url is typically a relative path like /?path=...&token=...
    const reqUrl = '/?path=%2Fsome%2Ffile.mov&token=reqsecret';
    const result = redactUrlTokens(reqUrl);
    expect(result).not.toContain('reqsecret');
    expect(result).toContain('token=[REDACTED]');
  });
});
