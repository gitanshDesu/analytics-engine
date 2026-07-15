import { cookies } from "next/headers";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Stat } from "@/components/ui/Stat";
import { SessionTimeline } from "@/components/dashboard/SessionTimeline";
import { getSessionDetail } from "@/services/dashboard/getSessionDetail";
import { formatNumber, formatDuration, formatDateTime } from "@/utils/format";

export const metadata = { title: "Session detail — Analytics Engine" };

export default async function SessionDetailPage({ params }) {
  const { trackingId, sessionId } = await params;
  const accessToken = (await cookies()).get("accessToken")?.value;

  const { data } = await getSessionDetail(trackingId, sessionId, { accessToken });
  const { session, timeline } = data;

  return (
    <div className="flex flex-col gap-5 px-6 py-6">
      <div className="flex items-center gap-3">
        <Button href={`/${trackingId}/sessions`} variant="ghost" size="sm">
          <ArrowLeft size={14} />
          Back to sessions
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Session {session.sessionId}</CardTitle>
            <CardDescription>
              Visitor {session.visitorId} · {session.browser} · {session.os} · {session.deviceType}
            </CardDescription>
          </div>
          {session.bounced && <Badge variant="warning">Bounced</Badge>}
        </CardHeader>
        <div className="grid grid-cols-2 gap-x-6 gap-y-5 px-5 py-5 sm:grid-cols-4">
          <Stat label="Started" value={formatDateTime(session.startedAt)} className="col-span-2" />
          <Stat
            label="Ended"
            value={session.endedAt ? formatDateTime(session.endedAt) : "Still active / never ended"}
            className="col-span-2"
          />
          <Stat label="Duration" value={formatDuration(session.durationSeconds)} />
          <Stat label="Pages" value={formatNumber(session.pageViews)} />
          <Stat label="Events" value={formatNumber(session.eventCount)} />
          <Stat label="Landing page" value={session.landingPage ?? "–"} className="col-span-2" />
          <Stat label="Exit page" value={session.exitPage ?? "–"} className="col-span-2" />
        </div>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Timeline</CardTitle>
            <CardDescription>Every page view, click, submit, and scroll in this session, in order</CardDescription>
          </div>
        </CardHeader>
        <SessionTimeline timeline={timeline} />
      </Card>
    </div>
  );
}
