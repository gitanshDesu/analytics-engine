import Link from "next/link";
import { Users } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import {
  Table,
  TableHead,
  TableHeaderCell,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/ui/Table";
import { formatNumber, formatDuration, formatDateTime } from "@/utils/format";

/** Recent-sessions table — each row links to its full event timeline. */
export function SessionsTable({ trackingId, sessions }) {
  if (sessions.length === 0) {
    return (
      <EmptyState
        icon={<Users size={18} />}
        title="No sessions yet"
        description="Sessions will show up here once visitors start browsing your site."
      />
    );
  }

  return (
    <Table>
      <TableHead>
        <TableRow>
          <TableHeaderCell>Started</TableHeaderCell>
          <TableHeaderCell>Landing page</TableHeaderCell>
          <TableHeaderCell>Exit page</TableHeaderCell>
          <TableHeaderCell className="text-right">Duration</TableHeaderCell>
          <TableHeaderCell className="text-right">Pages</TableHeaderCell>
          <TableHeaderCell className="text-right">Events</TableHeaderCell>
          <TableHeaderCell>Device</TableHeaderCell>
          <TableHeaderCell />
        </TableRow>
      </TableHead>
      <TableBody>
        {sessions.map((session) => (
          <TableRow key={session.sessionId}>
            <TableCell className="whitespace-nowrap font-mono text-xs">
              {formatDateTime(session.startedAt)}
            </TableCell>
            <TableCell
              className="max-w-56 truncate font-mono text-xs"
              title={session.landingPage ?? undefined}
            >
              {session.landingPage ?? "–"}
            </TableCell>
            <TableCell
              className="max-w-56 truncate font-mono text-xs"
              title={session.exitPage ?? undefined}
            >
              {session.exitPage ?? "–"}
            </TableCell>
            <TableCell className="text-right font-mono tabular-nums">
              {formatDuration(session.durationSeconds)}
            </TableCell>
            <TableCell className="text-right font-mono tabular-nums">
              {formatNumber(session.pageViews)}
            </TableCell>
            <TableCell className="text-right font-mono tabular-nums">
              {formatNumber(session.eventCount)}
            </TableCell>
            <TableCell className="whitespace-nowrap text-xs text-muted">
              {session.browser} · {session.os}
            </TableCell>
            <TableCell className="text-right">
              <div className="flex items-center justify-end gap-3">
                {session.bounced && <Badge variant="warning">Bounced</Badge>}
                <Link
                  href={`/${trackingId}/sessions/${session.sessionId}`}
                  className="text-xs font-medium text-accent hover:underline"
                >
                  View
                </Link>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
