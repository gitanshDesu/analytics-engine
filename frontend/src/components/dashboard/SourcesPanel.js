import { Share2 } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { RankedBarList } from "@/components/dashboard/RankedBarList";

/** Referrer breakdown — one SourceStat[] mapped to the shared ranked-bar shape. */
export function SourcesPanel({ sources }) {
  if (sources.length === 0) {
    return (
      <EmptyState
        icon={<Share2 size={18} />}
        title="No traffic sources yet"
        description="Referrers will show up here once sessions start coming in."
      />
    );
  }

  const items = sources.map((source) => ({
    label: source.source,
    count: source.sessions,
  }));

  return <RankedBarList items={items} />;
}
