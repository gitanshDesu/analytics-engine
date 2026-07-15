import { cookies } from "next/headers";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { SourcesPanel } from "@/components/dashboard/SourcesPanel";
import { resolveDateRange } from "@/components/dashboard/utils/resolveDateRange";
import { getSources } from "@/services/dashboard/getSources";

export const metadata = { title: "Sources — Analytics Engine" };

export default async function SourcesPage({ params, searchParams }) {
  const { trackingId } = await params;
  const { range } = await searchParams;
  const accessToken = (await cookies()).get("accessToken")?.value;

  const { data: sources } = await getSources(
    trackingId,
    resolveDateRange(range),
    { accessToken }
  );

  return (
    <div className="flex flex-col gap-5 px-6 py-6">
      <h1 className="text-lg font-semibold text-ink">Sources</h1>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Referrers</CardTitle>
            <CardDescription>Where sessions came from in the selected range</CardDescription>
          </div>
        </CardHeader>
        <SourcesPanel sources={sources} />
      </Card>
    </div>
  );
}
