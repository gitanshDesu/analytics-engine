import { backendFetch } from "@/services/httpClient";

/** GET /api/v1/pages?trackingId={trackingId} -> Page[]. */
export function listPages(trackingId, { accessToken }) {
  return backendFetch("/api/v1/pages", {
    searchParams: { trackingId },
    accessToken,
  });
}
