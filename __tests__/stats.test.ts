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

// ── computeKeyMetrics (via buildSummary) ──────────────────────────────────────

describe("buildSummary key metrics", () => {
  const rows = [
    { month: "Jan", revenue: 100 },
    { month: "Feb", revenue: 90 },
    { month: "Mar", revenue: 130 },
  ];

  it("computes total, average, highest, and lowest", () => {
    const { keyMetrics } = buildSummary(rows, "f.csv", 100);
    const byLabel = Object.fromEntries(keyMetrics.map((m) => [m.label, m]));
    expect(byLabel["Total revenue"].value).toBe(320);
    expect(byLabel["Average revenue"].value).toBeCloseTo(106.67, 1);
    expect(byLabel["Highest revenue"].value).toBe(130);
    expect(byLabel["Highest revenue"].formatted).toContain("Mar");
    expect(byLabel["Lowest revenue"].value).toBe(90);
    expect(byLabel["Lowest revenue"].formatted).toContain("Feb");
  });

  it("finds the largest period-over-period increase and decrease", () => {
    const { keyMetrics } = buildSummary(rows, "f.csv", 100);
    const byLabel = Object.fromEntries(keyMetrics.map((m) => [m.label, m]));
    expect(byLabel["Largest increase in revenue"].value).toBe(40);
    expect(byLabel["Largest increase in revenue"].formatted).toContain("Feb");
    expect(byLabel["Largest increase in revenue"].formatted).toContain("Mar");
    expect(byLabel["Largest decrease in revenue"].value).toBe(-10);
  });

  it("uses the full dataset, not just the capped sample", () => {
    const bigRows = Array.from({ length: 50 }, (_, i) => ({
      idx: `Row ${i}`,
      val: i === 40 ? 10_000 : i, // the biggest value sits past row 20
    }));
    const { keyMetrics } = buildSummary(bigRows, "big.csv", 1000);
    const highest = keyMetrics.find((m) => m.label === "Highest val");
    expect(highest?.value).toBe(10_000);
  });

  it("returns no metrics for datasets with no numeric columns", () => {
    const { keyMetrics } = buildSummary(
      [{ city: "NYC" }, { city: "LA" }],
      "f.csv",
      100
    );
    expect(keyMetrics).toHaveLength(0);
  });

  it("computes start-to-end percentage change", () => {
    const { keyMetrics } = buildSummary(
      [{ month: "Jan", revenue: 100 }, { month: "Dec", revenue: 172 }],
      "f.csv",
      100
    );
    const change = keyMetrics.find((m) => m.label === "Change in revenue (start to end)");
    expect(change?.value).toBeCloseTo(72, 5);
    expect(change?.formatted).toContain("+72.0%");
  });

  it("includes a percentage alongside the largest increase and decrease", () => {
    const { keyMetrics } = buildSummary(rows, "f.csv", 100);
    const byLabel = Object.fromEntries(keyMetrics.map((m) => [m.label, m]));
    expect(byLabel["Largest increase in revenue"].formatted).toMatch(/%\)/);
    expect(byLabel["Largest decrease in revenue"].formatted).toMatch(/%\)/);
  });

  it("surfaces every tied period when the largest increase repeats", () => {
    const tiedRows = [
      { month: "Jan", revenue: 100 },
      { month: "Feb", revenue: 110 },
      { month: "Mar", revenue: 90 },
      { month: "Apr", revenue: 100 },
    ];
    const { keyMetrics } = buildSummary(tiedRows, "f.csv", 100);
    const increase = keyMetrics.find((m) => m.label === "Largest increase in revenue");
    expect(increase?.formatted).toContain("Jan → Feb");
    expect(increase?.formatted).toContain("Mar → Apr");
  });

  it("lists every declining period, not just the single largest drop", () => {
    const dippyRows = [
      { month: "Jan", revenue: 100 },
      { month: "Feb", revenue: 90 },
      { month: "Mar", revenue: 120 },
      { month: "Apr", revenue: 80 },
    ];
    const { keyMetrics } = buildSummary(dippyRows, "f.csv", 100);
    const down = keyMetrics.find((m) => m.label === "Down periods in revenue");
    expect(down?.value).toBe(2);
    expect(down?.formatted).toContain("Feb");
    expect(down?.formatted).toContain("Apr");
  });

  it("computes a ratio against a count-like denominator column", () => {
    const orderRows = [
      { month: "Jan", revenue: 1000, orders: 10 },
      { month: "Feb", revenue: 2200, orders: 20 },
    ];
    const { keyMetrics } = buildSummary(orderRows, "f.csv", 100);
    const perOrder = keyMetrics.find((m) => m.label === "revenue per orders");
    expect(perOrder?.value).toBeCloseTo(106.67, 1);
  });
});
