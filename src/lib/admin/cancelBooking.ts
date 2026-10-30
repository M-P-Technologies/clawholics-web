// What cancelling a booking does to the downpayment, shown before the admin confirms. The server
// decides for real (POST /booking/:id/refund); this mirrors its rule so the words match what happens.

/** Bookings that are still to happen: the only ones that can be cancelled */
const OPEN_STATUSES = ["PENDING", "AWAITING_PROOF", "CONFIRMED"];

export const canCancelBooking = (status: string | null | undefined) => OPEN_STATUSES.includes(String(status ?? "").trim().toUpperCase());

/** At least 72 hours before the visit, Manila time (UTC+8): the downpayment is refunded, not kept */
export function refundWindowOpen(date: string, time: string, now = Date.now()) {
  const day = String(date).match(/^(\d{4})-(\d{2})-(\d{2})/);
  const clock = String(time).match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (!day || !clock) return false;
  let hours = Number(clock[1]);
  const ampm = clock[3]?.toUpperCase();
  if (ampm === "PM" && hours < 12) hours += 12;
  if (ampm === "AM" && hours === 12) hours = 0;
  const startsAt = Date.UTC(Number(day[1]), Number(day[2]) - 1, Number(day[3]), hours - 8, Number(clock[2]));
  return startsAt - now >= 72 * 60 * 60 * 1000;
}

export interface CancellableBooking {
  appointment_date: string;
  appointment_time: string;
  paid_downpayment?: number;
  payment_status?: string | null;
  payment_method?: string | null;
}

/** nothing paid | refunded through Xendit | refunded by hand (a payment proof) | downpayment kept (inside 72 hours) */
export type CancelOutcome = "unpaid" | "refund" | "manual-refund" | "keep";

export function cancelOutcome(booking: CancellableBooking, now = Date.now()): CancelOutcome {
  const status = String(booking.payment_status ?? "").toUpperCase();
  const manual = String(booking.payment_method ?? "").toUpperCase() === "MANUAL";
  const paid = (booking.paid_downpayment ?? 0) > 0 || status === "PAID" || status === "SETTLED" || (manual && status !== "");
  if (!paid) return "unpaid";
  if (!refundWindowOpen(booking.appointment_date, booking.appointment_time, now)) return "keep";
  return manual ? "manual-refund" : "refund";
}
