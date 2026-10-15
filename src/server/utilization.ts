import "server-only";
import { getSql } from "./db";
import { addDays, resolvePeriod } from "../features/dashboard/lib/dashboardPeriods";
import type { ArtistUtilization, Utilization } from "../features/dashboard/types";
import { holdsSlot } from "./appointments";

// The bookings that hold a slot
const ACTIVE = holdsSlot("a.status");

const rateOf = (booked: number, offered: number) => (offered === 0 ? null : booked / offered);

// Artist utilization for the Monday-to-Sunday week that holds `date`: each day's active bookings
// against the time slots the artist offers (none on a regular or one-off day off).
export async function buildUtilization(date: string): Promise<Utilization> {
  const { from, to } = resolvePeriod("week", date).period;
  const dates = Array.from({ length: 7 }, (_, i) => addDays(from, i));
  const sql = getSql();

  const [artists, slots, offs, bookings] = await Promise.all([
    sql<{ id: number; name: string; title: string | null; image: string | null }[]>`
      select n.id, n.name, nc.name as title, n.image
      from nailists n left join nailist_categories nc on nc.id = n.category_id
      order by n.category_id, n.name, n.id`,
    sql<{ nailist_id: number; n: number }[]>`
      select nailist_id, count(*)::int as n from nailist_time_slots group by nailist_id`,
    sql<{ nailist_id: number; day_of_week: number | null; date: string | null }[]>`
      select nailist_id, day_of_week, date from nailist_day_offs
      where day_off_type = 'REGULAR' or date between ${from} and ${to}`,
    sql.unsafe<{ nailist_id: number; d: string; n: number }[]>(
      `select a.nailist_id, a.appointment_date as d, count(*)::int as n from appointments a
       where ${ACTIVE} and a.appointment_date between $1 and $2 group by 1, 2`,
      [from, to],
    ),
  ]);

  let bookedAll = 0;
  let offeredAll = 0;
  const rows: ArtistUtilization[] = artists.map((artist) => {
    const perDay = slots.find((s) => s.nailist_id === artist.id)?.n ?? 0;
    let booked = 0;
    let offered = 0;
    const days = dates.map((d) => {
      const weekday = new Date(`${d}T00:00:00Z`).getUTCDay(); // 0 = Sunday, as the day-offs store it
      const off = offs.some((o) => o.nailist_id === artist.id && (o.day_of_week === weekday || o.date === d));
      const dayOffered = off ? 0 : perDay;
      const dayBooked = bookings.find((b) => b.nailist_id === artist.id && b.d === d)?.n ?? 0;
      offered += dayOffered;
      booked += Math.min(dayBooked, dayOffered); // a booking beyond the day's slots can't make it more than full
      return { date: d, offered: dayOffered, booked: dayBooked, off };
    });
    bookedAll += booked;
    offeredAll += offered;
    return { ...artist, days, rate: rateOf(booked, offered) };
  });

  return { week: { from, to }, artists: rows, overall: rateOf(bookedAll, offeredAll) };
}
