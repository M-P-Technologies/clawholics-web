import { addDays, monthEnd, type DashboardRange, type Span } from "./dashboardPeriods";

// The little line on each stat card: one point per day, week or month of the period, up to today
// (a line that dropped to zero for the days that haven't happened yet would look like a crash).
export type Granularity = "day" | "week" | "month";

export interface DayValues {
  collected: number;
  estimatedSales: number;
  bookings: number;
  newClients: number;
  /** Clients with two or more confirmed and completed visits by the point's last day (not a sum) */
  recurringClients: number;
  /** The money cards' lines, by appointment date: see Money in dashboardTypes */
  balanceAtSalon: number;
  returningRevenue: number;
  lost: number;
}
// The values added up day by day (recurringClients is a running count, set by the server)
const KEYS: (keyof DayValues)[] = ["collected", "estimatedSales", "bookings", "newClients", "balanceAtSalon", "returningRevenue", "lost"];
export interface TrendPoint extends DayValues {
  /** The first day the point covers, "YYYY-MM-DD" */
  date: string;
}
export interface Trend {
  granularity: Granularity;
  points: TrendPoint[];
}

export const trendGranularity = (range: DashboardRange): Granularity =>
  range === "last90" ? "week" : range === "year" ? "month" : "day";

export const granularityWord = (granularity: Granularity) => `per ${granularity}`;

// The dates each point covers (inclusive), from the period's first day to today
export function trendBuckets(range: DashboardRange, period: Span, today: string): { granularity: Granularity; buckets: Span[] } {
  const granularity = trendGranularity(range);
  const end = period.to < today ? period.to : today;
  const buckets: Span[] = [];
  let start = period.from;
  while (start <= end) {
    let to: string;
    let next: string;
    if (granularity === "day") {
      to = start;
      next = addDays(start, 1);
    } else if (granularity === "week") {
      to = addDays(start, 6);
      next = addDays(start, 7);
    } else {
      to = monthEnd(start);
      next = addDays(to, 1);
    }
    buckets.push({ from: start, to: to < end ? to : end });
    start = next;
  }
  return { granularity, buckets };
}

// Adds up the per-day totals inside each bucket; a day with no row counts as zero
export function bucketTrend(granularity: Granularity, buckets: Span[], byDay: Record<string, Partial<DayValues>>): Trend {
  const points = buckets.map((bucket) => {
    const sum = Object.fromEntries(KEYS.map((key) => [key, 0])) as unknown as DayValues;
    for (let day = bucket.from; day <= bucket.to; day = addDays(day, 1)) {
      const values = byDay[day];
      if (!values) continue;
      for (const key of KEYS) sum[key] += values[key] ?? 0;
    }
    return { date: bucket.from, ...sum, recurringClients: 0 };
  });
  return { granularity, points };
}

export function formatBucketLabel(granularity: Granularity, date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  const when = new Date(Date.UTC(year, month - 1, day));
  const short = (opts: Intl.DateTimeFormatOptions) => when.toLocaleDateString("en-US", { timeZone: "UTC", ...opts });
  if (granularity === "month") return short({ month: "short", year: "numeric" });
  const text = short({ month: "short", day: "numeric" });
  return granularity === "week" ? `Week of ${text}` : text;
}
