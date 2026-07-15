import { cookies } from "next/headers";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { EventsPanel } from "@/components/dashboard/EventsPanel";
import { resolveDateRange } from "@/components/dashboard/utils/resolveDateRange";
import { getEvents } from "@/services/dashboard/getEvents";

export const metadata = { title: "Events — Analytics Engine" };

export default async function EventsPage({ params, searchParams }) {
  const { trackingId } = await params;
  const { range } = await searchParams;
  const accessToken = (await cookies()).get("accessToken")?.value;

  const { data: events } = await getEvents(
    trackingId,
    resolveDateRange(range),
    { accessToken }
  );

  return (
    <div className="flex flex-col gap-5 px-6 py-6">
      <h1 className="text-lg font-semibold text-ink">Events</h1>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Interactions</CardTitle>
            <CardDescription>What visitors clicked, submitted, and scrolled in the selected range</CardDescription>
          </div>
        </CardHeader>
        <EventsPanel events={events} />
      </Card>
    </div>
  );
}
