export const peso = (amount: number) => `₱${Math.round(amount).toLocaleString("en-US")}`;

export const percent = (fraction: number | null) => (fraction === null ? "–" : `${Math.round(fraction * 100)}%`);

type ChangeKind = "up" | "down" | "flat" | "new" | "none";
export interface ChangeView {
  kind: ChangeKind;
  label: string;
}

// How a number moved against the previous period. A previous value of 0 has no percentage:
// anything above it is "new".
export function describeChange(value: number | null, previous: number | null): ChangeView {
  if (value === null || previous === null) return { kind: "none", label: "–" };
  if (previous === 0) return value === 0 ? { kind: "flat", label: "0%" } : { kind: "new", label: "new" };
  const points = Math.round(((value - previous) / previous) * 100);
  if (points === 0) return { kind: "flat", label: "0%" };
  return points > 0 ? { kind: "up", label: `+${points}%` } : { kind: "down", label: `${points}%` };
}

// How a rate (a fraction) moved, in percentage points
export function describePoints(value: number | null, previous: number | null): ChangeView {
  if (value === null || previous === null) return { kind: "none", label: "–" };
  const points = Math.round((value - previous) * 100);
  if (points === 0) return { kind: "flat", label: "0 pts" };
  return points > 0 ? { kind: "up", label: `+${points} pts` } : { kind: "down", label: `${points} pts` };
}

/** "Wed, Oct 14" for a YYYY-MM-DD day */
export const shortDay = (ymd: string) => {
  const [year, month, day] = ymd.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
};

export const WEEKDAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

// The Busiest weekdays card beside Bookings per artist: as many days as that card has artists, the
// busiest first (a tie goes to the earlier day), so the two cards are the same height. With no
// artists, or seven or more, every day from Monday to Sunday.
export function busiestWeekdays(weekdays: { weekday: number; bookings: number }[], artists: number): { label: string; value: number }[] {
  const days = [...weekdays].sort((x, y) => x.weekday - y.weekday);
  const shown = artists === 0 || artists >= WEEKDAY_NAMES.length
    ? days
    : [...days].sort((x, y) => y.bookings - x.bookings || x.weekday - y.weekday).slice(0, artists);
  return shown.map((d) => ({ label: WEEKDAY_NAMES[d.weekday - 1], value: d.bookings }));
}
