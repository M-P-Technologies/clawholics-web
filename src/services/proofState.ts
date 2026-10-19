import type { ProofSummary } from "./proofService";
import { parseServerTime } from "./serverTime";

export interface ProofAppointment {
  status: string;
  proof_due_at?: string | null;
  latest_proof?: ProofSummary | null;
}

export type ProofUiState =
  | { kind: "none" }
  | { kind: "needs_proof"; msLeft: number | null }
  | { kind: "overdue"; msOver: number }
  | { kind: "in_review"; proof: ProofSummary }
  | { kind: "rejected"; proof: ProofSummary; note: string }
  | { kind: "approved"; proof: ProofSummary };

const norm = (value?: string | null) => (value ?? "").trim().toLowerCase();

const ACTIVE_STATUSES = ["pending", "awaiting_proof", "confirmed"];

export const isActiveAppointmentStatus = (status?: string | null): boolean =>
  ACTIVE_STATUSES.includes(norm(status));

// One place decides what a proof looks like, so the client card and the
// admin filters and badges always agree.
export function getProofState(appt: ProofAppointment, now: number): ProofUiState {
  const status = norm(appt.status);
  const proof = appt.latest_proof ?? null;

  if (status === "confirmed") {
    return proof?.status === "APPROVED" ? { kind: "approved", proof } : { kind: "none" };
  }
  // Waiting for a proof: paid by proof
  if (status !== "awaiting_proof") return { kind: "none" };

  if (proof) {
    if (proof.status === "PENDING") return { kind: "in_review", proof };
    if (proof.status === "APPROVED") return { kind: "approved", proof };
    return { kind: "rejected", proof, note: proof.admin_note?.trim() ?? "" };
  }

  const due = parseServerTime(appt.proof_due_at);
  if (Number.isNaN(due)) return { kind: "needs_proof", msLeft: null };
  return due <= now
    ? { kind: "overdue", msOver: now - due }
    : { kind: "needs_proof", msLeft: due - now };
}

// Admin-side flag: past the deadline with no pending or approved proof. A
// rejected proof still counts, even though the client card keeps showing
// the rejection note so they can re-upload.
export function isProofOverdue(appt: ProofAppointment, now: number): boolean {
  const state = getProofState(appt, now);
  if (state.kind === "overdue") return true;
  if (state.kind !== "rejected") return false;
  const due = parseServerTime(appt.proof_due_at);
  return !Number.isNaN(due) && due <= now;
}

export function formatDuration(ms: number): string {
  const totalMinutes = Math.max(0, Math.floor(ms / 60_000));
  if (totalMinutes < 1) return "less than a minute";
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours === 0 ? `${minutes}m` : `${hours}h ${minutes}m`;
}
