import "server-only";
import { getSql } from "./db";

/** How many service ids the ranking answers with: enough to still fill a row once the services
 *  hidden from the public list are skipped */
const RANKED = 20;

// The services ordered by how many bookings they have had, most first: only bookings that were
// really made count (paid and confirmed, or completed; not cancelled, expired or no-shows). Ties
// keep the admin's order. A service nobody has booked isn't in the list.
export async function getPopularServiceIds(): Promise<number[]> {
  const rows = await getSql()<{ service_id: number }[]>`
    select a.service_id::int as service_id
    from appointments a
    join services s on s.id = a.service_id
    where upper(trim(a.status)) in ('CONFIRMED', 'COMPLETED')
    group by a.service_id, s.position
    order by count(*) desc, s.position asc, a.service_id asc
    limit ${RANKED}
  `;
  return rows.map((row) => row.service_id);
}
