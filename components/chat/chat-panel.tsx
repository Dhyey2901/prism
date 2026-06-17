"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { ChatMessage } from "@/types";

interface ChatPanelProps {
  analysisId: string;
}

export function ChatPanel({ analysisId }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`/api/analyses/${analysisId}/chat`)
      .then((r) => r.json())
      .then((data) => setMessages(data as ChatMessage[]))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [analysisId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  const sendMessage = async () => {
    const content = input.trim();
    if (!content || sending) return;

    setInput("");
    setSending(true);
    setMessages((prev) => [
      ...prev,
      { id: `temp-${Date.now()}`, role: "user", content, createdAt: new Date() },
    ]);

    try {
      const res = await fetch(`/api/analyses/${analysisId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: content }),
      });

      if (!res.ok || !res.body) throw new Error("Chat failed");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        setStreamingContent(accumulated);
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `temp-assistant-${Date.now()}`,
          role: "assistant",
          content: accumulated,
          createdAt: new Date(),
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `temp-err-${Date.now()}`,
          role: "assistant",
          content: "Something went wrong. Please try again.",
          createdAt: new Date(),
        },
      ]);
    } finally {
      setStreamingContent("");
      setSending(false);
    }
  };

  return (
    <div className="rounded-lg border border-border bg-card flex flex-col">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-border shrink-0">
        <MessageCircle className="size-4 text-muted-foreground" />
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Ask a follow-up
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 max-h-96 min-h-[120px] flex flex-col gap-3">
        {loading ? (
          <div className="space-y-3 py-2">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-8 w-1/2 ml-auto" />
          </div>
        ) : messages.length === 0 && !streamingContent ? (
          <div className="flex-1 flex items-center justify-center py-4">
            <p className="text-xs text-muted-foreground text-center">
              Ask a question about your data — e.g. &ldquo;Why did sales drop in Q3?&rdquo;
            </p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-lg px-3 py-2 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground rounded-tr-sm"
                      : "bg-muted text-foreground rounded-tl-sm"
                  }`}
                >
                  {msg.content}
                </div>
              </motion.div>
            ))}

            {streamingContent && (
              <motion.div
                key="streaming"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="flex justify-start"
              >
                <div className="max-w-[85%] rounded-lg rounded-tl-sm px-3 py-2 text-sm leading-relaxed bg-muted text-foreground">
                  {streamingContent}
                  <motion.span
                    animate={{ opacity: [1, 0] }}
                    transition={{ duration: 0.7, repeat: Infinity, ease: "easeInOut" }}
                    className="inline-block w-0.5 h-3.5 bg-foreground/70 ml-0.5 align-middle"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="flex items-center gap-2 px-4 py-3 border-t border-border">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
          disabled={sending || loading}
          placeholder="Ask about your data…"
          className="flex-1 text-sm bg-transparent outline-none placeholder:text-muted-foreground/50 disabled:opacity-50"
        />
        <Button
          size="icon"
          variant="ghost"
          onClick={sendMessage}
          disabled={!input.trim() || sending || loading}
          className="size-8 shrink-0"
        >
          <Send className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}
