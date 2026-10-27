export type DashboardRange = "week" | "month" | "last30" | "last90" | "year" | "all";

export const DASHBOARD_RANGES: DashboardRange[] = ["week", "month", "last30", "last90", "year", "all"];
export const DEFAULT_RANGE: DashboardRange = "month";

// Clients whose last visit is further back than this are "lapsed"
export const LAPSED_DAYS = 60;

export interface Span {
  from: string;
  to: string;
}

export const isDashboardRange = (value: unknown): value is DashboardRange =>
  DASHBOARD_RANGES.includes(value as DashboardRange);

// Everything is plain "YYYY-MM-DD" text, as in the database. Dates are read as UTC midnight so
// daylight saving can never shift a day.
const parse = (ymd: string) => new Date(`${ymd}T00:00:00Z`);
const format = (date: Date) => date.toISOString().slice(0, 10);

export const addDays = (ymd: string, days: number): string => {
  const date = parse(ymd);
  date.setUTCDate(date.getUTCDate() + days);
  return format(date);
};

// The salon's day is Manila's (UTC+8, no daylight saving)
const MANILA_OFFSET_MS = 8 * 60 * 60 * 1000;
export const manilaToday = (now: Date): string => format(new Date(now.getTime() + MANILA_OFFSET_MS));
export const manilaClock = (now: Date): string =>
  new Date(now.getTime() + MANILA_OFFSET_MS).toISOString().slice(11, 16);

const monthStart = (ymd: string) => `${ymd.slice(0, 7)}-01`;
export const monthEnd = (ymd: string) => {
  const date = parse(monthStart(ymd));
  date.setUTCMonth(date.getUTCMonth() + 1);
  date.setUTCDate(0);
  return format(date);
};

// The period for a range and the one it is compared with. Week, month and year are whole
// calendar spans (so upcoming bookings count); last30 and last90 end today. All time runs over
// everything on record (`all`: the first and last day the data holds, today when there is none) and
// has nothing before it to compare with: its previous span is empty.
export function resolvePeriod(range: DashboardRange, today: string, all?: Span): { period: Span; previous: Span } {
  switch (range) {
    case "all": {
      const from = all && all.from < today ? all.from : today;
      const to = all && all.to > today ? all.to : today;
      return { period: { from, to }, previous: { from: addDays(from, -1), to: addDays(from, -2) } };
    }
    case "week": {
      const sinceMonday = (parse(today).getUTCDay() + 6) % 7;
      const from = addDays(today, -sinceMonday);
      return {
        period: { from, to: addDays(from, 6) },
        previous: { from: addDays(from, -7), to: addDays(from, -1) },
      };
    }
    case "month": {
      const from = monthStart(today);
      const previousTo = addDays(from, -1);
      return {
        period: { from, to: monthEnd(today) },
        previous: { from: monthStart(previousTo), to: previousTo },
      };
    }
    case "year": {
      const year = Number(today.slice(0, 4));
      return {
        period: { from: `${year}-01-01`, to: `${year}-12-31` },
        previous: { from: `${year - 1}-01-01`, to: `${year - 1}-12-31` },
      };
    }
    case "last30":
    case "last90": {
      const days = range === "last30" ? 30 : 90;
      const from = addDays(today, -(days - 1));
      return {
        period: { from, to: today },
        previous: { from: addDays(from, -days), to: addDays(from, -1) },
      };
    }
  }
}
