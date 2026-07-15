import { NextResponse } from "next/server";

const PUBLIC_PATHS = ["/login", "/register"];

// Next.js 16 renamed `middleware.js` to `proxy.js` (same file/export
// semantics, different name) — see node_modules/next/dist/docs/.../proxy.md.
//
// This is an optimistic check only (presence of the cookie, not signature
// validation) — the backend's JwtAuthFilter is the real enforcement. Keeping
// it this simple on purpose: Next's own docs warn against using Proxy as a
// full session-management solution.
export function proxy(request) {
  const { pathname } = request.nextUrl;

  // Server Actions (login/logout/... forms) are dispatched as a POST to
  // whatever page rendered them, not a separate route proxy can exclude via
  // matcher. Redirecting one here breaks the client-side action runtime
  // ("An unexpected response was received from the server"), since it
  // expects a Flight-encoded response, not a raw HTTP redirect. Each action
  // already handles its own auth failures, so just let them through.
  if (request.headers.has("next-action")) {
    return NextResponse.next();
  }

  const hasAccessToken = Boolean(request.cookies.get("accessToken")?.value);
  const isPublicPath = PUBLIC_PATHS.some((path) => pathname.startsWith(path));

  if (isPublicPath) {
    return hasAccessToken
      ? NextResponse.redirect(new URL("/sites", request.url))
      : NextResponse.next();
  }

  return hasAccessToken
    ? NextResponse.next()
    : NextResponse.redirect(new URL("/login", request.url));
}

export const config = {
  // /sdk is the tracking script itself — served to anonymous visitors on
  // whatever site embeds it, never our own logged-in browser, so it must
  // never be gated behind the accessToken check.
  matcher: ["/((?!api|sdk|_next/static|_next/image|favicon.ico).*)"],
};
