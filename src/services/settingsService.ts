import { API_BASE_URL } from "../apiConfig";

// The salon's settings (Admin > Settings): the online downpayment, how clients may pay it, and
// the birthday voucher's discount, the loyalty card's stamps and how long a booking holds its slot

export interface SalonSettings {
  downpayment_amount: number;
  payment_methods: string[];
  birthday_discount_pct: number;
  loyalty_stamps_required: number;
  /** How long a new booking holds its slot while the client pays */
  booking_hold_minutes: number;
  /** How many hours before its start a slot stops being bookable by clients */
  booking_min_notice_hours: number;
  /** Whether clients get a reminder email the day before their visit */
  booking_reminders_enabled: boolean;
}

const getHeaders = (token?: string | null) => ({
  "Content-Type": "application/json",
  "x-clawholics-origin": "frontend",
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
});

/** The stamps a loyalty card needs for a reward (public) */
export const fetchLoyaltySettings = async (): Promise<{ stamps_required: number }> => {
  const res = await fetch(`${API_BASE_URL}/settings/loyalty`, { headers: getHeaders() });
  if (!res.ok) throw new Error("Failed to load the loyalty card settings");
  return res.json();
};

/** The notice a booking needs, in hours (public: the booking calendar applies it) */
export const fetchBookingSettings = async (): Promise<{ min_notice_hours: number }> => {
  const res = await fetch(`${API_BASE_URL}/settings/booking`, { headers: getHeaders() });
  if (!res.ok) throw new Error("Failed to load the booking settings");
  return res.json();
};

export const fetchSettings = async (token?: string | null): Promise<SalonSettings> => {
  const res = await fetch(`${API_BASE_URL}/settings`, { headers: getHeaders(token) });
  if (!res.ok) throw new Error("Failed to load the settings");
  return res.json();
};

export const updateSettings = async (settings: SalonSettings, token?: string | null): Promise<SalonSettings> => {
  const res = await fetch(`${API_BASE_URL}/settings`, { method: "PUT", headers: getHeaders(token), body: JSON.stringify(settings) });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error || data?.message || "Failed to save the settings");
  return data as SalonSettings;
};
