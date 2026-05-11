/**
 * Safe date formatting utility.
 * Handles null, undefined, ISO strings, and Unix epoch integers.
 */
export function formatProjectDate(raw: string | number | null | undefined): string {
  if (raw === null || raw === undefined || raw === "") {
    return "Date unavailable";
  }

  let date: Date;

  if (typeof raw === "number") {
    // Unix epoch: if it looks like seconds (< 1e12), convert to ms
    date = new Date(raw < 1e12 ? raw * 1000 : raw);
  } else {
    date = new Date(raw);
  }

  if (isNaN(date.getTime())) {
    return "Date unavailable";
  }

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}
