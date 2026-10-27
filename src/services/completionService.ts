import { call, type Auth } from "./catalogService";
import { compressImageToWebp, PHOTO_UPLOAD_OPTIONS } from "./uploadService";
import type { BalanceMethod } from "../lib/visitCompletion";

/** A completed visit's record: the balance paid at the salon, how, and the artist who did it */
export interface Completion {
  balance_amount: number;
  payment_method: BalanceMethod;
  nailist_id: number;
  nailist_name?: string | null;
  /** When the client came in ("13:17"), and the late fee the terms set */
  arrived_at?: string | null;
  late_fee?: number;
  /** Nail photos added to the gallery; 0 means they're still to add */
  photos_added?: number;
  /** The visit's one nail photo, once added */
  photo_url?: string | null;
  /** The birthday voucher used on it, and what it took off the service price */
  voucher_code?: string | null;
  /** The voucher's percentage off */
  voucher_pct?: number | null;
  voucher_discount?: number;
}

/** What completing a visit needs to know about it */
export interface VisitToComplete {
  id: number;
  status: string;
  appointment_date: string;
  /** "13:00-15:00", for how late the client came */
  appointment_time: string;
  nailist_id: number | null;
  /** The booked service's menu price with the booked artist */
  price: number | null;
  /** The downpayments paid on it */
  paid_downpayment: number;
  completion: Completion | null;
  /** What messages call this visit, e.g. "Audit Tester's Gel Manicure visit" */
  label?: string;
}

interface CompletionForm {
  balance_amount: number;
  payment_method: BalanceMethod;
  nailist_id: number;
  /** "13:17", or empty when they came on time */
  arrived_at: string;
  /** The client's birthday voucher code, or empty for none */
  voucher_code: string;
  photos: File[];
}

// The photos are made smaller in the browser first, like the admin's other uploads
export const saveCompletion = async (appointmentId: number, form: CompletionForm, auth: Auth) => {
  const body = new FormData();
  body.set("balance_amount", String(form.balance_amount));
  body.set("payment_method", form.payment_method);
  body.set("nailist_id", String(form.nailist_id));
  body.set("arrived_at", form.arrived_at);
  body.set("voucher_code", form.voucher_code);
  for (const photo of form.photos) body.append("file", await compressImageToWebp(photo, PHOTO_UPLOAD_OPTIONS));
  return call<{ completion: Completion; photos: number }>(`/appointments/${appointmentId}/completion`, { method: "PUT", body }, auth);
};

/** The largest photo the admin can pick: it's made much smaller in the browser before upload */
export const MAX_VISIT_PHOTO_MB = 5;

// The visit's one nail photo, after it was completed: shrunk to a small WEBP first (R2 space is
// tight), then it replaces the visit's earlier photo in the artist's gallery
export const uploadVisitPhoto = async (appointmentId: number, photo: File, auth: Auth) => {
  const body = new FormData();
  body.set("file", await compressImageToWebp(photo, PHOTO_UPLOAD_OPTIONS));
  return call<{ photo_url: string }>(`/appointments/${appointmentId}/photo`, { method: "PUT", body }, auth);
};
