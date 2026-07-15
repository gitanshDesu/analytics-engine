import { cookies } from "next/headers";
import { Topbar } from "@/components/layout/Topbar";
import { listTrackingProperties } from "@/services/tracking/listTrackingProperties";
import { decodeAccessToken } from "@/services/auth/decodeAccessToken";

/** Outer shell for every authenticated screen — populates the property switcher and user menu. */
export default async function DashboardLayout({ children }) {
  const accessToken = (await cookies()).get("accessToken")?.value;
  const user = decodeAccessToken(accessToken);

  const { data: properties } = await listTrackingProperties({ accessToken });

  return (
    <div className="flex min-h-screen flex-col">
      <Topbar properties={properties} email={user?.email} />
      <div className="flex flex-1">{children}</div>
    </div>
  );
}
