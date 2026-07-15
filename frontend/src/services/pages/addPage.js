import { backendFetch } from "@/services/httpClient";

/** POST /api/v1/pages — { trackingId, pagePath, pageType } -> Page. */
export function addPage({ trackingId, pagePath, pageType }, { accessToken }) {
  return backendFetch("/api/v1/pages", {
    method: "POST",
    body: { trackingId, pagePath, pageType },
    accessToken,
  });
}
