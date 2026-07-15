const numberFormatter = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});

/** Compact number formatting: 1234 -> "1.2K". */
export function formatNumber(value) {
  if (value == null || Number.isNaN(value)) return "–";
  return numberFormatter.format(value);
}

/** Renders a percentage from a 0-100 number: 42.5 -> "42.5%". */
export function formatPercent(value, { fractionDigits = 1 } = {}) {
  if (value == null || Number.isNaN(value)) return "–";
  return `${value.toFixed(fractionDigits)}%`;
}

/** Renders a duration in seconds as "1m 32s" / "45s" / "1h 04m". */
export function formatDuration(totalSeconds) {
  if (totalSeconds == null || Number.isNaN(totalSeconds)) return "–";
  const seconds = Math.round(totalSeconds);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  if (hours > 0) {
    return `${hours}h ${String(minutes).padStart(2, "0")}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${String(remainingSeconds).padStart(2, "0")}s`;
  }
  return `${remainingSeconds}s`;
}

/** Formats an ISO date string per the given granularity ("daily" | "weekly"). */
export function formatDateLabel(dateString, granularity = "daily") {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;
  if (granularity === "weekly") {
    return `Wk ${dateString.split("-")[1]}`;
  }
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const dateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
});

/** Formats an ISO timestamp as a readable local date+time: "Jul 15, 2026, 9:29 AM". */
export function formatDateTime(isoString) {
  if (!isoString) return "–";
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return "–";
  return dateTimeFormatter.format(date);
}
