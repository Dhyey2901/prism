import { NextRequest, NextResponse } from "next/server";
import { streamText } from "ai";
import { google } from "@ai-sdk/google";
import { buildAnalysisPrompt } from "@/lib/prompt";
import { validateDatasetSummary } from "@/lib/validate";
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
    const result = streamText({
      model: google("gemini-2.5-flash"),
      prompt,
    });
    return result.toTextStreamResponse();
  } catch (e) {
    console.error("[/api/analyze]", e);
    return NextResponse.json(
      { error: "Analysis failed. Try again in a moment." },
      { status: 502 }
    );
  }
}
