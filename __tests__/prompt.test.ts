import { describe, it, expect } from "vitest";
import { buildAnalysisPrompt } from "@/lib/prompt";
import type { DatasetSummary } from "@/types";

const dataset: DatasetSummary = {
  fileName: "sales.csv",
  rowCount: 500,
  columnCount: 3,
  fileSizeBytes: 20480,
  columns: [
    { name: "month", type: "date", nullCount: 0, uniqueCount: 12, sample: ["Jan 2024"] },
    { name: "revenue", type: "number", nullCount: 0, uniqueCount: 12, sample: [1000] },
    { name: "customers", type: "number", nullCount: 2, uniqueCount: 10, sample: [50] },
  ],
  sampleRows: [
    { month: "Jan 2024", revenue: 1000, customers: 50 },
    { month: "Feb 2024", revenue: 1200, customers: 60 },
  ],
};

describe("buildAnalysisPrompt", () => {
  it("includes the file name", () => {
    const prompt = buildAnalysisPrompt(dataset);
    expect(prompt).toContain("sales.csv");
  });

  it("includes row and column counts", () => {
    const prompt = buildAnalysisPrompt(dataset);
    expect(prompt).toContain("500");
    expect(prompt).toContain("3");
  });

  it("includes all column names", () => {
    const prompt = buildAnalysisPrompt(dataset);
    expect(prompt).toContain("month");
    expect(prompt).toContain("revenue");
    expect(prompt).toContain("customers");
  });

  it("includes sample row values", () => {
    const prompt = buildAnalysisPrompt(dataset);
    expect(prompt).toContain("Jan 2024");
    expect(prompt).toContain("1000");
  });

  it("includes null counts in column metadata", () => {
    const prompt = buildAnalysisPrompt(dataset);
    // customers column has nullCount of 2
    expect(prompt).toContain("2");
  });

  it("includes the JSON schema shape", () => {
    const prompt = buildAnalysisPrompt(dataset);
    expect(prompt).toContain('"summary"');
    expect(prompt).toContain('"insights"');
    expect(prompt).toContain('"charts"');
    expect(prompt).toContain('"recommendations"');
  });

  it("lists all valid chart types in the schema", () => {
    const prompt = buildAnalysisPrompt(dataset);
    expect(prompt).toContain("bar");
    expect(prompt).toContain("line");
    expect(prompt).toContain("pie");
    expect(prompt).toContain("area");
    expect(prompt).toContain("scatter");
  });

  it("injects focus text when provided", () => {
    const prompt = buildAnalysisPrompt(dataset, "churn trends");
    expect(prompt).toContain("churn trends");
  });

  it("does not mention focus when not provided", () => {
    const prompt = buildAnalysisPrompt(dataset);
    expect(prompt).not.toContain("Priority focus");
  });

  it("instructs the model to return raw JSON only", () => {
    const prompt = buildAnalysisPrompt(dataset);
    expect(prompt).toContain("ONLY a single valid JSON");
    expect(prompt).toContain("no markdown fences");
  });
});
