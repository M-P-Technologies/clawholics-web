import "server-only";
import { getSql } from "./db";
import { toId } from "./http";

// Appointment queries and booking rules, ported from worker-api/src/index.ts. Same columns
// and rules as the Worker so the frontend can't tell which backend answered.

// Price for a service (alias s) done by an artist whose category is joined as nc. 'single'
// services cost master_price with every artist.
export const SERVICE_PRICE_SQL =
  "case when s.pricing_mode = 'single' or nc.name = 'Master Technician' then s.master_price else s.junior_price end";

// The Worker's appointmentSelect: the appointment plus client, artist, price and its latest
// (paid first) payment.
const APPOINTMENT_SELECT = `
  select
    a.id, a.user_id, a.service_id, a.service_name, a.nailist_id,
    coalesce(n.name, a.nailist_name) as nailist_name,
    a.appointment_date, a.appointment_time, a.status, a.created_at, a.expires_at,
    ${SERVICE_PRICE_SQL} as service_price,
    s.junior_price, s.master_price, s.pricing_mode, n.category_id as nailist_category_id,
    coalesce(a.walkin_email, u.email, '') as email,
    coalesce(a.walkin_first_name, ap.first_name, cp.first_name, '') as first_name,
    coalesce(a.walkin_last_name, ap.last_name, cp.last_name, '') as last_name,
    coalesce(a.walkin_phone, cp.phone, '') as phone,
    cp.alt_phone, cp.preferred_contact_method, cp.facebook_handle, cp.instagram_handle,
    cp.dob, cp.gender, cp.stamps,
    trim(coalesce(a.walkin_first_name, ap.first_name, cp.first_name, '') || ' ' || coalesce(a.walkin_last_name, ap.last_name, cp.last_name, '')) as client_name,
    p.id as payment_id, p.status as payment_status, p.amount as payment_amount, p.payment_method, p.external_id as payment_reference, p.invoice_url,
    s.duration
  from appointments a
  left join nailists n on a.nailist_id = n.id
  left join nailist_categories nc on n.category_id = nc.id
  left join services s on a.service_id = s.id
  left join users u on a.user_id = u.id
  left join admin_profiles ap on u.id = ap.user_id
  left join customer_profiles cp on a.user_id = cp.user_id
  left join payments p on p.id = (
    select p2.id from payments p2 where p2.appointment_id = a.id
    order by (upper(p2.status) = 'PAID') desc, p2.created_at desc limit 1
  )
`;

// postgres.js returns rows as objects; these are the columns the routes and emails read.
export interface AppointmentRow {
  id: number;
  user_id: number;
  service_id: number;
  service_name: string;
  nailist_id: number;
  nailist_name: string;
  appointment_date: string;
  appointment_time: string;
  status: string | null;
  email: string;
  client_name: string;
  service_price: number | null;
  duration: string | null;
  payment_id: string | null;
  payment_status: string | null;
  payment_method: string | null;
  payment_reference: string | null;
  [column: string]: unknown;
}

// APPOINTMENT_SELECT is a constant with no input in it; values are always bound separately.
const sqlFragment = () => getSql().unsafe(APPOINTMENT_SELECT);

/**
 * SQL text: the appointment (its status column, e.g. "a.status") holds its slot. A booking holds
 * it until it's cancelled or refunded: while it waits for payment or for a payment proof to be
 * checked, once confirmed and once completed. This is the rule of the idx_unique_active_slot
 * index, which refuses a second booking of a held slot, so every reader of held slots (the
 * booking calendar's endpoints, the booking checks, the Schedule, utilization) uses it: under any
 * other rule the calendar offers times that booking then refuses.
 */
export const holdsSlot = (statusColumn = "status") =>
  `lower(trim(${statusColumn})) not in ('cancelled', 'canceled', 'refunded')`;

export async function getAppointment(id: number): Promise<AppointmentRow | null> {
  const sql = getSql();
  const [row] = await sql<AppointmentRow[]>`${sqlFragment()} where a.id = ${id}`;
  return row ?? null;
}

/** Admin list, optionally filtered by a comma-separated status list (Worker semantics). */
export function listAppointments(statuses: string[] | null) {
  const sql = getSql();
  return sql<AppointmentRow[]>`
    ${sqlFragment()}
    ${statuses ? sql`where upper(trim(a.status)) in ${sql(statuses)}` : sql``}
    order by a.appointment_date desc, a.appointment_time desc
  `;
}

