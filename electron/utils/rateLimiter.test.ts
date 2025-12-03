import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RateLimiter } from './rateLimiter';

describe('RateLimiter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('should initialize with maxTokens available', () => {
    const limiter = new RateLimiter(100, 10);

    // Should not throw or wait since tokens are available
    expect(async () => {
      await limiter.consume(50);
    }).not.toThrow();
  });

  it('should decrement available tokens on consume', async () => {
    const limiter = new RateLimiter(100, 10);

    // First consume should succeed immediately
    await limiter.consume(30);

    // Second consume should also succeed (70 tokens remaining)
    await limiter.consume(40);

    // Third consume should wait (only 30 tokens remaining, need 40)
    const consumePromise = limiter.consume(40);

    // Advance time to allow refill (need 10 tokens at 10/sec = 1 second)
    await vi.advanceTimersByTimeAsync(1100); // 1.1 seconds

    await consumePromise;
  });

  it('should wait for tokens when exhausted', async () => {
    const limiter = new RateLimiter(100, 10); // 10 tokens per second

    // Exhaust all tokens
    await limiter.consume(100);

    // Request more tokens (should wait)
    const startTime = Date.now();
    const consumePromise = limiter.consume(20);

    // Advance time to allow refill (20 tokens at 10/sec = 2 seconds)
    await vi.advanceTimersByTimeAsync(2100);

    await consumePromise;
    const endTime = Date.now();

    // Should have waited approximately 2 seconds
    expect(endTime - startTime).toBeGreaterThanOrEqual(2000);
  });

  it('should refill tokens over time at specified rate', async () => {
    const limiter = new RateLimiter(100, 10); // 10 tokens per second

    // Consume 80 tokens
    await limiter.consume(80);

    // Advance time by 5 seconds (should refill 50 tokens)
    await vi.advanceTimersByTimeAsync(5000);

    // Should be able to consume 70 tokens (20 + 50 refilled)
    await limiter.consume(70);
  });

  it('should not exceed maxTokens when refilling', async () => {
    const limiter = new RateLimiter(100, 10);

    // Wait 20 seconds (would refill 200 tokens if no cap)
    await vi.advanceTimersByTimeAsync(20000);

    // Should only be able to consume maxTokens (100)
    await limiter.consume(100);

    // Next consume should wait
    const consumePromise = limiter.consume(10);
    await vi.advanceTimersByTimeAsync(1100);
    await consumePromise;
  });

  it('should handle concurrent consume calls correctly', async () => {
    const limiter = new RateLimiter(100, 10);

    // Start multiple concurrent consumes
    const promises = [
      limiter.consume(30),
      limiter.consume(40),
      limiter.consume(50)
    ];

    // First two should succeed immediately, third should wait
    await vi.advanceTimersByTimeAsync(100);
    await Promise.all(promises.slice(0, 2));

    // Advance time for third consume
    await vi.advanceTimersByTimeAsync(2000);
    await promises[2];
  });

  it('should calculate wait time correctly based on token deficit', async () => {
    const limiter = new RateLimiter(100, 10); // 10 tokens/sec

    // Consume all tokens
    await limiter.consume(100);

    // Request 50 tokens (need 5 seconds at 10/sec)
    const consoleSpy = vi.spyOn(console, 'log');
    const consumePromise = limiter.consume(50);

    // Check that wait time was logged correctly
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Waiting 5000ms for 50 token(s)')
    );

    await vi.advanceTimersByTimeAsync(5100);
    await consumePromise;
  });
});
