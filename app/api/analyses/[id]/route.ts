import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getAnalysisById, deleteAnalysis } from "@/lib/db";

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const analysis = await getAnalysisById(id);
    if (!analysis) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (analysis.userId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json(analysis);
  } catch (err) {
    console.error("[GET /api/analyses/[id]]", err);
    return NextResponse.json({ error: "Failed to load analysis" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const analysis = await getAnalysisById(id);
    if (!analysis) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (analysis.userId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    await deleteAnalysis(id, userId);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error("[DELETE /api/analyses/[id]]", err);
    return NextResponse.json({ error: "Failed to delete analysis" }, { status: 500 });
  }
}
