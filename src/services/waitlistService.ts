import { API_BASE_URL } from "../apiConfig";
import { BookingError } from "./bookingService";

// The waitlist: a client asks to be told if a time opens up on a fully booked day
// (POST /waitlist; server/waitlist.ts).

/** For one artist (nailist_id), or any artist who does the service (null) */
export interface WaitlistRequest {
  service_id: number;
  nailist_id: number | null;
  /** YYYY-MM-DD */
  date: string;
}

export const joinWaitlist = async (request: WaitlistRequest, token?: string | null): Promise<{ id: number; already: boolean }> => {
  const res = await fetch(`${API_BASE_URL}/waitlist`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-clawholics-origin": "frontend", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(request),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new BookingError(json.message || "We couldn't add you to the waitlist", res.status, undefined, typeof json.code === "string" ? json.code : undefined);
  }
  return json;
};

/** A day the client is waiting for */
export interface WaitingDay {
  id: number;
  service_id: number;
  service_name: string;
  /** Null: any artist who does the service */
  nailist_id: number | null;
  nailist_name: string | null;
  appointment_date: string;
}

const headers = (token?: string | null) => ({ "Content-Type": "application/json", "x-clawholics-origin": "frontend", ...(token ? { Authorization: `Bearer ${token}` } : {}) });

export const fetchMyWaitlist = async (token?: string | null): Promise<WaitingDay[]> => {
  const res = await fetch(`${API_BASE_URL}/waitlist?t=${Date.now()}`, { headers: headers(token) });
  const json = await res.json().catch(() => null);
  if (!res.ok || !Array.isArray(json)) throw new Error("We couldn't load your waiting list");
  return json;
};

export const leaveWaitlist = async (id: number, token?: string | null) => {
  const res = await fetch(`${API_BASE_URL}/waitlist/${id}`, { method: "DELETE", headers: headers(token) });
  if (!res.ok) throw new Error("We couldn't take you off the list");
};

export const fetchEmailPreferences = async (token?: string | null): Promise<{ rebook_emails: boolean }> => {
  const res = await fetch(`${API_BASE_URL}/users/email-preferences?t=${Date.now()}`, { headers: headers(token) });
  const json = await res.json().catch(() => null);
  if (!res.ok || typeof json?.rebook_emails !== "boolean") throw new Error("We couldn't load your email settings");
  return json;
};

export const saveEmailPreferences = async (rebookEmails: boolean, token?: string | null) => {
  const res = await fetch(`${API_BASE_URL}/users/email-preferences`, { method: "PUT", headers: headers(token), body: JSON.stringify({ rebook_emails: rebookEmails }) });
  if (!res.ok) throw new Error("We couldn't save that");
};
