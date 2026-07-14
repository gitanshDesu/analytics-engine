import { FileText } from "lucide-react";
import { Tabs } from "@/components/ui/Tabs";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  Table,
  TableHead,
  TableHeaderCell,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/ui/Table";
import { formatNumber } from "@/utils/format";

function PageStatTable({ rows, countLabel }) {
  if (rows.length === 0) {
    return (
      <EmptyState
        icon={<FileText size={18} />}
        title="No page data yet"
        description="Once visitors hit your site, pages will show up here."
      />
    );
  }

  return (
    <Table>
      <TableHead>
        <TableRow>
          <TableHeaderCell>Path</TableHeaderCell>
          <TableHeaderCell className="text-right">{countLabel}</TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.path}>
            <TableCell className="font-mono text-xs">{row.path}</TableCell>
            <TableCell className="text-right font-mono tabular-nums">
              {formatNumber(row.count)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

/** Tabbed Top Pages / Landing Pages / Exit Pages — one PagesResponse, three views. */
export function PagesPanel({ pages }) {
  return (
    <Tabs
      items={[
        {
          value: "top",
          label: "Top pages",
          content: <PageStatTable rows={pages.topPages} countLabel="Views" />,
        },
        {
          value: "landing",
          label: "Landing pages",
          content: (
            <PageStatTable rows={pages.topLandingPages} countLabel="Sessions" />
          ),
        },
        {
          value: "exit",
          label: "Exit pages",
          content: (
            <PageStatTable rows={pages.topExitPages} countLabel="Sessions" />
          ),
        },
      ]}
    />
  );
}
