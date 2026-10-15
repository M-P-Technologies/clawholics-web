import type { Appointment, AppointmentStatus } from "../api/appointmentService";
import { getProofState, isProofOverdue } from "../../payments/lib/proofState";

export type AppointmentFilterStatus =
  | "ALL"
  | AppointmentStatus
  | "PROOF_PENDING"
  | "PROOF_OVERDUE";

export function matchesAppointmentFilter(
  appointment: Appointment,
  filter: AppointmentFilterStatus,
  now: number,
): boolean {
  if (filter === "ALL") return true;
  if (filter === "PROOF_PENDING") return getProofState(appointment, now).kind === "in_review";
  if (filter === "PROOF_OVERDUE") return isProofOverdue(appointment, now);
  return (appointment.status ?? "").trim().toUpperCase() === filter;
}
