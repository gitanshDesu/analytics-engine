// Backend scopes refreshToken's Path to its own servlet route
// (server.servlet.context-path=/analytics-backend). On our domain that path
// is meaningless — rewrite it to root so our own refresh/logout routes (and
// nothing else, since the cookie is httpOnly) can read it.
const PATH_REWRITES = {
  "/analytics-backend/api/v1/auth": "/",
};

function parseSetCookie(setCookieString) {
  const [pair, ...attributes] = setCookieString.split(";").map((s) => s.trim());
  const eqIndex = pair.indexOf("=");
  const name = pair.slice(0, eqIndex);
  const value = pair.slice(eqIndex + 1);

  const options = {};
  for (const attribute of attributes) {
    const [rawKey, rawValue] = attribute.split("=");
    switch (rawKey.toLowerCase()) {
      case "max-age":
        options.maxAge = Number(rawValue);
        break;
      case "path":
        options.path = PATH_REWRITES[rawValue] ?? rawValue;
        break;
      case "expires":
        options.expires = new Date(rawValue);
        break;
      case "samesite":
        options.sameSite = rawValue?.toLowerCase();
        break;
      case "secure":
        options.secure = true;
        break;
      case "httponly":
        options.httpOnly = true;
        break;
    }
  }
  return { name, value, options };
}

/**
 * Re-issues the backend's Set-Cookie headers (from a `services/auth/*` call)
 * as cookies on our own response, via the Next.js cookies() store passed in
 * from the calling Route Handler / Server Action.
 */
export function relayAuthCookies(setCookieHeaders, cookieStore) {
  for (const raw of setCookieHeaders) {
    const { name, value, options } = parseSetCookie(raw);
    cookieStore.set(name, value, options);
  }
}
