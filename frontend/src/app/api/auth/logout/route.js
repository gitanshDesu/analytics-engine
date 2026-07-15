import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { logout } from "@/services/auth/logout";
import { relayAuthCookies } from "@/services/auth/cookieRelay";
import { withErrorHandling } from "@/services/apiRouteHelpers";

export async function POST() {
  return withErrorHandling(async () => {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get("accessToken")?.value;
    const refreshToken = cookieStore.get("refreshToken")?.value;

    const { setCookieHeaders } = await logout({ accessToken, refreshToken });
    relayAuthCookies(setCookieHeaders, cookieStore);

    return new NextResponse(null, { status: 204 });
  });
}
