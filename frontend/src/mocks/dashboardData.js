// Temporary fixtures standing in for `services/dashboard` until Phase 3.
// Shapes mirror the backend DTOs exactly (SummaryResponse, TrafficDataPoint,
// PagesResponse/PageStat, SourceStat, DevicesResponse/DeviceBreakdown) so
// swapping in real fetches later is a drop-in replacement, not a rewrite.

export const MOCK_SUMMARY = {
  totalSessions: 18420,
  totalUniqueVisitors: 12980,
  totalPageViews: 46830,
  bounceRate: 38.4,
  avgSessionDurationSeconds: 154,
  avgPagesPerSession: 2.54,
  newVisitors: 9100,
  returningVisitors: 3880,
};

function buildMockTraffic() {
  const points = [];
  const today = new Date("2026-07-14");
  for (let i = 13; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const base = 1100 + Math.round(Math.sin(i / 2) * 220);
    const sessions = base + Math.round(Math.random() * 150);
    points.push({
      date: date.toISOString().slice(0, 10),
      sessions,
      pageViews: Math.round(sessions * 2.5),
    });
  }
  return points;
}

export const MOCK_TRAFFIC = buildMockTraffic();

export const MOCK_PAGES = {
  topPages: [
    { path: "/", count: 8210 },
    { path: "/pricing", count: 4310 },
    { path: "/blog/analytics-101", count: 2870 },
    { path: "/docs/getting-started", count: 2210 },
    { path: "/about", count: 1540 },
  ],
  topLandingPages: [
    { path: "/", count: 6100 },
    { path: "/blog/analytics-101", count: 2340 },
    { path: "/pricing", count: 1890 },
    { path: "/docs/getting-started", count: 1120 },
  ],
  topExitPages: [
    { path: "/pricing", count: 3020 },
    { path: "/", count: 2410 },
    { path: "/docs/getting-started", count: 1780 },
    { path: "/about", count: 990 },
  ],
};

export const MOCK_SOURCES = [
  { source: "Direct", sessions: 6200 },
  { source: "google.com", sessions: 4300 },
  { source: "twitter.com", sessions: 1800 },
  { source: "linkedin.com", sessions: 950 },
  { source: "news.ycombinator.com", sessions: 420 },
];

export const MOCK_DEVICES = {
  browsers: [
    { label: "Chrome", count: 11200 },
    { label: "Safari", count: 4300 },
    { label: "Firefox", count: 1600 },
    { label: "Edge", count: 900 },
  ],
  operatingSystems: [
    { label: "Windows", count: 8100 },
    { label: "macOS", count: 5200 },
    { label: "iOS", count: 3100 },
    { label: "Android", count: 1700 },
    { label: "Linux", count: 320 },
  ],
  deviceTypes: [
    { label: "Desktop", count: 12900 },
    { label: "Mobile", count: 4800 },
    { label: "Tablet", count: 720 },
  ],
};
