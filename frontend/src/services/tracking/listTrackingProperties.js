import { backendFetch } from "@/services/httpClient";

/** GET /api/v1/tracking -> TrackingProperty[] scoped to the authenticated user. */
export function listTrackingProperties({ accessToken }) {
  return backendFetch("/api/v1/tracking", { accessToken });
}
