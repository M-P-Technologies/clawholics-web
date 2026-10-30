import "server-only";
import { getSql } from "./db";
import { DEFAULT_MAX_ADVANCE_DAYS, MAX_MAX_ADVANCE_DAYS, MIN_MAX_ADVANCE_DAYS } from "../lib/bookingWindow";

export { MAX_MAX_ADVANCE_DAYS, MIN_MAX_ADVANCE_DAYS };

// How many days ahead a client can book (site setting booking_max_advance_days), edited in Admin >
// Settings. Not saved yet, or not a whole number in range: the default (about the month the
// calendars always offered).
export async function getBookingMaxAdvanceDays(): Promise<number> {
  const [row] = await getSql()<{ value: string }[]>`select value from site_settings where key = 'booking_max_advance_days'`;
  const days = row ? Number(row.value) : NaN;
  return Number.isInteger(days) && days >= MIN_MAX_ADVANCE_DAYS && days <= MAX_MAX_ADVANCE_DAYS ? days : DEFAULT_MAX_ADVANCE_DAYS;
}
