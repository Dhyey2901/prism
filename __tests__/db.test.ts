import { describe, it, expect, vi } from "vitest";

// db.ts calls neon(process.env.DATABASE_URL!) at module load — stub a
// value so importing the module doesn't require a real connection string.
vi.stubEnv("DATABASE_URL", "postgres://user:pass@localhost:5432/db");

const { isValidUuid } = await import("@/lib/db");

describe("isValidUuid", () => {
  it("accepts a well-formed UUID", () => {
    expect(isValidUuid("550e8400-e29b-41d4-a716-446655440000")).toBe(true);
  });

  it("is case-insensitive", () => {
    expect(isValidUuid("550E8400-E29B-41D4-A716-446655440000")).toBe(true);
  });

  it("rejects a plain string", () => {
    expect(isValidUuid("nonexistent-id-12345")).toBe(false);
  });

  it("rejects an empty string", () => {
    expect(isValidUuid("")).toBe(false);
  });

  it("rejects a UUID missing a segment", () => {
    expect(isValidUuid("550e8400-e29b-41d4-446655440000")).toBe(false);
  });

  it("rejects something that merely starts with a valid UUID", () => {
    expect(isValidUuid("550e8400-e29b-41d4-a716-446655440000; DROP TABLE analyses")).toBe(false);
  });
});
