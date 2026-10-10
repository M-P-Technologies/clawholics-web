import { API_BASE_URL } from "../apiConfig";

const getHeaders = (token?: string | null) => ({
  "Content-Type": "application/json",
  "x-clawholics-origin": "frontend",
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
});

export const fetchPaymentSettings = async (): Promise<{ downpayment_amount: number; payment_methods: string[] }> => {
  const res = await fetch(`${API_BASE_URL}/settings/payment`, { headers: getHeaders() });
  if (!res.ok) throw new Error("Failed to load payment settings");
  return res.json();
};

export const createPayment = async (
  data: {
    appointment_id: number;
    payment_method: string;
  },
  token?: string | null,
) => {
  const res = await fetch(`${API_BASE_URL}/payment/create`, {
    method: "POST",
    headers: getHeaders(token),
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || errorData.error || "Failed to create payment");
  }

  return res.json();
};
