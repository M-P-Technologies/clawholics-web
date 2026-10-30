-- A new kind of admin notification: "refund_to_send", recorded when a cancelled booking's downpayment
-- has to be sent back by hand (paid by payment proof, or Xendit couldn't refund it: QR Ph payments
-- can't be refunded through its API).
alter table admin_notifications drop constraint admin_notifications_kind_check;
alter table admin_notifications add constraint admin_notifications_kind_check
  check (kind in ('booking_paid', 'proof_uploaded', 'visit_to_complete', 'payment_to_check', 'refund_to_send'));
