import { formatNumber } from "@/utils/format";

/**
 * Ranked list with an inline proportional bar — used for sources, browsers,
 * OS, and device-type breakdowns. Deliberately not a Recharts bar chart:
 * these are simple ranked totals, an axis/legend would be overhead.
 * `items`: [{ label, count }], already sorted by the caller.
 */
export function RankedBarList({ items }) {
  const maxCount = Math.max(...items.map((item) => item.count), 1);

  return (
    <ul className="flex flex-col gap-2.5 px-5 py-4">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-3">
          <span className="w-32 shrink-0 truncate text-sm text-ink">
            {item.label}
          </span>
          <div className="h-1.5 flex-1 rounded-full bg-surface-hover">
            <div
              className="h-full rounded-full bg-chart-1"
              style={{ width: `${(item.count / maxCount) * 100}%` }}
            />
          </div>
          <span className="w-14 shrink-0 text-right font-mono text-xs tabular-nums text-muted">
            {formatNumber(item.count)}
          </span>
        </li>
      ))}
    </ul>
  );
}
