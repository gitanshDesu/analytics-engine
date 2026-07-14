import { Stat } from "@/components/ui/Stat";
import { formatNumber, formatPercent, formatDuration } from "@/utils/format";

/** Renders the SummaryResponse as a row of stat tiles. */
export function StatRow({ summary }) {
  const returningShare =
    summary.totalUniqueVisitors > 0
      ? (summary.returningVisitors / summary.totalUniqueVisitors) * 100
      : 0;

  const stats = [
    { label: "Sessions", value: formatNumber(summary.totalSessions) },
    {
      label: "Unique visitors",
      value: formatNumber(summary.totalUniqueVisitors),
    },
    { label: "Page views", value: formatNumber(summary.totalPageViews) },
    { label: "Bounce rate", value: formatPercent(summary.bounceRate) },
    {
      label: "Avg. session",
      value: formatDuration(summary.avgSessionDurationSeconds),
    },
    {
      label: "Pages / session",
      value: summary.avgPagesPerSession.toFixed(2),
    },
    {
      label: "Returning visitors",
      value: formatPercent(returningShare, { fractionDigits: 0 }),
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-5 border-b border-border px-5 py-5 sm:grid-cols-4">
      {stats.map((stat) => (
        <Stat key={stat.label} label={stat.label} value={stat.value} />
      ))}
    </div>
  );
}
