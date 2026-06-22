import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

const WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const MAX_REQUESTS = 10;

// ── Upstash Redis (distributed — survives cold starts and multi-instance) ─────
let upstash: Ratelimit | null = null;

function getUpstash(): Ratelimit | null {
  if (upstash) return upstash;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  upstash = new Ratelimit({
    redis: new Redis({ url, token }),
    limiter: Ratelimit.slidingWindow(MAX_REQUESTS, "10 m"),
    prefix: "prism:rl",
  });
  return upstash;
}

// ── In-memory fallback (single-instance only — local dev without Upstash) ─────
const hits = new Map<string, number[]>();

function inMemoryRateLimit(key: string): RateLimitResult {
  const now = Date.now();
  const windowStart = now - WINDOW_MS;
  const timestamps = (hits.get(key) ?? []).filter((t) => t > windowStart);

  if (timestamps.length >= MAX_REQUESTS) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.ceil((timestamps[0] + WINDOW_MS - now) / 1000),
    };
  }

  timestamps.push(now);
  hits.set(key, timestamps);

  if (hits.size > 1000) {
    for (const [k, ts] of hits) {
      if (ts.every((t) => t <= windowStart)) hits.delete(k);
    }
  }

  return { allowed: true, remaining: MAX_REQUESTS - timestamps.length, retryAfterSeconds: 0 };
}

// ── Public API ─────────────────────────────────────────────────────────────────
export async function rateLimit(key: string): Promise<RateLimitResult> {
  const limiter = getUpstash();
  if (!limiter) return inMemoryRateLimit(key);

  const { success, remaining, reset } = await limiter.limit(key);
  return {
    allowed: success,
    remaining,
    retryAfterSeconds: success ? 0 : Math.ceil((reset - Date.now()) / 1000),
  };
}

export function getClientKey(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "anonymous";
}
