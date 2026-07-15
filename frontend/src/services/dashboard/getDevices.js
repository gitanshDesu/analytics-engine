import { backendFetch } from "@/services/httpClient";

/** GET /api/v1/dashboard/{trackingId}/devices?from&to -> DevicesResponse. */
export function getDevices(trackingId, { from, to }, { accessToken }) {
  return backendFetch(`/api/v1/dashboard/${trackingId}/devices`, {
    searchParams: { from, to },
    accessToken,
  });
}
