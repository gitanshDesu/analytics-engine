import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { SourcesPanel } from "@/components/dashboard/SourcesPanel";
import { MOCK_SOURCES } from "@/mocks/dashboardData";

export const metadata = { title: "Sources — Analytics Engine" };

export default function SourcesPage() {
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
        <SourcesPanel sources={MOCK_SOURCES} />
      </Card>
    </div>
  );
}
