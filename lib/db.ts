import { neon } from "@neondatabase/serverless";
import type { AnalysisResult, ChatMessage, SavedAnalysis } from "@/types";

const sql = neon(process.env.DATABASE_URL!);

type DbRow = Record<string, unknown>;

function toSavedAnalysis(row: DbRow): SavedAnalysis {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    filename: row.filename as string,
    fileSizeBytes: row.file_size_bytes as number,
    rowCount: row.row_count as number,
    columnCount: row.column_count as number,
    result: row.result as AnalysisResult,
    createdAt: new Date(row.created_at as string),
  };
}

export async function createAnalysis(params: {
  userId: string;
  filename: string;
  fileSizeBytes: number;
  rowCount: number;
  columnCount: number;
  result: AnalysisResult;
  embedding?: number[];
}): Promise<SavedAnalysis> {
  const embeddingLiteral = params.embedding
    ? `[${params.embedding.join(",")}]`
    : null;

  const rows = await sql`
    INSERT INTO analyses (user_id, filename, file_size_bytes, row_count, column_count, result, embedding)
    VALUES (
      ${params.userId},
      ${params.filename},
      ${params.fileSizeBytes},
      ${params.rowCount},
      ${params.columnCount},
      ${JSON.stringify(params.result)},
      ${embeddingLiteral}::vector
    )
    RETURNING *
  `;
  return toSavedAnalysis(rows[0]);
}

export async function searchAnalyses(
  userId: string,
  embedding: number[]
): Promise<SavedAnalysis[]> {
  const embeddingLiteral = `[${embedding.join(",")}]`;
  const rows = await sql`
    SELECT *
    FROM analyses
    WHERE user_id = ${userId}
      AND embedding IS NOT NULL
    ORDER BY embedding <=> ${embeddingLiteral}::vector
    LIMIT 10
  `;
  return rows.map(toSavedAnalysis);
}

export async function getAnalysesByUser(userId: string): Promise<SavedAnalysis[]> {
  const rows = await sql`
    SELECT * FROM analyses
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
    LIMIT 50
  `;
  return rows.map(toSavedAnalysis);
}

export async function getAnalysisById(id: string): Promise<SavedAnalysis | null> {
  const rows = await sql`
    SELECT * FROM analyses
    WHERE id = ${id}
  `;
  return rows[0] ? toSavedAnalysis(rows[0]) : null;
}

export async function deleteAnalysis(id: string, userId: string): Promise<void> {
  await sql`
    DELETE FROM analyses
    WHERE id = ${id} AND user_id = ${userId}
  `;
}

// ─── Messages ─────────────────────────────────────────────────────────────────

function toChatMessage(row: DbRow): ChatMessage {
  return {
    id: row.id as string,
    role: row.role as "user" | "assistant",
    content: row.content as string,
    createdAt: new Date(row.created_at as string),
  };
}

export async function getMessages(analysisId: string): Promise<ChatMessage[]> {
  const rows = await sql`
    SELECT id, role, content, created_at
    FROM messages
    WHERE analysis_id = ${analysisId}
    ORDER BY created_at ASC
  `;
  return rows.map(toChatMessage);
}

export async function createMessage(
  analysisId: string,
  userId: string,
  role: "user" | "assistant",
  content: string
): Promise<ChatMessage> {
  const rows = await sql`
    INSERT INTO messages (analysis_id, user_id, role, content)
    VALUES (${analysisId}, ${userId}, ${role}, ${content})
    RETURNING id, role, content, created_at
  `;
  return toChatMessage(rows[0]);
}
