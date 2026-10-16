import "server-only";
import { getSql } from "./db";

// Visits to complete: confirmed bookings whose time is over (Manila), waiting for an admin to
// record what was paid at the salon. The dashboard counts them, the list filters them, and the
// bell tells the admins about each once.

/** Only visits ending on or after this day notify, so the ones never completed before this existed don't flood the bell */
export const VISIT_NOTIFY_FROM = "2026-10-16";

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const CLOCK = /^\d{2}:\d{2}$/;

/**
 * SQL: the booking (`alias` is its appointments row) is confirmed and over by `today` at `clock`
 * (Manila). Its end is the second half of appointment_time ("13:00-15:00"), or its start without one.
 * The day and clock are worked out on the server and checked here, so they can go in as text.
 */
export function TO_COMPLETE_SQL(alias: string, today: string, clock: string): string {
  if (!DAY.test(today) || !CLOCK.test(clock)) throw new Error("TO_COMPLETE_SQL needs YYYY-MM-DD and HH:MM");
  const t = `${alias}.appointment_time`;
  const end = `lpad(trim(coalesce(nullif(split_part(${t}, '-', 2), ''), split_part(${t}, '-', 1))), 5, '0')`;
  return `(upper(trim(${alias}.status)) = 'CONFIRMED' and (${alias}.appointment_date < '${today}' or (${alias}.appointment_date = '${today}' and ${end} <= '${clock}')))`;
}

const MANILA_MS = 8 * 3600 * 1000;
/** Today and the time in Manila, as TO_COMPLETE_SQL takes them */
export function manilaNow(now: Date = new Date()) {
  const iso = new Date(now.getTime() + MANILA_MS).toISOString();
  return { today: iso.slice(0, 10), clock: iso.slice(11, 16) };
}

/** Records a bell notification for every visit to complete that ended on or after `from` (once each) */
export async function recordVisitsToComplete(now: Date = new Date(), from: string = VISIT_NOTIFY_FROM) {
  const { today, clock } = manilaNow(now);
  await getSql().unsafe(
    `insert into admin_notifications (kind, ref_id, appointment_id)
     select 'visit_to_complete', a.id, a.id from appointments a
     where ${TO_COMPLETE_SQL("a", today, clock)} and a.appointment_date >= $1
     on conflict (kind, ref_id) do nothing`,
    [from],
  );
}
