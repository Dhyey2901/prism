// ─── Dataset ──────────────────────────────────────────────────────────────────

export type ColumnType = "string" | "number" | "date" | "boolean" | "unknown";

export interface ColumnMeta {
  name: string;
  type: ColumnType;
  nullCount: number;
  uniqueCount: number;
  sample: (string | number | null)[];
}

export interface DatasetSummary {
  rowCount: number;
  columnCount: number;
  columns: ColumnMeta[];
  sampleRows: Record<string, string | number | null>[];
  fileName: string;
  fileSizeBytes: number;
}

// ─── AI Analysis ──────────────────────────────────────────────────────────────

export type ChartType = "bar" | "line" | "pie";

export interface ChartConfig {
  type: ChartType;
  title: string;
  x_key: string;
  y_key: string;
  data: Record<string, string | number>[];
  insight: string;
}

export interface AnalysisResult {
  summary: string;
  insights: string[];
  charts: ChartConfig[];
  recommendations: string[];
}

// ─── Upload state machine ──────────────────────────────────────────────────────

export type UploadStatus =
  | "idle"
  | "parsing"
  | "ready"
  | "analyzing"
  | "done"
  | "error";

export interface UploadState {
  status: UploadStatus;
  file: File | null;
  dataset: DatasetSummary | null;
  result: AnalysisResult | null;
  error: string | null;
}
