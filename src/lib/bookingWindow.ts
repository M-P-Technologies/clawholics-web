import { manilaToday } from "@/lib/bookingNotice";

// How far ahead a client can book (site setting booking_max_advance_days, edited in Admin >
// Settings): a day later than that isn't offered, and the server refuses it. Counted from today in
// Manila, where the salon is. An admin recording a walk-in or moving a booking isn't held to it.

export const DEFAULT_MAX_ADVANCE_DAYS = 30;
export const MIN_MAX_ADVANCE_DAYS = 7;
export const MAX_MAX_ADVANCE_DAYS = 365;

/** "2026-10-31" + 1 → "2026-11-01" */
export function addDays(day: string, days: number): string {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** The last day a client can book, from today in Manila */
export const lastBookableDay = (maxAdvanceDays: number, now: number = Date.now()) => addDays(manilaToday(now), maxAdvanceDays);

/** A day (YYYY-MM-DD) later than the booking window allows */
export const isBeyondWindow = (day: string, maxAdvanceDays: number, now: number = Date.now()) => day > lastBookableDay(maxAdvanceDays, now);

/** How many months after this one the last bookable day falls in: what the calendar lets a client page forward to */
export function monthsAheadFor(maxAdvanceDays: number, now: number = Date.now()): number {
  const [thisYear, thisMonth] = manilaToday(now).split("-").map(Number);
  const [lastYear, lastMonth] = lastBookableDay(maxAdvanceDays, now).split("-").map(Number);
  return (lastYear - thisYear) * 12 + (lastMonth - thisMonth);
}

/** "30 days" or "1 day", for the words the client reads */
export const daysLabel = (days: number) => `${days} ${days === 1 ? "day" : "days"}`;
