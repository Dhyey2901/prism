import { describe, it, expect } from "vitest";
import { validateDatasetSummary, validateAnalysisResult } from "@/lib/validate";

// ── validateDatasetSummary ────────────────────────────────────────────────────

const validColumn = {
  name: "revenue",
  type: "number",
  nullCount: 0,
  uniqueCount: 12,
  sample: [100, 200],
};

const validSummary = {
  rowCount: 100,
  columnCount: 2,
  fileName: "sales.csv",
  fileSizeBytes: 1024,
  columns: [validColumn],
  sampleRows: [{ revenue: 100 }],
};

describe("validateDatasetSummary", () => {
  it("accepts a valid summary", () => {
    const result = validateDatasetSummary(validSummary);
    expect(result.rowCount).toBe(100);
    expect(result.fileName).toBe("sales.csv");
  });

  it("throws on non-object input", () => {
    expect(() => validateDatasetSummary("string")).toThrow();
    expect(() => validateDatasetSummary(null)).toThrow();
    expect(() => validateDatasetSummary(42)).toThrow();
  });

  it("throws when rowCount is missing or invalid", () => {
    expect(() => validateDatasetSummary({ ...validSummary, rowCount: -1 })).toThrow(/rowCount/);
    expect(() => validateDatasetSummary({ ...validSummary, rowCount: "100" })).toThrow(/rowCount/);
  });

  it("throws when fileName is empty string", () => {
    expect(() => validateDatasetSummary({ ...validSummary, fileName: "" })).toThrow(/fileName/);
  });

  it("throws when fileName exceeds 255 characters", () => {
    expect(() =>
      validateDatasetSummary({ ...validSummary, fileName: "a".repeat(256) })
    ).toThrow(/fileName/);
  });

  it("throws when columns array is empty", () => {
    expect(() => validateDatasetSummary({ ...validSummary, columns: [] })).toThrow(/columns/);
  });

  it("throws when sampleRows exceeds 20", () => {
    const rows = Array.from({ length: 21 }, () => ({ revenue: 1 }));
    expect(() => validateDatasetSummary({ ...validSummary, sampleRows: rows })).toThrow(/sampleRows/);
  });

  it("throws when a column has invalid type", () => {
    const bad = { ...validColumn, type: "currency" };
    expect(() =>
      validateDatasetSummary({ ...validSummary, columns: [bad] })
    ).toThrow(/type/);
  });

  it("throws when a column has negative nullCount", () => {
    const bad = { ...validColumn, nullCount: -1 };
    expect(() =>
      validateDatasetSummary({ ...validSummary, columns: [bad] })
    ).toThrow(/nullCount/);
  });
});

// ── validateAnalysisResult ────────────────────────────────────────────────────

const validChart = {
  type: "bar",
  title: "Revenue by Month",
  x_key: "month",
  y_key: "revenue",
  data: [{ month: "Jan", revenue: 100 }],
  insight: "Revenue peaked in Jan.",
};

const validResult = {
  summary: "Sales grew steadily.",
  insights: ["Revenue up 10%.", "Churn down 2%."],
  charts: [validChart],
  recommendations: ["Invest in Q1.", "Cut costs in Q3."],
};

describe("validateAnalysisResult", () => {
  it("accepts a valid result", () => {
    const result = validateAnalysisResult(validResult);
    expect(result.summary).toBe("Sales grew steadily.");
    expect(result.charts).toHaveLength(1);
  });

  it("throws when summary is missing", () => {
    const { summary: _, ...rest } = validResult;
    expect(() => validateAnalysisResult(rest)).toThrow(/summary/);
  });

  it("throws when insights is not an array of strings", () => {
    expect(() =>
      validateAnalysisResult({ ...validResult, insights: [1, 2] })
    ).toThrow(/insights/);
  });

  it("throws when charts array is empty", () => {
    expect(() => validateAnalysisResult({ ...validResult, charts: [] })).toThrow(/charts/);
  });

  it("throws when chart type is invalid", () => {
    const badChart = { ...validChart, type: "histogram" };
    expect(() =>
      validateAnalysisResult({ ...validResult, charts: [badChart] })
    ).toThrow(/histogram/);
  });

  it("accepts all valid chart types", () => {
    for (const type of ["bar", "line", "pie", "area", "scatter"]) {
      const result = validateAnalysisResult({
        ...validResult,
        charts: [{ ...validChart, type }],
      });
      expect(result.charts[0].type).toBe(type);
    }
  });

  it("throws when a chart is missing x_key", () => {
    const { x_key: _, ...badChart } = validChart;
    expect(() =>
      validateAnalysisResult({ ...validResult, charts: [badChart] })
    ).toThrow(/x_key/);
  });

  it("throws when recommendations is not a string array", () => {
    expect(() =>
      validateAnalysisResult({ ...validResult, recommendations: [42] })
    ).toThrow(/recommendations/);
  });
});
