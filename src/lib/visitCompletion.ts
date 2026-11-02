import { DEFAULT_POLICY, type SalonPolicy } from "./policy";
// Completing a visit: what the client pays at the salon on top of the downpayment.
// Salon terms: of the downpayment, ₱100 is a non-refundable reservation fee and the rest is
// deducted from the bill.

export const RESERVATION_FEE = 100;

/** How the balance was paid at the salon, kept for the record */
export const BALANCE_METHODS = ["Cash", "GCash", "Maya", "Bank transfer", "Card", "Other"] as const;
export type BalanceMethod = (typeof BALANCE_METHODS)[number];

/** The balance the form starts with: the menu price less the downpayment paid (without the fee), never below 0 */
export const expectedBalance = (price: number | null, paidDownpayment: number): number =>
  Math.max(0, (price ?? 0) - Math.max(0, paidDownpayment - RESERVATION_FEE));

/** The photos one completion can add to the artist's gallery */
export const MAX_COMPLETION_PHOTOS = 6;

// Late arrivals, by the salon's terms (lib/policy.ts, edited in Admin > Settings): by default 15
// minutes late is a ₱100 fee, 20 minutes ₱150, and from 25 minutes the visit is cancelled (the
// downpayment is kept). If the salon still serves the client, the higher fee applies.

const toMinutes = (hhmm: string) => {
  const match = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!match) return null;
  const [h, m] = [Number(match[1]), Number(match[2])];
  return h < 24 && m < 60 ? h * 60 + m : null;
};

/** How late the client arrived ("13:17") for the booked time ("13:00-15:00"): 0 when early or on time, null when not given */
export function minutesLate(appointmentTime: string, arrivedAt: string): number | null {
  const start = toMinutes(appointmentTime.split("-")[0] ?? "");
  const arrived = toMinutes(arrivedAt);
  if (start === null || arrived === null) return null;
  return Math.max(0, arrived - start);
}

/** The late fee for that many minutes, and whether the terms cancel the visit */
export function lateFee(minutes: number | null, policy: SalonPolicy = DEFAULT_POLICY): { fee: number; cancel: boolean } {
  if (minutes === null) return { fee: 0, cancel: false };
  const rules = [
    { from: policy.late_fee_2_minutes, fee: policy.late_fee_2_amount },
    { from: policy.late_fee_1_minutes, fee: policy.late_fee_1_amount },
  ];
  const fee = rules.find((rule) => minutes >= rule.from)?.fee ?? 0;
  return { fee, cancel: minutes >= policy.late_cancel_minutes };
}
