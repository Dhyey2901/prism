import type { DatasetSummary } from "@/types";

export async function parseFile(file: File): Promise<DatasetSummary> {
  const ext = file.name.split(".").pop()?.toLowerCase();

  if (ext === "csv") return parseCSV(file);
  if (ext === "xlsx" || ext === "xls") return parseXLSX(file);

  throw new Error(`Unsupported file type: .${ext ?? "unknown"}`);
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function parseCSV(_file: File): Promise<DatasetSummary> {
  // Stage 2
  throw new Error("Not implemented");
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function parseXLSX(_file: File): Promise<DatasetSummary> {
  // Stage 2
  throw new Error("Not implemented");
}
