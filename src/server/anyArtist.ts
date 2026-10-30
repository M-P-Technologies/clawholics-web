import "server-only";
import { holdsSlot } from "./appointments";
import { getSql } from "./db";
import { normalizeSlot, slotsOverlap } from "./slotRules";
import { startsTooSoon } from "../lib/bookingNotice";
import { addDays } from "../lib/bookingWindow";

// "Any available artist": the client picks a day and a time, and the salon assigns a free artist who
// offers the service. These are the two halves of that: which times are free with at least one
// artist (for the calendar), and which artist takes a time (when the booking is made).

/** The artists who offer a service, in the admin's order */
export async function artistsOfferingService(serviceId: number): Promise<{ id: number; name: string }[]> {
  return getSql()<{ id: number; name: string }[]>`
    select n.id, n.name from nailists n
    join nailist_services ns on ns.nailist_id = n.id
    where ns.service_id = ${serviceId}
    order by n.display_order asc, n.id asc`;
}

/**
 * The artists to try for a time, the one with the lightest day first (fewest bookings that day, so
 * the work is shared), then in the admin's order. The booking takes the first of them that's free.
 */
export async function anyArtistCandidates(serviceId: number, date: string): Promise<number[]> {
  const artists = await artistsOfferingService(serviceId);
  if (artists.length <= 1) return artists.map((a) => a.id);
  const sql = getSql();
  const counts = await sql<{ nailist_id: number; n: number }[]>`
    select nailist_id, count(*)::int as n from appointments
    where appointment_date = ${date} and nailist_id in ${sql(artists.map((a) => a.id))} and ${sql.unsafe(holdsSlot())}
    group by nailist_id`;
  const busy = new Map(counts.map((c) => [c.nailist_id, c.n]));
  // sort() is stable, so ties keep the admin's order
  return [...artists].sort((a, b) => (busy.get(a.id) ?? 0) - (busy.get(b.id) ?? 0)).map((a) => a.id);
}

/**
 * Every day from `from` to `to` (YYYY-MM-DD) with the times at least one artist offering the service
 * has free: their hours, not on a day off, not taken, and not sooner than the notice allows. `days`
 * lists them (days with nothing free are left out); `full` lists the days that are open (someone works
 * and has a time that isn't too soon) but have nothing free, which the waitlist is for. With
 * `onlyArtistId`, just that artist's times.
 */
export async function anyArtistDays(
  serviceId: number,
  from: string,
  to: string,
  minNoticeHours: number,
  now: number = Date.now(),
  onlyArtistId?: number,
) {
  const offering = await artistsOfferingService(serviceId);
  const artists = onlyArtistId === undefined ? offering : offering.filter((a) => a.id === onlyArtistId);
  const nothing = { days: {} as Record<string, string[]>, full: [] as string[] };
  if (artists.length === 0 || from > to) return nothing;
  const sql = getSql();
  const ids = sql(artists.map((a) => a.id));
  const [slots, dayOffs, booked] = await Promise.all([
    sql<{ nailist_id: number; start_time: string; end_time: string }[]>`
      select nailist_id, start_time, end_time from nailist_time_slots where nailist_id in ${ids}`,
    sql<{ nailist_id: number; day_off_type: string; day_of_week: number | null; date: string | null }[]>`
      select nailist_id, day_off_type, day_of_week, date from nailist_day_offs where nailist_id in ${ids}`,
    sql<{ nailist_id: number; appointment_date: string; appointment_time: string }[]>`
      select nailist_id, appointment_date, appointment_time from appointments
      where nailist_id in ${ids} and appointment_date between ${from} and ${to} and ${sql.unsafe(holdsSlot())}`,
  ]);

  const slotsOf = new Map<number, string[]>();
  for (const s of slots) {
    const slot = normalizeSlot(`${s.start_time}-${s.end_time}`);
    if (slot) slotsOf.set(s.nailist_id, [...(slotsOf.get(s.nailist_id) ?? []), slot]);
  }
  const regularOff = new Map<number, Set<number>>();
  const customOff = new Map<number, Set<string>>();
  for (const d of dayOffs) {
    if (d.day_off_type === "REGULAR" && d.day_of_week !== null) regularOff.set(d.nailist_id, (regularOff.get(d.nailist_id) ?? new Set()).add(d.day_of_week));
    if (d.day_off_type === "CUSTOM" && d.date) customOff.set(d.nailist_id, (customOff.get(d.nailist_id) ?? new Set()).add(d.date));
  }
  const takenOn = new Map<string, string[]>();
  for (const b of booked) {
    const taken = normalizeSlot(b.appointment_time);
    if (taken) takenOn.set(`${b.nailist_id}|${b.appointment_date}`, [...(takenOn.get(`${b.nailist_id}|${b.appointment_date}`) ?? []), taken]);
  }

  const days: Record<string, string[]> = {};
  const full: string[] = [];
  for (let day = from; day <= to; day = addDays(day, 1)) {
    const weekday = new Date(`${day}T00:00:00Z`).getUTCDay();
    const free = new Set<string>();
    // Someone works and has a time that isn't too soon: the day could have been booked
    let open = false;
    for (const artist of artists) {
      if (regularOff.get(artist.id)?.has(weekday) || customOff.get(artist.id)?.has(day)) continue;
      const taken = takenOn.get(`${artist.id}|${day}`) ?? [];
      for (const slot of slotsOf.get(artist.id) ?? []) {
        if (startsTooSoon(day, slot, minNoticeHours, now)) continue;
        open = true;
        if (taken.some((t) => slotsOverlap(t, slot))) continue;
        free.add(slot);
      }
    }
    if (free.size > 0) days[day] = [...free].sort();
    else if (open) full.push(day);
  }
  return { days, full };
}
