import { cookies } from "next/headers";
import { OverviewDashboard } from "@/components/dashboard/OverviewDashboard";
import { resolveDateRange } from "@/components/dashboard/utils/resolveDateRange";
import { getSummary } from "@/services/dashboard/getSummary";
import { getTraffic } from "@/services/dashboard/getTraffic";
import { getPagesBreakdown } from "@/services/dashboard/getPagesBreakdown";
import { getSources } from "@/services/dashboard/getSources";
import { getDevices } from "@/services/dashboard/getDevices";
import { getEvents } from "@/services/dashboard/getEvents";

export const metadata = { title: "Overview — Analytics Engine" };

export default async function OverviewPage({ params, searchParams }) {
  const { trackingId } = await params;
  const { range } = await searchParams;
  const dateRange = resolveDateRange(range);
  const accessToken = (await cookies()).get("accessToken")?.value;

  const [summary, traffic, pages, sources, devices, events] = await Promise.all([
    getSummary(trackingId, dateRange, { accessToken }),
    getTraffic(trackingId, dateRange, { accessToken }),
    getPagesBreakdown(trackingId, dateRange, { accessToken }),
    getSources(trackingId, dateRange, { accessToken }),
    getDevices(trackingId, dateRange, { accessToken }),
    getEvents(trackingId, dateRange, { accessToken }),
  ]);

  return (
    <OverviewDashboard
      summary={summary.data}
      traffic={traffic.data}
      pages={pages.data}
      sources={sources.data}
      devices={devices.data}
      events={events.data}
    />
  );
}
