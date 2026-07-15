import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { login } from "@/services/auth/login";
import { relayAuthCookies } from "@/services/auth/cookieRelay";
import { withErrorHandling } from "@/services/apiRouteHelpers";

export async function POST(request) {
  return withErrorHandling(async () => {
    const body = await request.json();
    const { data, setCookieHeaders } = await login(body);

    const cookieStore = await cookies();
    relayAuthCookies(setCookieHeaders, cookieStore);

    return NextResponse.json(data);
  });
}
