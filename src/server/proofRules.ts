import "server-only";
import { getSql } from "./db";

// Payment screenshots (payment_proofs): a booking paid by proof (PENDING, or the old
// AWAITING_PROOF) and a booking paid online waiting for the salon (AWAITING_CONFIRMATION) both
// carry one, and an admin checks it before the booking is confirmed.

const LATEST_PROOF_STATUS = (alias: string) =>
  `(select pp.status from payment_proofs pp where pp.appointment_id = ${alias}.id order by pp.created_at desc, pp.id desc limit 1)`;

/** SQL: the booking (`alias` is its appointments row) has a proof waiting for review */
export const PROOF_TO_REVIEW_SQL = (alias: string) =>
  `(upper(trim(${alias}.status)) in ('PENDING', 'AWAITING_PROOF', 'AWAITING_CONFIRMATION') and ${LATEST_PROOF_STATUS(alias)} = 'PENDING')`;

/** The booking's latest proof, when it's pending or approved: enough to confirm the booking */
export async function usableProof(appointmentId: number): Promise<{ id: number; status: string } | null> {
  const [latest] = await getSql()<{ id: number; status: string }[]>`
    select id, status from payment_proofs where appointment_id = ${appointmentId}
    order by created_at desc, id desc limit 1
  `;
  return latest && (latest.status === "PENDING" || latest.status === "APPROVED") ? latest : null;
}
