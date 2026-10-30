import { peso } from "@/lib/dashboardFormat";

// What cancelling a booking does to the downpayment, shown before the admin confirms. The server
// decides for real (POST /booking/:id/refund); this mirrors its rule so the words match what happens.

/** Bookings that are still to happen: the only ones that can be cancelled */
const OPEN_STATUSES = ["PENDING", "AWAITING_PROOF", "CONFIRMED"];

/**
 * The statuses an admin may pick from a booking's Status menu: its current one (so the menu shows it),
 * Confirmed (to confirm or re-activate it) and No-show (only for a confirmed visit, as the server
 * requires). Cancelling and refunding are the Cancel appointment button's job, since the menu only
 * changes the label (no refund, no email), and a visit is completed from its Complete visit form.
 */
export function manualStatusChoices<T extends string>(current: T, all: readonly T[]): T[] {
  const now = String(current).trim().toUpperCase();
  return all.filter((status) => {
    if (status === current) return true;
    if (status === "CONFIRMED") return true;
    if (status === "NO_SHOW") return now === "CONFIRMED";
    return false;
  });
}

/** What the cancel route answers: Refunded or Cancelled, and, when the money has to be sent back by hand, how much */
export interface CancelResult {
  status: "REFUNDED" | "CANCELLED";
  refundByHand?: boolean;
  refundAmount?: number;
}

/** The toast after cancelling: says plainly when the admin still has money to send back */
export function cancelToast(result: CancelResult, what: string): { title: string; message: string } {
  if (result.refundByHand) {
    const amount = result.refundAmount ? `${peso(result.refundAmount)} downpayment` : "downpayment";
    return {
      title: "Cancelled: send the refund",
      message: `${what} is cancelled. Send the ${amount} back to the client yourself; it's in the bell as "Refund to send".`,
    };
  }
  return {
    title: result.status === "REFUNDED" ? "Cancelled and refunded" : "Appointment cancelled",
    message: `${what} is now ${result.status.toLowerCase()}.`,
  };
}

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
