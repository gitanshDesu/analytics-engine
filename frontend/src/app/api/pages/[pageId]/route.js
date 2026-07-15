import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getPage } from "@/services/pages/getPage";
import { withErrorHandling } from "@/services/apiRouteHelpers";

export async function GET(request, { params }) {
  return withErrorHandling(async () => {
    const { pageId } = await params;
    const accessToken = (await cookies()).get("accessToken")?.value;

    const { data } = await getPage(pageId, { accessToken });
    return NextResponse.json(data);
  });
}
