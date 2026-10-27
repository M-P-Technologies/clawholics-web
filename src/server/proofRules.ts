import "server-only";

// Payment proofs (payment_proofs): a booking paid by proof (PENDING, or the old AWAITING_PROOF)
// carries one, and an admin checks it before the booking is confirmed.

/** The statuses whose latest proof an admin reviews */
export const PROOF_REVIEW_STATUSES = ["PENDING", "AWAITING_PROOF"];

const LATEST_PROOF_STATUS = (alias: string) =>
  `(select pp.status from payment_proofs pp where pp.appointment_id = ${alias}.id order by pp.created_at desc, pp.id desc limit 1)`;

/** SQL: the booking (`alias` is its appointments row) has a proof waiting for review */
export const PROOF_TO_REVIEW_SQL = (alias: string) =>
  `(upper(trim(${alias}.status)) in ('PENDING', 'AWAITING_PROOF') and ${LATEST_PROOF_STATUS(alias)} = 'PENDING')`;
