import { notFound } from "next/navigation";
import { BarChart2 } from "lucide-react";
import { getAnalysisById } from "@/lib/db";
import { AnalysisView } from "@/components/insights/analysis-view";

export default async function SharedAnalysisPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const analysis = await getAnalysisById(id);

  if (!analysis) notFound();

  return (
    <main className="min-h-screen flex flex-col">
      <header className="flex items-center justify-between px-4 sm:px-6 h-14 border-b border-border/50 shrink-0">
        <a
          href="/"
          className="text-sm font-semibold tracking-tight text-foreground hover:text-primary transition-colors"
        >
          Prism
        </a>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <BarChart2 className="size-3.5" />
          <span className="hidden sm:inline">Shared analysis</span>
        </div>
      </header>

      <div className="flex-1 flex flex-col px-4 sm:px-6 py-8 w-full max-w-4xl mx-auto gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-base font-semibold">{analysis.filename}</h1>
          <p className="text-xs text-muted-foreground">
            {analysis.rowCount.toLocaleString()} rows &middot;{" "}
            {analysis.columnCount} columns &middot; shared via Prism
          </p>
        </div>

        <AnalysisView
          result={analysis.result}
          dataset={{
            fileName: analysis.filename,
            fileSizeBytes: analysis.fileSizeBytes,
            rowCount: analysis.rowCount,
            columnCount: analysis.columnCount,
            columns: [],
            sampleRows: [],
          }}
        />

        <div className="flex justify-center pt-4 pb-8">
          <a
            href="/"
            className="text-xs text-muted-foreground hover:text-primary transition-colors underline underline-offset-4"
          >
            Analyse your own data with Prism
          </a>
        </div>
      </div>
    </main>
  );
}
