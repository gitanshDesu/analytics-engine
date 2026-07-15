import { backendFetch } from "@/services/httpClient";

/** GET /api/v1/dashboard/{trackingId}/sessions/{sessionId} -> SessionDetailResponse. */
export function getSessionDetail(trackingId, sessionId, { accessToken }) {
  return backendFetch(`/api/v1/dashboard/${trackingId}/sessions/${sessionId}`, {
    accessToken,
  });
}
