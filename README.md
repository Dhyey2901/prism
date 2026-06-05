# Prism

AI-powered data reporting — turn raw spreadsheets into insights, visualizations, and exportable reports in seconds.

## Overview

Prism processes your data entirely in the browser, sends only a compact summary to Claude, and returns a structured analysis with charts and actionable recommendations — no raw data ever leaves your machine.

## Stack

| Layer       | Technology                        |
| ----------- | --------------------------------- |
| Framework   | Next.js 16 (App Router)           |
| Styling     | Tailwind CSS v4 + Shadcn/ui       |
| Typography  | Geist Sans + Geist Mono           |
| Animation   | Framer Motion                     |
| Charts      | Recharts                          |
| AI          | Claude API via Vercel AI SDK      |
| Parsing     | Papaparse + XLSX.js (client-side) |
| Export      | React-pdf                         |
| Hosting     | Vercel + Supabase                 |

## Architecture

```text
Upload → Browser parse → Summary stats → Claude API → JSON chart config → Recharts
```

- **No raw data to Claude.** Papaparse/XLSX.js extract shape, types, null counts, and 20 sample rows. That compact summary is what Claude receives.
- **Claude describes, Recharts renders.** Claude returns a JSON chart config. The UI renders it — Claude never writes SVG or JSX.
- **Edge-first.** The `/api/analyze` route runs on Vercel Edge Runtime. No heavy server logic in v1.

## Getting Started

```bash
# Install dependencies
npm install

# Copy env template
cp .env.local.example .env.local
# Add your ANTHROPIC_API_KEY

# Run dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

| Variable            | Description                                    |
| ------------------- | ---------------------------------------------- |
| `ANTHROPIC_API_KEY` | Claude API key from console.anthropic.com      |

## Project Structure

```text
app/
  layout.tsx          Root layout — Geist fonts, ThemeProvider
  page.tsx            Landing page / upload entry point
  api/analyze/
    route.ts          Edge function — Claude API call
components/
  ui/                 Shadcn primitives
  upload/             File upload zone (Stage 2)
  preview/            Data preview table (Stage 2)
  insights/           AI insight cards (Stage 3)
  charts/             Recharts renderer (Stage 4)
  export/             PDF export (Stage 5)
lib/
  parser.ts           Papaparse + XLSX parsing
  stats.ts            Column inference + summary stats
  prompt.ts           Claude prompt builder
  utils.ts            cn() helper
types/
  index.ts            Shared TypeScript types
public/
  sample.csv          Demo dataset — 12-month revenue/customers/churn
```

## Roadmap

- [x] Stage 1 — Foundation (Next.js + Tailwind + Shadcn + design system)
- [ ] Stage 2 — File Ingestion (upload + parse + preview table)
- [ ] Stage 3 — AI Layer (Claude API + streaming + insight cards)
- [ ] Stage 4 — Visualisation (JSON chart config → Recharts)
- [ ] Stage 5 — Export (React-pdf report download)
- [ ] Stage 6 — Polish (animations, skeletons, mobile)
- [ ] Stage 7 — Hardening (validation, rate limiting, error boundaries)
- [ ] Stage 8 — Launch (domain, OG image, demo mode)

## Design Tokens

| Token         | Value                                   |
| ------------- | --------------------------------------- |
| Accent        | Indigo-500 `oklch(0.585 0.233 277.117)` |
| Neutral       | Zinc scale                              |
| Radius        | sm=8px · md=12px · lg=16px              |
| Font          | Geist Sans + Geist Mono                 |
| Default theme | Dark                                    |
