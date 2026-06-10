"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AnalysisResult, DatasetSummary } from "@/types";

interface ExportButtonProps {
  result: AnalysisResult;
  dataset: DatasetSummary;
}

export function ExportButton({ result, dataset }: ExportButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      // Dynamic import keeps @react-pdf/renderer out of the main bundle
      // and avoids SSR issues — it only loads when the button is clicked
      const [{ pdf }, { ReportDocument }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("./report-document"),
      ]);

      const generatedAt = new Date().toLocaleDateString("en-AU", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });

      const blob = await pdf(
        <ReportDocument
          result={result}
          dataset={dataset}
          generatedAt={generatedAt}
        />
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `prism-report-${dataset.fileName.replace(/\.[^.]+$/, "")}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={handleExport}
      disabled={loading}
      className="gap-2 h-9 px-4 text-sm font-medium"
    >
      {loading ? (
        <>
          <Loader2 className="size-3.5 animate-spin" />
          Generating…
        </>
      ) : (
        <>
          <Download className="size-3.5" />
          Export PDF
        </>
      )}
    </Button>
  );
}
