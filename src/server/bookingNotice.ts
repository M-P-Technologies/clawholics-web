import "server-only";
import { getSql } from "./db";
import { DEFAULT_MIN_NOTICE_HOURS, MAX_MIN_NOTICE_HOURS, MIN_MIN_NOTICE_HOURS } from "../lib/bookingNotice";

export { MAX_MIN_NOTICE_HOURS, MIN_MIN_NOTICE_HOURS };

// The notice a booking needs (site setting booking_min_notice_hours), edited in Admin > Settings.
// Not saved yet, or not a whole number in range: the default.
export async function getBookingMinNoticeHours(): Promise<number> {
  const [row] = await getSql()<{ value: string }[]>`select value from site_settings where key = 'booking_min_notice_hours'`;
  const hours = row ? Number(row.value) : NaN;
  return Number.isInteger(hours) && hours >= MIN_MIN_NOTICE_HOURS && hours <= MAX_MIN_NOTICE_HOURS ? hours : DEFAULT_MIN_NOTICE_HOURS;
}
