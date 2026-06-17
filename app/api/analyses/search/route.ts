import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { searchAnalyses } from "@/lib/db";
import { generateEmbedding } from "@/lib/embeddings";

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) {
    return NextResponse.json([], { status: 200 });
  }

  try {
    const embedding = await generateEmbedding(q);
    const results = await searchAnalyses(userId, embedding);
    return NextResponse.json(results);
  } catch (err) {
    console.error("[GET /api/analyses/search]", err);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
