import { backendFetch } from "@/services/httpClient";

/** GET /api/v1/tracking/{trackingId} -> TrackingProperty. 403s if it isn't owned by the caller. */
export function getTrackingProperty(trackingId, { accessToken }) {
  return backendFetch(`/api/v1/tracking/${trackingId}`, { accessToken });
}
