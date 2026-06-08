import { cn } from "@/lib/utils";
import type { ColumnMeta, DatasetSummary } from "@/types";

const TYPE_STYLE: Record<string, string> = {
  number:  "bg-sky-500/10 text-sky-400 border-sky-500/20",
  string:  "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
  date:    "bg-violet-500/10 text-violet-400 border-violet-500/20",
  boolean: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  unknown: "bg-zinc-500/10 text-zinc-500 border-zinc-500/20",
};

const TYPE_LABEL: Record<string, string> = {
  number: "num", string: "str", date: "date", boolean: "bool", unknown: "?",
};

function ColHeader({ col }: { col: ColumnMeta }) {
  return (
    <div className="flex flex-col gap-1.5 min-w-0">
      <span className="text-xs font-medium text-foreground truncate leading-none">
        {col.name}
      </span>
      <div className="flex items-center gap-1.5">
        <span
          className={cn(
            "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono border leading-none",
            TYPE_STYLE[col.type]
          )}
        >
          {TYPE_LABEL[col.type]}
        </span>
        {col.nullCount > 0 && (
          <span className="text-[10px] font-mono text-muted-foreground/40">
            {col.nullCount} null
          </span>
        )}
      </div>
    </div>
  );
}

interface DataTableProps {
  dataset: DatasetSummary;
  maxRows?: number;
}

export function DataTable({ dataset, maxRows = 20 }: DataTableProps) {
  const rows = dataset.sampleRows.slice(0, maxRows);
  const cols = dataset.columns;

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-card border-b border-border">
              <th className="w-10 px-3 py-3 text-right font-mono text-[10px] text-muted-foreground/30 font-normal">
                #
              </th>
              {cols.map((col) => (
                <th
                  key={col.name}
                  className="px-3 py-3 text-left align-top min-w-[120px] font-normal"
                >
                  <ColHeader col={col} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={i}
                className={cn(
                  "border-b border-border/40 last:border-0 transition-colors",
                  i % 2 === 0 ? "bg-background" : "bg-card/40",
                  "hover:bg-primary/5"
                )}
              >
                <td className="px-3 py-2.5 font-mono text-[10px] text-muted-foreground/25 text-right">
                  {i + 1}
                </td>
                {cols.map((col) => {
                  const val = row[col.name];
                  const isNull = val === null || val === undefined;
                  return (
                    <td
                      key={col.name}
                      className={cn(
                        "px-3 py-2.5 font-mono whitespace-nowrap",
                        isNull
                          ? "text-muted-foreground/25"
                          : col.type === "number"
                          ? "text-foreground tabular-nums text-right"
                          : "text-foreground"
                      )}
                    >
                      {isNull ? "—" : String(val)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {dataset.rowCount > maxRows && (
        <div className="px-4 py-2.5 bg-card border-t border-border">
          <p className="text-[11px] font-mono text-muted-foreground/40">
            Showing {maxRows} of {dataset.rowCount.toLocaleString()} rows
          </p>
        </div>
      )}
    </div>
  );
}
