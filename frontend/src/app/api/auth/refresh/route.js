import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { refresh } from "@/services/auth/refresh";
import { relayAuthCookies } from "@/services/auth/cookieRelay";
import { withErrorHandling } from "@/services/apiRouteHelpers";

export async function POST() {
  return withErrorHandling(async () => {
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get("refreshToken")?.value;

    const { data, setCookieHeaders } = await refresh({ refreshToken });
    relayAuthCookies(setCookieHeaders, cookieStore);

    return NextResponse.json(data);
  });
}
