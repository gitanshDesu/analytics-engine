import Link from "next/link";
import { Globe, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";

/** One tracking property in the /sites list. */
export function SiteCard({ property }) {
  return (
    <Link href={`/${property.trackingId}/overview`}>
      <Card className="transition-colors hover:bg-surface-hover">
        <CardContent className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/15 text-accent">
              <Globe size={16} />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-ink">
                {property.name}
              </span>
              <span className="text-xs text-subtle">{property.domain}</span>
            </div>
          </div>
          <ArrowRight size={16} className="text-subtle" />
        </CardContent>
      </Card>
    </Link>
  );
}
