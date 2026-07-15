import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { listPages } from "@/services/pages/listPages";
import { addPage } from "@/services/pages/addPage";
import { withErrorHandling } from "@/services/apiRouteHelpers";

export async function GET(request) {
  return withErrorHandling(async () => {
    const trackingId = request.nextUrl.searchParams.get("trackingId");
    const accessToken = (await cookies()).get("accessToken")?.value;

    const { data } = await listPages(trackingId, { accessToken });
    return NextResponse.json(data);
  });
}

export async function POST(request) {
  return withErrorHandling(async () => {
    const body = await request.json();
    const accessToken = (await cookies()).get("accessToken")?.value;

    const { data } = await addPage(body, { accessToken });
    return NextResponse.json(data, { status: 201 });
  });
}
