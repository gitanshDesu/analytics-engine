"use client";

import { useState } from "react";
import { Eye, MousePointerClick, Link2, SquareDashedMousePointer, FileText, MoveVertical, ChevronDown, ChevronRight } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { describeEvent, eventTypeLabel } from "@/components/dashboard/utils/describeEvent";
import { formatDateTime } from "@/utils/format";

const EVENT_ICONS = {
  PAGE_VIEW: Eye,
  BUTTON_CLICK: MousePointerClick,
  LINK_CLICK: Link2,
  ELEMENT_CLICK: SquareDashedMousePointer,
  FORM_SUBMIT: FileText,
  SCROLL: MoveVertical,
};

/** Ordered event-by-event timeline for a single session. */
export function SessionTimeline({ timeline }) {
  const [expanded, setExpanded] = useState(() => new Set());

  const toggleExpanded = (index) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });

  if (timeline.length === 0) {
    return (
      <EmptyState
        icon={<Eye size={18} />}
        title="No events recorded"
        description="This session ended before any events were captured."
      />
    );
  }

  return (
    <ol className="flex flex-col divide-y divide-border px-5">
      {timeline.map((event, index) => {
        const Icon = EVENT_ICONS[event.eventType] ?? Eye;
        const description = describeEvent(event);
        // `detail` (div/button/link clicks only) is the clicked element's full content —
        // e.g. a whole fare card's text vs. `description`'s short label.
        const detail = event.payload?.detail;
        const hasDetail = Boolean(detail) && detail !== description;
        const isExpanded = expanded.has(index);

        return (
          <li key={index} className="flex items-start gap-3 py-3">
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-hover text-subtle">
              <Icon size={14} />
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-medium uppercase tracking-wide text-subtle">
                  {eventTypeLabel(event.eventType)}
                </span>
                <span className="shrink-0 font-mono text-xs tabular-nums text-muted">
                  {formatDateTime(event.eventTime)}
                </span>
              </div>
              <span className="line-clamp-1 text-sm text-ink">{description}</span>
              <span className="truncate font-mono text-xs text-subtle" title={event.pagePath}>
                {event.pagePath}
              </span>
              {hasDetail && (
                <>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="mt-1 h-6 w-fit px-1.5 text-xs"
                    onClick={() => toggleExpanded(index)}
                    aria-expanded={isExpanded}
                  >
                    {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                    {isExpanded ? "Hide details" : "Show details"}
                  </Button>
                  {isExpanded && (
                    <p className="mt-1 rounded-md bg-surface-hover px-2 py-1.5 text-xs text-muted">
                      {detail}
                    </p>
                  )}
                </>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
