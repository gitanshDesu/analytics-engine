import { MousePointerClick } from "lucide-react";
import { Tabs } from "@/components/ui/Tabs";
import { EmptyState } from "@/components/ui/EmptyState";
import { RankedBarList } from "@/components/dashboard/RankedBarList";

const EVENT_TYPE_LABELS = {
  PAGE_VIEW: "Page views",
  BUTTON_CLICK: "Button clicks",
  LINK_CLICK: "Link clicks",
  ELEMENT_CLICK: "Element clicks",
  SCROLL: "Scroll",
  FORM_SUBMIT: "Form submits",
};

function EventList({ items, description }) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={<MousePointerClick size={18} />}
        title="No events yet"
        description={description}
      />
    );
  }
  return <RankedBarList items={items} />;
}

/** Tabbed event-type / link-click / button-click / element-click / form-submit / scroll-depth breakdowns — one EventsResponse, six views. */
export function EventsPanel({ events }) {
  const byType = events.eventTypeBreakdown.map((item) => ({
    label: EVENT_TYPE_LABELS[item.label] ?? item.label,
    count: item.count,
  }));
  const scrollDepth = events.scrollDepthBreakdown.map((item) => ({
    label: `${item.label}%`,
    count: item.count,
  }));

  return (
    <Tabs
      items={[
        {
          value: "type",
          label: "By type",
          content: (
            <EventList
              items={byType}
              description="Page views, clicks, form submits and scroll depth will show up here once visitors start interacting with your site."
            />
          ),
        },
        {
          value: "links",
          label: "Link clicks",
          content: (
            <EventList
              items={events.topLinkClicks}
              description="Clicked links will show up here."
            />
          ),
        },
        {
          value: "buttons",
          label: "Button clicks",
          content: (
            <EventList
              items={events.topButtonClicks}
              description="Clicked buttons will show up here."
            />
          ),
        },
        {
          value: "elements",
          label: "Element clicks",
          content: (
            <EventList
              items={events.topElementClicks}
              description="Clicked divs, paragraphs and other non-interactive elements will show up here."
            />
          ),
        },
        {
          value: "forms",
          label: "Form submits",
          content: (
            <EventList
              items={events.topFormSubmits}
              description="Submitted forms will show up here."
            />
          ),
        },
        {
          value: "scroll",
          label: "Scroll depth",
          content: (
            <EventList
              items={scrollDepth}
              description="Scroll-depth milestones (25/50/75/100%) will show up here."
            />
          ),
        },
      ]}
    />
  );
}
