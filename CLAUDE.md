@AGENTS.md

# Prism — AI-powered data reporting tool

## Stack
Next.js 16 (App Router) · Tailwind CSS v4 · Shadcn/ui · Geist font · Framer Motion · Recharts · Gemini 2.5 Flash via Vercel AI SDK · React-pdf  
Hosting: Vercel

## Current stage
Launched — v1.0.0 (all 8 stages complete). Future work is maintenance and post-launch features.

## Architecture rules (never violate)

1. Preprocess data in the browser before sending to the AI — never send raw spreadsheets. Send only summary stats + sample rows (max 20). Enforced server-side (validation + 256KB body cap).
2. No LangChain — call the AI provider directly via the Vercel AI SDK (`generateText`).
3. AI describes charts, UI renders them. The model returns JSON chart config, Recharts renders it. The model never writes SVG or chart code.
4. Browser first. Papaparse and exceljs handle file parsing client-side.
5. Never use `any` in TypeScript — strict mode is on.
6. Never leave an unhandled state — loading / error / empty must always exist.

## Design tokens (locked — never deviate)
- Font: Geist Sans (`--font-geist-sans`) + Geist Mono (`--font-geist-mono`)
- Accent: **indigo-500** (`oklch(0.585 0.233 277.117)`) — dark / indigo-600 on light
- Neutral palette: zinc scale via oklch CSS variables
- Radius: sm=8px · md=12px · lg=16px (mapped in `@theme inline` as `--radius-sm/md/lg`)
- Motion: ease-out, 200–300ms micro, 400–500ms page transitions (Framer Motion only)
- Spacing: 4px base unit
- No gradients, no shadows except functional focus rings
- Dark mode first (`defaultTheme="dark"` in ThemeProvider)

## AI response shape (always validate exactly)

```json
{
  "summary": "string",
  "insights": ["string"],
  "charts": [
    {
      "type": "bar|line|pie",
      "title": "string",
      "x_key": "string",
      "y_key": "string",
      "data": [...],
      "insight": "string"
    }
  ],
  "recommendations": ["string"]
}
```
If the model returns anything outside this shape, throw a parse error and surface it in the UI — never silently fail.

## Folder structure
```
app/
  layout.tsx           — root layout, ThemeProvider, Geist fonts, metadata
  page.tsx             — upload / preview / analysis state machine
  error.tsx            — route-level error boundary
  opengraph-image.tsx  — generated OG image (next/og)
  api/analyze/
    route.ts           — AI analysis endpoint (rate-limited, validated)
components/
  theme-provider.tsx   — next-themes wrapper
  theme-toggle.tsx     — light/dark toggle
  ui/                  — shadcn primitives (never edit directly)
  upload/              — file upload components
  preview/             — data preview table + stats bar
  insights/            — analysis view + loading skeleton
  charts/              — Recharts renderer + per-chart error boundary
  export/              — PDF export (React-pdf)
lib/
  parser.ts            — Papaparse + exceljs parsing
  stats.ts             — preprocessing + summary stats
  prompt.ts            — AI prompt builder
  validate.ts          — request + response shape validation
  rate-limit.ts        — sliding-window rate limiter
  utils.ts             — cn() helper
types/
  index.ts             — all shared TypeScript types
public/
  sample.csv           — demo dataset (12-month revenue/customers/churn)
```

## Stage reference (all complete)

- Stage 1 — Foundation ✅ (Next.js + Tailwind v4 + Shadcn + design tokens)
- Stage 2 — File Ingestion ✅ (upload + parse + preview table)
- Stage 3 — AI Layer ✅ (analysis endpoint + insight cards; Gemini via AI SDK)
- Stage 4 — Visualisation ✅ (JSON chart config → Recharts renderer)
- Stage 5 — Export ✅ (React-pdf report + download)
- Stage 6 — Polish ✅ (animations, skeletons, dark mode, mobile)
- Stage 7 — Hardening ✅ (validation, rate limiting, error boundaries)
- Stage 8 — Launch ✅ (OG image, demo mode, Vercel deploy, v1.0.0 tag)

## Git discipline
- Branch per feature: `feature/stage-2-upload`, etc.
- Commit format: `feat:` / `fix:` / `chore:` / `style:`
- Never commit `.env.local`
- Tag releases: v0.1.0 after Stage 2, v0.2.0 after Stage 3, v1.0.0 at launch

## Session start checklist
1. State current stage and what's being built today
2. State any errors/blockers from last session
3. Confirm understanding before writing any code
