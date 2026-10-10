import { API_BASE_URL } from "../apiConfig";
import type { ProofSummary } from "./proofService";

const BASE_URL = `${API_BASE_URL}/booking/appointments`;

export type AppointmentStatus =
  | "PENDING"
  | "AWAITING_PROOF"
  | "CONFIRMED"
  | "COMPLETED"
  | "CANCELLED"
  | "REFUNDED";

export interface Appointment {
  id: number;
  user_id: number;
  service_name: string;
  nailist_id?: number | null;
  nailist_name: string;
  appointment_date: string;
  appointment_time: string;
  status: AppointmentStatus | string;
  created_at?: string;

  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  phone?: string | null;

  payment_status?: string | null;
  payment_method?: string | null;
  payment_amount?: number | null;
  payment_reference?: string | null;

  proof_due_at?: string | null;
  latest_proof?: ProofSummary | null;
  is_walkin?: boolean | number | null;
}

const getHeaders = (token?: string | null, clerkId?: string | null) => {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "x-clawholics-origin": "frontend"
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (clerkId) headers["clerk_id"] = clerkId;
  return headers;
};

export const fetchAppointments = async (
  statuses?: AppointmentStatus[],
  token?: string | null,
  clerkId?: string | null
): Promise<Appointment[]> => {
  const queryParts = [];
  if (statuses && statuses.length > 0) {
    queryParts.push(`status=${encodeURIComponent(statuses.join(","))}`);
  }
  queryParts.push(`t=${Date.now()}`);
  
  const query = `?${queryParts.join("&")}`;

  const res = await fetch(`${BASE_URL}${query}`, {
    headers: getHeaders(token, clerkId)
  });

  if (!res.ok) {
    if (res.status === 403) window.location.href = "/";
    throw new Error("Failed to fetch appointments");
  }

  return res.json();
};

export const fetchAppointmentById = async (
  id: number,
  token?: string | null,
  clerkId?: string | null
): Promise<Appointment> => {
  const res = await fetch(`${BASE_URL}/${id}?t=${Date.now()}`, {
    headers: getHeaders(token, clerkId)
  });

  if (!res.ok) {
    if (res.status === 403) window.location.href = "/";
    throw new Error("Failed to fetch appointment");
  }

  return res.json();
};

export const updateAppointmentStatus = async (
  id: number,
  status: AppointmentStatus,
  token?: string | null,
  clerkId?: string | null
): Promise<Appointment> => {
  const res = await fetch(`${BASE_URL}/${id}/status`, {
    method: "PATCH",
    headers: getHeaders(token, clerkId),
    body: JSON.stringify({ status }),
  });

  if (!res.ok) {
    if (res.status === 403) window.location.href = "/";
    const errorText = await res.text();
    console.error("Update appointment status failed:", res.status, errorText);
    throw new Error(errorText || "Failed to update appointment status");
  }

  return res.json();
};
