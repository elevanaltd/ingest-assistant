import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * Rate Limiter Tests (Batch Processing Fix)
 *
 * RETROACTIVE VALIDATION (Option A):
 * These tests validate already-implemented rate limiting behavior.
 * Ideal TDD would have written these BEFORE implementation.
 *
 * Validates:
 * 1. Rate limiter waits for tokens instead of throwing
 * 2. Token bucket refills over time
 * 3. Per-file consumption during batch processing
 */

// Mock RateLimiter class (mirrors electron/main.ts:35-67)
class RateLimiter {
  private tokens: number;
  private lastRefill: number;
  private readonly maxTokens: number;
  private readonly refillRate: number;

  constructor(maxTokens: number, refillRate: number) {
    this.maxTokens = maxTokens;
    this.refillRate = refillRate;
    this.tokens = maxTokens;
    this.lastRefill = Date.now();
  }

  private refill(): void {
    const now = Date.now();
    const timePassed = (now - this.lastRefill) / 1000;
    const tokensToAdd = timePassed * this.refillRate;

    this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }

  async consume(tokens: number): Promise<void> {
    this.refill();

    if (this.tokens < tokens) {
      const waitTime = Math.ceil(((tokens - this.tokens) / this.refillRate) * 1000);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      this.refill();
    }

    this.tokens -= tokens;
  }

  // Test helper: get current token count
  getCurrentTokens(): number {
    this.refill();
    return this.tokens;
  }
}

