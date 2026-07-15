import { formatNumber } from "@/utils/format";

const isUrl = (label) => /^https?:\/\//i.test(label);

/**
 * Ranked list with a proportional bar under each label — used for sources,
 * browsers, OS, device-type, and event breakdowns. Deliberately not a
 * Recharts bar chart: these are simple ranked totals, an axis/legend would
 * be overhead. `items`: [{ label, count }], already sorted by the caller.
 *
 * URL-shaped labels (hrefs, referrers) render full-length and clickable —
 * copy-paste-ability matters more than density there. Everything else
 * (button/card text, often a whole card's concatenated textContent with no
 * separators) clamps to one line with the full value in a native `title`
 * tooltip: a wall of run-on text is noise, not more information.
 */
export function RankedBarList({ items }) {
  const maxCount = Math.max(...items.map((item) => item.count), 1);

  return (
    <ul className="divide-y divide-border px-5">
      {items.map((item) => (
        <li key={item.label} className="flex flex-col gap-1.5 py-3">
          <div className="flex items-start justify-between gap-3">
            {isUrl(item.label) ? (
              <a
                href={item.label}
                target="_blank"
                rel="noopener noreferrer"
                className="min-w-0 flex-1 break-all font-mono text-xs text-ink underline decoration-border-strong underline-offset-2 hover:text-accent hover:decoration-accent"
              >
                {item.label}
              </a>
            ) : (
              <span
                title={item.label}
                className="line-clamp-1 min-w-0 flex-1 text-sm text-ink"
              >
                {item.label}
              </span>
            )}
            <span className="shrink-0 font-mono text-xs tabular-nums text-muted">
              {formatNumber(item.count)}
            </span>
          </div>
          <div className="h-1 w-full bg-surface-hover">
            <div
              className="h-full rounded-r-xs bg-chart-1"
              style={{ width: `${(item.count / maxCount) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
