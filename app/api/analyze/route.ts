import { NextResponse } from "next/server";

export const runtime = "edge";

export async function POST() {
  // Stage 3 — Claude API integration
  return NextResponse.json({ error: "Not implemented" }, { status: 501 });
}
