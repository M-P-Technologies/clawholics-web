import type { Appointment, AppointmentStatus } from "./appointmentService";
import { getProofState, isProofOverdue } from "./proofState";

export type AppointmentFilterStatus =
  | "ALL"
  | AppointmentStatus
  | "PROOF_PENDING"
  | "PROOF_OVERDUE"
  | "TO_COMPLETE"
  | "PHOTOS_TO_ADD";

/** A confirmed visit that is over (Manila time), waiting to be completed: the server's TO_COMPLETE_SQL */
function isVisitToComplete(appointment: Appointment, now: number): boolean {
  if ((appointment.status ?? "").trim().toUpperCase() !== "CONFIRMED") return false;
  const manila = new Date(now + 8 * 3600 * 1000).toISOString();
  const [today, clock] = [manila.slice(0, 10), manila.slice(11, 16)];
  const [start, end] = (appointment.appointment_time ?? "").split("-").map((t) => t.trim().padStart(5, "0"));
  return appointment.appointment_date < today || (appointment.appointment_date === today && (end || start) <= clock);
}

export function matchesAppointmentFilter(
  appointment: Appointment,
  filter: AppointmentFilterStatus,
  now: number,
): boolean {
  if (filter === "ALL") return true;
  if (filter === "PROOF_PENDING") return getProofState(appointment, now).kind === "in_review";
  if (filter === "PROOF_OVERDUE") return isProofOverdue(appointment, now);
  if (filter === "TO_COMPLETE") return isVisitToComplete(appointment, now);
  if (filter === "PHOTOS_TO_ADD") return (appointment.status ?? "").trim().toUpperCase() === "COMPLETED" && appointment.completion?.photos_added === 0;
  return (appointment.status ?? "").trim().toUpperCase() === filter;
}
