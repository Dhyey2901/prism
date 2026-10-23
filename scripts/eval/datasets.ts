// Fixture datasets for the claim-accuracy eval (scripts/eval/run.ts).
//
// Each dataset is small enough to check by hand. `expected` is the ground
// truth — hardcoded, not computed at eval time — so the eval can't pass by
// circularly asking lib/stats.ts to grade its own homework. The numbers
// were produced once via lib/stats.ts and checked against the raw rows
// (see the comment on each dataset); if you change the arithmetic in
// lib/stats.ts, re-verify these by hand before trusting a score change.

export interface EvalDataset {
  name: string;
  labelColumn: string;
  valueColumn: string;
  rows: Record<string, string | number>[];
  expected: {
    bestLabel: string;
    worstLabel: string;
    downLabels: string[]; // periods where value decreased vs. the previous row
    startEndPctChange: number; // rounded to 1 decimal, same rounding as formatPct
    // Phrases the narrative must NOT contain (case-insensitive substring) —
    // e.g. wrong terminology or an unwarranted alarmist framing.
    forbiddenPhrases?: string[];
    // Phrases the narrative MUST contain — a grounding check that the AI
    // actually looked at the relevant computed fact.
    requiredPhrases?: string[];
  };
}

export const evalDatasets: EvalDataset[] = [
  {
    name: "Steady uptrend with one big jump",
    labelColumn: "month",
    valueColumn: "revenue",
    rows: [
      { month: "Jan", revenue: 100 },
      { month: "Feb", revenue: 108 },
      { month: "Mar", revenue: 120 },
      { month: "Apr", revenue: 145 },
      { month: "May", revenue: 160 },
    ],
    expected: { bestLabel: "May", worstLabel: "Jan", downLabels: [], startEndPctChange: 60.0 },
  },
  {
    name: "Steady downtrend with a tied largest drop",
    labelColumn: "month",
    valueColumn: "subscribers",
    rows: [
      { month: "Jan", subscribers: 500 },
      { month: "Feb", subscribers: 470 },
      { month: "Mar", subscribers: 430 },
      { month: "Apr", subscribers: 420 },
      { month: "May", subscribers: 380 },
    ],
    expected: { bestLabel: "Jan", worstLabel: "May", downLabels: ["Feb", "Mar", "Apr", "May"], startEndPctChange: -24.0 },
  },
  {
    name: "Single dip in the middle of growth",
    labelColumn: "day",
    valueColumn: "temperature",
    rows: [
      { day: "Mon", temperature: 70 },
      { day: "Tue", temperature: 72 },
      { day: "Wed", temperature: 65 },
      { day: "Thu", temperature: 74 },
      { day: "Fri", temperature: 76 },
    ],
    expected: { bestLabel: "Fri", worstLabel: "Wed", downLabels: ["Wed"], startEndPctChange: 8.6 },
  },
  {
    name: "Early dip then recovery",
    labelColumn: "quarter",
    valueColumn: "signups",
    rows: [
      { quarter: "Q1", signups: 200 },
      { quarter: "Q2", signups: 150 },
      { quarter: "Q3", signups: 210 },
      { quarter: "Q4", signups: 260 },
    ],
    expected: { bestLabel: "Q4", worstLabel: "Q2", downLabels: ["Q2"], startEndPctChange: 30.0 },
  },
  {
    name: "Late dip after sustained growth",
    labelColumn: "week",
    valueColumn: "active_users",
    rows: [
      { week: "W1", active_users: 1000 },
      { week: "W2", active_users: 1100 },
      { week: "W3", active_users: 1250 },
      { week: "W4", active_users: 1050 },
    ],
    expected: { bestLabel: "W3", worstLabel: "W1", downLabels: ["W4"], startEndPctChange: 5.0 },
  },
  {
    name: "Two non-adjacent dips",
    labelColumn: "month",
    valueColumn: "orders",
    rows: [
      { month: "Jan", orders: 300 },
      { month: "Feb", orders: 280 },
      { month: "Mar", orders: 340 },
      { month: "Apr", orders: 310 },
      { month: "May", orders: 360 },
    ],
    expected: { bestLabel: "May", worstLabel: "Feb", downLabels: ["Feb", "Apr"], startEndPctChange: 20.0 },
  },
  {
    name: "Overall decline with one up-tick",
    labelColumn: "month",
    valueColumn: "churn_rate",
    rows: [
      { month: "Jan", churn_rate: 5.0 },
      { month: "Feb", churn_rate: 4.2 },
      { month: "Mar", churn_rate: 4.6 },
      { month: "Apr", churn_rate: 3.1 },
    ],
    expected: { bestLabel: "Jan", worstLabel: "Apr", downLabels: ["Feb", "Apr"], startEndPctChange: -38.0 },
  },
  {
    name: "Tied largest increase, twice",
    labelColumn: "month",
    valueColumn: "revenue",
    rows: [
      { month: "Jan", revenue: 100 },
      { month: "Feb", revenue: 115 },
      { month: "Mar", revenue: 95 },
      { month: "Apr", revenue: 110 },
    ],
    expected: { bestLabel: "Feb", worstLabel: "Mar", downLabels: ["Mar"], startEndPctChange: 10.0 },
  },
  {
    name: "Small dataset, big outlier at the end",
    labelColumn: "period",
    valueColumn: "sales",
    rows: [
      { period: "P1", sales: 40 },
      { period: "P2", sales: 42 },
      { period: "P3", sales: 44 },
      { period: "P4", sales: 200 },
    ],
    expected: { bestLabel: "P4", worstLabel: "P1", downLabels: [], startEndPctChange: 400.0 },
  },
  {
    name: "Big outlier at the start, then flat decline",
    labelColumn: "period",
    valueColumn: "incidents",
    rows: [
      { period: "P1", incidents: 90 },
      { period: "P2", incidents: 20 },
      { period: "P3", incidents: 18 },
      { period: "P4", incidents: 15 },
    ],
    expected: { bestLabel: "P1", worstLabel: "P4", downLabels: ["P2", "P3", "P4"], startEndPctChange: -83.3 },
  },
  {
    name: "Negative values with an increase that's still negative",
    labelColumn: "month",
    valueColumn: "net_change",
    rows: [
      { month: "Jan", net_change: -50 },
      { month: "Feb", net_change: -30 },
      { month: "Mar", net_change: -60 },
      { month: "Apr", net_change: -10 },
    ],
    expected: { bestLabel: "Apr", worstLabel: "Mar", downLabels: ["Mar"], startEndPctChange: 80.0 },
  },
  {
    name: "Long flat stretch broken by one move",
    labelColumn: "month",
    valueColumn: "price",
    rows: [
      { month: "Jan", price: 20 },
      { month: "Feb", price: 20 },
      { month: "Mar", price: 20 },
      { month: "Apr", price: 25 },
      { month: "May", price: 25 },
    ],
    expected: { bestLabel: "Apr", worstLabel: "Jan", downLabels: [], startEndPctChange: 25.0 },
  },
  {
    name: "Twelve months within a single year (no YoY language)",
    labelColumn: "month",
    valueColumn: "revenue",
    rows: [
      { month: "Jan 2024", revenue: 100 },
      { month: "Feb 2024", revenue: 110 },
      { month: "Mar 2024", revenue: 120 },
      { month: "Apr 2024", revenue: 130 },
      { month: "May 2024", revenue: 140 },
      { month: "Jun 2024", revenue: 150 },
      { month: "Jul 2024", revenue: 160 },
      { month: "Aug 2024", revenue: 170 },
      { month: "Sep 2024", revenue: 180 },
      { month: "Oct 2024", revenue: 190 },
      { month: "Nov 2024", revenue: 200 },
      { month: "Dec 2024", revenue: 210 },
    ],
    expected: {
      bestLabel: "Dec 2024",
      worstLabel: "Jan 2024",
      downLabels: [],
      startEndPctChange: 110.0,
      forbiddenPhrases: ["year-over-year", "year over year", "yoy", "year-on-year"],
    },
  },
  {
    name: "Rising return count with a flat-to-falling return rate",
    labelColumn: "month",
    valueColumn: "orders",
    rows: [
      { month: "Jan", orders: 1000, returns: 29 },
      { month: "Feb", orders: 1200, returns: 32 },
      { month: "Mar", orders: 1400, returns: 36 },
      { month: "Apr", orders: 1600, returns: 40 },
      { month: "May", orders: 1800, returns: 48 },
      { month: "Jun", orders: 2000, returns: 56 },
    ],
    // Orders +100%, returns +93% — but the return rate actually went from
    // 2.9% to 2.8%. A model doing arithmetic on the raw count alone would
    // call the returns increase a problem; it isn't one.
    expected: {
      bestLabel: "Jun",
      worstLabel: "Jan",
      downLabels: [],
      startEndPctChange: 100.0,
      forbiddenPhrases: ["concerning", "alarming", "red flag", "warning sign", "needs attention", "a problem"],
      requiredPhrases: ["2.9", "2.8"],
    },
  },
  {
    name: "Rate near-equal at start/end but wide swing in between",
    labelColumn: "month",
    valueColumn: "orders",
    rows: [
      { month: "Jan", orders: 1000, returns: 29 },
      { month: "Feb", orders: 1100, returns: 18 },
      { month: "Mar", orders: 900, returns: 34 },
      { month: "Apr", orders: 1200, returns: 30 },
      { month: "May", orders: 1050, returns: 32 },
      { month: "Jun", orders: 1150, returns: 32 },
    ],
    // Return rate: Jan 2.9% ... Jun 2.8% — close at the endpoints, but it
    // ranged 1.6% (Feb) to 3.8% (Mar) in between. Calling that "stable"
    // because start ≈ end, without checking the range, is the bug.
    expected: {
      bestLabel: "Apr",
      worstLabel: "Mar",
      downLabels: ["Mar", "May"],
      startEndPctChange: 15.0,
      forbiddenPhrases: ["stable", "steady", "consistent", "unchanged", "remained flat", "hasn't changed"],
    },
  },
  {
    name: "Overall growth with 5 of 11 down months",
    labelColumn: "month",
    valueColumn: "revenue",
    rows: [
      { month: "Jan", revenue: 100 },
      { month: "Feb", revenue: 95 },
      { month: "Mar", revenue: 110 },
      { month: "Apr", revenue: 105 },
      { month: "May", revenue: 120 },
      { month: "Jun", revenue: 115 },
      { month: "Jul", revenue: 130 },
      { month: "Aug", revenue: 125 },
      { month: "Sep", revenue: 140 },
      { month: "Oct", revenue: 135 },
      { month: "Nov", revenue: 150 },
      { month: "Dec", revenue: 160 },
    ],
    // Net growth (+60%) makes "grew throughout" tempting, but 5 of the 11
    // month-over-month moves actually declined.
    expected: {
      bestLabel: "Dec",
      worstLabel: "Feb",
      downLabels: ["Feb", "Apr", "Jun", "Aug", "Oct"],
      startEndPctChange: 60.0,
      forbiddenPhrases: ["throughout", "every month", "all year", "entire period", "consistently"],
    },
  },
];
