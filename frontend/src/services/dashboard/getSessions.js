import { backendFetch } from "@/services/httpClient";

/** GET /api/v1/dashboard/{trackingId}/sessions?from&to&limit -> SessionListResponse. */
export function getSessions(trackingId, { from, to }, { accessToken, limit } = {}) {
  return backendFetch(`/api/v1/dashboard/${trackingId}/sessions`, {
    searchParams: { from, to, limit },
    accessToken,
  });
}
