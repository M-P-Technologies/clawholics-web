import { parseServerTime } from "../../services/serverTime";
import type { AdminNotification } from "../../services/notificationService";

// What the admin bell says about each new booking, and where it leads

/** How often the bell asks for new notifications while an admin screen is open (and visible) */
export const NOTIFICATIONS_POLL_MS = 30_000;

const TITLES: Record<AdminNotification["kind"], string> = {
  booking_paid: "Booking paid, to confirm",
  proof_uploaded: "Payment proof to review",
  visit_to_complete: "Visit to complete",
};
/** "Booking paid, to confirm", "Payment proof to review" or "Visit to complete" */
export const notificationTitle = (n: AdminNotification) => TITLES[n.kind] ?? TITLES.booking_paid;

/** "Ana Cruz · Gel manicure with Maxine · Oct 20, 2:00 PM" (whatever of it is known) */
export function notificationLine(n: AdminNotification) {
  const who = n.client_name || "A client";
  const what = [n.service_name, n.nailist_name && `with ${n.nailist_name}`].filter(Boolean).join(" ");
  const when = [formatDay(n.appointment_date), n.appointment_time].filter(Boolean).join(", ");
  return [who, what, when].filter(Boolean).join(" · ");
}

/** A proof opens the proofs to review; a paid booking the bookings to confirm; a visit to complete the client's page (a walk-in, who has none, the list of them) */
export function notificationLink(n: AdminNotification) {
  if (n.kind === "proof_uploaded") return "/clients?status=PROOF_PENDING";
  if (n.kind === "visit_to_complete") return n.client_user_id ? `/clients/${n.client_user_id}` : "/clients?status=TO_COMPLETE";
  return "/clients?status=AWAITING_CONFIRMATION";
}

/** "just now", "5 min ago", "3 h ago", "2 days ago" */
export function notificationAge(createdAt: string, now = Date.now()) {
  const time = parseServerTime(createdAt);
  if (Number.isNaN(time)) return "";
  const minutes = Math.floor((now - time) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "yesterday" : `${days} days ago`;
}

function formatDay(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  if (!y || !m || !d) return date;
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
