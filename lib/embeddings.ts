import { embed } from "ai";
import { google } from "@ai-sdk/google";

export async function generateEmbedding(text: string): Promise<number[]> {
  const { embedding } = await embed({
    model: google.textEmbeddingModel("text-embedding-004"),
    value: text.slice(0, 2048),
  });
  return embedding;
}

export function embeddingTextFromAnalysis(
  filename: string,
  summary: string,
  insights: string[]
): string {
  return `${filename}: ${summary} ${insights.join(" ")}`;
}
