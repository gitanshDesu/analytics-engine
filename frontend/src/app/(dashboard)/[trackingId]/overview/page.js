import { OverviewDashboard } from "@/components/dashboard/OverviewDashboard";
import {
  MOCK_SUMMARY,
  MOCK_TRAFFIC,
  MOCK_PAGES,
  MOCK_SOURCES,
  MOCK_DEVICES,
} from "@/mocks/dashboardData";

export const metadata = { title: "Overview — Analytics Engine" };

// TODO(Phase 3): fetch these five from `services/dashboard` (proxied through
// app/api/dashboard/*) using `searchParams.range` instead of the mock fixtures.
export default function OverviewPage() {
  return (
    <OverviewDashboard
      summary={MOCK_SUMMARY}
      traffic={MOCK_TRAFFIC}
      pages={MOCK_PAGES}
      sources={MOCK_SOURCES}
      devices={MOCK_DEVICES}
    />
  );
}
