"use client";

import { useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, RotateCcw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropZone } from "@/components/upload/drop-zone";
import { DataTable } from "@/components/preview/data-table";
import { StatsBar } from "@/components/preview/stats-bar";
import { parseFile } from "@/lib/parser";
import type { DatasetSummary } from "@/types";

type PageState =
  | { status: "idle" }
  | { status: "parsing" }
  | { status: "ready"; dataset: DatasetSummary }
  | { status: "error"; message: string };

export default function Home() {
  const [state, setState] = useState<PageState>({ status: "idle" });

  const handleFile = useCallback(async (file: File) => {
    setState({ status: "parsing" });
    try {
      const dataset = await parseFile(file);
      setState({ status: "ready", dataset });
    } catch (e) {
      setState({
        status: "error",
        message: e instanceof Error ? e.message : "Failed to parse file.",
      });
    }
  }, []);

  const reset = useCallback(() => setState({ status: "idle" }), []);

  const isUploadView = state.status !== "ready";

  return (
    <main className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 h-14 border-b border-border/50 shrink-0">
        <button
          onClick={reset}
          className="text-sm font-semibold tracking-tight text-foreground hover:text-primary transition-colors"
        >
          Prism
        </button>

        <AnimatePresence>
          {!isUploadView && (
            <motion.div
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              <Button
                variant="ghost"
                size="sm"
                onClick={reset}
                className="gap-1.5 h-8 text-xs text-muted-foreground hover:text-foreground"
              >
                <RotateCcw className="size-3" />
                Upload different file
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Body */}
      <AnimatePresence mode="wait">
        {isUploadView ? (
          <motion.div
            key="upload"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="flex-1 flex flex-col items-center justify-center px-6 py-16"
          >
            <div className="w-full max-w-md flex flex-col gap-6">
              <div className="text-center space-y-2">
                <h1 className="text-4xl font-semibold tracking-tight">Prism</h1>
                <p className="text-sm text-muted-foreground">
                  Upload a spreadsheet to get started
                </p>
              </div>

              <DropZone
                onFile={handleFile}
                isLoading={state.status === "parsing"}
                error={state.status === "error" ? state.message : null}
              />

              <p className="text-center text-[11px] font-mono text-muted-foreground/40 tracking-wider">
                No data stored&nbsp;&nbsp;·&nbsp;&nbsp;Processed in your browser
              </p>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="preview"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="flex-1 flex flex-col px-6 py-8 w-full max-w-6xl mx-auto gap-6"
          >
            <StatsBar dataset={state.dataset} />
            <DataTable dataset={state.dataset} />

            <div className="flex items-center justify-between">
              <p className="text-[11px] font-mono text-muted-foreground/40">
                {state.dataset.columnCount} columns ·{" "}
                {state.dataset.rowCount.toLocaleString()} rows parsed
              </p>
              <Button
                disabled
                size="sm"
                className="gap-2 h-9 px-4 text-sm font-medium"
              >
                <Sparkles className="size-3.5" />
                Analyze with AI
                <ArrowRight className="size-3.5" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
