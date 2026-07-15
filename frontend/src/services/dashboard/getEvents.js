import { backendFetch } from "@/services/httpClient";

/** GET /api/v1/dashboard/{trackingId}/events?from&to -> EventsResponse. */
export function getEvents(trackingId, { from, to }, { accessToken }) {
  return backendFetch(`/api/v1/dashboard/${trackingId}/events`, {
    searchParams: { from, to },
    accessToken,
  });
}
