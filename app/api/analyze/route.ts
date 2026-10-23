import { NextRequest, NextResponse } from "next/server";
import { generateText } from "ai";
import { google } from "@ai-sdk/google";
import { buildAnalysisPrompt } from "@/lib/prompt";
import { validateDatasetSummary, validateAnalysisResult } from "@/lib/validate";
import { rateLimit, getClientKey } from "@/lib/rate-limit";

// A real DatasetSummary (20 sample rows + column metadata) is a few KB.
// Anything near this cap means raw data is being sent — reject it.
const MAX_BODY_BYTES = 256 * 1024;

// Gemini 3.x models spend part of maxOutputTokens on hidden "thinking"
// tokens before the visible answer — a low cap here was leaving too few
// tokens for a chart-heavy JSON response and truncating it mid-object,
// which is what the client's "AI returned an incomplete response" error
// was actually seeing (finishReason "length", not a malformed model).
const MAX_OUTPUT_TOKENS = 8192;
const THINKING_BUDGET = 1024;

// One retry on a truncated or malformed response — cheap insurance against
// the occasional MAX_TOKENS cutoff or non-JSON reply, without silently
// retrying forever on a real, persistent failure.
const MAX_ATTEMPTS = 2;

function stripFences(text: string): string {
  return text
    .replace(/^```(?:json)?\s*/m, "")
    .replace(/\s*```\s*$/m, "")
    .trim();
}

export async function POST(req: NextRequest) {
  const limit = await rateLimit(getClientKey(req));
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many requests — try again in a few minutes." },
      {
        status: 429,
        headers: { "Retry-After": String(limit.retryAfterSeconds) },
      }
    );
  }

  let raw: string;
  try {
    raw = await req.text();
  } catch {
    return NextResponse.json({ error: "Unreadable request body" }, { status: 400 });
  }

  if (raw.length > MAX_BODY_BYTES) {
    return NextResponse.json(
      { error: "Request body too large — send a dataset summary, not raw data." },
      { status: 413 }
    );
  }

  let dataset;
  let focusText: string | undefined;
  try {
    const body = JSON.parse(raw) as Record<string, unknown>;
    focusText =
      typeof body.focusText === "string" && body.focusText.trim()
        ? body.focusText.trim().slice(0, 500)
        : undefined;
    dataset = validateDatasetSummary(body);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Invalid request body";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const prompt = buildAnalysisPrompt(dataset, focusText);

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const { text, finishReason, usage } = await generateText({
        model: google("gemini-3.5-flash"),
        prompt,
        maxOutputTokens: MAX_OUTPUT_TOKENS,
        providerOptions: {
          google: { thinkingConfig: { thinkingBudget: THINKING_BUDGET } },
        },
      });

      if (finishReason !== "stop") {
        console.warn(
          `[/api/analyze] attempt ${attempt}/${MAX_ATTEMPTS} finished with reason "${finishReason}"`,
          { usage }
        );
      }

      // Validate before committing to this attempt — a truncated or
      // malformed response should trigger the retry below, not reach the
      // client as a stream it can't parse.
      const json = stripFences(text);
      validateAnalysisResult(JSON.parse(json));

      const encoder = new TextEncoder();
      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(encoder.encode(text));
          controller.close();
        },
      });
      return new Response(stream, {
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    } catch (e) {
      const level = attempt < MAX_ATTEMPTS ? console.warn : console.error;
      level(`[/api/analyze] attempt ${attempt}/${MAX_ATTEMPTS} failed`, e);
    }
  }

  return NextResponse.json(
    { error: "Analysis failed after retrying. Try again in a moment." },
    { status: 502 }
  );
}
