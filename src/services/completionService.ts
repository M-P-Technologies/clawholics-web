import { call, type Auth } from "./catalogService";
import { compressImageToWebp, PHOTO_UPLOAD_OPTIONS } from "./uploadService";
import type { BalanceMethod } from "../lib/visitCompletion";

/** A completed visit's record: the balance paid at the salon, how, and the artist who did it */
export interface Completion {
  balance_amount: number;
  payment_method: BalanceMethod;
  nailist_id: number;
  nailist_name?: string | null;
}

/** What completing a visit needs to know about it */
export interface VisitToComplete {
  id: number;
  status: string;
  appointment_date: string;
  nailist_id: number | null;
  /** The booked service's menu price with the booked artist */
  price: number | null;
  /** The downpayments paid on it */
  paid_downpayment: number;
  completion: Completion | null;
}

export interface CompletionForm {
  balance_amount: number;
  payment_method: BalanceMethod;
  nailist_id: number;
  photos: File[];
}

// The photos are made smaller in the browser first, like the admin's other uploads
export const saveCompletion = async (appointmentId: number, form: CompletionForm, auth: Auth) => {
  const body = new FormData();
  body.set("balance_amount", String(form.balance_amount));
  body.set("payment_method", form.payment_method);
  body.set("nailist_id", String(form.nailist_id));
  for (const photo of form.photos) body.append("file", await compressImageToWebp(photo, PHOTO_UPLOAD_OPTIONS));
  return call<{ completion: Completion; photos: number }>(`/appointments/${appointmentId}/completion`, { method: "PUT", body }, auth);
};
