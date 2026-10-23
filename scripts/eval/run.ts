// Claim-accuracy eval — runs real AI analysis against small, hand-checked
// datasets and scores how many of the AI's narrative claims match ground
// truth (not the AI's own ground truth: a frozen "expected" block authored
// before this script ever ran — see datasets.ts).
//
// Each dataset is run REPEATS times (default 3) and the reported accuracy
// is pooled across all runs — a single generation can pass or fail a
// borderline claim by chance, and one sample can't tell the difference
// between "reliably correct" and "got lucky once."
//
// Usage: npm run eval:accuracy
//        REPEATS=1 npm run eval:accuracy        (quick single-pass check)
//
// Needs an API key — prefer EVAL_GOOGLE_GENERATIVE_AI_API_KEY (a key
// separate from whatever's configured for the live app) over
// GOOGLE_GENERATIVE_AI_API_KEY, so a quota-hungry eval run can't also
// take out the production key.

import { generateText } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { writeFileSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { buildSummary } from "../../lib/stats";
import { buildAnalysisPrompt } from "../../lib/prompt";
import { validateAnalysisResult } from "../../lib/validate";
import { evalDatasets, type EvalDataset } from "./datasets";

const __dirname = dirname(fileURLToPath(import.meta.url));

const apiKey = process.env.EVAL_GOOGLE_GENERATIVE_AI_API_KEY ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY;
if (!apiKey) {
  console.error(
    "Missing API key — set EVAL_GOOGLE_GENERATIVE_AI_API_KEY (preferred, keeps this separate from the " +
      "production key) or GOOGLE_GENERATIVE_AI_API_KEY."
  );
  process.exit(1);
}
if (!process.env.EVAL_GOOGLE_GENERATIVE_AI_API_KEY) {
  console.warn(
    "Using GOOGLE_GENERATIVE_AI_API_KEY — consider setting EVAL_GOOGLE_GENERATIVE_AI_API_KEY to a separate " +
      "key so this eval's quota usage can't affect the live app.\n"
  );
}
const google = createGoogleGenerativeAI({ apiKey });

const MODEL_NAME = "gemini-3.5-flash";
const REPEATS = Number(process.env.REPEATS ?? 3);

// Paced between requests, and backed off on a transient "high demand"
// error — firing requests back-to-back is itself what was tripping
// Gemini's demand throttle on some runs, and REPEATS multiplies the
// request count, so this matters more now than it used to.
const PACING_MS = 3000;
const HIGH_DEMAND_BACKOFF_MS = 8000;
const HIGH_DEMAND_EXTRA_ATTEMPTS = 2;

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
interface RunResult {
  claims: ClaimResult[];
  narrative?: string; // the AI's summary+insights+chart insights+recommendations, for hand-checking failures
  error?: string;
}
interface DatasetResult {
  name: string;
  runs: RunResult[];
  meanAccuracyPct: number; // mean of this dataset's own (passed/total) ratio across its runs that completed
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

// Sentence-scoped, not whole-text — a correct sentence mentioning the
// column and the wrong label in unrelated contexts ("returns held steady
// through April before climbing in May") shouldn't trip this. Only a
// sentence that combines the column, peak/high language, AND the wrong
// period label counts as the misattribution.
function hasPeakMisattribution(text: string, column: string, wrongPeakLabel: string): boolean {
  const sentences = text.split(/(?<=[.!?])\s+/);
  const wrongRe = new RegExp(`\\b${wrongPeakLabel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
  return sentences.some(
    (s) =>
      s.toLowerCase().includes(column.toLowerCase()) &&
      /peak|peaked|highest|high point/i.test(s) &&
      wrongRe.test(s)
  );
}

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

async function runOnce(d: EvalDataset): Promise<RunResult> {
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
      // Applies to every dataset — none of the data given to the model is
      // ever formatted with a dollar sign (see lib/prompt.ts), so a $
      // anywhere in the output is always invented.
      { claim: "does not invent a currency symbol ($)", passed: !fullText.includes("$") },
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
    for (const { column, wrongPeakLabel } of d.expected.peakMisattribution ?? []) {
      claims.push({
        claim: `does not credit ${column}'s peak to ${wrongPeakLabel}`,
        passed: !hasPeakMisattribution(fullText, column, wrongPeakLabel),
      });
    }

    return { claims, narrative: fullText };
  } catch (e) {
    return { claims: [], error: e instanceof Error ? e.message : String(e) };
  }
}

