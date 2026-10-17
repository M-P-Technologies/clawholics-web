-- The bell also says when an online payment arrived for a booking that can't take it (its slot
-- was taken after its hold ran out, or it was already paid, cancelled or refunded): an admin
-- checks it and refunds the client if needed
alter table admin_notifications drop constraint admin_notifications_kind_check;
alter table admin_notifications add constraint admin_notifications_kind_check
  check (kind in ('booking_paid', 'proof_uploaded', 'visit_to_complete', 'payment_to_check'));
