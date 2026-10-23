import type { AnalysisResult, DatasetSummary } from "@/types";

export function buildAnalysisPrompt(dataset: DatasetSummary, focusText?: string): string {
  const colRows = dataset.columns
    .map(
      (c) =>
        `| ${c.name} | ${c.type} | ${c.nullCount} | ${c.uniqueCount} |`
    )
    .join("\n");

  const factRows = dataset.keyMetrics
    .map((m) => `- ${m.label}: ${m.formatted}`)
    .join("\n");

  const downPeriodColumns = dataset.keyMetrics
    .filter((m) => m.label.startsWith("Down periods in "))
    .map((m) => m.label.replace("Down periods in ", ""));

  const timeSpanFact = dataset.keyMetrics.find((m) => m.label === "Time span");
  const singleYear = timeSpanFact?.formatted.includes("single calendar year") ?? false;

  const hasRateFacts = dataset.keyMetrics.some((m) => /rate$/i.test(m.label));

  const colHeader = dataset.columns.map((c) => c.name).join(" | ");
  const dataRows = dataset.sampleRows
    .map(
      (row) =>
        "| " +
        dataset.columns
          .map((c) => {
            const v = row[c.name];
            return v === null || v === undefined ? "" : String(v);
          })
          .join(" | ") +
        " |"
    )
    .join("\n");

  return `You are a data analyst. Analyze the dataset summary below and return ONLY a single valid JSON object — no markdown fences, no preamble, no trailing text.

Dataset: ${dataset.fileName}
Rows: ${dataset.rowCount.toLocaleString()} | Columns: ${dataset.columnCount} | Size: ${Math.round(dataset.fileSizeBytes / 1024)} KB

Column metadata:
| Column | Type | Null count | Unique count |
|--------|------|------------|--------------|
${colRows}

Sample rows (first ${dataset.sampleRows.length}):
| ${colHeader} |
${dataRows}
${
  factRows
    ? `
Computed facts (ground truth — calculated in code from the full dataset, not the sample above):
${factRows}
`
    : ""
}
Return exactly this JSON shape — no extra keys, no omitted keys:
{
  "summary": "2-3 sentence executive summary of what this data shows and its key story",
  "insights": [
    "specific observation referencing an actual number or pattern from the data",
    "another distinct insight with a concrete value",
    "third insight"
  ],
  "charts": [
    {
      "type": "bar|line|area|pie|scatter",
      "title": "descriptive chart title",
      "x_key": "exact column name for the x-axis (must match a column name above)",
      "y_key": "exact column name for the y-axis (must match a column name above)",
      "data": [{"<x_key value>": "label", "<y_key value>": 42}],
      "insight": "one sentence about what this chart reveals"
    }
  ],
  "recommendations": [
    "actionable recommendation based on the data",
    "another recommendation"
  ]
}

${focusText ? `Priority focus: "${focusText}". Weight your summary, insights, charts, and recommendations toward this area.\n` : ""}Rules:
- Never add a currency symbol ($) or a percent sign (%) to a figure unless that exact formatting already appears somewhere above (a rate fact that already ends in % is fine to repeat as-is). Nothing in the data given to you is formatted with a dollar sign, so putting one on any figure is invented, not reported.
${factRows ? "- For any claim about a total, average, high, low, best/worst period, or period-over-period change, use the exact figures from \"Computed facts\" above — do not calculate your own from the sample rows, which are a subset and will produce wrong answers.\n- Interpret the computed facts — explain what they mean, why they might matter, or how they compare to each other — rather than just reading the list back as prose.\n- Only describe a metric as \"stable\", \"steady\", \"flat\", \"unchanged\", or \"consistent\" when BOTH hold: the start-to-end change is small (under roughly 5%) AND its \"Range in ...\"/\"... range\" fact above is narrow relative to the average. A start and end that are close is not enough on its own — the metric may have swung widely in between (e.g. a rate that went from 2.9% to 2.8% but ranged 1.6%–3.8% along the way is NOT stable). If the range fact shows a wide spread, do not use stability language even if start ≈ end.\n- When describing a trend with before/after phrasing (\"improved from X to Y\", \"rose from X to Y\", \"fell from X to Y\", \"declined from X to Y\", etc.), X and Y must be the start and end values from the matching \"Change in ... (start to end)\" fact — never substitute the Highest/Lowest values, even if they tell a cleaner story. Mentioning a high or low point on its own (e.g. \"peaked at X in March\") is fine; splicing it into a from-X-to-Y trend sentence is not, unless that point is actually the first or last period.\n- When an insight or chart caption credits a specific period as another column's peak, high point, or low point, that period must exactly match that column's own Highest/Lowest fact above — do not assume two different columns peaked or dipped in the same period unless their facts actually say so.\n" : ""}${downPeriodColumns.length > 0 ? `- These columns had periods that declined: ${downPeriodColumns.join(", ")} (see "Down periods in ..." above for which ones). Any chart using one of these columns as y_key must have an insight that names at least one of its declines — do not describe only the overall upward trend and skip over the dip.\n- Do not describe growth or decline in these columns using words like "throughout", "every month", "all year", "entire period", or "consistently" — periods actually declined, so say "most periods" or name the exception instead.\n` : ""}${singleYear ? "- Every period in this dataset falls within a single calendar year (see \"Time span\" above) — never call a change \"year-over-year\" or \"YoY\"; say \"month-over-month\" or \"period-over-period\" instead.\n" : ""}${hasRateFacts ? "- A rising raw count (e.g. returns, complaints, errors) is not automatically a problem — check the matching rate fact above (e.g. \"Return rate\"). If the rate held steady or fell while volume grew, describe the raw increase as a function of growth, not as a worsening trend. This applies everywhere, including recommendations — do not recommend action on a raw count increase whose rate is flat or falling.\n" : ""}- Prefer naming a period directly (e.g. "September") over a relative-position label like "mid-year" or "early quarter" — those are easy to get wrong and add no information the period name doesn't already give.
- insights: exactly 3-5 strings, each citing a specific number or pattern visible in the sample data
- charts: exactly 2-4 items; choose the best type for the data — "bar" for comparisons, "line" for time series, "area" for cumulative/volume trends, "pie" for part-of-whole distributions (max 8 slices), "scatter" for correlation between two numeric columns; x_key and y_key must be exact column names from the Column metadata table; data array must use real values from the sample rows; vary chart types — do not use the same type for all charts
- recommendations: exactly 3-5 strings, each a concrete action
- Return ONLY the raw JSON object starting with { and ending with }`;}

export function buildChatSystemPrompt(
  fileName: string,
  result: AnalysisResult
): string {
  const charts = result.charts
    .map((c) => `  - "${c.title}": ${c.insight}`)
    .join("\n");

  return `You are a concise data analyst assistant. The user has uploaded a file called "${fileName}" and received the following AI-generated analysis.

ANALYSIS CONTEXT:
Summary: ${result.summary}

Key Insights:
${result.insights.map((ins, i) => `${i + 1}. ${ins}`).join("\n")}

Charts:
${charts}

Recommendations:
${result.recommendations.map((r, i) => `${i + 1}. ${r}`).join("\n")}

RULES:
- Answer in 2–4 sentences unless more detail is clearly needed
- Reference specific numbers or patterns from the insights when relevant
- If asked about something outside this dataset, say so briefly and redirect
- Never invent data not present in the analysis above`;
}