function patchReadme(
  accuracyPct: number,
  passed: number,
  total: number,
  datasetCount: number,
  ranCount: number,
  totalRuns: number,
  model: string,
  repeats: number
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

  // Don't claim to have checked runs that errored out (rate limits,
  // quota) before producing a result — that's a materially different
  // claim from "we scored these and they passed."
  const coverage =
    ranCount === totalRuns
      ? `${datasetCount} hand-checked test datasets × ${repeats} runs each`
      : `${ranCount} of ${totalRuns} runs (${datasetCount} datasets × ${repeats}, ${totalRuns - ranCount} hit API errors)`;
  const line = `**Claim accuracy:** ${accuracyPct}% mean (${passed}/${total} checks, ${model}) across ${coverage} — see [scripts/eval](./scripts/eval).`;
  readme = readme.replace(marker, `<!-- EVAL:ACCURACY -->\n${line}\n<!-- /EVAL:ACCURACY -->`);
  writeFileSync(readmePath, readme);
  console.log("Updated README.md claim-accuracy line.");
}

async function main() {
  console.log(`Running ${evalDatasets.length} datasets × ${REPEATS} repeats with ${MODEL_NAME}...\n`);

  const results: DatasetResult[] = [];
  let isFirstRequest = true;

  for (const d of evalDatasets) {
    console.log(`Running: ${d.name}`);
    const runs: RunResult[] = [];
    for (let r = 0; r < REPEATS; r++) {
      if (!isFirstRequest) await sleep(PACING_MS);
      isFirstRequest = false;
      runs.push(await runOnce(d));
    }

    const completed = runs.filter((r) => !r.error);
    const perRunPct = completed.map((r) => {
      const t = r.claims.length;
      const p = r.claims.filter((c) => c.passed).length;
      return t > 0 ? (p / t) * 100 : 0;
    });
    const meanAccuracyPct =
      perRunPct.length > 0 ? Math.round((perRunPct.reduce((a, b) => a + b, 0) / perRunPct.length) * 10) / 10 : 0;

    results.push({ name: d.name, runs, meanAccuracyPct });
  }

  let total = 0;
  let passed = 0;
  let totalRuns = 0;
  let ranRuns = 0;
  console.log("\n── Results ──");
  for (const r of results) {
    console.log(`${r.name} — mean ${r.meanAccuracyPct}% across ${r.runs.length} runs`);
    r.runs.forEach((run, i) => {
      totalRuns++;
      if (run.error) {
        console.log(`  ✗ run ${i + 1}: ERROR — ${run.error}`);
        return;
      }
      ranRuns++;
      for (const c of run.claims) {
        total++;
        if (c.passed) passed++;
        console.log(`  ${c.passed ? "✓" : "✗"} run ${i + 1}: ${c.claim}`);
      }
    });
  }

  const accuracyPct = total > 0 ? Math.round((passed / total) * 1000) / 10 : 0;
  console.log(`\nClaim accuracy (pooled across all runs): ${passed}/${total} (${accuracyPct}%)`);
  if (ranRuns < totalRuns) {
    console.log(`(${totalRuns - ranRuns} of ${totalRuns} runs errored out and were not scored)`);
  }

  const out = {
    ranAt: new Date().toISOString(),
    model: MODEL_NAME,
    repeats: REPEATS,
    datasetCount: evalDatasets.length,
    totalRuns,
    ranRuns,
    claimsTotal: total,
    claimsPassed: passed,
    accuracyPct,
    results,
  };
  const outPath = resolve(__dirname, "results.json");
  writeFileSync(outPath, JSON.stringify(out, null, 2));
  console.log(`Wrote ${outPath}`);

  patchReadme(accuracyPct, passed, total, evalDatasets.length, ranRuns, totalRuns, MODEL_NAME, REPEATS);
}

main();
