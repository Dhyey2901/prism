import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { buildAnalysisPrompt } from "@/lib/prompt";
import { validateAnalysisResult } from "@/lib/validate";
import type { DatasetSummary } from "@/types";

const client = new Anthropic();

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

    const message = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 2048,
      thinking: { type: "adaptive" },
      messages: [{ role: "user", content: prompt }],
    });

    // Extract text blocks only — ignore thinking blocks
    const text = message.content
      .map((block) => {
        if (block.type === "text") return block.text;
        return "";
      })
      .join("")
      .trim();

    // Strip markdown code fences if Claude adds them despite the instruction
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
