import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { register } from "@/services/auth/register";
import { relayAuthCookies } from "@/services/auth/cookieRelay";
import { withErrorHandling } from "@/services/apiRouteHelpers";

export async function POST(request) {
  return withErrorHandling(async () => {
    const body = await request.json();
    const { data, setCookieHeaders } = await register(body);

    const cookieStore = await cookies();
    relayAuthCookies(setCookieHeaders, cookieStore);

    return NextResponse.json(data, { status: 201 });
  });
}
