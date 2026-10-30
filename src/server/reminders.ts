import "server-only";
import { getSql } from "./db";
import { sendAppointmentReminderEmails } from "./email";
import { manilaNow } from "./visitsToComplete";

// The day-before reminder email. Runs daily (vercel.json, 09:00 in Manila): every confirmed booking
// whose visit is tomorrow gets one email. Safe to repeat: a booking's reminder is taken
// (reminder_sent_at) before sending, so a second run, or one at the same time, sends nothing
// twice, and the mark is cleared again if Resend refuses the batch so the next run tries again.
// Switched on and off in Admin > Settings (booking_reminders_enabled): each reminder is one email
// against the sending plan's quota.

const EMAIL_BATCH_SIZE = 100;
/** The shared walk-in guest's address has no inbox: its bookings are never emailed */
const WALKIN_EMAIL = "walkin-guest@clawholics.local";

/** On unless the salon turned it off */
export async function getRemindersEnabled(): Promise<boolean> {
  const [row] = await getSql()<{ value: string }[]>`select value from site_settings where key = 'booking_reminders_enabled'`;
  return row?.value !== "0";
}

/** The visit day to remind about: tomorrow, in Manila */
export function reminderDay(now: Date = new Date()): string {
  const day = new Date(`${manilaNow(now).today}T00:00:00Z`);
  day.setUTCDate(day.getUTCDate() + 1);
  return day.toISOString().slice(0, 10);
}

export async function sendAppointmentReminders(now: Date = new Date()) {
  const date = reminderDay(now);
  if (!(await getRemindersEnabled())) return { date, enabled: false, due: 0, emailed: 0 };

  const sql = getSql();
  // Tomorrow's confirmed bookings not reminded yet, with an address to send to, taken by this run.
  // A walk-in with an email of their own is reminded at it; the shared guest address never is.
  const due = await sql<
    { id: number; email: string; first_name: string; service_name: string; nailist_name: string; appointment_date: string; appointment_time: string }[]
  >`
    update appointments a set reminder_sent_at = clawholics_utc_now()
    from users u
    left join customer_profiles cp on cp.user_id = u.id
    where u.id = a.user_id
      and upper(trim(a.status)) = 'CONFIRMED'
      and a.appointment_date = ${date}
      and a.reminder_sent_at is null
      and coalesce(nullif(trim(a.walkin_email), ''), u.email, '') <> ''
      and lower(coalesce(nullif(trim(a.walkin_email), ''), u.email, '')) <> ${WALKIN_EMAIL}
    returning a.id, coalesce(nullif(trim(a.walkin_email), ''), u.email) as email,
      coalesce(nullif(trim(a.walkin_first_name), ''), cp.first_name, '') as first_name,
      a.service_name, a.nailist_name, a.appointment_date, a.appointment_time`;

  let emailed = 0;
  for (let i = 0; i < due.length; i += EMAIL_BATCH_SIZE) {
    const batch = due.slice(i, i + EMAIL_BATCH_SIZE);
    try {
      await sendAppointmentReminderEmails(batch);
      emailed += batch.length;
    } catch (error) {
      console.error("[reminders] could not email the reminders; they're retried on the next run:", error);
      await sql`update appointments set reminder_sent_at = null where id in ${sql(batch.map((b) => b.id))}`;
    }
  }
  return { date, enabled: true, due: due.length, emailed };
}
