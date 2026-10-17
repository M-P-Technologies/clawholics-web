import "server-only";
import { getSql } from "./db";

// How long a new booking holds its slot while the client pays (site setting
// booking_hold_minutes), edited in Admin > Settings. An unpaid booking past it is released, and
// its Xendit invoice closes with it.

import { DEFAULT_BOOKING_HOLD_MINUTES, MAX_BOOKING_HOLD_MINUTES, MIN_BOOKING_HOLD_MINUTES } from "../lib/bookingHold";

export { DEFAULT_BOOKING_HOLD_MINUTES, MAX_BOOKING_HOLD_MINUTES, MIN_BOOKING_HOLD_MINUTES };

export async function getBookingHoldMinutes(): Promise<number> {
  const [row] = await getSql()<{ value: string }[]>`select value from site_settings where key = 'booking_hold_minutes'`;
  const minutes = Number(row?.value);
  return Number.isInteger(minutes) && minutes >= MIN_BOOKING_HOLD_MINUTES && minutes <= MAX_BOOKING_HOLD_MINUTES
    ? minutes
    : DEFAULT_BOOKING_HOLD_MINUTES;
}
