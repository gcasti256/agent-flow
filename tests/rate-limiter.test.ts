import { describe, it, expect } from 'vitest';
import { RateLimiter } from '../src/utils/rate-limiter.js';

describe('RateLimiter', () => {
  it('should allow requests within limit', async () => {
    const limiter = new RateLimiter({ maxTokens: 5, refillRate: 1 });

    // Should allow 5 immediate requests
    for (let i = 0; i < 5; i++) {
      await limiter.acquire();
    }
    expect(limiter.available).toBe(0);
  });

  it('should report available tokens', () => {
    const limiter = new RateLimiter({ maxTokens: 10 });
    expect(limiter.available).toBe(10);
  });
});
