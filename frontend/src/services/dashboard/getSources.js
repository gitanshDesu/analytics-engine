import { backendFetch } from "@/services/httpClient";

/** GET /api/v1/dashboard/{trackingId}/sources?from&to -> SourceStat[]. */
export function getSources(trackingId, { from, to }, { accessToken }) {
  return backendFetch(`/api/v1/dashboard/${trackingId}/sources`, {
    searchParams: { from, to },
    accessToken,
  });
}
