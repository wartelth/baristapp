type BucketMap = Map<string, number[]>;

export interface RateLimitResult {
  allowed: boolean;
  retryAfterMs: number;
}

function pruneOld(now: number, windowMs: number, timestamps: number[]): number[] {
  return timestamps.filter((t) => now - t < windowMs);
}

export function checkSlidingWindowLimit(
  buckets: BucketMap,
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  const existing = buckets.get(key) ?? [];
  const recent = pruneOld(now, windowMs, existing);

  if (recent.length >= limit) {
    const oldest = recent[0] ?? now;
    const retryAfterMs = Math.max(0, windowMs - (now - oldest));
    buckets.set(key, recent);
    return { allowed: false, retryAfterMs };
  }

  recent.push(now);
  buckets.set(key, recent);
  return { allowed: true, retryAfterMs: 0 };
}

export function formatRetryAfterSeconds(ms: number): number {
  return Math.max(1, Math.ceil(ms / 1000));
}
