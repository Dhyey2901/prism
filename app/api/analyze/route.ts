import { NextRequest, NextResponse } from "next/server";
import { generateText } from "ai";
import { google } from "@ai-sdk/google";
import { buildAnalysisPrompt } from "@/lib/prompt";
import {
  validateAnalysisResult,
  validateDatasetSummary,
} from "@/lib/validate";
import { rateLimit, getClientKey } from "@/lib/rate-limit";

// A real DatasetSummary (20 sample rows + column metadata) is a few KB.
// Anything near this cap means raw data is being sent — reject it.
const MAX_BODY_BYTES = 256 * 1024;

export async function POST(req: NextRequest) {
  const limit = rateLimit(getClientKey(req));
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
  try {
    dataset = validateDatasetSummary(JSON.parse(raw));
  } catch (e) {
    const message = e instanceof Error ? e.message : "Invalid request body";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    const prompt = buildAnalysisPrompt(dataset);

    const { text } = await generateText({
      model: google("gemini-2.0-flash"),
      prompt,
    });

    // Strip markdown code fences if Gemini wraps the JSON
    const json = text
      .replace(/^```(?:json)?\s*/m, "")
      .replace(/\s*```\s*$/m, "")
      .trim();

    const parsed: unknown = JSON.parse(json);
    const result = validateAnalysisResult(parsed);

    return NextResponse.json(result);
  } catch (e) {
    // Log the full error server-side; return a generic message so internal
    // details (provider errors, stack traces) never reach the client
    console.error("[/api/analyze]", e);
    const isParseError =
      e instanceof SyntaxError ||
      (e instanceof Error && e.message.includes("field"));
    return NextResponse.json(
      {
        error: isParseError
          ? "The AI returned an unexpected response shape. Try again."
          : "Analysis failed. Try again in a moment.",
      },
      { status: 502 }
    );
  }
}
