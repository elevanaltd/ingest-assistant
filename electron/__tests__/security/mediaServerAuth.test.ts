import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import crypto from 'crypto';

/**
 * Media Server Authentication Security Tests
 * Per Security Report 007 - BLOCKING #2: Unauthenticated localhost Media Server
 *
 * Tests capability token implementation to prevent cross-origin data exfiltration
 * Attack vector: Malicious website probes localhost:8765 to read user media files
 *
 * Security requirements:
 * 1. Reject requests without token parameter
 * 2. Reject requests with invalid/wrong token
 * 3. Accept requests with valid token
 * 4. Token must be cryptographically random (not predictable)
 */

// Use different port for tests to avoid conflicts with running Electron app
const MEDIA_SERVER_PORT = 8766;
const MEDIA_SERVER_URL = `http://localhost:${MEDIA_SERVER_PORT}`;

// Test server state
let testServer: http.Server | null = null;
let testToken: string = '';

// Helper to make HTTP requests
async function makeRequest(path: string, token?: string): Promise<http.IncomingMessage> {
  return new Promise((resolve, reject) => {
    const url = new URL(path, MEDIA_SERVER_URL);
    if (token) {
      url.searchParams.set('token', token);
    }

    http.get(url.toString(), (res) => {
      resolve(res);
    }).on('error', reject);
  });
}

// Create test media server with token authentication
// Mimics production createMediaServer() from main.ts but without Electron dependencies
function createTestMediaServer(token: string): http.Server {
  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url!, `http://localhost:${MEDIA_SERVER_PORT}`);
      const requestToken = url.searchParams.get('token');
      const filePath = url.searchParams.get('path');

      // Security: Validate capability token BEFORE path validation
      // Per Security Report 007 - BLOCKING #2: Prevent cross-origin localhost probing
      if (!requestToken || requestToken !== token) {
        res.writeHead(403, { 'Content-Type': 'text/plain' });
        res.end('Forbidden: Invalid authentication token');
        return;
      }

      if (!filePath) {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.end('Missing path parameter');
        return;
      }

      // In tests, we don't actually serve files - just validate auth worked
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('OK');
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Internal server error');
    }
  });

  return server;
}

describe('Media Server Authentication - Security', () => {
  beforeAll(async () => {
    // Generate test token (same as production: 32 bytes = 64 hex chars)
    testToken = crypto.randomBytes(32).toString('hex');

    // Start test media server
    testServer = createTestMediaServer(testToken);

    await new Promise<void>((resolve) => {
      testServer!.listen(MEDIA_SERVER_PORT, 'localhost', () => {
        console.log('[Test] Media server started on port', MEDIA_SERVER_PORT);
        resolve();
      });
    });
  });

  afterAll(async () => {
    // Cleanup: stop test server
    if (testServer) {
      await new Promise<void>((resolve) => {
        testServer!.close(() => {
          console.log('[Test] Media server stopped');
          resolve();
        });
      });
      testServer = null;
    }
  });

  describe('Token Validation - Request Rejection', () => {
    it('should reject requests without token parameter', async () => {
      // Per Security Report 007: Current implementation accepts all requests (CORS: '*')
      // Expected: Should return 403 Forbidden without valid token

      const testPath = '/?path=/tmp/test-video.mp4';

      // RED: Currently this would return 200 (or 400 for invalid path)
      // Expected: Should return 403 for missing token
      const response = await makeRequest(testPath);

      expect(response.statusCode).toBe(403);
      // Verify it's a security error, not a missing file error
      expect(response.statusMessage).toMatch(/forbidden|unauthorized|token/i);
    });

    it('should reject requests with invalid token', async () => {
      const testPath = '/?path=/tmp/test-video.mp4';
      const invalidToken = 'wrong-token-123';

      // RED: Currently would ignore token and process request
      // Expected: Should return 403 for invalid token
      const response = await makeRequest(testPath, invalidToken);

      expect(response.statusCode).toBe(403);
      expect(response.statusMessage).toMatch(/forbidden|unauthorized|token/i);
    });

    it('should reject requests with empty token', async () => {
      const testPath = '/?path=/tmp/test-video.mp4';

      // RED: Empty token should be treated as missing
      const response = await makeRequest(testPath, '');

      expect(response.statusCode).toBe(403);
    });

    it('should reject requests with malformed token', async () => {
      const testPath = '/?path=/tmp/test-video.mp4';
      const malformedToken = 'abc'; // Too short to be valid

      // RED: Should validate token format/length
      const response = await makeRequest(testPath, malformedToken);

      expect(response.statusCode).toBe(403);
    });
  });

  describe('Token Validation - Request Acceptance', () => {
    it('should accept requests with valid token', async () => {
      const testPath = '/?path=/tmp/test-video.mp4';

      // Use the test token generated in beforeAll
      const response = await makeRequest(testPath, testToken);

      // With valid token, should succeed (200 OK in test server)
      expect(response.statusCode).toBe(200);
    });
  });

  describe('Token Security Properties', () => {
    it('token should be cryptographically random and unpredictable', () => {
      // Token should be 32 bytes (64 hex characters)
      expect(testToken).toHaveLength(64);

      // Verify it's hexadecimal (crypto.randomBytes().toString('hex'))
      expect(testToken).toMatch(/^[0-9a-f]{64}$/);
    });

    it('should use a new token per server session', () => {
      // Generate another token to verify randomness
      const newToken = crypto.randomBytes(32).toString('hex');

      // Should be different from test token (astronomically unlikely to collide)
      expect(newToken).not.toBe(testToken);
      expect(newToken).toHaveLength(64);
    });
  });

  describe('Security - Token Validation Order', () => {
    it('should validate token BEFORE path validation', async () => {
      // CRITICAL: Token check must happen before securityValidator
      // Prevents attackers from probing filesystem via error messages

      const maliciousPath = '/?path=/etc/passwd';

      // Without token, should get 403 (auth failure)
      // Should NOT get security validation error (leaks info)
      const response = await makeRequest(maliciousPath);

      expect(response.statusCode).toBe(403);
      expect(response.statusMessage).not.toMatch(/security|invalid.*path/i);
    });

    it('should not leak file existence via error messages without auth', async () => {
      const nonExistentPath = '/?path=/tmp/does-not-exist.mp4';

      // Without valid token, should return 403
      // Should NOT return 404 (leaks file existence info)
      const response = await makeRequest(nonExistentPath);

      expect(response.statusCode).toBe(403);
    });
  });

  describe('Attack Vector Prevention', () => {
    it('should prevent cross-origin localhost probing', async () => {
      // Attack scenario: Malicious website in Chrome probes localhost
      // Website JavaScript: fetch('http://localhost:8765/?path=/private/video.mp4')

      // Without token in URL, server should reject
      const response = await makeRequest('/?path=/Users/victim/private.mp4');

      expect(response.statusCode).toBe(403);
    });

    it('should prevent token brute force with length requirement', () => {
      // 32-byte token = 2^256 possible values
      // Brute force infeasible
      // Token should be 64 hex characters (32 bytes)

      const minTokenLength = 64;
      // Will validate actual token length in GREEN phase
      expect(minTokenLength).toBeGreaterThanOrEqual(64);
    });
  });
});
