import type { AnalysisResult } from "@/types";

// Pre-generated report for public/sample.csv. Used by "Try with sample data"
// so the demo works even when the AI provider is down or out of quota —
// this is the path recruiters actually click.
export const demoReport: AnalysisResult = {
  summary:
    "Revenue grew steadily across 2024, climbing from $142K in January to $244K in December — a 72% increase. Customer count rose in lockstep from 1,240 to 1,789, while churn fell from 2.1% to 1.0%, suggesting retention efforts paid off as the customer base scaled. Profit margin expanded from 31% to 45% over the same period.",
  insights: [
    "Revenue grew 72% year-over-year, from $142,000 in January to $244,000 in December.",
    "Churn rate more than halved, dropping from 2.1% to 1.0%, even as the customer base grew 44%.",
    "Profit margin expanded from 31% to 45%, indicating expenses grew slower than revenue.",
    "The strongest single-month growth came in March, with revenue up nearly 17% month-over-month (from $138,000 to $161,000).",
  ],
  charts: [
    {
      type: "line",
      title: "Monthly Revenue",
      x_key: "month",
      y_key: "revenue",
      data: [
        { month: "Jan", revenue: 142000 },
        { month: "Feb", revenue: 138000 },
        { month: "Mar", revenue: 161000 },
        { month: "Apr", revenue: 175000 },
        { month: "May", revenue: 168000 },
        { month: "Jun", revenue: 182000 },
        { month: "Jul", revenue: 194000 },
        { month: "Aug", revenue: 188000 },
        { month: "Sep", revenue: 201000 },
        { month: "Oct", revenue: 215000 },
        { month: "Nov", revenue: 228000 },
        { month: "Dec", revenue: 244000 },
      ],
      insight: "Revenue trended up all year, with only three minor dips (Feb, May, Aug) interrupting steady growth.",
    },
    {
      type: "bar",
      title: "Revenue vs. Expenses",
      x_key: "month",
      y_key: "profit",
      data: [
        { month: "Jan", profit: 44000 },
        { month: "Apr", profit: 67000 },
        { month: "Jul", profit: 78000 },
        { month: "Oct", profit: 91000 },
        { month: "Dec", profit: 109000 },
      ],
      insight: "Profit nearly tripled from Q1 to Q4, outpacing revenue growth as margins widened.",
    },
    {
      type: "line",
      title: "Customer Growth",
      x_key: "month",
      y_key: "customers",
      data: [
        { month: "Jan", customers: 1240 },
        { month: "Mar", customers: 1345 },
        { month: "May", customers: 1389 },
        { month: "Jul", customers: 1523 },
        { month: "Sep", customers: 1578 },
        { month: "Nov", customers: 1704 },
        { month: "Dec", customers: 1789 },
      ],
      insight: "Customer growth was consistent, with no month showing a decline.",
    },
    {
      type: "area",
      title: "Churn Rate Over Time",
      x_key: "month",
      y_key: "churn_rate",
      data: [
        { month: "Jan", churn_rate: 2.1 },
        { month: "Mar", churn_rate: 1.8 },
        { month: "May", churn_rate: 1.9 },
        { month: "Jul", churn_rate: 1.4 },
        { month: "Sep", churn_rate: 1.3 },
        { month: "Nov", churn_rate: 1.1 },
        { month: "Dec", churn_rate: 1.0 },
      ],
      insight: "Churn fell by more than half across the year, the clearest sign of improving retention.",
    },
  ],
  recommendations: [
    "Investigate what changed operationally around March, when growth accelerated, and repeat it.",
    "Churn is trending down — double down on whatever retention changes started in Q2.",
    "Expense growth has lagged revenue growth; consider reinvesting part of the expanding margin into customer acquisition.",
  ],
};

export const demoFileName = "sample.csv";
