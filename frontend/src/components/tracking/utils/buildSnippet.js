// NEXT_PUBLIC_SDK_URL/NEXT_PUBLIC_API_BASE will back this in Phase 3; hardcoded
// placeholders for now since there's no env wiring yet in the UI-only phase.
const SDK_URL = "https://cdn.analytics-engine.dev/sdk/index.js";
const API_BASE = "https://api.analytics-engine.dev/analytics-backend";

/** Builds the <script> snippet a customer pastes into their site's <head>. */
export function buildSnippet(trackingId) {
  return `<script
  src="${SDK_URL}"
  data-tracking-id="${trackingId}"
  data-api-base="${API_BASE}"
  defer
></script>`;
}
