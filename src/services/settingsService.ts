import { API_BASE_URL } from "../apiConfig";

// The salon's settings (Admin > Settings): the online downpayment, how clients may pay it, and
// the birthday voucher's discount and the loyalty card's stamps

export interface SalonSettings {
  downpayment_amount: number;
  payment_methods: string[];
  birthday_discount_pct: number;
  loyalty_stamps_required: number;
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
