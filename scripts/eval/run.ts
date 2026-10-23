// Claim-accuracy eval — runs real AI analysis against small, hand-checked
// datasets and scores how many of the AI's narrative claims match ground
// truth (not the AI's own ground truth: a frozen "expected" block authored
// before this script ever ran — see datasets.ts).
//
// Usage: npm run eval:accuracy   (needs GOOGLE_GENERATIVE_AI_API_KEY)

import { generateText } from "ai";
import { google } from "@ai-sdk/google";
import { writeFileSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { buildSummary } from "../../lib/stats";
import { buildAnalysisPrompt } from "../../lib/prompt";
import { validateAnalysisResult } from "../../lib/validate";
import { evalDatasets, type EvalDataset } from "./datasets";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Paced between datasets, and backed off on a transient "high demand"
// error — running 16 requests back-to-back is itself what was tripping
// Gemini's demand throttle on some runs.
const PACING_MS = 3000;
const HIGH_DEMAND_BACKOFF_MS = 8000;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function isQuotaExceeded(message: string): boolean {
  return /quota|RESOURCE_EXHAUSTED/i.test(message);
}

function isHighDemand(message: string): boolean {
  return /high demand/i.test(message);
}

interface ClaimResult {
  claim: string;
  passed: boolean;
}
interface DatasetResult {
  name: string;
  claims: ClaimResult[];
  narrative?: string; // the AI's summary+insights+chart insights+recommendations, for hand-checking failures
  error?: string;
}

function wordMatch(text: string, needle: string): boolean {
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\b${escaped}\\b`, "i").test(text);
}

// Models often drop the sign in prose ("declined 24%" vs "-24%"), so this
// matches the magnitude, rounded both ways, as a standalone number.
function numberMatch(text: string, n: number): boolean {
  const candidates = new Set([Math.round(Math.abs(n)).toString(), Math.abs(n).toFixed(1)]);
  for (const c of candidates) {
    const escaped = c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (new RegExp(`(?<!\\d)${escaped}(?!\\d)`).test(text)) return true;
  }
  return false;
}

const MODEL_NAME = "gemini-3.5-flash";
const HIGH_DEMAND_EXTRA_ATTEMPTS = 2;

// generateText already retries internally on transient errors, but all of
// those attempts happen back-to-back in milliseconds — too fast for a
// "high demand" spike to pass. This adds a real wait between attempts for
// that specific error, and gives up immediately (no point waiting) on a
// quota error, which reports multi-hour retry delays.
async function generateWithBackoff(prompt: string): Promise<{ text: string }> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= 1 + HIGH_DEMAND_EXTRA_ATTEMPTS; attempt++) {
    try {
      return await generateText({ model: google(MODEL_NAME), prompt });
    } catch (e) {
      lastError = e;
      const message = e instanceof Error ? e.message : String(e);
      if (isQuotaExceeded(message)) throw e; // won't recover within this run
      if (!isHighDemand(message) || attempt > HIGH_DEMAND_EXTRA_ATTEMPTS) throw e;
      await sleep(HIGH_DEMAND_BACKOFF_MS * attempt);
    }
  }
  throw lastError;
}

async function runDataset(d: EvalDataset): Promise<DatasetResult> {
  const dataset = buildSummary(d.rows, `${d.name}.csv`, 200);
  const prompt = buildAnalysisPrompt(dataset);

  try {
    const { text } = await generateWithBackoff(prompt);
    const json = text
      .replace(/^```(?:json)?\s*/m, "")
      .replace(/\s*```\s*$/m, "")
      .trim();
    const parsed = validateAnalysisResult(JSON.parse(json));

    const fullText = [
      parsed.summary,
      ...parsed.insights,
      ...parsed.charts.map((c) => `${c.title} ${c.insight}`),
      ...parsed.recommendations,
    ].join(" ");

    const claims: ClaimResult[] = [
      { claim: `names the best period (${d.expected.bestLabel})`, passed: wordMatch(fullText, d.expected.bestLabel) },
      { claim: `names the worst period (${d.expected.worstLabel})`, passed: wordMatch(fullText, d.expected.worstLabel) },
      {
        claim: `states the start→end change (${d.expected.startEndPctChange}%)`,
        passed: numberMatch(fullText, d.expected.startEndPctChange),
      },
    ];
    if (d.expected.downLabels.length > 0) {
      claims.push({
        claim: `mentions a decline (${d.expected.downLabels.join("/")})`,
        passed: d.expected.downLabels.some((l) => wordMatch(fullText, l)),
      });
    }
    for (const phrase of d.expected.forbiddenPhrases ?? []) {
      claims.push({
        claim: `does not say "${phrase}"`,
        passed: !fullText.toLowerCase().includes(phrase.toLowerCase()),
      });
    }
    for (const phrase of d.expected.requiredPhrases ?? []) {
      claims.push({
        claim: `mentions "${phrase}"`,
        passed: fullText.toLowerCase().includes(phrase.toLowerCase()),
      });
    }

    return { name: d.name, claims, narrative: fullText };
  } catch (e) {
    return { name: d.name, claims: [], error: e instanceof Error ? e.message : String(e) };
  }
}

function patchReadme(
  accuracyPct: number,
  passed: number,
  total: number,
  datasetCount: number,
  ranCount: number,
  model: string
) {
  const readmePath = resolve(__dirname, "../../README.md");
  let readme: string;
  try {
    readme = readFileSync(readmePath, "utf-8");
  } catch {
    return;
  }
  const marker = /<!-- EVAL:ACCURACY -->[\s\S]*?<!-- \/EVAL:ACCURACY -->/;
  if (!marker.test(readme)) return; // no marker present — leave README alone

  // Don't claim to have checked datasets that errored out (rate limits,
  // quota) before producing a result — that's a materially different claim
  // from "we scored these and they passed."
  const coverage =
    ranCount === datasetCount
      ? `${datasetCount} hand-checked test datasets`
      : `${ranCount} of ${datasetCount} hand-checked test datasets (${datasetCount - ranCount} hit API errors this run)`;
  const line = `**Claim accuracy:** ${accuracyPct}% (${passed}/${total} checks, ${model}) across ${coverage} — see [scripts/eval](./scripts/eval).`;
  readme = readme.replace(marker, `<!-- EVAL:ACCURACY -->\n${line}\n<!-- /EVAL:ACCURACY -->`);
  writeFileSync(readmePath, readme);
  console.log("Updated README.md claim-accuracy line.");
}

async function main() {
  const results: DatasetResult[] = [];
  for (let i = 0; i < evalDatasets.length; i++) {
    const d = evalDatasets[i];
    console.log(`Running: ${d.name}`);
    results.push(await runDataset(d));
    if (i < evalDatasets.length - 1) await sleep(PACING_MS);
  }

  let total = 0;
  let passed = 0;
  console.log("\n── Results ──");
  for (const r of results) {
    if (r.error) {
      console.log(`✗ ${r.name}: ERROR — ${r.error}`);
      continue;
    }
    for (const c of r.claims) {
      total++;
      if (c.passed) passed++;
      console.log(`${c.passed ? "✓" : "✗"} ${r.name}: ${c.claim}`);
    }
  }

  const accuracyPct = total > 0 ? Math.round((passed / total) * 1000) / 10 : 0;
  const ranCount = results.filter((r) => !r.error).length;
  console.log(`\nClaim accuracy: ${passed}/${total} (${accuracyPct}%)`);
  if (ranCount < evalDatasets.length) {
    console.log(`(${evalDatasets.length - ranCount} of ${evalDatasets.length} datasets errored out and were not scored)`);
  }

  const out = {
    ranAt: new Date().toISOString(),
    model: MODEL_NAME,
    datasetCount: evalDatasets.length,
    ranCount,
    claimsTotal: total,
    claimsPassed: passed,
    accuracyPct,
    results,
  };
  const outPath = resolve(__dirname, "results.json");
  writeFileSync(outPath, JSON.stringify(out, null, 2));
  console.log(`Wrote ${outPath}`);

  patchReadme(accuracyPct, passed, total, evalDatasets.length, ranCount, MODEL_NAME);
}

main();
