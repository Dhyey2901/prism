import type { AnalysisResult, ChartConfig, ChartType } from "@/types";

function isString(v: unknown): v is string {
  return typeof v === "string";
}

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every(isString);
}

function isChartType(v: unknown): v is ChartType {
  return v === "bar" || v === "line" || v === "pie";
}

function validateChart(v: unknown, i: number): ChartConfig {
  if (typeof v !== "object" || v === null) {
    throw new Error(`charts[${i}] must be an object`);
  }
  const c = v as Record<string, unknown>;

  if (!isChartType(c.type)) {
    throw new Error(
      `charts[${i}].type must be "bar", "line", or "pie" — got "${String(c.type)}"`
    );
  }
  if (!isString(c.title)) throw new Error(`charts[${i}].title must be a string`);
  if (!isString(c.x_key)) throw new Error(`charts[${i}].x_key must be a string`);
  if (!isString(c.y_key)) throw new Error(`charts[${i}].y_key must be a string`);
  if (!isString(c.insight)) throw new Error(`charts[${i}].insight must be a string`);
  if (!Array.isArray(c.data)) throw new Error(`charts[${i}].data must be an array`);

  return {
    type: c.type,
    title: c.title,
    x_key: c.x_key,
    y_key: c.y_key,
    data: c.data as Record<string, string | number>[],
    insight: c.insight,
  };
}

export function validateAnalysisResult(v: unknown): AnalysisResult {
  if (typeof v !== "object" || v === null) {
    throw new Error("Claude response is not a JSON object");
  }
  const r = v as Record<string, unknown>;

  if (!isString(r.summary)) {
    throw new Error('Missing or invalid field "summary" (expected string)');
  }
  if (!isStringArray(r.insights)) {
    throw new Error('Missing or invalid field "insights" (expected string[])');
  }
  if (!Array.isArray(r.charts) || r.charts.length === 0) {
    throw new Error('Missing or invalid field "charts" (expected non-empty array)');
  }
  if (!isStringArray(r.recommendations)) {
    throw new Error('Missing or invalid field "recommendations" (expected string[])');
  }

  return {
    summary: r.summary,
    insights: r.insights,
    charts: r.charts.map((c, i) => validateChart(c, i)),
    recommendations: r.recommendations,
  };
}
