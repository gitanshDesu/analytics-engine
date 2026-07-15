import { backendFetch } from "@/services/httpClient";

/** POST /api/v1/auth/refresh — reads the refreshToken cookie -> GenericUserResponse + rotated cookies. */
export function refresh({ refreshToken }) {
  return backendFetch("/api/v1/auth/refresh", {
    method: "POST",
    refreshToken,
  });
}
