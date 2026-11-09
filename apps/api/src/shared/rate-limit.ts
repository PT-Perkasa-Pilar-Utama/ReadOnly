import type { ClockPort } from '../ports/clock';

export interface RateLimiter {
  consume(key: string): boolean;
  reset(key: string): void;
}

export interface InMemoryRateLimiterOptions {
  clock: ClockPort;
  maxAttempts: number;
  windowMs: number;
}

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

export class InMemoryRateLimiter implements RateLimiter {
  private readonly buckets = new Map<string, RateLimitBucket>();
  private readonly clock: ClockPort;
  private readonly maxAttempts: number;
  private readonly windowMs: number;

  constructor(options: InMemoryRateLimiterOptions) {
    this.clock = options.clock;
    this.maxAttempts = options.maxAttempts;
    this.windowMs = options.windowMs;
  }

  consume(key: string): boolean {
    const nowMs = this.clock.now().getTime();
    this.pruneExpired(nowMs);

    const existing = this.buckets.get(key);
    if (!existing || nowMs >= existing.resetAt) {
      this.buckets.set(key, {
        count: 1,
        resetAt: nowMs + this.windowMs,
      });
      return true;
    }

    if (existing.count >= this.maxAttempts) {
      return false;
    }

    existing.count += 1;
    return true;
  }

  reset(key: string): void {
    this.buckets.delete(key);
  }

  private pruneExpired(nowMs: number): void {
    if (this.buckets.size < 500) {
      return;
    }

    for (const [bucketKey, bucket] of this.buckets.entries()) {
      if (nowMs >= bucket.resetAt) {
        this.buckets.delete(bucketKey);
      }
    }
  }
}

export function extractClientIp(request: Request): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    const firstIp = forwardedFor.split(',')[0]?.trim();
    if (firstIp) {
      return firstIp;
    }
  }

  const realIp = request.headers.get('x-real-ip')?.trim();
  if (realIp) {
    return realIp;
  }

  return '127.0.0.1';
}

