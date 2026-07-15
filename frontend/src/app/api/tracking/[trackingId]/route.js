import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getTrackingProperty } from "@/services/tracking/getTrackingProperty";
import { withErrorHandling } from "@/services/apiRouteHelpers";

export async function GET(request, { params }) {
  return withErrorHandling(async () => {
    const { trackingId } = await params;
    const accessToken = (await cookies()).get("accessToken")?.value;

    const { data } = await getTrackingProperty(trackingId, { accessToken });
    return NextResponse.json(data);
  });
}
