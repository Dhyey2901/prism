// Hits the production /api/analyze endpoint with a small sample dataset
// and confirms it returns a valid AnalysisResult. Exits non-zero on any
// failure so the calling GitHub Action can report an outage.

const SITE_URL = process.env.HEALTH_CHECK_URL ?? "https://prismanalytics.app";
const TIMEOUT_MS = 30_000;

const sampleDataset = {
  rowCount: 12,
  columnCount: 3,
  fileName: "health-check.csv",
  fileSizeBytes: 256,
  columns: [
    { name: "month", type: "string", nullCount: 0, uniqueCount: 12, sample: ["Jan 2024", "Feb 2024"] },
    { name: "revenue", type: "number", nullCount: 0, uniqueCount: 12, sample: [142000, 138000] },
    { name: "customers", type: "number", nullCount: 0, uniqueCount: 12, sample: [1240, 1198] },
  ],
  sampleRows: [
    { month: "Jan 2024", revenue: 142000, customers: 1240 },
    { month: "Dec 2024", revenue: 244000, customers: 1789 },
  ],
};

function fail(message) {
  console.error(`HEALTH CHECK FAILED: ${message}`);
  process.exit(1);
}

async function main() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let res;
  try {
    res = await fetch(`${SITE_URL}/api/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...sampleDataset, focusText: "health check" }),
      signal: controller.signal,
    });
  } catch (e) {
    fail(`request to ${SITE_URL}/api/analyze threw: ${e instanceof Error ? e.message : e}`);
    return;
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "<unreadable>");
    fail(`HTTP ${res.status} — ${body.slice(0, 500)}`);
    return;
  }

  const text = await res.text();
  const json = text
    .replace(/^```(?:json)?\s*/m, "")
    .replace(/\s*```\s*$/m, "")
    .trim();

  let parsed;
  try {
    parsed = JSON.parse(json);
  } catch {
    fail(`response was not valid JSON: ${text.slice(0, 500)}`);
    return;
  }

  if (typeof parsed.summary !== "string" || !Array.isArray(parsed.charts) || parsed.charts.length === 0) {
    fail(`response did not match the expected AnalysisResult shape: ${JSON.stringify(parsed).slice(0, 500)}`);
    return;
  }

  console.log("Health check passed — /api/analyze returned a valid report.");
}

main();
