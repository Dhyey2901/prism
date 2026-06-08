"use client";

import { useCallback, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, FileSpreadsheet, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface DropZoneProps {
  onFile: (file: File) => void;
  isLoading: boolean;
  error: string | null;
  className?: string;
}

const ACCEPTED = [".csv", ".xlsx", ".xls"];
const MAX_MB = 10;

export function DropZone({ onFile, isLoading, error, className }: DropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (file: File) => {
      const ext = "." + (file.name.split(".").pop()?.toLowerCase() ?? "");
      if (!ACCEPTED.includes(ext)) return;
      if (file.size > MAX_MB * 1024 * 1024) return;
      onFile(file);
    },
    [onFile]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragging(false);
    }
  };

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  };

  return (
    <motion.div
      className={cn(
        "relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed",
        "min-h-[220px] px-8 py-12 cursor-pointer select-none transition-colors duration-200",
        isDragging
          ? "border-primary bg-primary/5"
          : error
          ? "border-destructive/40 bg-destructive/5"
          : "border-border bg-card hover:border-muted-foreground/30",
        isLoading && "pointer-events-none",
        className
      )}
      onClick={() => !isLoading && inputRef.current?.click()}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept={ACCEPTED.join(",")}
        onChange={onInputChange}
      />

      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="flex flex-col items-center gap-3"
          >
            <Loader2 className="size-7 text-primary animate-spin" />
            <p className="text-sm text-muted-foreground">Parsing file…</p>
          </motion.div>
        ) : error ? (
          <motion.div
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="flex flex-col items-center gap-3 text-center"
          >
            <div className="size-10 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertCircle className="size-5 text-destructive" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">
                Failed to parse file
              </p>
              <p className="text-xs text-muted-foreground max-w-[280px]">{error}</p>
            </div>
            <p className="text-[11px] font-mono text-muted-foreground/50 mt-1">
              Click to try again
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="flex flex-col items-center gap-4 text-center"
          >
            <motion.div
              animate={{ y: isDragging ? -4 : 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className={cn(
                "size-10 rounded-lg flex items-center justify-center transition-colors",
                isDragging ? "bg-primary/10" : "bg-muted"
              )}
            >
              {isDragging ? (
                <FileSpreadsheet className="size-5 text-primary" />
              ) : (
                <Upload className="size-5 text-muted-foreground" />
              )}
            </motion.div>

            <div className="space-y-1.5">
              <p className="text-sm font-medium text-foreground">
                {isDragging ? "Drop to upload" : "Drop your file here"}
              </p>
              <p className="text-xs text-muted-foreground">
                or{" "}
                <span className="text-primary underline underline-offset-2">
                  click to browse
                </span>
              </p>
            </div>

            <p className="text-[11px] font-mono text-muted-foreground/40 tracking-wider">
              CSV · XLSX · XLS&nbsp;&nbsp;·&nbsp;&nbsp;Max {MAX_MB}MB
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
