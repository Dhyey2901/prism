import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { createAnalysis, getAnalysesByUser } from "@/lib/db";
import { generateEmbedding, embeddingTextFromAnalysis } from "@/lib/embeddings";
import type { AnalysisResult, DatasetSummary } from "@/types";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const analyses = await getAnalysesByUser(userId);
  return NextResponse.json(analyses);
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { dataset: DatasetSummary; result: AnalysisResult };
  try {
    body = (await req.json()) as { dataset: DatasetSummary; result: AnalysisResult };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.dataset || !body.result) {
    return NextResponse.json({ error: "Missing dataset or result" }, { status: 400 });
  }

  try {
    let embedding: number[] | undefined;
    try {
      const text = embeddingTextFromAnalysis(
        body.dataset.fileName,
        body.result.summary,
        body.result.insights
      );
      embedding = await generateEmbedding(text);
    } catch {
      // embedding is best-effort — save without it if it fails
    }

    const analysis = await createAnalysis({
      userId,
      filename: body.dataset.fileName,
      fileSizeBytes: body.dataset.fileSizeBytes,
      rowCount: body.dataset.rowCount,
      columnCount: body.dataset.columnCount,
      result: body.result,
      embedding,
    });
    return NextResponse.json(analysis, { status: 201 });
  } catch (err) {
    console.error("[POST /api/analyses]", err);
    return NextResponse.json({ error: "Failed to save analysis" }, { status: 500 });
  }
}
