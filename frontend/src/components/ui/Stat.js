import { cn } from "@/utils/cn";

const trendToneClasses = {
  positive: "text-success",
  negative: "text-danger",
  neutral: "text-subtle",
};

/**
 * A single stat tile: large tabular value, muted label, optional trend chip.
 * `trend.tone` is caller-supplied because "up" isn't universally good — a
 * rising bounce rate is bad, a rising session count is good.
 */
export function Stat({ label, value, trend, className }) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <span className="text-sm text-muted">{label}</span>
      <div className="flex items-baseline gap-2">
        <span className="font-mono text-2xl font-medium tabular-nums text-ink">
          {value}
        </span>
        {trend && (
          <span
            className={cn(
              "text-xs font-medium tabular-nums",
              trendToneClasses[trend.tone ?? "neutral"]
            )}
          >
            {trend.label}
          </span>
        )}
      </div>
    </div>
  );
}
