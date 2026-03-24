/**
 * Token bucket rate limiter for API calls.
 */
export class RateLimiter {
  private tokens: number;
  private maxTokens: number;
  private refillRate: number; // tokens per second
  private lastRefill: number;
  private queue: Array<{ resolve: () => void }> = [];

  constructor(options: { maxTokens?: number; refillRate?: number } = {}) {
    this.maxTokens = options.maxTokens ?? 60;
    this.refillRate = options.refillRate ?? 1; // 1 token/second = 60/minute
    this.tokens = this.maxTokens;
    this.lastRefill = Date.now();
  }

  async acquire(): Promise<void> {
    this.refill();

    if (this.tokens >= 1) {
      this.tokens -= 1;
      return;
    }

    // Wait for a token
    return new Promise<void>((resolve) => {
      this.queue.push({ resolve });
      this.scheduleRefill();
    });
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    const newTokens = elapsed * this.refillRate;
    this.tokens = Math.min(this.maxTokens, this.tokens + newTokens);
    this.lastRefill = now;

    // Process queue
    while (this.queue.length > 0 && this.tokens >= 1) {
      this.tokens -= 1;
      const next = this.queue.shift();
      next?.resolve();
    }
  }

  private scheduleRefill(): void {
    const timeForToken = (1 / this.refillRate) * 1000;
    setTimeout(() => this.refill(), timeForToken);
  }

  get available(): number {
    this.refill();
    return Math.floor(this.tokens);
  }
}
