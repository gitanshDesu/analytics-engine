import { backendFetch } from "@/services/httpClient";

/**
 * GET /api/v1/dashboard/{trackingId}/pages?from&to -> PagesResponse
 * ({ topPages, topLandingPages, topExitPages }). Not to be confused with
 * `services/pages` (the tracked-page registry) — this is derived from events.
 */
export function getPagesBreakdown(trackingId, { from, to }, { accessToken }) {
  return backendFetch(`/api/v1/dashboard/${trackingId}/pages`, {
    searchParams: { from, to },
    accessToken,
  });
}
