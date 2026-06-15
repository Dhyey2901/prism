"use client";

import { useState } from "react";
import { Link, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ShareButton({ id }: { id: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    const url = `${window.location.origin}/analysis/${id}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={copy}
      className="gap-2 h-9 px-4 text-sm"
    >
      {copied ? (
        <>
          <Check className="size-3.5 text-green-500" />
          Copied!
        </>
      ) : (
        <>
          <Link className="size-3.5" />
          Share
        </>
      )}
    </Button>
  );
}
