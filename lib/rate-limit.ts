// In-memory sliding-window rate limiter.
//
// Scope: per server instance. On Vercel, each serverless/edge instance has
// its own memory, so the effective global limit is (limit × instances).
// Good enough as an abuse brake for a demo app; swap for Upstash Redis
// (@upstash/ratelimit) if real distributed limiting is ever needed.

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

const WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const MAX_REQUESTS = 10; // per window per IP

const hits = new Map<string, number[]>();

export function rateLimit(key: string): RateLimitResult {
  const now = Date.now();
  const windowStart = now - WINDOW_MS;

  const timestamps = (hits.get(key) ?? []).filter((t) => t > windowStart);

  if (timestamps.length >= MAX_REQUESTS) {
    const oldestInWindow = timestamps[0];
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.ceil((oldestInWindow + WINDOW_MS - now) / 1000),
    };
  }

  timestamps.push(now);
  hits.set(key, timestamps);

  // Opportunistic cleanup so the map doesn't grow unbounded
  if (hits.size > 1000) {
    for (const [k, ts] of hits) {
      if (ts.every((t) => t <= windowStart)) hits.delete(k);
    }
  }

  return {
    allowed: true,
    remaining: MAX_REQUESTS - timestamps.length,
    retryAfterSeconds: 0,
  };
}

export function getClientKey(req: Request): string {
  // Vercel sets x-forwarded-for; first entry is the client
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "anonymous";
}
