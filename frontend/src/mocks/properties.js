// Temporary fixture standing in for `services/tracking` until Phase 3 wires
// the real proxy + backend calls. Delete once GET /api/v1/tracking is wired.
export const MOCK_PROPERTIES = [
  { trackingId: "TP-8f3a1c", name: "Marketing Site", domain: "example.com" },
  { trackingId: "TP-2b9e7d", name: "Docs", domain: "docs.example.com" },
];

export const MOCK_USER = {
  email: "yatraseo147@gmail.com",
};
