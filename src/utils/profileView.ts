import type { BadgeTone } from "@/components/atoms";
import type { AppointmentView } from "@/types/profile";

/** The stamps a loyalty card needs for a reward until the salon's setting loads (hooks/useStampTarget) */
export const DEFAULT_STAMP_TARGET = 10;
export const stampsToGo = (stamps: number, target = DEFAULT_STAMP_TARGET) => Math.max(0, target - stamps);

/** Start of an appointment in ms. Times are Philippine time whatever the visitor's timezone. */
export function startOf(dateStr: string, timeStr: string): number {
  const start = timeStr.includes("-") ? timeStr.split("-")[0].trim() : timeStr.trim();
  return new Date(`${dateStr}T${start}:00+08:00`).getTime();
}

export function sortSoonest<T extends { appt: { appointment_date: string; appointment_time: string } }>(items: T[]): T[] {
  return [...items].sort(
    (a, b) => startOf(a.appt.appointment_date, a.appt.appointment_time) - startOf(b.appt.appointment_date, b.appt.appointment_time),
  );
}

/** "in 3 days", "in 6 hr", "Starting soon"; "" once it has started or when the time can't be read. */
export function relativeDay(dateStr: string, timeStr: string, now: number): string {
  const ms = startOf(dateStr, timeStr) - now;
  if (Number.isNaN(ms) || ms <= 0) return "";
  const hours = ms / 3_600_000;
  if (hours < 1) return "Starting soon";
  if (hours < 24) return `in ${Math.floor(hours)} hr`;
  const days = Math.floor(hours / 24);
  return `in ${days} day${days === 1 ? "" : "s"}`;
}

/** The hero: the soonest appointment that is still live (an expired payment hold is not). */
export function pickNext(views: AppointmentView[]): AppointmentView | null {
  return sortSoonest(views.filter((v) => !v.isExpired))[0] ?? null;
}

/** The dot of a client's appointment status */
export function statusDotTone(status: string): BadgeTone {
  const s = status.toLowerCase();
  if (s === "pending" || s === "awaiting_proof") return "warning";
  if (s === "confirmed") return "info";
  if (s === "completed") return "success";
  if (s === "cancelled") return "danger";
  if (s === "refunded") return "brand";
  return "neutral";
}
