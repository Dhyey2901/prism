import { describe, it, expect, vi, beforeEach } from "vitest";

// Test only the in-memory fallback — Upstash is not available in CI.
// We do this by ensuring the env vars are absent so getUpstash() returns null.
vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");

// Import after stubbing env so the module initialises without Upstash
const { rateLimit, getClientKey } = await import("@/lib/rate-limit");

describe("getClientKey", () => {
  it("returns first IP from x-forwarded-for", () => {
    const req = new Request("http://localhost", {
      headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" },
    });
    expect(getClientKey(req)).toBe("1.2.3.4");
  });

  it("falls back to x-real-ip", () => {
    const req = new Request("http://localhost", {
      headers: { "x-real-ip": "9.9.9.9" },
    });
    expect(getClientKey(req)).toBe("9.9.9.9");
  });

  it("falls back to anonymous when no IP headers present", () => {
    const req = new Request("http://localhost");
    expect(getClientKey(req)).toBe("anonymous");
  });
});

describe("rateLimit (in-memory fallback)", () => {
  // Each test gets a unique key so the shared Map doesn't bleed between tests
  let key: string;
  beforeEach(() => {
    key = `test-${Math.random().toString(36).slice(2)}`;
  });

  it("allows the first request", async () => {
    const result = await rateLimit(key);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(9);
  });

  it("decrements remaining on each request", async () => {
    await rateLimit(key);
    await rateLimit(key);
    const result = await rateLimit(key);
    expect(result.remaining).toBe(7);
  });

  it("blocks after 10 requests", async () => {
    for (let i = 0; i < 10; i++) await rateLimit(key);
    const result = await rateLimit(key);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("treats different keys independently", async () => {
    const keyA = `a-${Math.random()}`;
    const keyB = `b-${Math.random()}`;
    for (let i = 0; i < 10; i++) await rateLimit(keyA);
    const result = await rateLimit(keyB);
    expect(result.allowed).toBe(true);
  });

  it("returns retryAfterSeconds of 0 when allowed", async () => {
    const result = await rateLimit(key);
    expect(result.retryAfterSeconds).toBe(0);
  });
});
