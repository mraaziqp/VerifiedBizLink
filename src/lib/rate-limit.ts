/**
 * In-memory sliding window rate limiter.
 * Works per-instance. For multi-instance deployments upgrade to
 * Upstash Redis (https://upstash.com) or a DB-backed solution.
 */

interface Entry {
  count: number;
  windowStart: number;
}

const store = new Map<string, Entry>();

// Clean stale entries every 10 minutes to prevent memory leaks
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store.entries()) {
      if (now - entry.windowStart > 15 * 60 * 1000) store.delete(key);
    }
  }, 10 * 60 * 1000);
}

/**
 * @param identifier  Unique key, e.g. `login:1.2.3.4`
 * @param limit       Max requests allowed in the window (default 10)
 * @param windowSecs  Window size in seconds (default 900 = 15 min)
 * @returns `{ allowed, remaining, retryAfterSecs }`
 */
export function checkRateLimit(
  identifier: string,
  limit = 10,
  windowSecs = 900,
): { allowed: boolean; remaining: number; retryAfterSecs: number } {
  const now = Date.now();
  const windowMs = windowSecs * 1000;
  const entry = store.get(identifier);

  if (!entry || now - entry.windowStart > windowMs) {
    store.set(identifier, { count: 1, windowStart: now });
    return { allowed: true, remaining: limit - 1, retryAfterSecs: 0 };
  }

  if (entry.count >= limit) {
    const retryAfterSecs = Math.ceil((entry.windowStart + windowMs - now) / 1000);
    return { allowed: false, remaining: 0, retryAfterSecs };
  }

  entry.count++;
  return { allowed: true, remaining: limit - entry.count, retryAfterSecs: 0 };
}
