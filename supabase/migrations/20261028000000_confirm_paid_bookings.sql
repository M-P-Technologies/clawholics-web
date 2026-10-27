-- A booking paid online is confirmed as soon as Xendit confirms the payment: there's no
-- AWAITING_CONFIRMATION step (and no payment screenshot to wait for) any more. Bookings still
-- in it were paid, so they're confirmed.
update appointments set status = 'CONFIRMED' where upper(trim(status)) = 'AWAITING_CONFIRMATION';
