import { Topbar } from "@/components/layout/Topbar";
import { MOCK_PROPERTIES, MOCK_USER } from "@/mocks/properties";

/**
 * Outer shell for every authenticated screen. The property switcher is
 * populated here so it's available even on screens with no trackingId in
 * the URL (e.g. /sites). Mock data stands in for the real session/tracking
 * services until Phase 3.
 */
export default function DashboardLayout({ children }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Topbar properties={MOCK_PROPERTIES} email={MOCK_USER.email} />
      <div className="flex flex-1">{children}</div>
    </div>
  );
}
