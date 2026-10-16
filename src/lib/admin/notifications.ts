import { parseServerTime } from "../../services/serverTime";
import { timeRangeLabel } from "../timeFormat";
import type { AdminNotification } from "../../services/notificationService";

// What the admin bell says about each new booking, and where it leads

/** How often the bell asks for new notifications while an admin screen is open (and visible) */
export const NOTIFICATIONS_POLL_MS = 30_000;

/** "Booking paid, to confirm" or "Payment proof to review" */
export const notificationTitle = (n: AdminNotification) => (n.kind === "proof_uploaded" ? "Payment proof to review" : "Booking paid, to confirm");

/** "Ana Cruz · Gel manicure with Maxine · Oct 20, 2:00 PM" (whatever of it is known) */
export function notificationLine(n: AdminNotification) {
  const who = n.client_name || "A client";
  const what = [n.service_name, n.nailist_name && `with ${n.nailist_name}`].filter(Boolean).join(" ");
  const when = [formatDay(n.appointment_date), timeRangeLabel(n.appointment_time)].filter(Boolean).join(", ");
  return [who, what, when].filter(Boolean).join(" · ");
}

/** A proof opens the list of proofs to review; a paid booking the bookings waiting to be confirmed */
export const notificationLink = (n: AdminNotification) =>
  n.kind === "proof_uploaded" ? "/clients?status=PROOF_PENDING" : "/clients?status=AWAITING_CONFIRMATION";

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
