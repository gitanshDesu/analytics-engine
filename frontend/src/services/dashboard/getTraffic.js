import { backendFetch } from "@/services/httpClient";

/** GET /api/v1/dashboard/{trackingId}/traffic?from&to&granularity -> TrafficDataPoint[]. */
export function getTraffic(trackingId, { from, to, granularity = "daily" }, { accessToken }) {
  return backendFetch(`/api/v1/dashboard/${trackingId}/traffic`, {
    searchParams: { from, to, granularity },
    accessToken,
  });
}
