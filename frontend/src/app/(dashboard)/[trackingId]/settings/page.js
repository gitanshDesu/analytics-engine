import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/Card";
import { SnippetBlock } from "@/components/tracking/SnippetBlock";
import { DomainsEditor } from "@/components/tracking/DomainsEditor";
import { DangerZone } from "@/components/tracking/DangerZone";
import { MOCK_PROPERTIES } from "@/mocks/properties";

export const metadata = { title: "Settings — Analytics Engine" };

// TODO(Phase 3): look up the property by trackingId via services/tracking
// instead of scanning the mock fixture.
export default async function SettingsPage({ params }) {
  const { trackingId } = await params;
  const property =
    MOCK_PROPERTIES.find((p) => p.trackingId === trackingId) ??
    MOCK_PROPERTIES[0];

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-6 py-6">
      <h1 className="text-lg font-semibold text-ink">Settings</h1>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Install snippet</CardTitle>
            <CardDescription>Tracking ID: {trackingId}</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <SnippetBlock trackingId={trackingId} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Allowed domains</CardTitle>
            <CardDescription>
              Only events from these domains are accepted.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <DomainsEditor initialDomains={[property.domain]} />
        </CardContent>
      </Card>

      <Card className="border-danger/30">
        <CardHeader>
          <CardTitle>Danger zone</CardTitle>
        </CardHeader>
        <CardContent>
          <DangerZone siteName={property.name} />
        </CardContent>
      </Card>
    </div>
  );
}
