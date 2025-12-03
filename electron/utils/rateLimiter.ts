/**
 * Rate limiter interface for controlling token-based request throttling.
 */
export interface RateLimiterInterface {
  consume(tokens: number): Promise<void>;
}

/**
 * Token bucket rate limiter implementation.
 *
 * Allows bursts up to maxTokens, then refills at constant rate.
 * When tokens are exhausted, waits instead of throwing errors.
 *
 * @example
 * ```typescript
 * // 100 files per minute: bursts of 100, refills at ~1.67 files/sec
 * const limiter = new RateLimiter(100, 100 / 60);
 *
 * // Consume tokens (waits if insufficient)
 * await limiter.consume(5);
 * ```
 */
export class RateLimiter implements RateLimiterInterface {
  private tokens: number;
  private lastRefill: number;
  private readonly maxTokens: number;
  private readonly refillRate: number; // tokens per second

  constructor(maxTokens: number, refillRate: number) {
    this.maxTokens = maxTokens;
    this.refillRate = refillRate;
    this.tokens = maxTokens;
    this.lastRefill = Date.now();
  }

  private refill(): void {
    const now = Date.now();
    const timePassed = (now - this.lastRefill) / 1000; // seconds
    const tokensToAdd = timePassed * this.refillRate;

    this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }

  async consume(tokens: number): Promise<void> {
    this.refill();

    if (this.tokens < tokens) {
      // Wait for tokens to be available instead of throwing error
      const waitTime = Math.ceil(((tokens - this.tokens) / this.refillRate) * 1000);
      console.log(`[RateLimiter] Waiting ${waitTime}ms for ${tokens} token(s)...`);

      await new Promise(resolve => setTimeout(resolve, waitTime));

      // Refill after waiting
      this.refill();
    }

    this.tokens -= tokens;
  }
}
