"use client";

import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export function AnalysisSkeleton({ fileName }: { fileName: string }) {
  return (
    <div className="flex flex-col gap-6">
      {/* Status line */}
      <div className="flex items-center gap-2">
        <motion.div
          animate={{ opacity: [1, 0.4, 1] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        >
          <Sparkles className="size-4 text-primary shrink-0" />
        </motion.div>
        <p className="text-xs font-mono text-muted-foreground">
          Analyzing {fileName}…
        </p>
      </div>

      {/* Summary card */}
      <div className="rounded-lg border border-border bg-card px-5 py-4 space-y-2.5">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
      </div>

      {/* Insights + Recommendations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[0, 1].map((col) => (
          <div
            key={col}
            className="rounded-lg border border-border bg-card px-5 py-4 space-y-3"
          >
            <Skeleton className="h-3 w-24" />
            {[0, 1, 2].map((row) => (
              <div key={row} className="flex gap-3 items-start">
                <Skeleton className="size-5 rounded-full shrink-0" />
                <div className="flex-1 space-y-1.5 pt-0.5">
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="rounded-lg border border-border bg-card px-5 py-4 space-y-4">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-4 w-48" />
        <div className="flex items-end gap-3 h-40 pt-2">
          {[60, 85, 45, 100, 70, 90, 55].map((h, i) => (
            <Skeleton
              key={i}
              className="flex-1 rounded-t-md rounded-b-none"
              style={{ height: `${h}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
