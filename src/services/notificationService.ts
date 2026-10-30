import { API_BASE_URL } from "../apiConfig";

/** A new booking the admins hear about: paid online, or a payment proof sent for review */
export interface AdminNotification {
  id: number;
  kind: "booking_paid" | "proof_uploaded" | "visit_to_complete" | "payment_to_check" | "refund_to_send";
  appointment_id: number | null;
  /** The booking's client (users.id), for the link to their page */
  client_user_id: number | null;
  /** The client's Clerk id, for their photo (null for the walk-in guest) */
  client_clerk_id?: string | null;
  client_name: string;
  service_name: string;
  nailist_name: string;
  appointment_date: string;
  appointment_time: string;
  /** UTC, "YYYY-MM-DD HH:MM:SS" */
  created_at: string;
  unread: boolean;
}

/** How many the bell lists at a time (the list's height is made for five rows) */
export const NOTIFICATIONS_PAGE_SIZE = 5;

/** One page of the bell's list, newest first */
export interface AdminNotifications {
  unread: number;
  notifications: AdminNotification[];
  /** There are older ones to load as the admin scrolls */
  hasMore: boolean;
}

const headers = (token?: string | null, clerkId?: string | null) => ({
  "Content-Type": "application/json",
  "x-clawholics-origin": "frontend",
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
  ...(clerkId ? { clerk_id: clerkId } : {}),
});

// A page of the notifications, marked unread or not for the signed-in admin (admin only): the
// newest, or with `before` the ones older than that id
export const fetchAdminNotifications = async (token?: string | null, clerkId?: string | null, before?: number): Promise<AdminNotifications> => {
  const query = `limit=${NOTIFICATIONS_PAGE_SIZE}${before ? `&before=${before}` : ""}`;
  const res = await fetch(`${API_BASE_URL}/notifications?${query}`, { headers: headers(token, clerkId) });
  if (!res.ok) throw new Error(`Failed to load the notifications (${res.status})`);
  // Anything but the expected shape is a failed load, so it can't break the top bar it's in
  const body: Partial<AdminNotifications> | null = await res.json().catch(() => null);
  if (!body || !Array.isArray(body.notifications) || typeof body.unread !== "number") {
    throw new Error("Unexpected notifications answer");
  }
  return { ...body, hasMore: body.hasMore === true } as AdminNotifications;
};

// The signed-in admin has seen every notification up to `upTo` (admin only)
export const markAdminNotificationsRead = async (upTo: number, token?: string | null, clerkId?: string | null) => {
  const res = await fetch(`${API_BASE_URL}/notifications/read`, {
    method: "POST",
    headers: headers(token, clerkId),
    body: JSON.stringify({ upTo }),
  });
  if (!res.ok) throw new Error(`Failed to mark the notifications read (${res.status})`);
};
