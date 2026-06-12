import type { ColumnMeta, ColumnType, DatasetSummary } from "@/types";

const DATE_PATTERNS = [
  /^\d{4}-\d{2}-\d{2}$/,                       // 2024-01-15
  /^\d{2}\/\d{2}\/\d{4}$/,                     // 01/15/2024
  /^\d{2}-\d{2}-\d{4}$/,                       // 01-15-2024
  /^[A-Za-z]{3}\s+\d{4}$/,                     // Jan 2024
  /^[A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4}$/,      // January 15, 2024
  /^Q[1-4]\s+\d{4}$/,                          // Q1 2024
];

export function inferColumnType(values: unknown[]): ColumnType {
  const nonNull = values.filter(
    (v) => v !== null && v !== undefined && String(v).trim() !== ""
  );
  if (nonNull.length === 0) return "unknown";

  const isNumber = nonNull.every((v) => {
    const str = String(v).trim().replace(/[,$%]/g, "");
    return str !== "" && !isNaN(Number(str));
  });
  if (isNumber) return "number";

  const isBoolean = nonNull.every((v) =>
    ["true", "false", "yes", "no", "1", "0"].includes(
      String(v).toLowerCase().trim()
    )
  );
  if (isBoolean) return "boolean";

  const isDate = nonNull.every((v) => {
    const str = String(v).trim();
    if (DATE_PATTERNS.some((p) => p.test(str))) return true;
    const d = new Date(str);
    return !isNaN(d.getTime()) && str.length > 4;
  });
  if (isDate) return "date";

  return "string";
}

export function buildSummary(
  rows: Record<string, unknown>[],
  fileName: string,
  fileSizeBytes: number
): DatasetSummary {
  if (rows.length === 0) {
    throw new Error("File is empty — no data rows found.");
  }

  // Real-world exports often have blank or whitespace-padded headers
  // (e.g. an unnamed index column) — normalise them so every column has
  // a usable, unique name. Values are still read via the original key.
  const usedNames = new Set<string>();
  const keyedColumns = Object.keys(rows[0]).map((key, i) => {
    let name = key.trim() !== "" ? key.trim() : `column_${i + 1}`;
    while (usedNames.has(name)) name = `${name}_${i + 1}`;
    usedNames.add(name);
    return { key, name };
  });

  const columns: ColumnMeta[] = keyedColumns.map(({ key, name }) => {
    const values = rows.map((r) => r[key] ?? null);
    const nonNull = values.filter(
      (v) => v !== null && v !== undefined && String(v).trim() !== ""
    );
    const nullCount = values.length - nonNull.length;
    const uniqueCount = new Set(nonNull.map(String)).size;
    const type = inferColumnType(values);

    const sample = nonNull.slice(0, 5).map((v): string | number | null => {
      if (type === "number") {
        const n = Number(String(v).replace(/[,$%]/g, ""));
        return isNaN(n) ? String(v) : n;
      }
      return String(v);
    });

    return { name, type, nullCount, uniqueCount, sample };
  });

  const sampleRows = rows.slice(0, 20).map((row) => {
    const result: Record<string, string | number | null> = {};
    keyedColumns.forEach(({ key, name }, i) => {
      const v = row[key];
      if (v === null || v === undefined || String(v).trim() === "") {
        result[name] = null;
      } else if (columns[i].type === "number") {
        const n = Number(String(v).replace(/[,$%]/g, ""));
        result[name] = isNaN(n) ? String(v) : n;
      } else {
        result[name] = String(v);
      }
    });
    return result;
  });

  return {
    rowCount: rows.length,
    columnCount: keyedColumns.length,
    columns,
    sampleRows,
    fileName,
    fileSizeBytes,
  };
}

export type { ColumnMeta };
