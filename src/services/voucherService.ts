import { call, type Auth } from "./catalogService";

export type VoucherStatus = "ISSUED" | "CLAIMED" | "USED" | "EXPIRED";

/** The client's birthday voucher for this year: a discount on the service price at the salon */
export interface BirthdayVoucher {
  id: number;
  code: string;
  discount_pct: number;
  /** The birthday month's first and last day (YYYY-MM-DD) */
  valid_from: string;
  valid_until: string;
  status: VoucherStatus;
  claimed_at: string | null;
}

/** The signed-in client's voucher for this year, or null */
export const fetchBirthdayVoucher = (auth: Auth): Promise<BirthdayVoucher | null> =>
  call<BirthdayVoucher | null>("/vouchers/birthday", { method: "GET" }, auth);

export const claimBirthdayVoucher = (auth: Auth): Promise<BirthdayVoucher> =>
  call<BirthdayVoucher>("/vouchers/birthday/claim", { method: "POST" }, auth);

/** A voucher the admin can put on a visit, and the pesos it takes off the service price */
export interface VoucherForVisit {
  id: number;
  code: string;
  discount_pct: number;
  valid_until: string;
  discount: number;
}

/** Admin: whether the code the client shows can go on this visit */
export const checkVoucherForVisit = (code: string, appointmentId: number, auth: Auth): Promise<VoucherForVisit> =>
  call<VoucherForVisit>(`/vouchers/check?code=${encodeURIComponent(code.trim())}&appointment_id=${appointmentId}`, { method: "GET" }, auth);

/** Whether the voucher can still be claimed or used (in its month, not used yet) */
export const isLiveVoucher = (v: BirthdayVoucher | null | undefined): v is BirthdayVoucher =>
  !!v && (v.status === "ISSUED" || v.status === "CLAIMED");
