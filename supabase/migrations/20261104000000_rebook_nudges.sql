-- The rebooking email sent some days after a completed visit (run with the day-before reminders,
-- GET /api/cron/appointment-reminders):
--   appointments.rebook_nudge_sent_at: when a visit's nudge was taken for sending, so a repeated run
--     emails it once; cleared again if the email couldn't be sent
--   customer_profiles.nudge_emails_off: a client who unsubscribed from these emails (the link in them,
--     GET/POST /api/unsubscribe); their booking emails are not affected
alter table appointments add column if not exists rebook_nudge_sent_at text;
alter table customer_profiles add column if not exists nudge_emails_off integer not null default 0;
