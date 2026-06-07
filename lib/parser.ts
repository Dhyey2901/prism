import type { DatasetSummary } from "@/types";
import { buildSummary } from "./stats";

export async function parseFile(file: File): Promise<DatasetSummary> {
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext === "csv") return parseCSV(file);
  if (ext === "xlsx" || ext === "xls") return parseXLSX(file);
  throw new Error(
    `Unsupported file type: .${ext ?? "unknown"}. Upload a .csv, .xlsx, or .xls file.`
  );
}

async function parseCSV(file: File): Promise<DatasetSummary> {
  const Papa = (await import("papaparse")).default;

  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, unknown>>(file, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false,
      complete: (results) => {
        const fatal = results.errors.find(
          (e) => e.type === "Delimiter" || e.type === "FieldMismatch"
        );
        if (fatal) {
          reject(new Error(`CSV parse error: ${fatal.message}`));
          return;
        }
        try {
          resolve(buildSummary(results.data, file.name, file.size));
        } catch (e) {
          reject(e);
        }
      },
      error: (err) => reject(new Error(`CSV parse error: ${err.message}`)),
    });
  });
}

async function parseXLSX(file: File): Promise<DatasetSummary> {
  // exceljs — replaced xlsx due to CVE-2023-30533 / GHSA-4r6h-8v6p-xvw6
  const ExcelJS = (await import("exceljs")).default;

  const buffer = await file.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const worksheet = workbook.worksheets[0];
  if (!worksheet) throw new Error("No worksheets found in this file.");

  const headers: string[] = [];
  const rows: Record<string, unknown>[] = [];

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) {
      row.eachCell({ includeEmpty: false }, (cell) => {
        headers.push(String(cell.value ?? `Column ${headers.length + 1}`));
      });
    } else {
      const rowData: Record<string, unknown> = {};
      headers.forEach((header, idx) => {
        const cell = row.getCell(idx + 1);
        rowData[header] = cell.value ?? null;
      });
      rows.push(rowData);
    }
  });

  if (rows.length === 0) {
    throw new Error("No data rows found in the first worksheet.");
  }

  return buildSummary(rows, file.name, file.size);
}
