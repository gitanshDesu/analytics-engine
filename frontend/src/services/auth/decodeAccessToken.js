/**
 * Reads {id, email} straight off the accessToken JWT's payload — no
 * signature verification, since this is display-only (e.g. showing the
 * email in the Topbar). Every real request is still authorized by the
 * backend's JwtAuthFilter, which does verify the signature.
 */
export function decodeAccessToken(token) {
  if (!token) return null;
  try {
    const payload = token.split(".")[1];
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf-8"));
    return { id: claims.sub, email: claims.email };
  } catch {
    return null;
  }
}
