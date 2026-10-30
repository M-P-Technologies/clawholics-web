import { Cake, CalendarClock, CalendarDays, CalendarX, Gift, Mail, MessageCircle, Phone, Sparkles } from "lucide-react";
import type { ComponentType } from "react";
import { FacebookIcon, InstagramIcon, TikTokIcon, type BadgeTone } from "@/components/atoms";
import type { ClientAppointment, ClientDetails } from "../../services/clientNotesService";
import { manilaDateTime, timeRangeLabel } from "../timeFormat";
import { contactRowHref, preferredContact } from "./contactMethod";

// The admin client page's labels, styles and the rows of its Client info list

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2026-09-05" → "Sep 5, 2026"; "–" for none */
export const dateLabel = (ymd: string | null) => {
  if (!ymd) return "–";
  const [y, m, d] = ymd.split("-").map(Number);
  return `${MONTHS[m - 1]} ${d}, ${y}`;
};

/** A server time (UTC) as Manila date and time, e.g. "Oct 10, 2026, 1:55 PM" */
export const whenLabel = (value: string | null | undefined) => manilaDateTime(value);

const STATUS: Record<string, { label: string; className: string; tone: BadgeTone }> = {
  COMPLETED: { label: "Completed", className: "bg-success/20 text-gray-red", tone: "success" },
  CONFIRMED: { label: "Confirmed", className: "bg-crimson-light/50 text-berry", tone: "brand" },
  PENDING: { label: "Pending", className: "bg-sand text-gray-red", tone: "warning" },
  AWAITING_PROOF: { label: "Awaiting proof", className: "bg-sand text-gray-red", tone: "warning" },
  CANCELLED: { label: "Cancelled", className: "bg-danger/15 text-gray-red", tone: "danger" },
  CANCELED: { label: "Cancelled", className: "bg-danger/15 text-gray-red", tone: "danger" },
  REFUNDED: { label: "Refunded", className: "bg-danger/15 text-gray-red", tone: "danger" },
  NO_SHOW: { label: "No-show", className: "bg-danger/15 text-gray-red", tone: "danger" },
};
/** An appointment status's label, pill colours and Badge tone */
export const statusOf = (status: string) => STATUS[status] ?? { label: status, className: "bg-sand text-gray-red", tone: "warning" as BadgeTone };

export const noteFieldClass =
  "w-full rounded-md border border-crimson-light bg-milk px-3 py-2 text-sm text-gray-red outline-none focus:ring-2 focus:ring-crimson";

export type ClientTab = "overview" | "notes" | "appointments";
export const CLIENT_TABS: { value: ClientTab; label: string }[] = [
  { value: "overview", label: "Overview" },
  { value: "notes", label: "Notes & next steps" },
  { value: "appointments", label: "Appointments" },
];



/** A date of birth ("1998-03-14") as "Mar 14, 1998"; null when there is none or it is not a date */
const birthdayLabel = (dob?: string | null) => (dob && /^\d{4}-\d{2}-\d{2}/.test(dob) ? dateLabel(dob.slice(0, 10)) : null);

/**
 * This year's birthday voucher, for the client info: "K7MX4QPA · 20% off · claimed, until Oct 31, 2026",
 * "… · used on Oct 12, 2026" or "… · expired"; null when they have none
 */
const voucherLabel = (voucher: ClientDetails["birthday_voucher"]) => {
  if (!voucher) return null;
  const state =
    voucher.status === "USED"
      ? `used${voucher.used_on ? ` on ${dateLabel(voucher.used_on)}` : ""}`
      : voucher.status === "EXPIRED"
        ? "expired"
        : `${voucher.status === "CLAIMED" ? "claimed" : "not claimed yet"}, until ${dateLabel(voucher.valid_until)}`;
  return `${voucher.code} · ${voucher.discount_pct}% off · ${state}`;
};

interface ClientInfoRow {
  label: string;
  value: string | null;
  Icon: ComponentType<{ className?: string }>;
  /** Where tapping the value goes (call, text, email, their profile), when it leads anywhere */
  href?: string | null;
}

/** The Client info list: contact details, when they joined, their last and next visits, and their birthday voucher */
const clientInfoRows = ({ client, summary, birthday_voucher }: Pick<ClientDetails, "client" | "summary" | "birthday_voucher">): ClientInfoRow[] => {
  const prefers = preferredContact(client);
  return [
    { label: "Email", value: client.email, Icon: Mail },
    { label: "Phone", value: client.phone, Icon: Phone },
    { label: "Other phone", value: client.alt_phone, Icon: Phone },
    { label: "Instagram", value: client.instagram_handle, Icon: InstagramIcon },
    { label: "Facebook", value: client.facebook_handle, Icon: FacebookIcon },
    { label: "TikTok", value: client.tiktok_handle, Icon: TikTokIcon },
    // "Text message" (tap to text them), or what's missing when they prefer a way they gave no details for
    { label: "Prefers", value: prefers ? (prefers.href ? prefers.label : `${prefers.label} (${prefers.detail})`) : null, Icon: MessageCircle, href: prefers?.href },
    { label: "Birthday", value: birthdayLabel(client.dob), Icon: Cake },
    { label: "Birthday voucher", value: voucherLabel(birthday_voucher), Icon: Gift },
    { label: "Client since", value: client.created_at ? dateLabel(client.created_at.slice(0, 10)) : null, Icon: CalendarDays },
    { label: "Last visit", value: summary.lastVisit ? dateLabel(summary.lastVisit) : null, Icon: Sparkles },
    { label: "Next visit", value: summary.nextVisit ? dateLabel(summary.nextVisit) : null, Icon: CalendarClock },
    // Flagged: the terms say a no-show may be blocked from booking again (the admins decide)
    { label: "No-shows", value: summary.noShows ? String(summary.noShows) : null, Icon: CalendarX },
  ]
    .filter((row) => row.value)
    .map((row) => ({ ...row, href: "href" in row ? row.href : contactRowHref(row.label, row.value) }));
};

/** The client's name, or their email when they never gave one */
export const clientName = (client: ClientDetails["client"]) => `${client.first_name ?? ""} ${client.last_name ?? ""}`.trim() || client.email;

/** Today's date in Manila ("YYYY-MM-DD") */
export const manilaToday = () => new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 10);

/** The client panel's next-visit box */
export const nextVisitHighlight = (next?: ClientAppointment) => ({
  title: "Next visit",
  icon: CalendarClock,
  value: next ? dateLabel(next.appointment_date) : undefined,
  detail: next ? `${timeRangeLabel(next.appointment_time)} · ${next.service_name} with ${next.nailist_name}` : undefined,
  empty: "Nothing booked ahead.",
});

/** The client panel's rows, with their icons */
export const clientPanelRows = (details: Pick<ClientDetails, "client" | "summary" | "birthday_voucher">) =>
  clientInfoRows(details).map(({ label, value, Icon, href }) => ({ label, value, icon: Icon, href }));

/** "1 stamp", "4 stamps" */
export const stampsLabel = (stamps: number) => `${stamps} ${stamps === 1 ? "stamp" : "stamps"}`;

/** What a visit note is about: "About the Sep 5, 2026 visit (Gel polish)" */
export const visitNoteLabel = (visit?: ClientAppointment) => (visit ? `About the ${dateLabel(visit.appointment_date)} visit (${visit.service_name})` : "About a visit");
