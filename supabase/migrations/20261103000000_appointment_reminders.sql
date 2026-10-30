-- The day-before reminder email (GET /api/cron/appointment-reminders, daily): when a booking's
-- reminder was taken for sending, so a repeated run, or two at once, emails each booking once.
-- Cleared again if the email couldn't be sent, so the next run tries again.
alter table appointments add column if not exists reminder_sent_at text;
