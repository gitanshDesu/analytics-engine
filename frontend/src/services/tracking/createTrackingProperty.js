import { backendFetch } from "@/services/httpClient";

/** POST /api/v1/tracking — { domains: string[] } -> TrackingProperty (userId comes from the JWT, not the body). */
export function createTrackingProperty({ domains }, { accessToken }) {
  return backendFetch("/api/v1/tracking", {
    method: "POST",
    body: { domains },
    accessToken,
  });
}
