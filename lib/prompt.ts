import type { AnalysisResult, DatasetSummary } from "@/types";

export function buildAnalysisPrompt(dataset: DatasetSummary): string {
  const colRows = dataset.columns
    .map(
      (c) =>
        `| ${c.name} | ${c.type} | ${c.nullCount} | ${c.uniqueCount} |`
    )
    .join("\n");

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
      "type": "bar",
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

Rules:
- insights: exactly 3-5 strings, each citing a specific number or pattern visible in the sample data
- charts: exactly 1-3 items; "type" must be "bar", "line", or "pie"; x_key and y_key must be exact column names from the Column metadata table; data array must use real values from the sample rows
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
