import { NextRequest, NextResponse } from "next/server";
import { generateText } from "ai";
import { google } from "@ai-sdk/google";
import { buildAnalysisPrompt } from "@/lib/prompt";
import { validateAnalysisResult } from "@/lib/validate";
import type { DatasetSummary } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const dataset = (await req.json()) as DatasetSummary;

    if (!dataset || typeof dataset !== "object" || !dataset.columns) {
      return NextResponse.json(
        { error: "Invalid request body — expected DatasetSummary" },
        { status: 400 }
      );
    }

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
    const message = e instanceof Error ? e.message : "Analysis failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
