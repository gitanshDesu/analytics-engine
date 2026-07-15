// Mirrors com.analytics.engine.backend.enums.PageType — keep in sync with the backend.
export const PAGE_TYPES = [
  "HOME",
  "SEO",
  "SEARCH",
  "SEARCH_RESULTS",
  "DETAIL",
  "LISTING",
  "LANDING",
  "LOGIN",
  "SIGNUP",
  "PROFILE",
  "BOOKING",
  "CHECKOUT",
  "PAYMENT",
  "CONFIRMATION",
  "SUPPORT",
  "BLOG",
  "OTHER",
];

/** "SEARCH_RESULTS" -> "Search results" */
export function formatPageType(pageType) {
  const lower = pageType.toLowerCase().replaceAll("_", " ");
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}
