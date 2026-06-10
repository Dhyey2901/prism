import { BarChart2, Lightbulb, TrendingUp } from "lucide-react";
import type { AnalysisResult, DatasetSummary } from "@/types";
import { ChartRenderer } from "@/components/charts/chart-renderer";

interface AnalysisViewProps {
  result: AnalysisResult;
  dataset: DatasetSummary;
}

const CHART_TYPE_LABEL: Record<string, string> = {
  bar: "Bar chart",
  line: "Line chart",
  pie: "Pie chart",
};

export function AnalysisView({ result, dataset }: AnalysisViewProps) {
  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Lightbulb className="size-4 text-primary shrink-0" />
        <p className="text-xs font-mono text-muted-foreground">
          AI analysis · {dataset.fileName} ·{" "}
          {dataset.rowCount.toLocaleString()} rows
        </p>
      </div>

      {/* Summary */}
      <div className="rounded-lg border border-primary/20 bg-primary/5 px-5 py-4">
        <p className="text-xs font-semibold text-primary mb-2 uppercase tracking-wider">
          Summary
        </p>
        <p className="text-sm text-foreground leading-relaxed">{result.summary}</p>
      </div>

      {/* Insights + Recommendations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Insights */}
        <div className="rounded-lg border border-border bg-card px-5 py-4 flex flex-col gap-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Key Insights
          </p>
          <ol className="flex flex-col gap-2.5">
            {result.insights.map((insight, i) => (
              <li key={i} className="flex gap-3 text-sm">
                <span className="shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-[11px] font-mono font-semibold flex items-center justify-center">
                  {i + 1}
                </span>
                <span className="text-foreground/90 leading-snug">{insight}</span>
              </li>
            ))}
          </ol>
        </div>

        {/* Recommendations */}
        <div className="rounded-lg border border-border bg-card px-5 py-4 flex flex-col gap-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Recommendations
          </p>
          <ol className="flex flex-col gap-2.5">
            {result.recommendations.map((rec, i) => (
              <li key={i} className="flex gap-3 text-sm">
                <span className="shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-[11px] font-mono font-semibold flex items-center justify-center">
                  {i + 1}
                </span>
                <span className="text-foreground/90 leading-snug">{rec}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>

      {/* Charts */}
      <div className="rounded-lg border border-border bg-card">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
          <BarChart2 className="size-4 text-muted-foreground" />
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Charts
          </p>
        </div>

        <div className="flex flex-col divide-y divide-border">
          {result.charts.map((chart, i) => (
            <div key={i} className="px-5 py-5 flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="size-3.5 text-primary shrink-0" />
                <p className="text-sm font-medium text-foreground">{chart.title}</p>
                <span className="ml-auto text-[10px] font-mono text-muted-foreground/50 shrink-0">
                  {CHART_TYPE_LABEL[chart.type] ?? chart.type}
                </span>
              </div>
              <ChartRenderer chart={chart} />
              <p className="text-xs text-muted-foreground leading-snug">
                {chart.insight}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
