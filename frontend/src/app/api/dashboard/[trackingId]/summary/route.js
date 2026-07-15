import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getSummary } from "@/services/dashboard/getSummary";
import { withErrorHandling } from "@/services/apiRouteHelpers";

export async function GET(request, { params }) {
  return withErrorHandling(async () => {
    const { trackingId } = await params;
    const { searchParams } = request.nextUrl;
    const accessToken = (await cookies()).get("accessToken")?.value;

    const { data } = await getSummary(
      trackingId,
      { from: searchParams.get("from"), to: searchParams.get("to") },
      { accessToken }
    );
    return NextResponse.json(data);
  });
}
