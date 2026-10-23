// Runs POST /api/analyze against a real, realistic dataset N times and
// reports the failure rate — a single manual test can miss an intermittent
// truncation/incomplete-output issue that only shows up some fraction of
// the time.
//
// Usage: npm run smoke:analyze
//        HEALTH_CHECK_URL=https://prismanalytics.app npm run smoke:analyze
//        RUNS=10 npm run smoke:analyze

import { buildSummary } from "../lib/stats";
import { validateAnalysisResult } from "../lib/validate";

const SITE_URL = process.env.HEALTH_CHECK_URL ?? "http://localhost:3000";
const RUNS = Number(process.env.RUNS ?? 5);
const TIMEOUT_MS = 30_000;

const sampleRows = [
  { month: "Jan 2024", revenue: 142000, customers: 1240 },
  { month: "Feb 2024", revenue: 138000, customers: 1198 },
  { month: "Mar 2024", revenue: 161000, customers: 1345 },
  { month: "Apr 2024", revenue: 175000, customers: 1412 },
  { month: "May 2024", revenue: 168000, customers: 1389 },
  { month: "Jun 2024", revenue: 182000, customers: 1467 },
  { month: "Jul 2024", revenue: 194000, customers: 1523 },
  { month: "Aug 2024", revenue: 188000, customers: 1501 },
  { month: "Sep 2024", revenue: 201000, customers: 1578 },
  { month: "Oct 2024", revenue: 215000, customers: 1642 },
  { month: "Nov 2024", revenue: 228000, customers: 1704 },
  { month: "Dec 2024", revenue: 244000, customers: 1789 },
];

interface RunResult {
  ok: boolean;
  detail: string;
  ms: number;
}

async function runOnce(): Promise<RunResult> {
  const dataset = buildSummary(sampleRows, "smoke.csv", 512);
  const started = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(`${SITE_URL}/api/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dataset),
      signal: controller.signal,
    });
  } catch (e) {
    return { ok: false, detail: `request threw: ${e instanceof Error ? e.message : e}`, ms: Date.now() - started };
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "<unreadable>");
    return { ok: false, detail: `HTTP ${res.status} — ${body.slice(0, 300)}`, ms: Date.now() - started };
  }

  const text = await res.text();
  const json = text
    .replace(/^```(?:json)?\s*/m, "")
    .replace(/\s*```\s*$/m, "")
    .trim();

  try {
    validateAnalysisResult(JSON.parse(json));
  } catch (e) {
    return {
      ok: false,
      detail: `invalid response: ${e instanceof Error ? e.message : e} — raw (first 300 chars): ${text.slice(0, 300)}`,
      ms: Date.now() - started,
    };
  }

  return { ok: true, detail: "ok", ms: Date.now() - started };
}

async function main() {
  console.log(`Running ${RUNS} analyses against ${SITE_URL}/api/analyze...\n`);

  let failures = 0;
  for (let i = 1; i <= RUNS; i++) {
    const result = await runOnce();
    console.log(`${result.ok ? "✓" : "✗"} run ${i}/${RUNS} (${result.ms}ms): ${result.detail}`);
    if (!result.ok) failures++;
  }

  const failureRate = (failures / RUNS) * 100;
  console.log(`\nFailure rate: ${failures}/${RUNS} (${failureRate.toFixed(1)}%)`);
  process.exit(failures > 0 ? 1 : 0);
}

main();
