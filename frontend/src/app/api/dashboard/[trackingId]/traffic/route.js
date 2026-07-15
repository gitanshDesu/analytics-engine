import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getTraffic } from "@/services/dashboard/getTraffic";
import { withErrorHandling } from "@/services/apiRouteHelpers";

export async function GET(request, { params }) {
  return withErrorHandling(async () => {
    const { trackingId } = await params;
    const { searchParams } = request.nextUrl;
    const accessToken = (await cookies()).get("accessToken")?.value;

    const { data } = await getTraffic(
      trackingId,
      {
        from: searchParams.get("from"),
        to: searchParams.get("to"),
        granularity: searchParams.get("granularity") ?? "daily",
      },
      { accessToken }
    );
    return NextResponse.json(data);
  });
}
