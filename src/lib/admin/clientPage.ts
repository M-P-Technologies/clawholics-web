import { Cake, CalendarClock, CalendarDays, Mail, MessageCircle, Phone, Sparkles } from "lucide-react";
import type { ComponentType } from "react";
import { FacebookIcon, InstagramIcon } from "../../components/ui/SocialIcons";
import type { StepState } from "../bookingTracker";
import type { ClientDetails } from "../../services/clientNotesService";
import { parseServerTime } from "../../services/serverTime";

// The admin client page's labels, styles and the rows of its Client info list

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2026-09-05" → "Sep 5, 2026"; "–" for none */
export const dateLabel = (ymd: string | null) => {
  if (!ymd) return "–";
  const [y, m, d] = ymd.split("-").map(Number);
  return `${MONTHS[m - 1]} ${d}, ${y}`;
};

/** A server time (UTC) as a local date and time, e.g. "Oct 10, 2026, 1:55 PM" */
export const whenLabel = (value: string | null | undefined) => {
  const time = parseServerTime(value);
  return Number.isNaN(time) ? "" : new Date(time).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
};

const STATUS: Record<string, { label: string; className: string }> = {
  COMPLETED: { label: "Completed", className: "bg-success/20 text-gray-red" },
  CONFIRMED: { label: "Confirmed", className: "bg-crimson-light/50 text-berry" },
  PENDING: { label: "Pending", className: "bg-sand text-gray-red" },
  AWAITING_PROOF: { label: "Awaiting proof", className: "bg-sand text-gray-red" },
  CANCELLED: { label: "Cancelled", className: "bg-danger/15 text-gray-red" },
  CANCELED: { label: "Cancelled", className: "bg-danger/15 text-gray-red" },
  REFUNDED: { label: "Refunded", className: "bg-danger/15 text-gray-red" },
};
/** An appointment status's label and pill colours */
export const statusOf = (status: string) => STATUS[status] ?? { label: status, className: "bg-sand text-gray-red" };

export const noteFieldClass =
  "w-full rounded-md border border-crimson-light bg-milk px-3 py-2 text-sm text-gray-red outline-none focus:ring-2 focus:ring-crimson";

export type ClientTab = "overview" | "notes" | "appointments";
export const CLIENT_TABS: { value: ClientTab; label: string }[] = [
  { value: "overview", label: "Overview" },
  { value: "notes", label: "Notes & next steps" },
  { value: "appointments", label: "Appointments" },
];

/** The booking tracker's colours for each step state */
export const STEP_STYLE: Record<StepState, { dot: string; bar: string; title: string }> = {
  done: { dot: "bg-crimson text-light-orange", bar: "bg-crimson", title: "text-gray-red" },
  current: { dot: "border-2 border-crimson bg-milk text-berry", bar: "bg-crimson-light", title: "text-berry" },
  upcoming: { dot: "bg-crimson-light/40 text-gray-red/50", bar: "bg-crimson-light/50", title: "text-gray-red/50" },
  stopped: { dot: "bg-danger/15 text-danger", bar: "bg-crimson-light/50", title: "text-danger" },
};

/** A step state, read out after the step's title */
export const stepStateLabel = (state: StepState) =>
  state === "done" ? "done" : state === "current" ? "in progress" : state === "stopped" ? "stopped" : "not yet";

/** A date of birth ("1998-03-14") as "Mar 14, 1998"; null when there is none or it is not a date */
export const birthdayLabel = (dob?: string | null) => (dob && /^\d{4}-\d{2}-\d{2}/.test(dob) ? dateLabel(dob.slice(0, 10)) : null);

export interface ClientInfoRow {
  label: string;
  value: string | null;
  Icon: ComponentType<{ className?: string }>;
}

/** The Client info list: contact details, when they joined, and their last and next visits */
export const clientInfoRows = ({ client, summary }: Pick<ClientDetails, "client" | "summary">): ClientInfoRow[] =>
  [
    { label: "Email", value: client.email, Icon: Mail },
    { label: "Phone", value: client.phone, Icon: Phone },
    { label: "Other phone", value: client.alt_phone, Icon: Phone },
    { label: "Instagram", value: client.instagram_handle, Icon: InstagramIcon },
    { label: "Facebook", value: client.facebook_handle, Icon: FacebookIcon },
    { label: "Prefers", value: client.preferred_contact_method, Icon: MessageCircle },
    { label: "Birthday", value: birthdayLabel(client.dob), Icon: Cake },
    { label: "Client since", value: client.created_at ? dateLabel(client.created_at.slice(0, 10)) : null, Icon: CalendarDays },
    { label: "Last visit", value: summary.lastVisit ? dateLabel(summary.lastVisit) : null, Icon: Sparkles },
    { label: "Next visit", value: summary.nextVisit ? dateLabel(summary.nextVisit) : null, Icon: CalendarClock },
  ].filter((row) => row.value);

/** The client's name, or their email when they never gave one */
export const clientName = (client: ClientDetails["client"]) => `${client.first_name ?? ""} ${client.last_name ?? ""}`.trim() || client.email;

/** Today's date in Manila ("YYYY-MM-DD") */
export const manilaToday = () => new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 10);
