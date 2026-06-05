"use client";

import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="max-w-lg w-full flex flex-col items-center text-center gap-10"
      >
        {/* Status badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1, duration: 0.3, ease: "easeOut" }}
          className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5"
        >
          <span className="size-1.5 rounded-full bg-primary" />
          <span className="text-xs font-mono text-muted-foreground tracking-widest uppercase">
            Early Access
          </span>
        </motion.div>

        {/* Wordmark + tagline */}
        <div className="flex flex-col gap-4">
          <h1 className="text-6xl font-semibold tracking-tight text-foreground leading-none">
            Prism
          </h1>
          <p className="text-[15px] text-muted-foreground leading-relaxed max-w-xs mx-auto">
            Turn raw spreadsheets into insights, visualizations, and exportable
            reports — in seconds.
          </p>
        </div>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25, duration: 0.4, ease: "easeOut" }}
          className="flex items-center gap-3"
        >
          <Button size="lg" className="gap-2 h-10 px-5 text-sm font-medium">
            <Sparkles className="size-3.5" />
            Analyze a file
            <ArrowRight className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="lg"
            className="h-10 px-5 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            View demo
          </Button>
        </motion.div>

        {/* Trust line */}
        <p className="text-[11px] font-mono text-muted-foreground/40 tracking-wider">
          No data stored&nbsp;&nbsp;·&nbsp;&nbsp;Processed in your browser
        </p>
      </motion.div>
    </main>
  );
}
