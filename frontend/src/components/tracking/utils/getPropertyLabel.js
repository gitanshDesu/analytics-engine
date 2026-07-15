/**
 * TrackingProperty has no display name, just a `domains` allowlist — derive
 * one label (primary domain) plus a secondary hint when more are allowed.
 */
export function getPropertyLabel(property) {
  const [primary, ...rest] = property.domains ?? [];
  return {
    primary: primary ?? "Untitled site",
    secondary: rest.length ? `+${rest.length} more domain${rest.length > 1 ? "s" : ""}` : null,
  };
}
