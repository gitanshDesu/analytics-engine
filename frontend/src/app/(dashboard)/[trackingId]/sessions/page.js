import { cookies } from "next/headers";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { DateRangePicker } from "@/components/dashboard/DateRangePicker";
import { SessionsTable } from "@/components/dashboard/SessionsTable";
import { resolveDateRange } from "@/components/dashboard/utils/resolveDateRange";
import { getSessions } from "@/services/dashboard/getSessions";

export const metadata = { title: "Sessions — Analytics Engine" };

export default async function SessionsPage({ params, searchParams }) {
  const { trackingId } = await params;
  const { range } = await searchParams;
  const accessToken = (await cookies()).get("accessToken")?.value;

  const { data } = await getSessions(trackingId, resolveDateRange(range), {
    accessToken,
    limit: 50,
  });

  return (
    <div className="flex flex-col gap-5 px-6 py-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-ink">Sessions</h1>
        <DateRangePicker />
      </div>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Recent sessions</CardTitle>
            <CardDescription>
              Most recent 50 sessions in the selected range — open one to see its full event timeline
            </CardDescription>
          </div>
        </CardHeader>
        <SessionsTable trackingId={trackingId} sessions={data.sessions} />
      </Card>
    </div>
  );
}