// An appointment's start time, zero-padded ("9:00-10:00" sorts as "09:00"), as dashboard.ts orders
// them: bookings store the time they were sent, so it can't be sorted as text
const START_TIME = "lpad(split_part(a.appointment_time, '-', 1), 5, '0')";

/** The orders the admin lists offer (dates are YYYY-MM-DD text) */
export const APPOINTMENT_SORTS = {
  upcoming: `a.appointment_date asc, ${START_TIME} asc, a.id asc`,
  latest: `a.appointment_date desc, ${START_TIME} desc, a.id asc`,
  booked_newest: "a.created_at desc, a.id desc",
  booked_oldest: "a.created_at asc, a.id asc",
} as const;
export type AppointmentSort = keyof typeof APPOINTMENT_SORTS;

export interface AppointmentPageQuery {
  /** Upper-case statuses to include; none means every status */
  statuses: string[];
  /** Only appointments whose payment proof is waiting for review (the dashboard's "Proofs to review") */
  proofToReview: boolean;
  /** Only this day, or this day and later (YYYY-MM-DD) */
  on: string | null;
  from: string | null;
  /** The artist's name, as the list shows it */
  artist: string | null;
  /** Matched against the id ("12" or "#12"), the client's name and email, the service and the artist */
  search: string | null;
  sort: AppointmentSort;
  page: number;
  pageSize: number;
}

/** The latest proof, as the proof badge reads it (latest_proof on the frontend's Appointment) */
const LATEST_PROOF = `(
  select json_build_object('id', pp.id, 'status', pp.status, 'image_url', pp.image_url, 'admin_note', pp.admin_note, 'created_at', pp.created_at)
  from payment_proofs pp where pp.appointment_id = a.id order by pp.created_at desc, pp.id desc limit 1
)`;
/** The client's completed visits, which the list used to count from every appointment it loaded */
const CLIENT_VISITS = `(select count(*)::int from appointments v where v.user_id = a.user_id and upper(trim(v.status)) = 'COMPLETED')`;

// APPOINTMENT_SELECT's FROM and joins (for the count, so it filters the same rows), and its
// columns plus the two above. All constants: no input goes into them.
const FROM_START = APPOINTMENT_SELECT.indexOf("from appointments a");
const APPOINTMENT_FROM = APPOINTMENT_SELECT.slice(FROM_START);
// The count only needs the joins the filters read (the artist, and the client for the search):
// the latest-payment lookup and the service joins add no rows and nothing to filter on
const COUNT_FROM = `
  from appointments a
  left join nailists n on a.nailist_id = n.id
  left join users u on a.user_id = u.id
  left join admin_profiles ap on u.id = ap.user_id
  left join customer_profiles cp on a.user_id = cp.user_id
`;
const PAGE_SELECT = `${APPOINTMENT_SELECT.slice(0, FROM_START)}, ${LATEST_PROOF} as latest_proof, ${CLIENT_VISITS} as client_visits
  ${APPOINTMENT_FROM}`;

/**
 * One page of the admin appointment list, filtered, searched and sorted here instead of in the
 * browser (the list used to send every appointment to show five), with the total that matches.
 * Each row also carries `latest_proof` and `client_visits`.
 */
export async function listAppointmentPage(query: AppointmentPageQuery) {
  const sql = getSql();
  const like = query.search ? `%${query.search.replace(/[\\%_]/g, (c) => `\\${c}`)}%` : null;
  const conditions = [
    query.statuses.length > 0 ? sql`upper(trim(a.status)) in ${sql(query.statuses)}` : null,
    // As the dashboard counts them: waiting for proof, with the latest proof still pending
    query.proofToReview
      ? sql`upper(trim(a.status)) = 'AWAITING_PROOF' and (select pp.status from payment_proofs pp where pp.appointment_id = a.id order by pp.created_at desc, pp.id desc limit 1) = 'PENDING'`
      : null,
    query.on ? sql`a.appointment_date = ${query.on}` : null,
    query.from ? sql`a.appointment_date >= ${query.from}` : null,
    query.artist ? sql`coalesce(n.name, a.nailist_name) = ${query.artist}` : null,
    like
      ? sql`(
          a.id::text ilike ${like} or ('#' || a.id::text) ilike ${like}
          or trim(coalesce(a.walkin_first_name, ap.first_name, cp.first_name, '') || ' ' || coalesce(a.walkin_last_name, ap.last_name, cp.last_name, '')) ilike ${like}
          or coalesce(a.walkin_email, u.email, '') ilike ${like}
          or a.service_name ilike ${like}
          or coalesce(n.name, a.nailist_name) ilike ${like}
        )`
      : null,
  ].filter((condition) => condition !== null);
  const where = conditions.length > 0 ? sql`where ${conditions.reduce((acc, c) => sql`${acc} and ${c}`)}` : sql``;

  const [rows, [{ total }]] = await Promise.all([
    sql<AppointmentRow[]>`
      ${sql.unsafe(PAGE_SELECT)} ${where}
      order by ${sql.unsafe(APPOINTMENT_SORTS[query.sort])}
      limit ${query.pageSize} offset ${(query.page - 1) * query.pageSize}
    `,
    sql<{ total: number }[]>`select count(*)::int as total ${sql.unsafe(COUNT_FROM)} ${where}`,
  ]);
  return { rows: [...rows], total };
}

