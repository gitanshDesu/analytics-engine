const BACKEND_API_BASE_URL = process.env.BACKEND_API_BASE_URL;

/** Mirrors the backend's ErrorResponse: { status, error, message, errors, path }. */
export class ApiError extends Error {
  constructor(status, message, errors) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.errors = errors ?? null;
  }
}

function buildCookieHeader({ accessToken, refreshToken } = {}) {
  const parts = [];
  if (accessToken) parts.push(`accessToken=${accessToken}`);
  if (refreshToken) parts.push(`refreshToken=${refreshToken}`);
  return parts.length ? parts.join("; ") : undefined;
}

/**
 * The single chokepoint that talks to the Java backend. Every `services/*`
 * function funnels through this — nothing else in the app imports
 * BACKEND_API_BASE_URL or knows the backend's host.
 *
 * Cookies are forwarded explicitly (`accessToken`/`refreshToken` params)
 * rather than read here via next/headers, so this file has no implicit
 * dependency on the Next.js request context and stays easy to reason about.
 */
export async function backendFetch(
  path,
  { method = "GET", body, searchParams, accessToken, refreshToken } = {}
) {
  // `new URL(path, base)` treats a leading "/" in `path` as absolute and
  // drops the base's own path (`/analytics-backend`) entirely — string-concat
  // first so the context-path survives, then parse the full absolute URL.
  const url = new URL(`${BACKEND_API_BASE_URL}${path}`);
  if (searchParams) {
    for (const [key, value] of Object.entries(searchParams)) {
      if (value == null) continue;
      if (Array.isArray(value)) {
        for (const item of value) url.searchParams.append(key, item);
      } else {
        url.searchParams.set(key, value);
      }
    }
  }

  const cookieHeader = buildCookieHeader({ accessToken, refreshToken });

  const response = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(cookieHeader && { Cookie: cookieHeader }),
    },
    body: body != null ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });

  // Response.headers.getSetCookie() is the only way to read *multiple*
  // Set-Cookie headers — .get("set-cookie") would join them into one string.
  const setCookieHeaders = response.headers.getSetCookie?.() ?? [];

  if (!response.ok) {
    const rawText = await response.text().catch(() => "");
    console.error(`[backendFetch] ${method} ${url} → ${response.status}\n${rawText}`);
    let errorBody = null;
    try { errorBody = JSON.parse(rawText); } catch {}
    throw new ApiError(
      response.status,
      errorBody?.message ?? "Request failed",
      errorBody?.errors
    );
  }

  if (response.status === 204) {
    return { data: null, setCookieHeaders };
  }

  const data = await response.json();
  return { data, setCookieHeaders };
}
