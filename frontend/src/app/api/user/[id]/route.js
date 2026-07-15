import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getUser } from "@/services/user/getUser";
import { withErrorHandling } from "@/services/apiRouteHelpers";

export async function GET(request, { params }) {
  return withErrorHandling(async () => {
    const { id } = await params;
    const accessToken = (await cookies()).get("accessToken")?.value;

    const { data } = await getUser(id, { accessToken });
    return NextResponse.json(data);
  });
}
