import db from '@/lib/db';

/**
 * Rate limiting that holds across serverless instances.
 *
 * On Amplify every request can land on a different Lambda, and each cold
 * start begins with empty memory, so a per-process counter lets an attacker
 * through `limit × instances` times. Counters therefore live in a shared
 * store:
 *
 *   - Upstash Redis over REST when UPSTASH_REDIS_REST_URL and
 *     UPSTASH_REDIS_REST_TOKEN are set (no SDK, one HTTP round trip);
 *   - otherwise the app's own Postgres, as one atomic upsert per check.
 *
 * If the store cannot be reached, the old per-instance counter is used so a
 * database hiccup degrades protection instead of locking everyone out.
 */

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSecs: number;
}

// ---------------------------------------------------------------- in-memory

interface Entry {
  count: number;
  windowStart: number;
}

const memory = new Map<string, Entry>();

function memoryLimit(identifier: string, limit: number, windowSecs: number): RateLimitResult {
  const now = Date.now();
  const windowMs = windowSecs * 1000;
  if (memory.size > 5000) {
    for (const [key, e] of memory) if (now - e.windowStart > windowMs) memory.delete(key);
  }
  const entry = memory.get(identifier);
  if (!entry || now - entry.windowStart > windowMs) {
    memory.set(identifier, { count: 1, windowStart: now });
    return { allowed: true, remaining: limit - 1, retryAfterSecs: 0 };
  }
  entry.count++;
  if (entry.count > limit) {
    return { allowed: false, remaining: 0, retryAfterSecs: Math.ceil((entry.windowStart + windowMs - now) / 1000) };
  }
  return { allowed: true, remaining: limit - entry.count, retryAfterSecs: 0 };
}

/** Per-instance only. Kept for callers that cannot await; prefer {@link rateLimit}. */
export function checkRateLimit(identifier: string, limit = 10, windowSecs = 900): RateLimitResult {
  return memoryLimit(identifier, limit, windowSecs);
}

// ------------------------------------------------------------------ Upstash

async function upstashLimit(url: string, token: string, key: string, limit: number, windowSecs: number): Promise<RateLimitResult> {
  const res = await fetch(`${url.replace(/\/$/, '')}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify([
      ['INCR', key],
      ['EXPIRE', key, String(windowSecs), 'NX'],
      ['TTL', key],
    ]),
    cache: 'no-store',
    signal: AbortSignal.timeout(1500),
  });
  if (!res.ok) throw new Error(`Upstash ${res.status}`);
  const [incr, , ttl] = (await res.json()) as { result: number }[];
  const count = Number(incr.result);
  return {
    allowed: count <= limit,
    remaining: Math.max(0, limit - count),
    retryAfterSecs: count <= limit ? 0 : Math.max(1, Number(ttl.result)),
  };
}

// ----------------------------------------------------------------- Postgres

let tableReady: Promise<void> | null = null;

function ensureTable(): Promise<void> {
  tableReady ??= (async () => {
    await db`
      CREATE TABLE IF NOT EXISTS rate_limits (
        key TEXT PRIMARY KEY,
        window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        count INTEGER NOT NULL DEFAULT 0
      )
    `;
    await db`CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON rate_limits (window_start)`;
  })().catch((err) => {
    tableReady = null;
    throw err;
  });
  return tableReady;
}

async function postgresLimit(key: string, limit: number, windowSecs: number): Promise<RateLimitResult> {
  await ensureTable();
  // One statement: start a new window if the old one has expired, otherwise
  // count this hit. Concurrent requests serialise on the row, so the count is exact.
  const [row] = await db`
    INSERT INTO rate_limits (key, window_start, count)
    VALUES (${key}, NOW(), 1)
    ON CONFLICT (key) DO UPDATE SET
      count = CASE WHEN rate_limits.window_start <= NOW() - make_interval(secs => ${windowSecs})
                   THEN 1 ELSE rate_limits.count + 1 END,
      window_start = CASE WHEN rate_limits.window_start <= NOW() - make_interval(secs => ${windowSecs})
                   THEN NOW() ELSE rate_limits.window_start END
    RETURNING count,
      GREATEST(0, CEIL(EXTRACT(EPOCH FROM (window_start + make_interval(secs => ${windowSecs}) - NOW()))))::int AS retry_after
  `;
  // Housekeeping on ~1% of checks keeps the table to live windows only.
  if (Math.random() < 0.01) {
    void db`DELETE FROM rate_limits WHERE window_start < NOW() - INTERVAL '1 day'`.catch(() => {});
  }
  const count = Number(row.count);
  return {
    allowed: count <= limit,
    remaining: Math.max(0, limit - count),
    retryAfterSecs: count <= limit ? 0 : Math.max(1, Number(row.retry_after)),
  };
}

// ------------------------------------------------------------------- public

/**
 * @param identifier  Unique key, e.g. `login:email:jane@x.co.za`
 * @param limit       Requests allowed per window
 * @param windowSecs  Window length in seconds
 */
export async function rateLimit(identifier: string, limit = 10, windowSecs = 900): Promise<RateLimitResult> {
  const key = identifier.slice(0, 200);
  try {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (url && token) return await upstashLimit(url, token, `rl:${key}`, limit, windowSecs);
    return await postgresLimit(key, limit, windowSecs);
  } catch (err) {
    console.error('rate limit store unavailable, using per-instance limit:', err);
    return memoryLimit(key, limit, windowSecs);
  }
}

/**
 * Best-effort client IP. Behind CloudFront the first X-Forwarded-For entry is
 * whatever the client sent, so an IP key alone can be dodged by rotating that
 * header — pair it with a key the client cannot choose (email, user id).
 */
export function clientIp(headers: Headers): string {
  return (
    headers.get('cloudfront-viewer-address')?.replace(/:\d+$/, '') ||
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    headers.get('x-real-ip') ||
    'unknown'
  );
}

/** Standard 429 body + Retry-After header for route handlers. */
export function tooManyRequests(retryAfterSecs: number, message = 'Too many attempts. Please try again later.') {
  return Response.json({ error: message }, { status: 429, headers: { 'Retry-After': String(retryAfterSecs) } });
}
