import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { listTrackingProperties } from "@/services/tracking/listTrackingProperties";
import { createTrackingProperty } from "@/services/tracking/createTrackingProperty";
import { withErrorHandling } from "@/services/apiRouteHelpers";

export async function GET() {
  return withErrorHandling(async () => {
    const accessToken = (await cookies()).get("accessToken")?.value;
    const { data } = await listTrackingProperties({ accessToken });
    return NextResponse.json(data);
  });
}

export async function POST(request) {
  return withErrorHandling(async () => {
    const body = await request.json();
    const accessToken = (await cookies()).get("accessToken")?.value;
    const { data } = await createTrackingProperty(body, { accessToken });
    return NextResponse.json(data, { status: 201 });
  });
}
