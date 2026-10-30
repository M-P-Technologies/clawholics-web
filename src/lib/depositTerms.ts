import { RESERVATION_FEE } from "@/lib/visitCompletion";

// The booking deposit the salon asks for (set in Admin > Settings) and how it splits: of it,
// RESERVATION_FEE is a non-refundable reservation fee and the rest comes off the final bill.
// Every screen and email that quotes the amounts takes them from here, not from typed-in pesos.

export interface DepositTerms {
  /** What the client pays online to secure the slot */
  total: number;
  /** The non-refundable part */
  fee: number;
  /** The part deducted from the final bill */
  deductible: number;
}

export function depositTerms(downpayment: number): DepositTerms {
  const total = Math.max(0, Math.round(downpayment));
  return { total, fee: Math.min(RESERVATION_FEE, total), deductible: Math.max(0, total - RESERVATION_FEE) };
}
