import type { ClientAppointment } from "../../clients/api/clientNotesService";
import { parseServerTime } from "../../../lib/serverTime";

// The client page's booking tracker: where one appointment is, from booking to the finished
// visit. Booked, downpayment, confirmed, completed; a cancelled or refunded booking stops at the
// step it hadn't reached.

export type StepState = "done" | "current" | "upcoming" | "stopped";

export interface TrackerStep {
  key: "booked" | "downpayment" | "confirmed" | "completed";
  title: string;
  /** What happened, or what it's waiting for */
  detail: string;
  /** When it happened, already formatted (Manila time), if known */
  when?: string;
  state: StepState;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const dateLabel = (ymd: string) => {
  const [y, m, d] = ymd.split("-").map(Number);
  return MONTHS[m - 1] ? `${MONTHS[m - 1]} ${d}, ${y}` : ymd;
};

/** A server time (UTC "YYYY-MM-DD HH:MM:SS") as Manila time, e.g. "Oct 10, 2026, 1:55 PM" */
export function manilaTime(value?: string | null): string | undefined {
  const time = parseServerTime(value);
  if (Number.isNaN(time)) return undefined;
  return new Date(time).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "Asia/Manila" });
}

const ACTIVE = ["PENDING", "AWAITING_PROOF", "CONFIRMED"];

/** The appointment to track: the soonest one still under way, or else the latest */
export function appointmentToTrack(appointments: ClientAppointment[], today: string): ClientAppointment | null {
  const underWay = appointments.filter((a) => ACTIVE.includes(a.status) && a.appointment_date >= today);
  if (underWay.length) return [...underWay].sort((a, b) => `${a.appointment_date} ${a.appointment_time}`.localeCompare(`${b.appointment_date} ${b.appointment_time}`))[0];
  return appointments[0] ?? null;
}

export function trackerSteps(a: ClientAppointment): TrackerStep[] {
  const status = a.status.toUpperCase();
  const confirmed = status === "CONFIRMED" || status === "COMPLETED";
  const visit = `${dateLabel(a.appointment_date)}, ${a.appointment_time}`;

  // The downpayment: paid online, a proof approved, or settled by the salon when it confirmed
  let downpayment: Omit<TrackerStep, "key" | "title">;
  if (a.payment_status === "PAID") downpayment = { state: "done", detail: "Paid online" };
  else if (a.proof_status === "APPROVED") downpayment = { state: "done", detail: "Payment proof approved", when: manilaTime(a.proof_reviewed_at) };
  else if (confirmed) downpayment = { state: "done", detail: "Settled with the salon" };
  else if (a.proof_status === "PENDING") downpayment = { state: "current", detail: "Payment proof sent, waiting for review", when: manilaTime(a.proof_sent_at) };
  else if (a.proof_status === "REJECTED") downpayment = { state: "current", detail: "Payment proof rejected, waiting for a new one", when: manilaTime(a.proof_reviewed_at) };
  else if (status === "AWAITING_PROOF") downpayment = { state: "current", detail: "Waiting for the payment proof" };
  else downpayment = { state: "current", detail: "Waiting for the downpayment" };

  const steps: TrackerStep[] = [
    { key: "booked", title: "Booked", detail: `${a.service_name} with ${a.nailist_name}`, when: manilaTime(a.booked_at), state: "done" },
    { key: "downpayment", title: "Downpayment", ...downpayment },
    {
      key: "confirmed",
      title: "Confirmed",
      detail: confirmed ? `Booked for ${visit}` : "Once the downpayment is in",
      state: confirmed ? "done" : downpayment.state === "done" ? "current" : "upcoming",
    },
    {
      key: "completed",
      title: "Completed",
      detail: status === "COMPLETED" ? `Visited ${visit}` : `Visit on ${visit}`,
      state: status === "COMPLETED" ? "done" : confirmed ? "current" : "upcoming",
    },
  ];

  // A cancelled or refunded booking stops at the first step it hadn't finished
  if (status === "CANCELLED" || status === "CANCELED" || status === "REFUNDED") {
    const stoppedAt = steps.findIndex((step) => step.state !== "done");
    const word = status === "REFUNDED" ? "Refunded" : "Cancelled";
    return steps.map((step, i) =>
      i < stoppedAt || stoppedAt === -1 ? step : i === stoppedAt ? { ...step, state: "stopped", detail: `${word} before this step` } : { ...step, state: "upcoming" },
    );
  }
  return steps;
}
