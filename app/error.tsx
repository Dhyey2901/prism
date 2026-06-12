"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-16">
      <div className="flex flex-col items-center gap-5 text-center max-w-sm">
        <div className="size-12 rounded-full bg-destructive/10 flex items-center justify-center">
          <AlertTriangle className="size-6 text-destructive" />
        </div>

        <div className="space-y-1.5">
          <h1 className="text-lg font-semibold tracking-tight">
            Something went wrong
          </h1>
          <p className="text-sm text-muted-foreground">
            An unexpected error occurred. Your data was processed locally and
            nothing was lost on a server.
          </p>
          {error.digest && (
            <p className="text-[11px] font-mono text-muted-foreground/40">
              Error ID: {error.digest}
            </p>
          )}
        </div>

        <Button
          size="sm"
          onClick={() => unstable_retry()}
          className="h-9 px-4 text-sm font-medium"
        >
          Try again
        </Button>
      </div>
    </main>
  );
}
