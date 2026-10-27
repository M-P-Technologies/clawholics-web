import { parseServerTime } from "../../services/serverTime";
import { timeRangeLabel } from "../timeFormat";
import type { AdminNotification } from "../../services/notificationService";

// What the admin bell says about each new booking, and where it leads

/** How often the bell asks for new notifications while an admin screen is open (and visible) */
export const NOTIFICATIONS_POLL_MS = 30_000;

const TITLES: Record<AdminNotification["kind"], string> = {
  booking_paid: "New booking paid",
  proof_uploaded: "Payment proof to review",
  visit_to_complete: "Visit to complete",
  payment_to_check: "Payment to check: refund?",
};
/** "New booking paid", "Payment proof to review", "Visit to complete" or "Payment to check: refund?" */
export const notificationTitle = (n: AdminNotification) => TITLES[n.kind] ?? TITLES.booking_paid;

/** "Ana Cruz · Gel manicure with Maxine · Oct 20, 2:00 PM" (whatever of it is known) */
export function notificationLine(n: AdminNotification) {
  const { booking, when } = notificationParts(n);
  return [booking, when].filter(Boolean).join(" · ");
}

/** The same, in two parts for the bell's two lines: "Ana Cruz · Gel with Maxine", and the visit's "Oct 20, 2:00 PM" */
export function notificationParts(n: AdminNotification) {
  const who = n.client_name || "A client";
  const what = [n.service_name, n.nailist_name && `with ${n.nailist_name}`].filter(Boolean).join(" ");
  const when = [formatDay(n.appointment_date), timeRangeLabel(n.appointment_time)].filter(Boolean).join(", ");
  return { booking: [who, what].filter(Boolean).join(" · "), when };
}

/** A proof opens the proofs to review; a paid booking, a visit to complete or a payment to check the client's page (a walk-in, who has none, the list of them) */
export function notificationLink(n: AdminNotification) {
  if (n.kind === "proof_uploaded") return "/clients?status=PROOF_PENDING";
  if (n.kind === "visit_to_complete") return n.client_user_id ? `/clients/${n.client_user_id}` : "/clients?status=TO_COMPLETE";
  if (n.kind === "payment_to_check") return n.client_user_id ? `/clients/${n.client_user_id}` : "/clients";
  return n.client_user_id ? `/clients/${n.client_user_id}` : "/clients?status=CONFIRMED";
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
