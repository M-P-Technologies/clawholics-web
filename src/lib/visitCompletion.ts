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
