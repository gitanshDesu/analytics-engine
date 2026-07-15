const RANGE_DAYS = { today: 0, "7d": 7, "30d": 30, "90d": 90 };

/** Resolves the DateRangePicker's `?range=` preset into {from, to} ISO instants for the dashboard service calls. */
export function resolveDateRange(rangeParam) {
  const days = RANGE_DAYS[rangeParam] ?? RANGE_DAYS["30d"];

  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - days);
  from.setHours(0, 0, 0, 0);

  return { from: from.toISOString(), to: to.toISOString() };
}
