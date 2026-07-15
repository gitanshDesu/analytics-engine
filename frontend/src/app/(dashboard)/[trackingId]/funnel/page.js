import { cookies } from "next/headers";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { DateRangePicker } from "@/components/dashboard/DateRangePicker";
import { FunnelBuilder } from "@/components/dashboard/FunnelBuilder";
import { FunnelChart } from "@/components/dashboard/FunnelChart";
import { resolveDateRange } from "@/components/dashboard/utils/resolveDateRange";
import { getFunnel } from "@/services/dashboard/getFunnel";

export const metadata = { title: "Funnel — Analytics Engine" };

// Generic default that works for any site with no prior configuration:
// landed -> interacted -> submitted. Site-specific funnels (e.g. matching a
// particular button's text) are built via the step builder below.
const DEFAULT_STEPS = ["PAGE_VIEW", "BUTTON_CLICK", "FORM_SUBMIT"];

function parseStepsParam(stepsParam) {
  if (!stepsParam) return DEFAULT_STEPS;
  return Array.isArray(stepsParam) ? stepsParam : [stepsParam];
}

export default async function FunnelPage({ params, searchParams }) {
  const { trackingId } = await params;
  const { range, steps: stepsParam } = await searchParams;
  const accessToken = (await cookies()).get("accessToken")?.value;

  const steps = parseStepsParam(stepsParam);
  const { data } = await getFunnel(trackingId, resolveDateRange(range), steps, { accessToken });

  const initialSteps = steps.map((raw) => {
    const [eventType, ...rest] = raw.split(":");
    return { eventType, text: rest.join(":") };
  });

  return (
    <div className="flex flex-col gap-5 px-6 py-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-ink">Funnel</h1>
        <DateRangePicker />
      </div>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Steps</CardTitle>
            <CardDescription>
              Each step counts distinct sessions with at least one matching event — add an
              optional &quot;contains&quot; filter to match specific button or link text
            </CardDescription>
          </div>
        </CardHeader>
        <FunnelBuilder initialSteps={initialSteps} />
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Conversion</CardTitle>
            <CardDescription>Sessions reaching each step in the selected range</CardDescription>
          </div>
        </CardHeader>
        <FunnelChart steps={data.steps} />
      </Card>
    </div>
  );
}
