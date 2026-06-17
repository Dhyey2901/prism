"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Clock, FileText, ChevronRight, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { SavedAnalysis } from "@/types";

interface HistoryPanelProps {
  open: boolean;
  onClose: () => void;
  onLoad: (analysis: SavedAnalysis) => void;
}

export function HistoryPanel({ open, onClose, onLoad }: HistoryPanelProps) {
  const [analyses, setAnalyses] = useState<SavedAnalysis[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SavedAnalysis[] | null>(null);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch("/api/analyses")
      .then((r) => r.json())
      .then((data) => setAnalyses(data as SavedAnalysis[]))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 2) {
      setSearchResults(null);
      return;
    }
    setSearching(true);
    debounceRef.current = setTimeout(() => {
      fetch(`/api/analyses/search?q=${encodeURIComponent(query.trim())}`)
        .then((r) => r.json())
        .then((data) => setSearchResults(data as SavedAnalysis[]))
        .catch(() => setSearchResults([]))
        .finally(() => setSearching(false));
    }, 350);
  }, [query]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/50"
            onClick={onClose}
          />
          <motion.div
            key="panel"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="fixed right-0 top-0 z-50 h-full w-80 border-l border-border bg-background flex flex-col"
          >
            <div className="flex items-center justify-between px-4 h-14 border-b border-border shrink-0">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Clock className="size-4 text-primary" />
                History
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                onClick={onClose}
              >
                <X className="size-4" />
              </Button>
            </div>

            <div className="px-3 py-2 border-b border-border shrink-0">
              <div className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-1.5">
                <Search className="size-3.5 text-muted-foreground shrink-0" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search analyses…"
                  className="flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground/50"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2">
              {loading || searching ? (
                <div className="space-y-2 p-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16 w-full rounded-md" />
                  ))}
                </div>
              ) : (() => {
                const list = searchResults ?? analyses;
                if (list.length === 0) {
                  return (
                    <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
                      <FileText className="size-8 opacity-30" />
                      <p className="text-sm">
                        {searchResults !== null ? "No matches found." : "No saved analyses yet."}
                      </p>
                      {searchResults === null && (
                        <p className="text-xs text-center px-6 leading-relaxed">
                          Run an analysis — it saves automatically.
                        </p>
                      )}
                    </div>
                  );
                }
                return (
                  <div className="space-y-1">
                    {searchResults !== null && (
                      <p className="text-[10px] font-mono text-muted-foreground/50 px-3 py-1">
                        {searchResults.length} result{searchResults.length !== 1 ? "s" : ""} for &ldquo;{query}&rdquo;
                      </p>
                    )}
                    {list.map((a) => (
                      <button
                        key={a.id}
                        onClick={() => {
                          onLoad(a);
                          onClose();
                        }}
                        className="w-full text-left rounded-md px-3 py-3 hover:bg-accent/50 transition-colors group"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">
                              {a.filename}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {a.rowCount.toLocaleString()} rows &middot;{" "}
                              {a.columnCount} cols
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(a.createdAt).toLocaleDateString("en-AU", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })}
                            </p>
                          </div>
                          <ChevronRight className="size-4 text-muted-foreground shrink-0 mt-0.5 group-hover:text-foreground transition-colors" />
                        </div>
                      </button>
                    ))}
                  </div>
                );
              })()}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
