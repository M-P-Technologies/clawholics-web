-- The dates the Sales page's money cards need for the salon's financial statements:
--   payments.paid_at: when a payment was paid (Xendit's are recorded when the invoice is made and
--     marked paid later by the webhook; a payment proof's is recorded when approved).
--   appointments.cancelled_at / refunded_at: when a booking was cancelled (or marked a no-show) and
--     when its downpayment was refunded, the first time.
-- Safe to run again (it was applied by hand to the dev database first).
alter table payments add column if not exists paid_at text;
alter table appointments add column if not exists cancelled_at text, add column if not exists refunded_at text;

-- Earlier rows: the closest date there is. A payment's own record; a cancellation or refund
-- wasn't dated, so they stay empty and the dashboard dates them by the visit's day.
update payments set paid_at = created_at where upper(trim(status)) = 'PAID' and paid_at is null;
