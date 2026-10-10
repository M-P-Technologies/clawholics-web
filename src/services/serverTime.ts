// The API sends ISO-8601 UTC with a "Z". SQLite's CURRENT_TIMESTAMP is
// "YYYY-MM-DD HH:MM:SS" (also UTC, but with no zone), which browsers would
// otherwise read as local time. Treat a zone-less timestamp as UTC.
const NO_ZONE = /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}(\.\d+)?$/;

export function parseServerTime(value?: string | null): number {
  if (!value) return NaN;
  const text = value.trim();
  return Date.parse(NO_ZONE.test(text) ? `${text.replace(" ", "T")}Z` : text);
}
