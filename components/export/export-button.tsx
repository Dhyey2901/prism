"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AnalysisResult, DatasetSummary } from "@/types";

interface ExportButtonProps {
  result: AnalysisResult;
  dataset: DatasetSummary;
}

async function captureChartImages(): Promise<string[]> {
  const containers = Array.from(
    document.querySelectorAll<HTMLElement>("[data-chart-index]")
  );
  return Promise.all(
    containers.map(async (container) => {
      const svg = container.querySelector("svg");
      if (!svg) return "";
      const bbox = svg.getBoundingClientRect();
      const w = Math.round(bbox.width);
      const h = Math.round(bbox.height);
      if (!w || !h) return "";

      const clone = svg.cloneNode(true) as SVGSVGElement;
      clone.setAttribute("width", String(w));
      clone.setAttribute("height", String(h));
      clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
      const bg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      bg.setAttribute("width", "100%");
      bg.setAttribute("height", "100%");
      bg.setAttribute("fill", "#f4f4f5");
      clone.insertBefore(bg, clone.firstChild);

      const svgStr = new XMLSerializer().serializeToString(clone);
      const svgBlob = new Blob([svgStr], { type: "image/svg+xml;charset=utf-8" });
      const svgUrl = URL.createObjectURL(svgBlob);

      return new Promise<string>((resolve) => {
        const img = new Image(w, h);
        img.onload = () => {
          const scale = 2;
          const canvas = document.createElement("canvas");
          canvas.width = w * scale;
          canvas.height = h * scale;
          const ctx = canvas.getContext("2d")!;
          ctx.scale(scale, scale);
          ctx.fillStyle = "#f4f4f5";
          ctx.fillRect(0, 0, w, h);
          ctx.drawImage(img, 0, 0, w, h);
          URL.revokeObjectURL(svgUrl);
          resolve(canvas.toDataURL("image/png"));
        };
        img.onerror = () => {
          URL.revokeObjectURL(svgUrl);
          resolve("");
        };
        img.src = svgUrl;
      });
    })
  );
}

export function ExportButton({ result, dataset }: ExportButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      // Dynamic import keeps @react-pdf/renderer out of the main bundle
      // and avoids SSR issues — it only loads when the button is clicked
      const [{ pdf }, { ReportDocument }, chartImages] = await Promise.all([
        import("@react-pdf/renderer"),
        import("./report-document"),
        captureChartImages(),
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
          chartImages={chartImages}
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
