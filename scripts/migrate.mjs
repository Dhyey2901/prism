import { neon } from "@neondatabase/serverless";
import { readFileSync } from "fs";

// Load .env.local so this script works without global env vars
try {
  const env = readFileSync(".env.local", "utf8");
  for (const line of env.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
} catch {
  // .env.local not present — rely on environment variables already set
}

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set. Run: vercel env pull .env.local");
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);

await sql`
  CREATE TABLE IF NOT EXISTS analyses (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         TEXT        NOT NULL,
    filename        TEXT        NOT NULL,
    file_size_bytes INTEGER     NOT NULL,
    row_count       INTEGER     NOT NULL,
    column_count    INTEGER     NOT NULL,
    result          JSONB       NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`;

await sql`
  CREATE INDEX IF NOT EXISTS analyses_user_id_idx
  ON analyses (user_id)
`;

await sql`
  CREATE INDEX IF NOT EXISTS analyses_created_at_idx
  ON analyses (created_at DESC)
`;

await sql`
  CREATE TABLE IF NOT EXISTS messages (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    analysis_id UUID        NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
    user_id     TEXT        NOT NULL,
    role        TEXT        NOT NULL CHECK (role IN ('user', 'assistant')),
    content     TEXT        NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`;

await sql`
  CREATE INDEX IF NOT EXISTS messages_analysis_id_idx
  ON messages (analysis_id, created_at ASC)
`;

// ── pgvector semantic search ──────────────────────────────────────────────────
await sql`CREATE EXTENSION IF NOT EXISTS vector`;

await sql`
  ALTER TABLE analyses
  ADD COLUMN IF NOT EXISTS embedding vector(768)
`;

await sql`
  CREATE INDEX IF NOT EXISTS analyses_embedding_hnsw_idx
  ON analyses USING hnsw (embedding vector_cosine_ops)
`;

console.log("Migration complete — analyses + messages tables + pgvector ready.");
