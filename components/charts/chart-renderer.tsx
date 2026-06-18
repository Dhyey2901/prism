"use client";

import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  ScatterChart,
  Scatter,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { ChartConfig } from "@/types";

const COLORS = [
  "#6366f1",
  "#818cf8",
  "#a5b4fc",
  "#c7d2fe",
  "#4f46e5",
  "#4338ca",
];

type TooltipEntry = {
  name: string;
  value: number | string;
  color?: string;
};

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string | number;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-border bg-popover px-3 py-2 text-xs shadow-md">
      {label !== undefined && (
        <p className="mb-1 font-medium text-foreground">{String(label)}</p>
      )}
      {payload.map((p, i) => (
        <p key={i} className="text-muted-foreground">
          {p.name}:{" "}
          <span className="font-mono text-foreground">{String(p.value)}</span>
        </p>
      ))}
    </div>
  );
}

function BarRenderer({ chart }: { chart: ChartConfig }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart
        data={chart.data}
        margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
      >
        <XAxis
          dataKey={chart.x_key}
          tick={{ fontSize: 11, fill: "#71717a" }}
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fontSize: 11, fill: "#71717a" }}
          axisLine={false}
          tickLine={false}
          width={56}
        />
        <Tooltip
          content={(props) => (
            <ChartTooltip
              active={props.active}
              payload={props.payload as unknown as TooltipEntry[] | undefined}
              label={props.label as string | number | undefined}
            />
          )}
          cursor={{ fill: "rgba(99,102,241,0.08)" }}
        />
        <Bar
          dataKey={chart.y_key}
          fill={COLORS[0]}
          radius={[4, 4, 0, 0]}
          maxBarSize={48}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

function LineRenderer({ chart }: { chart: ChartConfig }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart
        data={chart.data}
        margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
      >
        <XAxis
          dataKey={chart.x_key}
          tick={{ fontSize: 11, fill: "#71717a" }}
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fontSize: 11, fill: "#71717a" }}
          axisLine={false}
          tickLine={false}
          width={56}
        />
        <Tooltip
          content={(props) => (
            <ChartTooltip
              active={props.active}
              payload={props.payload as unknown as TooltipEntry[] | undefined}
              label={props.label as string | number | undefined}
            />
          )}
        />
        <Line
          type="monotone"
          dataKey={chart.y_key}
          stroke={COLORS[0]}
          strokeWidth={2}
          dot={{ fill: COLORS[0], strokeWidth: 0, r: 3 }}
          activeDot={{ r: 5, fill: COLORS[0] }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

function AreaRenderer({ chart }: { chart: ChartConfig }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart
        data={chart.data}
        margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
      >
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={COLORS[0]} stopOpacity={0.3} />
            <stop offset="95%" stopColor={COLORS[0]} stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey={chart.x_key}
          tick={{ fontSize: 11, fill: "#71717a" }}
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fontSize: 11, fill: "#71717a" }}
          axisLine={false}
          tickLine={false}
          width={56}
        />
        <Tooltip
          content={(props) => (
            <ChartTooltip
              active={props.active}
              payload={props.payload as unknown as TooltipEntry[] | undefined}
              label={props.label as string | number | undefined}
            />
          )}
        />
        <Area
          type="monotone"
          dataKey={chart.y_key}
          stroke={COLORS[0]}
          strokeWidth={2}
          fill="url(#areaGrad)"
          dot={{ fill: COLORS[0], strokeWidth: 0, r: 3 }}
          activeDot={{ r: 5, fill: COLORS[0] }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function ScatterRenderer({ chart }: { chart: ChartConfig }) {
  const scatterData = chart.data.map((row) => ({
    x: Number(row[chart.x_key] ?? 0),
    y: Number(row[chart.y_key] ?? 0),
  }));

  return (
    <ResponsiveContainer width="100%" height={240}>
      <ScatterChart margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <XAxis
          dataKey="x"
          type="number"
          name={chart.x_key}
          tick={{ fontSize: 11, fill: "#71717a" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          dataKey="y"
          type="number"
          name={chart.y_key}
          tick={{ fontSize: 11, fill: "#71717a" }}
          axisLine={false}
          tickLine={false}
          width={56}
        />
        <Tooltip
          content={(props) => (
            <ChartTooltip
              active={props.active}
              payload={props.payload as unknown as TooltipEntry[] | undefined}
            />
          )}
          cursor={{ strokeDasharray: "3 3" }}
        />
        <Scatter data={scatterData} fill={COLORS[0]} opacity={0.8} />
      </ScatterChart>
    </ResponsiveContainer>
  );
}

function PieRenderer({ chart }: { chart: ChartConfig }) {
  const pieData = chart.data.map((row) => ({
    name: String(row[chart.x_key] ?? ""),
    value: Number(row[chart.y_key] ?? 0),
  }));

  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie
          data={pieData}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={90}
          innerRadius={44}
        >
          {pieData.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          content={(props) => (
            <ChartTooltip
              active={props.active}
              payload={props.payload as unknown as TooltipEntry[] | undefined}
            />
          )}
        />
        <Legend
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: 11, color: "#71717a" }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function ChartRenderer({ chart }: { chart: ChartConfig }) {
  if (chart.type === "line") return <LineRenderer chart={chart} />;
  if (chart.type === "area") return <AreaRenderer chart={chart} />;
  if (chart.type === "pie") return <PieRenderer chart={chart} />;
  if (chart.type === "scatter") return <ScatterRenderer chart={chart} />;
  return <BarRenderer chart={chart} />;
}
