/** Builds the <script> snippet a customer pastes into their site's <head>. */
export function buildSnippet(trackingId, apiBase, sdkUrl) {
  return `<script
  src="${sdkUrl}"
  data-tracking-id="${trackingId}"
  data-api-base="${apiBase}"
  defer
></script>`;
}
