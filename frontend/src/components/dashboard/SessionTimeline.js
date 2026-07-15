import { Eye, MousePointerClick, Link2, FileText, MoveVertical } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { describeEvent, eventTypeLabel } from "@/components/dashboard/utils/describeEvent";
import { formatDateTime } from "@/utils/format";

const EVENT_ICONS = {
  PAGE_VIEW: Eye,
  BUTTON_CLICK: MousePointerClick,
  LINK_CLICK: Link2,
  FORM_SUBMIT: FileText,
  SCROLL: MoveVertical,
};

/** Ordered event-by-event timeline for a single session. */
export function SessionTimeline({ timeline }) {
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
              <span className="line-clamp-1 text-sm text-ink" title={description}>
                {description}
              </span>
              <span className="truncate font-mono text-xs text-subtle" title={event.pagePath}>
                {event.pagePath}
              </span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
