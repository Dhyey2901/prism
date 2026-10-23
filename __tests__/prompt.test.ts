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
  keyMetrics: [
    { label: "Total revenue", value: 2200, formatted: "2,200" },
    { label: "Largest increase in revenue", value: 200, formatted: "+200 (Jan 2024 → Feb 2024)" },
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

  it("includes computed key metrics as ground truth", () => {
    const prompt = buildAnalysisPrompt(dataset);
    expect(prompt).toContain("Computed facts");
    expect(prompt).toContain("Total revenue: 2,200");
    expect(prompt).toContain("Largest increase in revenue");
  });

  it("instructs the model to defer to computed facts over the sample", () => {
    const prompt = buildAnalysisPrompt(dataset);
    expect(prompt).toContain("do not calculate your own");
  });

  it("omits the facts section when there are no key metrics", () => {
    const prompt = buildAnalysisPrompt({ ...dataset, keyMetrics: [] });
    expect(prompt).not.toContain("Computed facts");
  });

  it("instructs the model to interpret facts rather than restate them", () => {
    const prompt = buildAnalysisPrompt(dataset);
    expect(prompt).toContain("Interpret the computed facts");
  });

  it("calls out down periods so chart captions can't skip the dip", () => {
    const withDip: DatasetSummary = {
      ...dataset,
      keyMetrics: [
        ...dataset.keyMetrics,
        { label: "Down periods in revenue", value: 1, formatted: "1 of 1 period-over-period moves declined: Feb 2024" },
      ],
    };
    const prompt = buildAnalysisPrompt(withDip);
    expect(prompt).toContain("revenue");
    expect(prompt).toContain("must have an insight that names at least one of its declines");
  });

  it("does not mention down periods when none exist", () => {
    const prompt = buildAnalysisPrompt(dataset);
    expect(prompt).not.toContain("must have an insight that names at least one of its declines");
  });

  it("forbids year-over-year language for a single-calendar-year dataset", () => {
    const withSpan: DatasetSummary = {
      ...dataset,
      keyMetrics: [
        ...dataset.keyMetrics,
        { label: "Time span", value: 1, formatted: "entirely within 2024 — a single calendar year" },
      ],
    };
    const prompt = buildAnalysisPrompt(withSpan);
    expect(prompt).toContain('never call a change "year-over-year" or "YoY"');
  });

  it("does not forbid year-over-year language when the dataset spans multiple years", () => {
    const withSpan: DatasetSummary = {
      ...dataset,
      keyMetrics: [
        ...dataset.keyMetrics,
        { label: "Time span", value: 2, formatted: "spans 2 calendar years (2023–2024)" },
      ],
    };
    const prompt = buildAnalysisPrompt(withSpan);
    expect(prompt).not.toContain('never call a change "year-over-year" or "YoY"');
  });

  it("tells the model to weigh a rising count against its rate when rate facts exist", () => {
    const withRate: DatasetSummary = {
      ...dataset,
      keyMetrics: [
        ...dataset.keyMetrics,
        { label: "Return rate", value: 0.028, formatted: "2.8%" },
      ],
    };
    const prompt = buildAnalysisPrompt(withRate);
    expect(prompt).toContain("is not automatically a problem");
  });

  it("does not mention rate-vs-count framing when there are no rate facts", () => {
    const prompt = buildAnalysisPrompt(dataset);
    expect(prompt).not.toContain("is not automatically a problem");
  });

  it("forbids stability language without a backing computed fact", () => {
    const prompt = buildAnalysisPrompt(dataset);
    expect(prompt).toContain('Only describe a metric as "stable"');
  });
});
