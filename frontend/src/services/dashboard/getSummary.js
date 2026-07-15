import { backendFetch } from "@/services/httpClient";

/** GET /api/v1/dashboard/{trackingId}/summary?from&to -> SummaryResponse. from/to are ISO-8601 instants. */
export function getSummary(trackingId, { from, to }, { accessToken }) {
  return backendFetch(`/api/v1/dashboard/${trackingId}/summary`, {
    searchParams: { from, to },
    accessToken,
  });
}
