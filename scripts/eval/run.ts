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

interface ClaimResult {
  claim: string;
  passed: boolean;
}
interface DatasetResult {
  name: string;
  claims: ClaimResult[];
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

async function runDataset(d: EvalDataset): Promise<DatasetResult> {
  const dataset = buildSummary(d.rows, `${d.name}.csv`, 200);
  const prompt = buildAnalysisPrompt(dataset);

  try {
    const { text } = await generateText({ model: google("gemini-2.5-flash"), prompt });
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

    return { name: d.name, claims };
  } catch (e) {
    return { name: d.name, claims: [], error: e instanceof Error ? e.message : String(e) };
  }
}

function patchReadme(accuracyPct: number, passed: number, total: number, datasetCount: number) {
  const readmePath = resolve(__dirname, "../../README.md");
  let readme: string;
  try {
    readme = readFileSync(readmePath, "utf-8");
  } catch {
    return;
  }
  const marker = /<!-- EVAL:ACCURACY -->[\s\S]*?<!-- \/EVAL:ACCURACY -->/;
  if (!marker.test(readme)) return; // no marker present — leave README alone

  const line = `**Claim accuracy:** ${accuracyPct}% (${passed}/${total} checks) across ${datasetCount} hand-checked test datasets — see [scripts/eval](./scripts/eval).`;
  readme = readme.replace(marker, `<!-- EVAL:ACCURACY -->\n${line}\n<!-- /EVAL:ACCURACY -->`);
  writeFileSync(readmePath, readme);
  console.log("Updated README.md claim-accuracy line.");
}

async function main() {
  const results: DatasetResult[] = [];
  for (const d of evalDatasets) {
    console.log(`Running: ${d.name}`);
    results.push(await runDataset(d));
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
  console.log(`\nClaim accuracy: ${passed}/${total} (${accuracyPct}%)`);

  const out = {
    ranAt: new Date().toISOString(),
    model: "gemini-2.5-flash",
    datasetCount: evalDatasets.length,
    claimsTotal: total,
    claimsPassed: passed,
    accuracyPct,
    results,
  };
  const outPath = resolve(__dirname, "results.json");
  writeFileSync(outPath, JSON.stringify(out, null, 2));
  console.log(`Wrote ${outPath}`);

  patchReadme(accuracyPct, passed, total, evalDatasets.length);
}

main();
