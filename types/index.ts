// ─── Dataset ──────────────────────────────────────────────────────────────────

export type ColumnType = "string" | "number" | "date" | "boolean" | "unknown";

export interface ColumnMeta {
  name: string;
  type: ColumnType;
  nullCount: number;
  uniqueCount: number;
  sample: (string | number | null)[];
}

// A fact computed deterministically in the browser from the FULL dataset
// (not just the capped sample) — totals, extremes, period-over-period
// changes. Sent to the AI as ground truth so it narrates numbers instead
// of computing them, and shown in the UI so the user can check the AI's
// claims against a number nothing hallucinated.
export interface KeyMetric {
  label: string;
  value: number;
  formatted: string;
}

export interface DatasetSummary {
  rowCount: number;
  columnCount: number;
  columns: ColumnMeta[];
  sampleRows: Record<string, string | number | null>[];
  keyMetrics: KeyMetric[];
  fileName: string;
  fileSizeBytes: number;
}

// ─── AI Analysis ──────────────────────────────────────────────────────────────

export type ChartType = "bar" | "line" | "pie" | "area" | "scatter";

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

// ─── Chat ─────────────────────────────────────────────────────────────────────

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: Date;
}

// ─── Saved Analysis (DB row) ──────────────────────────────────────────────────

export interface SavedAnalysis {
  id: string;
  userId: string;
  filename: string;
  fileSizeBytes: number;
  rowCount: number;
  columnCount: number;
  result: AnalysisResult;
  createdAt: Date;
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
