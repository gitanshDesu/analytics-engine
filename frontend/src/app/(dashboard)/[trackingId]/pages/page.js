import { cookies } from "next/headers";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { PagesPanel } from "@/components/dashboard/PagesPanel";
import { resolveDateRange } from "@/components/dashboard/utils/resolveDateRange";
import { getPagesBreakdown } from "@/services/dashboard/getPagesBreakdown";

export const metadata = { title: "Pages — Analytics Engine" };

export default async function PagesPage({ params, searchParams }) {
  const { trackingId } = await params;
  const { range } = await searchParams;
  const accessToken = (await cookies()).get("accessToken")?.value;

  const { data: pages } = await getPagesBreakdown(
    trackingId,
    resolveDateRange(range),
    { accessToken }
  );

  return (
    <div className="flex flex-col gap-5 px-6 py-6">
      <h1 className="text-lg font-semibold text-ink">Pages</h1>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Top, landing & exit pages</CardTitle>
            <CardDescription>Full breakdown for the selected range</CardDescription>
          </div>
        </CardHeader>
        <PagesPanel pages={pages} />
      </Card>
    </div>
  );
}
