import type { Completion } from "./completionService";
import { ADMIN } from "@/lib/adminQueries";
import { API_BASE_URL } from "../apiConfig";
import type { ProofSummary } from "./proofService";

const BASE_URL = `${API_BASE_URL}/booking/appointments`;

export type AppointmentStatus =
  | "PENDING"
  | "AWAITING_PROOF"
  /** Paid online; waiting for an admin to confirm it */
  | "AWAITING_CONFIRMATION"
  | "CONFIRMED"
  | "COMPLETED"
  | "CANCELLED"
  | "REFUNDED"
  /** A confirmed visit the client didn't come to (the downpayment is kept) */
  | "NO_SHOW";

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
  /** The booked service's menu price with the booked artist */
  service_price?: number | null;
  /** The downpayments paid, and the completed visit's record (paged admin list) */
  paid_downpayment?: number;
  completion?: Completion | null;
  is_walkin?: boolean | number | null;
  /** The client's completed appointments (on rows of a page from fetchAppointmentPage) */
  client_visits?: number;
}

export type AppointmentSort = "upcoming" | "latest" | "booked_newest" | "booked_oldest";

/** One page of the admin list: which page, its size, and what narrows it */
export interface AppointmentPageParams {
  page: number;
  pageSize: number;
  /** Statuses to include; none means every status */
  statuses?: string[];
  /** Only appointments whose payment proof waits for review */
  proofToReview?: boolean;
  /** Only confirmed visits that are over, waiting to be completed */
  toComplete?: boolean;
  /** Only completed visits whose nail photos are still to add */
  photosToAdd?: boolean;
  /** Only this day, or this day and later (YYYY-MM-DD) */
  on?: string;
  from?: string;
  artist?: string;
  search?: string;
  sort?: AppointmentSort;
}

export interface AppointmentPage {
  rows: Appointment[];
  total: number;
  page: number;
  pageSize: number;
}

/** The first part of every admin appointment-page query's key: invalidating it refreshes all of
 *  them (Clients & Bookings and the dashboard's tables) after a change */
export const ADMIN_APPOINTMENTS_KEY = [ADMIN, "appointments"] as const;

/** One page of the admin appointment list, filtered, searched and sorted by the server */
export const fetchAppointmentPage = async (
  params: AppointmentPageParams,
  token?: string | null,
  clerkId?: string | null,
): Promise<AppointmentPage> => {
  const query = new URLSearchParams({ page: String(params.page), pageSize: String(params.pageSize) });
  if (params.statuses?.length) query.set("status", params.statuses.join(","));
  if (params.proofToReview) query.set("proof", "review");
  if (params.toComplete) query.set("complete", "due");
  if (params.photosToAdd) query.set("complete", "photos");
  if (params.on) query.set("on", params.on);
  if (params.from) query.set("from", params.from);
  if (params.artist) query.set("artist", params.artist);
  if (params.search?.trim()) query.set("q", params.search.trim());
  if (params.sort) query.set("sort", params.sort);

  const res = await fetch(`${BASE_URL}?${query}`, { headers: getHeaders(token, clerkId), cache: "no-store" });
  if (!res.ok) {
    if (res.status === 403) window.location.href = "/";
    throw new Error("Failed to fetch appointments");
  }
  return res.json();
};

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
  clerkId?: string | null,
  /** withoutScreenshot: "Allow anyway", confirming a paid booking whose client sent no screenshot */
  options: { withoutScreenshot?: boolean } = {},
): Promise<Appointment> => {
  const res = await fetch(`${BASE_URL}/${id}/status`, {
    method: "PATCH",
    headers: getHeaders(token, clerkId),
    body: JSON.stringify(options.withoutScreenshot ? { status, without_screenshot: true } : { status }),
  });

  if (!res.ok) {
    if (res.status === 403) window.location.href = "/";
    const errorText = await res.text();
    console.error("Update appointment status failed:", res.status, errorText);
    throw new Error(errorText || "Failed to update appointment status");
  }

  return res.json();
};
