import "server-only";
import { getSql } from "./db";
import { sendScreenshotReminders } from "./email";

// The "send your payment screenshot" reminder: a booking paid online waits for the salon, which
// confirms it only once the client has sent a screenshot of the payment. A client who hasn't, 12
// hours after paying, is emailed once (Vercel Cron, daily).

const REMIND_AFTER_HOURS = 12;
const EMAIL_BATCH_SIZE = 100;

// "YYYY-MM-DD HH:MM:SS" in UTC, as created_at is stored
const serverTime = (date: Date) => date.toISOString().slice(0, 19).replace("T", " ");

export async function sendDueScreenshotReminders(now = new Date()): Promise<{ sent: number }> {
  const sql = getSql();
  const paidBefore = serverTime(new Date(now.getTime() - REMIND_AFTER_HOURS * 3_600_000));
  // A booking whose day has passed (Manila) is no longer worth a reminder
  const today = new Date(now.getTime() + 8 * 3_600_000).toISOString().slice(0, 10);
  // Taken by this run (marked first), so a run at the same time can't send them too
  const due = await sql<{ id: number; email: string; first_name: string; service_name: string; appointment_date: string; appointment_time: string }[]>`
    update appointments a set screenshot_reminder_sent_at = clawholics_utc_now()
    from users u left join customer_profiles cp on cp.user_id = u.id
    where u.id = a.user_id
      and upper(trim(a.status)) = 'AWAITING_CONFIRMATION'
      and a.screenshot_reminder_sent_at is null
      and a.appointment_date >= ${today}
      and coalesce(u.email, '') <> ''
      and coalesce((select pp.status from payment_proofs pp where pp.appointment_id = a.id
                    order by pp.created_at desc, pp.id desc limit 1), 'REJECTED') = 'REJECTED'
      and exists (select 1 from payments p where p.appointment_id = a.id
                  and upper(trim(p.status)) = 'PAID' and p.created_at <= ${paidBefore})
    returning a.id, u.email, coalesce(cp.first_name, '') as first_name, a.service_name, a.appointment_date, a.appointment_time`;

  let sent = 0;
  for (let i = 0; i < due.length; i += EMAIL_BATCH_SIZE) {
    const batch = due.slice(i, i + EMAIL_BATCH_SIZE);
    try {
      await sendScreenshotReminders(batch);
      sent += batch.length;
    } catch (error) {
      console.error("[screenshots] could not email reminders; they're retried on the next run:", error);
      await sql`update appointments set screenshot_reminder_sent_at = null where id in ${sql(batch.map((b) => b.id))}`;
    }
  }
  return { sent };
}
