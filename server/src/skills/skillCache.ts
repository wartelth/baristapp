interface CacheEntry {
  data: unknown;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();

const MAX_ENTRIES = 1000;
const PRUNE_INTERVAL_MS = 60_000;

export function buildCacheKey(skillId: string, actionId: string, params: Record<string, unknown>): string {
  const sortedParams = Object.keys(params)
    .sort()
    .map((k) => `${k}=${JSON.stringify(params[k])}`)
    .join("&");
  return `${skillId}:${actionId}:${sortedParams}`;
}

export function getCached(key: string): unknown | undefined {
  const entry = cache.get(key);
  if (!entry) return undefined;

  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return undefined;
  }

  return entry.data;
}

export function setCached(key: string, data: unknown, ttlMs: number): void {
  if (cache.size >= MAX_ENTRIES) {
    pruneExpired();
    if (cache.size >= MAX_ENTRIES) {
      const oldest = cache.keys().next().value;
      if (oldest) cache.delete(oldest);
    }
  }

  cache.set(key, {
    data,
    expiresAt: Date.now() + ttlMs,
  });
}

function pruneExpired(): void {
  const now = Date.now();
  for (const [key, entry] of cache) {
    if (now > entry.expiresAt) cache.delete(key);
  }
}

setInterval(pruneExpired, PRUNE_INTERVAL_MS);

export function clearCache(): void {
  cache.clear();
}

export function cacheSize(): number {
  return cache.size;
}
