import type { ColumnMeta, ColumnType, DatasetSummary, KeyMetric } from "@/types";

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

function toNumber(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  if (s === "") return null;
  const n = Number(s.replace(/[,$%]/g, ""));
  return isNaN(n) ? null : n;
}

function formatNumber(n: number): string {
  return Number.isInteger(n)
    ? n.toLocaleString("en-US")
    : n.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

// Deterministic facts the model is instructed to use verbatim, computed
// from the FULL dataset (not the capped sample) before any rows are
// dropped — this is what keeps "biggest month" claims from being guessed.
function computeKeyMetrics(
  rows: Record<string, unknown>[],
  keyedColumns: { key: string; name: string }[],
  columns: ColumnMeta[]
): KeyMetric[] {
  const metrics: KeyMetric[] = [];

  const labelCol = keyedColumns.find(({ name }, i) => {
    void name;
    return columns[i].type !== "number" && columns[i].uniqueCount >= Math.min(rows.length, 2);
  });

  const labelFor = (i: number): string => {
    if (!labelCol) return `Row ${i + 1}`;
    const v = rows[i]?.[labelCol.key];
    return v === null || v === undefined || String(v).trim() === ""
      ? `Row ${i + 1}`
      : String(v).trim();
  };

  const numericCols = keyedColumns
    .map((kc, i) => ({ ...kc, col: columns[i] }))
    .filter((kc) => kc.col.type === "number")
    .slice(0, 6); // bound prompt size — more than 6 numeric columns is unusual

  for (const { key, name } of numericCols) {
    const present = rows
      .map((r, i) => ({ v: toNumber(r[key]), i }))
      .filter((x): x is { v: number; i: number } => x.v !== null);

    if (present.length === 0) continue;

    const total = present.reduce((sum, { v }) => sum + v, 0);
    const average = total / present.length;
    const maxEntry = present.reduce((a, b) => (b.v > a.v ? b : a));
    const minEntry = present.reduce((a, b) => (b.v < a.v ? b : a));

    metrics.push(
      { label: `Total ${name}`, value: total, formatted: formatNumber(total) },
      { label: `Average ${name}`, value: average, formatted: formatNumber(average) },
      {
        label: `Highest ${name}`,
        value: maxEntry.v,
        formatted: `${formatNumber(maxEntry.v)} (${labelFor(maxEntry.i)})`,
      },
      {
        label: `Lowest ${name}`,
        value: minEntry.v,
        formatted: `${formatNumber(minEntry.v)} (${labelFor(minEntry.i)})`,
      }
    );

    if (present.length > 1) {
      let maxIncrease: { delta: number; i: number } | null = null;
      let maxDecrease: { delta: number; i: number } | null = null;
      for (let k = 1; k < present.length; k++) {
        const prev = present[k - 1];
        const curr = present[k];
        if (curr.i !== prev.i + 1) continue; // only consecutive rows — no gaps
        const delta = curr.v - prev.v;
        if (maxIncrease === null || delta > maxIncrease.delta) maxIncrease = { delta, i: curr.i };
        if (maxDecrease === null || delta < maxDecrease.delta) maxDecrease = { delta, i: curr.i };
      }
      if (maxIncrease && maxIncrease.delta > 0) {
        metrics.push({
          label: `Largest increase in ${name}`,
          value: maxIncrease.delta,
          formatted: `+${formatNumber(maxIncrease.delta)} (${labelFor(maxIncrease.i - 1)} → ${labelFor(maxIncrease.i)})`,
        });
      }
      if (maxDecrease && maxDecrease.delta < 0) {
        metrics.push({
          label: `Largest decrease in ${name}`,
          value: maxDecrease.delta,
          formatted: `${formatNumber(maxDecrease.delta)} (${labelFor(maxDecrease.i - 1)} → ${labelFor(maxDecrease.i)})`,
        });
      }
    }
  }

  return metrics;
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

  const keyMetrics = computeKeyMetrics(rows, keyedColumns, columns);

  return {
    rowCount: rows.length,
    columnCount: keyedColumns.length,
    columns,
    sampleRows,
    keyMetrics,
    fileName,
    fileSizeBytes,
  };
}

export type { ColumnMeta };
