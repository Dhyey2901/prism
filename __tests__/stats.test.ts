import { describe, it, expect } from "vitest";
import { inferColumnType, buildSummary } from "@/lib/stats";

// ── inferColumnType ───────────────────────────────────────────────────────────

describe("inferColumnType", () => {
  it("returns unknown for empty array", () => {
    expect(inferColumnType([])).toBe("unknown");
  });

  it("returns unknown for all-null values", () => {
    expect(inferColumnType([null, null, undefined, ""])).toBe("unknown");
  });

  it("detects numbers", () => {
    expect(inferColumnType([1, 2, 3])).toBe("number");
    expect(inferColumnType(["100", "200.5", "0"])).toBe("number");
  });

  it("detects numbers with currency/percent formatting", () => {
    expect(inferColumnType(["$1,000", "$2,500"])).toBe("number");
    expect(inferColumnType(["50%", "75%"])).toBe("number");
  });

  it("detects booleans", () => {
    expect(inferColumnType(["true", "false"])).toBe("boolean");
    expect(inferColumnType(["yes", "no"])).toBe("boolean");
    // "1"/"0" are valid numbers so the number check wins — boolean check
    // only applies to non-numeric values like "yes"/"no"/"true"/"false"
    expect(inferColumnType(["1", "0"])).toBe("number");
  });

  it("detects ISO dates", () => {
    expect(inferColumnType(["2024-01-15", "2024-02-20"])).toBe("date");
  });

  it("detects quarter dates", () => {
    expect(inferColumnType(["Q1 2024", "Q2 2024"])).toBe("date");
  });

  it("detects month-year dates", () => {
    expect(inferColumnType(["Jan 2024", "Feb 2024"])).toBe("date");
  });

  it("falls back to string for mixed values", () => {
    expect(inferColumnType(["apple", "123", "banana"])).toBe("string");
  });

  it("returns string for plain text", () => {
    expect(inferColumnType(["New York", "London", "Sydney"])).toBe("string");
  });
});

// ── buildSummary ──────────────────────────────────────────────────────────────

describe("buildSummary", () => {
  it("throws on empty rows", () => {
    expect(() => buildSummary([], "test.csv", 100)).toThrow(/empty/);
  });

  it("returns correct row and column counts", () => {
    const rows = [{ a: 1, b: "x" }, { a: 2, b: "y" }];
    const result = buildSummary(rows, "data.csv", 512);
    expect(result.rowCount).toBe(2);
    expect(result.columnCount).toBe(2);
    expect(result.fileName).toBe("data.csv");
    expect(result.fileSizeBytes).toBe(512);
  });

  it("caps sampleRows at 20", () => {
    const rows = Array.from({ length: 50 }, (_, i) => ({ val: i }));
    const result = buildSummary(rows, "big.csv", 1000);
    expect(result.sampleRows).toHaveLength(20);
    expect(result.rowCount).toBe(50);
  });

  it("computes nullCount correctly", () => {
    const rows = [{ a: 1 }, { a: null }, { a: "" }, { a: 3 }];
    const result = buildSummary(rows, "f.csv", 100);
    const col = result.columns[0];
    expect(col.nullCount).toBe(2);
  });

  it("computes uniqueCount correctly", () => {
    const rows = [{ city: "NYC" }, { city: "LA" }, { city: "NYC" }];
    const result = buildSummary(rows, "f.csv", 100);
    expect(result.columns[0].uniqueCount).toBe(2);
  });

  it("assigns a name to blank header columns", () => {
    const rows = [{ "": "value1" }, { "": "value2" }];
    const result = buildSummary(rows, "f.csv", 100);
    expect(result.columns[0].name).toBe("column_1");
  });

  it("converts numeric strings to numbers in sampleRows", () => {
    const rows = [{ revenue: "1000" }, { revenue: "2000" }];
    const result = buildSummary(rows, "f.csv", 100);
    expect(result.sampleRows[0].revenue).toBe(1000);
    expect(typeof result.sampleRows[0].revenue).toBe("number");
  });

  it("infers correct column types", () => {
    const rows = [
      { name: "Alice", age: 30, joined: "2024-01-01", active: "true" },
    ];
    const result = buildSummary(rows, "f.csv", 100);
    const types = Object.fromEntries(result.columns.map((c) => [c.name, c.type]));
    expect(types.name).toBe("string");
    expect(types.age).toBe("number");
    expect(types.joined).toBe("date");
    expect(types.active).toBe("boolean");
  });
});
