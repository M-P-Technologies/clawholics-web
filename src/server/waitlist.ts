import "server-only";
import { anyArtistDays } from "./anyArtist";
import { getBookingMinNoticeHours } from "./bookingNotice";
import { getSql } from "./db";
import { sendWaitlistOpenedEmails } from "./email";
import { manilaToday } from "../lib/bookingNotice";

// The waitlist (table waitlist_entries): a client asks to be told if a time opens up on a fully booked
// day. Whenever a slot is released, notifyWaitlist emails each entry waiting for that day, once, if the
// day really has a time free again. See the migration for the table.

const EMAIL_BATCH_SIZE = 100;
/** How many days a client can be waiting for at once */
export const MAX_WAITING_ENTRIES = 10;

/** A client waiting for a day, with what their email needs */
interface WaitingRow {
  id: number;
  email: string;
  first_name: string | null;
  service_id: number;
  service_name: string;
  /** Null: any artist who does the service */
  nailist_id: number | null;
  nailist_name: string | null;
}

/** Whether a day has a time free for a service (with one artist, or any), as a booking would find it */
export async function dayHasFreeTime(serviceId: number, date: string, nailistId: number | null, now: number = Date.now()): Promise<boolean> {
  const { days } = await anyArtistDays(serviceId, date, date, await getBookingMinNoticeHours(), now, nailistId ?? undefined);
  return (days[date]?.length ?? 0) > 0;
}

/**
 * A slot on `date` with this artist was released: emails every client waiting for that day (for this
 * artist, or for any artist) whose service now has a time free, once. Safe to repeat: an entry is taken
 * (notified_at) before its email, and put back if Resend refuses the batch.
 */
export async function notifyWaitlist(nailistId: number, date: string, now: number = Date.now()) {
  if (date < manilaToday(now)) return { waiting: 0, notified: 0 };
  const sql = getSql();
  const waiting = await sql<WaitingRow[]>`
    select w.id, u.email, cp.first_name, w.service_id, s.name as service_name, w.nailist_id, n.name as nailist_name
    from waitlist_entries w
    join users u on u.id = w.user_id
    join services s on s.id = w.service_id
    left join customer_profiles cp on cp.user_id = w.user_id
    left join nailists n on n.id = w.nailist_id
    where w.appointment_date = ${date} and w.notified_at is null
      and (w.nailist_id = ${nailistId} or w.nailist_id is null)
      and coalesce(u.email, '') <> ''`;
  if (waiting.length === 0) return { waiting: 0, notified: 0 };

  // Only those whose day has a time free now: a released slot that's too soon, or taken again, tells nobody
  const free = new Map<string, boolean>();
  const ready: WaitingRow[] = [];
  for (const entry of waiting) {
    const key = `${entry.service_id}|${entry.nailist_id ?? "any"}`;
    if (!free.has(key)) free.set(key, await dayHasFreeTime(entry.service_id, date, entry.nailist_id, now));
    if (free.get(key)) ready.push(entry);
  }
  if (ready.length === 0) return { waiting: waiting.length, notified: 0 };

  // Taken by this run, so one at the same time can't email them too
  const taken = await sql<{ id: number }[]>`
    update waitlist_entries set notified_at = clawholics_utc_now()
    where id in ${sql(ready.map((r) => r.id))} and notified_at is null
    returning id`;
  const mine = new Set(taken.map((t) => t.id));
  const toEmail = ready.filter((r) => mine.has(r.id));

  let notified = 0;
  for (let i = 0; i < toEmail.length; i += EMAIL_BATCH_SIZE) {
    const batch = toEmail.slice(i, i + EMAIL_BATCH_SIZE);
    try {
      await sendWaitlistOpenedEmails(batch.map((b) => ({ ...b, date })));
      notified += batch.length;
    } catch (error) {
      console.error("[waitlist] could not email the waitlist; the entries are kept for the next release:", error);
      await sql`update waitlist_entries set notified_at = null where id in ${sql(batch.map((b) => b.id))}`;
    }
  }
  return { waiting: waiting.length, notified };
}

/** Frees the waitlist for a released slot without waiting on it, for the request that released it */
export async function notifyWaitlistSafely(nailistId: number | null | undefined, date: string | null | undefined) {
  if (!nailistId || !date) return;
  try {
    await notifyWaitlist(nailistId, date);
  } catch (error) {
    console.error("[waitlist] notify failed:", error);
  }
}
