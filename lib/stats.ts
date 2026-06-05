import type { ColumnMeta, ColumnType, DatasetSummary } from "@/types";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function buildSummary(
  _rows: Record<string, unknown>[],
  _fileName: string,
  _fileSizeBytes: number
): DatasetSummary {
  // Stage 2
  throw new Error("Not implemented");
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function inferColumnType(_values: unknown[]): ColumnType {
  // Stage 2
  throw new Error("Not implemented");
}

// Exported so Stage 2 can use the type without importing from types directly
export type { ColumnMeta };