export function listAppointmentsBetween(start: string, end: string) {
  const sql = getSql();
  return sql<AppointmentRow[]>`
    ${sqlFragment()}
    where a.appointment_date between ${start} and ${end}
      and ${sql.unsafe(holdsSlot("a.status"))}
  `;
}

// The Worker's lazy cleanup: unpaid bookings past expires_at are cancelled, unless a payment
// proof is waiting for review, and their pending payments are marked failed.
// One statement (one round trip, it runs on polled reads): the CTE cancels, and the outer update
// fails pending payments of those plus any already-cancelled appointment, as the Worker did.
export async function cancelExpiredPendingAppointments() {
  const now = new Date().toISOString();
  await getSql()`
    with expired as (
      update appointments set status = 'CANCELLED'
      where upper(status) = 'PENDING' and expires_at <= ${now}
        and not exists (select 1 from payment_proofs pp where pp.appointment_id = appointments.id and pp.status = 'PENDING')
      returning id
    )
    update payments set status = 'FAILED'
    where upper(status) = 'PENDING'
      and (appointment_id in (select id from expired)
        or appointment_id in (select id from appointments where upper(status) = 'CANCELLED'))
  `;
}

/** Active service in an active (or no) category. */
export async function isServiceBookable(serviceId: unknown) {
  const id = toId(serviceId);
  if (id === null) return false;
  const [row] = await getSql()`
    select 1 from services s left join service_categories c on s.category_id = c.id
    where s.id = ${id} and s.is_active = 1 and (c.id is null or c.is_active = 1)
  `;
  return Boolean(row);
}

export const ARTIST_SERVICE_MISMATCH = "The selected artist doesn't offer this service.";

/** An artist can only be booked for the services mapped to them in nailist_services. */
export async function nailistOffersService(nailistId: unknown, serviceId: unknown) {
  const nId = toId(nailistId);
  const sId = toId(serviceId);
  if (nId === null || sId === null) return false;
  const [row] = await getSql()`select 1 from nailist_services where nailist_id = ${nId} and service_id = ${sId}`;
  return Boolean(row);
}

/** At least 72 hours before the appointment (Manila time, UTC+8): refundable / changeable. */
export function isEligibleForChanges(appointmentDate: string, appointmentTime: string, now = Date.now()) {
  const dateMatch = String(appointmentDate).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!dateMatch) return false;
  const timeMatch = String(appointmentTime).match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (!timeMatch) return false;

  let hours = parseInt(timeMatch[1], 10);
  const minutes = parseInt(timeMatch[2], 10);
  const ampm = timeMatch[3]?.toUpperCase() ?? null;
  if (ampm === "PM" && hours < 12) hours += 12;
  if (ampm === "AM" && hours === 12) hours = 0;

  const appointmentUtc = Date.UTC(Number(dateMatch[1]), Number(dateMatch[2]) - 1, Number(dateMatch[3]), hours - 8, minutes, 0);
  return appointmentUtc - now >= 72 * 60 * 60 * 1000;
}

/** Postgres unique violation on the one-booking-per-slot index. */
export const isSlotConflict = (error: unknown) =>
  typeof error === "object" && error !== null &&
  (error as { code?: string }).code === "23505" &&
  String((error as { constraint_name?: string }).constraint_name ?? "") === "idx_unique_active_slot";
