import type {
  AnalysisResult,
  ChartConfig,
  ChartType,
  ColumnMeta,
  ColumnType,
  DatasetSummary,
} from "@/types";

// Server-side caps — a legitimate DatasetSummary is always small.
// Anything larger means raw data is being smuggled past Architecture Rule 1.
const MAX_SAMPLE_ROWS = 20;
const MAX_COLUMNS = 200;
const MAX_FILENAME_LENGTH = 255;

function isString(v: unknown): v is string {
  return typeof v === "string";
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function isColumnType(v: unknown): v is ColumnType {
  return (
    v === "string" ||
    v === "number" ||
    v === "date" ||
    v === "boolean" ||
    v === "unknown"
  );
}

function validateColumn(v: unknown, i: number): ColumnMeta {
  if (typeof v !== "object" || v === null) {
    throw new Error(`columns[${i}] must be an object`);
  }
  const c = v as Record<string, unknown>;

  if (!isString(c.name) || c.name.length === 0) {
    throw new Error(`columns[${i}].name must be a non-empty string`);
  }
  if (!isColumnType(c.type)) {
    throw new Error(`columns[${i}].type is not a valid column type`);
  }
  if (!isFiniteNumber(c.nullCount) || c.nullCount < 0) {
    throw new Error(`columns[${i}].nullCount must be a non-negative number`);
  }
  if (!isFiniteNumber(c.uniqueCount) || c.uniqueCount < 0) {
    throw new Error(`columns[${i}].uniqueCount must be a non-negative number`);
  }
  if (!Array.isArray(c.sample)) {
    throw new Error(`columns[${i}].sample must be an array`);
  }

  return {
    name: c.name,
    type: c.type,
    nullCount: c.nullCount,
    uniqueCount: c.uniqueCount,
    sample: c.sample as (string | number | null)[],
  };
}

export function validateDatasetSummary(v: unknown): DatasetSummary {
  if (typeof v !== "object" || v === null) {
    throw new Error("Request body must be a JSON object");
  }
  const d = v as Record<string, unknown>;

  if (!isFiniteNumber(d.rowCount) || d.rowCount < 0) {
    throw new Error('Missing or invalid field "rowCount"');
  }
  if (!isFiniteNumber(d.columnCount) || d.columnCount < 0) {
    throw new Error('Missing or invalid field "columnCount"');
  }
  if (!isString(d.fileName) || d.fileName.length === 0) {
    throw new Error('Missing or invalid field "fileName"');
  }
  if (d.fileName.length > MAX_FILENAME_LENGTH) {
    throw new Error(`"fileName" exceeds ${MAX_FILENAME_LENGTH} characters`);
  }
  if (!isFiniteNumber(d.fileSizeBytes) || d.fileSizeBytes < 0) {
    throw new Error('Missing or invalid field "fileSizeBytes"');
  }
  if (!Array.isArray(d.columns) || d.columns.length === 0) {
    throw new Error('Missing or invalid field "columns" (expected non-empty array)');
  }
  if (d.columns.length > MAX_COLUMNS) {
    throw new Error(`"columns" exceeds the maximum of ${MAX_COLUMNS}`);
  }
  if (!Array.isArray(d.sampleRows)) {
    throw new Error('Missing or invalid field "sampleRows" (expected array)');
  }
  if (d.sampleRows.length > MAX_SAMPLE_ROWS) {
    throw new Error(`"sampleRows" exceeds the maximum of ${MAX_SAMPLE_ROWS} rows`);
  }
  for (let i = 0; i < d.sampleRows.length; i++) {
    const row = d.sampleRows[i];
    if (typeof row !== "object" || row === null || Array.isArray(row)) {
      throw new Error(`sampleRows[${i}] must be an object`);
    }
  }

  return {
    rowCount: d.rowCount,
    columnCount: d.columnCount,
    columns: d.columns.map((c, i) => validateColumn(c, i)),
    sampleRows: d.sampleRows as Record<string, string | number | null>[],
    fileName: d.fileName,
    fileSizeBytes: d.fileSizeBytes,
  };
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
