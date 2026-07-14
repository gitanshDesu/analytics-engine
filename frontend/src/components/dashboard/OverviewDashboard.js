import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { DateRangePicker } from "@/components/dashboard/DateRangePicker";
import { StatRow } from "@/components/dashboard/StatRow";
import { TrafficChart } from "@/components/dashboard/TrafficChart";
import { PagesPanel } from "@/components/dashboard/PagesPanel";
import { SourcesPanel } from "@/components/dashboard/SourcesPanel";
import { DevicesPanel } from "@/components/dashboard/DevicesPanel";

/**
 * Composes one property's dashboard from the five `AnalyticDashboardService`
 * responses. Every prop mirrors a backend DTO shape 1:1 so Phase 3 can swap
 * mock data for real fetches without touching this layout.
 */
export function OverviewDashboard({ summary, traffic, pages, sources, devices }) {
  return (
    <div className="flex flex-col gap-5 px-6 py-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-ink">Overview</h1>
        <DateRangePicker />
      </div>

      <Card>
        <StatRow summary={summary} />
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Traffic</CardTitle>
            <CardDescription>Sessions and page views over time</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <TrafficChart data={traffic} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Pages</CardTitle>
          </CardHeader>
          <PagesPanel pages={pages} />
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sources</CardTitle>
          </CardHeader>
          <SourcesPanel sources={sources} />
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Devices</CardTitle>
        </CardHeader>
        <DevicesPanel devices={devices} />
      </Card>
    </div>
  );
}
