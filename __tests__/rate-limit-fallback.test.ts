import { describe, it, expect, vi } from "vitest";

// Separate file from rate-limit.test.ts because this one needs Upstash to
// look configured (so getUpstash() returns a limiter) and then fail, to
// exercise the fallback path — the regression behind the production 500s.
vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://example.upstash.io");
vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "test-token");

vi.mock("@upstash/redis", () => ({
  Redis: class {},
}));

vi.mock("@upstash/ratelimit", () => {
  class Ratelimit {
    static slidingWindow() {
      return {};
    }
    async limit() {
      throw new TypeError("fetch failed");
    }
  }
  return { Ratelimit };
});

const { rateLimit } = await import("@/lib/rate-limit");

describe("rateLimit when Upstash is unreachable", () => {
  it("falls back to allowing the request instead of throwing", async () => {
    await expect(rateLimit("fallback-test-key")).resolves.toMatchObject({
      allowed: true,
    });
  });
});
