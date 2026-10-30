import "server-only";
import { getSql } from "./db";
import { sendRebookNudgeEmails } from "./email";
import { unsubscribeUrl } from "./unsubscribe";
import { manilaNow } from "./visitsToComplete";
import { addDays } from "../lib/bookingWindow";
import { MAX_REBOOK_NUDGE_DAYS, MIN_REBOOK_NUDGE_DAYS } from "../lib/rebookNudge";

// The rebooking email: some days after a completed visit, a client with nothing booked since gets one
// email asking if they're ready for their next set. Runs with the day-before reminders (the daily
// cron). Off until the salon sets a number of days in Admin > Settings (rebook_nudge_days; 0 is off).
// It's a promotional email, so every one carries an unsubscribe link (customer_profiles.nudge_emails_off).
//
// Safe to repeat: a visit's nudge is taken (rebook_nudge_sent_at) before sending, so a second run, or
// one at the same time, sends nothing twice; the mark is cleared again if Resend refuses the batch.

const EMAIL_BATCH_SIZE = 100;
/** A visit that fell due on a day the run missed is still nudged for this many days after */
const CATCH_UP_DAYS = 6;
/** The shared walk-in guest's address has no inbox */
const WALKIN_EMAIL = "walkin-guest@clawholics.local";

/** How many days after a visit the email goes; 0 (or anything not valid) is off */
export async function getRebookNudgeDays(): Promise<number> {
  const [row] = await getSql()<{ value: string }[]>`select value from site_settings where key = 'rebook_nudge_days'`;
  const days = row ? Number(row.value) : 0;
  return Number.isInteger(days) && days >= MIN_REBOOK_NUDGE_DAYS && days <= MAX_REBOOK_NUDGE_DAYS ? days : 0;
}

export async function sendRebookNudges(now: Date = new Date()) {
  const days = await getRebookNudgeDays();
  if (!days) return { enabled: false, due: 0, emailed: 0 };

  const { today } = manilaNow(now);
  const lastDay = addDays(today, -days);
  const firstDay = addDays(lastDay, -CATCH_UP_DAYS);

  const sql = getSql();
  // Visits finished with Complete visit, from `firstDay` to `lastDay`, whose client hasn't unsubscribed,
  // is a real client with an inbox, and has no booking after it (booked, paid or done). Taken by this run.
  const due = await sql<
    { id: number; user_id: number; email: string; first_name: string; service_id: number; service_name: string; nailist_name: string; appointment_date: string }[]
  >`
    update appointments a set rebook_nudge_sent_at = clawholics_utc_now()
    from users u
    join customer_profiles cp on cp.user_id = u.id
    where u.id = a.user_id
      and upper(trim(a.status)) = 'COMPLETED'
      and exists (select 1 from visit_completions vc where vc.appointment_id = a.id)
      and a.rebook_nudge_sent_at is null
      and a.appointment_date between ${firstDay} and ${lastDay}
      and coalesce(cp.nudge_emails_off, 0) = 0
      and coalesce(u.role, 'customer') <> 'admin'
      and coalesce(u.email, '') <> ''
      and lower(u.email) <> ${WALKIN_EMAIL}
      and not exists (
        select 1 from appointments b
        where b.user_id = a.user_id and b.id <> a.id
          and upper(trim(b.status)) in ('PENDING', 'AWAITING_PROOF', 'CONFIRMED', 'COMPLETED')
          and (b.appointment_date > a.appointment_date or (b.appointment_date = a.appointment_date and b.id > a.id))
      )
    returning a.id, a.user_id, u.email, cp.first_name, a.service_id, a.service_name, a.nailist_name, a.appointment_date`;

  let emailed = 0;
  for (let i = 0; i < due.length; i += EMAIL_BATCH_SIZE) {
    const batch = due.slice(i, i + EMAIL_BATCH_SIZE);
    try {
      await sendRebookNudgeEmails(batch.map((b) => ({ ...b, unsubscribeUrl: unsubscribeUrl(b.user_id), daysSince: daysBetween(b.appointment_date, today) })));
      emailed += batch.length;
    } catch (error) {
      console.error("[rebook] could not email the nudges; they're retried on the next run:", error);
      await sql`update appointments set rebook_nudge_sent_at = null where id in ${sql(batch.map((b) => b.id))}`;
    }
  }
  return { enabled: true, due: due.length, emailed };
}

/** Whole days from one YYYY-MM-DD to another */
function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}
