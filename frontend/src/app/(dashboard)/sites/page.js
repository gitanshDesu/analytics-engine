import { Globe } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { SiteCard } from "@/components/tracking/SiteCard";
import { MOCK_PROPERTIES } from "@/mocks/properties";

export const metadata = { title: "Sites — Analytics Engine" };

export default function SitesPage() {
  const properties = MOCK_PROPERTIES;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-ink">Your sites</h1>
          <p className="text-sm text-muted">
            Pick a site to view its analytics, or add a new one.
          </p>
        </div>
        <Button href="/sites/new">Add site</Button>
      </div>

      {properties.length === 0 ? (
        <EmptyState
          icon={<Globe size={20} />}
          title="No sites yet"
          description="Add your first site to get an install snippet and start collecting analytics."
          action={<Button href="/sites/new">Add your first site</Button>}
        />
      ) : (
        <div className="flex flex-col gap-3">
          {properties.map((property) => (
            <SiteCard key={property.trackingId} property={property} />
          ))}
        </div>
      )}
    </div>
  );
}
