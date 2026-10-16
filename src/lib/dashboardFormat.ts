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
