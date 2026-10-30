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
