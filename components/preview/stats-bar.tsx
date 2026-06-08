import { FileSpreadsheet } from "lucide-react";
import type { DatasetSummary } from "@/types";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface StatsBarProps {
  dataset: DatasetSummary;
}

export function StatsBar({ dataset }: StatsBarProps) {
  const meta = [
    `${dataset.rowCount.toLocaleString()} rows`,
    `${dataset.columnCount} columns`,
    formatBytes(dataset.fileSizeBytes),
  ];

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="flex items-center gap-2 min-w-0">
        <FileSpreadsheet className="size-3.5 text-muted-foreground shrink-0" />
        <span className="text-sm font-medium text-foreground truncate">
          {dataset.fileName}
        </span>
      </div>

      <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
        {meta.map((item, i) => (
          <span key={item} className="flex items-center gap-2">
            {i > 0 && <span className="text-muted-foreground/30">·</span>}
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
