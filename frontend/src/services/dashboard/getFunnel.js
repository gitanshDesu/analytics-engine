import { backendFetch } from "@/services/httpClient";

/**
 * GET /api/v1/dashboard/{trackingId}/funnel?from&to&steps=... -> FunnelResponse.
 * `steps`: string[], each "EVENT_TYPE" or "EVENT_TYPE:text" (e.g. "BUTTON_CLICK:Book Now").
 * Sent as repeated `steps` query params — comma-joining would break on values that
 * themselves contain commas (real button/card text often does).
 */
export function getFunnel(trackingId, { from, to }, steps, { accessToken }) {
  return backendFetch(`/api/v1/dashboard/${trackingId}/funnel`, {
    searchParams: { from, to, steps },
    accessToken,
  });
}
