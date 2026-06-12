"use client";

import { unstable_catchError, type ErrorInfo } from "next/error";
import { AlertCircle } from "lucide-react";

// Component-level boundary so one malformed chart config degrades to an
// inline notice instead of taking down the whole analysis view
function ChartErrorFallback(
  props: { title: string },
  { error }: ErrorInfo
) {
  return (
    <div className="flex items-start gap-2.5 rounded-md border border-border bg-muted/40 px-4 py-3 h-[240px] items-center justify-center">
      <div className="flex flex-col items-center gap-2 text-center">
        <AlertCircle className="size-4 text-muted-foreground" />
        <p className="text-xs font-medium text-foreground">
          Couldn&apos;t render &ldquo;{props.title}&rdquo;
        </p>
        <p className="text-[11px] text-muted-foreground max-w-[280px]">
          {error.message}
        </p>
      </div>
    </div>
  );
}

export const ChartErrorBoundary = unstable_catchError(ChartErrorFallback);
