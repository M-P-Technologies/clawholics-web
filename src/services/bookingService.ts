import { API_BASE_URL } from "../apiConfig";

const getHeaders = (token?: string | null) => ({
  "Content-Type": "application/json",
  "x-clawholics-origin": "frontend",
  ...(token ? { Authorization: `Bearer ${token}` } : {})
});

interface BookingPayload {
  user_id: number;
  service_id: number;
  service_name: string;
  nailist_name: string;
  /** Left out for "any available artist" (any_artist), where the salon assigns one */
  nailist_id?: number | null;
  any_artist?: boolean;
  appointment_date: string;
  appointment_time: string;
  variant_id?: number | null;
  addon_ids?: number[];
}

interface BookingResponse {
  status: string;
  expires_at: string | null;
  error: boolean;
  appointment_id: number;
  total_price?: number;
  /** The artist the booking is with (for any artist, the one assigned) */
  nailist_id?: number;
  nailist_name?: string;
  nailist_category_id?: number | null;
}

export class BookingError extends Error {
  status: number;
  field?: string;
  /** The server's code for the refusal, such as SLOT_TAKEN or PENDING_APPOINTMENT_EXISTS */
  code?: string;

  constructor(message: string, status: number, field?: string, code?: string) {
    super(message);
    this.name = "BookingError";
    this.status = status;
    this.field = field;
    this.code = code;
  }
}

export interface AdminAppointmentPayload {
  first_name: string;
  last_name: string;
  phone: string;
  email?: string;
  service_id: number;
  service_name: string;
  nailist_id: number;
  nailist_name: string;
  appointment_date: string;
  appointment_time: string;
}

export const fetchNailists = async (serviceId?: number) => {
  const url = serviceId
    ? `${API_BASE_URL}/booking/nailists?service_id=${serviceId}`
    : `${API_BASE_URL}/booking/nailists`;

  const res = await fetch(url, { headers: getHeaders() });
  return res.json();
};

export const fetchBookedSlotsDetailed = async (
  nailist_id: number,
  date: string,
) => {
  const res = await fetch(
    `${API_BASE_URL}/booking/slots-detailed?nailist_id=${nailist_id}&date=${date}`,
    { headers: getHeaders() }
  );
  return res.json();
};
/** For "any available artist": the times at least one artist offering the service has free, by day (YYYY-MM-DD) */
export const fetchAnyAvailability = async (serviceId: number, from: string, to: string): Promise<{ days: Record<string, string[]>; full: string[] }> => {
  const res = await fetch(`${API_BASE_URL}/booking/any-availability?service_id=${serviceId}&from=${from}&to=${to}`, { headers: getHeaders() });
  if (!res.ok) throw new Error("Failed to fetch the available times");
  return res.json();
};

/** An artist's taken times on every day from `from` to `to` (YYYY-MM-DD), in one request */
export const fetchBookedSlotsRange = async (
  nailist_id: number,
  from: string,
  to: string,
): Promise<{ appointment_date: string; appointment_time: string }[]> => {
  const res = await fetch(
    `${API_BASE_URL}/booking/slots-range?nailist_id=${nailist_id}&from=${from}&to=${to}`,
    { headers: getHeaders() },
  );
  if (!res.ok) throw new Error("Failed to fetch the booked times");
  return res.json();
};

export const createBooking = async (
  data: BookingPayload,
  token?: string | null,
): Promise<BookingResponse> => {
  const res = await fetch(`${API_BASE_URL}/booking/create`, {
    method: "POST",
    headers: getHeaders(token),
    body: JSON.stringify(data),
  });

  const json = await res.json();

  if (!res.ok) {
    // Some responses explain the problem in `message`, others in `error`
    const reason = json.message || (typeof json.error === "string" ? json.error : "");
    throw new BookingError(reason || "Booking failed", res.status, json.field, typeof json.code === "string" ? json.code : undefined);
  }

  return json;
};

export const createAdminAppointment = async (
  data: AdminAppointmentPayload,
) => {
  const res = await fetch(`${API_BASE_URL}/booking/admin/create`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(data),
  });

  const json = await res.json();

  if (!res.ok) {
    throw new Error(json.code || json.message || "Failed to create appointment");
  }

  return json;
};
export const rescheduleAppointment = async (
  id: number,
  newDate: string,
  newTime: string,
  token: string | null 
) => {
  const res = await fetch(`${API_BASE_URL}/booking/${id}/reschedule`, {
    method: "POST", 
    headers: getHeaders(token),
    body: JSON.stringify({ newDate, newTime }),
  });

  const json = await res.json();

  if (!res.ok) {
    throw new Error(json.message || "Failed to reschedule appointment");
  }

  return json;
};
