"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { formatDateLabel, formatNumber } from "@/utils/format";

const SERIES = [
  { key: "sessions", label: "Sessions", color: "var(--chart-1)" },
  { key: "pageViews", label: "Page views", color: "var(--chart-2)" },
];

/** Values lead, series name follows — inverted from the legend's hierarchy. */
function ChartTooltip({ active, payload, label, granularity }) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2 shadow-(--shadow-card)">
      <p className="mb-1.5 text-xs text-subtle">
        {formatDateLabel(label, granularity)}
      </p>
      <div className="flex flex-col gap-1">
        {payload.map((entry) => (
          <div key={entry.dataKey} className="flex items-center gap-2 text-xs">
            <span
              className="h-0.5 w-3 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-muted">{entry.name}</span>
            <span className="ml-auto font-mono font-medium tabular-nums text-ink">
              {formatNumber(entry.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Dual-series (sessions / page views) time series over the selected range. */
export function TrafficChart({ data, granularity = "daily" }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid
          vertical={false}
          stroke="var(--border)"
          strokeDasharray="0"
        />
        <XAxis
          dataKey="date"
          tickFormatter={(value) => formatDateLabel(value, granularity)}
          tick={{ fill: "var(--subtle)", fontSize: 12 }}
          axisLine={{ stroke: "var(--border)" }}
          tickLine={false}
        />
        <YAxis
          tickFormatter={formatNumber}
          tick={{ fill: "var(--subtle)", fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          width={40}
        />
        <Tooltip
          content={<ChartTooltip granularity={granularity} />}
          cursor={{ stroke: "var(--border-strong)", strokeWidth: 1 }}
        />
        <Legend
          iconType="plainline"
          wrapperStyle={{ fontSize: 12, color: "var(--muted)" }}
        />
        {SERIES.map((series) => (
          <Area
            key={series.key}
            type="monotone"
            dataKey={series.key}
            name={series.label}
            stroke={series.color}
            fill={series.color}
            fillOpacity={0.1}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--surface)" }}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}
