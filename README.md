# Prism

AI-powered data reporting — turn raw spreadsheets into insights, visualizations, and exportable reports in seconds.

## Overview

Prism parses your data entirely in the browser, sends only a compact statistical summary to the AI, and returns a structured analysis with interactive charts and actionable recommendations — no raw data ever leaves your machine.

## Stack

| Layer      | Technology                       |
| ---------- | -------------------------------- |
| Framework  | Next.js 16 (App Router)          |
| Styling    | Tailwind CSS v4 + Shadcn/ui      |
| Typography | Geist Sans + Geist Mono          |
| Animation  | Framer Motion                    |
| Charts     | Recharts                         |
| AI         | Gemini 2.5 Flash (Vercel AI SDK) |
| Parsing    | Papaparse + exceljs (client-side)|
| Export     | @react-pdf/renderer              |
| Hosting    | Vercel                           |

## Architecture

```text
Upload → Browser parse → Summary stats → AI analysis → JSON chart config → Recharts → PDF export
```

- **No raw data to the AI.** Papaparse/exceljs extract shape, column types, null counts, and up to 20 sample rows in the browser. Only that compact summary is sent — and the server enforces it with a strict request validator and a 256KB body cap.
- **AI describes, Recharts renders.** The model returns a JSON chart config validated against a strict schema. The UI renders it — the AI never writes SVG or JSX.
- **Fails loudly, recovers gracefully.** Malformed AI responses surface as typed parse errors. A failed analysis returns you to your parsed data with one-click retry. Each chart has its own error boundary.

## Getting Started

```bash
# Install dependencies
npm install

# Set up environment
cp .env.local.example .env.local
# Add your GOOGLE_GENERATIVE_AI_API_KEY (free at aistudio.google.com)

# Run dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — or click **Try with sample data** to skip the upload.

## Environment Variables

| Variable                       | Description                                                             |
| ------------------------------ | ----------------------------------------------------------------------- |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Gemini API key from [aistudio.google.com](https://aistudio.google.com)  |
| `NEXT_PUBLIC_SITE_URL`         | Production URL (for OG/social images) — optional locally                |

## Project Structure

```text
app/
  layout.tsx           Root layout — Geist fonts, ThemeProvider, metadata
  page.tsx             Upload / preview / analysis state machine
  error.tsx            Route-level error boundary
  opengraph-image.tsx  Generated OG image
  api/analyze/
    route.ts           Rate-limited, validated AI analysis endpoint
components/
  ui/                  Shadcn primitives
  upload/              Drag-and-drop file zone
  preview/             Data preview table + stats bar
  insights/            Analysis view + loading skeleton
  charts/              Recharts renderer + per-chart error boundary
  export/              PDF report document + export button
lib/
  parser.ts            Papaparse + exceljs parsing
  stats.ts             Column type inference + summary stats
  prompt.ts            AI prompt builder
  validate.ts          Request + response shape validation
  rate-limit.ts        Sliding-window rate limiter
types/
  index.ts             Shared TypeScript types
public/
  sample.csv           Demo dataset — 12-month revenue/customers/churn
```

## Security

- Client-side parsing — files never touch a server
- Server-side request validation with hard caps (20 sample rows, 256KB body)
- Rate limiting: 10 analyses per 10 minutes per IP
- Generic error responses — provider errors logged server-side only
- 0 `npm audit` vulnerabilities (xlsx replaced with exceljs over unpatched CVEs)

## Roadmap

- [x] Stage 1 — Foundation (Next.js + Tailwind + Shadcn + design system)
- [x] Stage 2 — File Ingestion (upload + parse + preview table)
- [x] Stage 3 — AI Layer (analysis endpoint + insight cards)
- [x] Stage 4 — Visualisation (JSON chart config → Recharts)
- [x] Stage 5 — Export (React-pdf report download)
- [x] Stage 6 — Polish (skeletons, staggered animations, theme toggle, mobile)
- [x] Stage 7 — Hardening (validation, rate limiting, error boundaries)
- [x] Stage 8 — Launch (OG image, demo mode, v1.0.0)

## Design Tokens

| Token         | Value                                   |
| ------------- | --------------------------------------- |
| Accent        | Indigo-500 `oklch(0.585 0.233 277.117)` |
| Neutral       | Zinc scale                              |
| Radius        | sm=8px · md=12px · lg=16px              |
| Font          | Geist Sans + Geist Mono                 |
| Default theme | Dark                                    |
