import { logger } from './logger.js';

export interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  retryIf?: (error: unknown) => boolean;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  retryIf: () => true,
};

/**
 * Retry an async operation with exponential backoff.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: unknown;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt >= opts.maxRetries || !opts.retryIf(error)) {
        throw error;
      }

      const delay = Math.min(
        opts.baseDelayMs * Math.pow(opts.backoffMultiplier, attempt),
        opts.maxDelayMs,
      );

      logger.warn(`Retry attempt ${attempt + 1}/${opts.maxRetries} after ${delay}ms`, {
        error: error instanceof Error ? error.message : String(error),
      });

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}
