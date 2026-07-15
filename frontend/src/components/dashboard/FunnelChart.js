import { Workflow } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatNumber, formatPercent } from "@/utils/format";

/** Horizontal step-over-step funnel: one hue, bars shrink to each step's share of the first step. */
export function FunnelChart({ steps }) {
  if (steps.length === 0) {
    return (
      <EmptyState
        icon={<Workflow size={18} />}
        title="No funnel steps configured"
        description="Add at least one step below to see conversion counts."
      />
    );
  }

  const firstStepCount = steps[0]?.sessionCount || 1;

  return (
    <div className="flex flex-col gap-4 px-5 py-5">
      {steps.map((step, index) => {
        const widthPct = Math.max((step.sessionCount / firstStepCount) * 100, 2);
        return (
          <div key={index} className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-sm font-medium text-ink">
                {index + 1}. {step.label}
              </span>
              <span className="shrink-0 font-mono text-xs tabular-nums text-muted">
                {formatNumber(step.sessionCount)} sessions ·{" "}
                {formatPercent(step.percentOfFirstStep, { fractionDigits: 0 })} of step 1
                {index > 0 &&
                  ` · ${formatPercent(step.percentOfPreviousStep, { fractionDigits: 0 })} of prior step`}
              </span>
            </div>
            <div className="h-6 w-full bg-surface-hover">
              <div
                className="h-full rounded-r-xs bg-chart-1"
                style={{ width: `${widthPct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
