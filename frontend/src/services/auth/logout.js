import { backendFetch } from "@/services/httpClient";

/** POST /api/v1/auth/logout — requires accessToken (protected route); reads refreshToken to invalidate it. */
export function logout({ accessToken, refreshToken }) {
  return backendFetch("/api/v1/auth/logout", {
    method: "POST",
    accessToken,
    refreshToken,
  });
}
