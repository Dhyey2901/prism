"use client";

import { useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  Sparkles,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropZone } from "@/components/upload/drop-zone";
import { DataTable } from "@/components/preview/data-table";
import { StatsBar } from "@/components/preview/stats-bar";
import { AnalysisView } from "@/components/insights/analysis-view";
import { AnalysisSkeleton } from "@/components/insights/analysis-skeleton";
import { ExportButton } from "@/components/export/export-button";
import { ShareButton } from "@/components/history/share-button";
import { ChatPanel } from "@/components/chat/chat-panel";
import { ThemeToggle } from "@/components/theme-toggle";
import { HistoryPanel } from "@/components/history/history-panel";
import { SignInButton, UserButton, useUser } from "@clerk/nextjs";
import { parseFile } from "@/lib/parser";
import type { AnalysisResult, DatasetSummary, SavedAnalysis } from "@/types";
import { validateAnalysisResult } from "@/lib/validate";

function extractPartialSummary(text: string): string {
  const complete = text.match(/"summary"\s*:\s*"((?:[^"\\]|\\.)*)"/);
  if (complete) return complete[1].replace(/\\n/g, "\n").replace(/\\"/g, '"');
  const partial = text.match(/"summary"\s*:\s*"((?:[^"\\]|\\.)*)/);
  if (partial) return partial[1].replace(/\\n/g, "\n").replace(/\\"/g, '"');
  return "";
}

type PageState =
  | { status: "idle" }
  | { status: "parsing" }
  | { status: "ready"; dataset: DatasetSummary; analyzeError?: string }
  | { status: "analyzing"; dataset: DatasetSummary }
  | { status: "streaming"; dataset: DatasetSummary; partialSummary: string }
  | { status: "done"; dataset: DatasetSummary; result: AnalysisResult; savedId?: string }
  | { status: "error"; message: string };

