import { backendFetch } from "@/services/httpClient";

/** GET /api/v1/pages/{pageId} -> Page. */
export function getPage(pageId, { accessToken }) {
  return backendFetch(`/api/v1/pages/${pageId}`, { accessToken });
}
