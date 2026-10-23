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

function formatPct(n: number): string {
  return `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;
}

// Column names that plausibly represent a count to divide by (for "revenue
// per order"-style ratios). First match wins — order is priority order.
const DENOMINATOR_NAME_PATTERNS = [
  /orders?/i,
  /units?/i,
  /transactions?/i,
  /sessions?/i,
  /visits?/i,
  /customers?/i,
  /users?/i,
  /\bcount\b|\bqty\b|quantity/i,
];

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

  // Series per column, kept around for the cross-column ratio pass below.
  const seriesByName = new Map<string, { v: number; i: number }[]>();

  for (const { key, name } of numericCols) {
    const present = rows
      .map((r, i) => ({ v: toNumber(r[key]), i }))
      .filter((x): x is { v: number; i: number } => x.v !== null);

    if (present.length === 0) continue;
    seriesByName.set(name, present);

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

    if (present.length < 2) continue;

    // Start → end change, as both a percentage and the absolute values.
    const first = present[0];
    const last = present[present.length - 1];
    if (first.v !== 0) {
      const pctChange = ((last.v - first.v) / Math.abs(first.v)) * 100;
      metrics.push({
        label: `Change in ${name} (start to end)`,
        value: pctChange,
        formatted: `${formatPct(pctChange)} (${formatNumber(first.v)} → ${formatNumber(last.v)})`,
      });
    }

    // Period-over-period deltas — largest increase/decrease (with ties
    // surfaced, not just the first match), plus every declining period so
    // chart captions have no excuse to skip over a dip.
    const deltas: { delta: number; pct: number; i: number }[] = [];
    for (let k = 1; k < present.length; k++) {
      const prev = present[k - 1];
      const curr = present[k];
      if (curr.i !== prev.i + 1) continue; // only consecutive rows — no gaps
      const delta = curr.v - prev.v;
      const pct = prev.v !== 0 ? (delta / Math.abs(prev.v)) * 100 : NaN;
      deltas.push({ delta, pct, i: curr.i });
    }
    if (deltas.length === 0) continue;

    // Round off float dust so near-equal deltas register as true ties.
    const rounded = deltas.map((d) => ({ ...d, rd: Math.round(d.delta * 1e6) / 1e6 }));
    const maxDelta = Math.max(...rounded.map((d) => d.rd));
    const minDelta = Math.min(...rounded.map((d) => d.rd));

    const transitionsFor = (ds: typeof rounded) =>
      ds.map((d) => `${labelFor(d.i - 1)} → ${labelFor(d.i)}`).join("; ");

    if (maxDelta > 0) {
      const ties = rounded.filter((d) => d.rd === maxDelta);
      const pctStr = Number.isFinite(ties[0].pct) ? ` (${formatPct(ties[0].pct)})` : "";
      metrics.push({
        label: `Largest increase in ${name}`,
        value: maxDelta,
        formatted: `+${formatNumber(maxDelta)}${pctStr} (${transitionsFor(ties)})`,
      });
    }
    if (minDelta < 0) {
      const ties = rounded.filter((d) => d.rd === minDelta);
      const pctStr = Number.isFinite(ties[0].pct) ? ` (${formatPct(ties[0].pct)})` : "";
      metrics.push({
        label: `Largest decrease in ${name}`,
        value: minDelta,
        formatted: `${formatNumber(minDelta)}${pctStr} (${transitionsFor(ties)})`,
      });
    }

    const downPeriods = deltas.filter((d) => d.delta < 0);
    if (downPeriods.length > 0) {
      metrics.push({
        label: `Down periods in ${name}`,
        value: downPeriods.length,
        formatted: `${downPeriods.length} of ${deltas.length} period-over-period moves declined: ${downPeriods
          .map((d) => labelFor(d.i))
          .join(", ")}`,
      });
    }
  }

  // Ratio metrics — "X per Y" against the most plausible count-like column
  // (revenue per order, returns per order, etc.), bounded to a handful.
  let denominatorName: string | null = null;
  for (const pattern of DENOMINATOR_NAME_PATTERNS) {
    const match = numericCols.find((c) => pattern.test(c.name));
    if (match) {
      denominatorName = match.name;
      break;
    }
  }
  if (denominatorName) {
    const denomSeries = seriesByName.get(denominatorName);
    if (denomSeries) {
      const denomByIndex = new Map(denomSeries.map((p) => [p.i, p.v]));
      let ratiosAdded = 0;
      for (const { name } of numericCols) {
        if (name === denominatorName || ratiosAdded >= 4) continue;
        const series = seriesByName.get(name);
        if (!series) continue;

        let sumNumerator = 0;
        let sumDenominator = 0;
        for (const { v, i } of series) {
          const denom = denomByIndex.get(i);
          if (denom !== undefined && denom !== 0) {
            sumNumerator += v;
            sumDenominator += denom;
          }
        }
        if (sumDenominator > 0) {
          metrics.push({
            label: `${name} per ${denominatorName}`,
            value: sumNumerator / sumDenominator,
            formatted: formatNumber(sumNumerator / sumDenominator),
          });
          ratiosAdded++;
        }
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
