# Prism

AI-powered data reporting — turn raw spreadsheets into insights, charts, and exportable PDF reports in seconds.

**Live:** [prismanalytics.app](https://prismanalytics.app)

---

## What It Does

Upload a CSV or Excel file. Prism parses it entirely in your browser, sends only a compact statistical summary to Gemini 2.5 Flash, and streams back a structured analysis with:

- Executive summary (streamed live as it generates)
- Key insights with specific numbers from your data
- Interactive charts (bar, line, area, pie, scatter) rendered from a validated JSON config
- Actionable recommendations
- Downloadable PDF report with embedded chart captures (SVG → canvas → PNG)
- Follow-up chat — ask questions about your data after the analysis
- Semantic search over saved analyses — finds results by meaning, not just keywords

No raw data ever leaves your machine. The AI never sees your full spreadsheet.

---

## How To Use

### Option 1 — Try the demo

Go to [prismanalytics.app](https://prismanalytics.app) and click **Try with sample data**. No file needed — it runs the full pipeline on a built-in 12-month revenue dataset.

### Option 2 — Upload your own file

1. Drop a CSV, XLSX, or XLS file onto the upload zone (max 10MB)
2. Preview your parsed data and column stats
3. Optionally type a focus area — e.g. "churn trends" or "Q1 vs Q2 revenue"
4. Click **Analyze with AI**
5. Watch the summary stream in live, then see the full analysis
6. Click **Export PDF** to download a report with charts included
7. Sign in to save analyses, view history, share links, and ask follow-up questions via chat

---

## Architecture

```text
Browser                          Server                        External
──────                           ──────                        ────────
File drop
  → Papaparse / exceljs parse
  → Column types + null counts
  → Up to 20 sample rows
  → Summary stats object
                        POST /api/analyze
                          → Rate limit (Upstash Redis, 10/10min/IP)
                          → Body size cap (256KB)
                          → Schema validation
                          → Prompt construction
                                              → Gemini 2.5 Flash
                                              ← Stream text chunks
                        ← toTextStreamResponse()
  ← ReadableStream
  → Partial JSON regex → live summary preview
  → Full JSON parse + validate on stream end
  → Recharts renders chart config
  → SVG → canvas → PNG → PDF embed

  [Signed in]
                        POST /api/analyses (save)
                                              → Neon Postgres (JSONB)
                                              → text-embedding-004
                                              → pgvector (HNSW index)

  History search query
                        GET /api/analyses/search
                                              → embed query
                                              → cosine similarity (pgvector)
                                              ← ranked results
```

**Key design decisions:**

- **No raw data to the AI.** The server enforces a 256KB body cap and validates the request shape before the prompt is built. The AI receives column metadata and at most 20 sample rows — never the full file.
- **AI describes, Recharts renders.** The model returns a JSON chart config (type, keys, data). The UI renders it. The AI never writes SVG or JSX code.
- **Streaming first.** `streamText` + `ReadableStream` on the client means the summary starts appearing within 200ms of the request. Partial JSON regex extracts the summary mid-stream so the user can read while the AI is still generating.
- **Chart images in PDF without extra dependencies.** SVG serialization + canvas at 2× scale — no `html2canvas`. Each chart container has a `data-chart-index` attribute; export queries them, clones the SVG, injects a background rect, draws to canvas, and passes PNG data URLs to `@react-pdf/renderer`.
- **Fails loudly, recovers gracefully.** Malformed AI responses throw typed parse errors surfaced in the UI. A failed analysis returns you to your data with one-click retry. Each chart has its own React error boundary.
- **Semantic search over history.** Each saved analysis is embedded with `text-embedding-004` (768-dim vector stored in pgvector). Search queries are embedded at request time and ranked by cosine similarity — finds "customer retention" even if the analysis was titled `march_export.csv`.

---

## Stack

| Layer         | Technology                                              |
| ------------- | ------------------------------------------------------- |
| Framework     | Next.js 16 (App Router)                                 |
| Styling       | Tailwind CSS v4 + Shadcn/ui                             |
| Typography    | Geist Sans + Geist Mono                                 |
| Animation     | Framer Motion                                           |
| Charts        | Recharts                                                |
| AI            | Gemini 2.5 Flash + text-embedding-004 (Vercel AI SDK)   |
| Parsing       | Papaparse + exceljs (client-side)                       |
| Export        | @react-pdf/renderer                                     |
| Auth          | Clerk                                                   |
| Database      | Neon Postgres + pgvector                                |
| Rate limiting | Upstash Redis (distributed sliding window)              |
| Testing       | Vitest — 58 tests across 5 files                        |
| Hosting       | Vercel                                                  |

---

## Project Structure

```text
app/
  layout.tsx              Root layout — Geist fonts, ThemeProvider, Clerk, metadata
  page.tsx                Upload / preview / streaming / analysis state machine
  error.tsx               Route-level error boundary
  opengraph-image.tsx     Generated OG image (next/og)
  api/
    analyze/route.ts      Rate-limited, validated AI analysis endpoint (streamText)
    analyses/
      route.ts            Save + list analyses (auth required)
      search/route.ts     Semantic search via pgvector cosine similarity
      [id]/
        route.ts          Get / delete a saved analysis
        chat/route.ts     Streamed follow-up chat per analysis

components/
  upload/                 Drag-and-drop file zone
  preview/                Data table + stats bar
  insights/               Analysis view + streaming skeleton
  charts/                 Recharts renderer + per-chart error boundary
  chat/                   Follow-up chat panel
  export/                 PDF document + export button (SVG capture)
  history/                History sidebar + share button

lib/
  parser.ts               Papaparse + exceljs — client-side file parsing
  stats.ts                Column type inference + summary stats
  prompt.ts               AI prompt builder (analysis + chat system prompt)
  validate.ts             Request + response shape validation
  db.ts                   Neon Postgres queries (analyses + messages)
  rate-limit.ts           Distributed rate limiter via Upstash Redis (in-memory fallback for local dev)
  embeddings.ts           Gemini text-embedding-004 wrapper + embeddingTextFromAnalysis helper

types/index.ts            All shared TypeScript types
__tests__/                Vitest unit tests — 58 tests across 5 files
public/
  sample.csv              Demo dataset — 12-month revenue / customers / churn
  logo.png                Prism logo
```

---

## Running Locally

```bash
# Install dependencies
npm install

# Set up environment
cp .env.local.example .env.local
# Fill in the required variables (see below)

# Run database migrations
npm run db:migrate

# Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Environment Variables

| Variable | Required | Description |
| --- | --- | --- |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Yes | Gemini API key — [aistudio.google.com](https://aistudio.google.com) |
| `DATABASE_URL` | Yes | Neon Postgres connection string |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Yes | Clerk publishable key |
| `CLERK_SECRET_KEY` | Yes | Clerk secret key |
| `UPSTASH_REDIS_REST_URL` | No | Upstash Redis REST URL — enables distributed rate limiting |
| `UPSTASH_REDIS_REST_TOKEN` | No | Upstash Redis REST token |
| `NEXT_PUBLIC_SITE_URL` | No | Production URL — used for OG image absolute URLs |

Auth and database are required for history, sharing, and chat. Upstash is required for distributed rate limiting (falls back to in-memory without it). The core upload → analyze → export flow works without any of them.

---

## Security

- Client-side parsing — files never touch a server
- Server-side request validation with hard caps (20 sample rows, 256KB body)
- Distributed rate limiting: 10 analyses per 10 minutes per IP via Upstash Redis — enforced across all serverless instances
- Auth-gated routes: history, chat, and share endpoints require a valid Clerk session
- Generic error responses — provider errors logged server-side only
- 0 `npm audit` vulnerabilities (xlsx replaced with exceljs due to unpatched CVEs)

---

## AI Response Shape

The model is instructed to return exactly this JSON — validated on every response:

```json
{
  "summary": "string",
  "insights": ["string"],
  "charts": [
    {
      "type": "bar | line | area | pie | scatter",
      "title": "string",
      "x_key": "string",
      "y_key": "string",
      "data": [{ "<x_key>": "label", "<y_key>": 42 }],
      "insight": "string"
    }
  ],
  "recommendations": ["string"]
}
```

Anything outside this shape throws a parse error surfaced in the UI — no silent failures.

---

## Versions

| Version | What shipped |
| --- | --- |
| v1.0.0 | Launch — upload, parse, AI analysis, charts, PDF export, OG image, demo mode |
| v1.1.0 | Persistence — Neon DB, Clerk auth, save/load analyses, history sidebar, shareable links |
| v1.2.0 | Streaming — live summary preview during generation via `streamText` |
| v1.3.0 | Chat — streamed follow-up Q&A per analysis, persisted message thread |
| v1.4.0 | Custom focus input + chart images embedded in PDF export |
| v1.5.0 | Semantic search — pgvector + Gemini `text-embedding-004`, HNSW index, cosine similarity |
| v1.6.0 | Timeline view in history sidebar — analyses grouped by month with insight preview |
| v1.7.0 | Area + scatter chart types, PDF aspect ratio fix, cursor artifact removal from exports |
| v1.7.1 | Fix pie chart PDF rendering (foreignObject stripping), delete analyses from history |
| v1.8.0 | Chat + share available for history-loaded analyses (savedId forwarded on load) |
| v1.9.0 | Distributed rate limiter via Upstash Redis — survives cold starts and multi-instance |