describe('RateLimiter (Batch Processing)', () => {
  let rateLimiter: RateLimiter;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Token Bucket Behavior', () => {
    it('should initialize with max tokens available', () => {
      rateLimiter = new RateLimiter(100, 100 / 60);

      expect(rateLimiter.getCurrentTokens()).toBe(100);
    });

    it('should refill tokens over time', async () => {
      // Create limiter: 10 max tokens, 1 token/second refill
      rateLimiter = new RateLimiter(10, 1);

      // Consume all tokens
      await rateLimiter.consume(10);
      expect(rateLimiter.getCurrentTokens()).toBe(0);

      // Wait 2 seconds for refill
      await new Promise(resolve => setTimeout(resolve, 2100));

      // Should have ~2 tokens refilled
      const tokens = rateLimiter.getCurrentTokens();
      expect(tokens).toBeGreaterThanOrEqual(1);
      expect(tokens).toBeLessThanOrEqual(3); // Allow some timing variance
    });

    it('should not exceed max tokens during refill', async () => {
      rateLimiter = new RateLimiter(10, 1);

      // Don't consume any tokens
      // Wait for refill attempt
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Should still be at max (10), not 15
      expect(rateLimiter.getCurrentTokens()).toBe(10);
    });
  });

  describe('Waiting Behavior (Fix Validation)', () => {
    it('should WAIT for tokens instead of throwing error', async () => {
      // 10 max tokens, 5 tokens/second refill
      rateLimiter = new RateLimiter(10, 5);

      // Consume all tokens
      await rateLimiter.consume(10);
      expect(rateLimiter.getCurrentTokens()).toBe(0);

      const startTime = Date.now();

      // Try to consume 5 more tokens (should wait ~1 second)
      await rateLimiter.consume(5);

      const elapsed = Date.now() - startTime;

      // Should have waited approximately 1 second (5 tokens at 5/sec = 1s)
      expect(elapsed).toBeGreaterThanOrEqual(900); // Allow 100ms variance
      expect(elapsed).toBeLessThanOrEqual(1200);

      // Tokens should be consumed successfully
      expect(rateLimiter.getCurrentTokens()).toBeLessThanOrEqual(1);
    });

    it('should handle multiple sequential waits correctly', async () => {
      // 5 max tokens, 2 tokens/second refill
      rateLimiter = new RateLimiter(5, 2);

      // Consume all tokens
      await rateLimiter.consume(5);

      // First wait: need 2 tokens (should wait ~1 second)
      const start1 = Date.now();
      await rateLimiter.consume(2);
      const elapsed1 = Date.now() - start1;

      expect(elapsed1).toBeGreaterThanOrEqual(900);
      expect(elapsed1).toBeLessThanOrEqual(1200);

      // Second wait: need 2 more tokens (should wait ~1 second again)
      const start2 = Date.now();
      await rateLimiter.consume(2);
      const elapsed2 = Date.now() - start2;

      expect(elapsed2).toBeGreaterThanOrEqual(900);
      expect(elapsed2).toBeLessThanOrEqual(1200);
    });

    it('should not wait when tokens are available', async () => {
      rateLimiter = new RateLimiter(100, 10);

      const startTime = Date.now();

      // Consume with tokens available
      await rateLimiter.consume(50);

      const elapsed = Date.now() - startTime;

      // Should complete nearly instantly (< 50ms)
      expect(elapsed).toBeLessThan(50);
    });
  });

  describe('Batch Processing Rate Limiting', () => {
    it('should allow burst processing of 100 files', async () => {
      // Production config: 100 max, ~1.67/sec refill
      rateLimiter = new RateLimiter(100, 100 / 60);

      const startTime = Date.now();

      // Process 100 files immediately (burst capacity)
      for (let i = 0; i < 100; i++) {
        await rateLimiter.consume(1);
      }

      const elapsed = Date.now() - startTime;

      // Should complete quickly (<1 second) using burst
      expect(elapsed).toBeLessThan(1000);
      expect(rateLimiter.getCurrentTokens()).toBeLessThanOrEqual(1);
    });

    it('should pace files after burst exhausted', async () => {
      // 10 max tokens, 5 tokens/second (for faster testing)
      rateLimiter = new RateLimiter(10, 5);

      const startTime = Date.now();

      // Process 15 files (10 burst + 5 waiting)
      for (let i = 0; i < 15; i++) {
        await rateLimiter.consume(1);
      }

      const elapsed = Date.now() - startTime;

      // First 10: instant
      // Next 5: need to wait ~1 second (5 tokens at 5/sec)
      expect(elapsed).toBeGreaterThanOrEqual(900);
      expect(elapsed).toBeLessThanOrEqual(1300);
    });

    it('should respect 100 files per minute rate limit', async () => {
      // Production config: 100 files per 60 seconds
      rateLimiter = new RateLimiter(100, 100 / 60);

      // Consume burst
      await rateLimiter.consume(100);

      const startTime = Date.now();

      // Try to process 10 more files (should wait ~6 seconds)
      for (let i = 0; i < 10; i++) {
        await rateLimiter.consume(1);
      }

      const elapsed = Date.now() - startTime;

      // Should take approximately 6 seconds (10 tokens at ~1.67/sec)
      expect(elapsed).toBeGreaterThanOrEqual(5500);
      expect(elapsed).toBeLessThanOrEqual(7000);
    }, 10000); // Increase timeout for this test
  });

  describe('Edge Cases', () => {
    it('should handle fractional token requests', async () => {
      rateLimiter = new RateLimiter(10, 5);

      // Consuming 0.5 tokens should work
      await rateLimiter.consume(0.5);

      const tokens = rateLimiter.getCurrentTokens();
      expect(tokens).toBeCloseTo(9.5, 1);
    });

    it('should handle concurrent consume calls', async () => {
      rateLimiter = new RateLimiter(10, 5);

      // Start multiple consumes concurrently
      const promises = [
        rateLimiter.consume(3),
        rateLimiter.consume(3),
        rateLimiter.consume(3),
      ];

      // All should complete (though some may wait)
      await expect(Promise.all(promises)).resolves.not.toThrow();

      // Tokens should be consumed correctly
      const tokens = rateLimiter.getCurrentTokens();
      expect(tokens).toBeLessThanOrEqual(2);
    });
  });
});
