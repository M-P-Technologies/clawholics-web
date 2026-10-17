import type { Completion } from "./completionService";
import type { BirthdayVoucher } from "./voucherService";
// ADMIN ONLY. Private notes must never reach a client-facing page: do not
// import this file from anything under pages/ or from a non-admin service.
import { ApiError, call, type Auth } from "./catalogService";

export interface ClientNote {
  id: number;
  client_user_id: number;
  /** Set when the note is about one of the client's appointments */
  appointment_id?: number | null;
  author_admin_id: number;
  author_name?: string | null;
  note: string;
  created_at: string;
  updated_at: string;
}

export interface ClientNextSteps {
  client_user_id: number;
  text: string;
  updated_by?: number | null;
  updated_at?: string | null;
}

const base = (clientUserId: number) => `/clients/${clientUserId}`;

export const isNotesApiUnavailable = (err: unknown): boolean =>
  err instanceof ApiError && err.status === 404;

export const fetchNotes = (clientUserId: number, auth: Auth): Promise<ClientNote[]> =>
  call<ClientNote[]>(`${base(clientUserId)}/notes`, { method: "GET" }, auth);

export const addNote = (clientUserId: number, note: string, auth: Auth, appointmentId?: number): Promise<ClientNote> =>
  call<ClientNote>(
    `${base(clientUserId)}/notes`,
    { method: "POST", body: JSON.stringify(appointmentId === undefined ? { note } : { note, appointment_id: appointmentId }) },
    auth,
  );

interface ClientProfile {
  id: number;
  clerk_id: string;
  email: string;
  created_at: string | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  alt_phone: string | null;
  preferred_contact_method: string | null;
  facebook_handle: string | null;
  instagram_handle: string | null;
  /** Date of birth, "YYYY-MM-DD" */
  dob?: string | null;
}
export interface ClientAppointment {
  id: number;
  appointment_date: string;
  appointment_time: string;
  service_name: string;
  nailist_name: string;
  nailist_id?: number | null;
  status: string;
  price: number | null;
  /** For completing the visit: the downpayments paid, the balance the form starts with, and the record once completed */
  paid_downpayment?: number;
  expected_balance?: number;
  completion?: Completion | null;
  /** The latest payment screenshot */
  proof_image_url?: string | null;
  /** For the booking tracker (server times, UTC "YYYY-MM-DD HH:MM:SS") */
  booked_at?: string | null;
  proof_sent_at?: string | null;
  proof_status?: "PENDING" | "APPROVED" | "REJECTED" | null;
  proof_reviewed_at?: string | null;
  payment_status?: string | null;
  /** The client's review of the visit (1-5 stars), if they left one */
  review_id?: number | null;
  /** 1 once an admin approved it for the home page */
  review_approved?: number | null;
  review_rating?: number | null;
  review_comment?: string | null;
  review_photo_url?: string | null;
}
export interface ClientDetails {
  client: ClientProfile;
  summary: { visits: number; totalSpent: number; lastVisit: string | null; nextVisit: string | null; stamps: number; /** Confirmed visits they didn't come to */ noShows?: number };
  appointments: ClientAppointment[];
  /** This year's birthday voucher, with the visit it was used on */
  birthday_voucher?: (BirthdayVoucher & { used_at: string | null; used_on: string | null }) | null;
}

// The client page: profile, summary and every appointment, newest first
export const fetchClient = (clientUserId: number, auth: Auth): Promise<ClientDetails> =>
  call<ClientDetails>(base(clientUserId), { method: "GET" }, auth);

export const updateNote = (
  clientUserId: number,
  noteId: number,
  note: string,
  auth: Auth,
): Promise<ClientNote> =>
  call<ClientNote>(
    `${base(clientUserId)}/notes/${noteId}`,
    { method: "PUT", body: JSON.stringify({ note }) },
    auth,
  );

export const deleteNote = (clientUserId: number, noteId: number, auth: Auth): Promise<void> =>
  call<void>(`${base(clientUserId)}/notes/${noteId}`, { method: "DELETE" }, auth);

export const fetchNextSteps = (clientUserId: number, auth: Auth): Promise<ClientNextSteps> =>
  call<ClientNextSteps>(`${base(clientUserId)}/next-steps`, { method: "GET" }, auth);

export const saveNextSteps = (
  clientUserId: number,
  text: string,
  auth: Auth,
): Promise<ClientNextSteps> =>
  call<ClientNextSteps>(
    `${base(clientUserId)}/next-steps`,
    { method: "PUT", body: JSON.stringify({ text }) },
    auth,
  );
