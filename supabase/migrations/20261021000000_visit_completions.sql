-- The visit flow: the client's payment screenshot is asked for again by email once, and a
-- completed visit records what was paid at the salon and who did it.

-- When the "send your payment screenshot" reminder went out (once per booking; cleared again if
-- Resend refuses it, so the next run retries)
alter table appointments add column screenshot_reminder_sent_at text;