export default function Home() {
  const { isSignedIn } = useUser();
  const [state, setState] = useState<PageState>({ status: "idle" });
  const [historyOpen, setHistoryOpen] = useState(false);

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

  const handleAnalyze = useCallback(async () => {
    if (state.status !== "ready") return;
    const { dataset } = state;
    setState({ status: "analyzing", dataset });
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dataset),
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? `Server error ${res.status}`);
      }
      if (!res.body) throw new Error("No response body");

      setState({ status: "streaming", dataset, partialSummary: "" });

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        setState({
          status: "streaming",
          dataset,
          partialSummary: extractPartialSummary(accumulated),
        });
      }

      // Stream complete — strip any markdown fences Gemini may add, parse and validate
      const json = accumulated
        .replace(/^```(?:json)?\s*/m, "")
        .replace(/\s*```\s*$/m, "")
        .trim();
      const parsed: unknown = JSON.parse(json);
      const result = validateAnalysisResult(parsed);
      setState({ status: "done", dataset, result });

      if (isSignedIn) {
        fetch("/api/analyses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dataset, result }),
        })
          .then((r) => r.json())
          .then((saved: { id?: string }) => {
            if (saved.id) {
              setState((prev) =>
                prev.status === "done" ? { ...prev, savedId: saved.id } : prev
              );
            }
          })
          .catch(() => {});
      }
    } catch (e) {
      setState({
        status: "ready",
        dataset,
        analyzeError: e instanceof Error ? e.message : "Analysis failed.",
      });
    }
  }, [state, isSignedIn]);

  const backToPreview = useCallback(() => {
    if (state.status === "done") {
      setState({ status: "ready", dataset: state.dataset });
    }
  }, [state]);

  const loadDemo = useCallback(async () => {
    setState({ status: "parsing" });
    try {
      const res = await fetch("/sample.csv");
      if (!res.ok) throw new Error("Couldn't load the sample dataset.");
      const blob = await res.blob();
      const file = new File([blob], "sample.csv", { type: "text/csv" });
      const dataset = await parseFile(file);
      setState({ status: "ready", dataset });
    } catch (e) {
      setState({
        status: "error",
        message: e instanceof Error ? e.message : "Failed to load demo data.",
      });
    }
  }, []);

  const reset = useCallback(() => setState({ status: "idle" }), []);

  const handleLoadFromHistory = useCallback((analysis: SavedAnalysis) => {
    setState({
      status: "done",
      dataset: {
        fileName: analysis.filename,
        fileSizeBytes: analysis.fileSizeBytes,
        rowCount: analysis.rowCount,
        columnCount: analysis.columnCount,
        columns: [],
        sampleRows: [],
      },
      result: analysis.result,
    });
  }, []);

  const isUploadView =
    state.status === "idle" ||
    state.status === "parsing" ||
    state.status === "error";

  return (
    <main className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 sm:px-6 h-14 border-b border-border/50 shrink-0">
        <button
          onClick={reset}
          className="text-sm font-semibold tracking-tight text-foreground hover:text-primary transition-colors"
        >
          Prism
        </button>

        <div className="flex items-center gap-1">
          <AnimatePresence>
            {!isUploadView && (
              <motion.div
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="flex items-center gap-1"
              >
                {state.status === "done" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={backToPreview}
                    className="gap-1.5 h-8 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <ArrowLeft className="size-3" />
                    <span className="hidden sm:inline">Back to data</span>
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={reset}
                  className="gap-1.5 h-8 text-xs text-muted-foreground hover:text-foreground"
                >
                  <RotateCcw className="size-3" />
                  <span className="hidden sm:inline">Upload different file</span>
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
          <ThemeToggle />
          {isSignedIn && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setHistoryOpen(true)}
              className="gap-1.5 h-8 text-xs text-muted-foreground hover:text-foreground"
            >
              <Clock className="size-3" />
              <span className="hidden sm:inline">History</span>
            </Button>
          )}
          {isSignedIn ? (
            <UserButton />
          ) : (
            <SignInButton mode="modal">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs text-muted-foreground hover:text-foreground"
              >
                Sign in
              </Button>
            </SignInButton>
          )}
        </div>
      </header>

      {/* Body */}
      <AnimatePresence mode="wait">
        {isUploadView && (
          <motion.div
            key="upload"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-16"
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

              <div className="flex flex-col items-center gap-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={loadDemo}
                  disabled={state.status === "parsing"}
                  className="gap-1.5 h-8 text-xs text-muted-foreground hover:text-foreground"
                >
                  <Sparkles className="size-3" />
                  Try with sample data
                </Button>

                <p className="text-center text-[11px] font-mono text-muted-foreground/40 tracking-wider">
                  No data stored&nbsp;&nbsp;·&nbsp;&nbsp;Processed in your browser
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {state.status === "ready" && (
          <motion.div
            key="preview"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="flex-1 flex flex-col px-4 sm:px-6 py-8 w-full max-w-6xl mx-auto gap-6"
          >
            <StatsBar dataset={state.dataset} />
            <DataTable dataset={state.dataset} />

            {state.analyzeError && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="flex items-start gap-2.5 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3"
              >
                <AlertCircle className="size-4 text-destructive shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="text-sm font-medium text-foreground">
                    Analysis failed
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {state.analyzeError} — your data is still here, try again.
                  </p>
                </div>
              </motion.div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <p className="text-[11px] font-mono text-muted-foreground/40">
                {state.dataset.columnCount} columns ·{" "}
                {state.dataset.rowCount.toLocaleString()} rows parsed
              </p>
              <Button
                size="sm"
                onClick={handleAnalyze}
                className="gap-2 h-9 px-4 text-sm font-medium"
              >
                <Sparkles className="size-3.5" />
                {state.analyzeError ? "Retry analysis" : "Analyze with AI"}
                <ArrowRight className="size-3.5" />
              </Button>
            </div>
          </motion.div>
        )}

        {state.status === "analyzing" && (
          <motion.div
            key="analyzing"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="flex-1 flex flex-col px-4 sm:px-6 py-8 w-full max-w-4xl mx-auto"
          >
            <AnalysisSkeleton fileName={state.dataset.fileName} />
          </motion.div>
        )}

        {state.status === "streaming" && (
          <motion.div
            key="streaming"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="flex-1 flex flex-col px-4 sm:px-6 py-8 w-full max-w-4xl mx-auto"
          >
            <AnalysisSkeleton
              fileName={state.dataset.fileName}
              partialSummary={state.partialSummary}
            />
          </motion.div>
        )}

        {state.status === "done" && (
          <motion.div
            key="done"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="flex-1 flex flex-col px-4 sm:px-6 py-8 w-full max-w-4xl mx-auto gap-6"
          >
            <AnalysisView result={state.result} dataset={state.dataset} />
            {state.savedId && isSignedIn && (
              <ChatPanel analysisId={state.savedId} />
            )}
            <div className="flex justify-end gap-2 pb-4">
              {state.savedId && <ShareButton id={state.savedId} />}
              <ExportButton result={state.result} dataset={state.dataset} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <HistoryPanel
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        onLoad={handleLoadFromHistory}
      />
    </main>
  );
}
