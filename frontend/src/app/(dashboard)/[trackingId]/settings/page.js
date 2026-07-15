import { cookies } from "next/headers";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/Card";
import { SnippetBlock } from "@/components/tracking/SnippetBlock";
import { DomainsEditor } from "@/components/tracking/DomainsEditor";
import { PagesEditor } from "@/components/tracking/PagesEditor";
import { DangerZone } from "@/components/tracking/DangerZone";
import { getTrackingProperty } from "@/services/tracking/getTrackingProperty";
import { listPages } from "@/services/pages/listPages";

export const metadata = { title: "Settings — Analytics Engine" };

export default async function SettingsPage({ params }) {
  const { trackingId } = await params;
  const accessToken = (await cookies()).get("accessToken")?.value;

  const [{ data: property }, { data: pages }] = await Promise.all([
    getTrackingProperty(trackingId, { accessToken }),
    listPages(trackingId, { accessToken }),
  ]);

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
          <SnippetBlock
            trackingId={trackingId}
            apiBase={process.env.BACKEND_API_BASE_URL}
            sdkUrl={process.env.SDK_SCRIPT_URL}
          />
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
          <DomainsEditor initialDomains={property.domains} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Tracked pages</CardTitle>
            <CardDescription>
              Categorize pages for the pages/analytics breakdowns.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <PagesEditor trackingId={trackingId} pages={pages} />
        </CardContent>
      </Card>

      <Card className="border-danger/30">
        <CardHeader>
          <CardTitle>Danger zone</CardTitle>
        </CardHeader>
        <CardContent>
          <DangerZone siteName={property.domains?.[0] ?? trackingId} />
        </CardContent>
      </Card>
    </div>
  );
}
