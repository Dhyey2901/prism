import { Calculator } from "lucide-react";
import type { KeyMetric } from "@/types";

interface KeyMetricsProps {
  metrics: KeyMetric[];
}

export function KeyMetrics({ metrics }: KeyMetricsProps) {
  if (metrics.length === 0) return null;

  return (
    <div className="rounded-lg border border-border bg-card px-5 py-4 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Calculator className="size-3.5 text-muted-foreground shrink-0" />
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Computed facts
        </p>
        <span className="text-[10px] font-mono text-muted-foreground/50">
          calculated in code, not by the AI
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2.5">
        {metrics.map((m) => (
          <div key={m.label} className="flex flex-col gap-0.5 min-w-0">
            <span className="text-[11px] text-muted-foreground truncate">{m.label}</span>
            <span className="text-sm font-mono font-medium text-foreground truncate">
              {m.formatted}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
