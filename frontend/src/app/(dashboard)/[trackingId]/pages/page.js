import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { PagesPanel } from "@/components/dashboard/PagesPanel";
import { MOCK_PAGES } from "@/mocks/dashboardData";

export const metadata = { title: "Pages — Analytics Engine" };

export default function PagesPage() {
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
        <PagesPanel pages={MOCK_PAGES} />
      </Card>
    </div>
  );
}
