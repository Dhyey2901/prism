import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { streamText } from "ai";
import { google } from "@ai-sdk/google";
import { getAnalysisById, getMessages, createMessage } from "@/lib/db";
import { buildChatSystemPrompt } from "@/lib/prompt";
import type { ModelMessage } from "ai";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: RouteContext) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    const analysis = await getAnalysisById(id);
    if (!analysis) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (analysis.userId !== userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const messages = await getMessages(id);
    return NextResponse.json(messages);
  } catch (err) {
    console.error("[GET /api/analyses/[id]/chat]", err);
    return NextResponse.json({ error: "Failed to load messages" }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: RouteContext) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    const analysis = await getAnalysisById(id);
    if (!analysis) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (analysis.userId !== userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = (await req.json()) as { message?: string };
    const userMessage = body.message?.trim();
    if (!userMessage) return NextResponse.json({ error: "Message required" }, { status: 400 });

    await createMessage(id, userId, "user", userMessage);

    const history = await getMessages(id);
    const aiMessages: ModelMessage[] = history.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const result = streamText({
      model: google("gemini-2.5-flash"),
      system: buildChatSystemPrompt(analysis.filename, analysis.result),
      messages: aiMessages,
      onFinish: async ({ text }) => {
        await createMessage(id, userId, "assistant", text);
      },
    });

    return result.toTextStreamResponse();
  } catch (err) {
    console.error("[POST /api/analyses/[id]/chat]", err);
    return NextResponse.json({ error: "Chat failed. Try again." }, { status: 500 });
  }
}
